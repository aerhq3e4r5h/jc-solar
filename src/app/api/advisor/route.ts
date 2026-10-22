import type { NextRequest } from "next/server";
import { z } from "zod";
import { AdvisorError, runAdvisor } from "@/lib/advisor/gemini";
import { advisorSystemPrompt } from "@/lib/advisor/prompt";
import { allowRequest } from "@/lib/advisor/rate-limit";
import { extractRecommendations, recommendationCard } from "@/lib/advisor/tools";
import { getCatalogue, getCompatibilityOverrides } from "@/lib/catalogue/queries";
import { geminiConfig } from "@/lib/env.server";
import { requestIp } from "@/lib/payfast/server";

// The Solar Advisor. The browser sends the conversation so far (nothing is
// stored on our side); we answer with the model's reply and cards for the
// products it recommended.

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the customer.")
    .refine((m) => m.filter((t) => t.role === "user").every((t) => t.text.length <= 1500), "Messages are limited to 1500 characters.")
    .refine((m) => m.reduce((n, t) => n + t.text.length, 0) <= 40_000, "This conversation is too long. Start a new one."),
});

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: NextRequest) {
  const config = geminiConfig();
  if (!config) {
    return json({ error: "The Solar Advisor isn't switched on yet. Please contact us and we'll size your system for you." }, 503);
  }

  // Only our own pages may call this.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return json({ error: "Forbidden" }, 403);

  if (!allowRequest(requestIp(request.headers) ?? "unknown")) {
    return json({ error: "You've sent a lot of messages in a short time. Please wait a few minutes and try again." }, 429);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);

  const [catalogue, overrides] = await Promise.all([getCatalogue(), getCompatibilityOverrides()]);
  const today = new Intl.DateTimeFormat("en-ZA", { dateStyle: "long", timeZone: "Africa/Johannesburg" }).format(new Date());

  try {
    const { text } = await runAdvisor({
      apiKey: config.apiKey,
      model: config.model,
      system: advisorSystemPrompt(today),
      history: parsed.data.messages,
      ctx: { catalogue, overrides },
    });
    return json({ reply: text, products: extractRecommendations(text, catalogue).map(recommendationCard) });
  } catch (e) {
    if (e instanceof AdvisorError) {
      if (e.kind === "config" || e.kind === "upstream") console.error(`[advisor] ${e.message}`);
      const message =
        e.kind === "config" || e.kind === "upstream"
          ? "The advisor is having trouble right now. Please try again shortly, or contact us."
          : e.message;
      return json({ error: message, code: e.code }, e.kind === "limit" ? 429 : e.kind === "blocked" ? 400 : 502);
    }
    console.error("[advisor]", e);
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return json(
      {
        error: timedOut ? "The advisor took too long to answer. Please try again." : "Something went wrong. Please try again.",
        code: timedOut ? "timeout" : "error",
      },
      timedOut ? 504 : 500,
    );
  }
}
