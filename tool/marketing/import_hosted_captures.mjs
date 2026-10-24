#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {canonicalInventory, readProvenance} from "./export_hosted_captures.mjs";
import {validateCaptureBytes} from "./lib/capture_provenance.mjs";
import {buildWebsiteManifest} from "./sync_website_media.mjs";
import {replaceCatalogInventory} from "../design/generate_widget_catalog.mjs";

const manifestPath = "tool/marketing/capture_manifest.json";
const designPath = "tool/marketing/app_screenshots_design_context.json";
const websiteManifestPath = "website/public/assets/app-screenshots/manifest.json";
const savedArchive = "build/ci/imported-marketing-captures.zip";
const maxBytes = 128 * 1024 * 1024;
const digest = bytes => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
const json = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const positive = value => typeof value === "string" && /^[1-9][0-9]*$/u.test(value) && Number.isSafeInteger(Number(value));
// The reusable marketing-captures.yml job; callers prefix it as "<job> / <name>".
export const CAPTURE_PRODUCER_JOB = "Render and validate 12 canonical iPhone captures";

export function validateBinding(binding) {
  assert.match(binding?.repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "Invalid capture repository.");
  const callers = ["ci.yml", "tools-ci.yml", "flutter-ci.yml", "marketing-website.yml", "marketing-captures.yml"];
  assert.ok(callers.some(file => binding.workflowRef?.startsWith(`${binding.repository}/.github/workflows/${file}@refs/`)), "Invalid capture workflow identity.");
  for (const key of ["sourceSha", "workflowSha", "workflowDefinitionSha", "eventSha", "runHeadSha"]) {
    assert.ok(sha(binding[key]), `Invalid capture ${key}.`);
  }
  for (const key of ["artifactId", "runId", "runAttempt"]) assert.ok(positive(binding[key]), `Invalid capture ${key}.`);
  assert.match(binding.artifactDigest ?? "", /^sha256:[a-f0-9]{64}$/u, "Invalid capture artifact digest.");
}

/**
 * The one successful capture job in the binding's exact attempt that was
 * running when the artifact was created. A newer merge to main cancels the
 * older main CI run (ci.yml concurrency) after its captures may already be
 * complete; the job, not the run, is then the evidence.
 */
export function selectCaptureProducerJob({jobs, binding, artifact}) {
  assert.ok(Array.isArray(jobs), "Missing capture run jobs.");
  const created = Date.parse(artifact?.created_at);
  assert.ok(Number.isFinite(created), "Missing capture artifact creation time.");
  const producers = jobs.filter(job => job?.name === CAPTURE_PRODUCER_JOB ||
    (typeof job?.name === "string" && job.name.endsWith(` / ${CAPTURE_PRODUCER_JOB}`)));
  const matches = producers.filter(job => job.run_id === Number(binding.runId) &&
    job.run_attempt === Number(binding.runAttempt) && job.head_sha === binding.runHeadSha &&
    job.status === "completed" && job.conclusion === "success" &&
    Date.parse(job.started_at) <= created && created <= Date.parse(job.completed_at));
  assert.equal(matches.length, 1, "Capture run was cancelled before its capture job succeeded.");
  return matches[0];
}

