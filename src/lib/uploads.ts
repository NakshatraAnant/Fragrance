import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./password";
import { AppError } from "./logger";

/**
 * Secure uploads: type is decided by magic bytes (not the client-supplied MIME or extension),
 * size-limited, written under public/uploads with a random name. SVG and HTML are refused.
 */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean; kind: "IMAGE" | "VIDEO" | "DOC" }[] = [
  { mime: "image/jpeg", ext: "jpg", kind: "IMAGE", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", kind: "IMAGE", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", kind: "IMAGE", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/avif", ext: "avif", kind: "IMAGE", test: (b) => b.subarray(4, 12).toString() === "ftypavif" },
  { mime: "video/mp4", ext: "mp4", kind: "VIDEO", test: (b) => b.subarray(4, 8).toString() === "ftyp" && !b.subarray(8, 12).toString().startsWith("avi") },
  { mime: "video/webm", ext: "webm", kind: "VIDEO", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: "application/pdf", ext: "pdf", kind: "DOC", test: (b) => b.subarray(0, 5).toString() === "%PDF-" },
];

export function sniff(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export async function saveUpload(file: File, opts: { allow: ("IMAGE" | "VIDEO" | "DOC")[]; maxBytes: number; folder: string }) {
  if (!file || file.size === 0) throw new AppError("Choose a file to upload.");
  if (file.size > opts.maxBytes) throw new AppError(`File is too large (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = sniff(buf);
  if (!sig || !opts.allow.includes(sig.kind)) throw new AppError("Unsupported file type.");
  const safeFolder = opts.folder.replace(/[^a-z0-9-]/gi, "");
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomToken(8).replace(/[^A-Za-z0-9]/g, "")}.${sig.ext}`;
  await writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${safeFolder}/${name}`, mimeType: sig.mime, bytes: buf.length, kind: sig.kind };
}
