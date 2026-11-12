// Minimal Gemini REST client with a function-calling loop. Plain fetch, no
// SDK, so it runs anywhere and is easy to test with a fake fetch.

import { runTool, TOOL_DECLARATIONS, type ToolContext } from "./tools";

type Part =
  | { text: string; thought?: boolean; thoughtSignature?: string }
  | { functionCall: { name: string; args?: Record<string, unknown> }; thoughtSignature?: string }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type Content = { role: "user" | "model"; parts: Part[] };

export type ChatTurn = { role: "user" | "assistant"; text: string };

export class AdvisorError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "upstream" | "blocked" | "limit",
    /** Short reason safe to show publicly, for diagnosing a deployment. */
    readonly code: string = kind,
    /** Google's own error text for a rejected request (no secrets), for diagnosis. */
    public detail?: string,
    /** How long to leave this model alone, when Google said. */
    readonly restMs?: number,
  ) {
    super(message);
  }
}

/**
 * The model used unless GEMINI_MODEL says otherwise, and the ones tried
 * after it when it is missing, overloaded or slow. Stable, fast models come
 * first. The "-latest" aliases follow Google's newest release, which is
 * often overloaded in its first months, so they are the last resort.
 * (Checked against Google's model list in November 2026. When Google
 * retires a model, put its replacement here.)
 */
export const DEFAULT_MODEL = "gemini-3.6-flash";
export const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"];

const API = "https://generativelanguage.googleapis.com/v1beta/models";
/** Tool rounds before the model has to answer. With the one-step tools, one or two is normal. */
const MAX_TOOL_ROUNDS = 4;
/** Whole answer, all retries included; hosting functions are stopped at about 26 s. */
const DEADLINE_MS = 23_000;
/** A call that has taken this long is slow: the next model is started alongside it, and the first answer wins. */
const STALL_MS = 6_000;
/** No single call is waited on for longer than this. */
const CALL_MS = 15_000;
/** Not worth starting another model with less time than this left. */
const MIN_START_MS = 5_000;
/** A model that just failed is tried last for this long. */
const REST_MS = 3 * 60_000;
/** A model that was merely slow is tried last for this long. */
const SLOW_REST_MS = 60_000;
/** Errors worth trying another model for. */
const SWITCH_CODES = new Set([
  "model_not_found",
  "no_model_access",
  "rate_limited",
  "timeout",
  "gemini_400",
  "gemini_500",
  "gemini_502",
  "gemini_503",
  "gemini_504",
  // A model that loops on tools or comes back empty: another one usually just answers.
  "too_many_steps",
  "empty_answer",
]);
/** Failures that are often over a moment later (overloaded, slow): such a model gets one more go after the others. */
const PASSING_CODES = new Set(["timeout", "gemini_500", "gemini_502", "gemini_503", "gemini_504", "empty_answer"]);

/**
 * What Google says about a refused (429) request: which limit was reached
 * and when to try again. Free-tier keys have small per-minute and per-day
 * limits for each model; this names the one that was hit.
 */
export function quotaDetail(body: string): { detail?: string; restMs?: number } {
  try {
    const error = (JSON.parse(body) as { error?: { message?: string; details?: Record<string, unknown>[] } }).error;
    const details = error?.details ?? [];
    const violation = details.flatMap((d) => (Array.isArray(d.violations) ? (d.violations as Record<string, unknown>[]) : []))[0];
    const retry = details.map((d) => d.retryDelay).find((d): d is string => typeof d === "string");
    const seconds = retry ? Number.parseFloat(retry) : Number.NaN;
    const quota = typeof violation?.quotaId === "string" ? violation.quotaId : null;
    const limit = violation?.quotaValue !== undefined ? `limit ${String(violation.quotaValue)}` : null;
    const detail = [quota, limit, retry ? `retry in ${retry}` : null].filter(Boolean).join(", ") || error?.message?.slice(0, 160);
    // A daily limit stays reached for hours; a per-minute one clears when Google says.
    const daily = quota !== null && /PerDay/i.test(quota);
    const restMs = daily ? 30 * 60_000 : Number.isFinite(seconds) ? Math.min(Math.max(seconds * 1000 + 2_000, 15_000), 5 * 60_000) : undefined;
    return { detail: detail || undefined, restMs };
  } catch {
    return {};
  }
}

/**
 * How little a model should "think" before answering. This kind of question
 * is answered well without extended thinking, and several times faster. The
 * setting differs by generation: 2.5 takes a budget of tokens, 3 and later a
 * level, and not every model accepts the lowest level.
 */
