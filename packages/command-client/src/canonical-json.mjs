import crypto from "node:crypto";

export function canonicalize(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Canonical JSON rejects circular values.");
    seen.add(value);
    const result = value.map((item) => canonicalize(item, seen));
    seen.delete(value);
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) throw new TypeError("Canonical JSON rejects circular values.");
    seen.add(value);
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) result[key] = canonicalize(value[key], seen);
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}.`);
}

export function stableStringify(value, {space = 0} = {}) {
  return JSON.stringify(canonicalize(value), null, space);
}

export function hashValue(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function shortHash(value, length = 16) {
  return hashValue(value).slice(0, length);
}

export function cloneJson(value) {
  return JSON.parse(stableStringify(value));
}
