import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import {planAffectedToolChecks} from "../../lib/tool_impact.mjs";
import {
  baselinePath, consolidationDifferences, consolidationSnapshot,
  pageCssBudgets, parseConsolidationBaseline, previousConsolidationBaseline,
  strandedByRetirementCeiling, strandedDifferences,
} from "./react_consolidation_ratchet.mjs";

const empty = () => ({
  version: 1, owner: "web_surface_architecture",
  targetPhase: "docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-7--cross-framework-conformance-react",
  gates: {
    "library.t1_web": [], "library.priority_t2_web": [], "library.headless_controls": [],
    "library.cross_framework_parity": [], "screens.web_adapters": [],
    "screens.web_single_use_shared": [], "screens.web_page_css_lines": {},
  },
});
const library = "library.t1_web";
const css = "screens.web_page_css_lines";
const single = "screens.web_single_use_shared";
const [[strandedId, strandedTicket], [otherStrandedId, otherStrandedTicket]] =
  Object.entries(strandedByRetirementCeiling[single]);
const withStranded = (record, extra = []) => {
  const document = empty();
  document.gates[single] = [...Object.keys(record), ...extra].sort();
  document.strandedByRetirement = {[single]: record};
  return document;
};
const probes = [
  ["a baseline-only edit still selects the registered enforcing check", () => {
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    const manifest = read("tool/tools_manifest.json");
    const plan = planAffectedToolChecks({changedPaths: [baselinePath], manifest,
      componentGraph: read("tool/harness/component_graph.json")});
    assert.ok(plan.full || plan.toolIds.includes("web:shared-ui-adoption"));
    assert.ok(manifest.tools.find((tool) => tool.id === "web:shared-ui-adoption" && tool.status === "active")
      ?.checks.includes("node tool/web/check_shared_web_ui_adoption.mjs --check"));
  }],
  ["rejects missing, malformed, duplicate, negative and out-of-scope allowances", () => {
    const malformed = [null, {}, {...empty(), owner: ""}, {...empty(), version: 2}];
    for (const entries of [["catch.button", "catch.button"], ["unknown"], [1], {}]) {
      const document = empty(); document.gates[library] = entries; malformed.push(document);
    }
    for (const entries of [{"admin/src/a.css": -1}, {"admin/src/a.css": 1.5},
      {"admin/src/a.css": 0}, {"admin/src/../a.css": 1}, {"website/src/styles/base.css": 1}]) {
      const document = empty(); document.gates[css] = entries; malformed.push(document);
    }
    for (const document of malformed) assert.throws(() => parseConsolidationBaseline(document));
    assert.deepEqual(parseConsolidationBaseline(empty()), empty());
  }],
  ["same-count replacements are new debt, while fixed identities must leave the baseline", () => {
    const before = empty(); before.gates[library] = ["catch.button"];
    const replaced = empty(); replaced.gates[library] = ["catch.badge"];
    assert.equal(consolidationDifferences(replaced, before).length, 2);
    assert.match(consolidationDifferences(replaced, before, {freshness: false})[0], /new debt.*catch.badge/u);
    assert.deepEqual(consolidationDifferences(empty(), before, {freshness: false}), []);
    assert.match(consolidationDifferences(empty(), before)[0], /stale allowance/u);
  }],
  ["a stranded record holds only the tool's closed list, each name an allowance with its ticket", () => {
    assert.ok(parseConsolidationBaseline(withStranded({[strandedId]: strandedTicket})));
    const outside = withStranded({}, ["website/src/shared/ui/primitives/x.tsx::Elsewhere"]);
    outside.strandedByRetirement[single]["website/src/shared/ui/primitives/x.tsx::Elsewhere"] = "CAT-1";
    const wrongTicket = withStranded({[strandedId]: "CAT-1"});
    const notAllowed = withStranded({[strandedId]: strandedTicket}); notAllowed.gates[single] = [];
    const otherGate = withStranded({}); otherGate.strandedByRetirement = {[library]: {}};
    for (const document of [outside, wrongTicket, notAllowed, otherGate]) assert.throws(() => parseConsolidationBaseline(document));
  }],
  ["recording a stranded name lets it in once, then the record may only shrink", () => {
    const first = withStranded({[strandedId]: strandedTicket}, ["website/src/shared/ui/a.tsx::Other"]);
    const findings = strandedDifferences(consolidationDifferences(first, empty(), {freshness: false}), first, empty());
    assert.deepEqual(findings, [`new debt ${single}: website/src/shared/ui/a.tsx::Other`]);
    const recorded = withStranded({[strandedId]: strandedTicket});
    assert.deepEqual(strandedDifferences(consolidationDifferences(recorded, recorded, {freshness: false}), recorded, recorded), []);
    const grown = withStranded({[strandedId]: strandedTicket, [otherStrandedId]: otherStrandedTicket});
    assert.deepEqual(strandedDifferences(consolidationDifferences(grown, recorded, {freshness: false}), grown, recorded),
      [`new debt ${single}: ${otherStrandedId}`, `new stranded name ${single}: ${otherStrandedId}`]);
    const emptied = withStranded({});
    assert.deepEqual(strandedDifferences(consolidationDifferences(emptied, recorded, {freshness: false}), emptied, recorded), []);
    assert.equal(strandedDifferences(consolidationDifferences(recorded, emptied, {freshness: false}), recorded, emptied).length, 2);
  }],
  ["moving debt between CSS files or surfaces cannot spend another file's allowance", () => {
    const before = empty(); before.gates[css] = {"admin/src/a.css": 20};
    for (const file of ["admin/src/b.css", "website/src/b.css"]) {
      const moved = empty(); moved.gates[css] = {[file]: 20};
      assert.match(consolidationDifferences(moved, before, {freshness: false})[0], /new debt/u);
    }
    const shorter = empty(); shorter.gates[css] = {"admin/src/a.css": 19};
    assert.match(consolidationDifferences(shorter, before)[0], /stale allowance/u);
  }],
  ["inventory identities and CSS budgets must agree with every canonical total and surface", () => {
    const measures = Object.fromEntries([
      "t1WithoutStyledReact", "priorityWithoutStyledReact", "headlessControls", "t1WithoutCatalogParity",
    ].map((name) => [name, {value: 0, ids: []}]));
    Object.assign(measures, {webAdapters: {value: 1, bySurface: {admin: 1}},
      webSingleUseShared: {value: 0}, webPageCssLines: {value: 2, bySurface: {admin: 2}}});
    const inventory = {rows: [{id: "admin/src/shared/a.tsx::Adapter", surface: "admin", mapping: {kind: "adapter"}}]};
    const source = {measures, inventory, css: {"admin/src/a.css": 2}};
    assert.equal(consolidationSnapshot(source).gates["screens.web_adapters"].length, 1);
    measures.webAdapters.bySurface.admin = 0;
    assert.throws(() => consolidationSnapshot(source), /disagrees with scorecard/u);
    measures.webAdapters.bySurface.admin = 1; measures.webAdapters.value = 2;
    assert.throws(() => consolidationSnapshot(source), /disagree with scorecard/u);
  }],
  ["page CSS uses the scorecard's newline scope and excludes only the two shared layers", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-css-ratchet-"));
    try {
      for (const file of ["website/src/styles/base.css", "website/src/styles/catch-language.css", "website/src/a.css", "admin/src/a.css"]) {
        fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
        fs.writeFileSync(path.join(root, file), "a{}\nb{}");
      }
      assert.deepEqual(pageCssBudgets(root), {"admin/src/a.css": 1, "website/src/a.css": 1});
    } finally { fs.rmSync(root, {recursive: true}); }
  }],
  ["history reads the fetched-main merge base, not a rewritten working baseline", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-web-ratchet-git-"));
    const git = (args) => execFileSync("git", args, {cwd: root, stdio: "pipe"});
    try {
      git(["init", "-q"]); git(["config", "user.email", "probe@example.invalid"]); git(["config", "user.name", "Ratchet probe"]);
      fs.writeFileSync(path.join(root, "source"), "initial"); git(["add", "source"]); git(["commit", "-qm", "initial"]);
      git(["update-ref", "refs/remotes/origin/main", "HEAD"]);
      assert.equal(previousConsolidationBaseline(root), null);
      fs.mkdirSync(path.dirname(path.join(root, baselinePath)), {recursive: true});
      fs.writeFileSync(path.join(root, baselinePath), JSON.stringify(empty()));
      git(["add", baselinePath]); git(["commit", "-qm", "baseline"]); git(["update-ref", "refs/remotes/origin/main", "HEAD"]);
      const changed = empty(); changed.gates[library] = ["catch.button"];
      fs.writeFileSync(path.join(root, baselinePath), JSON.stringify(changed));
      assert.deepEqual(previousConsolidationBaseline(root), empty());
      assert.match(consolidationDifferences(changed, previousConsolidationBaseline(root), {freshness: false})[0], /new debt/u);
    } finally { fs.rmSync(root, {recursive: true}); }
  }],
];

export function runConsolidationRatchetProbes() {
  for (const [, probe] of probes) probe();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [name, probe] of probes) test(name, probe);
}
