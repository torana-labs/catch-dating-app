#!/usr/bin/env node
// Fails when a brand value from brand.json is hard-coded outside the brand
// record. Patterns come from the record itself, so after a rebrand the guard
// protects the new values. literal_allowlist.json holds the exact number of
// matching lines each not-yet-migrated file may keep; it may only shrink.
//
//   node packages/brand/check_brand_literals.mjs          check
//   node packages/brand/check_brand_literals.mjs --prune  lower counts after a migration
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {outputs} from "./generate.mjs";
import {brand} from "./index.mjs";
import {surfacePaths} from "./managed.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageDir, "../..");
const allowlistPath = path.join(packageDir, "literal_allowlist.json");

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
// Also matches the value as written inside a regular expression (catchdates\.com).
const literal = (text) => escape(text).replaceAll("\\.", "\\\\?\\.").replaceAll("_", "\\\\?_");

// Never scanned: the record and its generated copies, the managed surfaces the
// generator rewrites and the files regenerated from them, prose, vendored
// design handoffs that are not shipped, and the owner's design-tool config.
const excluded = [
  /^packages\/brand\//u,
  /\.md$/u,
  /^design\/source_packs\//u,
  /^design\/sync\//u,
];
const binary = /\.(?:png|jpe?g|gif|webp|avif|ico|icns|svgz|pdf|ttf|otf|woff2?|mp4|mov|lottie|zip|gz|jar|keystore|p12|mobileprovision)$/iu;

// Files where user-facing copy lives; the display name may not be typed there.
// The ARB and copy/*.json catalogs are managed surfaces instead.
const copyFiles = [
  /^website\/src\/content\/.+\.(?:json|ts)$/u,
];

export function managedFiles(root = repoRoot) {
  const managed = JSON.parse(fs.readFileSync(path.join(packageDir, "managed_surfaces.json"), "utf8"));
  return new Set([
    ...outputs().map((output) => output.path),
    ...managed.surfaces.flatMap((surface) => surfacePaths(root, surface)),
    ...managed.regenerated,
  ]);
}

export function rules(record = brand) {
  return [
    {id: "domain", pattern: new RegExp(literal(record.web.domain), "iu"), applies: () => true},
    {id: "instagram-handle", pattern: new RegExp(`\\b${literal(record.social.instagramHandle)}\\b`, "iu"), applies: () => true},
    {id: "support-email", pattern: new RegExp(literal(record.support.email), "iu"), applies: () => true},
    ...[record.support.phone, record.support.phoneDisplay, record.support.whatsapp].filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .map((value) => ({id: "support-phone", pattern: new RegExp(literal(value), "u"), applies: () => true})),
    {id: "name-in-copy", pattern: new RegExp(`\\b${escape(record.name)}\\b`, "u"),
      applies: (file) => copyFiles.some((copy) => copy.test(file))},
  ];
}

// A line that uses a brand-equal value for another reason says so inline:
// `brand-literal-ok: <reason>`.
const waiver = /brand-literal-ok: \S/u;

export function scanText(file, text, ruleList = rules()) {
  const counts = {};
  const lines = text.split("\n").filter((line) => !waiver.test(line));
  for (const rule of ruleList) {
    if (!rule.applies(file)) continue;
    const count = lines.filter((line) => rule.pattern.test(line)).length;
    if (count > 0) counts[rule.id] = count;
  }
  return counts;
}

export function trackedFiles(root = repoRoot) {
  const managed = managedFiles(root);
  return execFileSync("git", ["ls-files", "-z"], {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024})
    .split("\0").filter((file) => file && !binary.test(file) && !managed.has(file) &&
      !excluded.some((pattern) => pattern.test(file)));
}

export function scanRepository(root = repoRoot, files = trackedFiles(root)) {
  const found = {};
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) continue;
    const counts = scanText(file, fs.readFileSync(absolute, "utf8"));
    for (const [rule, count] of Object.entries(counts)) (found[rule] ??= {})[file] = count;
  }
  return found;
}

export function compare(found, allowlist) {
  const errors = [];
  const stale = [];
  const ids = new Set([...Object.keys(found), ...Object.keys(allowlist)]);
  for (const id of ids) {
    const actual = found[id] ?? {};
    const allowed = allowlist[id] ?? {};
    for (const [file, count] of Object.entries(actual)) {
      const limit = allowed[file] ?? 0;
      if (count > limit) {
        errors.push(`${file}: ${count} line(s) hard-code the brand (${id}); ${limit} allowed. ` +
          "Read the value from @catch/brand, functions/src/shared/generated/brand.ts or a {{brand.*}} token.");
      }
    }
    for (const [file, limit] of Object.entries(allowed)) {
      if ((actual[file] ?? 0) < limit) stale.push({id, file, count: actual[file] ?? 0});
    }
  }
  return {errors, stale};
}

function sorted(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  const prune = process.argv.includes("--prune");
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const {errors, stale} = compare(scanRepository(), allowlist);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  if (stale.length === 0) {
    console.log("No hard-coded brand values outside the allowlist.");
    return;
  }
  if (!prune) {
    console.error(stale.map(({id, file, count}) => `${file}: allowlist (${id}) is above the ${count} line(s) left.`)
      .join("\n") + "\nRun: node packages/brand/check_brand_literals.mjs --prune");
    process.exit(1);
  }
  for (const {id, file, count} of stale) {
    if (count === 0) delete allowlist[id][file];
    else allowlist[id][file] = count;
  }
  const next = Object.fromEntries(Object.entries(allowlist).map(([id, files]) => [id, sorted(files)]));
  fs.writeFileSync(allowlistPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Lowered ${stale.length} allowlist entr${stale.length === 1 ? "y" : "ies"}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