export function verifyArtifactMetadata({binding, artifact, repositoryId, run, workflow, producerJob = null}) {
  validateBinding(binding);
  assert.ok(Number.isSafeInteger(repositoryId) && repositoryId > 0, "Invalid repository id.");
  assert.equal(artifact?.id, Number(binding.artifactId), "Wrong capture artifact id.");
  assert.equal(artifact.expired, false, "Capture artifact expired.");
  assert.equal(artifact.name, `canonical-marketing-${binding.sourceSha}-${binding.runId}-${binding.runAttempt}`, "Wrong capture artifact name/attempt.");
  assert.equal(artifact.digest, binding.artifactDigest, "Wrong capture artifact digest.");
  assert.equal(artifact.workflow_run?.id, Number(binding.runId), "Wrong capture run.");
  for (const key of ["repository_id", "head_repository_id"]) assert.equal(artifact.workflow_run[key], repositoryId, "Wrong artifact repository.");
  assert.equal(artifact.workflow_run.head_sha, binding.runHeadSha, "Wrong capture run head.");
  assert.equal(run?.id, Number(binding.runId), "Wrong current capture run.");
  assert.equal(run.run_attempt, Number(binding.runAttempt), "Capture artifact belongs to an older run attempt.");
  assert.equal(run.head_sha, binding.runHeadSha, "Wrong current capture source.");
  assert.equal(run.repository?.id, repositoryId, "Wrong current capture repository.");
  assert.equal(run.head_repository?.id, repositoryId, "Foreign capture source repository.");
  const workflowPath = binding.workflowRef.slice(binding.repository.length + 1).split("@")[0];
  assert.equal(run.path?.split("@")[0], workflowPath, "Wrong capture workflow path.");
  assert.ok(Number.isSafeInteger(workflow?.id) && workflow.id > 0, "Missing canonical capture workflow.");
  assert.equal(workflow.path, workflowPath, "Wrong canonical capture workflow path.");
  assert.equal(run.workflow_id, workflow.id, "Wrong capture workflow generation.");
  assert.ok(!["failure", "timed_out", "action_required"].includes(run.conclusion), "Capture run failed.");
  if (run.conclusion === "cancelled") {
    assert.ok(producerJob, "Capture run was cancelled; its successful capture job is required evidence.");
    assert.equal(selectCaptureProducerJob({jobs: [producerJob], binding, artifact}), producerJob);
  }
}

// Python's standard ZIP reader checks local names, decompression bounds/overlap
// and CRCs. Read only the complete allowlist into memory; never extract paths.
export function readCaptureArchive(bytes, expectedNames) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length <= maxBytes && bytes.subarray(0, 4).equals(Buffer.from("PK\x03\x04")), "Invalid capture ZIP.");
  // The manifest, design context and website manifest, two copies of each
  // capture, and the receipt.
  assert.ok(expectedNames.length >= 6 && expectedNames.length % 2 === 0, "Expected capture files plus their receipt.");
  assert.equal(new Set(expectedNames).size, expectedNames.length, "Duplicate expected capture paths.");
  const script = `import base64, io, json, stat, sys, zipfile
allowed = json.loads(sys.argv[1])
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as archive:
    entries = archive.infolist()
    names = [entry.filename for entry in entries]
    assert len(names) == len(allowed) and len(set(names)) == len(names) and set(names) == set(allowed), 'Unexpected, missing or duplicate capture ZIP paths'
    assert sum(entry.file_size for entry in entries) <= 128 * 1024 * 1024, 'Capture ZIP is too large'
    for entry in entries:
        assert not entry.is_dir() and not entry.flag_bits & 1, 'Directory or encrypted capture ZIP entry'
        assert stat.S_IFMT(entry.external_attr >> 16) in (0, stat.S_IFREG), 'Non-regular capture ZIP entry'
        assert entry.file_size <= 16 * 1024 * 1024, 'Capture ZIP entry is too large'
        assert not entry.filename.startswith('/') and '\\\\' not in entry.filename and all(part not in ('', '.', '..') for part in entry.filename.split('/')), 'Unsafe capture ZIP path'
    print(json.dumps({entry.filename: base64.b64encode(archive.read(entry)).decode('ascii') for entry in entries}))
`;
  const result = spawnSync("python3", ["-c", script, JSON.stringify(expectedNames)],
    {input: bytes, maxBuffer: maxBytes * 2, timeout: 30_000});
  assert.equal(result.status, 0, result.stderr?.toString() || "Cannot verify capture ZIP.");
  return new Map(Object.entries(JSON.parse(result.stdout)).map(([file, value]) => [file, Buffer.from(value, "base64")]));
}

