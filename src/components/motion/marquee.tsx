import { cn } from "@/lib/utils";

/**
 * A row that scrolls sideways forever (pure CSS). The items are rendered
 * twice so the loop is seamless; the copy is hidden from screen readers.
 * With reduced motion it's a static, wrapping row.
 */
export function Marquee({
  children,
  reverse = false,
  seconds = 40,
  className,
  label,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  seconds?: number;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn("marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]", className)}
      role="region"
      aria-label={label}
    >
      <div className={cn("marquee-track flex w-max", reverse && "reverse")} style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}>
        <ul className="flex shrink-0 items-center">{children}</ul>
        <ul className="flex shrink-0 items-center" aria-hidden="true" inert>
          {children}
        </ul>
      </div>
    </div>
  );
}
