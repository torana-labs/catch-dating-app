import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fromRepo, repoRoot} from '../../lib/repo_paths.mjs';

// Provenance travels inside the PNG; there is no second capture registry.
const chunkType = 'caPt';
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const roots = [
  'test/ui_captures/catalog/screen_capture_catalog.dart',
  'test/ui_captures/capture_runner_test.dart',
  'test/ui_captures/flutter_test_config.dart',
  'tool/marketing/frame_device_capture.dart',
  'tool/marketing/export_app_screenshots.mjs',
  'tool/marketing/lib/capture_provenance.mjs',
  'tool/ui_capture/run_captures.mjs',
  'tool/lib/repo_paths.mjs',
  'pubspec.yaml', 'pubspec.lock', 'tool/ci/toolchain.env',
];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// A capture renders from these manifest fields alone. Everything else in an
// entry (website copy, the pages that show it, scenario pointers and facts) is
// presentation and never invalidates a render; scenario data enters through
// its files below.
const renderFields = ['id', 'status', 'device', 'fixtureKey', 'sourcePath'];

export function captureInputHash(capture) {
  const inputs = new Set(roots);
  // These canonical fixtures load JSON at runtime rather than through imports.
  for (const directory of ['tool/demo/demo_seed/scenarios', 'tool/demo/demo_seed/personas']) addTree(directory, inputs);
  const packages = new Map();
  const pubspecs = ['pubspec.yaml'];
  for (const dir of fs.readdirSync(fromRepo('packages'), {withFileTypes: true})) {
    if (dir.isDirectory() && fs.existsSync(fromRepo(`packages/${dir.name}/pubspec.yaml`))) {
      pubspecs.push(`packages/${dir.name}/pubspec.yaml`);
    }
  }
  for (const pubspec of pubspecs) {
    const source = fs.readFileSync(fromRepo(pubspec), 'utf8');
    const name = source.match(/^name:\s*(\S+)/mu)?.[1];
    if (name) packages.set(name, path.posix.join(path.posix.dirname(pubspec), 'lib'));
    inputs.add(pubspec);
    // All declared Flutter assets/fonts, including directory membership, affect
    // rendering. Dependency cache and machine-specific package_config do not.
    for (const match of source.matchAll(/^\s*-\s*(?:asset:\s*)?([^\s#]+)\s*$/gmu)) {
      const candidate = path.posix.join(path.posix.dirname(pubspec), match[1]);
      if (fs.existsSync(fromRepo(candidate)) && (match[0].includes('asset:') || match[1].endsWith('/') || fs.statSync(fromRepo(candidate)).isFile())) addTree(candidate, inputs);
    }
  }
  const queue = [...inputs].filter(file => file.endsWith('.dart'));
  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];
    const source = fs.readFileSync(fromRepo(file), 'utf8');
    for (const directive of source.matchAll(/^\s*(?:import|export|part)\s+([^;]+);/gmu)) {
      for (const match of directive[1].matchAll(/['"]([^'"]+)['"]/gu)) {
        const uri = match[1];
        if (uri.startsWith('dart:')) continue;
        let dependency;
        if (uri.startsWith('package:')) {
          const [name, ...segments] = uri.slice(8).split('/');
          const base = packages.get(name);
          if (!base) continue; // Third-party bytes are pinned by pubspec.lock.
          dependency = path.posix.join(base, ...segments);
        } else {
          dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), uri));
        }
        if (!dependency.endsWith('.dart') || inputs.has(dependency)) continue;
        if (dependency.startsWith('../') || !fs.existsSync(fromRepo(dependency))) {
          throw new Error(`Missing capture dependency: ${dependency} (from ${file})`);
        }
        inputs.add(dependency);
        queue.push(dependency);
      }
    }
  }
  const recipe = Object.fromEntries(renderFields.map(key => [key, capture[key] ?? null]));
  const hash = crypto.createHash('sha256').update(JSON.stringify(recipe));
  for (const file of [...inputs].sort()) {
    hash.update(file).update('\0').update(fs.readFileSync(fromRepo(file))).update('\0');
  }
  return hash.digest('hex');
}

function addTree(file, inputs) {
  if (fs.statSync(fromRepo(file)).isDirectory()) {
    for (const item of fs.readdirSync(fromRepo(file)).sort()) addTree(`${file}/${item}`, inputs);
  } else inputs.add(file);
}

export function stampCapture(capture, captureId, fontPath) {
  const file = fromRepo(capture.sourcePath);
  const png = fs.readFileSync(file);
  const {width, height, chunks} = parsePng(png);
  assertFrame(capture, width, height);
  const image = withoutProvenance(chunks);
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: repoRoot, encoding: 'utf8'});
  if (revision.status !== 0) throw new Error('Cannot resolve capture source revision.');
  const provenance = {
    version: 1, captureId, fixtureKey: capture.fixtureKey,
    device: capture.device, platform: 'ios', outputScale: 2,
    sourceRevision: revision.stdout.trim(),
    inputSha256: captureInputHash(capture),
    nativeFontSha256: digest(fs.readFileSync(fontPath)),
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
    if (record.version !== 1 || record.captureId !== captureId || record.fixtureKey !== capture.fixtureKey ||
        record.device !== capture.device || record.platform !== 'ios' || record.outputScale !== 2 ||
        !/^[a-f0-9]{40}$/u.test(record.sourceRevision) || !/^[a-f0-9]{64}$/u.test(record.nativeFontSha256)) {
      throw new Error('Render provenance does not match the catalog/native iPhone recipe.');
    }
    if (fontPath && record.nativeFontSha256 !== digest(fs.readFileSync(fontPath))) throw new Error('Native font changed; render again.');
    if (record.imageSha256 !== digest(withoutProvenance(chunks))) throw new Error('PNG bytes differ from the recorded render.');
    if (record.inputSha256 !== captureInputHash(capture)) throw new Error('Capture inputs changed; regenerate and inspect before syncing.');
    return [];
  } catch (error) { return [`${capture.id}: ${error.message}`]; }
}

function assertFrame(capture, width, height) {
  if (capture.device !== 'iphone-17-pro' || width !== 1020 || height !== 1964) {
    throw new Error(`Expected framed iphone-17-pro PNG 1020x1964, got ${width}x${height}.`);
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
