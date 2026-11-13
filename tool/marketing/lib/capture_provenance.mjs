import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateRawSync, inflateRawSync} from 'node:zlib';
import {fromRepo, repoRoot} from '../../lib/repo_paths.mjs';
import {webCaptureInputHash} from './web_capture_inputs.mjs';
import {framedSize, isCaptureDevice} from './capture_devices.mjs';
import {captureCatalogIndex, marketingEntryFile} from '../../ui_capture/lib/capture_catalog_sources.mjs';

// Provenance travels inside the PNG; there is no second capture registry.
const chunkType = 'caPt';
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// Shared harness: every app capture renders through these. The catalog index
// is deliberately absent: it lists every capture, and the runner resolves a
// marketing capture lazily from its own entry file, which joins the inputs
// below. The exporter checks that the index maps each id to that file.
const harnessRoots = [
  'test/ui_captures/capture_runner_test.dart',
  'test/ui_captures/flutter_test_config.dart',
  'test/ui_captures/catalog/screen_capture_entry.dart',
  'tool/marketing/frame_device_capture.dart',
  'tool/marketing/export_app_screenshots.mjs',
  'tool/marketing/lib/capture_provenance.mjs',
  'tool/marketing/lib/capture_devices.mjs',
  'tool/ui_capture/run_captures.mjs',
  'tool/ui_capture/lib/capture_catalog_sources.mjs',
  'tool/lib/repo_paths.mjs',
  'pubspec.yaml', 'pubspec.lock', 'tool/ci/toolchain.env',
];
const notFollowed = new Set([captureCatalogIndex]);
// Design tokens and the app theme style every screen, mostly through
// constants that coverage cannot see, so every app capture lists all of them.
const globalTrees = ['packages/catch_tokens/lib', 'packages/platform/lib/theme'];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// A capture renders from these manifest fields alone. Everything else in an
// entry (website copy, the pages that show it, scenario pointers and facts) is
// presentation and never invalidates a render; scenario data enters through
// the data files its Dart inputs name.
const renderFields = ['id', 'status', 'device', 'fixtureKey', 'sourcePath'];
// Fixtures read data files at runtime (scenario and persona JSON, images) by
// literal repo path. Those named files are inputs; a computed path is refused
// because the hash could not see which file it reads.
const dataLiteral = /(['"])((?:assets|lib|packages|test|tool)\/(?:(?!\1)[^\n])*\.(?:json|jpe?g|png|webp|gif|svg|txt|csv))\1/gu;

/**
 * Every repo file an app capture could depend on, by static import closure:
 * the harness and the capture's entry file. Production screens import each
 * other, so this covers much of lib/. It detects edits made while a render
 * runs; recordedInputFiles decides which captures are stale.
 */
export function staticInputFiles(capture) {
  const ctx = dartContext();
  return finalize(ctx, closure(ctx, [...harnessRoots, marketingEntryFile(capture.fixtureKey)], allDirectives));
}

/**
 * The inputs a capture's provenance records, from the files its render
 * executed (lcov from `flutter test --coverage` of that capture alone):
 *
 * - the harness roots, design tokens and theme (globalTrees), declared
 *   assets/fonts and package manifests;
 * - the capture's entry file;
 * - every Dart file with an executed line (see executedFilesFromLcov);
 * - files that never execute but hold constants, enums or types that executed
 *   code reads: a direct import of an executed file, or a file it re-exports,
 *   is listed when a top-level name it declares appears in that executed
 *   file. (Listing every re-exported file instead would add whole barrels:
 *   catch_ui.dart alone re-exports 332 files.)
 * - the data files any listed Dart file names by literal path.
 *
 * Known gap: a constant read only by another constant, where neither file
 * executes and the second is not named by an executed file (a multi-hop const
 * chain), is not listed. The weekly compare-only render reports any drift
 * this causes.
 */
export function recordedInputFiles(capture, executedFiles) {
  const ctx = dartContext();
  const entry = marketingEntryFile(capture.fixtureKey);
  // The index runs (it resolves the entry) but is not an input; the exporter
  // checks that it maps the id to the entry file instead.
  const executed = executedFiles.filter(file => file.endsWith('.dart') && !notFollowed.has(file) && fs.existsSync(fromRepo(file)));
  const listed = new Set([...harnessRoots, entry, ...executed]);
  for (const tree of globalTrees) if (fs.existsSync(fromRepo(tree))) addTree(tree, listed);
  // The harness Dart files run in every render, so their imports are judged
  // like an executed file's.
  for (const file of new Set([...harnessRoots.filter(root => root.endsWith('.dart')), entry, ...executed])) {
    const words = identifiers(ctx, file);
    const direct = directives(ctx, file).filter(([kind]) => kind !== 'export').map(([, dependency]) => dependency);
    for (const candidate of closure(ctx, direct, new Set(['export', 'part']))) {
      if (!listed.has(candidate) && !notFollowed.has(candidate) && topLevelNames(ctx, candidate).some(name => words.has(name))) listed.add(candidate);
    }
  }
  return finalize(ctx, listed);
}

function identifiers(ctx, file) {
  ctx.words ??= new Map();
  if (!ctx.words.has(file)) ctx.words.set(file, new Set(source(ctx, file).match(/[A-Za-z_$][A-Za-z0-9_$]*/gu) ?? []));
  return ctx.words.get(file);
}

/** Names a Dart file declares at top level (column 0), public or private. */
function topLevelNames(ctx, file) {
  ctx.names ??= new Map();
  if (!ctx.names.has(file)) {
    const names = new Set();
    for (const line of source(ctx, file).split('\n')) {
      const type = line.match(/^(?:(?:abstract|sealed|final|base|interface)\s+)*(?:class|enum|mixin|typedef|extension(?:\s+type)?)\s+([A-Za-z_$][\w$]*)/u);
      if (type && type[1] !== 'on') { names.add(type[1]); continue; }
      const getter = line.match(/^[\w<>?,\s]*\bget\s+([A-Za-z_$][\w$]*)/u);
      if (getter) { names.add(getter[1]); continue; }
      const member = line.match(/^(?!(?:import|export|part|library|return|if|for)\b)[A-Za-z_$][\w$<>?,.\s]*?\b([A-Za-z_$][\w$]*)\s*(?:=|\(|;|,)/u);
      if (member && !/^\s/u.test(line)) names.add(member[1]);
    }
    ctx.names.set(file, [...names]);
  }
  return ctx.names.get(file);
}

const allDirectives = new Set(['import', 'export', 'part']);

function dartContext() {
  const packages = new Map();
  const manifests = ['pubspec.yaml'];
  for (const dir of fs.readdirSync(fromRepo('packages'), {withFileTypes: true})) {
    if (dir.isDirectory() && fs.existsSync(fromRepo(`packages/${dir.name}/pubspec.yaml`))) {
      manifests.push(`packages/${dir.name}/pubspec.yaml`);
    }
  }
  for (const pubspec of manifests) {
    const name = fs.readFileSync(fromRepo(pubspec), 'utf8').match(/^name:\s*(\S+)/mu)?.[1];
    if (name) packages.set(name, path.posix.join(path.posix.dirname(pubspec), 'lib'));
  }
  return {packages, manifests, sources: new Map()};
}

function source(ctx, file) {
  if (!ctx.sources.has(file)) ctx.sources.set(file, fs.readFileSync(fromRepo(file), 'utf8'));
  return ctx.sources.get(file);
}

/** `[kind, repo path]` for each local Dart import/export/part of `file`. */
function directives(ctx, file) {
  const found = [];
  for (const directive of source(ctx, file).matchAll(/^\s*(import|export|part)\s+([^;]+);/gmu)) {
    if (/^part\s+of\b/u.test(directive[0].trim())) continue;
    for (const match of directive[2].matchAll(/['"]([^'"]+)['"]/gu)) {
      const uri = match[1];
      if (uri.startsWith('dart:')) continue;
      let dependency;
      if (uri.startsWith('package:')) {
        const [name, ...segments] = uri.slice(8).split('/');
        const base = ctx.packages.get(name);
        if (!base) continue; // Third-party bytes are pinned by pubspec.lock.
        dependency = path.posix.join(base, ...segments);
      } else {
        dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), uri));
      }
      if (!dependency.endsWith('.dart')) continue;
      if (dependency.startsWith('../') || !fs.existsSync(fromRepo(dependency))) {
        throw new Error(`Missing capture dependency: ${dependency} (from ${file})`);
      }
      found.push([directive[1], dependency]);
    }
  }
  return found;
}

