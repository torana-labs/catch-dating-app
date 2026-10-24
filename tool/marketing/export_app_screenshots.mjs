#!/usr/bin/env node
import fs from "node:fs";
import {captureInputHash, stampCapture, validateCapture} from "./lib/capture_provenance.mjs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";

const manifestPath = fromRepo("tool/marketing/capture_manifest.json");
const catalogPath = fromRepo("test/ui_captures/catalog/screen_capture_catalog.dart");
const designContextPath = fromRepo("tool/marketing/app_screenshots_design_context.json");
const rawOutputDir = "artifacts/marketing/app-screenshots/raw";
const supportedDevices = new Set(["iphone-17-pro"]);
const args = process.argv.slice(2);
const command = args[0] ?? "--help";

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--list" || command === "list") {
  listExports();
} else if (command === "--check" || command === "check") {
  checkExports();
} else if (command === "--design-json" || command === "design-json") {
  printDesignJson();
} else if (
  command === "--update-design-json" ||
  command === "update-design-json"
) {
  updateDesignJson();
} else if (
  command === "--check-design-json" ||
  command === "check-design-json"
) {
  checkDesignJson();
} else if (command === "--plan") {
  printRenderPlan();
} else if (command === "--update-stale") {
  updateExports(true);
} else if (command === "--update" || command === "update") {
  updateExports();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function listExports() {
  const {manifest, catalog} = loadContext();
  for (const capture of manifest.captures) {
    const entry = findCatalogEntry(catalog, capture.fixtureKey);
    console.log(
      [
        capture.id.padEnd(28),
        capture.status.padEnd(16),
        capture.device.padEnd(14),
        entry ? entry.id : "<missing-catalog>",
      ].join(" ")
    );
  }
}

function checkExports() {
  const {manifest, catalog} = loadContext();
  const errors = validateExports(manifest, catalog, {requireSources: true});
  if (errors.length > 0) fail("Marketing app screenshot export check failed.", errors);
  console.log("Marketing app screenshot exports are ready.");
}

function printDesignJson() {
  const {manifest, catalog} = loadContext();
  const errors = validateExports(manifest, catalog, {requireSources: false});
  if (errors.length > 0) fail("Marketing app design context export failed.", errors);

  const doc = buildDesignJson(manifest, catalog);
  const designErrors = validateDesignJson(doc, manifest, catalog);
  if (designErrors.length > 0) {
    fail("Marketing app design context export failed.", designErrors);
  }
  console.log(JSON.stringify(doc, null, 2));
}

function updateDesignJson() {
  const {manifest, catalog} = loadContext();
  const doc = buildDesignJson(manifest, catalog);
  const errors = [
    ...validateExports(manifest, catalog, {requireSources: false}),
    ...validateDesignJson(doc, manifest, catalog),
  ];
  if (errors.length > 0) {
    fail("Marketing app design context update failed.", errors);
  }

  fs.writeFileSync(designContextPath, stableJson(doc));
  console.log(`Wrote ${path.relative(repoRoot, designContextPath)}`);
}

function checkDesignJson() {
  const {manifest, catalog} = loadContext();
  const doc = buildDesignJson(manifest, catalog);
  const errors = [
    ...validateExports(manifest, catalog, {requireSources: false}),
    ...validateDesignJson(doc, manifest, catalog),
  ];
  if (errors.length > 0) {
    fail("Marketing app design context check failed.", errors);
  }

  const expected = stableJson(doc);
  const actual = fs.existsSync(designContextPath) ?
    fs.readFileSync(designContextPath, "utf8") :
    null;
  if (actual !== expected) {
    fail("Marketing app design context artifact is stale.", [
      `Run: node tool/marketing/export_app_screenshots.mjs --update-design-json`,
    ]);
  }
  console.log(
    `Marketing app design context artifact is current: ${path.relative(
      repoRoot,
      designContextPath
    )}`
  );
}

function buildDesignJson(manifest, catalog) {
  const captures = (manifest.captures ?? []).map((capture) => {
    const entry = findCatalogEntry(catalog, capture.fixtureKey);
    const deviceFrame = deviceFrameSpec(capture.device);
    return {
      type: "marketing-app-capture",
      id: capture.id,
      status: capture.status,
      audience: capture.audience,
      surface: capture.surface,
      fixtureKey: capture.fixtureKey,
      captureId: entry?.id ?? null,
      routeIds: entry?.routeIds ?? [],
      device: deviceFrame,
      assets: {
        sourcePath: capture.sourcePath,
        websitePath: capture.websitePath,
        placeholderPath: capture.placeholderPath,
      },
      copy: {
        alt: capture.alt,
        caption: capture.caption,
        walkthroughStep: capture.walkthroughStep,
      },
    };
  });

  return {
    version: 1,
    generatedBy: "tool/marketing/export_app_screenshots.mjs --design-json",
    coordinateSystem: "px",
    description:
      "Figma/AI-friendly design context for app-derived marketing screenshots.",
    captures,
  };
}

function nativeFont() {
  const fontPath = valueAfter("--sf-font") ??
    (process.platform === "darwin" ? "/System/Library/Fonts/SFNS.ttf" : null);
  if (!fontPath || !fs.existsSync(fontPath)) {
    fail("Native iPhone product captures require a local system font.", [
      "Run on macOS or pass --sf-font with an available native iOS font file.",
    ]);
  }
  return fontPath;
}

function printRenderPlan() {
  const {manifest, catalog} = loadContext();
  const errors = validateExports(manifest, catalog, {requireSources: false});
  if (errors.length) fail("Marketing capture planning failed.", errors);
  // Without the native font (Linux planning) a plan judges inputs only; the
  // macOS render job checks the font again before it reuses anything.
  const fontPath = args.includes("--inputs-only") ? undefined : nativeFont();
  console.log(JSON.stringify(selectCaptures(manifest).map(capture => {
    const entry = findCatalogEntry(catalog, capture.fixtureKey);
    const reasons = validateCapture(capture, entry.id, {fontPath});
    return {id: capture.id, render: reasons.length > 0, reasons};
  }), null, 2));
}

function updateExports(staleOnly = false) {
  const {manifest, catalog} = loadContext();
  const errors = validateExports(manifest, catalog, {requireSources: false});
  if (errors.length > 0) fail("Marketing app screenshot export failed.", errors);

  const sfFont = nativeFont();
  const selectedCaptures = selectCaptures(manifest).filter(capture => !staleOnly ||
    validateCapture(capture, findCatalogEntry(catalog, capture.fixtureKey).id, {fontPath: sfFont}).length > 0);
  if (selectedCaptures.length === 0) {
    console.log("No active marketing captures selected.");
    return;
  }

  const selected = selectedCaptures.map((capture) => ({
    capture,
    entry: findCatalogEntry(catalog, capture.fixtureKey),
    inputHash: captureInputHash(capture),
  }));
  for (const item of selected) {
    if (!item.entry) {
      fail("Marketing app screenshot export failed.", [
        `${item.capture.id}: fixtureKey ${item.capture.fixtureKey} has no capture catalog entry.`,
      ]);
    }
  }

  const groups = groupBy(selected, (item) => item.capture.device);
  for (const [device, items] of groups) {
    const captureIds = [...new Set(items.map((item) => item.entry.id))];
    for (const id of captureIds) {
      fs.rmSync(fromRepo(path.join(rawOutputDir, id)), {recursive: true, force: true});
    }
    const result = spawnSync(
      "node",
      [
        "tool/ui_capture/run_captures.mjs",
        "--ids",
        captureIds.join(","),
        "--output-dir",
        rawOutputDir,
        "--device",
        device,
        "--pixel-ratio",
        String(deviceFrameSpec(device).outputScale),
        "--platform",
        "ios",
        "--sf-font",
        sfFont,
      ],
      {cwd: repoRoot, stdio: "inherit"}
    );
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }

  for (const {capture, entry, inputHash} of selected) {
    const inputPath = path.join(rawOutputDir, entry.id, "light.png");
    fs.rmSync(fromRepo(capture.sourcePath), {force: true});
    const result = spawnSync(
      "dart",
      [
        "run",
        "tool/marketing/frame_device_capture.dart",
        "--input",
        inputPath,
        "--output",
        capture.sourcePath,
        "--device",
        capture.device,
      ],
      {cwd: repoRoot, stdio: "inherit"}
    );
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
    if (captureInputHash(capture) !== inputHash) {
      fail("Capture inputs changed during rendering.", ["Rerun the exporter from a stable source tree."]);
    }
    stampCapture(capture, entry.id, sfFont);
  }
}

function validateExports(manifest, catalog, {requireSources}) {
  const errors = [];
  for (const capture of manifest.captures ?? []) {
    if (capture.status !== "active") continue;

    if (!supportedDevices.has(capture.device)) {
      errors.push(
        `${capture.id}: unsupported marketing device ${capture.device}; supported: ${[
          ...supportedDevices,
        ].join(", ")}.`
      );
    }

    const matches = catalog.filter(entry => entry.marketingFixtureKeys.includes(capture.fixtureKey));
    if (matches.length > 1) errors.push(`${capture.id}: fixtureKey must map to exactly one catalog entry.`);
    const entry = matches[0];
    if (!entry) {
      errors.push(
        `${capture.id}: fixtureKey ${capture.fixtureKey} has no capture catalog entry.`
      );
      continue;
    }

    if (entry.marketingFixtureKeys.filter((key) => key === capture.fixtureKey).length !== 1) {
      errors.push(`${capture.id}: fixtureKey ${capture.fixtureKey} must map once.`);
    }

    if (requireSources && fs.existsSync(fromRepo(capture.sourcePath))) {
      errors.push(...validateCapture(capture, entry.id));
    }
    if (requireSources && !fs.existsSync(fromRepo(capture.sourcePath))) {
      errors.push(
        `${capture.id}: sourcePath is missing at ${capture.sourcePath}; run node tool/marketing/export_app_screenshots.mjs --update.`
      );
    }
  }
  return errors;
}

function validateDesignJson(doc, manifest, catalog) {
  const errors = [];
  if (!isRecord(doc)) return ["design JSON must be an object."];
  if (doc.version !== 1) errors.push("version must be 1.");
  if (doc.coordinateSystem !== "px") errors.push("coordinateSystem must be px.");
  if (!Array.isArray(doc.captures)) errors.push("captures must be an array.");
  if (!Array.isArray(manifest.captures)) {
    errors.push("capture manifest must contain captures array.");
    return errors;
  }
  if (!Array.isArray(doc.captures)) return errors;
  if (doc.captures.length !== manifest.captures.length) {
    errors.push(
      `captures length must match manifest (${manifest.captures.length}).`
    );
  }

  const manifestById = new Map(
    manifest.captures.map((capture) => [capture.id, capture])
  );
  for (const [index, capture] of doc.captures.entries()) {
    if (!isRecord(capture)) {
      errors.push(`captures[${index}] must be an object.`);
      continue;
    }
    const manifestCapture = manifestById.get(capture.id);
    if (!manifestCapture) {
      errors.push(`captures[${index}].id ${capture.id} is not in the manifest.`);
      continue;
    }
    const prefix = `captures[${index}] ${capture.id}`;
    for (const field of [
      "type",
      "id",
      "status",
      "audience",
      "surface",
      "fixtureKey",
      "captureId",
    ]) {
      if (typeof capture[field] !== "string" || capture[field].length === 0) {
        errors.push(`${prefix}: ${field} must be a non-empty string.`);
      }
    }
    if (capture.type !== "marketing-app-capture") {
      errors.push(`${prefix}: type must be marketing-app-capture.`);
    }
    if (!Array.isArray(capture.routeIds) || capture.routeIds.length === 0) {
      errors.push(`${prefix}: routeIds must be a non-empty array.`);
    }
    for (const routeId of capture.routeIds ?? []) {
      if (typeof routeId !== "string" || routeId.length === 0) {
        errors.push(`${prefix}: routeIds must contain only non-empty strings.`);
      }
    }
    const catalogEntry = findCatalogEntry(catalog, manifestCapture.fixtureKey);
    if (catalogEntry && capture.captureId !== catalogEntry.id) {
      errors.push(`${prefix}: captureId must match catalog entry ${catalogEntry.id}.`);
    }
    validateAssetBlock(capture.assets, `${prefix}.assets`, errors);
    validateCopyBlock(capture.copy, `${prefix}.copy`, errors);
    validateDeviceBlock(capture.device, `${prefix}.device`, errors);
  }
  return errors;
}

function selectCaptures(manifest) {
  const idsArg = valueAfter("--ids");
  const ids = idsArg
    ? new Set(idsArg.split(",").map((id) => id.trim()).filter(Boolean))
    : null;
  const selected = [];
  for (const capture of manifest.captures ?? []) {
    if (capture.status !== "active") continue;
    if (ids && !ids.has(capture.id)) continue;
    selected.push(capture);
  }
  if (ids) {
    const known = new Set((manifest.captures ?? []).map((capture) => capture.id));
    for (const id of ids) {
      if (!known.has(id)) {
        fail("Marketing app screenshot export failed.", [`Unknown capture id: ${id}`]);
      }
    }
  }
  return selected;
}

function loadContext() {
  return {
    manifest: readJson(manifestPath),
    catalog: parseCaptureCatalog(fs.readFileSync(catalogPath, "utf8")),
  };
}

function findCatalogEntry(catalog, fixtureKey) {
  return catalog.find((entry) => entry.marketingFixtureKeys.includes(fixtureKey)) ?? null;
}

function groupBy(values, keyFor) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFor(value);
    const bucket = groups.get(key) ?? [];
    bucket.push(value);
    groups.set(key, bucket);
  }
  return groups;
}

