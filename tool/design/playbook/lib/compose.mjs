// Composes Playbook page boards (.dc.html) from page specs (pages/*.json).
//
// The output is byte-compatible with the original Python composer that first
// produced these boards: the JSON inside each board is serialised the way
// Python's json.dumps does it (see pyJson), not the way JSON.stringify does.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root, and the playbook source pack with its source folders. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const ROOT = path.join(REPO_ROOT, 'design', 'source_packs', 'website-playbook');
export const PAGES_DIR = path.join(ROOT, 'pages');
export const KIT_DIR = path.join(ROOT, 'kit');
export const ONEOFF_DIR = path.join(ROOT, 'oneoff');

/** Reads every page spec, sorted by file name: [{ file, page }]. */
export function readPages(dir = PAGES_DIR) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((file) => ({ file, page: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) }));
}

/**
 * Canvas placeholder heights (px) per kit component, used before a section
 * renders. A section's optional `hint` overrides it; anything unlisted gets 600.
 */
export const HINT = Object.freeze({
  KitHeader: 140, KitHero: 820, KitTiles: 640, KitSplit: 720, KitTimeline: 900, KitStory: 760,
  KitChecklist: 680, KitPricing: 700, KitFaq: 680, KitFinal: 700, KitFooter: 620,
  KitFlow: 900, KitCards: 800, KitArticle: 1800, KitSwitcher: 1000, KitTable: 700, KitPhotoHero: 700,
});

export const hintFor = (section) => section.hint ?? HINT[section.component] ?? 600;

function pyString(value, ensureAscii) {
  let out = '"';
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0');
    else if (ensureAscii && code > 0x7f) {
      if (code > 0xffff) {
        const v = code - 0x10000;
        out += '\\u' + (0xd800 + (v >> 10)).toString(16) + '\\u' + (0xdc00 + (v & 0x3ff)).toString(16);
      } else {
        out += '\\u' + code.toString(16).padStart(4, '0');
      }
    } else out += ch;
  }
  return out + '"';
}

/**
 * Serialises like Python's json.dumps(value, ensure_ascii=..., indent=...).
 * Without indent the separators are ", " and ": "; with indent, items end in
 * "," plus a newline and keys use ": ".
 */
export function pyJson(value, { indent = null, ensureAscii = true } = {}, level = 0) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`cannot serialise ${value}`);
    return String(value);
  }
  if (typeof value === 'string') return pyString(value, ensureAscii);
  const opts = { indent, ensureAscii };
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v) => [null, v]) : Object.entries(value);
  if (entries.length === 0) return isArray ? '[]' : '{}';
  const items = entries.map(([k, v]) =>
    (isArray ? '' : pyString(k, ensureAscii) + ': ') + pyJson(v, opts, level + 1));
  const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
  if (indent == null) return open + items.join(', ') + close;
  const pad = ' '.repeat(indent * (level + 1));
  const endPad = ' '.repeat(indent * level);
  return open + '\n' + items.map((s) => pad + s).join(',\n') + '\n' + endPad + close;
}

/** Builds the 1440px page board for one page spec. */
export function composePage(page) {
  const { title, height, sections } = page;
  const proto = page.state || null;
  const lines = [];
  if (proto) {
    lines.push('<div class="pg"><div class="proto" role="group" aria-label="Page state"><span>' + proto.label +
      '</span><sc-for list="{{protoOpts}}" as="o" hint-placeholder-count="2"><button type="button" class="{{o.cls}}" onClick="{{o.pick}}">{{o.label}}</button></sc-for></div></div>');
  }
  sections.forEach((section, i) => {
    const c = section.component;
    let tag = `<dc-import name="${c}" d="{{s${i}}}" hint-size="100%,${hintFor(section)}px"></dc-import>`;
    if (section.when) {
      const placeholder = proto && section.when === proto.default ? 'true' : 'false';
      tag = `<sc-if value="{{is_${section.when}}}" hint-placeholder-val="{{ ${placeholder} }}">${tag}</sc-if>`;
    }
    lines.push(tag);
  });
  const imports = lines.join('\n');
  const dataObject = {};
  sections.forEach((section, i) => { dataObject[`s${i}`] = section.data; });
  const data = pyJson(dataObject, { indent: 1, ensureAscii: false });
  const props = pyJson({ $preview: { width: 1440, height } });
  let body;
  if (proto) {
    const options = proto.options.map((o) => [o.key, o.label]);
    body = '    const mode = (this.state && this.state.mode) || ' + pyJson(proto.default) + ';\n' +
      '    const opts = ' + pyJson(options, { ensureAscii: false }) + ';\n' +
      '    const base = ' + data +
      ";\n    const v = Object.assign({}, base, { protoOpts: opts.map((o) => ({ label: o[1], cls: mode === o[0] ? 'on' : '', pick: () => this.setState({ mode: o[0] }) })) });\n" +
      "    opts.forEach((o) => { v['is_' + o[0]] = mode === o[0]; });\n    return v;";
  } else {
    body = '    return ' + data + ';';
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="playbook-panels.css">
<link rel="stylesheet" href="playbook-kit.css">
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;family=Inter:wght@400;500;600;700&amp;display=swap">
<style>
body{margin:0;background:#fff}
</style>
</helmet>
<div style="background:#fff;padding-bottom:16px">
${imports}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${props}'>
// Built from the Playbook kit: each section is a Kit*.dc.html component; this page only holds its content.
class Component extends DCLogic {
  renderVals() {
${body}
  }
}
</script>
</body>
</html>
`;
}

const PHONE_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Playbook · Your page · phone</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="playbook-panels.css">
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;family=Inter:wght@400;500;600;700&amp;display=swap">
<style>
body{margin:0}
</style>
</helmet>
<div style="width: 390px; min-height: 8200px; background: #ffffff; font-family: Inter, system-ui, sans-serif; color: #141114;">
<dc-import name="PlaybookYourPage" hint-size="390px,8200px"></dc-import>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":8200}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;

/** Builds the 390px phone wrapper board that embeds the page board. */
export function composePhone(board, phone) {
  return PHONE_TEMPLATE
    .replaceAll('Your page · phone', () => phone.title + ' · phone')
    .replaceAll('PlaybookYourPage', () => board)
    .replaceAll('8200', () => String(phone.height));
}
