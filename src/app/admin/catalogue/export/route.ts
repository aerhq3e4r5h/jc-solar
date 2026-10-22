import { getSessionUser } from "@/lib/auth";
import { loadExportProducts } from "@/lib/catalogue/export";
import { writeCatalogueWorkbook } from "@/lib/catalogue/workbook";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "sales")) {
    return new Response("Not allowed", { status: 403 });
  }
  const supabase = await createClient();
  const products = await loadExportProducts(supabase, publicEnv().NEXT_PUBLIC_SITE_URL);
  const body = await writeCatalogueWorkbook(products);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jc-solar-catalogue-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
