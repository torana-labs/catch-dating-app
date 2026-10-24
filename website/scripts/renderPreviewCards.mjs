#!/usr/bin/env node
// Renders the website's link-preview cards (og:image, 1200x630) from the
// site's own copy, colour tokens, font, wordmarks and app captures, and
// records a hash of those inputs per card. --check recomputes the hashes
// without a browser, so a copy, token, font or capture change that skips a
// re-render fails CI.
//
//   node scripts/renderPreviewCards.mjs --update   # render all cards (from website/)
//   node scripts/renderPreviewCards.mjs --check    # inputs unchanged?
import crypto from "node:crypto";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {PNG} from "pngjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const fromRepo = (file) => path.join(repoRoot, file);

export const cardWidth = 1200;
export const cardHeight = 630;
const outputDir = "website/public/assets/og";
const indexPath = "website/src/content/previewCards.json";
const metaPath = "website/src/content/meta.json";
const tokensPath = "packages/web-config/generated/catch-tokens.css";
const fontPath = "packages/web-config/generated/assets/fonts/Archivo-Roman-VF.woff2";
const screenshotDir = "website/public/assets/app-screenshots";
const marks = {
  catch: "assets/branding/catch_splash_mark_light.png",
  host: "assets/branding/catch_host_splash_mark_light.png",
};
const tokenNames = ["bg", "ink", "ink2", "line"];

// Each card's words come from meta.json, so editing a page title or
// description changes the card's input hash.
export const cards = [
  {id: "default", route: "home", mark: "catch", headline: "after", body: "twitterDescription", capture: null},
  {id: "host", route: "host", mark: "host", headline: "after", body: "twitterDescription", capture: "host-live-console"},
  {id: "apply", route: "host_apply", mark: "host", headline: "before", body: "description", capture: "host-create-basics"},
  {id: "form", route: "public_form", mark: "catch", headline: "before", body: "description", capture: null},
];

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === "--update") await updateCards();
  else if (command === "--check") checkCards();
  else {
    console.error("Usage: renderPreviewCards.mjs --update | --check");
    process.exit(64);
  }
}

export function cardContent(card, meta = readJson(metaPath)) {
  const route = meta.routes[card.route];
  if (!route) throw new Error(`meta.json has no route ${card.route} for preview card ${card.id}.`);
  const [before, after] = route.title.split(" | ");
  const headline = card.headline === "after" ? after : before;
  if (!headline) throw new Error(`Preview card ${card.id} expects "${card.route}" title to read "<before> | <after>".`);
  const brand = card.mark === "host" ? "Catch Host" : "Catch";
  return {headline, body: route[card.body], alt: `${brand}: ${headline}`};
}

export function readTokens(css = readText(tokensPath)) {
  return Object.fromEntries(tokenNames.map((name) => {
    const match = css.match(new RegExp(`--catch-color-light-${name}:\\s*([^;]+);`));
    if (!match) throw new Error(`${tokensPath} has no --catch-color-light-${name}.`);
    return [name, match[1].trim()];
  }));
}

// Captures are hashed by id, not bytes: CI re-imports their bytes from the
// capture pipeline, and a re-render of the card picks up the newest image.
export function cardInputHash(card, {meta = readJson(metaPath), tokens = readTokens()} = {}) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify({card, content: cardContent(card, meta), tokens, size: [cardWidth, cardHeight]}));
  hash.update(fs.readFileSync(fileURLToPath(import.meta.url)));
  hash.update(fs.readFileSync(fromRepo(fontPath)));
  hash.update(fs.readFileSync(fromRepo(marks[card.mark])));
  return hash.digest("hex");
}

function checkCards() {
  const index = readJson(indexPath);
  const meta = readJson(metaPath);
  const tokens = readTokens();
  const problems = [];
  for (const card of cards) {
    const entry = index.cards[card.id];
    if (!entry) {
      problems.push(`${card.id}: missing from ${indexPath}`);
      continue;
    }
    if (entry.inputHash !== cardInputHash(card, {meta, tokens})) problems.push(`${card.id}: copy, tokens, font, wordmark or renderer changed since it was rendered`);
    const file = fromRepo(`website/public${entry.path}`);
    if (!fs.existsSync(file)) problems.push(`${card.id}: ${entry.path} is missing`);
    else {
      const png = PNG.sync.read(fs.readFileSync(file));
      if (png.width !== cardWidth || png.height !== cardHeight) problems.push(`${card.id}: ${entry.path} is ${png.width}x${png.height}`);
    }
  }
  const extra = Object.keys(index.cards).filter((id) => !cards.some((card) => card.id === id));
  if (extra.length) problems.push(`${indexPath} lists unknown cards: ${extra.join(", ")}`);
  if (problems.length) {
    console.error(`Preview cards are stale:\n${problems.map((line) => `  - ${line}`).join("\n")}\nRe-render from website/: node scripts/renderPreviewCards.mjs --update`);
    process.exit(1);
  }
  console.log(`Preview cards match their inputs (${cards.length} cards).`);
}

