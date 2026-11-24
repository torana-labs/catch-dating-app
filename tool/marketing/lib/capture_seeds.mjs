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
// Runs listed per producer workflow. CI runs dozens of times an hour, so a
// short listing loses a fresh render within minutes and the next PR renders
// everything again on macOS.
export const SEED_RUN_LISTING = 100;
// Most bundles opened per plan.
export const SEED_LOOKBACK = 20;
// Most run-artifact listings per plan: a plan that finds nothing stops here
// instead of listing every candidate run's artifacts (GITHUB_TOKEN rate limit).
export const SEED_RUN_LOOKUPS = 100;
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
  // The native font of the seeds, when any were taken: the font CI renders with.
  let seedFont = null;
  {
    const repositoryId = (await request(`repos/${repository}`)).id;
    const workflowIds = new Map();
    const listed = [];
    for (const file of PRODUCER_WORKFLOWS) {
      const workflow = await request(`repos/${repository}/actions/workflows/${file}`);
      workflowIds.set(file, workflow.id);
      listed.push(...(await request(`repos/${repository}/actions/workflows/${workflow.id}/runs?per_page=${SEED_RUN_LISTING}`)).workflow_runs);
    }
    const candidates = seedRuns({repositoryId, workflowIds, runs: listed});
    let font = null;
    let consulted = 0;
    let lookups = 0;
    let remaining = stale();
    for (const producer of candidates) {
      if (!remaining.size || consulted >= SEED_LOOKBACK || lookups >= SEED_RUN_LOOKUPS) break;
      lookups += 1;
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
    seedFont = font;
  }
  let renderIds = [...stale()];
  // A committed PNG can carry another machine's native font: a local render
  // committed by hand keeps its inputs current, so nothing above calls it
  // stale. Reused beside seeds from CI's runners it would mix two fonts in one
  // bundle, which the reuse job refuses ("Reused captures mix native fonts").
  // Send it to the renderer, which stamps the runner's font. Without seeds,
  // the font most committed PNGs share is the one the bundle keeps.
  const committedFonts = new Map();
  for (const capture of captures) {
    if (renderIds.includes(capture.id) || seeds.has(capture.id)) continue;
    try {
      committedFonts.set(capture.id, readProvenance(fs.readFileSync(path.join(root, capture.sourcePath))).nativeFontSha256);
    } catch { /* No provenance: stale() already sent it to the renderer. */ }
  }
  const counts = new Map();
  for (const value of committedFonts.values()) counts.set(value, (counts.get(value) ?? 0) + 1);
  const bundleFont = seedFont ?? [...counts].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  for (const [id, committedFont] of committedFonts) {
    if (bundleFont && committedFont !== bundleFont) renderIds.push(id);
  }
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

export const GH_API_TIMEOUT_MS = 120_000;
export const GH_API_ATTEMPTS = 3;
// Waits before the second and third attempts.
export const GH_API_BACKOFF_MS = Object.freeze([5_000, 20_000]);
// Failures worth another attempt: rate limits, server errors and network
// trouble. A 404, a 403 that is not a rate limit, or bad JSON fails at once.
const transientGhFailure = /\bHTTP (?:429|5\d\d)\b|rate limit|timed? ?out|connection (?:reset|refused)|ECONNRESET|EOF|TLS handshake|could not resolve|no such host|temporary failure in name resolution|network is unreachable/iu;

/**
 * One `gh api` call, retried on transient failures. A call that hits the
 * timeout is reported as a timeout, not as a missing exit status.
 */
export async function githubRequest(endpoint, {binary = false, spawn = spawnSync,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), log = message => console.error(message)} = {}) {
  let failure = "";
  for (let attempt = 1; ; attempt += 1) {
    if (attempt > 1) {
      const wait = GH_API_BACKOFF_MS[attempt - 2];
      log(`${failure} Retrying in ${wait / 1000} s (attempt ${attempt} of ${GH_API_ATTEMPTS}).`);
      await sleep(wait);
    }
    const result = spawn("gh", ["api", "-H", "Cache-Control: no-cache", endpoint],
      {encoding: binary ? null : "utf8", maxBuffer: 256 * 1024 * 1024, timeout: GH_API_TIMEOUT_MS});
    if (result.status === 0 && !result.error) return binary ? result.stdout : JSON.parse(result.stdout);
    const stderr = result.stderr?.toString().trim() ?? "";
    let transient;
    if (result.error?.code === "ETIMEDOUT") {
      failure = `gh api ${endpoint} timed out after ${GH_API_TIMEOUT_MS / 1000} s.`;
      transient = true;
    } else if (result.error) {
      failure = `gh api ${endpoint} could not run: ${result.error.message}`;
      transient = false;
    } else {
      failure = `gh api ${endpoint} failed (exit ${result.status ?? `signal ${result.signal}`}): ${stderr || "no error output"}`;
      transient = transientGhFailure.test(stderr);
    }
    if (!transient) break;
    if (attempt === GH_API_ATTEMPTS) {
      failure += ` Gave up after ${GH_API_ATTEMPTS} attempts.`;
      break;
    }
  }
  throw new Error(`${failure} Cannot read capture bundles.`);
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
