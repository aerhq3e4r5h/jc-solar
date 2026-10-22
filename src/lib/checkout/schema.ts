import { z } from "zod";

/** Bump when the Terms change; each order stores the version accepted. */
export const TERMS_VERSION = "draft-2026-10-22";

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

const text = (label: string, max = 120) => z.string().trim().min(1, `Enter your ${label}`).max(max, `${label} is too long`);

/** South African phone: 0XX XXX XXXX or +27 XX XXX XXXX, spaces allowed. */
export const saPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(\+27|0)[1-9]\d{8}$/.test(v), "Enter a South African number, e.g. 082 123 4567");

export const addressSchema = z.object({
  line1: text("street address"),
  line2: z.string().trim().max(120).optional().default(""),
  suburb: z.string().trim().max(80).optional().default(""),
  city: text("town or city", 80),
  province: z.enum(PROVINCES, { message: "Choose a province" }),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Postal codes have 4 digits"),
});

export const checkoutSchema = z.object({
  firstName: text("first name", 60),
  lastName: text("surname", 60),
  email: z.email("Enter a valid email address").max(120),
  phone: saPhone,
  address: addressSchema,
  notes: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["payfast", "eft"]),
  acceptTerms: z.literal(true, { message: "Please accept the Terms and Conditions to continue" }),
  marketingOptIn: z.boolean().default(false),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export const quoteRequestSchema = z.object({
  name: text("name", 100),
  email: z.email("Enter a valid email address").max(120),
  phone: z
    .union([saPhone, z.literal("")])
    .optional()
    .default(""),
  company: z.string().trim().max(120).optional().default(""),
  province: z
    .union([z.enum(PROVINCES), z.literal("")])
    .optional()
    .default(""),
  marketingOptIn: z.boolean().default(false),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;

/** Flattens zod errors to { "address.city": "Enter your town or city" }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
