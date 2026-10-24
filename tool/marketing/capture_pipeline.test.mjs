import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import test from 'node:test';
import {fromRepo} from '../lib/repo_paths.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catch-capture-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, content) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
    return file;
  };
  for (const name of ['tool/lib/repo_paths.mjs', 'tool/marketing/sync_website_media.mjs',
    'tool/marketing/export_app_screenshots.mjs', 'tool/marketing/lib/capture_provenance.mjs', 'tool/ui_capture/run_captures.mjs']) {
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
  write('tool/marketing/capture_manifest.json', JSON.stringify({version: 1, updated: '2026-09-21', previewDisclosure: 'Fictional app preview.', captures: [capture]}));
  write(capture.sourcePath, png());
  write('packages/sample/pubspec.yaml', 'name: sample\nflutter:\n  assets:\n    - assets/\n');
  write('packages/sample/assets/image.txt', 'asset fixture');
  write('pubspec.yaml', 'name: catch_dating_app\n');
  write('pubspec.lock', 'pinned dependencies');
  write('tool/ci/toolchain.env', 'FLUTTER_VERSION=fixture');
  write('tool/demo/demo_seed/scenarios/sample.json', '{}');
  write('tool/demo/demo_seed/personas/sample.json', '{}');
  write('test/ui_captures/capture_runner_test.dart', "import 'package:catch_dating_app/parent.dart';\n");
  write('lib/parent.dart', "export 'leaf.dart';\n");
  write('lib/leaf.dart', 'const title = \'Today\';\n');
  write('test/ui_captures/flutter_test_config.dart', '');
  write('tool/marketing/frame_device_capture.dart', '');
  write('test/ui_captures/catalog/screen_capture_catalog.dart', `
    ScreenCaptureEntry(id: 'sample_screen', routeIds: const <String>['today'],
      marketingFixtureKeys: const <String>['salesDemo.sample'], device: CaptureDevice.iphone17Pro)
  `);
  const calls = path.join(root, 'calls.jsonl');
  // Stub only external render/frame executables. The actual Node wrappers run.
  const fakeCommand = name => {
    const file = write(`bin/${name}`, `#!${process.execPath}\n` +
      (name === 'dart' ? `const args=process.argv.slice(2); const output=args[args.indexOf('--output')+1]; require('node:fs').writeFileSync(output,Buffer.from(process.env.CAPTURE_TEST_PNG,'base64'));\n` : '') +
      `require('node:fs').appendFileSync(process.env.CAPTURE_TEST_CALLS, JSON.stringify({name: ${JSON.stringify(name)}, args: process.argv.slice(2)})+'\\n');\n`);
    fs.chmodSync(file, 0o755);
  };
  fakeCommand('flutter');
  fakeCommand('dart');
  const git = write('bin/git', `#!${process.execPath}\nprocess.stdout.write('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n');\n`);
  fs.chmodSync(git, 0o755);
  const font = write('fonts/native.ttf', 'native font fixture');
  write('stamp.mjs', `import {stampCapture} from './tool/marketing/lib/capture_provenance.mjs'; import fs from 'node:fs'; stampCapture(JSON.parse(fs.readFileSync('tool/marketing/capture_manifest.json')).captures[0], 'sample_screen', 'fonts/native.ttf');`);
  write('hash.mjs', `import {captureInputHash} from './tool/marketing/lib/capture_provenance.mjs'; process.stdout.write(captureInputHash(JSON.parse(process.argv[2])));`);
  const run = (script, ...args) => spawnSync(process.execPath, [path.join(root, script), ...args], {
    encoding: 'utf8', cwd: root,
    env: {...process.env, PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`, CAPTURE_TEST_CALLS: calls, CAPTURE_TEST_PNG: png().toString('base64')},
  });
  const readCalls = () => fs.readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse);
  const stamp = () => { const result = run('stamp.mjs'); assert.equal(result.status, 0, result.stderr); };
  const hash = entry => { const result = run('hash.mjs', JSON.stringify(entry)); assert.equal(result.status, 0, result.stderr); return result.stdout; };
  stamp();
  return {root, write, capture, run, readCalls, stamp, hash};
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
  const f = fixture(t);
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
