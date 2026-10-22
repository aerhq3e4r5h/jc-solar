"use server";

import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { buildImport, type RowIssue } from "@/lib/catalogue/build-import";
import { buildPayload, type ImportOutcome } from "@/lib/catalogue/payload";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { planImport, type ExistingProduct, type FieldChange } from "@/lib/catalogue/plan";
import { readCatalogueFile, type SheetSummary } from "@/lib/catalogue/workbook";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 20 * 1024 * 1024;

export type PreviewRow = {
  action: "insert" | "update" | "unchanged";
  sku: string;
  name: string;
  category: string;
  priceInclVat: number;
  stockQty: number;
  incompleteCount: number;
  changes: FieldChange[];
};

export type PreviewResult =
  | {
      ok: true;
      fileName: string;
      sheets: SheetSummary[];
      sheetUsed: string;
      totals: { rows: number; byCategory: Record<string, number> };
      counts: { insert: number; update: number; unchanged: number };
      notInFile: number;
      rows: PreviewRow[];
      invalid: RowIssue[];
      skipped: RowIssue[];
      warnings: RowIssue[];
    }
  | { ok: false; error: string };

export type ApplyResult = ({ ok: true } & ImportOutcome) | { ok: false; error: string };

async function readUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a spreadsheet to upload." } as const;
  if (file.size > MAX_BYTES) return { error: "The file is larger than 20 MB." } as const;
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: "Upload an .xlsx or .csv file." } as const;
  const data = Buffer.from(await file.arrayBuffer());
  const read = await readCatalogueFile(data, file.name);
  if (!read.ok) return { error: read.error } as const;
  return { file, data, read } as const;
}

async function currentCatalogue(): Promise<ExistingProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, price_incl_vat, stock_qty, allow_backorder, brands(name), categories(slug)");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    sku: r.sku,
    name: r.name,
    brand: r.brands?.name ?? null,
    category: r.categories?.slug ?? "",
    priceInclVat: Number(r.price_incl_vat),
    stockQty: r.stock_qty,
    allowBackorder: r.allow_backorder,
  }));
}

export async function previewImport(formData: FormData): Promise<PreviewResult> {
  await requireRole(["admin"], "/admin/import");
  const upload = await readUpload(formData);
  if ("error" in upload) return { ok: false, error: upload.error ?? "Upload failed" };

  const build = buildImport(upload.read.rows);
  let existing: ExistingProduct[];
  try {
    existing = await currentCatalogue();
  } catch (e) {
    return { ok: false, error: `Could not read the current catalogue: ${(e as Error).message}` };
  }
  const plan = planImport(build.products, existing);
  return {
    ok: true,
    fileName: upload.file.name,
    sheets: upload.read.sheets,
    sheetUsed: upload.read.sheetUsed,
    totals: build.totals,
    counts: plan.counts,
    notInFile: plan.notInFile.length,
    rows: plan.rows.map((r) => ({
      action: r.action,
      sku: r.product.sku,
      name: r.product.name,
      category: r.product.category,
      priceInclVat: r.product.priceInclVat,
      stockQty: r.product.stockQty,
      incompleteCount: r.product.incompleteFields.length,
      changes: r.action === "update" ? r.changes : [],
    })),
    invalid: build.invalid,
    skipped: build.skipped,
    warnings: build.warnings,
  };
}

export async function applyImport(formData: FormData): Promise<ApplyResult> {
  await requireRole(["admin"], "/admin/import");
  const upload = await readUpload(formData);
  if ("error" in upload) return { ok: false, error: upload.error ?? "Upload failed" };

  const build = buildImport(upload.read.rows);
  if (build.products.length === 0) return { ok: false, error: "The file has no valid products to import." };
  const sha = createHash("sha256").update(upload.data).digest("hex");
  const payload = buildPayload(build, upload.file.name, sha);

  // Runs as the signed-in admin; the database function re-checks the role.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_catalogue", { p_payload: payload });
  if (error) return { ok: false, error: `Import failed and nothing was saved: ${error.message}` };
  revalidateTag(CATALOGUE_TAG, "max");
  revalidatePath("/shop", "layout");
  return { ok: true, ...(data as unknown as ImportOutcome) };
}
