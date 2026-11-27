import { db } from "./db";

type Level = "debug" | "info" | "warn" | "error";

/** Structured JSON logger. Errors are also persisted to ErrorLog for the admin error monitor. */
function emit(level: Level, message: string, context: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...redact(context) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const SECRET_KEYS = /pass|secret|token|signature|authorization|card|cvv/i;
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) out[k] = SECRET_KEYS.test(k) ? "[redacted]" : val instanceof Error ? { name: val.name, message: val.message } : val;
  return out;
}

export const log = {
  debug: (m: string, c?: Record<string, unknown>) => emit("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, c: Record<string, unknown> & { error?: unknown } = {}) => {
    emit("error", m, c);
    const err = c.error instanceof Error ? c.error : undefined;
    db.errorLog
      .create({ data: { level: "error", message: m + (err ? `: ${err.message}` : ""), stack: err?.stack?.slice(0, 4000), context: JSON.stringify(redact({ ...c, error: undefined })).slice(0, 4000) } })
      .catch(() => undefined);
  },
};

/** Known, user-presentable failure. Messages are safe to show to the customer. */
export class AppError extends Error {
  constructor(message: string, public code: string = "BAD_REQUEST", public status = 400) {
    super(message);
  }
}
