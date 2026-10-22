"use client";

import { ZoomIn } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[active];
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border bg-white"
        aria-label={`Zoom image: ${current.alt}`}
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-background/80 p-2 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-4" aria-hidden="true" />
        </span>
      </button>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-xl border bg-white transition-opacity hover:opacity-100",
                  i === active ? "ring-2 ring-ring" : "opacity-70",
                )}
              >
                <Image src={img.url} alt="" fill sizes="10vw" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-5xl p-2 sm:max-w-5xl">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative aspect-square max-h-[85vh] w-full bg-white">
            <Image src={current.url} alt={current.alt} fill sizes="90vw" className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
