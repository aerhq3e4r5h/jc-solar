import { NotFoundContent } from "@/components/content/not-found-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// Unmatched URLs render outside the shop layout, so bring the header and footer along.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  );
}
