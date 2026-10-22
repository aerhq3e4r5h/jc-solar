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
  ) {
    super(message);
  }
}

/** Used when the configured model isn't available to the key. Always points at Google's current Flash model. */
export const FALLBACK_MODEL = "gemini-flash-latest";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TOOL_ROUNDS = 6;

type RunOptions = {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  ctx: ToolContext;
  fetchImpl?: typeof fetch;
};

/** Runs the conversation, retrying once on the fallback model if the configured one isn't available. */
export async function runAdvisor(opts: RunOptions): Promise<{ text: string; toolsUsed: string[]; model: string }> {
  try {
    return { ...(await runWithModel(opts)), model: opts.model };
  } catch (e) {
    const unavailable = e instanceof AdvisorError && (e.code === "model_not_found" || e.code === "no_model_access");
    if (!unavailable || opts.model === FALLBACK_MODEL) throw e;
    console.warn(`[advisor] ${e.message} Falling back to ${FALLBACK_MODEL}.`);
    return { ...(await runWithModel({ ...opts, model: FALLBACK_MODEL })), model: FALLBACK_MODEL };
  }
}

async function runWithModel({ apiKey, model, system, history, ctx, fetchImpl = fetch }: RunOptions): Promise<{ text: string; toolsUsed: string[] }> {
  const contents: Content[] = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const toolsUsed: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
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
          // and replies come back several times faster (hosting functions time out).
          ...(/2\.5-flash/i.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (/API key/i.test(detail) && (res.status === 400 || res.status === 401 || res.status === 403)) {
        throw new AdvisorError("The Gemini API key was rejected.", "config", "key_rejected");
      }
      if (res.status === 403)
        throw new AdvisorError(`The Gemini API key doesn't have access to "${model}": ${detail.slice(0, 300)}`, "config", "no_model_access");
      if (res.status === 404) throw new AdvisorError(`Gemini model "${model}" was not found.`, "config", "model_not_found");
      if (res.status === 429) throw new AdvisorError("The advisor is busy right now. Please try again in a minute.", "limit", "rate_limited");
      throw new AdvisorError(`Gemini returned ${res.status}: ${detail.slice(0, 300)}`, "upstream", `gemini_${res.status}`);
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