function execute(command, args) {
  const result = spawnSync(command, args, {cwd: fromRepo("."), encoding: "utf8", maxBuffer: maxBytes});
  assert.equal(result.status, 0, result.stderr || `${command} failed.`);
  return result.stdout;
}

function sourceFiles() {
  const manifestBytes = fs.readFileSync(fromRepo(manifestPath));
  const manifest = JSON.parse(manifestBytes);
  const captures = canonicalInventory(manifest);
  const generated = [designPath, websiteManifestPath, ...captures.flatMap(c => [c.sourcePath, c.websitePath])];
  return {manifestBytes, manifest, captures, generated, expectedNames: [manifestPath, ...generated, "capture-receipt.json"]};
}

const buildListingOutputs = new Set([
  "website/src/generated/hostListings.json", "website/src/generated/hostListings.demo.json",
]);

export function verifyCaptureFiles({files, binding}) {
  return verifyFiles({files, binding});
}

function verifyFiles({files, binding}, {built = false, toolChecks = false} = {}) {
  validateBinding(binding);
  const context = sourceFiles();
  assert.deepEqual([...files.keys()].sort(), [...context.expectedNames].sort(), "Incomplete capture file set.");
  assert.equal(execute("git", ["rev-parse", "HEAD"]).trim(), binding.sourceSha, "Capture source differs from consumer checkout.");
  assert.ok(!execute("git", ["ls-files", "-v", "-z"]).split("\0").some(entry => /^[a-zS] /u.test(entry)),
    "Capture consumption requires complete source without skip-worktree or assume-unchanged flags.");
  const allowedChanges = new Set([...(built ? buildListingOutputs : []), ...context.generated, "docs/widget_catalog.md", "tool/ui_capture/route_inventory.json"]);
  const changed = execute("git", ["diff", "HEAD", "--name-only", "-z"]).split("\0").filter(Boolean);
  assert.deepEqual(changed.filter(file => !allowedChanges.has(file)), [], "Capture consumer authored source differs from its commit.");
  if (changed.includes("docs/widget_catalog.md")) {
    assert.equal(replaceCatalogInventory(fs.readFileSync(fromRepo("docs/widget_catalog.md"), "utf8"), ""),
      replaceCatalogInventory(execute("git", ["show", "HEAD:docs/widget_catalog.md"]), ""), "Authored catalog guidance changed.");
  }
  const sourceRoots = ["lib", "website/src", "website/public", "admin/src", "tool", "test", "design", "contracts", "docs", "assets",
    ":(glob)apps/*/lib/**", ":(glob)packages/*/lib/**", ":(glob)packages/*/src/**"];
  const untracked = execute("git", ["ls-files", "--others", "-z", "--", ...sourceRoots]).split("\0").filter(Boolean);
  // Tools bootstraps this standalone analyzer package, and installs the pinned
  // import-graph tool (npm ci --prefix tool/impact), after strict import. These
  // are their only generated dependency outputs; authored files and every
  // actual capture input remain checked against the source and capture hashes.
  const impactModules = "tool/impact/node_modules";
  const bootstrapOutput = file => file.startsWith("tool/widget_dedupe/.dart_tool/") ||
    file === "tool/widget_dedupe/pubspec.lock" || file.startsWith(`${impactModules}/`);
  if (toolChecks) {
    const installed = untracked.filter(file => file.startsWith(`${impactModules}/`));
    if (installed.length) {
      let directory = fromRepo(".");
      for (const segment of impactModules.split("/")) {
        directory = path.join(directory, segment);
        const stat = fs.lstatSync(directory);
        assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `Bootstrap install is not a plain directory: ${impactModules}`);
      }
    }
    for (const file of untracked.filter(bootstrapOutput)) {
      if (!file.startsWith(`${impactModules}/`)) {
        destination(file);
        continue;
      }
      // npm links package binaries under node_modules/.bin; each must stay inside.
      const real = fs.realpathSync(fromRepo(file));
      assert.ok(real.startsWith(`${fs.realpathSync(fromRepo(impactModules))}${path.sep}`),
        `Bootstrap output escapes its install: ${file}`);
    }
  }
  assert.deepEqual(untracked.filter(file => !(toolChecks && bootstrapOutput(file))), [],
    "Untracked consumer source cannot enter the website build.");
  const receipt = JSON.parse(files.get("capture-receipt.json"));
  assert.equal(receipt.version, 2, "Unsupported capture receipt.");
  assert.equal(receipt.runUrl, `https://github.com/${binding.repository}/actions/runs/${binding.runId}/attempts/${binding.runAttempt}`, "Wrong capture run URL.");
  for (const key of ["sourceSha", "workflowSha", "workflowDefinitionSha", "repository", "runId", "runAttempt"]) {
    assert.equal(receipt[key], binding[key], `Capture receipt ${key} mismatch.`);
  }
  assert.equal(receipt.sourceTree, execute("git", ["rev-parse", "HEAD^{tree}"]).trim(), "Wrong capture source tree.");
  assert.equal(receipt.request?.eventSha, binding.eventSha, "Wrong capture request source.");
  assert.ok(["pull_request", "push", "merge_group", "schedule", "workflow_dispatch"].includes(receipt.request.eventName), "Unsupported capture request event.");
  assert.ok(receipt.request.mode === undefined || receipt.request.mode === "automatic", "Unsupported capture request mode.");
  assert.equal(receipt.request.runHeadSha, binding.runHeadSha, "Wrong capture API head binding.");
  if (receipt.request.eventName === "pull_request") {
    const parents = execute("git", ["rev-list", "--parents", "-n", "1", binding.eventSha]).trim().split(" ").slice(1);
    assert.ok(parents.includes(binding.runHeadSha), "Capture PR head is not a parent of the tested merge source.");
    assert.equal(binding.sourceSha, receipt.request.mode === "automatic" ? binding.eventSha : binding.runHeadSha,
      "Capture PR source does not match its request mode.");
  } else assert.equal(binding.runHeadSha, binding.eventSha, "Capture event source and API head differ.");
  if (receipt.request.mode === "automatic") {
    assert.equal(binding.sourceSha, binding.eventSha, "Automatic capture source differs from the tested event.");
    assert.equal(binding.workflowSha, binding.eventSha, "Automatic controller differs from tested source.");
  }
  for (const key of ["sourceSha", "workflowSha", "workflowDefinitionSha"]) assert.equal(receipt.request[key], binding[key], `Wrong request ${key}.`);
  if (receipt.request.mode === "automatic") assert.equal(receipt.request.workflowRef, binding.workflowRef, "Wrong automatic capture caller.");
  assert.equal(receipt.exporterSha256, digest(Buffer.from(execute("git", ["show", `${binding.workflowSha}:tool/marketing/export_hosted_captures.mjs`]))).slice(7), "Wrong exporter controller bytes.");
  const pins = fs.readFileSync(fromRepo("tool/ci/toolchain.env"), "utf8");
  assert.equal(receipt.toolchain?.node?.replace(/^v/u, "").split(".")[0], pins.match(/^NODE_VERSION=(.+)$/mu)?.[1], "Wrong capture Node toolchain.");
  assert.equal(receipt.toolchain?.flutter?.frameworkVersion, pins.match(/^FLUTTER_VERSION=(.+)$/mu)?.[1], "Wrong capture Flutter toolchain.");
  assert.ok(files.get(manifestPath).equals(context.manifestBytes), "Authored capture manifest differs from consumer source.");
  assert.deepEqual(receipt.files?.map(file => file.path).sort(), context.expectedNames.filter(file => file !== "capture-receipt.json").sort(), "Incomplete or duplicate receipt inventory.");
  for (const file of receipt.files) {
    const bytes = files.get(file.path);
    assert.equal(bytes.length, file.bytes, `Capture byte length differs: ${file.path}`);
    assert.equal(digest(bytes).slice(7), file.sha256, `Capture hash differs: ${file.path}`);
  }
  assert.deepEqual(receipt.captures?.map(c => c.id).sort(), context.captures.map(c => c.id).sort(), "Incomplete or duplicate capture records.");
  const fontHashes = new Set();
  const design = JSON.parse(execute(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--design-json"]));
  for (const capture of context.captures) {
    const bytes = files.get(capture.sourcePath);
    const catalogId = design.captures.find(c => c.id === capture.id)?.captureId;
    assert.ok(catalogId, `Missing authoritative catalog capture: ${capture.id}`);
    assert.deepEqual(validateCaptureBytes(capture, catalogId, bytes), [], `Invalid capture: ${capture.id}`);
    const provenance = readProvenance(bytes);
    const record = receipt.captures.find(c => c.id === capture.id);
    for (const key of ["sourcePath", "websitePath"]) assert.equal(record[key], capture[key], "Wrong canonical capture path.");
    assert.deepEqual(record.provenance, provenance, "Receipt and embedded provenance differ.");
    assert.equal(record.verifiedSourceSha, binding.sourceSha, "Capture was not verified against consumer source.");
    assert.ok(["rendered", "reused"].includes(record.disposition), "Unknown capture disposition.");
    if (record.disposition === "rendered") assert.equal(provenance.sourceRevision, binding.sourceSha, "Wrong render source.");
    else execute("git", ["merge-base", "--is-ancestor", provenance.sourceRevision, binding.sourceSha]);
    fontHashes.add(provenance.nativeFontSha256);
    assert.ok(bytes.equals(files.get(capture.websitePath)), "Website capture differs from canonical render.");
  }
  assert.equal(fontHashes.size, 1, "Capture bundle mixes native fonts.");
  assert.ok(files.get(designPath).equals(json(design)), "Capture design context differs from source.");
  assert.ok(files.get(websiteManifestPath).equals(json(buildWebsiteManifest(context.manifest))), "Website capture copy differs from authored source.");
  return {...context, receipt};
}

function githubRequest(endpoint, {binary = false} = {}) {
  const result = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache", endpoint],
    {encoding: binary ? null : "utf8", maxBuffer: maxBytes, timeout: 60_000});
  assert.equal(result.status, 0, result.stderr?.toString() || "Cannot read exact capture artifact.");
  return binary ? result.stdout : JSON.parse(result.stdout);
}

