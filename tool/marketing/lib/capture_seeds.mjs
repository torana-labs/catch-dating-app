import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {isMainCiSource} from "../../ci/wait_main_marketing_validation.mjs";
import {canonicalInventory, readProvenance} from "../export_hosted_captures.mjs";
import {readCaptureArchive} from "../import_hosted_captures.mjs";

// Plans a canonical capture run on Linux, before any macOS runner starts.
// Earlier CI bundles from main often already hold a render of these exact
// inputs; those PNGs become seeds, and only what is still stale goes to the
// macOS renderer. Nothing here is trusted downstream: the render and reuse
// jobs re-verify every seed exactly as they verify a committed PNG.

const manifestPath = "tool/marketing/capture_manifest.json";
export const SEED_LOOKBACK = 5;
const digest = bytes => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;

/** CI on main's code: its push and nightly runs, and merge queue runs. */
export function trustedSeedRun(run) {
  return isMainCiSource(run) || (run?.event === "schedule" && run.head_branch === "main");
}

/** This repository's recent main-line CI runs, newest first. */
export function seedRuns({runs, repositoryId, canonicalId}) {
  assert.ok(Array.isArray(runs), "Missing CI run listing.");
  return runs.filter(run => trustedSeedRun(run) && run.workflow_id === canonicalId &&
    run.path?.split("@")[0] === ".github/workflows/ci.yml" && run.repository?.id === repositoryId &&
    run.head_repository?.id === repositoryId && /^[0-9a-f]{40}$/u.test(run.head_sha ?? "") &&
    Number.isSafeInteger(run.id) && Number.isSafeInteger(run.run_attempt))
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

/** The one capture bundle a run uploaded, by its exact name. */
export function seedArtifact({artifacts, run}) {
  const name = `canonical-marketing-${run.head_sha}-${run.id}-${run.run_attempt}`;
  const matches = (artifacts ?? []).filter(artifact => artifact.name === name && artifact.expired === false &&
    artifact.workflow_run?.id === run.id && /^sha256:[0-9a-f]{64}$/u.test(artifact.digest ?? ""));
  return matches.length === 1 ? matches[0] : null;
}

export async function planHostedCaptures({sourceDir, sourceSha, repository, eventName, request = githubRequest}) {
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
  const ancestors = new Map();
  const verifiedAncestor = revision => {
    if (!/^[0-9a-f]{40}$/u.test(revision ?? "")) return false;
    if (!ancestors.has(revision)) {
      ancestors.set(revision, run("git", ["merge-base", "--is-ancestor", revision, sourceSha]).status === 0);
    }
    return ancestors.get(revision);
  };
  // The source's own exporter judges every candidate, with the source's hashing.
  const stale = () => {
    const result = run(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--plan", "--inputs-only"]);
    assert.equal(result.status, 0, result.stderr || "Capture planning failed.");
    const remaining = new Set(JSON.parse(result.stdout).filter(item => item.render).map(item => item.id));
    // Current input hashes alone do not prove that a committed PNG may be
    // reused: its original PR render commit can disappear after a squash.
    // Search trusted ancestor seeds or render afresh, rather than selecting
    // a reuse job that the unchanged ancestry validator must later reject.
    for (const capture of captures) {
      if (remaining.has(capture.id)) continue;
      try {
        const provenance = readProvenance(fs.readFileSync(path.join(root, capture.sourcePath)));
        if (!verifiedAncestor(provenance.sourceRevision)) remaining.add(capture.id);
      } catch { remaining.add(capture.id); }
    }
    return remaining;
  };
  const seeds = new Map();
  const sources = [];
  // The nightly run renders everything, which re-checks the macOS font that a
  // Linux reuse cannot see.
  if (eventName !== "schedule") {
    const repositoryId = (await request(`repos/${repository}`)).id;
    const canonical = await request(`repos/${repository}/actions/workflows/ci.yml`);
    const runs = `repos/${repository}/actions/workflows/${canonical.id}/runs`;
    const candidates = seedRuns({repositoryId, canonicalId: canonical.id, runs: [
      ...(await request(`${runs}?branch=main&per_page=20`)).workflow_runs,
      ...(await request(`${runs}?event=merge_group&per_page=20`)).workflow_runs]});
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
        if (!verifiedAncestor(provenance.sourceRevision)) continue;
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
  const renderIds = eventName === "schedule" ? captures.map(capture => capture.id) : [...stale()];
  // Linux cannot judge the macOS font. Any render job can therefore discover
  // a stale web capture even when only app inputs changed here. Prepare the
  // Storybook and WebKit whenever that job may need them; reuse needs neither.
  const webRender = renderIds.length > 0 && captures.some(capture => capture.kind === "web-capture");
  return {sourceSha, render: renderIds.length > 0, renderIds, webRender,
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
  const plan = await planHostedCaptures({sourceDir: env.CAPTURE_SOURCE_DIR, sourceSha: request.sourceSha,
    repository: env.GITHUB_REPOSITORY, eventName: env.GITHUB_EVENT_NAME});
  const manifest = JSON.parse(fs.readFileSync(path.join(env.CAPTURE_SOURCE_DIR, manifestPath), "utf8"));
  for (const [id, png] of plan.seeds) {
    const capture = manifest.captures.find(entry => entry.id === id);
    const destination = path.join(env.CAPTURE_SEED_DIR, capture.sourcePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, png, {flag: "wx"});
  }
  fs.appendFileSync(env.GITHUB_OUTPUT, `render=${plan.render}\nweb_render=${plan.webRender}\nseeded=${plan.seedIds.length > 0}\n`);
  fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `Render: ${plan.renderIds.join(", ") || "none"}\n\n` +
    `Reused from earlier CI bundles: ${plan.seedIds.join(", ") || "none"}\n`);
  const {seeds: _seeds, ...summary} = plan;
  return summary;
}
