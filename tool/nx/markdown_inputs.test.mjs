// Markdown a check reads selects the lanes that run the check (design A, gate 1).
//
// Most lane inputs negate *.md, so a document reaches a lane only when nx.json
// names it. Two sources say which documents checks read:
//   - tools_manifest.json impactPaths: `affected-tools`, which runs in the
//     Tools lane, re-runs an entry when one of them changes;
//   - a scan of the scripts CI runs for Markdown paths and patterns. Each
//     script that names one is listed below as a reader, with the lanes that
//     run its read, or as a mention, with why the name is not a read.
// An unlisted script, a stale entry or a document that does not select its
// lanes fails.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {callerGraph, compare, targets} from "./shadow_plan.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(workspaceRoot, file), "utf8"));

// Scripts that read Markdown: each document (path or glob) with the lanes
// whose jobs run the read. A gate job (source-preflight, plan) runs on every
// change, so a read there needs no lane.
export const markdownReaders = {
  "tool/architecture/check_app_architecture_exhibits.mjs": {"docs/app_architecture.md": ["tools"]},
  "tool/audit/check_fn_readme_inventory.mjs": {"functions/README.md": ["functions"]},
  // flutter-ci.yml runs it; the migration note must keep the organizerType marker.
  "tool/check_organizer_nomenclature.mjs": {"docs/migrations/clubs_to_organizers.md": ["flutter"]},
  // source-preflight runs the freshness check on every change; Tools runs the generator's own check.
  "tool/ci/generated_inventories.mjs": {"docs/widget_catalog.md": []},
  "tool/design/generate_widget_catalog.mjs": {"docs/widget_catalog.md": ["tools"]},
  // The kit token importer rewrites and checks the mapping table in the source pack README.
  "tool/design/playbook/import_kit_tokens.mjs": {"design/source_packs/website-playbook/README.md": ["tools"]},
  "tool/design/build_host_feature_responsibilities.mjs": {"lib/hosts/*/README.md": ["tools"]},
  "tool/design/check_comprehensive_todo_summary.mjs": {"docs/design_parity/comprehensive_todo.md": ["tools"]},
  "tool/design/component_matrix.mjs": {"design/components/component_matrix.md": ["tools"]},
  // The component READMEs it reads come from the design source (--source), not the repository.
  "tool/design/import_ds_props.mjs": {"design/components/guidelines/*.md": ["tools"]},
  "tool/design/publish_design_system.mjs": {"design/components/guidelines/*.md": ["tools"]},
  // The docs job checks documents under docs/; the policy job checks the root agent and policy documents.
  "tool/docs/check_doc_metadata.mjs": {"docs/**/*.md": ["docs"], "AGENTS.md": ["policy_docs"]},
};

// Scripts that name Markdown without CI reading it: a pointer in a message, a
// path filter that skips documents, an output, or a local-only tool.
export const markdownMentions = {
  "tool/architecture/provider_graph.dart": "names docs/screen_data_caching.md as the rule's documentation",
  "tool/architecture/rename_to_organizer.mjs": "a path filter that leaves documents out of the rename",
  "tool/ci/flutter_package_scope.mjs": "classifies Markdown as outside package code",
  "tool/contracts/generate_market_catalog.mjs": "a path filter that leaves documents out of the scan",
  "tool/contracts/generate_schema_contracts.mjs": "names the generated INDEX.md it writes",
  "tool/design/check_new_widget_inventory.mjs": "names docs/app_architecture.md in its advice",
  "tool/design/lib/design_system_manifest.mjs": "README paths inside the hosted design-system artifact, not the repository",
  "tool/design/widgetbook_compare_server.mjs": "a local review server; CI does not run it",
  "tool/git/worktree_guard.mjs": "the local task launcher; CI runs only its fixture tests",
  "tool/harness/lib/flutter_document_selection.mjs": "selection logic that classifies Markdown paths",
  "tool/harness/lib/flutter_test_selection.dart": "selection logic that classifies Markdown paths",
  "tool/lib/functions_test_reads.mjs": "an example path in its documentation",
  "tool/lib/functions_test_selection.mjs": "selection logic that classifies Markdown paths",
  "tool/marketing/import_hosted_captures.mjs": "checks the widget catalog its own import rewrote",
  "tool/nx/catch_projects.mjs": "Nx input patterns",
  "tool/nx/shadow_plan.mjs": "selection logic that classifies Markdown paths",
  "tool/scaffold.mjs": "names the READMEs the generator writes",
};

