import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { requireRole } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

async function Form() {
  const user = await requireRole(["customer", "admin", "sales", "technician"], "/account/password");
  return <PasswordForm email={user.email} />;
}

export default function PasswordPage() {
  return (
    <AuthShell title="Choose a new password" intro="Use at least 8 characters. You'll stay signed in on this device.">
      <Suspense>
        <Form />
      </Suspense>
    </AuthShell>
  );
}
