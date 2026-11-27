import { describe, it, expect } from "vitest";
import { checkCouponRow } from "@/lib/coupons";
import { isCreditSource, creditStatusAt } from "@/lib/credits";
import { pointsForSpend, tierFor, maxRedeemablePaise } from "@/lib/loyalty";
import { SETTING_DEFAULTS } from "@/lib/settings-defaults";
import { estimateFromRule, isValidPincode, addBusinessDays } from "@/lib/shipping";
import { renderMarkdown } from "@/lib/markdown";
import { verifyCheckoutSignature, verifyWebhookSignature, hmacHex } from "@/lib/payments/razorpay";
import { signSandboxEvent, verifySandboxSignature } from "@/lib/payments/sandbox";
import { hashPassword, verifyPassword, passwordPolicyError } from "@/lib/password";
import { sniff } from "@/lib/uploads";
import { hasPermission } from "@/lib/permissions";

describe("coupon eligibility", () => {
  const base = { code: "X", isActive: true, startsAt: null, endsAt: null, maxRedemptions: 10, perCustomerLimit: 1 };
  it("accepts a valid coupon", () => expect(checkCouponRow(base, { total: 0, byCustomer: 0 })).toBeNull());
  it("rejects inactive, future, expired, exhausted and reused coupons", () => {
    expect(checkCouponRow({ ...base, isActive: false }, { total: 0, byCustomer: 0 })).toMatch(/no longer active/);
    expect(checkCouponRow({ ...base, startsAt: new Date(Date.now() + 86400_000) }, { total: 0, byCustomer: 0 })).toMatch(/isn't active yet/);
    expect(checkCouponRow({ ...base, endsAt: new Date(Date.now() - 1000) }, { total: 0, byCustomer: 0 })).toMatch(/expired/);
    expect(checkCouponRow(base, { total: 10, byCustomer: 0 })).toMatch(/usage limit/);
    expect(checkCouponRow(base, { total: 1, byCustomer: 1 })).toMatch(/already used/);
  });
});

describe("discovery credit rules", () => {
  const rule = SETTING_DEFAULTS.discoveryCredit;
  it("only the blueprint discovery sets are credit sources by default", () => {
    expect(isCreditSource("VA-21", rule)).toBe(true);
    expect(isCreditSource("DH-17", rule)).toBe(true);
    expect(isCreditSource("VA-27", rule)).toBe(true);
    expect(isCreditSource("VA-01", rule)).toBe(false);
    expect(isCreditSource("VA-21", { ...rule, enabled: false })).toBe(false);
  });
  it("uses a 60-day window and treats past-expiry available credits as expired", () => {
    expect(rule.validityDays).toBe(60);
    expect(creditStatusAt({ status: "AVAILABLE", expiresAt: new Date(Date.now() - 1) })).toBe("EXPIRED");
    expect(creditStatusAt({ status: "REDEEMED", expiresAt: new Date(Date.now() - 1) })).toBe("REDEEMED");
  });
});

describe("loyalty", () => {
  const cfg = SETTING_DEFAULTS.loyalty;
  it("earns nothing while the programme is unapproved (disabled by default)", () => {
    expect(cfg.enabled).toBe(false);
    expect(pointsForSpend(500000, cfg)).toBe(0);
    expect(maxRedeemablePaise(500000, 1000, cfg)).toBe(0);
  });
  it("calculates points, tiers and redemption caps once configured", () => {
    const on = { ...cfg, enabled: true, pointsPerHundredRupees: 5, pointValuePaise: 100, maxRedeemPct: 20 };
    expect(pointsForSpend(295000, on)).toBe(147);
    expect(tierFor(0, on).key).toBe("MEMBER");
    expect(tierFor(1500000, on).key).toBe("ATELIER");
    expect(maxRedeemablePaise(100000, 1000, on)).toBe(20000);
    expect(maxRedeemablePaise(100000, 10, on)).toBe(1000);
  });
});

describe("PIN codes and delivery estimates", () => {
  it("validates Indian PIN format", () => {
    expect(isValidPincode("400001")).toBe(true);
    expect(isValidPincode("012345")).toBe(false);
    expect(isValidPincode("40001")).toBe(false);
  });
  it("never promises delivery without a configured rule", () => {
    const r = estimateFromRule("799001", null);
    expect(r.ok && !r.serviceable).toBe(true);
    const ok = estimateFromRule("400001", { region: "Mumbai", serviceable: true, codAllowed: false, minDays: 2, maxDays: 3 });
    expect(ok.ok && ok.serviceable && ok.label.startsWith("Estimated delivery")).toBe(true);
  });
  it("skips Sundays when adding business days", () => {
    const sat = new Date("2026-11-28T10:00:00+05:30");
    expect(addBusinessDays(sat, 1).getDay()).toBe(1);
  });
});

describe("security primitives", () => {
  it("verifies Razorpay checkout and webhook signatures", () => {
    const sig = hmacHex("secret", "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "secret")).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, "secret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "")).toBe(false);
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, hmacHex("wh", body), "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", hmacHex("wh", body), "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
  });
  it("signs and verifies sandbox events, rejecting tampering", () => {
    const { body, signature } = signSandboxEvent({ eventId: "e", type: "payment.captured", orderId: "o", paymentId: "p", amountPaise: 100, method: "upi", issuedAt: 1 });
    expect(verifySandboxSignature(body, signature)).toBe(true);
    expect(verifySandboxSignature(body.replace("100", "1"), signature)).toBe(false);
  });
  it("hashes passwords with scrypt and enforces a policy", () => {
    const h = hashPassword("Correct-Horse-9");
    expect(verifyPassword("Correct-Horse-9", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(passwordPolicyError("short1")).toBeTruthy();
    expect(passwordPolicyError("longenoughpassword")).toBeTruthy();
    expect(passwordPolicyError("longenough123")).toBeNull();
  });
  it("escapes HTML and unsafe links in CMS markdown", () => {
    const html = renderMarkdown("# Hi <script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](/faq) **b**");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('<a href="/faq">ok</a>');
    expect(html).toContain("<strong>b</strong>");
  });
  it("detects file types by magic bytes, refusing disguised files", () => {
    expect(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.mime).toBe("image/png");
    expect(sniff(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(sniff(Buffer.from("<html>"))).toBeNull();
  });
  it("enforces role permissions, keeping B2B staff away from consumer data", () => {
    expect(hasPermission("*", "orders:write")).toBe(true);
    expect(hasPermission("b2b:read,b2b:write", "customers:read")).toBe(false);
    expect(hasPermission("b2b:read,b2b:write", "b2b:write")).toBe(true);
    expect(hasPermission(null, "b2b:read")).toBe(false);
  });
});
