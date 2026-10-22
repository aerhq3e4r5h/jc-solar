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
 * Models tried in order after the configured one, when it is missing,
 * overloaded or too slow. The "-latest" aliases always point at Google's
 * current Flash and Flash-Lite models.
 */
export const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"];

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TOOL_ROUNDS = 6;
/** Whole answer, all retries included; hosting functions are stopped at about 26 s. */
const DEADLINE_MS = 23_000;
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

type RunOptions = {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  ctx: ToolContext;
  fetchImpl?: typeof fetch;
  /** Milliseconds available for the whole answer. */
  budgetMs?: number;
};

/** Runs the conversation, moving to the next model when one is unavailable, overloaded or slow. */
export async function runAdvisor(opts: RunOptions): Promise<{ text: string; toolsUsed: string[]; model: string }> {
  const deadline = Date.now() + (opts.budgetMs ?? DEADLINE_MS);
  const models = [opts.model, ...FALLBACK_MODELS.filter((m) => m !== opts.model)];
  let last: unknown;
  const attempts: string[] = [];
  for (const model of models) {
    // Not worth starting a model with too little time left for an answer.
    if (model !== models[0] && deadline - Date.now() < 5_000) break;
    try {
      return { ...(await runWithModel({ ...opts, model }, deadline)), model };
    } catch (e) {
      last = e;
      if (!(e instanceof AdvisorError) || !SWITCH_CODES.has(e.code)) throw e;
      console.warn(`[advisor] ${model}: ${e.message}`);
      attempts.push(`${model}: ${e.code}${e.detail ? ` (${e.detail})` : ""}`);
    }
  }
  if (last instanceof AdvisorError && attempts.length > 1) last.detail = attempts.join("; ");
  throw last;
}

// Models that rejected the thinking setting; remembered for this server instance.
const noThinkingConfig = new Set<string>();

async function runWithModel({ apiKey, model, system, history, ctx, fetchImpl = fetch }: RunOptions, deadline: number) {
  const contents: Content[] = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const toolsUsed: string[] = [];

  const request = async (round: number): Promise<Response> => {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) throw new AdvisorError(`${model} ran out of time.`, "upstream", "timeout");
    const thinking = /flash/i.test(model) && !noThinkingConfig.has(model);
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
            // Flash answers this kind of question well without extended thinking,
            // and several times faster.
            ...(thinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
        signal: AbortSignal.timeout(remaining),
      });
      if (thinking && res.status === 400) {
        const detail = await res.clone().text();
        if (/thinking/i.test(detail)) {
          noThinkingConfig.add(model);
          return request(round);
        }
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
