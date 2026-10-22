"use client";

import { Loader2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.email("Enter a valid email address");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(params.get("error") ? "Sign-in did not complete. Please try again." : null);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  if (!configured) {
    return (
      <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
        Sign-in is not set up yet. Add the Supabase keys to the environment (see README).
      </p>
    );
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("idle");
      return setError(error.message);
    }
    setStatus("sent");
  }

  async function google() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-lg border bg-accent p-4 text-sm">
        Check <strong>{email}</strong> for a sign-in link. It expires in an hour.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
        <GoogleIcon /> Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={sendLink} className="space-y-3" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : "email-purpose"}
          />
          <p id="email-purpose" className="text-xs text-muted-foreground">
            We use your email to sign you in and send order updates.
          </p>
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
          {status === "sending" ? <Loader2 className="animate-spin" /> : <Mail />} Email me a sign-in link
        </Button>
      </form>
    </div>
  );
}
