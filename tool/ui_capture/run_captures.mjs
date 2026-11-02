#!/usr/bin/env node
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";

const args = process.argv.slice(2);
const catalogPath = fromRepo("test/ui_captures/catalog/screen_capture_catalog.dart");
const profile = valueAfter("--profile");
const profileConfig = captureProfile(profile);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const idsArg = valueAfter("--ids");
const ids =
  args.includes("--all") || idsArg === "all" || (!idsArg && profileConfig.allIds)
    ? readCatalogIds().join(",")
    : idsArg ?? "profile_self";
const outputDir = valueAfter("--output-dir") ?? profileConfig.outputDir ?? "artifacts/ui-captures/review";
const deviceId = valueAfter("--device");
const textScale = valueAfter("--text-scale");
const pixelRatio = valueAfter("--pixel-ratio") ?? profileConfig.pixelRatio;
const platform = valueAfter("--platform");
const sfFont = valueAfter("--sf-font");
if (platform && !["ios", "android"].includes(platform)) {
  console.error("--platform must be ios or android.");
  process.exit(64);
}
if (sfFont && (platform !== "ios" || !fs.existsSync(sfFont))) {
  console.error("--sf-font requires --platform ios and an existing local font file.");
  process.exit(64);
}
const outputLayout = valueAfter("--output-layout") ?? profileConfig.outputLayout;
const testPath = "test/ui_captures/capture_runner_test.dart";

const flutterArgs = [
  "test",
  testPath,
  `--dart-define=CAPTURE_IDS=${ids}`,
  `--dart-define=CAPTURE_OUTPUT_DIR=${outputDir}`,
];
if (platform) flutterArgs.push(`--dart-define=CAPTURE_PLATFORM=${platform}`);
if (sfFont) flutterArgs.push(`--dart-define=CAPTURE_SF_FONT=${sfFont}`);
if (deviceId) flutterArgs.push(`--dart-define=CAPTURE_DEVICE_ID=${deviceId}`);
if (textScale) flutterArgs.push(`--dart-define=CAPTURE_TEXT_SCALE=${textScale}`);
if (pixelRatio) flutterArgs.push(`--dart-define=CAPTURE_DPR=${pixelRatio}`);
if (outputLayout) flutterArgs.push(`--dart-define=CAPTURE_OUTPUT_LAYOUT=${outputLayout}`);

console.log(`Rendering UI captures: ${ids}`);
console.log(`Output directory: ${outputDir}`);
if (profile) console.log(`Profile: ${profile}`);
if (deviceId) console.log(`Device override: ${deviceId}`);
if (textScale) console.log(`Text scale: ${textScale}`);
if (pixelRatio) console.log(`Pixel ratio: ${pixelRatio}`);
if (outputLayout) console.log(`Output layout: ${outputLayout}`);

const result = spawnSync("flutter", flutterArgs, {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);

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

function captureProfile(name) {
  if (!name) return {};
  if (name === "design-gallery") {
    return {
      allIds: true,
      outputDir: "build/design_gallery",
      outputLayout: "theme-first",
      pixelRatio: "3.0",
    };
  }
  console.error(`Unknown capture profile: ${name}`);
  process.exit(64);
}

function readCatalogIds() {
  const source = fs.readFileSync(catalogPath, "utf8");
  const ids = [...source.matchAll(/\bScreenCaptureEntry\(\s*id:\s*'([^']+)'/gu)].map(
    (match) => match[1]
  );
  if (ids.length === 0) {
    console.error(`No ScreenCaptureEntry ids found in ${catalogPath}.`);
    process.exit(65);
  }
  return ids;
}

function printHelp() {
  console.log(`Usage: node tool/ui_capture/run_captures.mjs [options]

Options:
  --ids <ids>              Comma-separated capture ids, or "all". Default: profile_self.
  --all                    Render every capture id declared in the catalog.
  --output-dir <path>      Artifact output directory. Default: artifacts/ui-captures/review.
  --device <id>            Override catalog devices, e.g. design-phone or iphone-17-pro.
  --platform <name>        Explicit ios or android widget behavior; otherwise test default.
  --sf-font <path>         Local native iOS font for ios captures (never bundled or copied).
  --text-scale <scale>     MediaQuery text scale, e.g. 1.5 or 2.0.
  --pixel-ratio <scale>    PNG raster scale passed to RenderRepaintBoundary.toImage.
  --output-layout <layout> capture-first (id/theme.png) or theme-first (theme/id.png).
  --profile <name>         Named profile. Use design-gallery for 3x theme-first PNGs in build/design_gallery.

Examples:
  node tool/ui_capture/run_captures.mjs --ids profile_self
  node tool/ui_capture/run_captures.mjs --all
  node tool/ui_capture/run_captures.mjs --ids match_chat_context --device iphone-17-pro
  node tool/ui_capture/run_captures.mjs --ids member_event_discovery --text-scale 2.0
  node tool/ui_capture/run_captures.mjs --profile design-gallery
`);
}
