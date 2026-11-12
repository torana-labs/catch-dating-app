#!/usr/bin/env node
// Weekly compare-only render (owner decision, 12 Nov 2026). App captures are
// reused by their recorded-input fingerprint, which cannot see a multi-hop
// const chain through files that never execute (see recordedInputFiles). This
// renders every reusable app capture afresh on macOS and compares its image
// bytes with the PNG the planner would reuse. It never republishes: any
// difference fails the run and names the captures.
//
//   --plan     (Linux) write the PNGs main would reuse under CAPTURE_SEED_DIR
//   --compare  (macOS) render those captures fresh and compare image bytes
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {canonicalInventory, readProvenance} from "./export_hosted_captures.mjs";

const manifestPath = "tool/marketing/capture_manifest.json";

/**
 * Compares fresh renders with the PNGs that would be reused, by the image
 * hash each provenance records (PNG bytes without the provenance chunk).
 * A capture with no reusable PNG is listed as not compared, not as drift.
 */
export function compareDrift({captures, reused, fresh}) {
  const differences = [];
  const compared = [];
  const notCompared = [];
  for (const capture of captures) {
    if (capture.kind === "web-capture") continue;
    const before = reused.get(capture.id);
    if (!before) { notCompared.push({id: capture.id, reason: "no reusable render"}); continue; }
    const after = fresh.get(capture.id);
    if (!after) { differences.push({id: capture.id, reason: "fresh render missing"}); continue; }
    const old = readProvenance(before);
    const now = readProvenance(after);
    if (old.nativeFontSha256 !== now.nativeFontSha256) {
      notCompared.push({id: capture.id, reason: "native font changed since the reused render"});
      continue;
    }
    compared.push(capture.id);
    if (old.imageSha256 !== now.imageSha256) {
      differences.push({id: capture.id, reason: "image bytes differ", renderedFrom: old.sourceRevision,
        sameInputs: old.inputSha256 === now.inputSha256});
    }
  }
  return {differences, compared, notCompared};
}

export function driftSummary({differences, compared, notCompared}) {
  const lines = ["## Weekly capture drift (compare-only)", "",
    `Compared ${compared.length} app captures; ${differences.length} differ.`, ""];
  if (differences.length) {
    lines.push("| Capture | Problem | Reused render from | Same recorded inputs |", "|---|---|---|---|");
    for (const d of differences) lines.push(`| ${d.id} | ${d.reason} | ${d.renderedFrom ?? ""} | ${d.sameInputs ?? ""} |`);
    lines.push("", "A difference with the same recorded inputs means the fingerprint missed an input " +
      "(for example a multi-hop const chain). Nothing was republished.", "");
  }
  if (notCompared.length) {
    lines.push("Not compared:", ...notCompared.map(n => `- ${n.id}: ${n.reason}`), "");
  }
  return `${lines.join("\n")}\n`;
}

async function plan(env) {
  const {planHostedCaptures} = await import("./lib/capture_seeds.mjs");
  const sourceDir = process.cwd();
  const head = spawnSync("git", ["rev-parse", "HEAD"], {encoding: "utf8"}).stdout.trim();
  const result = await planHostedCaptures({sourceDir, sourceSha: head, repository: env.GITHUB_REPOSITORY, eventName: "drift"});
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const [id, png] of result.seeds) {
    const capture = manifest.captures.find(entry => entry.id === id);
    const destination = path.join(env.CAPTURE_SEED_DIR, capture.sourcePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, png, {flag: "wx"});
  }
  console.log(`Reusable renders for ${head}: ${result.seedIds.join(", ") || "none"}`);
}

function compare(env) {
  const captures = canonicalInventory(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const reused = new Map();
  for (const capture of captures) {
    const file = path.join(env.CAPTURE_SEED_DIR, capture.sourcePath);
    if (capture.kind !== "web-capture" && fs.existsSync(file)) reused.set(capture.id, fs.readFileSync(file));
  }
  const fresh = new Map();
  if (reused.size) {
    const result = spawnSync(process.execPath, ["tool/marketing/export_app_screenshots.mjs", "--update",
      "--ids", [...reused.keys()].join(","), "--sf-font", env.CAPTURE_SF_FONT ?? "/System/Library/Fonts/SFNS.ttf"],
    {stdio: "inherit"});
    if (result.status !== 0) throw new Error("Fresh render failed; nothing was compared.");
    for (const id of reused.keys()) {
      const capture = captures.find(entry => entry.id === id);
      fresh.set(id, fs.readFileSync(capture.sourcePath));
      if (env.CAPTURE_DRIFT_DIR) {
        for (const [label, bytes] of [["reused", reused.get(id)], ["fresh", fresh.get(id)]]) {
          const out = path.join(env.CAPTURE_DRIFT_DIR, label, `${id}.png`);
          fs.mkdirSync(path.dirname(out), {recursive: true});
          fs.writeFileSync(out, bytes);
        }
      }
    }
  }
  const report = compareDrift({captures, reused, fresh});
  const summary = driftSummary(report);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  for (const d of report.differences) console.log(`::error title=Capture drift::${d.id}: ${d.reason}`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  try {
    if (mode === "--plan") await plan(process.env);
    else if (mode === "--compare") {
      if (compare(process.env).differences.length) process.exitCode = 1;
    } else {
      console.log("Usage: node tool/marketing/compare_capture_drift.mjs --plan | --compare");
      process.exitCode = mode === "--help" ? 0 : 64;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
