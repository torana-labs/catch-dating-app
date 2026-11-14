#!/usr/bin/env node
import fs from "node:fs";
import {executedFilesFromLcov, stampCapture, staticInputHash, validateCapture} from "./lib/capture_provenance.mjs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {extractCallBlocks} from "../lib/dart_call_blocks.mjs";
import {captureDeviceIds, deviceFrameSpec} from "./lib/capture_devices.mjs";
import {captureCatalogIndex, captureEntryPath, readCaptureCatalogFiles} from "../ui_capture/lib/capture_catalog_sources.mjs";

const manifestPath = fromRepo("tool/marketing/capture_manifest.json");
const designContextPath = fromRepo("tool/marketing/app_screenshots_design_context.json");
const rawOutputDir = "artifacts/marketing/app-screenshots/raw";
const supportedDevices = new Set(captureDeviceIds);
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
  await updateExports(true);
} else if (command === "--update" || command === "update") {
  await updateExports();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function listExports() {
  const {manifest, catalog} = loadContext();
  for (const capture of manifest.captures) {
    console.log(
      [
        capture.id.padEnd(28),
        capture.status.padEnd(16),
        capture.device.padEnd(14),
        renderSourceId(catalog, capture) ?? "<missing-catalog>",
      ].join(" ")
    );
  }
}

// App captures render a catalog entry; web captures render a website story.
function isWebCapture(capture) {
  return capture.kind === "web-capture";
}

function renderSourceId(catalog, capture) {
  return isWebCapture(capture) ? capture.story?.id ?? null : findCatalogEntry(catalog, capture.fixtureKey)?.id ?? null;
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
    const entry = isWebCapture(capture) ? null : findCatalogEntry(catalog, capture.fixtureKey);
    const deviceFrame = deviceFrameSpec(capture.device);
    return {
      ...(isWebCapture(capture)
        ? {type: "marketing-web-capture", id: capture.id, status: capture.status, audience: capture.audience,
          surface: capture.surface, story: capture.story, address: capture.address,
          captureId: capture.story?.id ?? null, routeIds: capture.routeId ? [capture.routeId] : []}
        : {type: "marketing-app-capture", id: capture.id, status: capture.status, audience: capture.audience,
          surface: capture.surface, fixtureKey: capture.fixtureKey,
          captureId: entry?.id ?? null, routeIds: entry?.routeIds ?? []}),
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
      "Figma/AI-friendly design context for marketing captures of the app and of website pages in iPhone Safari.",
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
    const reasons = validateCapture(capture, renderSourceId(catalog, capture), {fontPath});
    return {id: capture.id, kind: isWebCapture(capture) ? "web-capture" : "app-capture", render: reasons.length > 0, reasons};
  }), null, 2));
}

