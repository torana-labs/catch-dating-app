#!/usr/bin/env node
// Renders the website's link-preview cards (og:image, 1200x630) from the
// site's own copy, colour tokens, font, wordmarks and app captures, and
// records a hash of those inputs per card. --check recomputes the hashes
// without a browser, so a copy, token, font or capture change that skips a
// re-render fails CI. It also writes the wordmark, colours and fonts that the
// per-request organiser and event cards (src/server/generatedPreviewCardImage.tsx)
// draw with, and --check covers those too.
//
//   node scripts/renderPreviewCards.mjs --update   # render all cards (from website/)
//   node scripts/renderPreviewCards.mjs --check    # inputs unchanged?
import crypto from "node:crypto";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {PNG} from "pngjs";
import {consumerHomeCopy} from "../src/content/consumerHome.ts";

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
const generatedDir = "website/public/assets/og/generated";
const generatedMarkSource = "assets/branding/catch_splash_mark_dark.png";
const archivoSource = "packages/catch_ui/assets/fonts/Archivo-Roman-VF.ttf";
// Satori draws static fonts only. When the Archivo variable font changes, re-cut
// both instances with fontTools 4.60 and run --update --fonts-recut:
//   SOURCE_DATE_EPOCH=0 fonttools varLib.instancer packages/catch_ui/assets/fonts/Archivo-Roman-VF.ttf wght=760 wdth=78 -o website/public/assets/og/generated/archivo-card-headline.ttf
//   SOURCE_DATE_EPOCH=0 fonttools varLib.instancer packages/catch_ui/assets/fonts/Archivo-Roman-VF.ttf wght=480 wdth=100 -o website/public/assets/og/generated/archivo-card-text.ttf
const generatedFonts = {
  "archivo-card-headline.ttf": null,
  "archivo-card-text.ttf": null,
  "ibm-plex-mono-medium.ttf": "packages/web-config/generated/assets/fonts/IBMPlexMono-Medium.ttf",
};

// Each card's words come from meta.json, so editing a page title or
// description changes the card's input hash. The home card lists the event
// formats its page filters by.
export const cards = [
  {id: "default", route: "home", mark: "catch", headline: "after", body: "twitterDescription", capture: null},
  {id: "home", route: "home", mark: "catch", headline: "after", body: "twitterDescription", capture: null, chips: "homeFormats"},
  {id: "host", route: "host", mark: "host", headline: "after", body: "twitterDescription", capture: "host-live-console"},
  {id: "apply", route: "host_apply", mark: "host", headline: "before", body: "description", capture: "host-create-basics"},
  {id: "claim", route: "claim", mark: "catch", headline: "before", body: "description", capture: null},
  {id: "organizers", route: "organizers", mark: "catch", headline: "before", body: "twitterDescription", capture: null},
  {id: "form", route: "public_form", mark: "catch", headline: "before", body: "description", capture: null},
];

const chipSources = {
  homeFormats: () => consumerHomeCopy.categories.filter((category) => category.id !== "all").map((category) => category.label),
};

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
  const chips = card.chips ? chipSources[card.chips]() : [];
  return {headline, body: route[card.body], chips, alt: `${brand}: ${headline}`};
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

/** What the generated cards read: tokens, the light wordmark and fonts, with a version over all of it. */
export function generatedCardAssets(css = readText(tokensPath)) {
  const value = (name) => {
    const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
    if (!match) throw new Error(`${tokensPath} has no ${name}.`);
    return match[1].trim();
  };
  const activities = [...new Set([...css.matchAll(/--catch-activity-([a-z-]+)-deep:/g)].map((match) => match[1]))];
  const grounds = Object.fromEntries(activities.map((name) =>
    [name, {accent: value(`--catch-activity-${name}-accent`), deep: value(`--catch-activity-${name}-deep`)}]));
  const colors = {surface: value("--catch-color-light-surface"), ink: value("--catch-color-light-ink")};
  const mark = trimmedMarkPng(generatedMarkSource);
  const files = {"mark.png": mark.png};
  for (const [name, source] of Object.entries(generatedFonts)) {
    const file = source ?? `${generatedDir}/${name}`;
    if (!fs.existsSync(fromRepo(file))) throw new Error(`${file} is missing; cut it as renderPreviewCards.mjs describes.`);
    files[name] = fs.readFileSync(fromRepo(file));
  }
  const fontSource = crypto.createHash("sha256").update(fs.readFileSync(fromRepo(archivoSource))).digest("hex");
  const hash = crypto.createHash("sha256").update(JSON.stringify({colors, grounds}));
  for (const name of Object.keys(files).sort()) hash.update(name).update(files[name]);
  return {
    entry: {version: hash.digest("hex").slice(0, 12), fontSource, colors, grounds,
      mark: {path: "/assets/og/generated/mark.png", width: mark.width, height: mark.height}},
    files,
  };
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
  const generated = generatedCardAssets();
  if (index.generated?.fontSource !== generated.entry.fontSource) problems.push("generated: the Archivo variable font changed; re-cut the card instances as renderPreviewCards.mjs describes");
  else if (JSON.stringify(index.generated) !== JSON.stringify(generated.entry)) problems.push("generated: tokens, wordmark or fonts changed since the generated-card assets were written");
  for (const [name, bytes] of Object.entries(generated.files)) {
    const file = fromRepo(`${generatedDir}/${name}`);
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) problems.push(`generated: ${name} is missing or stale`);
  }
  const extra = Object.keys(index.cards).filter((id) => !cards.some((card) => card.id === id));
  if (extra.length) problems.push(`${indexPath} lists unknown cards: ${extra.join(", ")}`);
  if (problems.length) {
    console.error(`Preview cards are stale:\n${problems.map((line) => `  - ${line}`).join("\n")}\nRe-render from website/: node scripts/renderPreviewCards.mjs --update`);
    process.exit(1);
  }
  console.log(`Preview cards match their inputs (${cards.length} cards and the generated-card assets).`);
}

