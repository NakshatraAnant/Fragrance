/** Central environment access + integration status (never exposes secret values). */
const v = (k: string) => (process.env[k] ?? "").trim();

export const env = {
  appUrl: () => v("APP_URL") || "http://localhost:3000",
  isProd: () => process.env.NODE_ENV === "production",
  sessionSecret: () => v("SESSION_SECRET") || "dev-only-change-me",
  razorpay: () => ({ keyId: v("RAZORPAY_KEY_ID"), keySecret: v("RAZORPAY_KEY_SECRET"), webhookSecret: v("RAZORPAY_WEBHOOK_SECRET") }),
  sandboxSecret: () => v("PAYMENTS_SANDBOX_SECRET") || "dev-sandbox-secret-change-me",
  email: () => ({ apiKey: v("EMAIL_PROVIDER_API_KEY"), from: v("EMAIL_FROM") || "The Fragrance House <hello@example.com>" }),
  whatsapp: () => ({ token: v("WHATSAPP_TOKEN"), phoneNumberId: v("WHATSAPP_PHONE_NUMBER_ID") }),
  shiprocket: () => ({ email: v("SHIPROCKET_EMAIL"), password: v("SHIPROCKET_PASSWORD") }),
  ga4: () => ({ measurementId: v("GA4_MEASUREMENT_ID"), apiSecret: v("GA4_API_SECRET") }),
};

export function sandboxPaymentsEnabled(): boolean {
  const flag = v("PAYMENTS_SANDBOX_ENABLED");
  if (env.isProd()) return flag === "true"; // must be explicit in production
  return flag !== "false";
}

export function razorpayConfigured(): boolean {
  const r = env.razorpay();
  return Boolean(r.keyId && r.keySecret);
}

export type IntegrationStatus = { key: string; name: string; status: "CONFIGURED" | "AWAITING_CREDENTIALS" | "SANDBOX" | "DISABLED"; detail: string; envVars: string[] };

export function integrationStatuses(): IntegrationStatus[] {
  const r = env.razorpay();
  return [
    { key: "razorpay", name: "Razorpay payments (UPI, cards, net banking)", status: razorpayConfigured() ? "CONFIGURED" : "AWAITING_CREDENTIALS", detail: razorpayConfigured() ? (r.webhookSecret ? "Keys and webhook secret present." : "Keys present; webhook secret missing, so webhooks are rejected.") : "No keys. Checkout uses the local sandbox when it is enabled.", envVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] },
    { key: "sandbox", name: "Local payment sandbox (no real money)", status: sandboxPaymentsEnabled() ? "SANDBOX" : "DISABLED", detail: "Signed, server-verified test payments for local QA. It never contacts a bank.", envVars: ["PAYMENTS_SANDBOX_ENABLED", "PAYMENTS_SANDBOX_SECRET"] },
    { key: "email", name: "Transactional & marketing email", status: env.email().apiKey ? "CONFIGURED" : "AWAITING_CREDENTIALS", detail: env.email().apiKey ? "Provider key present." : "Messages are written to the Outbox as NOT_CONFIGURED and are not sent.", envVars: ["EMAIL_PROVIDER_API_KEY", "EMAIL_FROM"] },
    { key: "whatsapp", name: "WhatsApp Cloud API", status: env.whatsapp().token && env.whatsapp().phoneNumberId ? "CONFIGURED" : "AWAITING_CREDENTIALS", detail: "Lifecycle and concierge messages. Approved templates are required for marketing.", envVars: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"] },
    { key: "shiprocket", name: "Shiprocket shipping", status: env.shiprocket().email ? "CONFIGURED" : "AWAITING_CREDENTIALS", detail: "Until connected, delivery estimates use the admin-configured PIN-code rules.", envVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"] },
    { key: "ga4", name: "Google Analytics 4 (server-side forwarding)", status: env.ga4().measurementId && env.ga4().apiSecret ? "CONFIGURED" : "AWAITING_CREDENTIALS", detail: "First-party analytics events are always stored. GA4 forwarding is optional.", envVars: ["GA4_MEASUREMENT_ID", "GA4_API_SECRET"] },
  ];
}
