#!/usr/bin/env node
// Renders website guest pages as iPhone Safari captures: a Storybook story at
// phone width in Asia/Kolkata time, composed with Safari's status and address
// bars, then framed by the same bezel as the app captures.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {PNG} from "pngjs";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {safariScreen, safariScreenHtml, safariViewport} from "./web_capture_screen.mjs";

const defaultStorybook = "website/storybook-static";
const rawOutputDir = "artifacts/marketing/web-captures/raw";

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await runCli(process.argv.slice(2));

async function runCli(args) {
  const value = flag => {
    const index = args.indexOf(flag);
    return index === -1 ? null : args[index + 1];
  };
  if (args[0] !== "--render-story") {
    console.log(`Usage: node tool/marketing/export_web_captures.mjs --render-story --story <story-id> --address <host> --output <png> [--storybook <dir>]

Renders one built Storybook story as a framed iPhone Safari capture.`);
    process.exit(args[0] === "--help" ? 0 : 64);
  }
  const [story, address, output] = [value("--story"), value("--address"), value("--output")];
  if (!story || !address || !output) {
    console.error("--story, --address and --output are required.");
    process.exit(64);
  }
  await renderWebCaptures([{id: path.basename(output, ".png"), story, address, sourcePath: output}], {storybook: value("--storybook") ?? defaultStorybook});
}

/** Renders each capture's story and writes its framed PNG to sourcePath. */
export async function renderWebCaptures(captures, {storybook = defaultStorybook} = {}) {
  const root = fromRepo(storybook);
  if (!fs.existsSync(path.join(root, "iframe.html"))) {
    throw new Error(`Built Storybook not found at ${storybook}; run npm --workspace website run build:storybook.`);
  }
  const server = await serveDirectory(root);
  const browser = await chromium.launch({headless: true});
  try {
    for (const capture of captures) {
      const raw = fromRepo(path.join(rawOutputDir, `${capture.id}.png`));
      fs.mkdirSync(path.dirname(raw), {recursive: true});
      const page = await renderStory(browser, server.origin, capture.story);
      fs.writeFileSync(raw, await composeSafariScreen(browser, page, capture.address));
      frame(raw, capture.sourcePath);
      console.log(`Wrote ${capture.sourcePath}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

async function renderStory(browser, origin, storyId) {
  const context = await browser.newContext({
    viewport: safariViewport,
    deviceScaleFactor: safariScreen.scale,
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    colorScheme: "light",
    reducedMotion: "reduce",
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`, {waitUntil: "networkidle"});
    await page.waitForSelector("body.sb-show-main #storybook-root > *, body.sb-show-errordisplay .sb-errordisplay", {state: "visible", timeout: 15_000});
    await page.locator(".sb-preparing-story").waitFor({state: "hidden", timeout: 15_000});
    const error = await page.locator(".sb-errordisplay").isVisible() ? await page.locator(".sb-errordisplay").textContent() : null;
    if (error?.trim()) throw new Error(`${storyId}: ${error.trim().replace(/\s+/gu, " ").slice(0, 500)}`);
    await page.addStyleTag({content: "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition: none !important; caret-color: transparent !important; } [data-reveal] { opacity: 1 !important; transform: none !important; }"});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.complete ? null : new Promise(done => { image.onload = image.onerror = done; })));
    });
    await page.waitForTimeout(100);
    return await page.screenshot({animations: "disabled", fullPage: false});
  } finally {
    await context.close();
  }
}

async function composeSafariScreen(browser, pagePng, address) {
  const top = PNG.sync.read(pagePng);
  const index = (top.width * 2 + 2) * 4; // a pixel just inside the top-left corner
  const topColor = [top.data[index], top.data[index + 1], top.data[index + 2]];
  const context = await browser.newContext({viewport: {width: safariScreen.width, height: safariScreen.height}, deviceScaleFactor: safariScreen.scale});
  try {
    const page = await context.newPage();
    await page.setContent(safariScreenHtml({pagePng: pagePng.toString("base64"), address, topColor}), {waitUntil: "load"});
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({fullPage: false});
  } finally {
    await context.close();
  }
}

function frame(input, output) {
  fs.mkdirSync(path.dirname(fromRepo(output)), {recursive: true});
  const result = spawnSync("dart", ["run", "tool/marketing/frame_device_capture.dart", "--input", input, "--output", output, "--device", "iphone-17-pro"], {cwd: repoRoot, stdio: "inherit"});
  if (result.status !== 0) throw new Error(`Framing ${output} failed.`);
}

function serveDirectory(root) {
  const types = {".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json5": "application/json"};
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {"content-type": types[path.extname(file)] ?? "application/octet-stream"});
    fs.createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close()})));
}
