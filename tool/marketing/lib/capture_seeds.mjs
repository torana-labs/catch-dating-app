import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {canonicalInventory, readProvenance} from "../export_hosted_captures.mjs";
import {readCaptureArchive} from "../import_hosted_captures.mjs";

// Plans a canonical capture run on Linux, before any macOS runner starts.
// Earlier capture bundles (from this repository's PR, merge-queue, main,
// nightly and manual runs) often already hold a render of these exact inputs;
// those PNGs become seeds, and only what is still stale goes to the macOS
// renderer. A PNG is reused when its recorded input fingerprint and font
// match the source exactly, whichever commit rendered it (owner decision,
// 12 Nov 2026: the fingerprint replaces the commit-ancestry rule, so a
// squash-merged PR render still counts). Nothing here is trusted downstream:
// the render and reuse jobs re-verify every seed as they verify a committed PNG.

const manifestPath = "tool/marketing/capture_manifest.json";
export const SEED_LOOKBACK = 20;
// Workflows whose runs upload canonical-marketing bundles: CI's capture lane,
// the Marketing Website release and the capture workflow's own dispatch and
// label runs (a reusable workflow's artifacts belong to its caller's run).
export const PRODUCER_WORKFLOWS = Object.freeze(["ci.yml", "marketing-website.yml", "marketing-captures.yml"]);
const digest = bytes => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;

/**
 * A producer run of this repository whose code also came from it. Fork pull
 * requests are refused; same-repository pull requests, merge-queue, main,
 * nightly and manual runs are accepted.
 */
