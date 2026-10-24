#!/usr/bin/env node
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import {repoRoot} from "../lib/repo_paths.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const sourceManifestPath = fromRepo("tool/marketing/capture_manifest.json");
const websitePublicPrefix = "website/public/";
const websiteScreenshotPrefix = `${websitePublicPrefix}assets/app-screenshots/`;
const websiteManifestPath = fromRepo(`${websiteScreenshotPrefix}manifest.json`);
const allowedStatuses = new Set(["active", "pending-fixture", "paused"]);
const allowedKinds = new Set(["app-capture"]);
// Framed PNG size per device, so pages reserve the image's space before it loads.
const deviceFrameSizes = {"iphone-17-pro": {width: 1020, height: 1964}};
const scenarioRoot = "tool/demo/demo_seed/scenarios";
const args = process.argv.slice(2);
const command = args[0] ?? "--help";

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();

function runCli() {
if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--list" || command === "list") {
  listCaptures(loadSourceManifest());
} else if (command === "--update" || command === "update") {
  updateWebsiteMedia(loadSourceManifest());
} else if (command === "--check" || command === "check") {
  checkWebsiteMedia(loadSourceManifest());
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}
}

function loadSourceManifest() {
  return readJson(sourceManifestPath);
}

function listCaptures(manifest) {
  validateSourceManifest(manifest);
  for (const capture of manifest.captures) {
    console.log(
      `${capture.id.padEnd(28)} ${capture.status.padEnd(16)} ${capture.surface}`
    );
  }
}

function updateWebsiteMedia(manifest) {
  const errors = validateSourceManifest(manifest);
  if (errors.length > 0) fail("Marketing capture manifest is invalid.", errors);

  requireCurrentExports();
  for (const capture of manifest.captures) {
    if (capture.status !== "active") continue;
    const sourcePath = fromRepo(capture.sourcePath);
    const targetPath = fromRepo(capture.websitePath);
    fs.mkdirSync(path.dirname(targetPath), {recursive: true});
    fs.copyFileSync(sourcePath, targetPath);
  }

  const websiteManifest = buildWebsiteManifest(manifest);
  writeJson(websiteManifestPath, websiteManifest);
  console.log(
    `Synced ${websiteManifest.captures.length} marketing capture records to ${relativeToRepo(
      websiteManifestPath
    )}.`
  );
}

function checkWebsiteMedia(manifest) {
  const errors = validateSourceManifest(manifest);
  if (!fs.existsSync(websiteManifestPath)) {
    errors.push(
      `${relativeToRepo(websiteManifestPath)} is missing; run node tool/marketing/sync_website_media.mjs --update.`
    );
  }

  if (errors.length > 0) fail("Marketing website media check failed.", errors);
  requireCurrentExports();

  for (const capture of manifest.captures) {
    if (capture.status !== "active") continue;
    const target = fromRepo(capture.websitePath);
    if (!fs.existsSync(target)) {
      errors.push(`${capture.id}: website image is missing at ${capture.websitePath}.`);
    } else if (sha256(fromRepo(capture.sourcePath)) !== sha256(target)) {
      errors.push(`${capture.id}: website image differs from the app capture source.`);
    }
  }
  if (errors.length > 0) {
    fail("Marketing website images are not in sync.", [
      ...errors,
      "Run node tool/marketing/sync_website_media.mjs --update after reviewing the source captures.",
    ]);
  }

  const expected = stableJson(buildWebsiteManifest(manifest));
  const actual = fs.readFileSync(websiteManifestPath, "utf8");
  if (actual !== expected) {
    fail("Marketing website media manifest is stale.", [
      "Materialize the verified exact-source capture artifact, or run node tool/marketing/sync_website_media.mjs --update after rendering current inputs.",
    ]);
  }

  console.log("Marketing website media is in sync.");
}

export function validateSourceManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return ["tool/marketing/capture_manifest.json must contain an object."];
  }
  if (!Number.isInteger(manifest.version)) {
    errors.push("Manifest version must be an integer.");
  }
  if (typeof manifest.previewDisclosure !== "string" || manifest.previewDisclosure.trim() === "") {
    errors.push("Manifest previewDisclosure is required for synthetic app previews.");
  }
  if (!Array.isArray(manifest.captures)) {
    errors.push("Manifest captures must be an array.");
    return errors;
  }

  const ids = new Set();
  for (const capture of manifest.captures) {
    const label = capture && capture.id ? capture.id : "<missing id>";
    if (!capture || typeof capture !== "object") {
      errors.push("Every capture entry must be an object.");
      continue;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capture.id ?? "")) {
      errors.push(`${label}: id must be lowercase kebab-case.`);
    }
    if (ids.has(capture.id)) errors.push(`${label}: duplicate id.`);
    ids.add(capture.id);

    for (const key of [
      "audience",
      "surface",
      "device",
      "fixtureKey",
      "sourcePath",
      "websitePath",
      "placeholderPath",
      "alt",
      "caption",
      "walkthroughStep",
    ]) {
      if (typeof capture[key] !== "string" || capture[key].trim() === "") {
        errors.push(`${label}: ${key} is required.`);
      }
    }

    if (!allowedStatuses.has(capture.status)) {
      errors.push(
        `${label}: status must be one of ${[...allowedStatuses].join(", ")}.`
      );
    }

    const websitePath = capture.websitePath ?? "";
    if (!websitePath.startsWith(websiteScreenshotPrefix)) {
      errors.push(
        `${label}: websitePath must stay under ${websiteScreenshotPrefix}.`
      );
    }
    if (websitePath.includes("/placeholders/")) {
      errors.push(`${label}: websitePath must not point at a placeholder.`);
    }

    if (capture.status === "active") {
      requireFile(errors, label, "sourcePath", capture.sourcePath);
    } else if (capture.status === "pending-fixture") {
      requireFile(errors, label, "placeholderPath", capture.placeholderPath);
    }
    validatePresentation(errors, label, capture);
  }
  return errors;
}

