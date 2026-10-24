#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const manifestPath = "tool/marketing/capture_manifest.json";
const designPath = "tool/marketing/app_screenshots_design_context.json";
const websiteManifestPath = "website/public/assets/app-screenshots/manifest.json";
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

export function resolveCaptureRequest({eventName, event, repository, runSha, workflowDefinitionSha,
  automaticSourceSha = "", workflowRef}) {
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? "") || event?.repository?.full_name !== repository) {
    throw new Error("Capture request repository does not match the workflow repository.");
  }
  let sourceSha;
  let workflowSha;
  let prNumber;
  if (automaticSourceSha !== "") {
    const callers = ["ci.yml", "tools-ci.yml", "flutter-ci.yml", "marketing-website.yml"];
    if (automaticSourceSha !== runSha || !callers.some(file =>
      workflowRef?.startsWith(`${repository}/.github/workflows/${file}@refs/`))) {
      throw new Error("Automatic captures require the actual caller source SHA and an existing CI consumer workflow.");
    }
    if (!["pull_request", "push", "merge_group", "schedule", "workflow_dispatch"].includes(eventName)) {
      throw new Error("Unsupported automatic capture event.");
    }
    if (eventName === "pull_request" && (event.pull_request?.state !== "open" ||
        event.pull_request.base?.ref !== "main" || event.pull_request.base?.repo?.full_name !== repository ||
        event.pull_request.head?.repo?.full_name !== repository)) {
      throw new Error("Automatic PR captures require an open same-repository PR into main.");
    }
    if (eventName === "push" && event.after !== runSha) throw new Error("Push source differs from the caller SHA.");
    if (eventName === "merge_group" && event.merge_group?.head_sha !== runSha) {
      throw new Error("Merge-group source differs from the caller SHA.");
    }
    sourceSha = automaticSourceSha;
    workflowSha = runSha;
  } else if (eventName === "workflow_dispatch") {
    sourceSha = event.inputs?.source_sha;
    workflowSha = runSha;
  } else if (eventName === "pull_request") {
    const pr = event.pull_request;
    if (event.action !== "labeled" || event.label?.name !== "capture:requested" ||
        pr?.state !== "open" || pr.base?.ref !== "main" ||
        pr.base?.repo?.full_name !== repository || pr.head?.repo?.full_name !== repository ||
        !Number.isSafeInteger(pr.number) || pr.number < 1 || event.number !== pr.number) {
      throw new Error("Requires capture:requested on an open same-repository PR into main.");
    }
    sourceSha = pr.head.sha;
    workflowSha = pr.base.sha;
    prNumber = pr.number;
  } else {
    throw new Error("Unsupported capture request event.");
  }
  const runHeadSha = eventName === "pull_request" ? event.pull_request?.head?.sha : runSha;
  for (const sha of [sourceSha, workflowSha, runSha, workflowDefinitionSha, runHeadSha]) {
    if (!/^[a-f0-9]{40}$/u.test(sha ?? "")) throw new Error("Full immutable capture request SHAs required.");
  }
  return {eventName, sourceSha, workflowSha, workflowDefinitionSha, eventSha: runSha, runHeadSha,
    ...(automaticSourceSha !== "" ? {mode: "automatic", workflowRef} : {}),
    ...(prNumber ? {prNumber, label: "capture:requested"} : {})};
}

function requestFromEnvironment() {
  const request = resolveCaptureRequest({eventName: process.env.GITHUB_EVENT_NAME,
    event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
    repository: process.env.GITHUB_REPOSITORY, runSha: process.env.GITHUB_SHA,
    workflowDefinitionSha: process.env.CAPTURE_WORKFLOW_DEFINITION_SHA,
    automaticSourceSha: process.env.CAPTURE_AUTOMATIC_SOURCE_SHA ?? "",
    workflowRef: process.env.GITHUB_WORKFLOW_REF});
  if (request.sourceSha !== process.env.CAPTURE_SOURCE_SHA ||
      request.workflowSha !== process.env.CAPTURE_WORKFLOW_SHA) {
    throw new Error("Capture environment differs from the immutable event request.");
  }
  const controller = spawnSync("git", ["rev-parse", "HEAD"], {encoding: "utf8"});
  if (controller.status !== 0 || controller.stdout.trim() !== request.workflowSha) {
    throw new Error("Exporter controller checkout does not match the request.");
  }
  return request;
}

// The manifest decides how many captures there are. The bound keeps one bundle
// well inside the importer's archive limits.
export const MAX_CAPTURES = 100;

