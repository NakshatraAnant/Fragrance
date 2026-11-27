import { describe, it, expect } from "vitest";
import { computeTotals, type PriceLine } from "@/lib/pricing";
import { includedTax } from "@/lib/money";

const ceilings = { dhun: 25, vasana: 15, anvaya: 0 };
const ship = { flatFeePaise: 9900, freeAbovePaise: 99900, giftWrapPaise: 5000 };
const line = (o: Partial<PriceLine>): PriceLine => ({ variantId: "v", sku: "X", brandSlug: "vasana", format: "EDP", isDiscoverySet: false, unitPricePaise: 295000, mrpPaise: 295000, quantity: 1, gstRatePct: 18, ...o });

describe("pricing engine", () => {
  it("sums lines, applies free shipping over threshold and reports included GST", () => {
    const t = computeTotals({ lines: [line({ quantity: 2 })], brandCeilings: ceilings, shipping: ship });
    expect(t.subtotalPaise).toBe(590000);
    expect(t.shippingPaise).toBe(0);
    expect(t.totalPaise).toBe(590000);
    expect(t.taxPaise).toBe(includedTax(590000, 18));
  });

  it("charges shipping under the threshold and reports remaining amount for free shipping", () => {
    const t = computeTotals({ lines: [line({ brandSlug: "dhun", unitPricePaise: 29900, mrpPaise: 29900, sku: "DH-02" })], brandCeilings: ceilings, shipping: ship });
    expect(t.shippingPaise).toBe(9900);
    expect(t.totalPaise).toBe(29900 + 9900);
    expect(t.freeShippingRemainingPaise).toBe(99900 - 29900);
  });

  it("caps percentage coupons at the brand discount ceiling and never discounts Anvaya", () => {
    const t = computeTotals({
      lines: [line({ sku: "VA-01" }), line({ sku: "AN-01", brandSlug: "anvaya", format: "EXTRAIT", unitPricePaise: 1450000, mrpPaise: 1450000 }), line({ sku: "DH-01", brandSlug: "dhun", unitPricePaise: 89900, mrpPaise: 89900 })],
      brandCeilings: ceilings, shipping: ship,
      coupon: { code: "BIG40", type: "PERCENT", value: 40, minSubtotalPaise: 0, brandScope: [] },
    });
    expect(t.lines[0].discountPaise).toBe(Math.floor(295000 * 0.15)); // Vasana capped at 15%
    expect(t.lines[1].discountPaise).toBe(0); // Anvaya never discounted
    expect(t.lines[2].discountPaise).toBe(Math.floor(89900 * 0.25)); // Dhun capped at 25%
  });

  it("rejects coupons below the minimum subtotal or with no eligible lines", () => {
    const min = computeTotals({ lines: [line({})], brandCeilings: ceilings, shipping: ship, coupon: { code: "MIN", type: "FIXED", value: 10000, minSubtotalPaise: 1000000, brandScope: [] } });
    expect(min.couponError).toMatch(/Add items/);
    expect(min.discountPaise).toBe(0);
    const anv = computeTotals({ lines: [line({ brandSlug: "anvaya" })], brandCeilings: ceilings, shipping: ship, coupon: { code: "X", type: "PERCENT", value: 10, minSubtotalPaise: 0, brandScope: [] } });
    expect(anv.couponError).toMatch(/doesn't apply/);
  });

  it("distributes fixed coupons pro-rata without exceeding ceilings", () => {
    const t = computeTotals({ lines: [line({ sku: "A" }), line({ sku: "B", unitPricePaise: 100000, mrpPaise: 100000 })], brandCeilings: ceilings, shipping: ship, coupon: { code: "F", type: "FIXED", value: 30000, minSubtotalPaise: 0, brandScope: ["vasana"] } });
    expect(t.discountPaise).toBeLessThanOrEqual(30000);
    expect(t.lines.every((l) => l.discountPaise <= Math.floor(l.lineSubtotalPaise * 0.15))).toBe(true);
  });

  it("applies discovery credit only to eligible full-size lines and never beyond their value", () => {
    const credit = { id: "c1", amountPaise: 125000, eligibleFormats: ["EDP", "ATTAR", "EXTRAIT"], excludedBrands: ["anvaya"] };
    const t = computeTotals({ lines: [line({ sku: "VA-03" }), line({ sku: "VA-21", format: "DISCOVERY", isDiscoverySet: true, unitPricePaise: 125000, mrpPaise: 125000 })], brandCeilings: ceilings, shipping: ship, credit });
    expect(t.creditPaise).toBe(125000);
    expect(t.lines[1].creditPaise).toBe(0);
    expect(t.totalPaise).toBe(295000 + 125000 - 125000);
    const small = computeTotals({ lines: [line({ sku: "DH-02", brandSlug: "dhun", unitPricePaise: 29900, mrpPaise: 29900 })], brandCeilings: ceilings, shipping: ship, credit });
    expect(small.creditPaise).toBe(29900);
    const none = computeTotals({ lines: [line({ format: "CANDLE" })], brandCeilings: ceilings, shipping: ship, credit });
    expect(none.creditPaise).toBe(0);
    expect(none.creditError).toBeTruthy();
    const anv = computeTotals({ lines: [line({ brandSlug: "anvaya", format: "EXTRAIT" })], brandCeilings: ceilings, shipping: ship, credit });
    expect(anv.creditPaise).toBe(0);
  });

  it("adds gift wrap and rejects invalid quantities", () => {
    const t = computeTotals({ lines: [line({})], brandCeilings: ceilings, shipping: ship, giftWrap: true });
    expect(t.giftWrapPaise).toBe(5000);
    expect(() => computeTotals({ lines: [line({ quantity: 0 })], brandCeilings: ceilings, shipping: ship })).toThrow();
    expect(() => computeTotals({ lines: [line({ quantity: 1.5 })], brandCeilings: ceilings, shipping: ship })).toThrow();
  });

  it("returns zero totals for an empty cart", () => {
    const t = computeTotals({ lines: [], brandCeilings: ceilings, shipping: ship });
    expect(t.totalPaise).toBe(0);
    expect(t.shippingPaise).toBe(0);
  });
});