export async function downloadCaptureArtifact({binding, request = githubRequest}) {
  validateBinding(binding);
  const base = `repos/${binding.repository}`;
  const repository = await request(base);
  const artifact = await request(`${base}/actions/artifacts/${binding.artifactId}`);
  const workflowFile = binding.workflowRef.split("/.github/workflows/")[1].split("@")[0];
  const workflow = await request(`${base}/actions/workflows/${workflowFile}`);
  let producerJob = null;
  const producerFor = async (candidate) => {
    if (candidate?.conclusion !== "cancelled") return null;
    if (!producerJob) {
      const page = await request(`${base}/actions/runs/${binding.runId}/attempts/${binding.runAttempt}/jobs?per_page=100`);
      assert.ok(Array.isArray(page?.jobs) && page.total_count === page.jobs.length, "Incomplete capture run job listing.");
      producerJob = selectCaptureProducerJob({jobs: page.jobs, binding, artifact});
    }
    return producerJob;
  };
  const run = await request(`${base}/actions/runs/${binding.runId}`);
  verifyArtifactMetadata({binding, artifact, repositoryId: repository.id, run, workflow, producerJob: await producerFor(run)});
  const bytes = await request(`${base}/actions/artifacts/${binding.artifactId}/zip`, {binary: true});
  assert.equal(digest(bytes), binding.artifactDigest, "Downloaded capture ZIP digest differs.");
  const current = await request(`${base}/actions/runs/${binding.runId}`);
  verifyArtifactMetadata({binding, artifact, repositoryId: repository.id, run: current, workflow,
    producerJob: await producerFor(current)});
  return bytes;
}

