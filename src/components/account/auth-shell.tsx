import { FileText, PackageCheck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import houseLit from "@/assets/home/house-night-on.webp";

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
      <aside className="dark relative isolate hidden min-h-[38rem] overflow-hidden rounded-2xl bg-[#0f0f11] p-10 text-ink-foreground lg:block">
        {/* The house from the home page, lights on. */}
        <div className="absolute inset-x-0 bottom-0 -z-10 aspect-[4/3] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]" aria-hidden="true">
          <Image src={houseLit} alt="" fill sizes="(min-width: 1024px) 45vw, 0px" placeholder="blur" className="object-cover" />
        </div>
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
