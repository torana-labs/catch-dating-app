#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";
import {hasExecutableChecks} from "../lib/tool_impact.mjs";
import {assignBuckets, BUCKET_COUNT, fullMatrixTools, readTimings} from "./tool_buckets.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function toolCategoryCoverage({manifest, workflowText}) {
  const activeCategories = new Set((manifest.tools ?? [])
    .filter((tool) => tool.status === "active")
    .map((tool) => tool.category));
  const declaredCategories = new Set();
  for (const match of workflowText.matchAll(/^\s*categories:\s+(.+)$/gm)) {
    for (const category of match[1].trim().split(/\s+/).filter(Boolean)) {
      declaredCategories.add(category);
    }
  }
  const unknown = [...declaredCategories]
    .filter((category) => !activeCategories.has(category))
    .sort();
  const missing = [...activeCategories]
    .filter((category) => !declaredCategories.has(category))
    .sort();
  return {
    ok: unknown.length === 0 && missing.length === 0,
    activeCategories: [...activeCategories].sort(),
    declaredCategories: [...declaredCategories].sort(),
    unknown,
    missing,
  };
}

// The full matrix runs computed buckets (tool/ci/tool_buckets.mjs) instead of
// category lists: every active tool with checks must be in exactly one bucket,
// and the workflow must run every bucket, 1 to BUCKET_COUNT, and no other.
export function toolBucketCoverage({manifest, workflowText, buckets, bucketCount = BUCKET_COUNT}) {
  const expected = manifest.tools.filter((tool) => tool.status === "active" && hasExecutableChecks(tool))
    .map((tool) => tool.id);
  const assigned = buckets.flatMap((bucket) => bucket.toolIds);
  const counts = new Map();
  for (const id of assigned) counts.set(id, (counts.get(id) ?? 0) + 1);
  const missing = expected.filter((id) => !counts.has(id)).sort();
  const duplicated = [...counts].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const unknown = [...counts.keys()].filter((id) => !expected.includes(id)).sort();
  const scheduled = [...workflowText.matchAll(/\{name: bucket-(\d+), bucket: (\d+)\}/gu)]
    .filter((match) => match[1] === match[2]).map((match) => Number(match[1])).sort((a, b) => a - b);
  const wanted = Array.from({length: bucketCount}, (_, index) => index + 1);
  const bucketsOk = scheduled.join(",") === wanted.join(",");
  return {ok: missing.length === 0 && duplicated.length === 0 && unknown.length === 0 && bucketsOk,
    missing, duplicated, unknown, scheduled, wanted};
}

export function usesComputedBuckets(workflowText) {
  return /node tool\/ci\/tool_buckets\.mjs ids --bucket/u.test(workflowText);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = loadToolsManifest({root: repoRoot});
  const workflowText = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/tools-ci.yml"),
    "utf8",
  );
  if (usesComputedBuckets(workflowText)) {
    const buckets = assignBuckets({tools: fullMatrixTools(manifest), timings: readTimings()});
    const result = toolBucketCoverage({manifest, workflowText, buckets});
    if (!result.ok) {
      console.error("Tool bucket CI coverage failed:");
      if (result.missing.length > 0) console.error(`- Active tools in no bucket: ${result.missing.join(", ")}`);
      if (result.duplicated.length > 0) console.error(`- Tools in several buckets: ${result.duplicated.join(", ")}`);
      if (result.unknown.length > 0) console.error(`- Bucketed tools that are not active: ${result.unknown.join(", ")}`);
      if (result.scheduled.join(",") !== result.wanted.join(",")) {
        console.error(`- Tools CI schedules buckets [${result.scheduled.join(", ")}], expected [${result.wanted.join(", ")}]`);
      }
      process.exit(1);
    }
    console.log(`Tool bucket CI coverage passed (${buckets.reduce((sum, bucket) => sum + bucket.toolIds.length, 0)} tools in ${result.wanted.length} buckets).`);
    process.exit(0);
  }
  const result = toolCategoryCoverage({manifest, workflowText});
  if (!result.ok) {
    console.error("Tool category CI coverage failed:");
    if (result.unknown.length > 0) {
      console.error(`- Unknown workflow categories: ${result.unknown.join(", ")}`);
    }
    if (result.missing.length > 0) {
      console.error(`- Active categories missing from Tools CI: ${result.missing.join(", ")}`);
    }
    process.exit(1);
  }
  console.log(
    `Tool category CI coverage passed (${result.activeCategories.length} categories).`,
  );
}