function parseCaptureCatalog(source) {
  const entries = [];
  for (const block of extractCallBlocks(source, "ScreenCaptureEntry")) {
    const id = matchString(block, /\bid:\s*'([^']+)'/u);
    const routeIdsBlock = matchString(block, /\brouteIds:\s*const\s*<String>\s*\[([\s\S]*?)\]/u);
    const marketingBlock = matchString(
      block,
      /\bmarketingFixtureKeys:\s*const\s*<String>\s*\[([\s\S]*?)\]/u
    );
    const deviceToken = matchString(block, /\bdevice:\s*CaptureDevice\.([a-zA-Z0-9_]+)/u);
    if (!id) continue;
    entries.push({
      id,
      routeIds: parseStringList(routeIdsBlock),
      marketingFixtureKeys: parseStringList(marketingBlock),
      device: deviceIdFromToken(deviceToken),
    });
  }
  return entries;
}

function extractCallBlocks(source, callName) {
  const blocks = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const callIndex = source.indexOf(`${callName}(`, searchIndex);
    if (callIndex === -1) break;
    const openIndex = source.indexOf("(", callIndex);
    const endIndex = findBalancedEnd(source, openIndex, "(", ")");
    blocks.push(source.slice(callIndex, endIndex + 1));
    searchIndex = endIndex + 1;
  }
  return blocks;
}