export function thinkingFor(model: string): Record<string, unknown> | null {
  if (/^gemini-2\.5-flash-lite/.test(model)) return null; // off unless asked for
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/^gemini-2\./.test(model)) return null;
  if (/flash-lite|gemini-3\.6-flash|gemini-3-flash/.test(model)) return { thinkingLevel: "minimal" };
  return { thinkingLevel: "low" };
}

// What this server instance has learnt about the models: which just failed (tried last for a while), and which reject the thinking setting.
const resting = new Map<string, number>();
const noThinkingConfig = new Set<string>();
/** For tests: forget what was learnt about the models. */
export function forgetModelHealth() {
  resting.clear();
  noThinkingConfig.clear();
}

type RunOptions = {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  ctx: ToolContext;
  fetchImpl?: typeof fetch;
  /** Milliseconds available for the whole answer. */
  budgetMs?: number;
  /** Milliseconds a call may take before the next model is started alongside it. */
  stallMs?: number;
  /** Milliseconds to wait before asking an overloaded model a second time. */
  pauseMs?: number;
};

type Answer = { text: string; toolsUsed: string[] };
type Event = { model: string; slow: true } | { model: string; answer: Answer } | { model: string; error: unknown };

/**
 * Runs the conversation. Models are tried in order; one that is
 * unavailable or overloaded hands over to the next, one that is slow gets
 * the next started alongside it (the first answer wins), and one that
 * failed for a passing reason gets a second go after the others.
 */
export async function runAdvisor(opts: RunOptions): Promise<Answer & { model: string; tried?: string[] }> {
  const start = Date.now();
  const deadline = start + (opts.budgetMs ?? DEADLINE_MS);
  const listed = [opts.model, ...FALLBACK_MODELS.filter((m) => m !== opts.model)];
  // Models that failed a moment ago go to the back of the queue.
  const queue = [...listed.filter((m) => (resting.get(m) ?? 0) <= start), ...listed.filter((m) => (resting.get(m) ?? 0) > start)];
  const secondGo = new Set<string>();
  const attempts: string[] = [];
  const running = new Map<string, AbortController>();
  let last: unknown;

  // What the running models report, in the order it happens.
  const events: Event[] = [];
  let wake: (() => void) | null = null;
  const report = (e: Event) => {
    events.push(e);
    wake?.();
  };
  const nextEvent = async () => {
    while (!events.length) await new Promise<void>((resolve) => (wake = resolve));
    return events.shift()!;
  };

  const launch = () => {
    const model = queue.shift();
    if (!model) return;
    const controller = new AbortController();
    running.set(model, controller);
    runWithModel({ ...opts, model }, deadline, controller.signal, () => report({ model, slow: true })).then(
      (answer) => report({ model, answer }),
      (error) => report({ model, error }),
    );
  };
  const timeFor = () => deadline - Date.now() >= MIN_START_MS;

  launch();
  while (running.size) {
    const e = await nextEvent();
    if (!running.has(e.model)) continue;
    if ("slow" in e) {
      // One call is taking long: give the next model a start alongside it rather than waiting it out.
      if (running.size < 2 && queue.length && timeFor()) {
        attempts.push(`${e.model}: slow`);
        resting.set(e.model, Date.now() + SLOW_REST_MS);
        launch();
      }
      continue;
    }
    running.delete(e.model);
    if ("answer" in e) {
      for (const other of running.values()) other.abort();
      if (!attempts.includes(`${e.model}: slow`)) resting.delete(e.model);
      return { ...e.answer, model: e.model, ...(attempts.length ? { tried: attempts } : {}) };
    }
    last = e.error;
    if (!(e.error instanceof AdvisorError) || !SWITCH_CODES.has(e.error.code)) {
      for (const other of running.values()) other.abort();
      throw e.error;
    }
    resting.set(e.model, Date.now() + (e.error.restMs ?? REST_MS));
    console.warn(`[advisor] ${e.model}: ${e.error.message}`);
    attempts.push(`${e.model}: ${e.error.code}${e.error.detail ? ` (${e.error.detail})` : ""}`);
    if (PASSING_CODES.has(e.error.code) && !secondGo.has(e.model)) {
      secondGo.add(e.model);
      queue.push(e.model);
    }
    if (running.size < 2 && queue.length && timeFor()) {
      // Every model has had its first go: a short breath before asking an overloaded one again.
      if (secondGo.has(queue[0]) && !running.size) await new Promise((resolve) => setTimeout(resolve, opts.pauseMs ?? 700));
      launch();
    }
  }
  if (last instanceof AdvisorError && attempts.length) last.detail = attempts.join("; ");
  throw last;
}