// Fields for the pages that show a capture. None of them is a render input.
function validatePresentation(errors, label, capture) {
  if (capture.kind !== undefined && !allowedKinds.has(capture.kind)) {
    errors.push(`${label}: kind must be one of ${[...allowedKinds].join(", ")}.`);
  }
  if (capture.pages !== undefined) {
    const pages = Array.isArray(capture.pages) ? capture.pages : [];
    if (!Array.isArray(capture.pages) || pages.some(page => typeof page !== "string" || !/^\/(?:[a-z0-9-]+\/)*$/.test(page))) {
      errors.push(`${label}: pages must list canonical paths such as "/host/".`);
    } else if (new Set(pages).size !== pages.length) {
      errors.push(`${label}: pages must not repeat a path.`);
    }
    if (pages.length > 0 && capture.status !== "active") {
      errors.push(`${label}: only an active capture can name pages.`);
    }
  }
  if (capture.scenario !== undefined) {
    const {world, event, moment} = capture.scenario ?? {};
    if (![world, event, moment].every(value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value))) {
      errors.push(`${label}: scenario needs world, event and moment.`);
    }
  }
}

/**
 * Checks each scenario against its demo world. Kept out of
 * validateSourceManifest: hosted export fixtures copy the manifest without the
 * worlds, and sync_website_media.test.mjs runs this over the real repository.
 */
export function scenarioReferenceProblems(manifest) {
  return manifest.captures
    .filter(capture => capture.scenario !== undefined)
    .flatMap(capture => scenarioProblems(capture.id, capture.scenario));
}

function scenarioProblems(label, {world, event, moment}) {
  const worldPath = `${scenarioRoot}/${world}.json`;
  if (!fs.existsSync(fromRepo(worldPath))) {
    return [`${label}: scenario world ${world} is not a file under ${scenarioRoot}.`];
  }
  const data = readJson(fromRepo(worldPath));
  if (data.schemaVersion !== 2) return [`${label}: scenario world ${world} is not a schemaVersion 2 demo world.`];
  const problems = [];
  if (!(data.events ?? []).some(item => item.id === event)) problems.push(`${label}: ${world} has no event ${event}.`);
  if (!Object.hasOwn(data.moments ?? {}, moment)) problems.push(`${label}: ${world} has no moment ${moment}.`);
  return problems;
}

export function buildWebsiteManifest(manifest) {
  const captures = manifest.captures
    .filter((capture) => capture.status !== "paused")
    .map((capture) => {
      const isActive = capture.status === "active";
      const sourcePath = isActive ? capture.sourcePath : capture.placeholderPath;
      const webPath = toWebPath(isActive ? capture.websitePath : sourcePath);
      return {
        id: capture.id,
        audience: capture.audience,
        surface: capture.surface,
        device: capture.device,
        webPath,
        ...deviceFrameSizes[capture.device],
        alt: capture.alt,
        caption: `${manifest.previewDisclosure} ${capture.caption}`,
        walkthroughStep: capture.walkthroughStep,
        pages: capture.pages ?? [],
      };
    });

  return {
    version: manifest.version,
    updated: manifest.updated,
    captures,
  };
}

function requireFile(errors, label, key, repoPath) {
  if (typeof repoPath !== "string" || repoPath.trim() === "") return;
  if (!fs.existsSync(fromRepo(repoPath))) {
    errors.push(`${label}: ${key} is missing at ${repoPath}.`);
  }
}

function toWebPath(repoPath) {
  const normalized = repoPath.replaceAll(path.sep, "/");
  if (!normalized.startsWith(websitePublicPrefix)) {
    throw new Error(`Cannot expose non-website asset path: ${repoPath}`);
  }
  return `/${normalized.slice(websitePublicPrefix.length)}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, stableJson(value));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fail(title, errors) {
  console.error(title);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node tool/marketing/sync_website_media.mjs <command>

Commands:
  --list     Show capture slots and lifecycle status.
  --update   Copy active app captures into website assets and write manifest.
  --check    Verify active captures and generated website manifest are current.

Capture statuses:
  pending-fixture  Website uses a checked-in placeholder until synthetic data exists.
  active           sourcePath is required and must match the website asset bytes.
  paused           Excluded from the generated website manifest.
`);
}

function requireCurrentExports() {
  const result = spawnSync(process.execPath, ['tool/marketing/export_app_screenshots.mjs', '--check'], {cwd: repoRoot, stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
