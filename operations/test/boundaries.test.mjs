import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {checkBoundaries} from "../scripts/check-boundaries.mjs";
import {temporaryDirectory} from "./helpers.mjs";

const baseline = {
  schemaVersion: 2,
  policyId: "test-policy",
  toolRoot: "tool",
  legacyRoots: [{path: "tool/organizer_intake", codeFileCeiling: 0}],
  allowedLegacyPathReaders: ["operations/src/workflows/supply-intake/adapters/legacy-artifacts.mjs"],
  codeExtensions: [".mjs"],
  forbiddenLegacyImports: [
    "@catch/operations",
    "operations/src/",
  ],
  durableWorkflowMarkerThreshold: 2,
  durableWorkflowMarkers: [
    "OperationsEngine",
    "recordIdempotency(",
    "lifecycleStatus",
  ],
  singleSpine: {
    retiredPaths: ["tool/host_discovery"],
    retiredBasenames: ["event_intake_bridge.json"],
    forbiddenRuntimeReferences: [
      {
        root: "functions/src",
        tokens: ["eventIntakeDashboards"],
      },
    ],
  },
};

test("boundary checker rejects new orchestration code in a legacy tool root", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-legacy-");
  const file = path.join(repoRoot, "tool/organizer_intake/new_orchestrator.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, "export const workflow = true;\n");
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.id === "legacy-code-ceiling-exceeded"));
});

test("boundary checker rejects operations imports in any new tool root",
  async () => {
    const repoRoot = await temporaryDirectory("catch-ops-boundary-new-root-");
    const file = path.join(repoRoot, "tool/safety_ops/run.mjs");
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(
      file,
      'import {OperationsEngine} from "../../operations/src/index.mjs";\n' +
        "export const engine = OperationsEngine;\n"
    );
    const result = await checkBoundaries({repoRoot, baseline});
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "tool-imports-operations-runtime" &&
        finding.path === "tool/safety_ops/run.mjs"));
  });

test("boundary checker allows static path policy data but still rejects executable runtime imports", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-policy-");
  const root = path.join(repoRoot, "tool/ci");
  await fs.mkdir(root, {recursive: true});
  await fs.writeFile(path.join(root, "source_guard.json"),
    JSON.stringify(["operations/src/platform", "operations/src/workflows/outreach-drafting"]));
  await fs.writeFile(path.join(root, "proof.mjs"),
    'import paths from "./source_guard.json" with {type: "json"};\n' +
    'export const guardedPaths = Object.freeze(paths);\n');
  assert.equal((await checkBoundaries({repoRoot, baseline})).ok, true);
  await fs.writeFile(path.join(root, "runtime.mjs"),
    'import {OperationsEngine} from "../../operations/src/index.mjs";\n');
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "tool-imports-operations-runtime" &&
    finding.path === "tool/ci/runtime.mjs"));
});

test("boundary checker rejects reimplemented workflow markers in tool code",
  async () => {
    const repoRoot = await temporaryDirectory("catch-ops-boundary-markers-");
    const file = path.join(repoRoot, "tool/finance_ops/workflow.mjs");
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(
      file,
      "export async function run(store, lifecycleStatus) {\n" +
        "  return store.recordIdempotency(lifecycleStatus);\n}\n"
    );
    const result = await checkBoundaries({repoRoot, baseline});
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "durable-workflow-markers-under-tool"));
  });

test("boundary checker aggregates workflow markers across a new tool root",
  async () => {
    const repoRoot = await temporaryDirectory("catch-ops-boundary-split-");
    const root = path.join(repoRoot, "tool/safety_ops");
    await fs.mkdir(root, {recursive: true});
    await fs.writeFile(
      path.join(root, "store.mjs"),
      "export const save = (store, key) => store.recordIdempotency(key);\n"
    );
    await fs.writeFile(
      path.join(root, "model.mjs"),
      "export const state = (lifecycleStatus) => ({lifecycleStatus});\n"
    );
    const result = await checkBoundaries({repoRoot, baseline});
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "durable-workflow-markers-under-tool-root" &&
        finding.path === "tool/safety_ops"));
  });

test("boundary checker rejects legacy path knowledge outside the declared adapter", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-adapter-");
  const file = path.join(repoRoot, "operations/src/workflows/supply-intake/workflow.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, 'export const path = "tool/organizer_intake/generated/value.json";\n');
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.id === "legacy-path-outside-adapter"));
});

test("boundary checker rejects executable tool imports from operations", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-import-");
  const file = path.join(repoRoot, "operations/src/platform/unsafe-runner.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(
    file,
    'import {run} from "../../../tool/organizer_intake/run.mjs";\nexport {run};\n'
  );
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "operations-imports-tool-code"));
});

for (const [name, source] of [
  [
    "computed dynamic imports",
    'const parts = ["to" + "ol", "runner.mjs"]; export const load = () => import("../../../" + parts.join("/"));\n',
  ],
  [
    "computed CommonJS requires",
    'const name = ["to" + "ol", "runner.cjs"].join("/"); module.exports = require("../../../" + name);\n',
  ],
  [
    "module.require loaders",
    'const name = ["to" + "ol", "runner.cjs"].join("/"); module.exports = module.require("../../../" + name);\n',
  ],
  [
    "createRequire aliases",
    'import {createRequire as loaderFactory} from "node:module"; const load = loaderFactory(import.meta.url); export {load};\n',
  ],
]) {
  test(`boundary checker rejects ${name}`, async () => {
    const repoRoot = await temporaryDirectory("catch-ops-boundary-loader-");
    const file = path.join(repoRoot, "operations/src/platform/unsafe-loader.mjs");
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(file, source);
    const result = await checkBoundaries({repoRoot, baseline});
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "operations-executable-loader-not-allowed"));
  });
}

test("boundary checker allows import.meta without an executable loader", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-import-meta-");
  const file = path.join(repoRoot, "operations/src/platform/module-location.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, "export const moduleUrl = import.meta.url;\n");
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, true);
});

test("boundary checker rejects a retired supply path", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-retired-");
  const file = path.join(repoRoot, "tool/host_discovery/runner.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, "export const retired = true;\n");
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "retired-supply-path-present"));
});

test("boundary checker rejects a parallel runtime queue", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-spine-");
  const file = path.join(repoRoot, "functions/src/admin/event-intake.mjs");
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(
    file,
    'export const collection = "eventIntakeDashboards";\n'
  );
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "parallel-supply-spine-reference" &&
      finding.path === "functions/src/admin/event-intake.mjs"));
});

test("boundary checker rejects committed Event Intake bridges", async () => {
  const repoRoot = await temporaryDirectory("catch-ops-boundary-bridge-");
  const file = path.join(
    repoRoot,
    "tool/marketing/event_guide/generated/mumbai/event_intake_bridge.json"
  );
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, "{}\n");
  const result = await checkBoundaries({repoRoot, baseline});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "retired-operational-artifact-present"));
});
