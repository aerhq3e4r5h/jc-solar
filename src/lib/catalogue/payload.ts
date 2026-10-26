// Shapes an import for the import_catalogue() database function and
// formats the human-readable import report.

import type { ImportBuild, RowIssue } from "./build-import";
import { REQUIRED_SPECS } from "./specs";

export type ImportPayload = {
  fileName: string;
  fileSha256: string;
  rowsTotal: number;
  rowsSkipped: number;
  rowsInvalid: number;
  requiredSpecs: Record<string, string[]>;
  products: ImportBuild["products"];
  report: { skipped: RowIssue[]; invalid: RowIssue[]; warnings: RowIssue[] };
};

export function buildPayload(build: ImportBuild, fileName: string, fileSha256: string): ImportPayload {
  return {
    fileName,
    fileSha256,
    rowsTotal: build.totals.rows,
    rowsSkipped: build.skipped.length,
    rowsInvalid: build.invalid.length,
    requiredSpecs: Object.fromEntries(
      Object.entries(REQUIRED_SPECS).map(([category, specs]) => [category, specs.map((s) => s.key)]),
    ),
    products: build.products,
    report: { skipped: build.skipped, invalid: build.invalid, warnings: build.warnings },
  };
}

export type ImportOutcome = { importId: number; inserted: number; updated: number; unchanged: number };

function groupReasons(issues: RowIssue[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const i of issues) {
    // Group "Brand "X" standardised..." style messages by their shape.
    const key = i.reason.replace(/"[^"]*"/g, '"…"').replace(/R[\d.,]+/g, "R…").replace(/row \d+/g, "row …");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function formatReport(build: ImportBuild, outcome?: ImportOutcome): string {
  const lines: string[] = [];
  const c = build.totals.byCategory;
  lines.push(`Rows read:        ${build.totals.rows}`);
  lines.push(
    `Products valid:   ${build.products.length} (panels ${c["solar-panels"]}, batteries ${c.batteries}, inverters ${c.inverters}, kits ${c.kits}, stabilizers ${c["voltage-stabilizers"]}, aircons ${c["air-conditioners"]})`,
  );
  lines.push(`Rows skipped:     ${build.skipped.length}`);
  lines.push(`Rows invalid:     ${build.invalid.length}`);
  lines.push(`Warnings:         ${build.warnings.length}`);
  if (outcome) {
    lines.push("");
    lines.push(`Saved as import #${outcome.importId}: ${outcome.inserted} inserted, ${outcome.updated} updated, ${outcome.unchanged} unchanged`);
  }
  if (build.invalid.length) {
    lines.push("", "Invalid rows (not imported):");
    build.invalid.forEach((i) => lines.push(`  row ${i.row}  ${i.sku || "(no SKU)"}  ${i.reason}`));
  }
  if (build.skipped.length) {
    lines.push("", "Skipped rows by reason:");
    groupReasons(build.skipped).forEach(([r, n]) => lines.push(`  ${String(n).padStart(5)}  ${r}`));
  }
  if (build.warnings.length) {
    lines.push("", "Warnings by type:");
    groupReasons(build.warnings).forEach(([r, n]) => lines.push(`  ${String(n).padStart(5)}  ${r}`));
  }
  return lines.join("\n");
}
