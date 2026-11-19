#!/usr/bin/env node
// Website imagery audit: opens every public website route against a running
// dev server, at a phone and a desktop width, and flags large blocks that
// paint a colour, gradient or pattern (or sit empty) with no real media and
// little text. Each flagged block gets a cropped screenshot so a person can
// decide what belongs there. It reports; it never edits the site or makes
// images. Output goes to ignored build/ output.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

// minViewportShare: the share of the viewport a block must cover to count
// as large. Desktop uses a smaller share so a 200px tile, large on the page,
// is not lost against a 1440x900 viewport.
export const DEFAULT_VIEWPORTS = [
  {name: "mobile", width: 390, height: 844, minViewportShare: 0.04},
  {name: "desktop", width: 1440, height: 900, minViewportShare: 0.025},
];

export const DEFAULT_OPTIONS = {
  // A block whose real media covers at least this share of it is fine.
  maxMediaShare: 0.12,
  // The block's largest empty strip must cover at least this share of it.
  minEmptyShare: 0.35,
  // ...and be at least this many CSS pixels on its shorter side.
  minEmptySide: 80,
};

// Routes that are signed-in, transactional or error pages, not public pages.
const EXCLUDED_STATIC_ROUTES = new Set(["account", "host_billing", "event_offer", "not_found"]);

const HELP = `Usage: node tool/marketing/audit_website_imagery.mjs --base-url <url> [options]

Opens every public website route (design/website/routes.json plus the
playbook content pages) at 390px and 1440px and flags large blocks with no
img, video, canvas, photo background or labelled SVG and little text.

Start the website first, for example:
  npm --prefix website run dev -- --port 5311 --strictPort

Options:
  --base-url <url>        Website origin (required), e.g. http://127.0.0.1:5311
  --out <dir>             Output directory (default build/website-imagery-audit)
  --only <substr,...>     Audit only paths containing one of these substrings
  --extra-paths <p,...>   Also audit these paths (city, organiser, event pages)
  --viewports <names>     mobile,desktop (default both)
  --min-share <n>         Minimum viewport share for a block (default 0.04
                          on mobile, 0.025 on desktop)
  --list-routes           Print the route list and exit
  --help                  Show this help

Writes <out>/candidates.json, <out>/summary.md and <out>/crops/*.png.`;

export function parseArgs(argv) {
  const args = {viewports: DEFAULT_VIEWPORTS.map((v) => v.name), only: [], extraPaths: []};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
      i += 1;
      return value;
    };
    if (flag === "--help" || flag === "-h") args.help = true;
    else if (flag === "--list-routes") args.listRoutes = true;
    else if (flag === "--base-url") args.baseUrl = next().replace(/\/+$/u, "");
    else if (flag === "--out") args.out = next();
    else if (flag === "--only") args.only = splitList(next());
    else if (flag === "--extra-paths") args.extraPaths = splitList(next());
    else if (flag === "--viewports") args.viewports = splitList(next());
    else if (flag === "--min-share") args.minShare = Number(next());
    else throw new Error(`Unknown option ${flag}`);
  }
  return args;
}

function splitList(value) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Public paths to audit: static and content routes from the route registry,
// with each content family expanded through its playbook page ids
// ("playbook_guide/run-club" -> /playbooks/run-club/).
export function publicRoutePaths(routes, playbookPageIds) {
  const out = [];
  for (const route of routes) {
    if (route.kind === "static") {
      if (EXCLUDED_STATIC_ROUTES.has(route.id) || !route.path) continue;
      out.push({routeId: route.id, path: route.path});
    } else if (route.kind === "contentFamily") {
      if (route.path) {
        out.push({routeId: route.id, path: route.path});
        continue;
      }
      const pattern = route.pathPattern ?? "";
      for (const id of playbookPageIds) {
        const [routeId, slug] = id.split("/");
        if (routeId !== route.id || !slug) continue;
        out.push({routeId: route.id, path: pattern.replace(/:[A-Za-z]+/u, slug)});
      }
    }
  }
  return out;
}

export function readPlaybookPageIds(dir = fromRepo("website/src/content/playbook/pages")) {
  const ids = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        const id = JSON.parse(fs.readFileSync(full, "utf8")).id;
        if (typeof id === "string") ids.push(id);
      }
    }
  };
  walk(dir);
  return ids.sort();
}

