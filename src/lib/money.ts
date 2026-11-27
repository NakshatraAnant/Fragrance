const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats integer paise as Indian rupees (₹1,23,450). */
export function formatINR(paise: number, opts: { exact?: boolean } = {}): string {
  const rupees = paise / 100;
  if (opts.exact || !Number.isInteger(rupees)) return inr2.format(rupees);
  return inr.format(rupees);
}

/** Price per ml/g for transparent per-unit comparison (a habit of Indian shoppers, blueprint slide 42). */
export function perUnit(paise: number, qty: number, unit: string): string | null {
  if (!qty) return null;
  const v = paise / 100 / qty;
  return `₹${v >= 100 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(v >= 10 ? 1 : 2)}/${unit}`;
}

/** GST component contained in a tax-inclusive amount. */
export function includedTax(grossPaise: number, ratePct: number): number {
  return Math.round(grossPaise - grossPaise / (1 + ratePct / 100));
}

export const IST = "Asia/Kolkata";
export function formatDate(d: Date | string, withTime = false): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(d));
}

/** "₹2,950" or "From ₹2,950" for multi-size products. Shared by server and client components. */
export function priceLabel(p: { minPricePaise: number; maxPricePaise: number }) {
  return p.minPricePaise === p.maxPricePaise ? formatINR(p.minPricePaise) : `From ${formatINR(p.minPricePaise)}`;
}