const scanRoots = ["tool", "website/scripts", "admin/scripts", "functions/src", "functions/scripts", "test",
  "integration_test", "widgetbook/lib", "scripts"];
const readsFiles = /readFileSync|readFile\(|readdirSync|readdir\(|File\(|Directory\(|globSync|fs\.glob|git", \["(?:show|ls-files)|cat |find /u;
const markdownLiteral = /(["'`])((?:[^"'`\s\\]|\\.)*?\.md)\1/gu;
const markdownPattern = /\\\.md\b|\*\.md|\.md\$/u;

/** The scripts CI can run that read files and name a Markdown path or pattern. */
export function markdownNamingScripts(root = workspaceRoot) {
  const files = execFileSync("git", ["ls-files", "--", ...scanRoots], {cwd: root, encoding: "utf8"}).trim().split("\n")
    .filter((file) => /\.(?:mjs|cjs|js|ts|dart|sh|py)$/u.test(file) && !/\.test\.|_test\.dart$|\.spec\./u.test(file));
  return files.filter((file) => {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    return readsFiles.test(text) && (markdownPattern.test(text) || [...text.matchAll(markdownLiteral)].length > 0);
  }).sort();
}

/** The Markdown impactPaths of the tools manifest, with the entries that name them. */
export function manifestMarkdown(manifest = readJson("tool/tools_manifest.json")) {
  const byPath = new Map();
  for (const tool of manifest.tools) {
    for (const impact of tool.impactPaths ?? []) {
      if (impact.endsWith(".md")) byPath.set(impact, [...(byPath.get(impact) ?? []), tool.id]);
    }
  }
  return byPath;
}

const globToRegExp = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/gu, "\\$&")
  .replace(/\*\*\//gu, "\u0000").replace(/\*/gu, "[^/]*").replace(/\u0000/gu, "(?:.*/)?")}$`, "u");

/** The lane-tools inputs that name a document (file or glob), with the negations applied. */
export function laneToolsCovers(nxJson, file) {
  const options = nxJson.plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs").options;
  const inputs = options.sourceProjects.find((project) => project.name === "lane-tools").targets.lane.inputs
    .filter((input) => input.startsWith("{workspaceRoot}/") || input.startsWith("!{workspaceRoot}/"));
  const strip = (input) => input.replace(/^!?\{workspaceRoot\}\//u, "");
  const included = inputs.filter((input) => !input.startsWith("!")).some((input) => globToRegExp(strip(input)).test(file));
  const excluded = inputs.filter((input) => input.startsWith("!")).some((input) => globToRegExp(strip(input)).test(file));
  return included && !excluded;
}

// The lanes a merge-queue group runs for one changed file.
function lanesFor(file) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-markdown-inputs-"));
  const graphFile = path.join(dir, "graph.json");
  try {
    execFileSync("npx", ["nx", "affected", "-t", ...targets, "--files", file, "--excludeTaskDependencies",
      `--graph=${graphFile}`], {cwd: workspaceRoot, stdio: "ignore", env: {...process.env, NX_DAEMON: "false"}});
    const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
    const tagsByProject = Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []]));
    return compare({plannerLanes: [], mode: "merge_group", nxTasks: Object.keys(graph.tasks.tasks), tagsByProject,
      changedFiles: [file]}).nxLanes;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

const tracked = execFileSync("git", ["ls-files", "--", "*.md"], {cwd: workspaceRoot, encoding: "utf8"}).trim().split("\n");
// One tracked document per path or glob: the lanes a glob selects are the same for each file it matches.
const sample = (glob) => tracked.find((file) => globToRegExp(glob).test(file));

test("every script that reads files and names Markdown is a listed reader or mention", () => {
  const scanned = markdownNamingScripts();
  const listed = new Set([...Object.keys(markdownReaders), ...Object.keys(markdownMentions)]);
  assert.deepEqual(scanned.filter((file) => !listed.has(file)), [],
    "list each new script in markdownReaders (with the lanes that run its read) or markdownMentions (with why it is not a read)");
  assert.deepEqual([...listed].filter((file) => !scanned.includes(file)).sort(), [],
    "an entry no longer names Markdown: remove it");
  for (const file of Object.keys(markdownReaders)) assert.equal(file in markdownMentions, false, `${file} is listed twice`);
});

test("every Markdown impactPath in the tools manifest is a lane-tools input", () => {
  const nxJson = readJson("nx.json");
  const missing = [...manifestMarkdown().keys()].filter((file) => !laneToolsCovers(nxJson, file));
  assert.deepEqual(missing, [], "add each to lane-tools inputs in nx.json: affected-tools runs its entries in the Tools lane");
});

test("negative control: dropping a document from lane-tools is caught", () => {
  const nxJson = readJson("nx.json");
  const tools = nxJson.plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs").options.sourceProjects
    .find((project) => project.name === "lane-tools").targets.lane;
  const todo = "docs/design_parity/comprehensive_todo.md";
  assert.equal(laneToolsCovers(nxJson, todo), true);
  tools.inputs = tools.inputs.filter((input) => !input.endsWith(todo));
  assert.equal(laneToolsCovers(nxJson, todo), false);
  // A negation removes a document a glob would include.
  tools.inputs.push("{workspaceRoot}/docs/design_parity/*", `!{workspaceRoot}/docs/design_parity/*.md`);
  assert.equal(laneToolsCovers(nxJson, todo), false);
});

test("each document a check reads selects the lanes that run the check", () => {
  const graph = callerGraph();
  const expected = new Map();
  const add = (file, lanes, why) => {
    const entry = expected.get(file) ?? {lanes: new Set(), why: []};
    for (const lane of lanes) entry.lanes.add(lane);
    entry.why.push(why);
    expected.set(file, entry);
  };
  // affected-tools re-runs these entries in the Tools lane, so a document that
  // breaks one fails there. Lanes that also run the entry by name (the app
  // builds run audit:context-map) repeat a check this run already makes.
  for (const [file, ids] of manifestMarkdown()) add(file, ["tools"], `impactPath of ${ids.join(", ")}`);
  for (const [reader, documents] of Object.entries(markdownReaders)) {
    for (const [glob, lanes] of Object.entries(documents)) {
      const file = sample(glob);
      assert.ok(file, `${reader}: no tracked document matches ${glob}`);
      add(file, lanes, `read by ${reader}`);
    }
  }
  const failures = [];
  for (const [file, {lanes, why}] of expected) {
    const selected = lanesFor(file);
    const missing = [...lanes].filter((lane) => !selected.includes(lane));
    if (missing.length > 0) failures.push(`${file} (${why.join("; ")}) does not select ${missing.join(", ")}`);
  }
  assert.deepEqual(failures, []);
});

test("the readers' lanes run them: each is a lane whose jobs reach the script", () => {
  const graph = callerGraph();
  for (const [reader, documents] of Object.entries(markdownReaders)) {
    const reached = graph.lanes.get(reader) ?? new Set();
    for (const lane of Object.values(documents).flat()) assert.ok(reached.has(lane), `${reader}: no ${lane} job reaches it`);
  }
});
