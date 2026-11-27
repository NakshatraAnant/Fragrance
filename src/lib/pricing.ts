/**
 * Pure pricing engine — no I/O. Used by the cart, checkout and tests.
 *
 * Rules (blueprint slide 83):
 *  - MRP is the real everyday price and is tax-inclusive. GST is reported as an included component.
 *  - Coupons respect a per-brand discount ceiling (Dhun 25%, Vasana 15%, Anvaya 0% = never discounted).
 *  - Discovery credit is a prepaid entitlement redeemable on eligible full-size lines only.
 */
import { includedTax } from "./money";

export type PriceLine = {
  variantId: string;
  sku: string;
  brandSlug: string;
  format: string;
  isDiscoverySet: boolean;
  unitPricePaise: number;
  mrpPaise: number;
  quantity: number;
  gstRatePct: number;
};

export type CouponInput = { code: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalPaise: number; brandScope: string[] };
export type CreditInput = { id: string; amountPaise: number; eligibleFormats: string[]; excludedBrands: string[] };
export type ShippingInput = { flatFeePaise: number; freeAbovePaise: number; giftWrapPaise: number };

export type PricedLine = PriceLine & { lineSubtotalPaise: number; discountPaise: number; creditPaise: number; lineTotalPaise: number; taxPaise: number };

export type Totals = {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  creditPaise: number;
  shippingPaise: number;
  giftWrapPaise: number;
  taxPaise: number;
  totalPaise: number;
  savingsNote: string | null;
  couponError: string | null;
  creditError: string | null;
  freeShippingRemainingPaise: number;
};

export const SHIPPING_GST_PCT = 18;

export function computeTotals(params: {
  lines: PriceLine[];
  brandCeilings: Record<string, number>;
  coupon?: CouponInput | null;
  credit?: CreditInput | null;
  shipping: ShippingInput;
  giftWrap?: boolean;
}): Totals {
  const { lines, brandCeilings, coupon, credit, shipping } = params;
  const priced: PricedLine[] = lines.map((l) => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error(`Invalid quantity for ${l.sku}`);
    const sub = l.unitPricePaise * l.quantity;
    return { ...l, lineSubtotalPaise: sub, discountPaise: 0, creditPaise: 0, lineTotalPaise: sub, taxPaise: 0 };
  });
  const subtotal = priced.reduce((s, l) => s + l.lineSubtotalPaise, 0);

  // ── Coupon
  let couponError: string | null = null;
  if (coupon) {
    const eligible = priced.filter((l) => (brandCeilings[l.brandSlug] ?? 0) > 0 && (coupon.brandScope.length === 0 || coupon.brandScope.includes(l.brandSlug)));
    const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineSubtotalPaise, 0);
    if (subtotal < coupon.minSubtotalPaise) couponError = `Add items worth ₹${Math.ceil((coupon.minSubtotalPaise - subtotal) / 100).toLocaleString("en-IN")} more to use ${coupon.code}.`;
    else if (eligible.length === 0) couponError = `${coupon.code} doesn't apply to the items in your bag.`;
    else {
      const requested = coupon.type === "PERCENT" ? null : Math.min(coupon.value, eligibleSubtotal);
      let remainingFixed = requested ?? 0;
      eligible.forEach((l, i) => {
        const ceilingPct = Math.min(brandCeilings[l.brandSlug] ?? 0, 100);
        const cap = Math.floor((l.lineSubtotalPaise * ceilingPct) / 100);
        let d: number;
        if (coupon.type === "PERCENT") d = Math.floor((l.lineSubtotalPaise * Math.min(coupon.value, 100)) / 100);
        else d = i === eligible.length - 1 ? remainingFixed : Math.floor(((requested ?? 0) * l.lineSubtotalPaise) / eligibleSubtotal);
        d = Math.min(d, cap);
        if (coupon.type === "FIXED") remainingFixed -= d;
        l.discountPaise = d;
        l.lineTotalPaise = l.lineSubtotalPaise - d;
      });
    }
  }
  const discount = priced.reduce((s, l) => s + l.discountPaise, 0);

  // ── Discovery credit
  let creditError: string | null = null;
  if (credit) {
    const eligible = priced.filter((l) => !l.isDiscoverySet && credit.eligibleFormats.includes(l.format) && !credit.excludedBrands.includes(l.brandSlug));
    const pool = eligible.reduce((s, l) => s + l.lineTotalPaise, 0);
    if (pool === 0) creditError = "Your discovery credit applies to eligible full-size fragrances. Add one to your bag to use it.";
    else {
      const use = Math.min(credit.amountPaise, pool);
      let left = use;
      eligible.forEach((l, i) => {
        const c = i === eligible.length - 1 ? left : Math.min(left, Math.floor((use * l.lineTotalPaise) / pool));
        l.creditPaise = c;
        l.lineTotalPaise -= c;
        left -= c;
      });
    }
  }
  const creditUsed = priced.reduce((s, l) => s + l.creditPaise, 0);

  // ── Shipping & gift wrap
  const merchandise = subtotal - discount;
  const shippingFee = priced.length === 0 ? 0 : merchandise >= shipping.freeAbovePaise ? 0 : shipping.flatFeePaise;
  const giftWrap = params.giftWrap && priced.length ? shipping.giftWrapPaise : 0;

  // ── Tax (included)
  for (const l of priced) l.taxPaise = includedTax(l.lineTotalPaise, l.gstRatePct);
  const tax = priced.reduce((s, l) => s + l.taxPaise, 0) + includedTax(shippingFee + giftWrap, SHIPPING_GST_PCT);

  const total = subtotal - discount - creditUsed + shippingFee + giftWrap;
  return {
    lines: priced,
    subtotalPaise: subtotal,
    discountPaise: discount,
    creditPaise: creditUsed,
    shippingPaise: shippingFee,
    giftWrapPaise: giftWrap,
    taxPaise: tax,
    totalPaise: total,
    savingsNote: discount > 0 && coupon ? `${coupon.code} applied within brand discount limits.` : null,
    couponError,
    creditError,
    freeShippingRemainingPaise: priced.length && shippingFee > 0 ? shipping.freeAbovePaise - merchandise : 0,
  };
}
