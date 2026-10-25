#!/usr/bin/env node
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import {chromium} from "playwright";
import {PNG} from "pngjs";
import {fromRepo} from "../lib/repo_paths.mjs";

const args = parseArgs(process.argv.slice(2));
const captureConcurrency = args.concurrency;
if (args.help) {
  printHelp();
  process.exit(0);
}
if (args.selfTest) {
  await runSelfTest();
  process.exit(0);
}
if (args.browserSelfTest) {
  await runBrowserSelfTest();
  process.exit(0);
}

const surfaceConfig = {
  admin: {
    registry: "design/admin/components.json",
    defaultStorybook: "admin/storybook-static",
    preview: (component) => component.preview,
  },
  website: {
    registry: "design/website/components.json",
    defaultStorybook: "website/storybook-static",
    preview: (component) => component.storybook,
  },
  // @catch/web-ui stories are the React implementation records of the
  // component registry.
  webui: {
    registry: "design/components/catch.components.json",
    defaultStorybook: "website/storybook-static",
    preview: (component) => component.react?.storybook,
  },
};
const config = surfaceConfig[args.surface];
if (!config) fail(`Unknown surface: ${args.surface}`);

const storybookRoot = fromRepo(args.storybook ?? config.defaultStorybook);
const indexPath = path.join(storybookRoot, "index.json");
if (!fs.existsSync(indexPath)) {
  fail(`Built Storybook index not found: ${path.relative(fromRepo("."), indexPath)}`);
}

const registry = readJson(fromRepo(config.registry));
const storyIndex = readJson(indexPath);
const allReadyStories = readyStories(registry, config.preview);
let expectedStories;
try {
  expectedStories = selectStories(allReadyStories, args.components);
} catch (error) {
  fail(error.message);
}
const resolvedStories = resolveStories(expectedStories, storyIndex.entries ?? {});

const thresholdsPath = fromRepo("tool/web/storybook_visual_thresholds.json");
let thresholdOverrides = new Map();
try {
  thresholdOverrides = fs.existsSync(thresholdsPath)
    ? parseThresholdOverrides(readJson(thresholdsPath))
    : new Map();
} catch (error) {
  fail(error.message);
}
const knownStoryIds = new Set(
  resolveStories(allReadyStories, storyIndex.entries ?? {}).map((story) => story.id)
);
thresholdOverrides = thresholdsForSurface(thresholdOverrides, args.surface);
const unusedOverrides = [...thresholdOverrides.keys()].filter((id) => !knownStoryIds.has(id));
if (unusedOverrides.length > 0) {
  fail(`storybook_visual_thresholds.json lists unknown ready-story id(s): ${unusedOverrides.join(", ")}`);
}
// Report mode lists changed, missing and stale baselines instead of failing;
// a story that cannot render still fails.
const failures = [];
const changes = [];
const recordChange = (capture, detail, message = `${capture}: ${detail}`) => {
  if (args.report) changes.push({capture, detail});
  else failures.push(message);
};
const expiredOverrides = expiredThresholdOverrides(thresholdOverrides, currentDateKey());
if (expiredOverrides.length > 0) {
  const message =
    "Expired visual threshold override(s): " +
    expiredOverrides.map(([id, entry]) => `${id} (expired ${entry.expires})`).join(", ") +
    "; renew or remove them in tool/web/storybook_visual_thresholds.json.";
  if (!args.report) fail(message);
  console.warn(message);
}
const viewports = [
  {name: "desktop", width: 1280, height: 800},
  {name: "mobile", width: 375, height: 812},
];
const capturePlatform = process.platform;
const baselineRoot = fromRepo(platformCapturePath("design/visual_baselines", args.surface, capturePlatform));
const diffRoot = fromRepo(platformCapturePath("artifacts/visual-diffs", args.surface, capturePlatform));
const actualRoot = fromRepo(platformCapturePath("artifacts/visual-actuals", args.surface, capturePlatform));
fs.mkdirSync(baselineRoot, {recursive: true});
fs.rmSync(diffRoot, {recursive: true, force: true});
fs.rmSync(actualRoot, {recursive: true, force: true});
fs.mkdirSync(diffRoot, {recursive: true});
fs.mkdirSync(actualRoot, {recursive: true});

const server = await startServer(storybookRoot);
const browser = await chromium.launch({headless: true});
const jobs = resolvedStories.flatMap((story) =>
  viewports.map((viewport) => ({story, viewport}))
);
const source = {
  head: execFileSync("git", ["rev-parse", "HEAD"], {cwd: fromRepo("."), encoding: "utf8"}).trim(),
  dirty: execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: fromRepo("."), encoding: "utf8",
  }).trim() !== "",
};
if (args.components.length === 0) {
  const expectedFiles = new Set(jobs.map(({story, viewport}) => captureFileName(story, viewport)));
  const staleFiles = fs.readdirSync(baselineRoot)
    .filter((fileName) => fileName.endsWith(".png") && !expectedFiles.has(fileName));
  if (args.update) {
    staleFiles.forEach((fileName) => fs.rmSync(path.join(baselineRoot, fileName)));
  } else {
    staleFiles.forEach((fileName) => recordChange(fileName, "stale baseline"));
  }
}
let completed = 0;

