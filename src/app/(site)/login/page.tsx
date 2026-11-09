import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" intro="Sign in to see your orders, invoices and quotes.">
      <Suspense>
        <LoginForm configured={isSupabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
