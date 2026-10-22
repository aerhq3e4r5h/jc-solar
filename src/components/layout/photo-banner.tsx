import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * Full-width photo header for section pages: photo, navy wash, white text.
 * The photo is decorative (empty alt); the heading carries the meaning.
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
    <section className={cn("relative isolate overflow-hidden bg-navy text-white", className)}>
      <Image src={image} alt="" fill priority={priority} placeholder="blur" sizes="100vw" className="-z-20 object-cover" />
      <div className="photo-wash absolute inset-0 -z-10" aria-hidden="true" />
      <div className="container-page py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow mb-4 text-sun">{eyebrow}</p>}
          <h1 className="text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">{title}</h1>
          {children && <div className="mt-5 text-lg leading-relaxed text-white/80 sm:text-xl">{children}</div>}
        </div>
      </div>
    </section>
  );
}