export function canonicalInventory(manifest) {
  const count = manifest.captures?.length;
  if (!Number.isInteger(count) || count < 1 || count > MAX_CAPTURES) {
    throw new Error(`Expected 1 to ${MAX_CAPTURES} canonical captures.`);
  }
  const ids = new Set();
  const fixtures = new Set();
  for (const capture of manifest.captures) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(capture.id) || ids.has(capture.id) ||
        fixtures.has(capture.fixtureKey) || capture.status !== "active" ||
        capture.device !== "iphone-17-pro" ||
        capture.sourcePath !== `artifacts/marketing/app-screenshots/${capture.id}.png` ||
        capture.websitePath !== `website/public/assets/app-screenshots/${capture.id}.png`) {
      throw new Error("Invalid, duplicate or unsafe canonical capture inventory.");
    }
    ids.add(capture.id);
    fixtures.add(capture.fixtureKey);
  }
  return manifest.captures;
}

function regularFile(root, relative) {
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink refused: ${relative}`);
  }
  if (!fs.statSync(current).isFile()) throw new Error(`Expected regular file: ${relative}`);
  return current;
}

// Canonical --check verifies PNG structure, CRCs, frame, pixels and input hash
// before this reader extracts the additional exact-source receipt.
export function readProvenance(bytes) {
  const records = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error("Truncated PNG provenance.");
    if (bytes.toString("ascii", offset + 4, offset + 8) === "caPt") {
      records.push(JSON.parse(bytes.toString("utf8", offset + 8, end - 4)));
    }
    offset = end;
  }
  if (records.length !== 1) throw new Error("Expected one canonical PNG provenance record.");
  return records[0];
}

export function exportHostedCaptures({sourceDir, sourceSha, outputDir, workflowSha,
  repository, runId, runAttempt, request, platform = process.platform,
  sfFont = "/System/Library/Fonts/SFNS.ttf"}) {
  for (const sha of [sourceSha, workflowSha]) {
    if (!/^[a-f0-9]{40}$/u.test(sha ?? "")) throw new Error("Full immutable source/workflow SHA required.");
  }
  if (request && (request.sourceSha !== sourceSha || request.workflowSha !== workflowSha)) {
    throw new Error("Capture receipt request does not match source/controller identity.");
  }
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? "") ||
      !/^[1-9][0-9]*$/u.test(runId ?? "") || !/^[1-9][0-9]*$/u.test(runAttempt ?? "")) {
    throw new Error("Repository, run ID and attempt required.");
  }
  if (platform !== "darwin") throw new Error("Hosted export requires macOS and its native SF font.");
  const root = fs.realpathSync(sourceDir);
  if (!path.isAbsolute(outputDir) || fs.existsSync(outputDir) ||
      outputDir === root || outputDir.startsWith(`${root}${path.sep}`)) {
    throw new Error("Output must be a new absolute directory outside the source checkout.");
  }
  const execute = (command, args, capture = false) => {
    const result = spawnSync(command, args, {cwd: root, encoding: "utf8",
      stdio: capture ? "pipe" : "inherit"});
    if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr ?? result.error ?? result.status}`);
    return result.stdout?.trim();
  };
  const git = (...args) => execute("git", args, true);
  const assertSource = () => {
    if (git("rev-parse", "HEAD") !== sourceSha) throw new Error("Checkout does not match the selected source SHA.");
  };
  assertSource();
  if (git("status", "--porcelain", "--untracked-files=normal")) throw new Error("Source checkout must be clean before capture.");
  const captures = canonicalInventory(JSON.parse(fs.readFileSync(regularFile(root, manifestPath), "utf8")));
  const generatedPaths = [designPath, websiteManifestPath,
    ...captures.flatMap(capture => [capture.sourcePath, capture.websitePath])];
  for (const file of [manifestPath, ...generatedPaths]) {
    regularFile(root, file);
    git("ls-files", "--error-unmatch", "--", file);
  }
  const fontHash = sha256(fs.readFileSync(sfFont));
  const flutter = JSON.parse(execute("flutter", ["--version", "--machine"], true));
  const pins = fs.readFileSync(regularFile(root, "tool/ci/toolchain.env"), "utf8");
  const pin = key => pins.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1];
  if (flutter.frameworkVersion !== pin("FLUTTER_VERSION") ||
      process.versions.node.split(".")[0] !== pin("NODE_VERSION")) {
    throw new Error("Installed Node/Flutter versions do not match source toolchain pins.");
  }
  // Reuse only current-input, current-font PNGs, byte-for-byte. Never stamp an
  // old image with a new source identity. Older source exporters retain the
  // original render-all path until they support the checked planning protocol.
  const exporterHelp = execute(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--help"], true);
  const plan = exporterHelp.includes("--update-stale")
    ? JSON.parse(execute(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--plan", "--sf-font", sfFont], true))
    : captures.map(capture => ({id: capture.id, render: true}));
  if (!Array.isArray(plan) || plan.length !== captures.length ||
      new Set(plan.map(item => item.id)).size !== captures.length ||
      plan.some(item => typeof item.render !== "boolean" || !captures.some(c => c.id === item.id))) {
    throw new Error("Invalid or incomplete capture reuse plan.");
  }
  const renderIds = new Set(plan.filter(item => item.render).map(item => item.id));
  const reusedBytes = new Map(captures.filter(c => !renderIds.has(c.id)).map(c =>
    [c.id, fs.readFileSync(regularFile(root, c.sourcePath))]));
  for (const capture of captures) {
    if (!renderIds.has(capture.id)) {
      const origin = readProvenance(reusedBytes.get(capture.id)).sourceRevision;
      if (!/^[a-f0-9]{40}$/u.test(origin ?? "")) throw new Error("Invalid original render revision.");
      git("merge-base", "--is-ancestor", origin, sourceSha);
      continue;
    }
    // A failed/no-op renderer must never fall back to an old selected output.
    fs.unlinkSync(path.join(root, capture.sourcePath));
    fs.unlinkSync(path.join(root, capture.websitePath));
  }
  for (const file of [designPath, websiteManifestPath]) fs.unlinkSync(path.join(root, file));
  const commands = [
    ...(renderIds.size ? [["tool/marketing/export_app_screenshots.mjs", "--update",
      "--ids", [...renderIds].join(","), "--sf-font", sfFont]] : []),
    ["tool/marketing/export_app_screenshots.mjs", "--update-design-json"],
    ["tool/marketing/sync_website_media.mjs", "--update"],
    ["tool/marketing/export_app_screenshots.mjs", "--check"],
    ["tool/marketing/export_app_screenshots.mjs", "--check-design-json"],
    ["tool/marketing/sync_website_media.mjs", "--check"],
  ];
  for (const args of commands) execute(process.execPath, args);
  assertSource();
  const allowed = new Set(generatedPaths);
  for (const file of git("diff", "--name-only", "HEAD", "-z").split("\0").filter(Boolean)) {
    if (!allowed.has(file)) throw new Error(`Capture changed source or goldens: ${file}`);
  }
  const records = captures.map(capture => {
    const bytes = fs.readFileSync(regularFile(root, capture.sourcePath));
    const provenance = readProvenance(bytes);
    if ((renderIds.has(capture.id) && provenance.sourceRevision !== sourceSha) ||
        provenance.nativeFontSha256 !== fontHash) {
      throw new Error(`Capture has a different source revision or font: ${capture.id}`);
    }
    if (reusedBytes.has(capture.id) && !bytes.equals(reusedBytes.get(capture.id))) {
      throw new Error(`Reused capture bytes changed: ${capture.id}`);
    }
    if (!bytes.equals(fs.readFileSync(regularFile(root, capture.websitePath)))) {
      throw new Error(`Website copy differs: ${capture.id}`);
    }
    return {id: capture.id, sourcePath: capture.sourcePath, websitePath: capture.websitePath, provenance,
      disposition: renderIds.has(capture.id) ? "rendered" : "reused", verifiedSourceSha: sourceSha};
  });
  const files = [manifestPath, ...generatedPaths].map(file => {
    const bytes = fs.readFileSync(regularFile(root, file));
    return {path: file, bytes: bytes.length, sha256: sha256(bytes)};
  });
  const receipt = {version: 2, kind: "canonical marketing export; synthetic fixture evidence",
    sourceSha, sourceTree: git("rev-parse", "HEAD^{tree}"), workflowSha, repository, runId, runAttempt,
    ...(request ? {workflowDefinitionSha: request.workflowDefinitionSha, request} : {}),
    runUrl: `https://github.com/${repository}/actions/runs/${runId}/attempts/${runAttempt}`,
    exporterSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    toolchain: {node: process.version, flutter, os: execute("sw_vers", [], true),
      architecture: process.arch, runnerImage: process.env.ImageVersion ?? null},
    commands, captures: records, files};
  fs.mkdirSync(outputDir, {recursive: true});
  for (const file of files) {
    const destination = path.join(outputDir, file.path);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(root, file.path), destination);
  }
  fs.writeFileSync(path.join(outputDir, "capture-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const request = requestFromEnvironment();
    if (process.argv.includes("--check-request")) {
      console.log(JSON.stringify(request));
    } else {
      const receipt = exportHostedCaptures({sourceDir: process.env.CAPTURE_SOURCE_DIR,
        sourceSha: request.sourceSha, outputDir: process.env.CAPTURE_OUTPUT_DIR,
        workflowSha: request.workflowSha, repository: process.env.GITHUB_REPOSITORY,
        runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, request});
      console.log(`Validated ${receipt.captures.length} captures from ${receipt.sourceSha}.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
