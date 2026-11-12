import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import test from 'node:test';
import {fromRepo} from '../lib/repo_paths.mjs';

function fixture(t, {second = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catch-capture-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, content) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
    return file;
  };
  for (const name of ['tool/lib/repo_paths.mjs', 'tool/lib/dart_call_blocks.mjs', 'tool/marketing/sync_website_media.mjs',
    'tool/marketing/export_app_screenshots.mjs', 'tool/marketing/lib/capture_provenance.mjs',
    'tool/marketing/lib/capture_devices.mjs',
    'tool/marketing/lib/web_capture_inputs.mjs', 'tool/ui_capture/run_captures.mjs',
    'tool/ui_capture/lib/capture_catalog_sources.mjs']) {
    write(name, fs.readFileSync(fromRepo(name)));
  }
  const capture = {
    id: 'sample', status: 'active', audience: 'host', surface: 'Today',
    device: 'iphone-17-pro', fixtureKey: 'salesDemo.sample',
    sourcePath: 'artifacts/sample.png',
    websitePath: 'website/public/assets/app-screenshots/sample.png',
    placeholderPath: 'website/public/assets/app-screenshots/placeholders/sample.svg',
    alt: 'Synthetic Today screen', caption: 'Today', walkthroughStep: '1',
  };
  const other = {...capture, id: 'other', fixtureKey: 'salesDemo.other', sourcePath: 'artifacts/other.png',
    websitePath: 'website/public/assets/app-screenshots/other.png',
    placeholderPath: 'website/public/assets/app-screenshots/placeholders/other.svg'};
  const captures = second ? [capture, other] : [capture];
  write('tool/marketing/capture_manifest.json', JSON.stringify({version: 1, updated: '2026-09-21', previewDisclosure: 'Fictional app preview.', captures}));
  for (const entry of captures) write(entry.sourcePath, png());
  write('packages/sample/pubspec.yaml', 'name: sample\nflutter:\n  assets:\n    - assets/\n');
  write('packages/sample/assets/image.txt', 'asset fixture');
  write('pubspec.yaml', 'name: catch_dating_app\n');
  write('pubspec.lock', 'pinned dependencies');
  write('tool/ci/toolchain.env', 'FLUTTER_VERSION=fixture');
  write('tool/demo/demo_seed/scenarios/sample.json', '{}');
  write('tool/demo/demo_seed/personas/sample.json', '{}');
  write('test/ui_captures/capture_runner_test.dart', "import 'package:catch_dating_app/parent.dart';\nfinal shown = title;\n");
  write('lib/parent.dart', "export 'leaf.dart';\n");
  write('lib/leaf.dart', 'const title = \'Today\';\n');
  write('test/ui_captures/flutter_test_config.dart', '');
  write('tool/marketing/frame_device_capture.dart', '');
  // Each marketing entry renders its own widget; both widgets share the theme.
  write('lib/theme.dart', "const accent = 0xFF0000;\n");
  write('packages/catch_tokens/lib/tokens.dart', 'const spacing = 4;\n');
  write('lib/sample_widget.dart', "import 'theme.dart';\nconst sampleWorld = 'tool/demo/demo_seed/personas/sample.json';\nconst color = accent;\n");
  write('lib/other_widget.dart', "import 'theme.dart';\nconst color = accent;\n");
  writeCaptureCatalog(write, captures.map(entry => ({id: `${entry.id}_screen`, fixtureKey: entry.fixtureKey,
    imports: [`package:catch_dating_app/${entry.id}_widget.dart`]})));
  // What each capture's render executes (its coverage), by capture id. The
  // theme is not executed: it enters as a direct import of the widget.
  write('executed.json', JSON.stringify(Object.fromEntries(captures.map(entry => [entry.id,
    [`lib/${entry.id}_widget.dart`, `test/ui_captures/catalog/entries/${entry.id}_screen.dart`]]))));
  const calls = path.join(root, 'calls.jsonl');
  // Stub only external render/frame executables. The actual Node wrappers run.
  const fakeCommand = name => {
    const file = write(`bin/${name}`, `#!${process.execPath}\n` +
      (name === 'dart' ? `const args=process.argv.slice(2); const output=args[args.indexOf('--output')+1]; require('node:fs').writeFileSync(output,Buffer.from(process.env.CAPTURE_TEST_PNG,'base64'));\n` : '') +
      // A coverage run writes the executed files of its one capture as lcov.
      (name === 'flutter' ? `const fs=require('node:fs'); const a=process.argv.slice(2); const cov=a.find(x=>x.startsWith('--coverage-path='));
if (cov) { const id=process.env.CAPTURE_IDS.replace(/_screen$/,'');
  const files=JSON.parse(fs.readFileSync('executed.json','utf8'))[id];
  fs.mkdirSync(require('node:path').dirname(cov.slice(16)),{recursive:true});
  fs.writeFileSync(cov.slice(16), files.map(f=>'SF:'+f+'\\nDA:1,1\\nend_of_record\\n').join('')); }\n` : '') +
      `require('node:fs').appendFileSync(process.env.CAPTURE_TEST_CALLS, JSON.stringify({name: ${JSON.stringify(name)}, args: process.argv.slice(2)})+'\\n');\n`);
    fs.chmodSync(file, 0o755);
  };
  fakeCommand('flutter');
  fakeCommand('dart');
  const git = write('bin/git', `#!${process.execPath}\nprocess.stdout.write('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n');\n`);
  fs.chmodSync(git, 0o755);
  const font = write('fonts/native.ttf', 'native font fixture');
  write('stamp.mjs', `import {stampCapture} from './tool/marketing/lib/capture_provenance.mjs'; import fs from 'node:fs'; const executed = JSON.parse(fs.readFileSync('executed.json', 'utf8')); for (const c of JSON.parse(fs.readFileSync('tool/marketing/capture_manifest.json')).captures) stampCapture(c, c.id + '_screen', 'fonts/native.ttf', {executedFiles: executed[c.id]});`);
  write('hash.mjs', `import {captureInputHash, recordedInputFiles} from './tool/marketing/lib/capture_provenance.mjs'; import fs from 'node:fs'; const c = JSON.parse(process.argv[2]); const executed = JSON.parse(fs.readFileSync('executed.json', 'utf8'))[c.id] ?? []; process.stdout.write(captureInputHash(c, recordedInputFiles(c, executed)));`);
  const run = (script, ...args) => spawnSync(process.execPath, [path.join(root, script), ...args], {
    encoding: 'utf8', cwd: root,
    env: {...process.env, PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`, CAPTURE_TEST_CALLS: calls, CAPTURE_TEST_PNG: png().toString('base64')},
  });
  const readCalls = () => fs.readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse);
  const stamp = () => { const result = run('stamp.mjs'); assert.equal(result.status, 0, result.stderr); };
  const hash = entry => { const result = run('hash.mjs', JSON.stringify(entry)); assert.equal(result.status, 0, result.stderr); return result.stdout; };
  stamp();
  const fontPath = path.join(root, 'fonts/native.ttf');
  // Capture id -> whether the exporter would render it now.
  const stale = () => {
    const result = run('tool/marketing/export_app_screenshots.mjs', '--plan', '--sf-font', fontPath);
    assert.equal(result.status, 0, result.stderr);
    return Object.fromEntries(JSON.parse(result.stdout).map(item => [item.id, item.render]));
  };
  return {root, write, capture, run, readCalls, stamp, hash, stale};
}

// The catalog as the exporter reads it: an index that resolves each marketing
// id lazily, plus one entry file per marketing capture.
function writeCaptureCatalog(write, entries, {index = ''} = {}) {
  const variable = id => `${id.replace(/_([a-z0-9])/gu, (_, c) => c.toUpperCase())}Capture`;
  for (const entry of entries) {
    write(`test/ui_captures/catalog/entries/${entry.id}.dart`, `${(entry.imports ?? []).map(uri => `import '${uri}';\n`).join('')}
final ${variable(entry.id)} = ScreenCaptureEntry(id: '${entry.id}', routeIds: const <String>['today'],
  marketingFixtureKeys: const <String>['${entry.fixtureKey}'], device: CaptureDevice.iphone17Pro);
`);
  }
  write('test/ui_captures/catalog/screen_capture_catalog.dart', `${entries.map(entry => `import 'entries/${entry.id}.dart';\n`).join('')}
final marketingScreenCaptures = <String, ScreenCaptureEntry Function()>{
${entries.map(entry => `  '${entry.id}': () => ${variable(entry.id)},\n`).join('')}};
${index}`);
  write('test/ui_captures/catalog/screen_capture_entry.dart', 'class ScreenCaptureEntry {}\n');
}

const sync = 'tool/marketing/sync_website_media.mjs';
test('sync checks image bytes, catches replacement and missing files, and repairs copies', t => {
  const f = fixture(t);
  assert.equal(f.run(sync, '--update').status, 0);
  assert.equal(f.run(sync, '--check').status, 0);
  f.write(f.capture.websitePath, 'unreviewed destination bytes');
  let result = f.run(sync, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /differs from the app capture source/);
  fs.unlinkSync(path.join(f.root, f.capture.websitePath));
  result = f.run(sync, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /website image is missing/);
  assert.equal(f.run(sync, '--update').status, 0);
  f.write(f.capture.sourcePath, png(1020, 1964, 1));
  f.stamp();
  assert.equal(f.run(sync, '--check').status, 1);
  assert.equal(f.run(sync, '--update').status, 0);
  assert.equal(f.run(sync, '--check').status, 0);
});

test('product exporter forwards native iOS and final raster scale through the actual capture CLI', t => {
  const f = fixture(t);
  const font = f.write('fonts/Native Font.ttf', 'font fixture');
  const result = f.run('tool/marketing/export_app_screenshots.mjs', '--update', '--ids', 'sample', '--sf-font', font);
  assert.equal(result.status, 0, result.stderr);
  const calls = f.readCalls();
  assert.deepEqual(calls.map(c => c.name), ['flutter', 'dart']);
  const args = calls[0].args;
  for (const expected of ['--dart-define=CAPTURE_PLATFORM=ios', '--dart-define=CAPTURE_DPR=2',
    '--dart-define=CAPTURE_DEVICE_ID=iphone-17-pro', `--dart-define=CAPTURE_SF_FONT=${font}`]) {
    assert.ok(args.includes(expected), expected);
  }
  assert.ok(!args.includes('--update-goldens'));
});

test('review CLI preserves default renderer and rejects invalid platform or font requests', t => {
  const f = fixture(t);
  const cli = 'tool/ui_capture/run_captures.mjs';
  assert.equal(f.run(cli, '--ids', 'sample_screen').status, 0);
  assert.ok(!f.readCalls()[0].args.some(arg => arg.startsWith('--dart-define=CAPTURE_PLATFORM=')));
  assert.equal(f.run(cli, '--platform', 'unknown').status, 64);
  assert.equal(f.run(cli, '--platform', 'ios', '--sf-font', path.join(f.root, 'absent.ttf')).status, 64);
  const font = f.write('fonts/local.ttf', 'font fixture');
  assert.equal(f.run(cli, '--platform', 'android', '--sf-font', font).status, 64);
  assert.equal(f.run('tool/marketing/export_app_screenshots.mjs', '--update', '--sf-font', path.join(f.root, 'absent.ttf')).status, 1);
  assert.equal(f.readCalls().length, 1, 'invalid requests must not run a renderer');
});

// Small valid raster fixtures exercise the wrappers without a Flutter process.
function png(width = 1020, height = 1964, red = 0) {
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels[y * (width * 4 + 1) + 1 + x * 4] = red;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}

test('committed copies cannot hide changed transitive render or asset inputs', t => {
  const f = fixture(t);
  assert.equal(f.run(sync, '--update').status, 0);
  f.write('lib/leaf.dart', 'const title = \'Updated Today\';\n');
  for (const command of ['--check', '--update']) {
    const result = f.run(sync, command);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Capture inputs changed/);
  }
  f.stamp();
  assert.equal(f.run(sync, '--update').status, 0);
  f.write('packages/sample/assets/new.txt', 'new asset membership');
  assert.equal(f.run(sync, '--check').status, 1);
  f.stamp();
  assert.equal(f.run(sync, '--update').status, 0);
  f.write('tool/demo/demo_seed/personas/sample.json', '{"persona":"changed"}');
  assert.equal(f.run(sync, '--check').status, 1);
});

test('unframed, unstamped, and altered PNGs fail before website copy', t => {
  const f = fixture(t);
  f.write(f.capture.sourcePath, png(402, 874));
  let result = f.run(sync, '--update');
  assert.equal(result.status, 1); assert.match(result.stderr, /1020x1964/);
  f.write(f.capture.sourcePath, png());
  result = f.run(sync, '--update');
  assert.equal(result.status, 1); assert.match(result.stderr, /render provenance/);
  f.stamp();
  const bytes = fs.readFileSync(path.join(f.root, f.capture.sourcePath)); bytes[50] ^= 1;
  f.write(f.capture.sourcePath, bytes);
  assert.equal(f.run(sync, '--check').status, 1);
});

test('ambiguous fixture mappings fail instead of choosing the first entry', t => {
  const f = fixture(t);
  const catalog = 'test/ui_captures/catalog/screen_capture_catalog.dart';
  f.write(catalog, fs.readFileSync(path.join(f.root, catalog), 'utf8') + `ScreenCaptureEntry(id: 'duplicate', marketingFixtureKeys: const <String>['salesDemo.sample'])`);
  const result = f.run('tool/marketing/export_app_screenshots.mjs', '--check');
  assert.equal(result.status, 1); assert.match(result.stderr, /exactly one catalog entry/);
});

test("a screen's own widget stales only that screen; the theme stales all; the index stales none", t => {
  const f = fixture(t, {second: true});
  assert.deepEqual(f.stale(), {sample: false, other: false});
  f.write('lib/sample_widget.dart', "import 'theme.dart';\nconst sampleWorld = 'tool/demo/demo_seed/personas/sample.json';\nconst color = accent;\nconst title = 'Changed';\n");
  assert.deepEqual(f.stale(), {sample: true, other: false});
  f.stamp();
  f.write('test/ui_captures/catalog/entries/other_screen.dart', fs.readFileSync(path.join(f.root,
    'test/ui_captures/catalog/entries/other_screen.dart'), 'utf8') + '// reviewed\n');
  assert.deepEqual(f.stale(), {sample: false, other: true});
  f.stamp();
  f.write('lib/theme.dart', 'const accent = 0x00FF00;\n');
  assert.deepEqual(f.stale(), {sample: true, other: true});
  f.stamp();
  // Design tokens style every screen, named or not.
  f.write('packages/catch_tokens/lib/tokens.dart', 'const spacing = 8;\n');
  assert.deepEqual(f.stale(), {sample: true, other: true});
  f.stamp();
  // A review-only entry or a reordered index is not a render input.
  const index = 'test/ui_captures/catalog/screen_capture_catalog.dart';
  f.write(index, fs.readFileSync(path.join(f.root, index), 'utf8') +
    "final screenCaptureCatalog = [ScreenCaptureEntry(id: 'review_only', routeIds: const <String>['today'])];\n");
  assert.deepEqual(f.stale(), {sample: false, other: false});
  // Only the capture whose inputs name a data file depends on it.
  f.write('tool/demo/demo_seed/personas/sample.json', '{"persona":"changed"}');
  assert.deepEqual(f.stale(), {sample: true, other: false});
  f.stamp();
  f.write('tool/demo/demo_seed/scenarios/sample.json', '{"unnamed":"changed"}');
  assert.deepEqual(f.stale(), {sample: false, other: false});
});

test('a marketing entry must live alone in its entry file and be mapped by the index', t => {
  const f = fixture(t);
  const exporter = 'tool/marketing/export_app_screenshots.mjs';
  const index = 'test/ui_captures/catalog/screen_capture_catalog.dart';
  const original = fs.readFileSync(path.join(f.root, index), 'utf8');
  f.write(index, original.replace("() => sampleScreenCapture", "() => otherCapture"));
  let result = f.run(exporter, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /marketingScreenCaptures must map 'sample_screen'/);
  f.write(index, original);
  fs.renameSync(path.join(f.root, 'test/ui_captures/catalog/entries/sample_screen.dart'),
    path.join(f.root, 'test/ui_captures/catalog/entries/today.dart'));
  result = f.run(exporter, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be declared in test\/ui_captures\/catalog\/entries\/sample_screen\.dart/);
});

test('a computed data path cannot hide which file a capture reads', t => {
  const f = fixture(t);
  f.write('lib/sample_widget.dart', "const world = 'tool/demo/demo_seed/personas/${name}.json';\n");
  const result = f.run('hash.mjs', JSON.stringify(f.capture));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Capture data path must be literal/);
});


test('website captions disclose synthetic previews without changing captured pixels or source copy', t => {
  const f = fixture(t);
  assert.equal(f.run(sync, '--update').status, 0);
  const output = JSON.parse(fs.readFileSync(path.join(f.root, 'website/public/assets/app-screenshots/manifest.json'), 'utf8'));
  assert.equal(output.captures[0].caption, 'Fictional app preview. Today');
  const manifestPath = path.join(f.root, 'tool/marketing/capture_manifest.json');
  const source = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(source.captures[0].caption, 'Today');
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.capture.websitePath)), fs.readFileSync(path.join(f.root, f.capture.sourcePath)));
  delete source.previewDisclosure;
  fs.writeFileSync(manifestPath, JSON.stringify(source));
  const result = f.run(sync, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /previewDisclosure is required/);
});


test('unchanged render inputs reuse exact PNG bytes but font and source edits still render', t => {
  const f = fixture(t);
  const exporter = 'tool/marketing/export_app_screenshots.mjs';
  const font = path.join(f.root, 'fonts/native.ttf');
  const original = fs.readFileSync(path.join(f.root, f.capture.sourcePath));
  let result = f.run(exporter, '--update-stale', '--sf-font', font);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(f.root, 'calls.jsonl')));
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.capture.sourcePath)), original);
  const manifestFile = path.join(f.root, 'tool/marketing/capture_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  manifest.captures[0].caption = 'New website caption';
  manifest.captures[0].alt = 'New accessible website description';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.equal(f.run(sync, '--update').status, 0);
  result = f.run(exporter, '--plan', '--sf-font', font);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].render, false);
  f.write('fonts/native.ttf', 'changed native font');
  assert.equal(JSON.parse(f.run(exporter, '--plan', '--sf-font', font).stdout)[0].render, true);
  assert.equal(f.run(exporter, '--update-stale', '--sf-font', font).status, 0);
  assert.equal(f.readCalls().length, 2);
  f.write('lib/leaf.dart', "const title = 'Changed';\n");
  assert.equal(JSON.parse(f.run(exporter, '--plan', '--sf-font', font).stdout)[0].render, true);
});

test('only render fields enter the render hash; presentation fields, known or new, never do', t => {
  // A second entry gives the changed fixtureKey an entry file to resolve to.
  const f = fixture(t, {second: true});
  const base = f.hash(f.capture);
  const presentation = {audience: 'member', surface: 'Explore', alt: 'Changed', caption: 'Changed', walkthroughStep: '2',
    websitePath: 'website/public/assets/app-screenshots/elsewhere.png', placeholderPath: 'elsewhere.svg',
    kind: 'app-screen', scenario: {world: 'host-marketing-india', event: 'event-host-trivia', moment: 'live'},
    pages: ['/host/', '/'], facts: ['booked', 'checkedIn'], disclosure: 'none', replaceBy: 'event-photography',
    someFutureField: {nested: true}};
  assert.equal(f.hash({...f.capture, ...presentation}), base);
  const {audience: _audience, surface: _surface, alt: _alt, caption: _caption, ...bare} = f.capture;
  assert.equal(f.hash(bare), base);
  for (const [field, value] of [['id', 'other'], ['status', 'paused'], ['device', 'pixel-9'],
    ['fixtureKey', 'salesDemo.other'], ['sourcePath', 'artifacts/other.png']]) {
    assert.notEqual(f.hash({...f.capture, [field]: value}), base, field);
  }
});

// Rewrites a capture PNG's caPt provenance record, keeping the PNG valid.
function editProvenance(file, edit) {
  const bytes = fs.readFileSync(file);
  const out = [bytes.subarray(0, 8)];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + length + 12;
    if (type === 'caPt') {
      const data = Buffer.from(JSON.stringify(edit(JSON.parse(bytes.toString('utf8', offset + 8, end - 4)))));
      const payload = Buffer.concat([Buffer.from(type), data]);
      let crc = 0xffffffff;
      for (const byte of payload) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
      const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
      const tail = Buffer.alloc(4); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
      out.push(head, payload, tail);
    } else out.push(bytes.subarray(offset, end));
    offset = end;
  }
  fs.writeFileSync(file, Buffer.concat(out));
}

function recordedList(f, capture) {
  const script = `import fs from 'node:fs'; import {decodeInputFiles} from './tool/marketing/lib/capture_provenance.mjs';
    const c = JSON.parse(process.argv[2]); const b = fs.readFileSync(c.sourcePath); let o = 8, r;
    while (o < b.length) { const n = b.readUInt32BE(o); if (b.toString('ascii', o + 4, o + 8) === 'caPt') r = JSON.parse(b.toString('utf8', o + 8, o + 8 + n)); o += n + 12; }
    process.stdout.write(JSON.stringify(decodeInputFiles(c, r.inputFiles)));`;
  f.write('list.mjs', script);
  const result = f.run('list.mjs', JSON.stringify(capture));
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('the exporter renders each app capture alone and records the files that render executed', t => {
  const f = fixture(t, {second: true});
  const font = path.join(f.root, 'fonts/native.ttf');
  const result = f.run('tool/marketing/export_app_screenshots.mjs', '--update', '--sf-font', font);
  assert.equal(result.status, 0, result.stderr);
  const flutterCalls = f.readCalls().filter(call => call.name === 'flutter');
  assert.equal(flutterCalls.length, 2, 'one render process per capture');
  for (const call of flutterCalls) assert.ok(call.args.some(arg => arg.startsWith('--coverage-path=')));
  const list = recordedList(f, f.capture);
  for (const file of ['lib/sample_widget.dart', 'lib/theme.dart', 'test/ui_captures/catalog/entries/sample_screen.dart',
    'test/ui_captures/capture_runner_test.dart', 'lib/leaf.dart', 'tool/demo/demo_seed/personas/sample.json']) {
    assert.ok(list.includes(file), file);
  }
  for (const file of ['lib/other_widget.dart', 'test/ui_captures/catalog/screen_capture_catalog.dart']) {
    assert.ok(!list.includes(file), file);
  }
  assert.deepEqual(f.stale(), {sample: false, other: false});
});

test('only executed files and their direct imports count; a navigation target two hops away does not', t => {
  const f = fixture(t);
  f.write('lib/sample_widget.dart', "import 'theme.dart';\nimport 'nav_target.dart';\nconst next = targetTitle;\n");
  f.write('lib/nav_target.dart', "import 'nav_deep.dart';\nconst targetTitle = 'Next';\n");
  f.write('lib/nav_deep.dart', "const deepTitle = 'Deep';\n");
  f.stamp();
  assert.deepEqual(f.stale(), {sample: false});
  f.write('lib/nav_deep.dart', "const deepTitle = 'Changed';\n");
  assert.deepEqual(f.stale(), {sample: false});
  // A direct import holds constants the executed widget reads by name.
  f.write('lib/nav_target.dart', "import 'nav_deep.dart';\nconst targetTitle = 'Changed';\n");
  assert.deepEqual(f.stale(), {sample: true});
});

test('a barrel adds only the re-exported files whose names an executed file uses', t => {
  const f = fixture(t);
  f.write('lib/kit.dart', "export 'kit_button.dart';\nexport 'kit_chart.dart';\n");
  f.write('lib/kit_button.dart', "class KitButton {}\n");
  f.write('lib/kit_chart.dart', "class KitChart {}\n");
  f.write('lib/sample_widget.dart', "import 'kit.dart';\nfinal button = KitButton();\n");
  f.stamp();
  f.write('lib/kit_chart.dart', "class KitChart { final int bars = 3; }\n");
  assert.deepEqual(f.stale(), {sample: false});
  f.write('lib/kit_button.dart', "class KitButton { final int size = 2; }\n");
  assert.deepEqual(f.stale(), {sample: true});
});

test('fail closed: an old format, another recipe, a bad list or a missing input is stale', t => {
  const f = fixture(t);
  const file = path.join(f.root, f.capture.sourcePath);
  const exporter = 'tool/marketing/export_app_screenshots.mjs';
  const font = path.join(f.root, 'fonts/native.ttf');
  const reasons = () => JSON.parse(f.run(exporter, '--plan', '--sf-font', font).stdout)[0];
  const cases = [
    [record => { const {inputFiles: _files, inputRecipe: _recipe, ...v1} = record; return {...v1, version: 1}; }, /predates/],
    [record => ({...record, inputRecipe: record.inputRecipe - 1}), /predates/],
    [record => ({...record, inputFiles: 'not deflate data'}), /unreadable|malformed/],
    [record => ({...record, inputFiles: Buffer.from('lib/leaf.dart').toString('base64')}), /unreadable|malformed/],
  ];
  for (const [edit, reason] of cases) {
    f.stamp();
    editProvenance(file, edit);
    const plan = reasons();
    assert.equal(plan.render, true);
    assert.match(plan.reasons.join('\n'), reason);
  }
  f.stamp();
  fs.unlinkSync(path.join(f.root, 'lib/sample_widget.dart'));
  const plan = reasons();
  assert.equal(plan.render, true);
  assert.match(plan.reasons.join('\n'), /missing: lib\/sample_widget\.dart/);
});

test('lcov executed files ignore const constructor heads and files outside the repository', async t => {
  const f = fixture(t);
  f.write('lib/route_only.dart', "class RouteOnly {\n  const RouteOnly({this.id});\n  final String? id;\n}\n");
  f.write('lib/built.dart', "class Built {\n  const Built();\n  int build() => 1;\n}\n");
  f.write('executed_test.mjs', `import {executedFilesFromLcov} from './tool/marketing/lib/capture_provenance.mjs';
    process.stdout.write(JSON.stringify(executedFilesFromLcov(process.argv[2])));`);
  const lcov = ['SF:lib/route_only.dart', 'DA:2,1', 'DA:3,0', 'end_of_record',
    `SF:${path.join(f.root, 'lib/built.dart')}`, 'DA:2,1', 'DA:3,4', 'end_of_record',
    'SF:/elsewhere/pub_cache/lib/x.dart', 'DA:1,1', 'end_of_record'].join('\n');
  const result = f.run('executed_test.mjs', lcov);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['lib/built.dart']);
});
