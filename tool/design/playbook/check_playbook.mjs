#!/usr/bin/env node
// Checks the Playbook design sources.
//
//   node tool/design/playbook/check_playbook.mjs [--against <dir>]
//
// 1. Every pages/*.json validates against schema/page.schema.json and its
//    cross-references hold (board matches the file name, state keys exist,
//    each component has a kit/ file).
// 2. Every kit component renders its built-in sample data, and every template
//    hole ({{name...}}) resolves to a value.
// 3. Every page section renders through its kit component without throwing,
//    with a nested phone mock (d.media) rendered through KitMock, and every
//    generated page board resolves its own holes in each page state.
// 4. Every one-off board renders and resolves its holes.
// 5. source-pack.json lists every file in the pack with its current sha256.
// With --against <dir>, generated boards must also match the files in <dir>
// byte for byte (for example a copy of the published canvas files).
//
// Needs the root npm dependencies (ajv): bash tool/git/bootstrap_worktree.sh --target root
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import Ajv2020 from 'ajv/dist/2020.js';
import { composePage, composePhone, readPages, ROOT, KIT_DIR, ONEOFF_DIR } from './lib/compose.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node tool/design/playbook/check_playbook.mjs [--against <dir>]');
  process.exit(0);
}
const againstAt = args.indexOf('--against');
const againstDir = againstAt >= 0 ? path.resolve(args[againstAt + 1] ?? '') : null;
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

// A minimal stand-in for the canvas runtime's DCLogic base class.
const DC_LOGIC = 'class DCLogic { constructor(p) { this.props = p || {}; this.state = null; } ' +
  'setState(o) { this.state = Object.assign({}, this.state, o); } }';

/** Loads a .dc.html board: its Component class and its template. */
function loadBoard(source, file) {
  const start = source.indexOf('class Component');
  const end = source.lastIndexOf('</script>');
  const template = source.slice(source.indexOf('<x-dc>'), source.indexOf('</x-dc>'));
  if (start < 0 || end < start || !template) throw new Error('no Component class or <x-dc> template');
  const Component = vm.runInNewContext(`${DC_LOGIC}\n(${source.slice(start, end).replace('class Component', 'class')})`,
    {}, { filename: file });
  return { Component, template };
}

