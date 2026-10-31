import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {CANONICAL_REPOSITORY_ID, canonicalRepository} from '../lib/canonical_repository.mjs';

// Reviewed PR726 bytes. Changing runtime scope requires another source review.
export const release = Object.freeze({
  workflow: '.github/workflows/host-measurement-preview.yml',
  runtimeSource: '30a66b8e1df3ef405b76fa51ada6cc165bd302c9',
  project: 'catch-dating-app-64e51', site: 'catch-host-measurement',
  origin: 'https://catch-host-measurement.web.app',
  files: Object.freeze({
    'measurement-hosting.json': '9424ea8fb358050d881a4c2cbe01b5f3beb0f09afd214128faa5b439a6d6d80f',
    'measurement-runtime/catch-acquisition-runtime.html': '535d7ce950fd66d6ba743ae87b74cf0d1c51a1d7d609e35e72b65f8b162ad94a',
    'measurement-runtime/catch-acquisition-runtime.js': '2fa1f7f59654f0725f3cee742bef7010a8d5f596b683d84788f92b303cb82187',
  }),
});
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const output = 'build/host-measurement-preview';
function command(name, args) {
  const result = spawnSync(name, args, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || `${name} failed`);
  return result.stdout.trim();
}
const github = endpoint => JSON.parse(command('gh', ['api', '-H', 'Cache-Control: no-cache', endpoint]));
export function assertInvocation(env) {
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  const repository = canonicalRepository(env);
  assert.equal(env.GITHUB_WORKFLOW_REF, `${repository}/${release.workflow}@refs/heads/main`);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'Use a new reviewed dispatch after failure');
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/u);
}
export function assertCi(run, sourceSha) {
  assert.equal(run.head_sha, sourceSha);
  assert.equal(run.head_branch, 'main');
  assert.equal(run.event, 'push');
  assert.equal(run.path?.split('@')[0], '.github/workflows/ci.yml');
  assert.equal(run.repository?.id, CANONICAL_REPOSITORY_ID);
  assert.equal(run.head_repository?.id, CANONICAL_REPOSITORY_ID);
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
}
export function verifyFiles(root) {
  assert.ok(fs.lstatSync(root).isDirectory());
  const runtime = path.join(root, 'measurement-runtime');
  assert.ok(fs.lstatSync(runtime).isDirectory(), 'Runtime directory cannot be a link');
  assert.deepEqual(fs.readdirSync(runtime).sort(), ['catch-acquisition-runtime.html', 'catch-acquisition-runtime.js']);
  for (const [name, expected] of Object.entries(release.files)) {
    const file = path.join(root, name);
    assert.ok(fs.lstatSync(file).isFile(), `Non-regular file: ${name}`);
    assert.equal(digest(fs.readFileSync(file)), expected, `Unreviewed runtime bytes: ${name}`);
  }
}
export function prepare(sourceRoot, destination, sourceSha) {
  verifyFiles(sourceRoot);
  assert.match(sourceSha, /^[a-f0-9]{40}$/u);
  assert.ok(!fs.existsSync(destination), 'Release tree already exists');
  fs.mkdirSync(path.join(destination, 'measurement-runtime'), {recursive: true});
  for (const name of Object.keys(release.files)) fs.copyFileSync(path.join(sourceRoot, name), path.join(destination, name));
  fs.writeFileSync(path.join(destination, 'release.json'), JSON.stringify({sourceSha, ...release}, null, 2) + '\n');
  verifyPackage(destination, sourceSha);
}
const packageEntries = ['measurement-hosting.json', 'measurement-runtime', 'release.json'];
function verifyPackageContents(destination, sourceSha, entries) {
  verifyFiles(destination);
  assert.deepEqual(fs.readdirSync(destination).sort(), entries);
  assert.ok(fs.lstatSync(path.join(destination, 'release.json')).isFile());
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination, 'release.json'), 'utf8')), {sourceSha, ...release});
}
export function verifyPackage(destination, sourceSha) {
  verifyPackageContents(destination, sourceSha, packageEntries);
}
export function verifyPostDeployPackage(destination, sourceSha) {
  const cacheDirectory = path.join(destination, '.firebase');
  const hasCache = fs.readdirSync(destination).includes('.firebase');
  verifyPackageContents(destination, sourceSha, hasCache ? [...packageEntries, '.firebase'].sort() : packageEntries);
  if (!hasCache) return;

  assert.ok(fs.lstatSync(cacheDirectory).isDirectory(), 'Firebase cache must be a directory, not a link');
  // The pinned firebase-tools (tool/ci/toolchain.env) writes this hash cache at the config root after uploading the two public files.
  const cacheName = `hosting.${Buffer.from('measurement-runtime').toString('base64').replace(/=+$/u, '')}.cache`;
  assert.deepEqual(fs.readdirSync(cacheDirectory), [cacheName], 'Unexpected Firebase cache contents');
  const cacheFile = path.join(cacheDirectory, cacheName);
  const cacheStat = fs.lstatSync(cacheFile);
  assert.ok(cacheStat.isFile() && cacheStat.size <= 1024, 'Firebase cache must be a bounded regular file');
  const lines = fs.readFileSync(cacheFile, 'utf8').split('\n');
  assert.equal(lines.pop(), '', 'Firebase cache must end with a newline');
  const expectedNames = ['catch-acquisition-runtime.html', 'catch-acquisition-runtime.js'];
  assert.equal(lines.length, expectedNames.length, 'Firebase cache must contain only the two runtime files');
  const names = [];
  for (const line of lines) {
    const parts = line.split(',');
    assert.equal(parts.length, 3, 'Malformed Firebase cache entry');
    const [name, mtime, hash] = parts;
    assert.ok(expectedNames.includes(name), `Unexpected Firebase cache path: ${name}`);
    assert.match(mtime, /^[1-9][0-9]*$/u, 'Invalid Firebase cache timestamp');
    assert.equal(Number(mtime), fs.statSync(path.join(destination, 'measurement-runtime', name)).mtime.getTime(),
      `Stale Firebase cache timestamp: ${name}`);
    assert.match(hash, /^[a-f0-9]{64}$/u, 'Invalid Firebase cache hash');
    // firebase-tools Uploader.hashHandler hashes zipStream(): gzip(level 9) bytes.
    assert.equal(hash, digest(gzipSync(fs.readFileSync(path.join(destination, 'measurement-runtime', name)), {level: 9})),
      `Stale Firebase cache hash: ${name}`);
    names.push(name);
  }
  assert.deepEqual(names.sort(), expectedNames);
}
function authorize() {
  assertInvocation(process.env);
  const repository = canonicalRepository(), sourceSha = process.env.GITHUB_SHA;
  assert.equal(command('git', ['rev-parse', 'HEAD']), sourceSha);
  assert.equal(github(`repos/${repository}/git/ref/heads/main`).object.sha, sourceSha, 'Current main changed');
  command('git', ['merge-base', '--is-ancestor', release.runtimeSource, sourceSha]);
  verifyFiles('website');
  const runs = github(`repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${sourceSha}&event=push&per_page=100`).workflow_runs;
  const latest = [...runs].sort((a, b) => b.id - a.id)[0];
  assert.ok(latest, 'No exact-source main CI');
  const run = github(`repos/${repository}/actions/runs/${latest.id}`);
  assertCi(run, sourceSha);
  console.log(JSON.stringify({sourceSha, ciRunId: run.id, ciRunAttempt: run.run_attempt, runtimeSource: release.runtimeSource}));
}
export function assertResponse(name, bytes, headers, config) {
  assert.equal(digest(bytes), release.files[`measurement-runtime/${name}`], `Serving bytes differ: ${name}`);
  for (const {key, value} of config.hosting.headers[0].headers) assert.equal(headers.get(key), value, `Serving header differs: ${key}`);
  assert.equal(headers.get('set-cookie'), null, 'Static runtime must not set cookies before consent');
}
async function verifyServing() {
  verifyPostDeployPackage(output, process.env.GITHUB_SHA);
  const config = JSON.parse(fs.readFileSync(path.join(output, 'measurement-hosting.json'), 'utf8'));
  const checks = [];
  for (const name of ['catch-acquisition-runtime.html', 'catch-acquisition-runtime.js']) {
    const response = await fetch(`${release.origin}/${name}`, {redirect: 'error', signal: AbortSignal.timeout(30000)});
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assertResponse(name, bytes, response.headers, config);
    checks.push({name, sha256: digest(bytes), status: response.status});
  }
  fs.writeFileSync(`${output}/../host-measurement-serving.json`, JSON.stringify({
    sourceSha: process.env.GITHUB_SHA, runtimeSource: release.runtimeSource, site: release.site,
    verifiedAt: new Date().toISOString(), checks, providerReceiptVerified: false, productionMeasurementEnabled: false,
  }, null, 2) + '\n');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode === 'authorize') authorize();
  else if (mode === 'prepare') prepare('website', output, process.env.GITHUB_SHA);
  else if (mode === 'verify-package') verifyPackage(output, process.env.GITHUB_SHA);
  else if (mode === 'verify-serving') await verifyServing();
  else throw new Error('Expected authorize, prepare, verify-package or verify-serving');
}
