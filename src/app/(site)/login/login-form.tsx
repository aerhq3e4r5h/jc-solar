"use client";

import { Eye, EyeOff, Loader2, LogIn, Mail, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "reset" | "link";

const emailSchema = z.email("Enter a valid email address");
export const MIN_PASSWORD = 8;
// Google sign-in shows only once it's switched on in Supabase (Authentication, Providers).
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "1";

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

/** Supabase's messages, in plain words. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again, or reset your password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. We sent you a link when you signed up.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts just now. Please wait a few minutes and try again.";
  if (m.includes("password should be")) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (m.includes("weak") || m.includes("pwned")) return "That password is too easy to guess. Please choose another.";
  return message;
}

export function LoginForm({ configured, mode: initialMode = "signin" }: { configured: boolean; mode?: AuthMode }) {
  const params = useSearchParams();
  const router = useRouter();
  const next = (() => {
    const n = params.get("next") ?? "/account";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
  })();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset" | "link">(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Sign-in did not complete. The link may have expired. Please try again." : null,
  );
  const [unconfirmed, setUnconfirmed] = useState(false);

  const callback = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  if (!configured) {
    return (
      <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
        Sign-in is not set up yet. Add the Supabase keys to the environment (see README).
      </p>
    );
  }

  const switchTo = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setUnconfirmed(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    const address = parsed.data;
    if ((mode === "signin" || mode === "signup") && password.length < (mode === "signup" ? MIN_PASSWORD : 1)) {
      return setError(mode === "signup" ? `Use at least ${MIN_PASSWORD} characters for your password.` : "Enter your password.");
    }
    if (mode === "signup" && !name.trim()) return setError("Enter your name.");
    setBusy(true);
    const auth = createClient().auth;
    try {
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email: address, password });
        if (error) {
          setUnconfirmed(error.message.toLowerCase().includes("email not confirmed"));
          return setError(friendly(error.message));
        }
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: callback(next), data: { full_name: name.trim() } },
        });
        if (error) return setError(friendly(error.message));
        // Supabase answers an existing address with a user that has no identities.
        if (data.user && data.user.identities?.length === 0) {
          setMode("signin");
          return setError("There's already an account with this email. Sign in, or reset your password.");
        }
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        return setSent("confirm");
      }
      if (mode === "reset") {
        const { error } = await auth.resetPasswordForEmail(address, { redirectTo: callback("/account/password") });
        if (error) return setError(friendly(error.message));
        return setSent("reset");
      }
      const { error } = await auth.signInWithOtp({ email: address, options: { emailRedirectTo: callback(next) } });
      if (error) return setError(friendly(error.message));
      setSent("link");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callback(next) } });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setUnconfirmed(false);
    setSent("confirm");
  }

  async function google() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
    if (error) setError(friendly(error.message));
  }

  if (sent) {
    const what = {
      confirm: {
        title: "Confirm your email",
        body: "We sent a confirmation link to",
        after: "Open it to finish creating your account. It can take a minute to arrive.",
      },
      reset: {
        title: "Check your email",
        body: "If there's an account for",
        after: "you'll get a link to choose a new password. It expires in an hour.",
      },
      link: { title: "Check your email", body: "We sent a sign-in link to", after: "It expires in an hour." },
    }[sent];
    return (
      <div role="status" className="space-y-3 rounded-xl border bg-card p-5">
        <p className="flex items-center gap-2 font-bold">
          <Mail className="size-4" /> {what.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {what.body} <strong className="text-foreground">{email.trim()}</strong>. {what.after} Check your spam folder if you don&apos;t see it.
        </p>
        <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => (setSent(null), switchTo("signin"))}>
          Back to sign in
        </button>
      </div>
    );
  }

  const tabs: { id: AuthMode; label: string }[] = [
    { id: "signin", label: "Sign in" },
    { id: "signup", label: "Create account" },
  ];

  return (
    <div className="space-y-6">
      {(mode === "signin" || mode === "signup") && (
        <div role="tablist" aria-label="Sign in or create an account" className="grid grid-cols-2 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => switchTo(t.id)}
              className={cn(
                "rounded-md py-2 text-sm font-semibold transition-colors",
                mode === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {mode === "reset" && (
        <div>
          <h2 className="text-lg font-bold">Reset your password</h2>
          <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
        </div>
      )}
      {mode === "link" && (
        <div>
          <h2 className="text-lg font-bold">Sign in with an email link</h2>
          <p className="text-sm text-muted-foreground">No password needed: we email you a link that signs you in.</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete={mode === "signup" ? "email" : "username"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        {(mode === "signin" || mode === "signup") && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchTo("reset")}
                  className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Forgot your password?
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                aria-describedby={mode === "signup" ? "password-rule" : undefined}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {mode === "signup" && (
              <p
                id="password-rule"
                className={cn("text-xs", password && password.length < MIN_PASSWORD ? "text-destructive" : "text-muted-foreground")}
              >
                At least {MIN_PASSWORD} characters. A short phrase is easy to remember and hard to guess.
              </p>
            )}
          </div>
        )}

        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}{" "}
            {unconfirmed && (
              <button type="button" onClick={resend} className="font-semibold underline underline-offset-4">
                Send the confirmation email again
              </button>
            )}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : mode === "signup" ? <UserPlus /> : mode === "signin" ? <LogIn /> : <Mail />}
          {{ signin: "Sign in", signup: "Create account", reset: "Email me a reset link", link: "Email me a sign-in link" }[mode]}
        </Button>
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground">
            Your account keeps your orders, invoices and quotes in one place. Orders you placed before with this email are added once you confirm it.
            See our{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        )}
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        {mode === "link" || mode === "reset" ? (
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => switchTo("signin")}>
            <LogIn /> Sign in with a password
          </Button>
        ) : (
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => switchTo("link")}>
            <Mail /> Email me a sign-in link instead
          </Button>
        )}
        {GOOGLE && (
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
            <GoogleIcon /> Continue with Google
          </Button>
        )}
      </div>
    </div>
  );
}
