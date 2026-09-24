// Canonical hash dùng cho idempotency: cùng body → cùng hash, không phụ thuộc thứ tự key.

import { createHash } from "node:crypto";

/** Stringify JSON theo thứ tự key sắp xếp (stable) — nền tảng cho request hash. */
export function canonicalJson(value: unknown): string {
  switch (typeof value) {
    case "object": {
      if (value === null) return "null";
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      const entries = Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
      return `{${entries.join(",")}}`;
    }
    default:
      return JSON.stringify(value);
  }
}

export function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

export function canonicalHash(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}