import type { Metadata } from "next";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="container-page flex justify-center py-20">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-muted-foreground">Track orders, installations and saved quotes.</p>
        </div>
        <Suspense>
          <LoginForm configured={isSupabaseConfigured()} />
        </Suspense>
      </div>
    </div>
  );
}
