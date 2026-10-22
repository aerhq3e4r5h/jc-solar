import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { ImportForm } from "./import-form";

async function AdminOnly() {
  await requireRole(["admin"], "/admin/import");
  return <ImportForm />;
}

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Import products</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Upload the product spreadsheet to add new products and update prices and stock. Nothing is saved until you
          review the preview and confirm. Descriptions, images, weights and other details you add in the admin are never
          overwritten by an import.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <AdminOnly />
      </Suspense>
    </div>
  );
}