try {
  await runPool(jobs, captureConcurrency, async ({story, viewport}) => {
    const page = await browser.newPage({
      colorScheme: "light",
      reducedMotion: "reduce",
      viewport: {width: viewport.width, height: viewport.height},
    });
    const fileName = captureFileName(story, viewport);
    const actualPath = path.join(actualRoot, fileName);
    const receipt = {source, storyId: story.id, viewport, storybook: args.storybook ?? config.defaultStorybook};
    let actual;
    try {
      await page.addInitScript(installStoryLifecycle, story.id);
      await page.goto(`${server.origin}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector(
        "body.sb-show-main #storybook-root > *, body.sb-show-errordisplay .sb-errordisplay",
        {state: "visible", timeout: 15_000}
      );
      await page.locator(".sb-preparing-story").waitFor({state: "hidden", timeout: 15_000});
      // Mount visibility precedes play; wait through afterEach/reporting before
      // normalizing animations or accepting the final visual state.
      await waitForStoryFinished(page);
      await waitForVisibleImages(page);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.addStyleTag({content: `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition: none !important;
        }
        [data-reveal] {
          opacity: 1 !important;
          transform: none !important;
        }
      `});
      await page.waitForTimeout(40);
      const errorDisplay = page.locator(".sb-errordisplay");
      const storyError = await errorDisplay.isVisible().catch(() => false)
        ? await errorDisplay.textContent()
        : null;
      if (storyError?.trim()) throw new Error(storyError.trim().replace(/\s+/gu, " ").slice(0, 2000));
      await waitForStoryFinished(page);
      const captureSequence = await page.evaluate(() => globalThis.__catchVisualLifecycle.sequence);
      actual = await page.screenshot({animations: "disabled", fullPage: false});
      receipt.capturedAt = new Date().toISOString();
      receipt.lifecycle = await page.evaluate(() => globalThis.__catchVisualLifecycleSnapshot());
      if (!captureMatchesLifecycle(receipt.lifecycle, captureSequence)) throw new Error("Story changed or failed during screenshot");
      const baselinePath = path.join(baselineRoot, fileName);
      if (args.update) {
        fs.writeFileSync(baselinePath, actual);
      } else if (!fs.existsSync(baselinePath)) {
        fs.writeFileSync(actualPath, actual);
        recordChange(`${story.id} (${viewport.name})`, "missing baseline");
      } else {
        const threshold = thresholdOverrides.get(story.id)?.threshold ?? args.threshold;
        const comparison = comparePng(fs.readFileSync(baselinePath), actual, threshold);
        if (!comparison.matches) {
          const diffPath = path.join(diffRoot, fileName);
          fs.writeFileSync(actualPath, actual);
          fs.writeFileSync(diffPath, comparison.diff);
          const detail =
            `${(comparison.ratio * 100).toFixed(3)}% pixels changed ` +
            `(threshold ${(threshold * 100).toFixed(3)}%)`;
          recordChange(
            `${story.id} (${viewport.name})`,
            detail,
            `${story.id} (${viewport.name}): ${detail}; diff ${path.relative(fromRepo("."), diffPath)}`
          );
        }
      }
    } catch (error) {
      failures.push(`${story.id} (${viewport.name}): ${error.message}`);
      receipt.error = error.message;
      await retainFailureCapture(page, actualPath, receipt, actual);
    } finally {
      receipt.lifecycle ??= await page.evaluate(() => globalThis.__catchVisualLifecycle).catch(() => null);
      fs.writeFileSync(`${actualPath}.json`, `${JSON.stringify(receipt, null, 2)}\n`);
      await page.close();
      completed += 1;
      if (completed % 50 === 0 || completed === jobs.length) {
        console.log(`Visual progress: ${completed}/${jobs.length}`);
      }
    }
  });
} finally {
  await browser.close();
  await server.close();
}

if (args.report) {
  const report = visualReportMarkdown(args.surface, changes, jobs.length);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  // Only ever set true, so a later surface in the same step cannot clear it.
  if (process.env.GITHUB_OUTPUT && changes.length > 0) fs.appendFileSync(process.env.GITHUB_OUTPUT, "has_changes=true\n");
}

if (failures.length > 0) {
  console.error(`Storybook visual check failed (${failures.length}/${jobs.length} capture(s)):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Storybook visuals ${args.update ? "updated" : args.report ? "reported" : "passed"}: ` +
  `${resolvedStories.length} ready story(s), ${jobs.length} capture(s), ` +
  `surface ${args.surface}, platform ${capturePlatform}.`
);

// Installed before Storybook creates its channel, so fast/no-play stories cannot
// finish between a readiness poll and listener registration. Use the installed
// channel rather than postMessage, which has no parent in a standalone iframe.
function installStoryLifecycle(storyId) {
  const state = {storyId, renderId: null, phase: null, status: null, playPending: false, error: null, sequence: 0, events: []};
  globalThis.__catchVisualLifecycle = state;
  globalThis.__catchVisualLifecycleSnapshot = () => {
    const current = globalThis.__STORYBOOK_PREVIEW__?.currentRender;
    return {...state, successful: !state.error && state.status === "success" && !state.playPending &&
      state.phase === "finished" && current?.id === state.storyId &&
      current.renderId === state.renderId && current.phase === "finished"};
  };
  const record = (event) => {
    state.sequence += 1;
    state.events.push({atMs: performance.now(), ...event});
    if (state.events.length > 200) state.events.shift();
  };
  const attached = new WeakSet();
  let channel = globalThis.__STORYBOOK_ADDONS_CHANNEL__;
  const attach = (next) => {
    try {
      if (!next || typeof next.on !== "function" || attached.has(next)) return;
      attached.add(next);
      // Channel listeners run synchronously. Observer failures must fail our
      // checker without interrupting Storybook's own render/event delivery.
      const on = (type, handler) => next.on(type, (...values) => {
        try { handler(...values); }
        catch (error) { state.sequence += 1; state.error = `Lifecycle observer failed: ${error.message}`; }
      });
      on("storyRenderPhaseChanged", ({storyId: id, renderId, newPhase}) => {
        if (id !== storyId) return;
        state.renderId = renderId;
        state.phase = newPhase;
        state.status = null;
        // An args rerender during play reuses Storybook's renderId and can finish
        // independently. It must not conceal the original pending play function.
        if (newPhase === "playing") state.playPending = true;
        if (["played", "errored"].includes(newPhase)) state.playPending = false;
        record({type: "phase", renderId, phase: newPhase});
        if (["errored", "aborted"].includes(newPhase)) state.error = `Story render ${newPhase}`;
      });
      on("storyFinished", ({storyId: id, status, reporters = []}) => {
        if (id !== storyId) return;
        const current = globalThis.__STORYBOOK_PREVIEW__?.currentRender;
        record({type: "finished", renderId: current?.renderId, status,
          reports: reporters.map((report) => ({type: report.type, status: report.status})).slice(0, 20)});
        // STORY_FINISHED omits renderId in Storybook 10.6. Bind it to the active
        // render and its finished phase; a stale/wrong render cannot admit pixels.
        if (current?.id !== storyId || current.renderId !== state.renderId ||
            state.renderId == null || current.phase !== "finished" || state.phase !== "finished") {
          state.error = "Story finished without a matching active render";
        } else if (status !== "success" || reporters.some((report) => report.status === "failed")) {
          state.error = `Story finished with ${status} status or failed reports`;
        } else {
          state.status = status;
        }
      });
      for (const type of ["storyErrored", "storyThrewException", "playFunctionThrewException", "unhandledErrorsWhilePlaying"]) {
        on(type, () => {
          record({type, renderId: state.renderId});
          state.error = `Storybook emitted ${type}`;
        });
      }
    } catch (error) {
      state.sequence += 1;
      state.error = `Lifecycle observer could not attach: ${error.message}`;
    }
  };
  Object.defineProperty(globalThis, "__STORYBOOK_ADDONS_CHANNEL__", {
    configurable: true,
    enumerable: true,
    get: () => channel,
    set: (next) => { channel = next; attach(next); },
  });
  attach(channel);
}

function storyLifecycleSettled() {
  const state = globalThis.__catchVisualLifecycleSnapshot?.();
  return Boolean(state?.error || state?.successful);
}

function captureMatchesLifecycle(snapshot, sequence) {
  return snapshot?.successful === true && !snapshot.error && snapshot.sequence === sequence;
}

async function waitForStoryFinished(page, timeout = 30_000) {
  await page.waitForFunction(storyLifecycleSettled, undefined, {timeout});
  const error = await page.evaluate(() => globalThis.__catchVisualLifecycle.error);
  if (error) throw new Error(error);
}

async function retainFailureCapture(page, actualPath, receipt, actual) {
  try {
    if (actual) fs.writeFileSync(actualPath, actual);
    else await page.screenshot({path: actualPath, fullPage: false, timeout: 5_000});
    receipt.capturedAt = new Date().toISOString();
  } catch (captureError) {
    receipt.captureError = captureError.message;
  }
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => {
    return visibleImages().every((image) => image.complete);

    function visibleImages() {
      return Array.from(document.images).filter((image) => {
        const bounds = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return bounds.bottom > 0 && bounds.right > 0 &&
          bounds.top < innerHeight && bounds.left < innerWidth &&
          style.display !== "none" && style.visibility !== "hidden";
      });
    }
  }, undefined, {timeout: 15_000});

  await page.evaluate(async () => {
    const images = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return bounds.bottom > 0 && bounds.right > 0 &&
        bounds.top < innerHeight && bounds.left < innerWidth &&
        style.display !== "none" && style.visibility !== "hidden";
    });
    const brokenImages = images.filter((image) => image.naturalWidth === 0);
    if (brokenImages.length > 0) {
      const sources = brokenImages.map((image) => image.currentSrc || image.src || "<missing src>");
      throw new Error(`Visible image failed to load: ${sources.join(", ")}`);
    }
    await Promise.all(images.map((image) => image.decode()));
  });
}

function readyStories(document, previewFor) {
  const stories = [];
  const seen = new Set();
  for (const component of document.components ?? []) {
    const preview = previewFor(component);
    if (preview?.status !== "ready") continue;
    if (!preview.story || !preview.exportName) {
      fail(`${component.id}: ready visual entry needs a story path and export name`);
    }
    const key = `${preview.story}::${preview.exportName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stories.push({componentId: component.id, storyPath: preview.story, exportName: preview.exportName});
  }
  return stories;
}

function selectStories(stories, componentIds) {
  if (componentIds.length === 0) return stories;
  const requested = new Set(componentIds);
  const available = new Set(stories.map((story) => story.componentId));
  const missing = [...requested].filter((componentId) => !available.has(componentId));
  if (missing.length > 0) {
    throw new Error(`Ready visual component not found: ${missing.join(", ")}`);
  }
  return stories.filter((story) => requested.has(story.componentId));
}

function resolveStories(expected, entries) {
  const stories = Object.values(entries).filter((entry) => entry.type === "story");
  return expected.map((item) => {
    const matches = stories.filter((entry) =>
      entry.exportName === item.exportName && pathsMatch(item.storyPath, entry.importPath)
    );
    if (matches.length !== 1) {
      fail(`${item.componentId}: expected one built story for ${item.storyPath}::${item.exportName}, found ${matches.length}`);
    }
    return matches[0];
  });
}

function pathsMatch(expected, actual) {
  const clean = (value) => String(value).replaceAll("\\", "/").replace(/^(?:\.\.\/|\.\/)+/u, "");
  const expectedPath = clean(expected);
  const actualPath = clean(actual);
  return expectedPath.endsWith(actualPath) || actualPath.endsWith(expectedPath) ||
    path.posix.basename(expectedPath) === path.posix.basename(actualPath);
}

function parseThresholdOverrides(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("storybook_visual_thresholds.json must contain an object");
  }
  if (data.version !== 1) {
    throw new Error("storybook_visual_thresholds.json requires \"version\": 1");
  }
  const stories = data.stories ?? {};
  if (stories === null || typeof stories !== "object" || Array.isArray(stories)) {
    throw new Error("storybook_visual_thresholds.json \"stories\" must be an object");
  }
  const overrides = new Map();
  for (const [storyId, entry] of Object.entries(stories)) {
    const label = `threshold override ${storyId}`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label}: entry must be an object`);
    }
    const extra = Object.keys(entry).filter((key) => !["surface", "threshold", "reason", "expires"].includes(key));
    if (extra.length > 0) {
      throw new Error(`${label}: unsupported field(s) ${extra.join(", ")}`);
    }
    const {surface, threshold, reason, expires} = entry;
    if (!["admin", "website", "webui"].includes(surface)) {
      throw new Error(`${label}: surface must be admin, website, or webui`);
    }
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error(`${label}: threshold must be a number in (0, 1]`);
    }
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new Error(`${label}: reason must be a non-empty string`);
    }
    if (typeof expires !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(expires) ||
        !Number.isFinite(Date.parse(expires)) || new Date(expires).toISOString().slice(0, 10) !== expires) {
      throw new Error(`${label}: expires must be a YYYY-MM-DD date`);
    }
    overrides.set(storyId, {surface, threshold, reason, expires});
  }
  return overrides;
}

function thresholdsForSurface(overrides, surface) {
  return new Map([...overrides].filter(([, entry]) => entry.surface === surface));
}

function currentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function expiredThresholdOverrides(overrides, today) {
  return [...overrides.entries()].filter(([, entry]) => entry.expires !== undefined && entry.expires < today);
}

function comparePng(expectedBuffer, actualBuffer, ratioThreshold) {
  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {matches: false, ratio: 1, diff: actualBuffer};
  }
  const diff = new PNG({width: actual.width, height: actual.height});
  let changed = 0;
  const pixelCount = actual.width * actual.height;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    const delta = Math.max(
      Math.abs(expected.data[offset] - actual.data[offset]),
      Math.abs(expected.data[offset + 1] - actual.data[offset + 1]),
      Math.abs(expected.data[offset + 2] - actual.data[offset + 2]),
      Math.abs(expected.data[offset + 3] - actual.data[offset + 3])
    );
    if (delta > 24) {
      changed += 1;
      diff.data.set([255, 0, 128, 255], offset);
    } else {
      const gray = Math.round((actual.data[offset] + actual.data[offset + 1] + actual.data[offset + 2]) / 3);
      diff.data.set([gray, gray, gray, 110], offset);
    }
  }
  const ratio = changed / pixelCount;
  return {matches: ratio <= ratioThreshold, ratio, diff: PNG.sync.write(diff)};
}

function visualReportMarkdown(surface, changes, captureCount) {
  const heading = `### Storybook visual changes: ${surface}`;
  if (changes.length === 0) return `${heading}\n\nNo visual changes across ${captureCount} capture(s).\n`;
  const escape = (value) => String(value).replaceAll("|", "\\|");
  return [
    heading,
    "",
    `${changes.length} of ${captureCount} capture(s) differ from their baselines. ` +
      "Report only: nothing here blocks the merge. Diff images are in this run's visual diagnostics artifact.",
    "",
    "| Capture | Change |",
    "|---|---|",
    ...changes.map(({capture, detail}) => `| \`${escape(capture)}\` | ${escape(detail)} |`),
    "",
  ].join("\n");
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }));
}

