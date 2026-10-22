/** Decorative hero illustration: a low sun over a tilted array of panels. */
export function HeroArt() {
  const cols = 6;
  const rows = 3;
  return (
    <svg viewBox="0 0 560 440" aria-hidden="true" className="h-auto w-full" role="presentation">
      <defs>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--sun)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.34 0.06 258)" />
          <stop offset="100%" stopColor="oklch(0.22 0.04 258)" />
        </linearGradient>
        <linearGradient id="glare" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="400" cy="120" r="150" fill="url(#sunGlow)" />
      <circle cx="400" cy="120" r="52" fill="var(--sun)" />
      {[78, 104, 130].map((r, i) => (
        <circle key={r} cx="400" cy="120" r={r} fill="none" stroke="var(--sun)" strokeOpacity={0.35 - i * 0.1} strokeWidth="1.5" strokeDasharray="2 7" />
      ))}

      <g transform="translate(70 200) skewX(-18)">
        <rect x="-8" y="-8" width={cols * 62 + 16} height={rows * 52 + 16} rx="8" fill="oklch(0.85 0.01 258)" className="dark:opacity-30" />
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <rect key={`${r}-${c}`} x={c * 62} y={r * 52} width="58" height="48" rx="3" fill="url(#cell)" />
          )),
        )}
        <rect x="0" y="0" width={cols * 62 - 4} height={rows * 52 - 4} fill="url(#glare)" />
      </g>

      <g stroke="oklch(0.6 0.02 258)" strokeWidth="6" strokeLinecap="round" opacity="0.55">
        <path d="M150 368 L170 420" />
        <path d="M380 368 L400 420" />
      </g>
      <path d="M40 420 H540" stroke="oklch(0.6 0.02 258)" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}