async function runWithModel(
  { apiKey, model, system, history, ctx, fetchImpl = fetch, stallMs = STALL_MS }: RunOptions,
  deadline: number,
  /** Stops this model when another one has answered. */
  stop: AbortSignal,
  /** Called when a call to the model has taken long enough to be worth starting another model. */
  onSlow: () => void,
): Promise<Answer> {
  const contents: Content[] = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const toolsUsed: string[] = [];
  // Results already given in this answer, so a model that asks the same thing twice is told so instead of being fed it again.
  const answered = new Set<string>();

  const request = async (round: number): Promise<Response> => {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) throw new AdvisorError(`${model} ran out of time.`, "upstream", "timeout");
    const thinking = noThinkingConfig.has(model) ? null : thinkingFor(model);
    const slow = setTimeout(onSlow, stallMs);
    try {
      const res = await fetchImpl(`${API}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          // On the last round, force a written answer instead of another tool call.
          toolConfig: { functionCallingConfig: { mode: round === MAX_TOOL_ROUNDS ? "NONE" : "AUTO" } },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            ...(thinking ? { thinkingConfig: thinking } : {}),
          },
        }),
        signal: AbortSignal.any([stop, AbortSignal.timeout(Math.min(remaining, CALL_MS))]),
      });
      clearTimeout(slow);
      // A model that does not know the thinking setting answers with a generic
      // "invalid argument", so any 400 gets one retry without it.
      if (thinking && res.status === 400 && !/API key/i.test(await res.clone().text())) {
        noThinkingConfig.add(model);
        return request(round);
      }
      return res;
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new AdvisorError(`${model} took too long to answer.`, "upstream", "timeout");
      }
      throw e;
    } finally {
      clearTimeout(slow);
    }
  };

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await request(round);

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (/API key/i.test(detail) && (res.status === 400 || res.status === 401 || res.status === 403)) {
        throw new AdvisorError("The Gemini API key was rejected.", "config", "key_rejected");
      }
      if (res.status === 403)
        throw new AdvisorError(`The Gemini API key doesn't have access to "${model}": ${detail.slice(0, 300)}`, "config", "no_model_access");
      if (res.status === 404) throw new AdvisorError(`Gemini model "${model}" was not found.`, "config", "model_not_found");
      if (res.status === 429) {
        const quota = quotaDetail(detail);
        throw new AdvisorError("The advisor is busy right now. Please try again in a minute.", "limit", "rate_limited", quota.detail, quota.restMs);
      }
      let reason = detail.slice(0, 300);
      try {
        reason = (JSON.parse(detail) as { error?: { message?: string } }).error?.message?.slice(0, 300) ?? reason;
      } catch {}
      throw new AdvisorError(`Gemini returned ${res.status}: ${reason}`, "upstream", `gemini_${res.status}`, res.status === 400 ? reason : undefined);
    }

    const data = (await res.json()) as {
      candidates?: { content?: Content; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) throw new AdvisorError("I can't help with that request.", "blocked");
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const calls = parts.filter((p): p is Extract<Part, { functionCall: unknown }> => "functionCall" in p);

    if (calls.length === 0) {
      const text = parts
        .filter((p): p is Extract<Part, { text: string }> => "text" in p && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      if (!text) {
        if (candidate?.finishReason === "SAFETY") throw new AdvisorError("I can't help with that request.", "blocked");
        throw new AdvisorError(
          `Gemini returned no answer (${candidate?.finishReason ?? "no candidate"}).`,
          "upstream",
          "empty_answer",
          `${candidate?.finishReason ?? "no candidate"}${toolsUsed.length ? ` after ${toolsUsed.join(", ")}` : ""}`,
        );
      }
      return { text, toolsUsed };
    }

    // Echo the model's turn back unchanged (it may carry thought signatures),
    // then answer every call it made. Before the last round, the results
    // themselves say that it is time to answer.
    contents.push({ role: "model", parts });
    const last = round === MAX_TOOL_ROUNDS - 1;
    contents.push({
      role: "user",
      parts: calls.map((c) => {
        toolsUsed.push(c.functionCall.name);
        const key = `${c.functionCall.name} ${JSON.stringify(c.functionCall.args ?? {})}`;
        const response = answered.has(key)
          ? { note: "You already have this result above. Don't call it again: answer the customer with what you have." }
          : runTool(c.functionCall.name, c.functionCall.args, ctx);
        answered.add(key);
        return {
          functionResponse: {
            name: c.functionCall.name,
            response: last ? { ...response, next_step: "That is all the tool calls for this answer. Reply to the customer now with what you have." } : response,
          },
        };
      }),
    });
  }
  throw new AdvisorError("The advisor took too many steps. Please rephrase your question.", "upstream", "too_many_steps", toolsUsed.join(", "));
}
