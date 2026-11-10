"use client";

import { ChevronLeft, ChevronRight, Info, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Shared, vtName } from "@/components/motion/page-transition";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Photo = { url: string; alt: string; sameRange?: boolean };

/**
 * Product photos.
 * - Desktop: a magnified view follows the pointer over the main photo;
 *   thumbnails below; arrow keys step through.
 * - Phones: a swipe row with snap points and dots.
 * - Either opens a full-screen viewer (arrows, keys, tap or click to zoom;
 *   pinch zoom works as usual on touch screens).
 */
const wideQuery = "(min-width: 640px)";
const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia(wideQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function Gallery({ images, name, sale, productId }: { images: Photo[]; name: string; sale?: React.ReactNode; productId?: string }) {
  // The photo that morphs in from the shop tile: the main photo on wider screens, the swipe row on phones.
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(wideQuery).matches,
    () => true,
  );
  const shared = (on: boolean, node: React.ReactNode) => (productId && on ? <Shared name={vtName("product", productId)}>{node}</Shared> : node);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const row = useRef<HTMLUListElement>(null);
  const current = images[active];
  const many = images.length > 1;

  const go = useCallback((i: number) => setActive((i + images.length) % images.length), [images.length]);
  const onKey = (e: React.KeyboardEvent) => {
    if (!many) return;
    if (e.key === "ArrowRight") (e.preventDefault(), go(active + 1));
    if (e.key === "ArrowLeft") (e.preventDefault(), go(active - 1));
  };

  // Keep the phone swipe row and the dots in step.
  const onScroll = () => {
    const el = row.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };
  const toSlide = (i: number) =>
    row.current?.scrollTo({
      left: i * row.current.clientWidth,
      behavior: "smooth",
    });

  return (
    <div className="space-y-3" onKeyDown={onKey}>
      {/* Desktop and tablet: main photo with a zoom lens */}
      {shared(
        wide,
        <button
          type="button"
          onClick={() => setViewer(true)}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            setLens({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
          onPointerLeave={() => setLens(null)}
          data-product-photo
          className="group relative hidden aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border bg-white sm:block"
          aria-label={`Open full-screen photos: ${current.alt}`}
        >
          <Image src={current.url} alt={current.alt} fill priority quality={90} sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" />
          {lens && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-white bg-no-repeat transition-[background-position] duration-75"
              style={{
                backgroundImage: `url(${current.url})`,
                backgroundSize: "220%",
                backgroundPosition: `${lens.x}% ${lens.y}%`,
              }}
            />
          )}
          {sale}
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-sm">
            <Maximize2 className="size-3.5" aria-hidden="true" /> Full screen
          </span>
        </button>,
      )}

      {/* Phones: swipe with snap and dots */}
      <div className="relative sm:hidden">
        {shared(
          !wide,
          <ul
            ref={row}
            onScroll={onScroll}
            data-product-photo
            className="flex snap-x snap-mandatory overflow-x-auto rounded-xl border bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Product photos"
          >
            {images.map((img, i) => (
              <li key={img.url} className="relative aspect-square w-full shrink-0 snap-center">
                <button type="button" className="absolute inset-0" onClick={() => setViewer(true)} aria-label={`Open full-screen photo ${i + 1}`}>
                  <Image src={img.url} alt={img.alt} fill priority={i === 0} quality={90} sizes="100vw" className="object-contain" />
                </button>
              </li>
            ))}
          </ul>,
        )}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">{sale}</div>
        {many && (
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => toSlide(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-foreground" : "w-2 bg-foreground/25")}
              />
            ))}
          </div>
        )}
      </div>

      {current.sameRange && (
        <p className="flex items-start gap-2 rounded-md bg-shelf px-3 py-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-foreground">Range photo.</span> It shows another model from the same range, so the rating label on
            your unit will differ.
          </span>
        </p>
      )}

      {many && (
        <ul className="hidden grid-cols-5 gap-2 sm:grid">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-md border bg-white transition-opacity hover:opacity-100",
                  i === active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60",
                )}
              >
                <Image src={img.url} alt="" fill sizes="10vw" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Viewer open={viewer} onOpenChange={setViewer} images={images} index={active} onIndex={go} name={name} />
    </div>
  );
}

function Viewer({
  open,
  onOpenChange,
  images,
  index,
  onIndex,
  name,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  images: Photo[];
  index: number;
  onIndex: (i: number) => void;
  name: string;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const many = images.length > 1;
  const img = images[index];

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex(index + 1);
      if (e.key === "ArrowLeft") onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, many, index, onIndex]);

  const step = (d: number) => {
    setZoom(null);
    onIndex(index + d);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setZoom(null);
        onOpenChange(o);
      }}
    >
      <DialogContent showCloseButton={false} className="h-dvh max-h-dvh w-screen max-w-none gap-0 rounded-none border-0 bg-white p-0 sm:max-w-none">
        <DialogTitle className="sr-only">{name}: photos</DialogTitle>
        <div className="relative h-full w-full overflow-hidden">
          <button
            type="button"
            className={cn("absolute inset-0 touch-pinch-zoom", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
            onClick={(e) => {
              if (zoom) return setZoom(null);
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            }}
            aria-label={zoom ? "Zoom out" : "Zoom in"}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              quality={90}
              sizes="100vw"
              className="object-contain transition-transform duration-300"
              style={
                zoom
                  ? {
                      transform: "scale(2.2)",
                      transformOrigin: `${zoom.x}% ${zoom.y}%`,
                    }
                  : undefined
              }
            />
          </button>
          <DialogClose
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-ink text-ink-foreground"
            aria-label="Close photos"
          >
            <X className="size-5" />
          </DialogClose>
          {many && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm"
                aria-label="Next photo"
              >
                <ChevronRight className="size-5" />
              </button>
              <p className="num absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-ink-foreground">
                {index + 1} of {images.length}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
