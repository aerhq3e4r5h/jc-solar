// Export the live catalogue to Excel in the import layout.
//
//   npm run catalogue:export -- [out.xlsx]
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadExportProducts } from "../src/lib/catalogue/export";
import { writeCatalogueWorkbook } from "../src/lib/catalogue/workbook";
import type { Database } from "../src/lib/supabase/database.types";

for (const path of [".env.local", ".env"]) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }
  const out = process.argv[2] ?? `catalogue-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const products = await loadExportProducts(supabase, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  writeFileSync(out, await writeCatalogueWorkbook(products));
  console.log(`Exported ${products.length} products to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