async function updateExports(staleOnly = false) {
  const {manifest, catalog} = loadContext();
  const errors = validateExports(manifest, catalog, {requireSources: false});
  if (errors.length > 0) fail("Marketing app screenshot export failed.", errors);

  const sfFont = nativeFont();
  const selectedCaptures = selectCaptures(manifest).filter(capture => !staleOnly ||
    validateCapture(capture, renderSourceId(catalog, capture), {fontPath: sfFont}).length > 0);
  if (selectedCaptures.length === 0) {
    console.log("No active marketing captures selected.");
    return;
  }

  const webCaptures = selectedCaptures.filter(isWebCapture);
  if (webCaptures.length > 0) {
    const inputHashes = new Map(webCaptures.map(capture => [capture.id, staticInputHash(capture)]));
    // Loaded only when rendering: Playwright is installed for this step alone.
    const {renderWebCaptures} = await import("./lib/web_capture_render.mjs");
    await renderWebCaptures(webCaptures, {storybook: valueAfter("--storybook") ?? undefined,
      playwrightDir: valueAfter("--playwright-dir") ?? undefined});
    for (const capture of webCaptures) {
      if (staticInputHash(capture) !== inputHashes.get(capture.id)) {
        fail("Capture inputs changed during rendering.", ["Rerun the exporter from a stable source tree."]);
      }
      stampCapture(capture, capture.story.id, sfFont);
    }
  }
  const appCaptures = selectedCaptures.filter(capture => !isWebCapture(capture));
  if (appCaptures.length === 0) return;

  const selected = appCaptures.map((capture) => ({
    capture,
    entry: findCatalogEntry(catalog, capture.fixtureKey),
    inputHash: staticInputHash(capture),
  }));
  for (const item of selected) {
    if (!item.entry) {
      fail("Marketing app screenshot export failed.", [
        `${item.capture.id}: fixtureKey ${item.capture.fixtureKey} has no capture catalog entry.`,
      ]);
    }
  }

  // Each capture renders alone, with coverage, so its provenance records the
  // files that render executed. Only a successful, complete render of that
  // capture produces the list; any failure stops before stamping.
  const coverageDir = fromRepo(path.join(rawOutputDir, "coverage"));
  for (const {capture, entry, inputHash} of selected) {
    fs.rmSync(fromRepo(path.join(rawOutputDir, entry.id)), {recursive: true, force: true});
    const lcovPath = path.join(coverageDir, `${entry.id}.lcov`);
    fs.rmSync(lcovPath, {force: true});
    let result = spawnSync(
      "node",
      [
        "tool/ui_capture/run_captures.mjs",
        "--ids",
        entry.id,
        "--output-dir",
        rawOutputDir,
        "--device",
        capture.device,
        "--pixel-ratio",
        String(deviceFrameSpec(capture.device).outputScale),
        "--platform",
        "ios",
        "--sf-font",
        sfFont,
        "--coverage-path",
        lcovPath,
      ],
      {cwd: repoRoot, stdio: "inherit"}
    );
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
    if (!fs.existsSync(lcovPath)) {
      fail("Marketing app screenshot export failed.", [`${capture.id}: the render wrote no coverage report.`]);
    }
    const executedFiles = executedFilesFromLcov(fs.readFileSync(lcovPath, "utf8"));
    const inputPath = path.join(rawOutputDir, entry.id, "light.png");
    fs.rmSync(fromRepo(capture.sourcePath), {force: true});
    result = spawnSync(
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
    if (staticInputHash(capture) !== inputHash) {
      fail("Capture inputs changed during rendering.", ["Rerun the exporter from a stable source tree."]);
    }
    stampCapture(capture, entry.id, sfFont, {executedFiles});
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

    if (isWebCapture(capture)) {
      errors.push(...validateWebRecipe(capture));
      if (requireSources) {
        errors.push(...(fs.existsSync(fromRepo(capture.sourcePath))
          ? validateCapture(capture, capture.story?.id)
          : [`${capture.id}: sourcePath is missing at ${capture.sourcePath}; run node tool/marketing/export_app_screenshots.mjs --update.`]));
      }
      continue;
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

    errors.push(...validateEntryPlacement(capture, entry, catalog));

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

// A marketing entry lives alone in entries/<id>.dart, which is that capture's
// render-input root, and the index resolves the id to that file's entry
// lazily. The index itself is not a render input, so this check is what binds
// it to the hashed entry.
function validateEntryPlacement(capture, entry, catalog) {
  const expected = captureEntryPath(entry.id);
  if (entry.file !== expected) {
    return [`${capture.id}: catalog entry ${entry.id} must be declared in ${expected}, not ${entry.file}.`];
  }
  const errors = [];
  const declared = catalog.filter(other => other.file === expected);
  if (declared.length !== 1) errors.push(`${capture.id}: ${expected} must declare exactly one ScreenCaptureEntry.`);
  const variable = catalog.sources.get(expected).match(/^final\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*ScreenCaptureEntry\(/mu)?.[1];
  const index = catalog.sources.get(captureCatalogIndex);
  const mapping = new RegExp(`^\\s*'${entry.id}':\\s*\\(\\)\\s*=>\\s*${variable}\\s*,`, "mu");
  if (!variable || !mapping.test(index) || !index.includes(`import 'entries/${entry.id}.dart';`)) {
    errors.push(`${capture.id}: ${captureCatalogIndex} marketingScreenCaptures must map '${entry.id}' to the entry declared in ${expected}.`);
  }
  return errors;
}

// A web capture names the story it renders and the address Safari shows.
function validateWebRecipe(capture) {
  const errors = [];
  const {file, id} = capture.story ?? {};
  if (typeof file !== "string" || !/^website\/src\/stories\/[A-Za-z0-9]+\.stories\.tsx$/u.test(file) || !fs.existsSync(fromRepo(file))) {
    errors.push(`${capture.id}: story.file must be an existing website/src/stories/*.stories.tsx file.`);
  }
  if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    errors.push(`${capture.id}: story.id must be a Storybook story id.`);
  }
  if (typeof capture.address !== "string" || !/^catchdates\.com$/u.test(capture.address)) {
    errors.push(`${capture.id}: address must be the host Safari shows, catchdates.com.`);
  }
  const routes = JSON.parse(fs.readFileSync(fromRepo("design/website/routes.json"), "utf8")).routes ?? [];
  if (!routes.some(route => route.id === capture.routeId)) {
    errors.push(`${capture.id}: routeId must name a route in design/website/routes.json.`);
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
    const web = isWebCapture(manifestCapture);
    for (const field of ["type", "id", "status", "audience", "surface", web ? "address" : "fixtureKey", "captureId"]) {
      if (typeof capture[field] !== "string" || capture[field].length === 0) {
        errors.push(`${prefix}: ${field} must be a non-empty string.`);
      }
    }
    if (capture.type !== (web ? "marketing-web-capture" : "marketing-app-capture")) {
      errors.push(`${prefix}: type must be ${web ? "marketing-web-capture" : "marketing-app-capture"}.`);
    }
    if (!Array.isArray(capture.routeIds) || capture.routeIds.length === 0) {
      errors.push(`${prefix}: routeIds must be a non-empty array.`);
    }
    for (const routeId of capture.routeIds ?? []) {
      if (typeof routeId !== "string" || routeId.length === 0) {
        errors.push(`${prefix}: routeIds must contain only non-empty strings.`);
      }
    }
    const catalogEntry = web ? null : findCatalogEntry(catalog, manifestCapture.fixtureKey);
    if (web && capture.captureId !== manifestCapture.story?.id) {
      errors.push(`${prefix}: captureId must match story ${manifestCapture.story?.id}.`);
    }
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
    catalog: parseCaptureCatalog(readCaptureCatalogFiles()),
  };
}

function findCatalogEntry(catalog, fixtureKey) {
  return catalog.find((entry) => entry.marketingFixtureKeys.includes(fixtureKey)) ?? null;
}

function parseCaptureCatalog(files) {
  const entries = [];
  entries.sources = new Map(files.map(file => [file.path, file.source]));
  for (const {path: file, source} of files) for (const block of extractCallBlocks(source, "ScreenCaptureEntry")) {
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
      file,
      routeIds: parseStringList(routeIdsBlock),
      marketingFixtureKeys: parseStringList(marketingBlock),
      device: deviceIdFromToken(deviceToken),
    });
  }
  return entries;
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