async function updateCards() {
  const {chromium} = await import("playwright");
  const meta = readJson(metaPath);
  const tokens = readTokens();
  const font = fs.readFileSync(fromRepo(fontPath)).toString("base64");
  const browser = await chromium.launch({headless: true});
  const generated = generatedCardAssets();
  const previous = fs.existsSync(fromRepo(indexPath)) ? readJson(indexPath).generated : null;
  if (previous && previous.fontSource !== generated.entry.fontSource && !process.argv.includes("--fonts-recut")) {
    throw new Error("The Archivo variable font changed. Re-cut the card instances as renderPreviewCards.mjs describes, then run --update --fonts-recut.");
  }
  const index = {width: cardWidth, height: cardHeight, cards: {}, generated: generated.entry};
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
  fs.mkdirSync(fromRepo(generatedDir), {recursive: true});
  for (const [name, bytes] of Object.entries(generated.files)) fs.writeFileSync(fromRepo(`${generatedDir}/${name}`), bytes);
  fs.writeFileSync(fromRepo(indexPath), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Rendered ${cards.length} preview cards into ${outputDir}.`);
}

function cardHtml({content, tokens, font, mark, capture}) {
  const escape = (value) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
  const aside = Boolean(capture || content.chips.length);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${cardWidth}px; height: ${cardHeight}px; overflow: hidden; }
body { background: ${tokens.bg}; color: ${tokens.ink}; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.card { position: relative; width: 100%; height: 100%; padding: 64px 72px; border-bottom: 10px solid ${tokens.ink}; }
.mark { display: block; height: 46px; width: auto; }
.copy { max-width: ${aside ? 640 : 960}px; }
h1 { margin: 52px 0 0; font-family: "Archivo", sans-serif; font-stretch: 78%; font-variation-settings: "wdth" 78; font-weight: 760; letter-spacing: -0.035em; word-spacing: 0.08em; font-size: ${aside ? 68 : 84}px; line-height: 1.02; text-wrap: balance; }
p { margin: 26px 0 0; max-width: 760px; font-size: 26px; line-height: 1.42; color: ${tokens.ink2}; }
.url { position: absolute; left: 72px; bottom: 52px; font-size: 20px; font-weight: 600; letter-spacing: 0.02em; }
.capture { position: absolute; right: 64px; top: 48px; width: 300px; filter: drop-shadow(0 18px 36px rgba(22, 20, 15, 0.18)); }
.chips { position: absolute; right: 72px; top: 0; bottom: 10px; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 16px; }
.chips li { padding: 10px 26px 12px; border: 3px solid ${tokens.ink}; border-radius: 999px; font-family: "Archivo", sans-serif; font-stretch: 78%; font-variation-settings: "wdth" 78; font-weight: 700; font-size: 40px; line-height: 1; letter-spacing: -0.01em; }
</style></head><body><main class="card">
<img class="mark" alt="" src="${mark}">
<div class="copy"><h1>${escape(content.headline)}</h1><p>${escape(content.body)}</p></div>
${capture ? `<img class="capture" alt="" src="${capture}">` : ""}
${content.chips.length ? `<ul class="chips">${content.chips.map((chip) => `<li>${escape(chip)}</li>`).join("")}</ul>` : ""}
<div class="url">catchdates.com</div>
</main></body></html>`;
}

function trimmedMark(file) {
  return dataUri(trimmedMarkPng(file).png);
}

/** The splash marks are 1024px squares; crop to the wordmark's alpha bounds. */
function trimmedMarkPng(file) {
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
  return {png: PNG.sync.write(cropped), width: cropped.width, height: cropped.height};
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
