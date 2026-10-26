import { z } from "zod";

export const CATEGORY_SLUGS = ["solar-panels", "batteries", "inverters", "kits", "voltage-stabilizers", "air-conditioners"] as const;
export const SHIPPING_CLASSES = ["standard", "oversized", "dangerous_goods"] as const;

export const specSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  valueText: z.string().min(1),
  valueNum: z.number().finite().nullable(),
  unit: z.string().nullable(),
});

/** A cleaned, validated product row ready to send to import_catalogue(). */
export const importProductSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(80, "SKU is longer than 80 characters")
    .refine((s) => s === s.trim(), "SKU has leading or trailing spaces"),
  name: z.string().min(3, "Name is too short").max(300),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug is not URL-safe"),
  brand: z.string().min(1).nullable(),
  category: z.enum(CATEGORY_SLUGS),
  priceInclVat: z.number().finite().positive("Price must be more than R0.00").max(10_000_000),
  stockQty: z.number().int().min(0),
  allowBackorder: z.boolean(),
  shippingClass: z.enum(SHIPPING_CLASSES),
  isDangerousGoods: z.boolean(),
  specs: z.array(specSchema),
  incompleteFields: z.array(z.string()),
  sourceRow: z.number().int().positive(),
});

export type ImportProduct = z.infer<typeof importProductSchema>;
