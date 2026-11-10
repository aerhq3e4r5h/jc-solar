import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { site } from "@/config/site";
import { MOTION_SCRIPT } from "@/lib/motion/pref";
import "./globals.css";

// One family throughout. Its width axis does the work: wide and heavy for
// headlines and prices, normal width for reading.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: `${site.name} | Solar panels, batteries and inverters`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", locale: "en_ZA", siteName: site.name },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191918" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning className={archivo.variable}>
      <body className="min-h-dvh">
        {/* Sets the motion level and starts scroll reveals before anything paints. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