export function trustedSeedRun(run, {repositoryId, workflowIds}) {
  const file = run?.path?.split("@")[0]?.replace(/^\.github\/workflows\//u, "");
  return PRODUCER_WORKFLOWS.includes(file) && workflowIds.get(file) === run.workflow_id &&
    run.repository?.id === repositoryId && run.head_repository?.id === repositoryId &&
    /^[0-9a-f]{40}$/u.test(run.head_sha ?? "") && Number.isSafeInteger(run.id) && Number.isSafeInteger(run.run_attempt);
}

/** This repository's recent producer runs, newest first. */
export function seedRuns({runs, repositoryId, workflowIds}) {
  assert.ok(Array.isArray(runs), "Missing producer run listing.");
  const unique = new Map(runs.filter(run => trustedSeedRun(run, {repositoryId, workflowIds})).map(run => [run.id, run]));
  return [...unique.values()].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

/** The one capture bundle a run uploaded, by its exact name. */
export function seedArtifact({artifacts, run}) {
  const name = `canonical-marketing-${run.head_sha}-${run.id}-${run.run_attempt}`;
  const matches = (artifacts ?? []).filter(artifact => artifact.name === name && artifact.expired === false &&
    artifact.workflow_run?.id === run.id && /^sha256:[0-9a-f]{64}$/u.test(artifact.digest ?? ""));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * `nativeProbe` is `{fontSha256, runnerImage}` from a macOS probe job: the
 * native font and runner image a render would use now. The nightly run
 * renders everything only when a reused PNG was made with another font or
 * image (or either is unknown); otherwise it plans like any other run.
 */
export async function planHostedCaptures({sourceDir, sourceSha, repository, eventName, request = githubRequest,
  nativeProbe = null}) {
  assert.match(sourceSha ?? "", /^[0-9a-f]{40}$/u, "Full source SHA required.");
  const root = fs.realpathSync(sourceDir);
  const run = (command, args) => spawnSync(command, args, {cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  const git = (...args) => {
    const result = run("git", args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  assert.equal(git("rev-parse", "HEAD"), sourceSha, "Planner source differs from the requested source.");
  const captures = canonicalInventory(JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8")));
  // The source's own exporter judges every candidate, with the source's hashing.
  const stale = () => {
    const result = run(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--plan", "--inputs-only"]);
    assert.equal(result.status, 0, result.stderr || "Capture planning failed.");
    return new Set(JSON.parse(result.stdout).filter(item => item.render).map(item => item.id));
  };
  const seeds = new Map();
  const sources = [];
  {
    const repositoryId = (await request(`repos/${repository}`)).id;
    const workflowIds = new Map();
    const listed = [];
    for (const file of PRODUCER_WORKFLOWS) {
      const workflow = await request(`repos/${repository}/actions/workflows/${file}`);
      workflowIds.set(file, workflow.id);
      listed.push(...(await request(`repos/${repository}/actions/workflows/${workflow.id}/runs?per_page=${SEED_LOOKBACK}`)).workflow_runs);
    }
    const candidates = seedRuns({repositoryId, workflowIds, runs: listed});
    let font = null;
    let consulted = 0;
    let remaining = stale();
    for (const producer of candidates) {
      if (!remaining.size || consulted >= SEED_LOOKBACK) break;
      const artifact = seedArtifact({run: producer, artifacts: (await request(
        `repos/${repository}/actions/runs/${producer.id}/artifacts?per_page=100`)).artifacts});
      if (!artifact) continue;
      consulted += 1;
      const bytes = await request(`repos/${repository}/actions/artifacts/${artifact.id}/zip`, {binary: true});
      if (digest(bytes) !== artifact.digest) continue;
      const wanted = captures.filter(capture => remaining.has(capture.id));
      const entries = readCaptureArchive(bytes, wanted.map(capture => capture.sourcePath), {exact: false});
      const tried = [];
      for (const capture of wanted) {
        const png = entries.get(capture.sourcePath);
        if (!png) continue;
        let provenance;
        try { provenance = readProvenance(png); } catch { continue; }
        if (font && provenance.nativeFontSha256 !== font) continue;
        fs.writeFileSync(path.join(root, capture.sourcePath), png);
        tried.push({capture, png, provenance});
      }
      if (!tried.length) continue;
      remaining = stale();
      for (const {capture, png, provenance} of tried) {
        if (remaining.has(capture.id)) {
          git("checkout", "--", capture.sourcePath);
          continue;
        }
        font ??= provenance.nativeFontSha256;
        seeds.set(capture.id, png);
      }
      if (tried.some(({capture}) => seeds.has(capture.id))) {
        sources.push({artifactId: artifact.id, runId: producer.id, event: producer.event, sourceSha: producer.head_sha});
      }
    }
  }
  let renderIds = [...stale()];
  let nativeChanged = false;
  if (eventName === "schedule") {
    // Linux cannot see the macOS font or image, so the nightly asks the probe.
    // Unknown counts as changed: fail closed and render everything.
    const reused = captures.filter(capture => !renderIds.includes(capture.id)).map(capture => {
      try { return readProvenance(fs.readFileSync(path.join(root, capture.sourcePath))); } catch { return null; }
    });
    nativeChanged = !nativeProbe?.fontSha256 || !nativeProbe?.runnerImage || reused.some(provenance =>
      !provenance || provenance.nativeFontSha256 !== nativeProbe.fontSha256 || provenance.runnerImage !== nativeProbe.runnerImage);
    if (nativeChanged) renderIds = captures.map(capture => capture.id);
  }
  // Linux cannot judge the macOS font. Any render job can therefore discover
  // a stale web capture even when only app inputs changed here. Prepare the
  // Storybook and WebKit whenever that job may need them; reuse needs neither.
  const webRender = renderIds.length > 0 && captures.some(capture => capture.kind === "web-capture");
  return {sourceSha, render: renderIds.length > 0, renderIds, webRender, nativeChanged,
    seeds, seedIds: [...seeds.keys()], seedSources: sources};
}

function githubRequest(endpoint, {binary = false} = {}) {
  const result = spawnSync("gh", ["api", "-H", "Cache-Control: no-cache", endpoint],
    {encoding: binary ? null : "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 120_000});
  assert.equal(result.status, 0, result.stderr?.toString() || "Cannot read capture bundles.");
  return binary ? result.stdout : JSON.parse(result.stdout);
}

/**
 * Writes the plan's seeds under `seedDir` at each capture's sourcePath and
 * reports the plan to the job (`render`, `seeded`) and its summary.
 */
export async function planHostedCapturesForJob({request, env = process.env}) {
  const nativeProbe = env.CAPTURE_NATIVE_FONT_SHA256 || env.CAPTURE_NATIVE_RUNNER_IMAGE
    ? {fontSha256: env.CAPTURE_NATIVE_FONT_SHA256 || null, runnerImage: env.CAPTURE_NATIVE_RUNNER_IMAGE || null} : null;
  const plan = await planHostedCaptures({sourceDir: env.CAPTURE_SOURCE_DIR, sourceSha: request.sourceSha,
    repository: env.GITHUB_REPOSITORY, eventName: env.GITHUB_EVENT_NAME, nativeProbe});
  const manifest = JSON.parse(fs.readFileSync(path.join(env.CAPTURE_SOURCE_DIR, manifestPath), "utf8"));
  for (const [id, png] of plan.seeds) {
    const capture = manifest.captures.find(entry => entry.id === id);
    const destination = path.join(env.CAPTURE_SEED_DIR, capture.sourcePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, png, {flag: "wx"});
  }
  fs.appendFileSync(env.GITHUB_OUTPUT, `render=${plan.render}\nweb_render=${plan.webRender}\nseeded=${plan.seedIds.length > 0}\n`);
  fs.appendFileSync(env.GITHUB_STEP_SUMMARY, (plan.nativeChanged ? "Native font or macOS runner image changed or unknown: rendering everything.\n\n" : "") +
    `Render: ${plan.renderIds.join(", ") || "none"}\n\n` +
    `Reused from earlier CI bundles: ${plan.seedIds.join(", ") || "none"}\n`);
  const {seeds: _seeds, ...summary} = plan;
  return summary;
}
