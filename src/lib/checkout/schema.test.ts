import { describe, expect, it } from "vitest";
import { checkoutSchema, fieldErrors, quoteRequestSchema } from "./schema";

const valid = {
  firstName: "Thandi",
  lastName: "Mokoena",
  email: "thandi@example.com",
  phone: "082 123 4567",
  address: { line1: "1 Main Rd", city: "Pretoria", province: "Gauteng", postalCode: "0181" },
  paymentMethod: "payfast",
  acceptTerms: true,
};

describe("checkoutSchema", () => {
  it("accepts a complete form and normalises the phone number", () => {
    const r = checkoutSchema.parse(valid);
    expect(r.phone).toBe("0821234567");
    expect(r.marketingOptIn).toBe(false); // opt-in is never assumed
  });
  it("requires accepted terms, a 4-digit postal code and an SA number", () => {
    const r = checkoutSchema.safeParse({ ...valid, acceptTerms: false, phone: "12345", address: { ...valid.address, postalCode: "181" } });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toMatchObject({
        acceptTerms: "Please accept the Terms and Conditions to continue",
        phone: expect.stringMatching(/South African/),
        "address.postalCode": "Postal codes have 4 digits",
      });
    }
  });
  it("accepts +27 numbers and rejects unknown provinces and payment methods", () => {
    expect(checkoutSchema.safeParse({ ...valid, phone: "+27 82 123 4567" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...valid, address: { ...valid.address, province: "Gautang" } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, paymentMethod: "bitcoin" }).success).toBe(false);
  });
});

describe("quoteRequestSchema", () => {
  it("needs only a name and email", () => {
    expect(quoteRequestSchema.parse({ name: "Lerato", email: "l@example.com" })).toMatchObject({ phone: "", company: "", marketingOptIn: false });
    expect(quoteRequestSchema.safeParse({ name: "", email: "x" }).success).toBe(false);
  });
});