async function startServer(root) {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    let filePath = path.join(root, requestPath);
    if (requestPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end("Not found");
      return;
    }
    const extension = path.extname(filePath);
    const contentTypes = {
      ".css": "text/css",
      ".html": "text/html",
      ".js": "text/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    };
    response.setHeader("Content-Type", contentTypes[extension] ?? "application/octet-stream");
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function sanitize(value) {
  return String(value).replace(/[^a-z0-9_.-]+/giu, "-");
}

function captureFileName(story, viewport) {
  return `${sanitize(story.id)}.${viewport.name}.png`;
}

function platformCapturePath(root, surface, platform) {
  return path.posix.join(root, surface, platform);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function captureWorkerCount(surface, override = null) {
  const concurrency = override ?? (surface === "admin" ? 2 : 1);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) {
    throw new Error("--concurrency must be 1 or 2");
  }
  return concurrency;
}

function parseArgs(argv) {
  const parsed = {
    components: [],
    browserSelfTest: false,
    concurrency: null,
    help: false,
    selfTest: false,
    storybook: null,
    surface: "website",
    report: false,
    threshold: 0.001,
    update: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--self-test-browser") parsed.browserSelfTest = true;
    else if (arg === "--update") parsed.update = true;
    else if (arg === "--check") {}
    else if (arg === "--report") parsed.report = true;
    else if (arg === "--component") parsed.components.push(requiredValue(argv, ++index, arg));
    else if (arg === "--surface") parsed.surface = requiredValue(argv, ++index, arg);
    else if (arg === "--storybook") parsed.storybook = requiredValue(argv, ++index, arg);
    else if (arg === "--concurrency") parsed.concurrency = Number(requiredValue(argv, ++index, arg));
    else if (arg === "--threshold") parsed.threshold = Number(requiredValue(argv, ++index, arg));
    else fail(`Unknown argument: ${arg}`);
  }
  if (parsed.report && parsed.update) fail("--report and --update cannot be combined");
  if (!Number.isFinite(parsed.threshold) || parsed.threshold < 0 || parsed.threshold > 1) {
    fail("--threshold must be between 0 and 1");
  }
  try {
    parsed.concurrency = captureWorkerCount(parsed.surface, parsed.concurrency);
  } catch (error) {
    fail(error.message);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value`);
  return value;
}

function runLifecycleSelfTest() {
  const harness = () => {
    const context = vm.createContext({performance});
    vm.runInContext(`(${installStoryLifecycle})("requested")`, context);
    const listeners = new Map();
    const channel = {on: (type, handler) => {
      const entries = listeners.get(type) ?? [];
      entries.push(handler);
      listeners.set(type, entries);
    }};
    context.__STORYBOOK_ADDONS_CHANNEL__ = channel;
    context.__STORYBOOK_ADDONS_CHANNEL__ = channel;
    assert.equal(listeners.get("storyFinished").length, 1, "reattaching must not duplicate listeners");
    const current = {id: "requested", renderId: 1, phase: "preparing"};
    context.__STORYBOOK_PREVIEW__ = {currentRender: current};
    const emit = (type, payload) => listeners.get(type)?.forEach((handler) => handler(payload));
    const phase = (newPhase) => {
      current.phase = newPhase;
      emit("storyRenderPhaseChanged", {storyId: current.id, renderId: current.renderId, newPhase});
    };
    return {context, current, emit, phase,
      finish: (patch = {}) => emit("storyFinished", {storyId: "requested", status: "success", ...patch}),
      settled: () => vm.runInContext(`(${storyLifecycleSettled})()`, context),
      state: context.__catchVisualLifecycle};
  };
  const delayed = harness();
  for (const phase of ["preparing", "loading", "rendering", "playing", "played", "completing", "completed", "afterEach", "finished"]) {
    delayed.phase(phase);
    assert.equal(delayed.settled(), false, `${phase} alone cannot admit a screenshot`);
  }
  delayed.finish({storyId: "another-story"});
  assert.equal(delayed.settled(), false, "wrong-story completion cannot admit pixels");
  delayed.finish();
  assert.equal(delayed.settled(), true);
  assert.equal(delayed.state.error, null);
  const accepted = delayed.context.__catchVisualLifecycleSnapshot();
  assert.equal(captureMatchesLifecycle(accepted, accepted.sequence), true);
  delayed.emit("playFunctionThrewException", {});
  assert.equal(captureMatchesLifecycle(delayed.context.__catchVisualLifecycleSnapshot(), accepted.sequence), false,
    "a late failure must reject the atomic capture receipt");
  const newlyRendering = harness();
  newlyRendering.phase("finished"); newlyRendering.finish();
  const priorSequence = newlyRendering.state.sequence;
  newlyRendering.phase("rendering");
  assert.equal(captureMatchesLifecycle(newlyRendering.context.__catchVisualLifecycleSnapshot(), priorSequence), false);
  const changed = harness();
  changed.phase("finished"); changed.finish();
  const changedSequence = changed.state.sequence;
  changed.emit("storyRenderPhaseChanged", null);
  assert.equal(captureMatchesLifecycle(changed.context.__catchVisualLifecycleSnapshot(), changedSequence), false,
    "observer failure after capture must also invalidate its sequence");
  const reset = harness();
  reset.phase("finished"); reset.finish();
  reset.phase("rendering");
  assert.equal(reset.settled(), false, "a new render phase invalidates prior success");
  const noPlay = harness();
  for (const phase of ["preparing", "loading", "rendering", "completing", "completed", "afterEach", "finished"]) noPlay.phase(phase);
  noPlay.finish();
  assert.equal(noPlay.settled(), true, "stories without play still finish normally");
  const rerender = harness();
  for (const phase of ["rendering", "playing", "rendering", "completed", "afterEach", "finished"]) rerender.phase(phase);
  rerender.finish();
  assert.equal(rerender.settled(), false, "same-render args updates cannot conceal pending play");
  for (const phase of ["played", "completed", "afterEach", "finished"]) rerender.phase(phase);
  rerender.finish();
  assert.equal(rerender.settled(), true);
  for (const patch of [{status: "error"}, {status: "unknown"}, {reporters: [{status: "failed"}]}, {reporters: null}]) {
    const failed = harness();
    failed.phase("finished");
    failed.finish(patch);
    assert.ok(failed.state.error, "failed or malformed completion must fail closed");
  }
  for (const phase of ["errored", "aborted"]) {
    const failed = harness();
    failed.phase(phase);
    failed.phase("finished");
    failed.finish();
    assert.ok(failed.state.error, "later success cannot erase an observed render failure");
  }
  for (const type of ["storyErrored", "storyThrewException", "playFunctionThrewException", "unhandledErrorsWhilePlaying"]) {
    const failed = harness();
    failed.emit(type, {});
    assert.ok(failed.state.error);
  }
  for (const patch of [{id: "other"}, {renderId: 2}, {phase: "playing"}]) {
    const stale = harness();
    stale.phase("finished");
    Object.assign(stale.current, patch);
    stale.finish();
    assert.ok(stale.state.error, "stale/mismatched render completion must fail closed");
  }
  const missingPhase = harness();
  missingPhase.finish();
  assert.ok(missingPhase.state.error, "completion without observed render identity must fail closed");
  const malformed = harness();
  assert.doesNotThrow(() => malformed.emit("storyRenderPhaseChanged", null));
  assert.match(malformed.state.error, /observer failed/u);
}

async function runBrowserSelfTest() {
  const outputRoot = fromRepo("artifacts/visual-actuals/lifecycle-self-test");
  fs.mkdirSync(outputRoot, {recursive: true});
  const output = fs.mkdtempSync(path.join(outputRoot, "run-"));
  const browser = await chromium.launch({headless: true});
  try {
    for (const viewport of [{name: "desktop", width: 1280, height: 800}, {name: "mobile", width: 375, height: 812}]) {
      const page = await browser.newPage({viewport: {width: viewport.width, height: viewport.height}});
      try {
        await page.addInitScript(installStoryLifecycle, "requested");
        await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><body class="sb-show-main" style="margin:0;background:white"><div id="storybook-root"><div>Closed</div></div><script>
          const listeners = new Map();
          const channel = {on(type, listener) { const items = listeners.get(type) || []; items.push(listener); listeners.set(type, items); }, emit(type, payload) { for (const listener of listeners.get(type) || []) listener(payload); }};
          globalThis.__STORYBOOK_ADDONS_CHANNEL__ = channel;
          const current = {id: "requested", renderId: 1, phase: "preparing"};
          globalThis.__STORYBOOK_PREVIEW__ = {currentRender: current};
          globalThis.phase = (newPhase) => { current.phase = newPhase; channel.emit("storyRenderPhaseChanged", {storyId: current.id, renderId: current.renderId, newPhase}); };
          globalThis.finish = (status = "success") => { phase("finished"); channel.emit("storyFinished", {storyId: current.id, status, reporters: []}); };
          phase("rendering"); phase("playing");
          document.body.style.background = "#171717";
          document.querySelector("#storybook-root").innerHTML = "<div>Open menu during delayed play</div>";
        </script>`)}`);
        // These are the old readiness conditions, deliberately true mid-play.
        await page.waitForSelector("body.sb-show-main #storybook-root > *", {state: "visible"});
        await page.locator(".sb-preparing-story").waitFor({state: "hidden"});
        const during = await page.screenshot({path: path.join(output, `${viewport.name}.playing.png`)});
        await assert.rejects(waitForStoryFinished(page, 100), /Timeout/u);
        const timeoutReceipt = {};
        const timeoutPath = path.join(output, `${viewport.name}.timeout.png`);
        await retainFailureCapture(page, timeoutPath, timeoutReceipt);
        assert.ok(timeoutReceipt.capturedAt);
        assert.equal(comparePng(during, fs.readFileSync(timeoutPath), 0.001).matches, true);
        await page.evaluate(() => { phase("completed"); phase("afterEach"); });
        await assert.rejects(waitForStoryFinished(page, 100), /Timeout/u);
        await page.evaluate(() => { phase("rendering"); finish(); });
        await assert.rejects(waitForStoryFinished(page, 100), /Timeout/u);
        await page.evaluate(() => {
          document.body.style.background = "white";
          document.querySelector("#storybook-root").innerHTML = "<div>Closed</div>";
          phase("played"); finish();
        });
        await waitForStoryFinished(page, 1_000);
        const after = await page.screenshot({path: path.join(output, `${viewport.name}.finished.png`)});
        assert.equal(comparePng(during, after, 0.001).matches, false, "mid-play pixels must differ from final pixels");
        assert.equal(comparePng(after, await page.screenshot(), 0.001).matches, true);
        await page.evaluate(() => { phase("playing"); finish("error"); });
        await assert.rejects(waitForStoryFinished(page, 1_000), /error status/u);
        const failedReceipt = {};
        const failedPath = path.join(output, `${viewport.name}.error.png`);
        await retainFailureCapture(page, failedPath, failedReceipt, after);
        assert.ok(failedReceipt.capturedAt);
        assert.deepEqual(fs.readFileSync(failedPath), after, "rejected captured pixels must be retained unchanged");
        fs.writeFileSync(path.join(output, `${viewport.name}.json`), JSON.stringify({
          viewport, lifecycle: await page.evaluate(() => globalThis.__catchVisualLifecycle),
        }, null, 2));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Storybook lifecycle browser controls passed (desktop/mobile); evidence ${path.relative(fromRepo("."), output)}.`);
}