function destination(relative, {allowMissing = false} = {}) {
  let current = fromRepo(".");
  const segments = relative.split("/");
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current, {throwIfNoEntry: false});
    if (!stat) { assert.ok(allowMissing, `Missing capture destination: ${relative}`); continue; }
    assert.ok(!stat.isSymbolicLink(), `Capture destination is a symlink: ${relative}`);
    assert.ok(index === segments.length - 1 ? stat.isFile() : stat.isDirectory(), `Invalid capture destination: ${relative}`);
  }
  return current;
}

export function importCaptureArchive({bytes, binding}) {
  assert.equal(digest(bytes), binding.artifactDigest, "Capture ZIP digest differs.");
  const files = readCaptureArchive(bytes, sourceFiles().expectedNames);
  const context = verifyCaptureFiles({files, binding});
  const destinations = context.generated.map(file => destination(file));
  const archiveDestination = destination(savedArchive, {allowMissing: true});
  fs.mkdirSync(path.dirname(archiveDestination), {recursive: true});
  // Every artifact, source, path and byte check completes before the first write.
  for (const [index, file] of context.generated.entries()) {
    const temporary = `${destinations[index]}.capture-${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporary, files.get(file), {flag: "wx"});
      fs.renameSync(temporary, destinations[index]);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  const temporaryArchive = `${archiveDestination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryArchive, bytes, {flag: "wx"});
    fs.renameSync(temporaryArchive, archiveDestination);
  } finally {
    if (fs.existsSync(temporaryArchive)) fs.unlinkSync(temporaryArchive);
  }
  return context.receipt;
}

