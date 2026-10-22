import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type SessionUser = { id: string; email: string | null; role: UserRole; fullName: string | null };

/** The signed-in user with their role, or null. Reads cookies, so call inside <Suspense>. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  // getUser() verifies the token with Supabase rather than trusting the cookie.
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role: profile?.role ?? "customer",
    fullName: profile?.full_name ?? null,
  };
}

/** Redirects to sign-in unless the user has one of the given roles. */
export async function requireRole(roles: UserRole[], next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(user.role)) redirect("/?error=forbidden");
  return user;
}