// The largest full-width or full-height strip of `block` that no content
// rect touches: the empty part of a card or section. Content rects may lie
// partly outside the block; only their overlap counts. Pure and
// self-contained, because the page evaluates its source too.
export function largestEmptyBand(block, rects) {
  const gaps = (start, length, intervals) => {
    const merged = intervals
      .map(([a, b]) => [Math.max(start, a), Math.min(start + length, b)])
      .filter(([a, b]) => b > a)
      .sort((p, q) => p[0] - q[0]);
    let best = {from: start, size: 0};
    let cursor = start;
    for (const [a, b] of merged) {
      if (a - cursor > best.size) best = {from: cursor, size: a - cursor};
      cursor = Math.max(cursor, b);
    }
    if (start + length - cursor > best.size) best = {from: cursor, size: start + length - cursor};
    return best;
  };
  const inside = rects.filter((r) => r.x < block.x + block.width && r.x + r.width > block.x && r.y < block.y + block.height && r.y + r.height > block.y);
  const vertical = gaps(block.y, block.height, inside.map((r) => [r.y, r.y + r.height]));
  const horizontal = gaps(block.x, block.width, inside.map((r) => [r.x, r.x + r.width]));
  const rows = {x: block.x, y: vertical.from, width: block.width, height: vertical.size};
  const cols = {x: horizontal.from, y: block.y, width: horizontal.size, height: block.height};
  const band = rows.width * rows.height >= cols.width * cols.height ? rows : cols;
  return {...band, area: band.width * band.height};
}

// Decides which measured blocks are empty visual lanes. Each record is a
// visible element measured in the page: its rect, whether it paints its own
// surface, how much of it real media covers, its largest empty band and its
// ancestors' record indexes. Pure, so it is unit tested without a browser.
export function selectCandidates(records, viewport, options = DEFAULT_OPTIONS) {
  const viewportArea = viewport.width * viewport.height;
  const minArea = viewportArea * (options.minViewportShare ?? viewport.minViewportShare);
  const qualifies = records.map((record) => {
    const area = record.rect.width * record.rect.height;
    if (area < minArea || record.fixed) return false;
    // Wider than the viewport plus a little: page wrappers, not blocks.
    if (record.rect.width > viewport.width * 1.02) return false;
    if (record.mediaArea / area >= options.maxMediaShare) return false;
    const band = record.emptyBand;
    if (!band) return false;
    // The empty part must itself be big enough to hold a picture: a large
    // share of the block, at least half the size threshold, and never a
    // thin strip (button rows, table cells and padding are thin).
    if (band.area / area < options.minEmptyShare) return false;
    if (band.area < minArea * 0.5) return false;
    if (Math.min(band.width, band.height) < options.minEmptySide) return false;
    // A plain layout box (no surface of its own) counts only when it holds
    // nothing at all: a slot reserved for something that never came.
    if (!record.paintsSurface && (record.textChars > 0 || record.childSurfaces > 0)) return false;
    return true;
  });
  // Keep the innermost qualifying block: an empty art slot rather than the
  // card around it, a card rather than the section around it.
  const hasQualifyingDescendant = new Set();
  records.forEach((record, index) => {
    if (!qualifies[index]) return;
    for (const ancestor of record.ancestors) hasQualifyingDescendant.add(ancestor);
  });
  return records
    .map((record, index) => ({record, index}))
    .filter(({index}) => qualifies[index] && !hasQualifyingDescendant.has(index))
    .map(({record}) => {
      const area = record.rect.width * record.rect.height;
      return {
        ...record,
        viewportShare: round(area / viewportArea),
        mediaShare: round(record.mediaArea / area),
        emptyShare: round(record.emptyBand.area / area),
        aspectRatio: aspectLabel(record.rect.width, record.rect.height),
        emptyAspectRatio: aspectLabel(record.emptyBand.width, record.emptyBand.height),
        fill: fillKind(record),
      };
    });
}

export function fillKind(record) {
  if (record.backgroundImage && record.backgroundImage !== "none") {
    return /gradient/u.test(record.backgroundImage) ? "gradient-or-pattern" : "css-image";
  }
  if (record.decorativeSvgArea > 0) return "decorative-svg-pattern";
  if (record.paintsSurface) return "flat-colour";
  return "empty-space";
}

