"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";

/**
 * Floating "Chat on WhatsApp" button. Shows only once the business's WhatsApp
 * number is set in src/config/site.ts. On a product page the message names
 * the product.
 */
export function WhatsAppButton() {
  const pathname = usePathname();
  const number = site.company.whatsapp?.replace(/\D/g, "");
  if (!number) return null;
  const onProduct = /^\/shop\/[^/]+\/[^/]+$/.test(pathname ?? "");
  const open = () => {
    const title = onProduct ? document.title.split(" | ")[0] : null;
    const text = title ? `Hi ${site.name}, I have a question about the ${title}.` : `Hi ${site.name}, I have a question.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  return (
    <button
      type="button"
      onClick={open}
      className="fixed right-4 bottom-24 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-[#1f9d55] pr-5 pl-4 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 md:bottom-6"
    >
      <MessageCircle className="size-5" aria-hidden="true" /> Chat on WhatsApp
    </button>
  );
}
