import {hashValue} from "../../platform/canonical-json.mjs";
import {OperationsError} from "../../platform/errors.mjs";

// A fetched page becomes one bounded JSON snapshot: the structured data
// adapters read (JSON-LD, OpenGraph and meta tags, embedded JSON state) plus a
// trimmed text body for the extraction agent. Raw HTML is never persisted in
// Firestore; acquisition stores snapshots outside it (acquisition_policy.json).
export const PAGE_SNAPSHOT_VERSION = 1;
export const MAX_PAGE_HTML_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BLOCKS = 40;
const MAX_JSON_BLOCK_BYTES = 1024 * 1024;
const DEFAULT_MAX_TEXT_CHARS = 20_000;
const META_KEY = /^(?:og:[a-z:_]+|twitter:[a-z:_]+|description|keywords|author)$/u;

export function snapshotFromHtml({
  url,
  finalUrl = url,
  status = 200,
  contentType = "text/html",
  html,
  fetchedAt = null,
  maxTextChars = DEFAULT_MAX_TEXT_CHARS,
}) {
  if (typeof html !== "string") {
    throw new OperationsError("PAGE_HTML_REQUIRED", "A page snapshot requires the fetched HTML.");
  }
  if (Buffer.byteLength(html, "utf8") > MAX_PAGE_HTML_BYTES) {
    throw new OperationsError("PAGE_HTML_TOO_LARGE", "The fetched page exceeds the snapshot size limit.");
  }
  const jsonLd = [];
  const embeddedJson = [];
  let jsonParseFailures = 0;
  for (const {attributes, body} of scriptBlocks(html)) {
    const type = (attributes.type ?? "").toLowerCase();
    const isLd = type === "application/ld+json";
    const isState = type === "application/json" || attributes.id === "__NEXT_DATA__";
    if (!isLd && !isState) continue;
    if (jsonLd.length + embeddedJson.length >= MAX_JSON_BLOCKS) break;
    if (Buffer.byteLength(body, "utf8") > MAX_JSON_BLOCK_BYTES) {
      jsonParseFailures += 1;
      continue;
    }
    let value;
    try {
      value = JSON.parse(body.trim());
    } catch {
      jsonParseFailures += 1;
      continue;
    }
    if (isLd) jsonLd.push(value);
    else embeddedJson.push({id: attributes.id ?? null, value});
  }
  const snapshot = {
    schemaVersion: PAGE_SNAPSHOT_VERSION,
    url: text(url),
    finalUrl: text(finalUrl) ?? text(url),
    status,
    contentType,
    fetchedAt,
    title: titleOf(html),
    canonicalUrl: canonicalOf(html),
    meta: metaOf(html),
    jsonLd,
    embeddedJson,
    jsonParseFailures,
    text: visibleText(html, maxTextChars),
  };
  return {...snapshot, contentHash: hashValue(snapshot)};
}

/** Every `<script>` block with its attributes; the body is left unparsed. */
export function scriptBlocks(html) {
  const blocks = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)) {
    blocks.push({attributes: attributesOf(match[1]), body: match[2]});
  }
  return blocks;
}

function metaOf(html) {
  const meta = {};
  for (const match of html.matchAll(/<meta\b([^>]*)>/giu)) {
    const attributes = attributesOf(match[1]);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (!META_KEY.test(key) || typeof attributes.content !== "string") continue;
    if (!(key in meta)) meta[key] = decodeEntities(attributes.content).trim().slice(0, 2000);
  }
  return meta;
}

function titleOf(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu);
  return match ? decodeEntities(match[1]).replace(/\s+/gu, " ").trim().slice(0, 500) || null : null;
}

function canonicalOf(html) {
  for (const match of html.matchAll(/<link\b([^>]*)>/giu)) {
    const attributes = attributesOf(match[1]);
    if ((attributes.rel ?? "").toLowerCase().split(/\s+/u).includes("canonical")) {
      return text(attributes.href);
    }
  }
  return null;
}

function visibleText(html, maxChars) {
  const stripped = html
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(?:br|p|div|li|h[1-6]|tr|section|article)\b[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, " ");
  return decodeEntities(stripped)
    .replace(/[ \t\f\v\r]+/gu, " ")
    .replace(/\s*\n\s*/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()
    .slice(0, maxChars);
}

function attributesOf(source) {
  const attributes = {};
  for (const match of source.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu)) {
    const key = match[1].toLowerCase();
    if (key in attributes) continue;
    attributes[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

const NAMED_ENTITIES = Object.freeze({amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " "});

export function decodeEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (whole, entity) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ?
        Number.parseInt(entity.slice(2), 16) :
        Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
