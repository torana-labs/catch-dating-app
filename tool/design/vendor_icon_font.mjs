#!/usr/bin/env node
// Vendors the icon family's Flutter font at the version the React package
// resolves, so a lucide-react bump passes design:icon-catalog.
//
// design/tokens/catch.icons.json pins one family version for both frameworks.
// React takes the family from npm; Flutter draws it from the font vendored
// under packages/catch_ui/assets/fonts/, which must be the same release. This
// tool copies the font and its codepoints out of the family's static npm
// package (`family.flutter.fontSource`) at the version package-lock.json
// resolves for the React package (or `--version`), records that version and
// the font's sha256 in the catalog, and regenerates the icon layer.
//
//   node tool/design/vendor_icon_font.mjs                  # the locked React version
//   node tool/design/vendor_icon_font.mjs --version 1.62.0
//   node tool/design/vendor_icon_font.mjs --dry-run        # report, write nothing
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";

import {repoRoot} from "../lib/repo_paths.mjs";
import {inputs as catalogInputs} from "./generate_icon_catalog.mjs";

const usage = `Usage: node tool/design/vendor_icon_font.mjs [--version <x.y.z>] [--dry-run] [--no-generate]

Vendors the icon family's font and codepoints for Flutter from the family's
static npm package at the given version (default: the version package-lock.json
resolves for the React package), records the version and font hash in
${catalogInputs.catalog}, and regenerates the icon layer.`;

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) runCli(process.argv.slice(2));

/** The version package-lock.json resolves for a root-level dependency. */
export function lockedVersion(lock, packageName) {
  const version = lock?.packages?.[`node_modules/${packageName}`]?.version;
  if (typeof version !== "string") {
    throw new Error(`${catalogInputs.packageLock} does not resolve ${packageName}.`);
  }
  return version;
}

