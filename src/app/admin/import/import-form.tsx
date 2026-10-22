"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRand } from "@/lib/pricing/vat";
import { applyImport, previewImport, type ApplyResult, type PreviewResult } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  "solar-panels": "Solar panels",
  batteries: "Batteries",
  inverters: "Inverters",
  kits: "Kits",
};

function formatChange(value: string | number | boolean | null, field: string) {
  if (value === null) return "—";
  if (field === "priceInclVat" && typeof value === "number") return formatRand(value);
  return String(value);
}

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"preview" | "apply" | null>(null);

  const formData = () => {
    const fd = new FormData();
    if (file) fd.set("file", file);
    return fd;
  };

  const runPreview = () => {
    setResult(null);
    setMode("preview");
    startTransition(async () => setPreview(await previewImport(formData())));
  };
  const runApply = () => {
    setMode("apply");
    startTransition(async () => {
      const r = await applyImport(formData());
      setResult(r);
      if (r.ok) setPreview(null);
    });
  };

  const changedRows = useMemo(
    () => (preview?.ok ? preview.rows.filter((r) => r.action !== "unchanged") : []),
    [preview],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload spreadsheet</CardTitle>
          <CardDescription>
            Same layout as the product file: an &ldquo;All products&rdquo; sheet with Product, SKU, Brand, All categories,
            Price incl. 15% VAT (R) and Stock note columns. Products are matched on SKU, so re-importing updates them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50">
            <FileSpreadsheet className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm">{file ? file.name : "Choose an .xlsx or .csv file"}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
              }}
            />
          </label>
          <Button onClick={runPreview} disabled={!file || pending}>
            {pending && mode === "preview" ? <Loader2 className="animate-spin" /> : <Upload />}
            Preview changes
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.ok ? "border-success/40" : "border-destructive/40"} role="status">
          <CardContent className="flex items-start gap-3 pt-6">
            {result.ok ? (
              <>
                <CheckCircle2 className="mt-0.5 size-5 text-success" aria-hidden="true" />
                <p>
                  Import #{result.importId} saved: <strong>{result.inserted}</strong> added,{" "}
                  <strong>{result.updated}</strong> updated, {result.unchanged} unchanged.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
                <p>{result.error}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {preview && !preview.ok && (
        <Card className="border-destructive/40" role="alert">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
            <p>{preview.error}</p>
          </CardContent>
        </Card>
      )}

      {preview?.ok && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["New products", preview.counts.insert],
              ["Updated", preview.counts.update],
              ["Unchanged", preview.counts.unchanged],
              ["Skipped / invalid", `${preview.skipped.length} / ${preview.invalid.length}`],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="num mt-1 font-display text-3xl font-semibold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{preview.fileName}</CardTitle>
                <CardDescription>
                  Read sheet &ldquo;{preview.sheetUsed}&rdquo; ({preview.totals.rows} rows).{" "}
                  {Object.entries(preview.totals.byCategory)
                    .map(([k, v]) => `${CATEGORY_LABELS[k]} ${v}`)
                    .join(" · ")}
                  {preview.notInFile > 0 && ` · ${preview.notInFile} products in the shop are not in this file and stay as they are.`}
                </CardDescription>
              </div>
              <Button onClick={runApply} disabled={pending || preview.counts.insert + preview.counts.update === 0}>
                {pending && mode === "apply" && <Loader2 className="animate-spin" />}
                Import {preview.counts.insert + preview.counts.update} changes
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="changes">
                <TabsList>
                  <TabsTrigger value="changes">Changes ({changedRows.length})</TabsTrigger>
                  <TabsTrigger value="invalid">Invalid ({preview.invalid.length})</TabsTrigger>
                  <TabsTrigger value="warnings">Warnings ({preview.warnings.length})</TabsTrigger>
                  <TabsTrigger value="skipped">Skipped ({preview.skipped.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="changes" className="mt-4 max-h-[60vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price incl. VAT</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changedRows.map((r) => (
                        <TableRow key={r.sku}>
                          <TableCell>
                            <Badge variant={r.action === "insert" ? "default" : "secondary"}>
                              {r.action === "insert" ? "New" : "Update"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                          <TableCell className="max-w-md truncate" title={r.name}>
                            {r.name}
                          </TableCell>
                          <TableCell className="num text-right">{formatRand(r.priceInclVat)}</TableCell>
                          <TableCell className="num text-right">{r.stockQty}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.action === "update"
                              ? r.changes.map((c) => `${c.field}: ${formatChange(c.from, c.field)} → ${formatChange(c.to, c.field)}`).join("; ")
                              : `${r.incompleteCount} fields to complete`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                {(["invalid", "warnings", "skipped"] as const).map((key) => (
                  <TabsContent key={key} value={key} className="mt-4 max-h-[60vh] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview[key].map((i) => (
                          <TableRow key={`${key}-${i.row}-${i.reason}`}>
                            <TableCell className="num">{i.row}</TableCell>
                            <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                            <TableCell className="max-w-sm truncate" title={i.name}>
                              {i.name}
                            </TableCell>
                            <TableCell className="text-sm">{i.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