export function verifyImportedCaptureBytes({binding}) {
  const bytes = fs.readFileSync(destination(savedArchive));
  assert.equal(digest(bytes), binding.artifactDigest, "Retained capture ZIP digest differs.");
  const files = readCaptureArchive(bytes, sourceFiles().expectedNames);
  const context = verifyFiles({files, binding}, {toolChecks: true});
  for (const file of context.generated) {
    assert.ok(fs.readFileSync(destination(file)).equals(files.get(file)),
      `Imported capture output differs from verified artifact: ${file}`);
  }
  return {sourceSha: binding.sourceSha, artifactId: binding.artifactId, verifiedFiles: context.generated.length};
}

export function verifyBuiltCaptureBytes({binding}) {
  const bytes = fs.readFileSync(fromRepo(savedArchive));
  assert.equal(digest(bytes), binding.artifactDigest, "Retained capture ZIP digest differs.");
  const files = readCaptureArchive(bytes, sourceFiles().expectedNames);
  const context = verifyFiles({files, binding}, {built: true});
  for (const file of [websiteManifestPath, ...context.captures.map(c => c.websitePath)]) {
    const target = file.replace("website/public/", "website/dist/");
    assert.ok(fs.readFileSync(destination(target)).equals(files.get(file)), `Built website capture differs from verified input: ${file}`);
  }
  return {sourceSha: binding.sourceSha, artifactId: binding.artifactId, verifiedFiles: context.captures.length + 1};
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, "Usage: import_hosted_captures.mjs --import|--check-dist|--verify-imported (CAPTURE_BINDING required)");
    const binding = JSON.parse(process.env.CAPTURE_BINDING);
    assert.equal(binding.repository, process.env.GITHUB_REPOSITORY, "Consumer repository differs.");
    assert.equal(binding.sourceSha, process.env.GITHUB_SHA, "Consumer source differs.");
    if (process.argv[2] === "--import") {
      const bytes = await downloadCaptureArtifact({binding});
      const receipt = importCaptureArchive({bytes, binding});
      console.log(`Imported ${receipt.captures.length} verified exact-source captures.`);
    } else if (process.argv[2] === "--verify-imported") {
      console.log(JSON.stringify(verifyImportedCaptureBytes({binding})));
    } else {
      assert.equal(process.argv[2], "--check-dist", "Unknown capture consumer command.");
      console.log(JSON.stringify(verifyBuiltCaptureBytes({binding})));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
