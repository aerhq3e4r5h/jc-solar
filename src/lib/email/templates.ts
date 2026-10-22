// Plain, readable transactional emails. Every value is escaped.

import { formatRand } from "@/lib/pricing/vat";
import type { Email } from "./send";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Line = { name: string; quantity: number; lineTotal: number };
type Bank = { bank: string; accountName: string; accountNumber: string; branchCode: string; accountType: string } | null;

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:Arial,Helvetica,sans-serif;color:#162033">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#162033;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">JC <span style="color:#f5a524">Solar</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 28px;background:#f6f5f1;color:#5b6474;font-size:12px">All prices include 15% VAT. This email was sent about your order or quote; it is not marketing.</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(lines: Line[], total: number) {
  const rows = lines
    .map((l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${l.quantity} x ${esc(l.name)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee;white-space:nowrap">${formatRand(l.lineTotal)}</td></tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}
<tr><td style="padding:10px 0;font-weight:bold">Total (incl. VAT)</td><td align="right" style="padding:10px 0;font-weight:bold">${formatRand(total)}</td></tr></table>`;
}

function bankBlock(bank: Bank, reference: string) {
  if (!bank) {
    return `<p style="font-size:14px">To pay by EFT, reply to this email and we'll send our banking details. Use <strong>${esc(reference)}</strong> as your payment reference.</p>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;background:#fdf3df;border-radius:8px;padding:12px;width:100%">
<tr><td style="padding:4px 12px">Bank</td><td style="padding:4px 12px"><strong>${esc(bank.bank)}</strong></td></tr>
<tr><td style="padding:4px 12px">Account name</td><td style="padding:4px 12px"><strong>${esc(bank.accountName)}</strong></td></tr>
<tr><td style="padding:4px 12px">Account number</td><td style="padding:4px 12px"><strong>${esc(bank.accountNumber)}</strong></td></tr>
<tr><td style="padding:4px 12px">Branch code</td><td style="padding:4px 12px"><strong>${esc(bank.branchCode)}</strong></td></tr>
${bank.accountType ? `<tr><td style="padding:4px 12px">Account type</td><td style="padding:4px 12px">${esc(bank.accountType)}</td></tr>` : ""}
<tr><td style="padding:4px 12px">Reference</td><td style="padding:4px 12px"><strong>${esc(reference)}</strong></td></tr></table>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#f5a524;color:#162033;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;display:inline-block">${esc(label)}</a></p>`;

export function orderReceivedEmail(o: {
  to: string;
  name: string;
  orderNumber: string;
  orderUrl: string;
  lines: Line[];
  total: number;
  paymentMethod: "payfast" | "eft";
  bank: Bank;
  installationRequested: boolean;
}): Email {
  const eft = o.paymentMethod === "eft";
  const body = `<p style="font-size:14px">Hi ${esc(o.name)}, thank you for your order <strong>${esc(o.orderNumber)}</strong>.</p>
${itemsTable(o.lines, o.total)}
<p style="font-size:14px">Delivery is not included yet: we'll confirm the delivery cost for your address before dispatch.${o.installationRequested ? " Our technician will contact you to arrange a site assessment and quote the installation." : ""}</p>
${eft ? `<p style="font-size:14px">Please pay <strong>${formatRand(o.total)}</strong> by EFT within 48 hours. We hold your stock until then.</p>${bankBlock(o.bank, o.orderNumber)}` : `<p style="font-size:14px">If you haven't finished paying, you can do so from your order page.</p>`}
${button(o.orderUrl, "View your order")}`;
  return {
    to: o.to,
    subject: `Order ${o.orderNumber} received`,
    html: layout(eft ? "Order received: awaiting EFT payment" : "Order received", body),
    text: `Order ${o.orderNumber} received. Total ${formatRand(o.total)} incl. VAT. ${eft ? `Pay by EFT within 48 hours using reference ${o.orderNumber}.` : ""} View it at ${o.orderUrl}`,
  };
}

export function paymentReceivedEmail(o: { to: string; name: string; orderNumber: string; orderUrl: string; total: number }): Email {
  const body = `<p style="font-size:14px">Hi ${esc(o.name)}, we've received your payment of <strong>${formatRand(o.total)}</strong> for order <strong>${esc(o.orderNumber)}</strong>.</p>
<p style="font-size:14px">We'll confirm delivery and let you know as soon as your order is on its way.</p>
<p style="font-size:14px">Your invoice is attached. Keep it for your warranty records.</p>
${button(o.orderUrl, "View your order")}`;
  return {
    to: o.to,
    subject: `Payment received for order ${o.orderNumber}`,
    html: layout("Payment received", body),
    text: `Payment of ${formatRand(o.total)} received for order ${o.orderNumber}. Your invoice is attached.`,
  };
}

export function quoteEmail(o: { to: string; name: string; quoteCode: string; pdfUrl: string; total: number; validUntil: string; bank: Bank }): Email {
  const body = `<p style="font-size:14px">Hi ${esc(o.name)}, here is your quotation <strong>${esc(o.quoteCode)}</strong> for <strong>${formatRand(o.total)}</strong> (incl. VAT), valid until ${esc(o.validUntil)}.</p>
${button(o.pdfUrl, "Download the quotation (PDF)")}
<p style="font-size:14px">To order, check out on our website, or pay by EFT and email us your proof of payment.</p>
${bankBlock(o.bank, o.quoteCode)}`;
  return { to: o.to, subject: `Your JC Solar quotation ${o.quoteCode}`, html: layout("Your quotation", body), text: `Quotation ${o.quoteCode}: ${formatRand(o.total)} incl. VAT, valid until ${o.validUntil}. Download: ${o.pdfUrl}` };
}