function findBalancedEnd(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (stringQuote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === stringQuote) stringQuote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Could not parse balanced call block starting at ${openIndex}.`);
}

function matchString(value, pattern) {
  return value.match(pattern)?.[1] ?? null;
}

function parseStringList(value) {
  if (!value) return [];
  return [...value.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function deviceIdFromToken(token) {
  if (!token) return null;
  return token
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/([a-z])([0-9])/gu, "$1-$2")
    .toLowerCase();
}

function deviceFrameSpec(deviceId) {
  if (deviceId !== "iphone-17-pro") {
    throw new Error(`Unsupported design metadata device: ${deviceId}`);
  }
  const logicalWidth = 402;
  const logicalHeight = 874;
  const outputScale = 2;
  const canvasMargin = 32;
  const frameInset = 22;
  const screenWidth = logicalWidth * outputScale;
  const screenHeight = logicalHeight * outputScale;
  const framedWidth = screenWidth + (frameInset + canvasMargin) * outputScale * 2;
  const framedHeight = screenHeight + (frameInset + canvasMargin) * outputScale * 2;
  return {
    id: deviceId,
    logicalSize: {width: logicalWidth, height: logicalHeight},
    outputScale,
    safeArea: {top: 59, right: 0, bottom: 34, left: 0},
    frame: {
      framedSize: {width: framedWidth, height: framedHeight},
      canvasMargin: canvasMargin * outputScale,
      frameInset: frameInset * outputScale,
      outerRadius: 68 * outputScale,
      screenRadius: 52 * outputScale,
      dynamicIsland: {
        width: 126 * outputScale,
        height: 37 * outputScale,
        top: 12 * outputScale,
      },
    },
  };
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value.`);
    process.exit(64);
  }
  return value;
}

