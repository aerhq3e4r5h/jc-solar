// Reading and writing the catalogue spreadsheet (.xlsx or .csv) with ExcelJS.

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { RawRow } from "./build-import";
import { COLUMNS, EXPORT_ORDER, normaliseHeader, PRODUCT_SHEET, REQUIRED_COLUMNS, type ColumnKey } from "./columns";

export type SheetSummary = { name: string; rows: number; headers: string[] };

export type ReadResult =
  | { ok: true; rows: RawRow[]; sheets: SheetSummary[]; sheetUsed: string }
  | { ok: false; error: string; sheets: SheetSummary[] };

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    if ("result" in value) return value.result ?? null; // formula
    if ("text" in value) return value.text; // hyperlink
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("error" in value) return null;
  }
  return value;
}

function headerRow(ws: ExcelJS.Worksheet): string[] {
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cellValue(cell.value) ?? "").trim();
  });
  return headers;
}

export async function readCatalogueFile(data: ArrayBuffer | Buffer, fileName: string): Promise<ReadResult> {
  const wb = new ExcelJS.Workbook();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  try {
    if (fileName.toLowerCase().endsWith(".csv")) {
      await wb.csv.read(Readable.from(buffer));
    } else {
      // ExcelJS's typings predate Node's generic Buffer; the runtime accepts it.
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { ok: false, error: "The file could not be read as an Excel (.xlsx) or CSV file.", sheets: [] };
  }

  const sheets = wb.worksheets.map((ws) => ({
    name: ws.name,
    rows: Math.max(ws.actualRowCount - 1, 0),
    headers: headerRow(ws).filter(Boolean),
  }));

  const wanted = new Map(Object.entries(COLUMNS).map(([k, h]) => [normaliseHeader(h), k as ColumnKey]));
  // Prefer the named sheet; otherwise the first sheet that has the required columns.
  const candidates = [
    ...wb.worksheets.filter((ws) => ws.name === PRODUCT_SHEET),
    ...wb.worksheets.filter((ws) => ws.name !== PRODUCT_SHEET),
  ];
  for (const ws of candidates) {
    const colIndex = new Map<ColumnKey, number>();
    headerRow(ws).forEach((h, i) => {
      const key = wanted.get(normaliseHeader(h));
      if (key && !colIndex.has(key)) colIndex.set(key, i + 1);
    });
    if (!REQUIRED_COLUMNS.every((k) => colIndex.has(k))) continue;

    const rows: RawRow[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const values: Partial<Record<ColumnKey, unknown>> = {};
      for (const [key, col] of colIndex) values[key] = cellValue(row.getCell(col).value);
      rows.push({ rowNumber, values });
    });
    return { ok: true, rows, sheets, sheetUsed: ws.name };
  }

  const missing = REQUIRED_COLUMNS.map((k) => `"${COLUMNS[k]}"`).join(", ");
  return { ok: false, error: `No sheet has the required columns: ${missing}.`, sheets };
}

export type ExportProduct = {
  name: string;
  sku: string;
  brand: string | null;
  category: string;
  priceInclVat: number;
  stockQty: number;
  allowBackorder: boolean;
  imageCount: number;
  descriptionLength: number;
  url: string;
};

/** Writes the catalogue back out in the same column layout it is imported from. */
export async function writeCatalogueWorkbook(products: ExportProduct[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "JC Solar";
  const ws = wb.addWorksheet(PRODUCT_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = EXPORT_ORDER.map((key) => ({
    header: COLUMNS[key],
    key,
    width: key === "name" ? 70 : key === "url" ? 50 : key === "categories" ? 30 : 18,
  }));
  for (const p of products) {
    const stockNote =
      p.stockQty > 0 ? `${p.stockQty} in stock` : p.allowBackorder ? "Available on backorder" : "Out Of Stock";
    ws.addRow({
      name: p.name,
      sku: p.sku,
      brand: p.brand ?? "",
      topCategory: p.category,
      categories: p.category,
      priceExclVat: Math.round((p.priceInclVat / 1.15) * 100) / 100,
      priceInclVat: p.priceInclVat,
      inStock: p.stockQty > 0 || p.allowBackorder ? "Yes" : "No",
      stockNote,
      images: p.imageCount,
      descriptionLength: p.descriptionLength,
      url: p.url,
    });
  }
  for (const key of ["priceExclVat", "priceInclVat"] as const) ws.getColumn(key).numFmt = "#,##0.00";
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_ORDER.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
