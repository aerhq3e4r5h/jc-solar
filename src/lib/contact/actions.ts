"use server";

import { z } from "zod";
import { saPhone } from "@/lib/checkout/schema";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email address").max(120),
  phone: z.union([saPhone, z.literal("")]).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  // Hidden field people never fill in; bots usually do.
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
    if (fields.website) return { ok: true }; // silently drop bots
    return { ok: false, error: "Please check the highlighted fields.", fields };
  }
  if (!isServiceRoleConfigured()) return { ok: false, error: "Messages can't be sent right now. Please try again later." };
  const f = parsed.data;
  const { error } = await createAdminClient()
    .from("quote_requests")
    .insert({ name: f.name, email: f.email, phone: f.phone || null, details: f.message, source: "contact_form" });
  if (error) return { ok: false, error: "Your message couldn't be sent. Please try again." };
  return { ok: true };
}