/** Dart roots plus every file reachable through the given directive kinds. */
function closure(ctx, roots, kinds) {
  const reached = new Set(roots);
  const queue = roots.filter(file => file.endsWith('.dart'));
  for (let i = 0; i < queue.length; i++) {
    for (const [kind, dependency] of directives(ctx, queue[i])) {
      if (!kinds.has(kind) || reached.has(dependency) || notFollowed.has(dependency)) continue;
      reached.add(dependency);
      queue.push(dependency);
    }
  }
  return reached;
}

/** Adds manifests, declared assets/fonts and named data files; sorts. */
function finalize(ctx, files) {
  const inputs = new Set(files);
  addManifestInputs(ctx, inputs);
  for (const file of [...inputs]) {
    if (file.endsWith('.dart')) for (const data of dataFilesNamedBy(source(ctx, file), file)) inputs.add(data);
  }
  return [...inputs].sort();
}

function addManifestInputs(ctx, inputs) {
  for (const pubspec of ctx.manifests) {
    inputs.add(pubspec);
    // All declared Flutter assets/fonts, including directory membership, affect
    // rendering. Dependency cache and machine-specific package_config do not.
    for (const match of source(ctx, pubspec).matchAll(/^\s*-\s*(?:asset:\s*)?([^\s#]+)\s*$/gmu)) {
      const candidate = path.posix.join(path.posix.dirname(pubspec), match[1]);
      if (fs.existsSync(fromRepo(candidate)) && (match[0].includes('asset:') || match[1].endsWith('/') || fs.statSync(fromRepo(candidate)).isFile())) addTree(candidate, inputs);
    }
  }
}

function dataFilesNamedBy(text, file) {
  const named = [];
  for (const match of text.matchAll(dataLiteral)) {
    const literal = match[2];
    if (literal.includes('$')) throw new Error(`Capture data path must be literal: ${literal} (in ${file})`);
    if (fs.existsSync(fromRepo(literal)) && fs.statSync(fromRepo(literal)).isFile()) named.push(literal);
  }
  return named;
}

/**
 * Files with an executed line in an lcov report, repo-relative. Lines of a
 * `const` constructor declaration (its head, asserts and initializer list) do
 * not count: the JIT evaluates those while compiling code that names the
 * widget (the router's route table names every screen) without building it.
 * A class whose only hits are there still enters the recorded list when an
 * executed file that imports it names it (see recordedInputFiles).
 */
export function executedFilesFromLcov(lcov) {
  const executed = new Set();
  let file = null;
  let constLines = null;
  for (const line of lcov.split('\n')) {
    if (line.startsWith('SF:')) {
      const name = line.slice(3).trim();
      const relative = path.isAbsolute(name) ? path.relative(repoRoot, name).split(path.sep).join('/') : name;
      file = relative.startsWith('..') ? null : relative;
      constLines = null;
    } else if (file && line.startsWith('DA:')) {
      const [number, hits] = line.slice(3).split(',').map(Number);
      if (!(hits > 0) || executed.has(file)) continue;
      constLines ??= constConstructorLines(fs.existsSync(fromRepo(file)) ? fs.readFileSync(fromRepo(file), 'utf8') : '');
      if (!constLines.has(number)) executed.add(file);
    } else if (line === 'end_of_record') file = null;
  }
  return [...executed].sort();
}

/** 1-based line numbers inside `const Name(...) [: initializers];` declarations. */
export function constConstructorLines(text) {
  const lines = new Set();
  for (const match of text.matchAll(/^[ \t]*const\s+_?[A-Z][\w$]*(?:\.[\w$]+)?\s*\(/gmu)) {
    let depth = 0;
    let end = text.length;
    for (let i = match.index + match[0].length - 1; i < text.length; i++) {
      const c = text[i];
      if (c === "'" || c === '"') { // skip simple string literals
        const close = text.indexOf(c, i + 1);
        if (close !== -1) { i = close; continue; }
      }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth === 0) { end = i; break; }
    }
    const first = text.slice(0, match.index).split('\n').length;
    const last = text.slice(0, end).split('\n').length;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

// Bump when the way recorded inputs are chosen or hashed changes: every app
// capture then renders again once, instead of being judged by an old rule.
export const INPUT_RECIPE = 2;

/**
 * An app capture's input hash over `files` (its recorded list), or a web
 * capture's input hash. Any listed file that no longer exists throws, so the
 * capture is stale.
 */
export function captureInputHash(capture, files) {
  if (capture.kind === 'web-capture') return webCaptureInputHash(capture);
  if (!Array.isArray(files) || files.length === 0) throw new Error('App capture inputs need a recorded file list.');
  const recipe = Object.fromEntries(renderFields.map(key => [key, capture[key] ?? null]));
  const hash = crypto.createHash('sha256').update(JSON.stringify({inputRecipe: INPUT_RECIPE, recipe}));
  // Declared asset directories are read as they are now, so adding or
  // removing an asset stales every app capture even though the recorded
  // list was written before it existed.
  const inputs = new Set(files);
  addManifestInputs(dartContext(), inputs);
  for (const file of [...inputs].sort()) {
    if (!fs.existsSync(fromRepo(file)) || !fs.statSync(fromRepo(file)).isFile()) {
      throw new Error(`Recorded capture input is missing: ${file}; render again.`);
    }
    hash.update(file).update('\0').update(fs.readFileSync(fromRepo(file))).update('\0');
  }
  return hash.digest('hex');
}

/** Hash of the static superset, to detect source edits while a render runs. */
export function staticInputHash(capture) {
  return capture.kind === 'web-capture' ? webCaptureInputHash(capture) : captureInputHash(capture, staticInputFiles(capture));
}

export function encodeInputFiles(files) {
  return deflateRawSync(Buffer.from(files.join('\n'), 'utf8')).toString('base64');
}

/** The recorded list, checked: sorted, unique, repo-relative, harness and entry present. */
export function decodeInputFiles(capture, encoded) {
  let files;
  try {
    files = inflateRawSync(Buffer.from(encoded, 'base64')).toString('utf8').split('\n');
  } catch { throw new Error('Recorded capture inputs are unreadable; render again.'); }
  const valid = files.every((file, i) => file.length > 0 && !file.startsWith('/') && !file.split('/').includes('..') &&
    (i === 0 || files[i - 1] < file));
  const required = [...harnessRoots, marketingEntryFile(capture.fixtureKey)];
  if (!valid || required.some(file => !files.includes(file))) {
    throw new Error('Recorded capture inputs are malformed or incomplete; render again.');
  }
  return files;
}

function addTree(file, inputs) {
  file = file.replace(/\/+$/u, '');
  if (fs.statSync(fromRepo(file)).isDirectory()) {
    for (const item of fs.readdirSync(fromRepo(file)).sort()) addTree(`${file}/${item}`, inputs);
  } else inputs.add(file);
}

/**
 * Stamps provenance into a freshly framed PNG. An app capture passes the
 * files its complete, successful render executed (executedFilesFromLcov).
 */
export function stampCapture(capture, captureId, fontPath, {executedFiles} = {}) {
  const file = fromRepo(capture.sourcePath);
  const png = fs.readFileSync(file);
  const {width, height, chunks} = parsePng(png);
  assertFrame(capture, width, height);
  const image = withoutProvenance(chunks);
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: repoRoot, encoding: 'utf8'});
  if (revision.status !== 0) throw new Error('Cannot resolve capture source revision.');
  const web = capture.kind === 'web-capture';
  if (!web && !Array.isArray(executedFiles)) throw new Error(`${capture.id}: an app capture is stamped with its executed files.`);
  const inputFiles = web ? null : recordedInputFiles(capture, executedFiles);
  const provenance = {
    version: web ? 1 : 2, ...recipeIdentity(capture, captureId),
    device: capture.device, outputScale: 2,
    sourceRevision: revision.stdout.trim(),
    ...(web ? {} : {inputRecipe: INPUT_RECIPE, inputFiles: encodeInputFiles(inputFiles)}),
    inputSha256: captureInputHash(capture, inputFiles),
    nativeFontSha256: digest(fs.readFileSync(fontPath)),
    // The macOS runner image the render ran on, so the nightly can tell
    // whether a reused PNG predates a runner image change.
    runnerImage: process.env.ImageVersion ?? null,
    imageSha256: digest(image),
  };
  const chunk = encodeChunk(chunkType, Buffer.from(JSON.stringify(provenance)));
  fs.writeFileSync(file, Buffer.concat([image.subarray(0, image.length - 12), chunk, image.subarray(-12)]));
}

export function validateCapture(capture, captureId, {fontPath} = {}) {
  try {
    return validateCaptureBytes(capture, captureId, fs.readFileSync(fromRepo(capture.sourcePath)), {fontPath});
  } catch (error) { return [`${capture.id}: ${error.message}`]; }
}

// Artifact consumers must validate bytes before replacing any checkout file.
// The recipe retains its canonical sourcePath for the exact-source input hash.
export function validateCaptureBytes(capture, captureId, bytes, {fontPath} = {}) {
  try {
    const {width, height, chunks} = parsePng(bytes);
    assertFrame(capture, width, height);
    const records = chunks.filter(chunk => chunk.type === chunkType);
    if (records.length !== 1) throw new Error('Missing or duplicate render provenance; regenerate with the canonical exporter.');
    const record = JSON.parse(records[0].data.toString('utf8'));
    const identity = recipeIdentity(capture, captureId);
    const web = capture.kind === 'web-capture';
    // Fail closed: an app render without a readable recorded list, from an
    // older format or recipe, is stale.
    if (!web && (record.version !== 2 || record.inputRecipe !== INPUT_RECIPE || typeof record.inputFiles !== 'string')) {
      throw new Error('Render provenance predates the current recorded-input recipe; render again.');
    }
    if ((web && record.version !== 1) || Object.entries(identity).some(([key, value]) => record[key] !== value) ||
        record.device !== capture.device || record.outputScale !== 2 ||
        !/^[a-f0-9]{40}$/u.test(record.sourceRevision) || !/^[a-f0-9]{64}$/u.test(record.nativeFontSha256)) {
      throw new Error('Render provenance does not match the catalog/native iPhone recipe.');
    }
    if (fontPath && record.nativeFontSha256 !== digest(fs.readFileSync(fontPath))) throw new Error('Native font changed; render again.');
    if (record.imageSha256 !== digest(withoutProvenance(chunks))) throw new Error('PNG bytes differ from the recorded render.');
    const files = web ? null : decodeInputFiles(capture, record.inputFiles);
    if (record.inputSha256 !== captureInputHash(capture, files)) throw new Error('Capture inputs changed; regenerate and inspect before syncing.');
    return [];
  } catch (error) { return [`${capture.id}: ${error.message}`]; }
}

// What a render claims to show: an app catalog entry on iOS, or a website
// Storybook story in iPhone Safari (WebKit). `captureId` is the catalog id or
// the story id.
function recipeIdentity(capture, captureId) {
  return capture.kind === 'web-capture'
    ? {kind: 'web-capture', captureId, address: capture.address, platform: 'ios-safari'}
    : {captureId, fixtureKey: capture.fixtureKey, platform: 'ios'};
}

function assertFrame(capture, width, height) {
  if (!isCaptureDevice(capture.device)) throw new Error(`Unsupported capture device ${capture.device}.`);
  const expected = framedSize(capture.device);
  if (width !== expected.width || height !== expected.height) {
    throw new Error(`Expected framed ${capture.device} PNG ${expected.width}x${expected.height}, got ${width}x${height}.`);
  }
}

function parsePng(png) {
  if (!png.subarray(0, 8).equals(signature)) throw new Error('Capture must be a PNG.');
  const chunks = [];
  let offset = 8;
  while (offset < png.length) {
    if (offset + 12 > png.length) throw new Error('Truncated PNG chunk.');
    const length = png.readUInt32BE(offset);
    const end = offset + length + 12;
    if (end > png.length) throw new Error('Truncated PNG data.');
    const bytes = png.subarray(offset, end);
    const type = bytes.toString('ascii', 4, 8);
    if (crc32(bytes.subarray(4, -4)) !== bytes.readUInt32BE(bytes.length - 4)) throw new Error('Invalid PNG checksum.');
    chunks.push({type, data: bytes.subarray(8, -4), bytes});
    offset = end;
    if (type === 'IEND') break;
  }
  if (offset !== png.length || chunks[0]?.type !== 'IHDR' || chunks[0].data.length !== 13 || chunks.at(-1)?.type !== 'IEND') {
    throw new Error('Invalid PNG structure.');
  }
  return {width: chunks[0].data.readUInt32BE(0), height: chunks[0].data.readUInt32BE(4), chunks};
}

function withoutProvenance(chunks) {
  return Buffer.concat([signature, ...chunks.filter(chunk => chunk.type !== chunkType).map(chunk => chunk.bytes)]);
}
function encodeChunk(type, data) {
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length);
  bytes.write(type, 4, 'ascii');
  data.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(bytes.subarray(4, -4)), bytes.length - 4);
  return bytes;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
