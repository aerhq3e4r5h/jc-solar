import "server-only";

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY
// (local development) messages are logged instead of sent, so checkout
// never fails because email isn't set up yet.

export type Email = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: Buffer }[] };

export async function sendEmail(email: Email): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "JC Solar <orders@example.com>";
  if (!key) {
    console.info(`[email not sent: RESEND_API_KEY missing] to=${email.to} subject="${email.subject}"`);
    return { sent: false, error: "not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}
