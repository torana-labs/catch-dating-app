import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCoverageReport,
  mergeCoverageShards,
  parseLcov,
  renderCoverageMarkdown,
} from "./flutter_coverage_report.mjs";

const fixture = `TN:
SF:/repo/lib/core/clock.dart
DA:1,1
DA:2,0
end_of_record
SF:/repo/lib/explore/feed.dart
DA:10,3
DA:11,1
DA:12,0
end_of_record
SF:/repo/lib/explore/feed.g.dart
DA:1,1
DA:2,1
end_of_record
SF:/repo/test/not_product.dart
DA:1,1
end_of_record
`;

test("parseLcov keeps product Dart line observations and normalizes paths", () => {
  assert.deepEqual(parseLcov(fixture), [
    {path: "lib/core/clock.dart", linesFound: 2, linesHit: 1},
    {path: "lib/explore/feed.dart", linesFound: 3, linesHit: 2},
    {path: "lib/explore/feed.g.dart", linesFound: 2, linesHit: 2},
  ]);
});

test("platform package files stay in the report as one feature", () => {
  const lcov = "TN:\nSF:/repo/packages/platform/lib/errors/app_exception.dart\nDA:1,1\nDA:2,0\nend_of_record\n" +
    "SF:packages/platform/lib/cache/cache_tags.dart\nDA:1,1\nend_of_record\n";
  assert.deepEqual(parseLcov(lcov).map((file) => file.path), [
    "packages/platform/lib/cache/cache_tags.dart",
    "packages/platform/lib/errors/app_exception.dart",
  ]);
  assert.deepEqual(buildCoverageReport(lcov).features.map((row) => row.feature), ["platform"]);
});

test("coverage report separates generated code and groups handwritten features", () => {
  const report = buildCoverageReport(fixture);

  assert.equal(report.policy, "visibility_only_no_global_threshold");
  assert.deepEqual(report.summary, {
    files: 2,
    linesFound: 5,
    linesHit: 3,
    percent: 60,
  });
  assert.deepEqual(report.excludedGeneratedOrConfig, {
    files: 1,
    linesFound: 2,
    linesHit: 2,
    percent: 100,
  });
  assert.deepEqual(
    report.features.map(({feature, linesFound, linesHit}) => ({
      feature,
      linesFound,
      linesHit,
    })),
    [
      {feature: "explore", linesFound: 3, linesHit: 2},
      {feature: "core", linesFound: 2, linesHit: 1},
    ],
  );
});

test("markdown makes the no-threshold and unobserved-file caveats explicit", () => {
  const markdown = renderCoverageMarkdown(buildCoverageReport(fixture));

  assert.match(markdown, /visibility-only/u);
  assert.match(markdown, /does not impose an aggregate/u);
  assert.match(markdown, /never loads are not represented/u);
  assert.match(markdown, /\| explore \| 2 \/ 3 \| 66\.7% \| 1 \|/u);
});

test("known-bad LCOV records fail closed", () => {
  assert.throws(
    () => parseLcov("SF:/repo/lib/core/bad.dart\nDA:not-a-line,1\n"),
    /Invalid LCOV line record/u,
  );
});

test("shard merge unions covered lines without double-counting shared files", () => {
  const second = "TN:\nSF:lib/core/clock.dart\nDA:1,0\nDA:2,1\nDA:3,0\nend_of_record\n";
  const merged = mergeCoverageShards([fixture, second], 2);
  assert.equal(merged, mergeCoverageShards([second, fixture], 2));
  assert.deepEqual(parseLcov(merged).find((file) => file.path === "lib/core/clock.dart"), {
    path: "lib/core/clock.dart", linesFound: 3, linesHit: 2,
  });
  assert.equal((merged.match(/SF:lib\/core\/clock.dart/g) ?? []).length, 1);
  assert.equal(buildCoverageReport(merged).summary.linesFound, 6);
  assert.equal(buildCoverageReport(merged).summary.linesHit, 4);
});

test("missing and malformed coverage shards cannot pass", () => {
  assert.throws(() => mergeCoverageShards([fixture], 4), /Expected 4/);
  assert.equal(mergeCoverageShards([fixture, ""], 2), mergeCoverageShards([fixture], 1));
  assert.equal(buildCoverageReport(mergeCoverageShards(["SF:test/a.dart\nDA:1,1\n"], 1)).summary.files, 0);
  assert.throws(() => mergeCoverageShards(["SF:lib/a.dart\nDA:1,-1\n"], 1), /Invalid LCOV/);
  assert.throws(() => mergeCoverageShards([fixture], 0), /Expected 0/);
});
