import test from "node:test";
import assert from "node:assert/strict";
import {toolBucketCoverage, toolCategoryCoverage, usesComputedBuckets} from "./check_tool_category_coverage.mjs";

test("coverage fails for both unknown workflow and missing active categories", () => {
  const result = toolCategoryCoverage({
    manifest: {
      tools: [
        {status: "active", category: "meta"},
        {status: "active", category: "design"},
        {status: "archived", category: "legacy"},
      ],
    },
    workflowText: "categories: meta scanners\n",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.unknown, ["scanners"]);
  assert.deepEqual(result.missing, ["design"]);
});

test("coverage passes when every active category is declared exactly", () => {
  const result = toolCategoryCoverage({
    manifest: {
      tools: [
        {status: "active", category: "meta"},
        {status: "active", category: "design"},
      ],
    },
    workflowText: "categories: meta design\n",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.unknown, []);
  assert.deepEqual(result.missing, []);
});

const bucketManifest = {tools: [
  {id: "a:one", status: "active", category: "meta", checks: ["node a.mjs"]},
  {id: "b:two", status: "active", category: "design", checks: ["node b.mjs"]},
  {id: "c:old", status: "archived", category: "legacy", checks: ["node c.mjs"]},
]};
const twoBuckets = "- {name: bucket-1, bucket: 1}\n- {name: bucket-2, bucket: 2}\nnode tool/ci/tool_buckets.mjs ids --bucket \"$BUCKET\"\n";

test("computed buckets pass when every active tool is in exactly one scheduled bucket", () => {
  assert.equal(usesComputedBuckets(twoBuckets), true);
  assert.equal(usesComputedBuckets("categories: meta design\n"), false);
  const result = toolBucketCoverage({manifest: bucketManifest, workflowText: twoBuckets, bucketCount: 2,
    buckets: [{toolIds: ["a:one"]}, {toolIds: ["b:two"]}]});
  assert.equal(result.ok, true);
});

test("computed buckets fail on a missing, duplicated or inactive tool, or an unscheduled bucket", () => {
  const missing = toolBucketCoverage({manifest: bucketManifest, workflowText: twoBuckets, bucketCount: 2,
    buckets: [{toolIds: ["a:one"]}, {toolIds: []}]});
  assert.deepEqual(missing.missing, ["b:two"]);
  const duplicated = toolBucketCoverage({manifest: bucketManifest, workflowText: twoBuckets, bucketCount: 2,
    buckets: [{toolIds: ["a:one", "b:two"]}, {toolIds: ["b:two", "c:old"]}]});
  assert.deepEqual(duplicated.duplicated, ["b:two"]);
  assert.deepEqual(duplicated.unknown, ["c:old"]);
  const unscheduled = toolBucketCoverage({manifest: bucketManifest, workflowText: twoBuckets, bucketCount: 3,
    buckets: [{toolIds: ["a:one"]}, {toolIds: ["b:two"]}, {toolIds: []}]});
  assert.equal(unscheduled.ok, false);
  assert.deepEqual(unscheduled.scheduled, [1, 2]);
  for (const result of [missing, duplicated, unscheduled]) assert.equal(result.ok, false);
});
