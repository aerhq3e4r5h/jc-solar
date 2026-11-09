"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s()-]*$/, "Use digits, spaces and + only"),
  company: z.string().trim().max(120),
  marketing: z.boolean(),
});

export type ProfileResult = { ok: true } | { ok: false; error: string };

/** Saves the signed-in customer's own details (RLS: a user can update only their own profile, never their role). */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      company_name: parsed.data.company || null,
      marketing_email_opt_in: parsed.data.marketing,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Couldn't save your details. Please try again." };
  revalidatePath("/account");
  return { ok: true };
}
