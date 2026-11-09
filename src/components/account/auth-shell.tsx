import { FileText, PackageCheck, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

const PERKS = [
  { icon: PackageCheck, text: "Every order and its status in one place" },
  { icon: FileText, text: "Invoices and quotes to download any time" },
  { icon: ShieldCheck, text: "Your password is stored only as a secure hash, never as plain text" },
];

/** Two-column frame for the sign-in and sign-up pages. */
export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16 lg:py-20">
      <div className="mx-auto w-full max-w-sm lg:order-2">
        <h1 className="type-wide text-3xl">{title}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{intro}</p>
        {children}
      </div>
      <aside className="dark grain relative isolate hidden overflow-hidden rounded-2xl bg-ink p-10 text-ink-foreground lg:block">
        <LogoMark tile={false} className="pointer-events-none absolute -right-20 -bottom-24 -z-10 size-[26rem] text-white/[0.05]" />
        <p className="type-wide text-3xl leading-tight">
          Your power,
          <br />
          <span className="text-sun">on record.</span>
        </p>
        <ul className="mt-8 space-y-4">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-white/80">
              <Icon className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