async function runSelfTest() {
  runLifecycleSelfTest();
  const first = new PNG({width: 2, height: 1});
  first.data.set([10, 10, 10, 255, 20, 20, 20, 255]);
  const same = comparePng(PNG.sync.write(first), PNG.sync.write(first), 0);
  assert.equal(same.matches, true);
  const second = new PNG({width: 2, height: 1});
  second.data.set([10, 10, 10, 255, 255, 255, 255, 255]);
  const changed = comparePng(PNG.sync.write(first), PNG.sync.write(second), 0.1);
  assert.equal(changed.matches, false);
  assert.equal(changed.ratio, 0.5);
  assert.equal(
    platformCapturePath("design/visual_baselines", "admin", "darwin"),
    "design/visual_baselines/admin/darwin"
  );
  assert.notEqual(
    platformCapturePath("design/visual_baselines", "admin", "darwin"),
    platformCapturePath("design/visual_baselines", "admin", "linux")
  );
  assert.equal(
    captureFileName({id: "Admin/Role management"}, {name: "desktop"}),
    "Admin-Role-management.desktop.png"
  );
  const stories = [
    {componentId: "one", exportName: "One", storyPath: "One.stories.tsx"},
    {componentId: "two", exportName: "Two", storyPath: "Two.stories.tsx"},
  ];
  assert.deepEqual(selectStories(stories, ["two"]), [stories[1]]);
  assert.throws(() => selectStories(stories, ["missing"]), /Ready visual component not found: missing/u);
  assert.equal(parseArgs(["--surface", "admin"]).report, false);
  assert.equal(parseArgs(["--surface", "admin", "--report"]).report, true);
  assert.match(visualReportMarkdown("website", [], 4), /No visual changes across 4 capture\(s\)/u);
  const report = visualReportMarkdown("website", [
    {capture: "story-a (mobile)", detail: "0.349% pixels changed (threshold 0.100%)"},
    {capture: "a|b.desktop.png", detail: "stale baseline"},
  ], 182);
  assert.match(report, /^### Storybook visual changes: website$/mu);
  assert.match(report, /2 of 182 capture\(s\) differ from their baselines\. Report only/u);
  assert.match(report, /^\| `story-a \(mobile\)` \| 0\.349% pixels changed \(threshold 0\.100%\) \|$/mu);
  assert.match(report, /^\| `a\\\|b\.desktop\.png` \| stale baseline \|$/mu);
  assert.equal(parseArgs(["--surface", "admin"]).concurrency, 2);
  assert.equal(parseArgs(["--surface", "website"]).concurrency, 1);
  assert.equal(parseArgs(["--surface", "webui"]).concurrency, 1);
  assert.equal(parseArgs(["--surface", "admin", "--concurrency", "1"]).concurrency, 1);
  assert.equal(parseArgs(["--concurrency", "2", "--surface", "website"]).concurrency, 2);
  for (const invalid of [0, -1, 3, 1.5, NaN, Infinity]) {
    assert.throws(() => captureWorkerCount("admin", invalid), /--concurrency must be 1 or 2/u);
  }
  for (const concurrency of [1, 2]) {
    const jobs = [0, 1, 2, 3, 4, 5, 6];
    const captured = [];
    let active = 0;
    let peakActive = 0;
    await runPool(jobs, concurrency, async (job) => {
      active += 1;
      peakActive = Math.max(peakActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      captured.push(job);
      active -= 1;
    });
    assert.equal(peakActive, concurrency, "capture pool must respect the worker limit");
    assert.equal(active, 0, "all captures must finish before the pool resolves");
    assert.deepEqual(captured.sort((a, b) => a - b), jobs, "every capture must run exactly once");
  }
  await runPool([], 2, () => assert.fail("an empty capture pool must not invoke a worker"));
  const singleCapture = [];
  await runPool(["only"], 2, async (job) => singleCapture.push(job));
  assert.deepEqual(singleCapture, ["only"]);
  const captureFailure = new Error("capture failed");
  await assert.rejects(
    runPool(["success", "failure"], 2, async (job) => {
      if (job === "failure") throw captureFailure;
    }),
    (error) => error === captureFailure,
    "worker failure must reject the capture pool"
  );
  const overrides = parseThresholdOverrides({
    version: 1,
    stories: {
      "story-a": {surface: "admin", threshold: 0.003, reason: "subpixel drift", expires: "2099-01-01"},
      "story-b": {surface: "website", threshold: 0.5, reason: "kept", expires: "2099-02-01"},
    },
  });
  assert.equal(overrides.get("story-a").threshold, 0.003);
  assert.equal(overrides.get("story-b").threshold, 0.5);
  assert.deepEqual(parseThresholdOverrides({version: 1}), new Map());
  for (const patch of [{surface: "typo"}, {expires: undefined}, {expires: "2099-02-30"}]) {
    assert.throws(() => parseThresholdOverrides({version: 1, stories: {
      a: {surface: "admin", threshold: 0.003, reason: "evidence", expires: "2099-01-01", ...patch},
    }}));
  }
  assert.deepEqual([...thresholdsForSurface(overrides, "webui")], []);
  assert.deepEqual([...thresholdsForSurface(overrides, "website").keys()], ["story-b"]);
  for (const bad of [
    null, [], "x",
    {version: 2, stories: {}},
    {version: 1, stories: []},
    {version: 1, stories: {a: null}},
    {version: 1, stories: {a: {threshold: 0}}},
    {version: 1, stories: {a: {threshold: 1.5}}},
    {version: 1, stories: {a: {threshold: "0.1"}}},
    {version: 1, stories: {a: {threshold: 0.5}}},
    {version: 1, stories: {a: {threshold: 0.5, reason: ""}}},
    {version: 1, stories: {a: {threshold: 0.5, expires: "soon"}}},
    {version: 1, stories: {a: {threshold: 0.5, extra: true}}},
  ]) {
    if (bad?.stories?.a && typeof bad.stories.a === "object") {
      bad.stories.a = {surface: "admin", expires: "2099-01-01", ...bad.stories.a};
    }
    assert.throws(() => parseThresholdOverrides(bad), Error);
  }
  assert.deepEqual(
    expiredThresholdOverrides(overrides, "2099-01-02").map(([id]) => id),
    ["story-a"]
  );
  assert.deepEqual(expiredThresholdOverrides(overrides, "2099-01-01"), []);
  console.log("Storybook visual checker self-test passed.");
}

function printHelp() {
  console.log(`Usage: node tool/web/check_storybook_visuals.mjs [options]

Options:
  --surface website|admin|webui  Registry surface to capture.
  --storybook <path>             Built Storybook directory.
  --component <registry-id>      Limit to one ready registry component; repeatable.
  --update                       Write committed baselines for the current platform.
  --check                        Compare against current-platform baselines (default).
  --report                       Compare, but list changed, missing and stale baselines in
                                 the output (and GITHUB_STEP_SUMMARY) instead of failing.
                                 Stories that cannot render still fail.
  --threshold <ratio>            Maximum changed-pixel ratio (default 0.001).
  --concurrency <1|2>            Capture workers (default: admin 2, website/webui 1).
  --self-test                    Run lifecycle, pixel-comparison and scheduler proofs.
  --self-test-browser            Run isolated browser lifecycle/pixel controls.

Per-story overrides live in tool/web/storybook_visual_thresholds.json:
{"version": 1, "stories": {"<story-id>": {"surface": "admin|website|webui", "threshold": <ratio>, "reason": "...", "expires": "YYYY-MM-DD"}}}
Overrides apply only to the named surface, cover both viewports, and must reference a
registry-ready story, and fail the check once their expires date passes (report mode
only warns).
`);
}

function fail(message) {
  console.error(message);
  process.exit(64);
}
