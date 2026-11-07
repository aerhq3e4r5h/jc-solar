import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * Department banner for section pages: a contained photo with a graphite
 * wash and white text. The photo is decorative (empty alt); the heading
 * carries the meaning.
 */
export function PhotoBanner({
  image,
  eyebrow,
  title,
  children,
  className,
  priority = true,
}: {
  image: StaticImageData;
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("container-page pt-4 sm:pt-6", className)}>
      <section className="relative isolate overflow-hidden rounded-xl bg-ink text-white">
        <div className="parallax-hero absolute inset-0 -z-20">
          <Image src={image} alt="" fill priority={priority} placeholder="blur" sizes="(min-width: 1440px) 1440px, 100vw" className="object-cover" />
        </div>
        <div className="photo-wash absolute inset-0 -z-10" aria-hidden="true" />
        <div className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div className="max-w-3xl">
            {eyebrow && <p className="mb-3 text-sm font-semibold text-white/70">{eyebrow}</p>}
            <h1 className="type-wide text-4xl leading-[0.98] sm:text-5xl">{title}</h1>
            {children && <div className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{children}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
