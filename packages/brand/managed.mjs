// Managed surfaces: copy catalogs and config that another toolchain reads raw
// (gen-l10n reads the ARB, sync_native_copy reads copy/native_en.json, Android
// and Xcode read manifests and entitlements). They keep literal brand values;
// applied.json records which record they were written for, and a rebrand
// rewrites every changed value from the applied record to the current one.
import fs from "node:fs";
import path from "node:path";

// Values distinctive enough to replace anywhere in a file.
const distinctive = new Set(["web", "support", "social", "senders.emailDomain"]);

export function leaves(record, prefix = "") {
  return Object.entries(record).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (key === "$schema") return [];
    if (value !== null && typeof value === "object") return leaves(value, keyPath);
    return typeof value === "string" ? [[keyPath, value]] : [];
  });
}

const isDistinctive = (keyPath) => [...distinctive].some((root) => keyPath === root || keyPath.startsWith(`${root}.`));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** Old-to-new replacements for every value that changed, longest first so "Catch Host" wins over "Catch". */
export function replacements(applied, current, fields = "all") {
  const next = new Map(leaves(current));
  return leaves(applied)
    .filter(([keyPath, value]) => next.has(keyPath) && next.get(keyPath) !== value)
    .filter(([keyPath]) => fields === "all" || isDistinctive(keyPath))
    .map(([keyPath, from]) => ({keyPath, from, to: next.get(keyPath)}))
    .filter((entry, index, all) => all.findIndex((other) => other.from === entry.from) === index)
    .sort((a, b) => b.from.length - a.from.length);
}

// A value written inside a regular expression literal (catchdates\.com) is
// rewritten to the escaped new value.
const regexEscaped = (text) => text.replace(/[.\/]/gu, "\\$&");

export function rewriteText(text, changes) {
  if (changes.length === 0) return text;
  const variants = changes.flatMap((change) => [[change.from, change.to],
    [regexEscaped(change.from), regexEscaped(change.to)]])
    .filter(([from], index, all) => all.findIndex(([other]) => other === from) === index)
    .sort(([a], [b]) => b.length - a.length);
  const byValue = new Map(variants);
  const pattern = new RegExp(`(?<![\\w-])(?:${variants.map(([from]) => escape(from)).join("|")})(?![\\w-])`, "gu");
  return text.replace(pattern, (match) => byValue.get(match));
}

/**
 * Rewrites string values of a JSON document in place, token by token, so the
 * file's formatting is untouched. Keys stay as they are; top-level entries in
 * `exceptKeys` (and their "@" metadata) are skipped.
 */
export function rewriteJsonValues(text, changes, exceptKeys = []) {
  if (changes.length === 0) return text;
  const skip = new Set(exceptKeys);
  let output = "";
  let depth = 0;
  let topKey = null;
  for (let index = 0; index < text.length;) {
    const char = text[index];
    if (char !== "\"") {
      if (char === "{" || char === "[") depth += 1;
      if (char === "}" || char === "]") depth -= 1;
      output += char;
      index += 1;
      continue;
    }
    let end = index + 1;
    while (text[end] !== "\"") end += text[end] === "\\" ? 2 : 1;
    const raw = text.slice(index, end + 1);
    index = end + 1;
    if (/^\s*:/u.test(text.slice(index, index + 32))) {
      if (depth === 1) topKey = JSON.parse(raw).replace(/^@/u, "");
      output += raw;
      continue;
    }
    const value = JSON.parse(raw);
    const next = skip.has(topKey) ? value : rewriteText(value, changes);
    output += next === value ? raw : JSON.stringify(next);
  }
  return output;
}

export function surfacePaths(repoRoot, surface) {
  if (!surface.path.includes("*")) return [surface.path];
  const directory = path.posix.dirname(surface.path);
  const pattern = new RegExp(`^${escape(path.posix.basename(surface.path)).replace("\\*", "[^/]*")}$`, "u");
  return fs.readdirSync(path.join(repoRoot, directory)).filter((name) => pattern.test(name)).sort()
    .map((name) => path.posix.join(directory, name));
}

export function rewriteSurface(text, surface, applied, current) {
  const changes = replacements(applied, current, surface.fields ?? (surface.kind === "json-values" ? "all" : "distinctive"));
  return surface.kind === "json-values" ? rewriteJsonValues(text, changes, surface.exceptKeys) : rewriteText(text, changes);
}