const COMMON_RATIOS = [[1, 1], [4, 5], [5, 4], [3, 4], [4, 3], [2, 3], [3, 2], [9, 16], [16, 9], [21, 9], [2, 1], [1, 2], [3, 1]];

export function aspectLabel(width, height) {
  if (!width || !height) return "0:0";
  const ratio = width / height;
  let best = COMMON_RATIOS[0];
  for (const candidate of COMMON_RATIOS) {
    if (Math.abs(Math.log(ratio / (candidate[0] / candidate[1]))) < Math.abs(Math.log(ratio / (best[0] / best[1])))) best = candidate;
  }
  const off = Math.abs(Math.log(ratio / (best[0] / best[1])));
  return off < 0.08 ? `${best[0]}:${best[1]}` : `${round(ratio)}:1`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export function slugForFile(routePath) {
  const trimmed = routePath.replace(/^\/+|\/+$/gu, "");
  return trimmed ? trimmed.replace(/[^a-z0-9]+/giu, "-") : "home";
}

// Runs inside the page. Measures every visible element at least `minArea`
// large. Kept dependency-free because Playwright serialises it; the band
// finder arrives as source text.
function measurePage({minArea, bandSource}) {
  // eslint-disable-next-line no-eval
  const emptyBandOf = (0, eval)(`(${bandSource})`);
  const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "IFRAME", "OBJECT", "EMBED"]);
  const CONTROLS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
  const docRect = (el) => {
    const r = el.getBoundingClientRect();
    return {x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height};
  };
  const intersect = (a, b) => {
    const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const visible = (el) => {
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05;
  };
  const isTransparent = (colour) => !colour || colour === "transparent" || /rgba\([^)]*,\s*0(\.0+)?\)$/u.test(colour);
  const isRealSvg = (svg) => {
    if (svg.closest("[aria-hidden='true']")) return false;
    return svg.getAttribute("role") === "img" || Boolean(svg.getAttribute("aria-label")) || Boolean(svg.querySelector(":scope > title"));
  };
  const hasPhotoBackground = (style) => /url\(/u.test(style.backgroundImage) && !/\.svg/u.test(style.backgroundImage);
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const parent = node.parentElement;
    if (!parent || !visible(parent)) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width > 0 && r.height > 0) textRects.push({x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height});
    }
  }
  const mediaRects = [];
  const decorativeSvgRects = [];
  const controlRects = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const rect = docRect(el);
    if (rect.width < 2 || rect.height < 2) continue;
    if (MEDIA.has(el.tagName) || hasPhotoBackground(style)) mediaRects.push(rect);
    else if (el.tagName === "svg") {
      if (isRealSvg(el)) mediaRects.push(rect);
      // Small SVGs are icons; count them with text as content.
      else if (rect.width * rect.height < 64 * 64) controlRects.push(rect);
      else decorativeSvgRects.push(rect);
    } else if (CONTROLS.has(el.tagName)) controlRects.push(rect);
  }
  const elements = [];
  const indexOf = new Map();
  for (const el of document.body.querySelectorAll("*")) {
    if (el.tagName === "svg" || el.closest("svg") || MEDIA.has(el.tagName)) continue;
    if (!visible(el)) continue;
    const rect = docRect(el);
    if (rect.width * rect.height < minArea) continue;
    indexOf.set(el, elements.length);
    elements.push({el, rect});
  }
  const describe = (el) => {
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 4; node = node.parentElement) {
      const cls = [...node.classList].slice(0, 2).join(".");
      parts.unshift(node.tagName.toLowerCase() + (node.id ? `#${node.id}` : "") + (cls ? `.${cls}` : ""));
    }
    return parts.join(" > ");
  };
  const nearestHeading = (el) => {
    const own = el.querySelector("h1,h2,h3,h4,[role=heading]");
    if (own && own.textContent.trim()) return own.textContent.trim().slice(0, 80);
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        const h = sib.matches("h1,h2,h3,h4") ? sib : sib.querySelector("h1,h2,h3,h4");
        if (h && h.textContent.trim()) return h.textContent.trim().slice(0, 80);
      }
      const parentHeading = node.parentElement?.querySelector(":scope > h1, :scope > h2, :scope > h3");
      if (parentHeading && parentHeading.textContent.trim()) return parentHeading.textContent.trim().slice(0, 80);
    }
    return "";
  };
  const section = (el) => {
    const s = el.closest("section,[data-section],header,footer,main > *");
    const h = s?.querySelector("h1,h2");
    return h ? h.textContent.trim().slice(0, 80) : "";
  };
  // Text, controls, icons and real media are content; decorative SVG
  // patterns are not, because they are the fallback this audit looks for.
  const contentRects = [...textRects, ...controlRects, ...mediaRects];
  const sumWithin = (rects, rect) => rects.reduce((total, r) => total + intersect(r, rect), 0);
  return elements.map(({el, rect}) => {
    const style = getComputedStyle(el);
    const parentStyle = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const ownColour = !isTransparent(style.backgroundColor) && style.backgroundColor !== parentStyle?.backgroundColor;
    const ownImage = style.backgroundImage !== "none";
    const ownBorder = parseFloat(style.borderTopWidth) > 0 && !isTransparent(style.borderTopColor) && parseFloat(style.borderRadius) > 0;
    const ancestors = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (indexOf.has(node)) ancestors.push(indexOf.get(node));
    }
    let childSurfaces = 0;
    for (const child of el.querySelectorAll("*")) {
      if (child.tagName === "svg" || child.closest("svg")) continue;
      const cs = getComputedStyle(child);
      if (!isTransparent(cs.backgroundColor) || cs.backgroundImage !== "none") childSurfaces += 1;
    }
    const band = emptyBandOf(rect, contentRects);
    const text = (el.innerText || "").replace(/\s+/gu, " ").trim();
    return {
      selector: describe(el),
      component: el.closest("[data-component]")?.getAttribute("data-component") ?? "",
      heading: nearestHeading(el),
      section: section(el),
      text: text.slice(0, 160),
      textChars: text.length,
      rect: {x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)},
      fixed: style.position === "fixed" || style.position === "sticky",
      paintsSurface: ownColour || ownImage || ownBorder,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage.slice(0, 200),
      childSurfaces,
      mediaArea: sumWithin(mediaRects, rect),
      decorativeSvgArea: sumWithin(decorativeSvgRects, rect),
      emptyBand: {x: Math.round(band.x), y: Math.round(band.y), width: Math.round(band.width), height: Math.round(band.height), area: Math.round(band.area)},
      ancestors,
    };
  });
}

