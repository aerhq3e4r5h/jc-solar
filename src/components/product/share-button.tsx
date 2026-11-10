"use client";

import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Share a product: straight to WhatsApp, copy the link, or the phone's own share sheet. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the WhatsApp option still works.
    }
  };
  const more = () => navigator.share?.({ title, url }).catch(() => undefined);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          {copied ? <Check /> : <Share2 />}
          {copied ? "Link copied" : "Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener">
            <MessageCircle aria-hidden="true" /> Send on WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copy}>
          <Link2 aria-hidden="true" /> Copy link
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <DropdownMenuItem onSelect={more}>
            <Share2 aria-hidden="true" /> More ways to share
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
