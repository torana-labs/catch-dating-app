import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {parseProbeExpectations, parseProbeDiagnostics, verifyProbeResult, runLintProbeBatch} from "./lint_probe_batch.mjs";

const context = {repositoryRoot: "/repo", probeRoot: "probes"};
const manifest = [
  "probes/one.dart\tcase\tviolating fixture\t0",
  "probes/one.dart\tmin\tcatch_example\t1",
  "probes/one.dart\texact\tcatch_example\t1",
  "probes/one.dart\tnonzero\t-\t0",
  "probes/two.dart\tcase\tclean fixture\t0",
  "probes/two.dart\tclean\t-\t0",
].join("\n");
const diagnostic = (file, code = "CATCH_EXAMPLE", severity = "WARNING") =>
  `${severity}|LINT|${code}|${file}|1|1|4|Example diagnostic\n`;
const plan = () => parseProbeExpectations(manifest, context);
const result = (stdout, status = 2) => ({stdout, stderr: "", status});

test("per-file assertions cannot borrow a diagnostic from another fixture", () => {
  assert.deepEqual(verifyProbeResult(plan(), result(diagnostic("/repo/probes/one.dart"))),
    {fixtures: 2, assertions: 4, diagnostics: 1, analyzerStarts: 1});
  assert.throws(() => verifyProbeResult(plan(), result(diagnostic("/repo/probes/two.dart"))), /violating fixture/);
});

test("negative fixtures reject warnings and custom info while ordinary info stays permitted", () => {
  const violation = diagnostic("/repo/probes/one.dart");
  for (const [code, severity] of [["UNUSED_IMPORT", "WARNING"], ["CATCH_OTHER", "INFO"]]) {
    assert.throws(() => verifyProbeResult(plan(), result(violation + diagnostic("/repo/probes/two.dart", code, severity))), /clean fixture/);
  }
  verifyProbeResult(plan(), result(violation + diagnostic("/repo/probes/two.dart", "DIRECTIVES_ORDERING", "INFO")));
});

test("exact counts reject duplicate reports rather than treating them as extra coverage", () => {
  assert.throws(() => verifyProbeResult(plan(), result(diagnostic("/repo/probes/one.dart").repeat(2))), /exact catch_example/);
});

test("machine fields preserve escaped path characters and messages", () => {
  const output = "WARNING|LINT|CATCH_EXAMPLE|/repo/probes/a\\|b\\\\c.dart|1|2|3|Text with \\| and \\n\\r\\\\\n";
  assert.deepEqual(parseProbeDiagnostics(output), [{severity: "WARNING", code: "catch_example", file: "/repo/probes/a|b\\c.dart"}]);
});

test("empty output, plugin failure, process failure and unrelated output cannot pass", () => {
  const valid = diagnostic("/repo/probes/one.dart");
  for (const failure of [result("", 0), result(valid, 0), result(valid, null),
    {...result(valid), signal: "SIGTERM"}, {...result(valid), error: new Error("spawn failed")},
    result(valid + "An error occurred while executing an analyzer plugin"),
    result(valid + "The analysis server shut down unexpectedly."),
    result(valid + "No issues found!"), result(valid + diagnostic("/repo/lib/unrelated.dart"))]) {
    assert.throws(() => verifyProbeResult(plan(), failure));
  }
});

test("only the verbatim Flutter root banner on stderr is ignored", () => {
  // Printed by Flutter's bin/dart wrapper when it runs as root outside CI.
  const banner = [
    "   Woah! You appear to be trying to run flutter as root.",
    "   We strongly recommend running the flutter tool without superuser privileges.",
    "  /",
    "\u{1F4CE}",
    "",
  ].join("\n");
  const valid = diagnostic("/repo/probes/one.dart");
  assert.deepEqual(verifyProbeResult(plan(), {...result(valid), stderr: banner}),
    {fixtures: 2, assertions: 4, diagnostics: 1, analyzerStarts: 1});
  assert.deepEqual(verifyProbeResult(plan(), {...result(valid), stderr: banner.replaceAll("\n", "\r\n")}),
    {fixtures: 2, assertions: 4, diagnostics: 1, analyzerStarts: 1});
  // The banner does not excuse a missing or wrong finding.
  assert.throws(() => verifyProbeResult(plan(), {...result("", 0), stderr: banner}), /violating fixture/);
  assert.throws(() => verifyProbeResult(plan(), {...result(diagnostic("/repo/probes/two.dart")), stderr: banner}),
    /violating fixture/);
  // Anything beyond the exact block, a truncated block, or the block on stdout still fails.
  for (const failure of [
    {...result(valid), stderr: banner + "No issues found!\n"},
    {...result(valid), stderr: banner.replace("  /\n", "")},
    {...result(valid), stderr: banner.replace("root.", "root!")},
    result(banner + valid),
  ]) {
    assert.throws(() => verifyProbeResult(plan(), failure), /Unrecognized analyzer output/);
  }
});

test("malformed or unowned expectations fail before starting the analyzer", () => {
  for (const text of ["", manifest.replace("probes/one.dart", "../outside.dart"),
    manifest.replace("\tmin\t", "\tunknown\t"), manifest.replace("\t1\n", "\tNaN\n"),
    manifest.replace("catch_example", "any_code"),
    "probes/one.dart\tcase\tno assertion\t0", manifest + "\nprobes/one.dart\tcase\tduplicate\t0",
    "probes/one.dart\tmin\tcatch_example\t1"]) {
    assert.throws(() => parseProbeExpectations(text, context));
  }
});

test("one process receives every exact file and honors the selected Dart binary", (t) => {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lint-probe-test-"));
  t.after(() => fs.rmSync(repositoryRoot, {recursive: true, force: true}));
  fs.mkdirSync(path.join(repositoryRoot, "probes"));
  const manifestPath = path.join(repositoryRoot, "expectations.tsv");
  fs.writeFileSync(manifestPath, manifest);
  for (const name of ["one.dart", "two.dart"]) fs.writeFileSync(path.join(repositoryRoot, "probes", name), "// fixture");
  let starts = 0;
  const report = runLintProbeBatch({repositoryRoot, probeRoot: "probes", manifestPath, dartBin: "/selected/dart", runner: (command, args, options) => {
    starts += 1;
    assert.equal(command, "/selected/dart");
    assert.deepEqual(args, ["analyze", "--format", "machine", path.join(repositoryRoot, "probes/one.dart"), path.join(repositoryRoot, "probes/two.dart")]);
    assert.equal(options.cwd, repositoryRoot);
    return result(diagnostic(path.join(repositoryRoot, "probes/one.dart")));
  }});
  assert.equal(starts, 1);
  assert.equal(report.assertions, 4);
  fs.unlinkSync(path.join(repositoryRoot, "probes/two.dart"));
  assert.throws(() => runLintProbeBatch({repositoryRoot, probeRoot: "probes", manifestPath, runner: () => assert.fail("Analyzer must not start with a missing fixture")}));
});
