import { Suspense } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CompareBar } from "@/components/compare/compare-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MotionProvider } from "@/components/motion/reveal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <div className="flex min-h-dvh flex-col">
        <div className="scroll-progress" aria-hidden="true" />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Suspense>
          <CompareBar />
        </Suspense>
        <CartDrawer />
        <Suspense>
          <WhatsAppButton />
        </Suspense>
      </div>
    </MotionProvider>
  );
}