async function updateCards() {
  const {chromium} = await import("playwright");
  const meta = readJson(metaPath);
  const tokens = readTokens();
  const font = fs.readFileSync(fromRepo(fontPath)).toString("base64");
  const browser = await chromium.launch({headless: true});
  const index = {width: cardWidth, height: cardHeight, cards: {}};
  try {
    const page = await browser.newPage({viewport: {width: cardWidth, height: cardHeight}, deviceScaleFactor: 1});
    fs.mkdirSync(fromRepo(outputDir), {recursive: true});
    for (const card of cards) {
      const content = cardContent(card, meta);
      await page.setContent(cardHtml({content, tokens, font, mark: trimmedMark(marks[card.mark]),
        capture: card.capture ? dataUri(fs.readFileSync(fromRepo(`${screenshotDir}/${card.capture}.png`))) : null}), {waitUntil: "load"});
      await page.evaluate(() => document.fonts.ready);
      const cardPath = `/assets/og/${card.id}.png`;
      await page.screenshot({path: fromRepo(`website/public${cardPath}`), type: "png"});
      const inputHash = cardInputHash(card, {meta, tokens});
      index.cards[card.id] = {path: cardPath, version: inputHash.slice(0, 12), alt: content.alt, capture: card.capture, inputHash};
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(fromRepo(indexPath), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Rendered ${cards.length} preview cards into ${outputDir}.`);
}

function cardHtml({content, tokens, font, mark, capture}) {
  const escape = (value) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${cardWidth}px; height: ${cardHeight}px; overflow: hidden; }
body { background: ${tokens.bg}; color: ${tokens.ink}; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.card { position: relative; width: 100%; height: 100%; padding: 64px 72px; border-bottom: 10px solid ${tokens.ink}; }
.mark { display: block; height: 46px; width: auto; }
.copy { max-width: ${capture ? 640 : 960}px; }
h1 { margin: 52px 0 0; font-family: "Archivo", sans-serif; font-stretch: 78%; font-variation-settings: "wdth" 78; font-weight: 760; letter-spacing: -0.035em; word-spacing: 0.08em; font-size: ${capture ? 68 : 84}px; line-height: 1.02; text-wrap: balance; }
p { margin: 26px 0 0; max-width: 760px; font-size: 26px; line-height: 1.42; color: ${tokens.ink2}; }
.url { position: absolute; left: 72px; bottom: 52px; font-size: 20px; font-weight: 600; letter-spacing: 0.02em; }
.capture { position: absolute; right: 64px; top: 48px; width: 300px; filter: drop-shadow(0 18px 36px rgba(22, 20, 15, 0.18)); }
</style></head><body><main class="card">
<img class="mark" alt="" src="${mark}">
<div class="copy"><h1>${escape(content.headline)}</h1><p>${escape(content.body)}</p></div>
${capture ? `<img class="capture" alt="" src="${capture}">` : ""}
<div class="url">catchdates.com</div>
</main></body></html>`;
}

/** The splash marks are 1024px squares; crop to the wordmark's alpha bounds. */
function trimmedMark(file) {
  const source = PNG.sync.read(fs.readFileSync(fromRepo(file)));
  let left = source.width, top = source.height, right = -1, bottom = -1;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error(`${file} has no visible mark.`);
  const cropped = new PNG({width: right - left + 1, height: bottom - top + 1});
  PNG.bitblt(source, cropped, left, top, cropped.width, cropped.height, 0, 0);
  return dataUri(PNG.sync.write(cropped));
}

function dataUri(png) {
  return `data:image/png;base64,${png.toString("base64")}`;
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function readText(file) {
  return fs.readFileSync(fromRepo(file), "utf8");
}
