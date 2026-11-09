import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "../login/login-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" intro="Track every order, download invoices and keep your quotes, all in one place.">
      <Suspense>
        <LoginForm configured={isSupabaseConfigured()} mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
