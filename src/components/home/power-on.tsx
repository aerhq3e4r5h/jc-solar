import { MARK } from "@/components/brand/logo";

const LINE_1 = "The grid switches off on a schedule.".split(" ");
const LINE_2 = "Your lights don't have to.".split(" ");

/**
 * The bold moment between the shop and the 24-hour story. As it scrolls
 * through, the words light up one by one and the logo draws itself: the
 * ring closes, the power stroke rises, the rays switch on and it glows.
 * Pure CSS (scroll-driven animations). Without support, or with reduced
 * motion, it simply shows the finished state.
 */
export function PowerOn() {
  let i = 0;
  const word = (w: string, accent: boolean) => (
    <span key={`${w}-${i}`} className="statement-word" style={{ "--i": i++ } as React.CSSProperties} data-accent={accent || undefined}>
      {w}{" "}
    </span>
  );
  return (
    <section className="statement grain relative isolate overflow-hidden bg-ink text-white" aria-labelledby="power-on-heading">
      <div className="container-page grid items-center gap-12 py-24 sm:py-32 lg:grid-cols-[1.4fr_1fr] lg:py-40">
        <h2 id="power-on-heading" className="type-wide text-[2.6rem] leading-[0.98] sm:text-6xl xl:text-7xl">
          <span className="block">{LINE_1.map((w) => word(w, false))}</span>
          <span className="mt-2 block">{LINE_2.map((w) => word(w, true))}</span>
        </h2>
        <div className="relative mx-auto aspect-square w-56 sm:w-72 lg:w-full lg:max-w-sm" aria-hidden="true">
          <div className="statement-glow absolute inset-[-25%] rounded-full bg-[radial-gradient(circle,oklch(0.86_0.17_88/0.38),transparent_62%)]" />
          <svg viewBox="0 0 100 100" className="relative size-full overflow-visible">
            <g fill="none" stroke="var(--sun)" strokeLinecap="round">
              <path className="statement-ring" d={MARK.ring} strokeWidth="10" pathLength={1} />
              <path className="statement-stroke" d={MARK.stroke} strokeWidth="10" pathLength={1} />
              <path className="statement-rays" d={MARK.rays} strokeWidth="5.5" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
