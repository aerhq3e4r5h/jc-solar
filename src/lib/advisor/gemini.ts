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
const MAX_TOOL_ROUNDS = 6;
/** Whole answer, all retries included; hosting functions are stopped at about 26 s. */
const DEADLINE_MS = 23_000;
/** The longest one call to a model may take while another model is still untried: a slow model is left for a faster one. */
const CALL_MS = 9_000;
/** A model that just failed is tried last for this long. */
const REST_MS = 3 * 60_000;
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
]);

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
  /** Milliseconds one call may take while another model is still untried. */
  callMs?: number;
};

/** Runs the conversation, moving to the next model when one is unavailable, overloaded or slow. */
export async function runAdvisor(opts: RunOptions): Promise<{ text: string; toolsUsed: string[]; model: string; tried?: string[] }> {
  const start = Date.now();
  const deadline = start + (opts.budgetMs ?? DEADLINE_MS);
  const listed = [opts.model, ...FALLBACK_MODELS.filter((m) => m !== opts.model)];
  // Models that failed a moment ago go to the back of the queue.
  const models = [...listed.filter((m) => (resting.get(m) ?? 0) <= start), ...listed.filter((m) => (resting.get(m) ?? 0) > start)];
  let last: unknown;
  const attempts: string[] = [];
  for (const [i, model] of models.entries()) {
    // Not worth starting a model with too little time left for an answer.
    if (i > 0 && deadline - Date.now() < 5_000) break;
    try {
      const answer = await runWithModel({ ...opts, model }, deadline, i < models.length - 1);
      resting.delete(model);
      return { ...answer, model, ...(attempts.length ? { tried: attempts } : {}) };
    } catch (e) {
      last = e;
      if (!(e instanceof AdvisorError) || !SWITCH_CODES.has(e.code)) throw e;
      resting.set(model, Date.now() + REST_MS);
      console.warn(`[advisor] ${model}: ${e.message}`);
      attempts.push(`${model}: ${e.code}${e.detail ? ` (${e.detail})` : ""}`);
    }
  }
  if (last instanceof AdvisorError && attempts.length > 1) last.detail = attempts.join("; ");
  throw last;
}

async function runWithModel(
  { apiKey, model, system, history, ctx, fetchImpl = fetch, callMs = CALL_MS }: RunOptions,
  deadline: number,
  othersWaiting: boolean,
) {
  const contents: Content[] = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const toolsUsed: string[] = [];

  const request = async (round: number): Promise<Response> => {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) throw new AdvisorError(`${model} ran out of time.`, "upstream", "timeout");
    const thinking = noThinkingConfig.has(model) ? null : thinkingFor(model);
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
        // While another model is still untried, a slow call is cut short so that model gets its turn.
        signal: AbortSignal.timeout(othersWaiting ? Math.min(remaining, callMs) : remaining),
      });
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
      if (res.status === 429) throw new AdvisorError("The advisor is busy right now. Please try again in a minute.", "limit", "rate_limited");
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
        throw new AdvisorError(`Gemini returned no answer (${candidate?.finishReason ?? "no candidate"}).`, "upstream", "empty_answer");
      }
      return { text, toolsUsed };
    }

    // Echo the model's turn back unchanged (it may carry thought signatures),
    // then answer every call it made.
    contents.push({ role: "model", parts });
    contents.push({
      role: "user",
      parts: calls.map((c) => {
        toolsUsed.push(c.functionCall.name);
        return { functionResponse: { name: c.functionCall.name, response: runTool(c.functionCall.name, c.functionCall.args, ctx) } };
      }),
    });
  }
  throw new AdvisorError("The advisor took too many steps. Please rephrase your question.", "upstream", "too_many_steps");
}