/** Template holes whose root value renderVals does not provide. */
function missingHoles(template, vals) {
  const loopVars = new Set([...template.matchAll(/as="(\w+)"/g)].map((m) => m[1]).concat(['$index']));
  const roots = new Set([...template.matchAll(/\{\{\s*([\w$]+)/g)].map((m) => m[1]));
  return [...roots].filter((r) => !(r in vals) && !loopVars.has(r) && r !== 'true' && r !== 'false');
}

function render(board, props, where, state = null) {
  try {
    const instance = new board.Component(props);
    if (state) instance.state = state;
    const vals = instance.renderVals();
    const missing = missingHoles(board.template, vals);
    if (missing.length) fail(where, `template holes with no value: ${missing.join(', ')}`);
    return vals;
  } catch (error) {
    fail(where, `throws: ${error.message}`);
    return null;
  }
}

// 1. Schema and cross-references.
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schema', 'page.schema.json'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const pages = readPages();
const kitNames = new Set(fs.readdirSync(KIT_DIR).filter((f) => /^Kit\w+\.dc\.html$/.test(f)).map((f) => f.replace('.dc.html', '')));
const oneoffNames = new Set(fs.readdirSync(ONEOFF_DIR).map((f) => f.replace('.dc.html', '')));
for (const { file, page } of pages) {
  if (!validate(page)) {
    for (const e of validate.errors) fail(`pages/${file}`, `${e.instancePath || '/'} ${e.message}`);
    continue;
  }
  if (page.board + '.json' !== file) fail(`pages/${file}`, `board "${page.board}" does not match the file name`);
  if (oneoffNames.has(page.board)) fail(`pages/${file}`, `board "${page.board}" is also a one-off board`);
  if (page.$schema !== undefined && page.$schema !== '../schema/page.schema.json') fail(`pages/${file}`, '$schema must be ../schema/page.schema.json');
  const keys = page.state ? page.state.options.map((o) => o.key) : [];
  if (new Set(keys).size !== keys.length) fail(`pages/${file}`, 'duplicate state keys');
  if (page.state && !keys.includes(page.state.default)) fail(`pages/${file}`, `state default "${page.state.default}" is not an option`);
  page.sections.forEach((s, i) => {
    if (!kitNames.has(s.component)) fail(`pages/${file}#${i}`, `no kit/${s.component}.dc.html`);
    if (s.when && !keys.includes(s.when)) fail(`pages/${file}#${i}`, `when "${s.when}" is not a state option`);
  });
}

// 2. Kit components with their sample data.
const kits = {};
for (const name of [...kitNames].sort()) {
  const file = `kit/${name}.dc.html`;
  try {
    kits[name] = loadBoard(fs.readFileSync(path.join(KIT_DIR, `${name}.dc.html`), 'utf8'), file);
  } catch (error) {
    fail(file, error.message);
    continue;
  }
  render(kits[name], {}, `${file} (sample data)`);
}

// 3. Page sections and generated boards.
let sectionCount = 0;
for (const { file, page } of pages) {
  if (errors.some((e) => e.startsWith(`pages/${file}`))) continue;
  page.sections.forEach((s, i) => {
    const kit = kits[s.component];
    if (!kit) return;
    sectionCount += 1;
    const where = `pages/${file}#${i} ${s.component}`;
    const vals = render(kit, { d: s.data }, where);
    if (vals && vals.d && vals.d.media && kits.KitMock) render(kits.KitMock, { d: vals.d.media }, `${where} media`);
  });
  const html = composePage(page);
  const phone = composePhone(page.board, page.phone);
  try {
    const board = loadBoard(html, `${page.board}.dc.html`);
    const states = page.state ? page.state.options.map((o) => ({ mode: o.key })) : [null];
    for (const state of states) render(board, {}, `${page.board}.dc.html${state ? ` [${state.mode}]` : ''}`, state);
  } catch (error) {
    fail(`${page.board}.dc.html`, error.message);
  }
  if (againstDir) {
    for (const [name, text] of [[`${page.board}.dc.html`, html], [`${page.board}390.dc.html`, phone]]) {
      const target = path.join(againstDir, name);
      if (!fs.existsSync(target)) fail(name, `missing from ${againstDir}`);
      else if (fs.readFileSync(target, 'utf8') !== text) fail(name, `differs from ${target}`);
    }
  }
}

// 4. One-off boards.
for (const name of [...oneoffNames].sort()) {
  const file = `oneoff/${name}.dc.html`;
  try {
    render(loadBoard(fs.readFileSync(path.join(ONEOFF_DIR, `${name}.dc.html`), 'utf8'), file), {}, file);
  } catch (error) {
    fail(file, error.message);
  }
}

// 5. The pack manifest.
const manifestPath = path.join(ROOT, 'source-pack.json');
const listFiles = (dir, prefix = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]);
const onDisk = listFiles(ROOT).filter((f) => f !== 'source-pack.json').sort();
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const listed = new Map((manifest.files ?? []).map((f) => [f.path, f.sha256]));
for (const f of onDisk) {
  const sha = createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  if (!listed.has(f)) fail('source-pack.json', `does not list ${f}`);
  else if (listed.get(f) !== sha) fail('source-pack.json', `sha256 for ${f} is stale`);
}
for (const f of listed.keys()) if (!onDisk.includes(f)) fail('source-pack.json', `lists missing file ${f}`);
for (const f of manifest.entrypoints ?? []) if (!onDisk.includes(f)) fail('source-pack.json', `entrypoint ${f} does not exist`);

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\nPlaybook check failed with ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`Playbook check passed: ${pages.length} pages (${sectionCount} sections), ${Object.keys(kits).length} kit components, ${oneoffNames.size} one-off boards.`);