async function settlePage(page) {
  const essential = page.getByRole("button", {name: /^essential only$/iu});
  if (await essential.count()) await essential.first().click().catch(() => {});
  // Scroll through once so lazy images and in-view reveals load.
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", {timeout: 8000}).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
}

export async function runAudit(args) {
  const {chromium} = await import("playwright");
  const out = path.resolve(args.out ?? fromRepo("build/website-imagery-audit"));
  const cropDir = path.join(out, "crops");
  fs.rmSync(cropDir, {recursive: true, force: true});
  fs.mkdirSync(cropDir, {recursive: true});
  const routes = JSON.parse(fs.readFileSync(fromRepo("design/website/routes.json"), "utf8")).routes;
  let targets = publicRoutePaths(routes, readPlaybookPageIds());
  targets.push(...args.extraPaths.map((p) => ({routeId: "extra", path: p})));
  if (args.only.length) targets = targets.filter((t) => args.only.some((s) => t.path.includes(s)));
  const viewports = DEFAULT_VIEWPORTS.filter((v) => args.viewports.includes(v.name));
  const options = {...DEFAULT_OPTIONS, ...(Number.isFinite(args.minShare) ? {minViewportShare: args.minShare} : {})};
  const minArea = (viewport) => viewport.width * viewport.height * (options.minViewportShare ?? viewport.minViewportShare);
  const candidates = [];
  const pages = [];
  for (const viewport of viewports) {
    let browser = null;
    let context = null;
    // Headless Chromium sometimes exits mid-run; relaunch and carry on.
    const ensureContext = async () => {
      if (browser?.isConnected() && context) return context;
      await browser?.close().catch(() => {});
      browser = await chromium.launch();
      context = await browser.newContext({
        viewport: {width: viewport.width, height: viewport.height},
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        locale: "en-IN",
        timezoneId: "Asia/Kolkata",
      });
      return context;
    };
    try {
      for (const target of targets) {
        let attempt = 0;
        for (;;) {
          attempt += 1;
          try {
            const found = await auditOne(await ensureContext(), target, viewport);
            pages.push(found.page);
            candidates.push(...found.candidates);
            process.stdout.write(`${viewport.name.padEnd(7)} ${String(found.candidates.length).padStart(2)}  ${target.path}\n`);
            break;
          } catch (error) {
            const message = String(error.message ?? error);
            if (attempt < 3 && /closed|crash|disconnected/iu.test(message)) {
              context = null;
              continue;
            }
            pages.push({...target, viewport: viewport.name, error: message.slice(0, 200)});
            process.stdout.write(`${viewport.name.padEnd(7)} !!  ${target.path}  ${message.slice(0, 80)}\n`);
            break;
          }
        }
      }
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  async function auditOne(ctx, target, viewport) {
    const page = await ctx.newPage();
    try {
      const response = await page.goto(`${args.baseUrl}${target.path}`, {waitUntil: "load", timeout: 30000});
      const status = response?.status() ?? 0;
      await settlePage(page);
      const records = await page.evaluate(measurePage, {minArea: minArea(viewport), bandSource: largestEmptyBand.toString()});
      const found = selectCandidates(records, viewport, options);
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const out = [];
      for (const [n, candidate] of found.entries()) {
        const pad = 12;
        const x = Math.max(0, candidate.rect.x - pad);
        const y = Math.max(0, candidate.rect.y - pad);
        const clip = {x, y, width: Math.min(viewport.width - x, candidate.rect.width + pad * 2), height: Math.min(candidate.rect.height + pad * 2, 2400)};
        const file = `${slugForFile(target.path)}__${viewport.name}__${String(n + 1).padStart(2, "0")}.png`;
        await page.screenshot({path: path.join(cropDir, file), clip, fullPage: true}).catch(() => {});
        const {ancestors: _ancestors, ...rest} = candidate;
        out.push({id: file.replace(/\.png$/u, ""), route: target.path, routeId: target.routeId, viewport: viewport.name, crop: `crops/${file}`, ...rest});
      }
      return {page: {...target, viewport: viewport.name, status, finalPath: new URL(page.url()).pathname, pageHeight, candidates: out.length}, candidates: out};
    } finally {
      await page.close().catch(() => {});
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    options,
    viewports,
    pages,
    candidates,
  };
  fs.writeFileSync(path.join(out, "candidates.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(out, "summary.md"), summaryMarkdown(report));
  process.stdout.write(`\n${candidates.length} candidate blocks on ${new Set(candidates.map((c) => c.route)).size} routes. Report: ${relativeToRepo(out)}/summary.md\n`);
  return report;
}

export function summaryMarkdown(report) {
  const lines = ["# Website imagery audit", "", `${report.candidates.length} candidate blocks, ${report.pages.length} page renders, ${report.generatedAt}.`, ""];
  const failed = report.pages.filter((p) => p.error || (p.status && p.status >= 400));
  if (failed.length) {
    lines.push("## Pages that did not render", "");
    for (const p of failed) lines.push(`- ${p.viewport} ${p.path}: ${p.error ?? p.status}`);
    lines.push("");
  }
  const byRoute = new Map();
  for (const c of report.candidates) {
    if (!byRoute.has(c.route)) byRoute.set(c.route, []);
    byRoute.get(c.route).push(c);
  }
  for (const [route, list] of byRoute) {
    lines.push(`## ${route}`, "", "| Crop | Viewport | Heading | Fill | Size | Ratio |", "|---|---|---|---|---|---|");
    for (const c of list) {
      lines.push(`| ${c.crop} | ${c.viewport} | ${(c.heading || c.section || c.text || "").replace(/\|/gu, "/").slice(0, 60)} | ${c.fill} | ${c.rect.width}×${c.rect.height} | ${c.aspectRatio} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${HELP}\n`);
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  if (args.listRoutes) {
    const routes = JSON.parse(fs.readFileSync(fromRepo("design/website/routes.json"), "utf8")).routes;
    for (const target of publicRoutePaths(routes, readPlaybookPageIds())) process.stdout.write(`${target.path}\n`);
    return;
  }
  if (!args.baseUrl) {
    process.stderr.write(`--base-url is required.\n\n${HELP}\n`);
    process.exit(2);
  }
  await runAudit(args);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exit(1);
  });
}