function validateAssetBlock(assets, prefix, errors) {
  if (!isRecord(assets)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }
  for (const field of ["sourcePath", "websitePath", "placeholderPath"]) {
    if (typeof assets[field] !== "string" || assets[field].length === 0) {
      errors.push(`${prefix}.${field} must be a non-empty string.`);
    }
  }
}

function validateCopyBlock(copy, prefix, errors) {
  if (!isRecord(copy)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }
  for (const field of ["alt", "caption", "walkthroughStep"]) {
    if (typeof copy[field] !== "string" || copy[field].length === 0) {
      errors.push(`${prefix}.${field} must be a non-empty string.`);
    }
  }
}

function validateDeviceBlock(device, prefix, errors) {
  if (!isRecord(device)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }
  if (!supportedDevices.has(device.id)) {
    errors.push(`${prefix}.id must be one of ${[...supportedDevices].join(", ")}.`);
  }
  for (const [field, value] of [
    ["logicalSize", device.logicalSize],
    ["safeArea", device.safeArea],
    ["frame", device.frame],
  ]) {
    if (!isRecord(value)) errors.push(`${prefix}.${field} must be an object.`);
  }
  if (typeof device.outputScale !== "number" || device.outputScale <= 0) {
    errors.push(`${prefix}.outputScale must be a positive number.`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(title, errors) {
  console.error(title);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node tool/marketing/export_app_screenshots.mjs <command> [options]

Commands:
  --list             Show marketing slots and catalog mapping.
  --update           Force a fresh render of selected active captures.
  --update-stale     Render only missing, invalid or changed-input captures.
  --plan             Print the per-capture render/reuse decision as JSON.
                     Add --inputs-only to judge inputs without the native font.
  --check            Verify frame, render provenance, and current capture inputs.
  --design-json      Print Figma/AI-friendly capture metadata and frame geometry.
  --update-design-json
                     Write checked capture metadata to tool/marketing.
  --check-design-json
                     Verify checked capture metadata is current.

Options:
  --ids <ids>        Comma-separated marketing capture ids for --update.
  --sf-font <path>   Native iOS font; defaults to the local macOS SFNS.ttf.

Raw captures are written under ${rawOutputDir}/ and framed source PNGs are
written to each active manifest sourcePath.
`);
}
