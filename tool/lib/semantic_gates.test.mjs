import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {loadToolsManifest} from "./tools_manifest.mjs";
import {semanticGateIds, validateQueueGates, wholeRepoInventory} from "./semantic_gates.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The merge-queue gate the owner approved after the clean replay
// (docs/plans/semantic_check_replay_report.md): 65 checks under 10 s at p95,
// plus the Functions context, client-write and BigQuery export path checks
// the architecture sign-off added (#2445) and the account deletion erasure
// check (#2444). A check leaving the manifest,
// losing its queueGate, or a new gate added fails here until this list
// changes on purpose.
const approvedAlways = [
  "audit:app-architecture-exhibits",
  // STR-10 (#2532): no new raw onCall; 0.3 s.
  "audit:callable-policy",
  "audit:context-map",
  "audit:flutter-source-size",
  "audit:fn-rate-limits",
  "audit:fn-readme-inventory",
  "audit:functions-contexts",
  "audit:host-crm-boundaries",
  "audit:mutation-error-surfaces",
  "audit:route-string-literals",
  "audit:unused-code",
  "audit:widget-cleanup",
  "contracts:account-deletion-erasure",
  "contracts:bigquery-export-paths",
  "contracts:client-write-contracts",
  "contracts:firestore-contract",
  "contracts:firestore-query-indexes",
  "contracts:firestore-read-limits",
  "contracts:flutter-form-inventory",
  "contracts:market-catalog",
  "contracts:market-lists",
  "contracts:migration-contracts",
  "contracts:path-literals",
  "contracts:rules-semantics",
  "contracts:schema-fixtures",
  "contracts:storage-contract",
  "contracts:type-boundaries",
  "contracts:validate-schemas",
  "copy:l10n-key-usage",
  "copy:mobile-catalog",
  "design:component-enforcement-coverage",
  "design:field-facade-inventory",
  "design:host-event-field-contracts",
  "design:host-shell-coverage",
  "design:icon-family-usage",
  "design:library-shims",
  "design:platform-token-coverage",
  "design:public-surface-behavior",
  "design:root-screen-composition-contracts",
  "design:screen-top-bar-contracts",
  "design:terminal-padding",
  "design:website-playbook",
  "design:widget-classification-check",
  "design:widget-pattern-families",
  "design:widgetbook-coverage",
  "firebase:functions-source-closure",
  "firebase:params-coverage",
  "marketing:website-a11y-debt",
  "marketing:website-components",
  "marketing:website-routes",
  "meta:brand-literals",
  "meta:ci-tool-category-coverage",
  "meta:repository-root-hygiene",
  "meta:third-party-names",
  "meta:tool-manifest",
  "operations:admin-action-catalog",
  "operations:boundaries",
  "operations:workflow-manifest",
  "platform:app-package-graphs",
  "platform:app-targets",
  "test:flutter-test-size",
  "web:admin-components",
  "web:admin-feature-exports",
  "web:admin-feature-ui-size",
  "web:admin-pending-operations",
  "web:react-component-governance",
  "web:react-controller-test-targets",
  "web:react-dependency-graph",
  "web:react-query-state",
  "web:website-copy-ownership",
];
const approvedCandidates = [
  "docs:function-catalog",
];

test("the manifest's queue gates are exactly the approved list", () => {
  const manifest = loadToolsManifest({root: repoRoot});
  assert.deepEqual(semanticGateIds(manifest), approvedAlways);
  assert.deepEqual(semanticGateIds(manifest, {level: "candidate"}), approvedCandidates);
  assert.deepEqual(validateQueueGates(manifest.tools), []);
});

const tool = (id, overrides = {}) => ({id, category: id.split(":")[0], status: "active", surface: "local-read",
  role: "gate", command: `node tool/x/${id.split(":")[1]}.mjs`, ciRequirements: {setup: ["node"]}, ...overrides});

test("validateQueueGates admits only known levels on active whole-repo checks", () => {
  const errors = validateQueueGates([
    tool("a:ok", {queueGate: "always"}),
    tool("a:candidate", {queueGate: "candidate"}),
    tool("a:none"),
    tool("a:level", {queueGate: "sometimes"}),
    tool("a:retired", {queueGate: "always", status: "retired"}),
    tool("a:flutter", {queueGate: "always", ciRequirements: {setup: ["node", "flutter"]}}),
    tool("a:unit", {queueGate: "always", command: "node --test tool/x/u.test.mjs"}),
    tool("a:generator", {queueGate: "always", role: "generator"}),
    tool("tool:runner", {queueGate: "always", command: "node tool/run.mjs"}),
  ]);
  assert.deepEqual(errors.map((error) => error.split(":").slice(0, 2).join(":")),
    ["a:level", "a:retired", "a:flutter", "a:unit", "a:generator", "tool:runner"]);
  assert.match(errors[0], /one of always, candidate/u);
  assert.match(errors[1], /active tool with a command/u);
  assert.match(errors[2], /whole-repo semantic check/u);
});

test("semanticGateIds reads the field from each tool, sorted", () => {
  const manifest = {tools: [tool("b:two", {queueGate: "always"}), tool("a:one", {queueGate: "always"}),
    tool("c:three", {queueGate: "candidate"})]};
  assert.deepEqual(semanticGateIds(manifest), ["a:one", "b:two"]);
  assert.deepEqual(semanticGateIds(manifest, {level: "candidate"}), ["c:three"]);
});

test("every approved gate is in the replay's whole-repo inventory", () => {
  const ids = new Set(wholeRepoInventory(loadToolsManifest({root: repoRoot})).checks.map((check) => check.id));
  for (const id of [...approvedAlways, ...approvedCandidates]) assert.ok(ids.has(id), id);
});
