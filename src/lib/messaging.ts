/**
 * Messaging with configurable providers. Never throws to callers. Every attempt is logged to
 * MessageLog with an honest status: SENT, NOT_CONFIGURED, SKIPPED_NO_CONSENT or FAILED.
 */
import { db } from "./db";
import { env } from "./env";
import { log } from "./logger";

export type Channel = "EMAIL" | "WHATSAPP";

export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

/** Latest consent record wins. */
export async function hasMarketingConsent(channel: Channel, recipient: { email?: string | null; phone?: string | null; userId?: string | null }) {
  const or = [
    ...(recipient.userId ? [{ userId: recipient.userId }] : []),
    ...(recipient.email ? [{ email: recipient.email.toLowerCase() }] : []),
    ...(recipient.phone ? [{ phone: recipient.phone }] : []),
  ];
  if (!or.length) return false;
  const latest = await db.marketingConsent.findFirst({ where: { channel, OR: or }, orderBy: { createdAt: "desc" } });
  return Boolean(latest?.granted);
}

async function deliverEmail(to: string, subject: string, text: string): Promise<{ status: "SENT" | "NOT_CONFIGURED" | "FAILED"; ref?: string; error?: string }> {
  const { apiKey, from } = env.email();
  if (!apiKey) return { status: "NOT_CONFIGURED" };
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, text }) });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { status: "SENT", ref: data.id } : { status: "FAILED", error: data.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { status: "FAILED", error: (e as Error).message };
  }
}

async function deliverWhatsApp(to: string, text: string): Promise<{ status: "SENT" | "NOT_CONFIGURED" | "FAILED"; ref?: string; error?: string }> {
  const { token, phoneNumberId } = env.whatsapp();
  if (!token || !phoneNumberId) return { status: "NOT_CONFIGURED" };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text } }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
    return res.ok ? { status: "SENT", ref: data.messages?.[0]?.id } : { status: "FAILED", error: data.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { status: "FAILED", error: (e as Error).message };
  }
}

export async function sendTemplate(key: string, channel: Channel, recipient: { email?: string | null; phone?: string | null; userId?: string | null }, vars: Record<string, string | number | null | undefined>) {
  try {
    const tpl = await db.messageTemplate.findUnique({ where: { key_channel: { key, channel } } });
    if (!tpl || !tpl.isActive) return null;
    const to = channel === "EMAIL" ? recipient.email : recipient.phone;
    if (!to) return null;
    const allVars = { appUrl: env.appUrl(), ...vars };
    const subject = tpl.subject ? renderTemplate(tpl.subject, allVars) : null;
    const body = renderTemplate(tpl.body, allVars);
    if (tpl.isMarketing && !(await hasMarketingConsent(channel, recipient))) {
      return db.messageLog.create({ data: { templateKey: key, channel, recipient: to, subject, body, status: "SKIPPED_NO_CONSENT" } });
    }
    const result = channel === "EMAIL" ? await deliverEmail(to, subject ?? key, body) : await deliverWhatsApp(to, body);
    return db.messageLog.create({ data: { templateKey: key, channel, recipient: to, subject, body, status: result.status, providerRef: result.ref ?? null, error: result.error ?? null } });
  } catch (e) {
    log.error("message send failed", { key, channel, error: e });
    return null;
  }
}

export async function recordConsent(input: { userId?: string | null; email?: string | null; phone?: string | null; channel: Channel | "SMS"; granted: boolean; source: string; ip?: string | null }) {
  return db.marketingConsent.create({ data: { userId: input.userId ?? null, email: input.email?.toLowerCase() ?? null, phone: input.phone ?? null, channel: input.channel, granted: input.granted, source: input.source, ip: input.ip ?? null } });
}
