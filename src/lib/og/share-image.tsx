import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";
import { discountPercent } from "@/lib/pricing/sale";
import { formatPrice } from "@/lib/pricing/vat";

export const SHARE_SIZE = { width: 1200, height: 630 };

// The site's palette, as plain colours (the image renderer has no CSS variables).
const INK = "#1e1e1c";
const SUN = "#ffc414";
const SALE = "#d92d20";
const MUTED = "#5f5f5a";

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/ArchivoBlack-Regular.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Archivo-Medium.ttf")),
]);

/** A photo from public/ as a data URL (the renderer can't fetch relative paths). */
async function publicImage(path: string | null) {
  if (!path || !path.startsWith("/") || path.includes("..")) return null;
  try {
    const data = await readFile(join(process.cwd(), "public", path));
    const type = path.endsWith(".png") ? "png" : path.endsWith(".jpg") || path.endsWith(".jpeg") ? "jpeg" : "webp";
    return `data:image/${type};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Share image (WhatsApp, Facebook, X): the white packshot on the right, the
 * name in Archivo Black, the price, and a sale badge when discounted.
 */
export async function shareImage({
  eyebrow,
  title,
  price,
  compareAt = null,
  image,
  note,
  pricePrefix,
}: {
  pricePrefix?: string;
  eyebrow: string;
  title: string;
  price?: number | null;
  compareAt?: number | null;
  image: string | null;
  note?: string;
}) {
  const [black, medium] = await fonts;
  const photo = await publicImage(image);
  const pct = price ? discountPercent(price, compareAt) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "white", fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 0 56px 64px", width: photo ? 640 : 1100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 100 100">
              <rect width="100" height="100" rx="22" fill={SUN} />
              <path d="M60.89 38.23A20 20 0 1 1 39.11 38.23" stroke={INK} strokeWidth="10" strokeLinecap="round" fill="none" />
              <path d="M50 53V20" stroke={INK} strokeWidth="10" strokeLinecap="round" />
              <path
                d="M19 55H13.5M28.08 33.08L24.19 29.19M71.92 33.08L75.81 29.19M81 55H86.5M71.92 76.92L75.81 80.81M28.08 76.92L24.19 80.81"
                stroke={INK}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ fontFamily: "Archivo Black", fontSize: 34, color: INK }}>{site.name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, color: MUTED }}>{eyebrow}</div>
            <div style={{ fontFamily: "Archivo Black", fontSize: title.length > 60 ? 44 : 54, lineHeight: 1.05, color: INK, marginTop: 10 }}>{title}</div>
            {price ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 28 }}>
                {pricePrefix && <div style={{ fontSize: 30, color: MUTED }}>{pricePrefix}</div>}
                <div style={{ fontFamily: "Archivo Black", fontSize: 56, color: pct ? SALE : INK }}>{formatPrice(price)}</div>
                {pct && compareAt && <div style={{ fontSize: 30, color: MUTED, textDecoration: "line-through" }}>{formatPrice(compareAt)}</div>}
                {pct && (
                  <div style={{ fontFamily: "Archivo Black", fontSize: 28, color: "white", background: SALE, padding: "6px 14px", borderRadius: 6 }}>{`-${pct}%`}</div>
                )}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{note ?? "Prices include VAT. Delivered anywhere in South Africa."}</div>
        </div>
        {photo && (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: 40, borderLeft: `14px solid ${SUN}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the share-image renderer only understands <img> */}
            <img src={photo} width={480} height={480} style={{ objectFit: "contain" }} alt="" />
          </div>
        )}
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: [
        { name: "Archivo Black", data: black, weight: 400, style: "normal" },
        { name: "Archivo", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