/** The vendored codepoints file: sorted glyph names, one per line. */
export function serializeCodepoints(codepoints) {
  const entries = Object.entries(codepoints)
    .filter(([, codepoint]) => Number.isInteger(codepoint))
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{\n${entries.map(([glyph, codepoint]) => `${JSON.stringify(glyph)}:${codepoint}`).join(",\n")}\n}\n`;
}

/**
 * Rewrites the family version, the font hash and the catalog's `updated` date
 * in place, leaving the catalog's hand-kept formatting alone. Each value must
 * occur exactly once as a JSON string, which the catalog's shape guarantees.
 */
export function updateCatalogText(text, {
  previousVersion, version, previousFontSha256, fontSha256, previousUpdated, today,
}) {
  let result = text;
  for (const [key, before, after] of [
    ["version", previousVersion, version],
    ["fontSha256", previousFontSha256, fontSha256],
    ["updated", previousUpdated, today],
  ]) {
    const needle = `"${key}": ${JSON.stringify(before)}`;
    const occurrences = result.split(needle).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `${catalogInputs.catalog} holds ${needle} ${occurrences} times; expected once.`,
      );
    }
    result = result.replace(needle, `"${key}": ${JSON.stringify(after)}`);
  }
  return result;
}

/**
 * Downloads one npm package with `npm pack` into a fresh temporary directory
 * and extracts it. Returns the extracted package directory. Nothing in it is
 * executed; the caller reads two files out of it.
 */
export function packFromNpm(spec) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-icon-font-"));
  const pack = spawnSync("npm", [
    "pack", spec, "--pack-destination", directory, "--json", "--ignore-scripts",
  ], {encoding: "utf8"});
  if (pack.status !== 0) {
    throw new Error(`npm pack ${spec} failed:\n${pack.stderr}`);
  }
  const [{filename}] = JSON.parse(pack.stdout);
  const extract = spawnSync("tar", ["-xzf", path.join(directory, filename), "-C", directory], {
    encoding: "utf8",
  });
  if (extract.status !== 0) {
    throw new Error(`Extracting ${filename} failed:\n${extract.stderr}`);
  }
  return path.join(directory, "package");
}

/**
 * Vendors the family's font and codepoints and updates the catalog. Returns a
 * report; with `dryRun` it writes nothing. `pack` resolves a package spec to
 * an extracted package directory (injectable for tests).
 */
export function vendorIconFont({
  version = null,
  root = repoRoot,
  pack = packFromNpm,
  dryRun = false,
  generate = true,
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const catalogPath = path.join(root, catalogInputs.catalog);
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const family = catalog.family ?? {};
  const flutter = family.flutter ?? {};
  const source = flutter.fontSource;
  if (!source?.package || !source.font || !source.codepoints) {
    throw new Error(
      `${catalogInputs.catalog} names no family.flutter.fontSource ` +
      "(package, font, codepoints), so the font cannot be vendored.",
    );
  }
  const target = version ?? lockedVersion(
    JSON.parse(fs.readFileSync(path.join(root, catalogInputs.packageLock), "utf8")),
    family.react.package,
  );
  const packageDirectory = pack(`${source.package}@${target}`);
  const fontBytes = fs.readFileSync(path.join(packageDirectory, source.font));
  const codepoints = JSON.parse(
    fs.readFileSync(path.join(packageDirectory, source.codepoints), "utf8"),
  );
  const fontSha256 = crypto.createHash("sha256").update(fontBytes).digest("hex");
  const fontPath = path.join(root, "packages", flutter.fontPackage, flutter.fontAsset);
  const codepointsPath = path.join(root, flutter.codepoints);
  const report = {
    package: source.package,
    previousVersion: family.version,
    version: target,
    previousFontSha256: flutter.fontSha256,
    fontSha256,
    glyphs: Object.values(codepoints).filter(Number.isInteger).length,
    fontPath: path.relative(root, fontPath),
    codepointsPath: path.relative(root, codepointsPath),
    changed: family.version !== target || flutter.fontSha256 !== fontSha256,
    written: false,
  };
  if (dryRun) return report;
  fs.writeFileSync(fontPath, fontBytes);
  fs.writeFileSync(codepointsPath, serializeCodepoints(codepoints));
  fs.writeFileSync(catalogPath, updateCatalogText(fs.readFileSync(catalogPath, "utf8"), {
    previousVersion: family.version,
    version: target,
    previousFontSha256: flutter.fontSha256,
    fontSha256,
    previousUpdated: catalog.updated,
    today,
  }));
  report.written = true;
  if (generate) {
    const generator = spawnSync(process.execPath, ["tool/design/generate_icon_catalog.mjs"], {
      cwd: root,
      stdio: "inherit",
    });
    if (generator.status !== 0) {
      throw new Error("generate_icon_catalog.mjs failed after vendoring; see its output above.");
    }
  }
  return report;
}

function runCli(argv) {
  let values;
  try {
    ({values} = parseArgs({
      args: argv,
      strict: true,
      options: {
        version: {type: "string"},
        "dry-run": {type: "boolean", default: false},
        "no-generate": {type: "boolean", default: false},
        help: {type: "boolean", short: "h", default: false},
      },
    }));
  } catch (error) {
    console.error(error.message);
    console.error(usage);
    process.exit(64);
  }
  if (values.help) {
    console.log(usage);
    return;
  }
  try {
    const report = vendorIconFont({
      version: values.version ?? null,
      dryRun: values["dry-run"],
      generate: !values["no-generate"],
    });
    const verb = report.written ? "Vendored" : "Would vendor";
    console.log(
      `${verb} ${report.package}@${report.version} ` +
      `(${report.previousVersion} before, ${report.glyphs} glyphs, sha256 ${report.fontSha256.slice(0, 12)}…) ` +
      `into ${report.fontPath} and ${report.codepointsPath}.`,
    );
    if (!report.changed) console.log("The catalog already pinned this version and font.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
