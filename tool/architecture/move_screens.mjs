#!/usr/bin/env node
// Phase 4 screen move: moves legacy screens into their app package
// (apps/<app>/lib), a shared page (lib/pages) or a context's actions/ and
// data/ folders, one context map group at a time. See --help.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {checkMoveTargets, loadContextMap} from "./check_context_map.mjs";
import {git, packageRoots, trackedFiles} from "./lib/dart_moves.mjs";
import {createGraph, loadSymbolGraph} from "./lib/screen_move_graph.mjs";
import {classify, planSourceMoves} from "./lib/screen_move_plan.mjs";
import {
  applyGroupPlan,
  buildGroupPlan,
  contextMapPath,
  fileReader,
  replayEntries,
  replayImports,
} from "./lib/screen_move_apply.mjs";
import {screenMovesDir} from "./lib/screen_move_rewrite.mjs";
import {regeneratedOutputs} from "./lib/screen_move_outputs.mjs";
import {readRecords, verifyScreenMove} from "./lib/screen_move_verify.mjs";

const modes = ["classify", "plan", "apply", "verify", "imports-only", "check"];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export function parseArgs(argv) {
  const args = {mode: null, group: null, commit: null, from: null, since: null,
    root: null, graph: null, json: false, markdown: false, suggestClosure: false,
    cleanupComments: true};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[(index += 1)];
      if (next == null || next.startsWith("--")) throw new Error(`${arg} needs a value.`);
      return next;
    };
    if (modes.includes(arg.slice(2)) && arg.startsWith("--")) {
      if (args.mode != null) throw new Error(`Choose one mode, not --${args.mode} and ${arg}.`);
      args.mode = arg.slice(2);
    } else if (arg === "--group") args.group = value();
    else if (arg === "--commit") args.commit = value();
    else if (arg === "--from") args.from = value();
    else if (arg === "--since") args.since = value();
    else if (arg === "--root") args.root = value();
    else if (arg === "--graph") args.graph = value();
    else if (arg === "--json") args.json = true;
    else if (arg === "--markdown") args.markdown = true;
    else if (arg === "--suggest-closure") args.suggestClosure = true;
    else if (arg === "--skip-comment-cleanup") args.cleanupComments = false;
    else if (arg === "--help" || arg === "-h") args.mode = "help";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.mode == null) throw new Error(`Choose a mode: ${modes.map((mode) => `--${mode}`).join(", ")}.`);
  if (["plan", "apply"].includes(args.mode) && args.group == null) throw new Error(`--${args.mode} needs --group <group>.`);
  if (args.mode === "verify" && args.commit == null) throw new Error("--verify needs --commit <sha>.");
  if (args.mode === "imports-only" && (args.from == null) === (args.since == null)) {
    throw new Error("--imports-only needs exactly one of --from <move-commit> or --since <ref>.");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/move_screens.mjs --classify [--json]
  node tool/architecture/move_screens.mjs --plan --group <group> [--markdown|--json] [--suggest-closure]
  node tool/architecture/move_screens.mjs --apply --group <group> [--skip-comment-cleanup]
  node tool/architecture/move_screens.mjs --verify --commit <sha>
  node tool/architecture/move_screens.mjs --imports-only (--from <move-commit> | --since <ref>)
  node tool/architecture/move_screens.mjs --check
Options: --root <repo> (default: this checkout), --graph <file> (a saved
dart_symbol_imports.dart output instead of running the analyzer).

A group is the set of ${contextMapPath} legacy entries with that "group"; each
moves its folder or file to its "moveTo". A root test file may move into an
app's test/ or integration_test/ folder; every file that imports it must then
move too. --classify labels every legacy file
host, consumer, shared or unreached from what each app actually reaches.
--plan lists the moves (each library with its parts), test and golden moves,
regenerated outputs and every error that blocks the move; --markdown prints
it as a pull request description. --apply performs a plan with no errors and
writes one commit plus the group's record in ${screenMovesDir}. --verify proves a
move commit holds only what a move may change. --imports-only replays recorded
moves onto another branch without committing. --check fails if lib/ or a
shared package imports an app, an app imports another app, or a moveTo is
invalid. The analyzer runs over fetched Dart packages
(bash tool/git/bootstrap_worktree.sh --target flutter).`);
}

function context(args) {
  const root = args.root ? path.resolve(args.root) : fromRepo();
  const files = trackedFiles(root);
  const packages = packageRoots(root, files);
  const map = loadContextMap(fs.readFileSync(path.join(root, contextMapPath), "utf8"));
  return {root, files, packages, map};
}

export function runCli(argv) {
  const args = parseArgs(argv);
  if (args.mode === "help") {
    printHelp();
    return 0;
  }
  const {root, files, packages, map} = context(args);
  if (args.mode === "verify") return runVerify({root, commit: args.commit, packages});
  if (args.mode === "check") return runCheck({root, files, map});
  if (args.mode === "imports-only") {
    const entries = replayEntries({root, from: args.from, since: args.since});
    if (entries.length === 0) {
      console.log("No recorded screen move is missing from this branch.");
      return 0;
    }
    console.log(JSON.stringify(replayImports({root, entries, packages, map}), null, 2));
    return 0;
  }
  const graph = loadSymbolGraph({root, graphPath: args.graph, packages});
  if (args.mode === "classify") {
    const result = classify({graph, files, map});
    console.log(args.json ? JSON.stringify(result, null, 2) : renderClassification(result));
    return 0;
  }
  const plan = buildGroupPlan({root, group: args.group, graph, files, packages, map});
  if (args.mode === "plan") {
    if (args.json) console.log(JSON.stringify(planJson(plan, args), null, 2));
    else console.log(renderPlan(plan, {markdown: args.markdown, suggestClosure: args.suggestClosure}));
    return plan.errors.length > 0 ? 1 : 0;
  }
  if (plan.errors.length > 0) {
    console.error(renderPlan(plan, {markdown: false, suggestClosure: true}));
    return 1;
  }
  console.log(JSON.stringify(applyGroupPlan({root, plan, cleanupComments: args.cleanupComments}), null, 2));
  return 0;
}

function runVerify({root, commit, packages}) {
  const changes = git(["diff", "--name-status", "--no-renames", `${commit}^`, commit], root)
    .split("\n").filter(Boolean).map((line) => {
      const [status, file] = line.split("\t");
      return {status: status[0], file};
    });
  const read = (side, file) => {
    try {
      return git(["show", `${side === "old" ? `${commit}^` : commit}:${file}`], root,
        {encoding: "buffer", stdio: ["ignore", "pipe", "ignore"]});
    } catch {
      return null;
    }
  };
  const text = (side) => (file) => read(side, file)?.toString() ?? null;
  const regenerated = regeneratedOutputs({readBefore: text("old"), readAfter: text("new")});
  const problems = verifyScreenMove({changes, read, regenerated, packages});
  if (problems.length > 0) {
    console.error(`Commit ${commit} is not a mechanical screen move:`);
    for (const problem of problems) console.error(`- ${problem}`);
    return 1;
  }
  console.log(`Commit ${commit} holds only the recorded renames, directive lines, moved paths and generated outputs.`);
  return 0;
}

// What holds between moves: lib/ and the shared packages never import an
// app, apps never import each other, and every moveTo is valid.
export function checkRepository({root, files, map, read = fileReader(root)}) {
  const problems = [];
  const appPackages = new Map(files
    .map((file) => /^apps\/([^/]+)\/pubspec\.yaml$/u.exec(file)?.[1])
    .filter(Boolean)
    .map((app) => [/^name:\s*(\S+)/mu.exec(read(`apps/${app}/pubspec.yaml`) ?? "")?.[1], app])
    .filter(([name]) => name != null));
  for (const file of files) {
    if (!file.endsWith(".dart")) continue;
    const owner = /^apps\/([^/]+)\//u.exec(file)?.[1] ?? null;
    if (owner == null && !file.startsWith("lib/") && !/^packages\/[^/]+\/lib\//u.test(file)) continue;
    const source = read(file) ?? "";
    for (const match of source.matchAll(/^(?:import|export)\s+['"]package:([A-Za-z_][A-Za-z0-9_]*)\//gmu)) {
      const app = appPackages.get(match[1]);
      if (app == null || app === owner) continue;
      problems.push(owner == null
        ? `${file} imports package:${match[1]}; lib/ and the shared packages never import an app.`
        : `${file} (apps/${owner}) imports package:${match[1]} (apps/${app}).`);
    }
  }
  for (const finding of checkMoveTargets({map, files})) problems.push(finding.reason);
  const emptyGraph = createGraph({version: 1, files: {}}, []);
  for (const group of new Set(map.legacy.map((entry) => entry.group).filter(Boolean))) {
    const {errors} = planSourceMoves({group, map, files, graph: emptyGraph, read});
    problems.push(...errors.map((error) => error.message));
  }
  try {
    const records = readRecords({files, read});
    const groups = new Set();
    for (const record of records) {
      if (groups.has(record.group)) problems.push(`${screenMovesDir} records group ${record.group} twice.`);
      groups.add(record.group);
    }
  } catch (error) {
    problems.push(error.message);
  }
  return problems;
}

function runCheck({root, files, map}) {
  const problems = checkRepository({root, files, map});
  if (problems.length > 0) {
    console.error(`Screen move check failed (${problems.length} problem(s)):`);
    for (const problem of problems) console.error(`- ${problem}`);
    return 1;
  }
  console.log("Screen move check passed: no app import crosses its package and every moveTo is valid.");
  return 0;
}

function renderClassification(result) {
  const lines = ["Legacy files by the app that reaches them:", ""];
  for (const [scope, counts] of Object.entries(result.summary)) {
    lines.push(`${scope.padEnd(8)} host ${counts.host}, consumer ${counts.consumer}, shared ${counts.shared}, unreached ${counts.unreached}`);
  }
  const folders = new Map();
  for (const row of result.files) {
    const folder = row.path.split("/").slice(0, 2).join("/");
    const counts = folders.get(folder) ?? {host: 0, consumer: 0, shared: 0, unreached: 0};
    counts[row.label] += 1;
    folders.set(folder, counts);
  }
  lines.push("", "| Folder | Host | Consumer | Shared | Unreached |", "|---|---|---|---|---|");
  for (const [folder, counts] of [...folders].sort()) {
    lines.push(`| ${folder} | ${counts.host} | ${counts.consumer} | ${counts.shared} | ${counts.unreached} |`);
  }
  return lines.join("\n");
}

function planJson(plan, args) {
  return {
    group: plan.group,
    entries: plan.entries,
    moves: Object.fromEntries(plan.sourceMoves),
    testMoves: Object.fromEntries(plan.testMoves),
    goldenMoves: Object.fromEntries(plan.goldenMoves),
    folders: Object.fromEntries(plan.folders),
    rewrittenFiles: [...plan.writes.keys()].sort(),
    deletedExports: plan.deletedExports,
    splitBarrels: plan.splitBarrels,
    publicApi: plan.publicApi,
    regenerated: plan.regenerated,
    carried: plan.carried,
    errors: plan.errors,
    ...(args.suggestClosure ? {suggestion: plan.suggestion} : {}),
  };
}

export function renderPlan(plan, {markdown, suggestClosure}) {
  const out = [];
  const heading = (text) => out.push("", markdown ? `### ${text}` : `${text}:`);
  const table = (rows) => {
    if (rows.length === 0) {
      out.push(markdown ? "_None._" : "  none");
      return;
    }
    if (markdown) {
      out.push("| From | To |", "|---|---|", ...rows.map(([from, to]) => `| \`${from}\` | \`${to}\` |`));
    } else {
      out.push(...rows.map(([from, to]) => `  ${from} -> ${to}`));
    }
  };
  const list = (items) => {
    if (items.length === 0) out.push(markdown ? "_None._" : "  none");
    else out.push(...items.map((item) => (markdown ? `- ${item}` : `  - ${item}`)));
  };
  out.push(markdown ? `## Screen move: \`${plan.group}\`` : `Screen move plan for group ${plan.group}`);
  out.push("", `${plan.sourceMoves.size} source file(s), ${plan.testMoves.size} test file(s) and ` +
    `${plan.goldenMoves.size} golden baseline(s) move; ${plan.writes.size} file(s) get rewritten ` +
    `directives or path mentions; ${plan.splitBarrels} barrel import(s) become direct imports and ` +
    `${plan.deletedExports.length} barrel export(s) are deleted. Errors: ${plan.errors.length}.`);
  heading("Map entries");
  list(plan.entries.map((entry) => `${entry.path} -> ${entry.moveTo}`));
  heading("Source moves");
  table([...plan.sourceMoves].sort());
  heading("Test moves");
  table([...plan.testMoves].sort());
  heading("Golden baselines");
  table([...plan.goldenMoves].sort());
  heading("Folders whose mentions move with them");
  table(plan.folders);
  heading("Deleted barrel exports");
  list(plan.deletedExports.map(({file, target}) => `${file} stops exporting ${target}`));
  heading("Regenerated outputs (written by their generators, never rewritten)");
  list(plan.regenerationSteps.map((step) => `${step.command.join(" ")} (${step.when}): ${step.outputs}`));
  heading("Carried screens");
  list([`${plan.carried.status}: ${plan.carried.reason}`, ...plan.carried.entries]);
  heading("Errors (the move applies only when this is empty)");
  list(plan.errors.map((error) => `[${error.kind}] ${error.message}`));
  if (suggestClosure) {
    heading("Suggested closure (lib/ files that would have to join the group)");
    list(Object.entries(plan.suggestion.byFolder).map(([folder, count]) => `${folder}/ (${count})`));
    heading("Closure blockers (importers that cannot move with a screen)");
    list(plan.suggestion.blockers);
  }
  return out.join("\n");
}
