// Renders website pages as iPhone Safari captures: a built Storybook story in
// WebKit with Playwright's iPhone 17 Pro descriptor, in Asia/Kolkata time,
// composed with Safari's status and address bars, then framed by the same
// bezel as the app captures. export_app_screenshots.mjs --update calls this
// for manifest entries of kind web-capture and stamps their provenance.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {safariScreen, safariScreenHtml, safariViewport} from "./web_capture_screen.mjs";

const defaultStorybook = "website/storybook-static";
const rawOutputDir = "artifacts/marketing/app-screenshots/raw/web";
const device = "iPhone 17 Pro";

/**
 * Renders each capture's story to its sourcePath. `storybook` is a built
 * website Storybook; `playwrightDir` holds the pinned Playwright package when
 * the repository's own node_modules aren't installed (the macOS render job).
 */
export async function renderWebCaptures(captures, {storybook = defaultStorybook, playwrightDir} = {}) {
  const root = path.resolve(repoRoot, storybook);
  const index = readStoryIndex(root);
  for (const capture of captures) assertStory(index, capture);
  const {webkit, devices} = await loadPlaywright(playwrightDir);
  const server = await serveDirectory(root);
  const browser = await webkit.launch({headless: true});
  try {
    for (const capture of captures) {
      const raw = fromRepo(path.join(rawOutputDir, `${capture.id}.png`));
      fs.mkdirSync(path.dirname(raw), {recursive: true});
      const page = await renderStory(browser, devices[device], server.origin, capture.story.id);
      fs.writeFileSync(raw, await composeSafariScreen(browser, page, capture.address));
      frame(raw, capture.sourcePath);
      console.log(`Rendered ${capture.id} from ${capture.story.id}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

function readStoryIndex(root) {
  const indexPath = path.join(root, "index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Built Storybook not found at ${root}; run npm --workspace website run build:storybook.`);
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf8")).entries ?? {};
}

// The built story must come from the file the input hash covered.
function assertStory(index, capture) {
  const entry = index[capture.story.id];
  const importPath = entry?.importPath ? path.posix.normalize(path.posix.join("website", entry.importPath)) : null;
  if (entry?.type !== "story" || importPath !== capture.story.file) {
    throw new Error(`${capture.id}: story ${capture.story.id} is not built from ${capture.story.file}.`);
  }
}

async function loadPlaywright(playwrightDir) {
  if (!playwrightDir) return import("playwright");
  const entry = path.join(path.resolve(playwrightDir), "node_modules", "playwright", "index.mjs");
  return import(pathToFileURL(entry).href);
}

async function renderStory(browser, descriptor, origin, storyId) {
  if (!descriptor) throw new Error(`Playwright has no ${device} descriptor.`);
  const context = await browser.newContext({
    ...descriptor,
    viewport: safariViewport,
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`, {waitUntil: "networkidle"});
    await page.waitForSelector("body.sb-show-main #storybook-root > *, body.sb-show-errordisplay .sb-errordisplay",
      {state: "visible", timeout: 30_000});
    await page.locator(".sb-preparing-story").waitFor({state: "hidden", timeout: 30_000});
    const errorDisplay = page.locator(".sb-errordisplay");
    const error = await errorDisplay.isVisible() ? await errorDisplay.textContent() : null;
    if (error?.trim()) throw new Error(`${storyId}: ${error.trim().replace(/\s+/gu, " ").slice(0, 500)}`);
    await page.addStyleTag({content: "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition: none !important; caret-color: transparent !important; } [data-reveal] { opacity: 1 !important; transform: none !important; }"});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.complete ? null :
        new Promise(done => { image.onload = image.onerror = done; })));
    });
    await page.waitForTimeout(100);
    return await page.screenshot({animations: "disabled", fullPage: false});
  } finally {
    await context.close();
  }
}

async function composeSafariScreen(browser, pagePng, address) {
  const context = await browser.newContext({viewport: {width: safariScreen.width, height: safariScreen.height},
    deviceScaleFactor: safariScreen.scale});
  try {
    const page = await context.newPage();
    await page.setContent(safariScreenHtml({pagePng: pagePng.toString("base64"), address}), {waitUntil: "load"});
    await page.waitForSelector("body[data-ready]", {timeout: 10_000});
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({fullPage: false});
  } finally {
    await context.close();
  }
}

function frame(input, output) {
  fs.mkdirSync(path.dirname(fromRepo(output)), {recursive: true});
  const result = spawnSync("dart", ["run", "tool/marketing/frame_device_capture.dart", "--input", input,
    "--output", output, "--device", "iphone-17-pro"], {cwd: repoRoot, stdio: "inherit"});
  if (result.status !== 0) throw new Error(`Framing ${output} failed.`);
}

function serveDirectory(root) {
  const types = {".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf"};
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {"content-type": types[path.extname(file)] ?? "application/octet-stream"});
    fs.createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1",
    () => resolve({origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close()})));
}
