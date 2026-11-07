"use client";

import { ArrowDown, ArrowUp, ImagePlus, Info, Loader2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { addPhotos, deletePhoto, reorderPhotos } from "../../photo-actions";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_MB = 5;

type Uploaded = { id: string; url: string };

export function PhotoManager({
  productId,
  uploaded,
  supplier,
}: {
  productId: string;
  uploaded: Uploaded[];
  supplier: { url: string; sameRange: boolean }[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState(uploaded);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  // Keep local order in step when the server sends a fresh list (after an upload or delete).
  const [seen, setSeen] = useState(uploaded);
  if (seen !== uploaded) {
    setSeen(uploaded);
    setOrder(uploaded);
  }

  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    const bad = list.find((f) => !TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024);
    if (bad) return void toast.error(`${bad.name}: use a JPG, PNG, WebP or AVIF photo under ${MAX_MB} MB.`);
    setUploading(true);
    const supabase = createClient();
    const paths: string[] = [];
    for (const f of list) {
      const ext = f.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        setUploading(false);
        return void toast.error(`${f.name} didn't upload: ${error.message}`);
      }
      paths.push(path);
    }
    const r = await addPhotos(productId, paths);
    setUploading(false);
    if (input.current) input.current.value = "";
    if (!r.ok) return void toast.error(r.error);
    toast.success(`Added ${paths.length} photo${paths.length === 1 ? "" : "s"}. The shop is updated.`);
    router.refresh();
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    startTransition(async () => {
      const r = await reorderPhotos(
        productId,
        next.map((p) => p.id),
      );
      if (!r.ok) {
        toast.error(r.error);
        setOrder(order);
      }
    });
  };

  const remove = (p: Uploaded) =>
    startTransition(async () => {
      const r = await deletePhoto(productId, p.id);
      if (!r.ok) return void toast.error(r.error);
      setOrder((o) => o.filter((x) => x.id !== p.id));
      toast.success("Photo deleted.");
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <section className="rounded-xl border p-5" aria-labelledby="uploaded-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="uploaded-heading" className="text-lg font-bold">
              Your photos
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Photos you upload replace the supplier&apos;s in the shop. The first one is the main photo. For the cleanest look, use photos of the
              product on a plain white background, square, at least 1000 pixels wide.
            </p>
          </div>
          <div>
            <input
              ref={input}
              type="file"
              accept={TYPES.join(",")}
              multiple
              className="sr-only"
              id="photo-upload"
              onChange={(e) => upload(e.target.files)}
              disabled={uploading}
            />
            <Button asChild disabled={uploading}>
              <label htmlFor="photo-upload" className="cursor-pointer">
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {uploading ? "Uploading" : "Upload photos"}
              </label>
            </Button>
          </div>
        </div>

        {order.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No photos uploaded yet, so the shop shows the supplier&apos;s photos below.
          </p>
        ) : (
          <ol className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {order.map((p, i) => (
              <li key={p.id} className="space-y-2">
                <div className={cn("relative aspect-square overflow-hidden rounded-lg border bg-white", i === 0 && "ring-2 ring-foreground ring-offset-2")}>
                  <Image src={p.url} alt="" fill sizes="200px" className="object-contain" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-ink-foreground">
                      <Star className="size-3" aria-hidden="true" /> Main photo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label={`Move photo ${i + 1} earlier`}>
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1 || pending}
                    aria-label={`Move photo ${i + 1} later`}
                  >
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="ml-auto text-destructive" onClick={() => remove(p)} disabled={pending} aria-label={`Delete photo ${i + 1}`}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="supplier-heading">
        <h2 id="supplier-heading" className="text-lg font-bold">
          Supplier photos
        </h2>
        {supplier.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Solar Europe has no photo of this product. Upload one above.</p>
        ) : (
          <>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {order.length ? "Hidden in the shop while you have your own photos." : "Shown in the shop until you upload your own."}
            </p>
            {supplier.some((s) => s.sameRange) && (
              <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-md bg-sun/20 px-3 py-2 text-sm">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                This is a photo of another model from the same range, labelled as such in the shop. Upload a photo of this exact model when you have
                one.
              </p>
            )}
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {supplier.map((s) => (
                <li key={s.url} className={cn("relative aspect-square overflow-hidden rounded-lg border bg-white", order.length && "opacity-50")}>
                  <Image src={s.url} alt="" fill sizes="120px" className="object-contain" />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
