#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {loadContextMap, placePath} from "./check_context_map.mjs";
import {
  barrelSource,
  git,
  holdsOnlyExports,
  pathTextExcluded,
  pathTextExtensions,
  pruneLegacyEntries,
  rewriteDartDirectives,
  rewritePathMentions,
  sortDirectives as sortPackageDirectives,
  stripDirectives,
  trackedFiles,
  withBarrelExports,
} from "./lib/dart_moves.mjs";

// The shared move mechanics live in lib/dart_moves.mjs; the rename codemods
// and older callers import them from here.
export {
  barrelSource,
  pruneLegacyEntries,
  rewriteDartDirectives,
  rewritePathMentions,
  withBarrelExports,
};

const contextMapPath = "tool/architecture/context_map.json";

// Rewritten URIs change import order; the analyzer's own fixes re-sort and
// drop duplicates in every Dart package that imports this one.
const dartPackages = [".", "widgetbook", "apps/host", "apps/consumer"];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

// Where a legacy context file lands: lib/contexts/<context>/<layer>/<rest>.
// The layer is the file's domain/ or data/ folder; the path below it is kept.
// Root files other than a feature barrel go to data/. Barrels, legacy UI and
// files outside a context stay where they are.
//
// A legacy entry with a moveTo sends what it places there instead: a folder
// entry moves every tracked file below it, keeping the path below the folder,
// and a file entry moves that file with its generated .g.dart and
// .freezed.dart parts.
export function planMoves(files, map) {
  const moves = new Map();
  for (const file of files) {
    const explicit = explicitTarget(file, map);
    if (explicit != null) {
      moves.set(file, explicit);
      continue;
    }
    if (!file.startsWith("lib/") || !file.endsWith(".dart")) continue;
    const place = placePath(file, map);
    if (place == null || !place.legacy || place.layer !== "context") continue;
    if (isFeatureBarrel(file)) continue;
    const layered = /^lib\/(?:.+?\/)?(domain|data)\/(.+)$/u.exec(file);
    const [layer, rest] = layered == null
      ? ["data", path.posix.basename(file)]
      : [layered[1], layered[2]];
    moves.set(file, `${map.roots.contexts}${place.context}/${layer}/${rest}`);
  }
  // A generated part lives beside its source: it moves with it and never on
  // its own, however a map entry would place it.
  const tracked = new Set(files);
  for (const file of files) {
    const part = /^(.*)\.(?:g|freezed)\.dart$/u.exec(file);
    if (part == null || !tracked.has(`${part[1]}.dart`)) continue;
    const sourceTarget = moves.get(`${part[1]}.dart`);
    if (sourceTarget == null) {
      moves.delete(file);
    } else {
      moves.set(file, `${sourceTarget.slice(0, -".dart".length)}${file.slice(part[1].length)}`);
    }
  }
  const byTarget = new Map();
  for (const [from, to] of moves) {
    byTarget.set(to, [...(byTarget.get(to) ?? []), from]);
  }
  const collisions = [...byTarget].filter(([, sources]) => sources.length > 1);
  return {moves, collisions};
}

function explicitTarget(file, map) {
  const source = file.replace(/\.(?:g|freezed)\.dart$/u, ".dart");
  const entry = map.legacy.find((candidate) => source.startsWith(candidate.path));
  // An entry with a group is a Phase 4 screen move, planned and applied by
  // move_screens.mjs; this codemod leaves it alone.
  if (entry?.moveTo == null || entry.group != null) return null;
  if (entry.path.endsWith("/")) return `${entry.moveTo}${file.slice(entry.path.length)}`;
  if (source !== entry.path) return null;
  return `${entry.moveTo.slice(0, -".dart".length)}${file.slice(source.length - ".dart".length)}`;
}

// Folder entries whose whole folder moves to one place. Other text may name
// the folder itself, so its mentions move with it; a folder with a longer
// entry inside it is split and keeps its name.
export function folderMoves(map) {
  return map.legacy
    .filter((entry) => entry.moveTo != null && entry.group == null && entry.path.endsWith("/"))
    .filter((entry) => !map.legacy.some((other) =>
      other !== entry && other.path.startsWith(entry.path)))
    .map((entry) => [entry.path, entry.moveTo]);
}

export function isFeatureBarrel(file) {
  const match = /^lib\/([^/]+)\/([^/]+)\.dart$/u.exec(file);
  return match != null && match[1] === match[2];
}

// A move commit may only move the planned files, change directive lines, swap
// moved path strings, add context public API files and drop map entries.
// `moves` is the plan computed from the parent commit, so tiny files whose
// imports dominate their content are still paired exactly.
export function verifyMoveDiff({changes, moves, folders = [], read}) {
  const problems = [];
  const sources = new Map([...moves].map(([from, to]) => [to, from]));
  for (const {status, file} of changes) {
    if (status === "D") {
      if (!moves.has(file)) problems.push(`deleted a file: ${file}`);
      continue;
    }
    if (status === "A" && !sources.has(file)) {
      if (!/^lib\/contexts\/([^/]+)\/\1\.dart$/u.test(file)) {
        problems.push(`added a file that is not a context public API: ${file}`);
      } else if (!holdsOnlyExports(read("new", file))) {
        problems.push(`public API file holds more than exports: ${file}`);
      }
      continue;
    }
    const before = read("old", sources.get(file) ?? file);
    const after = read("new", file);
    if (file === contextMapPath) {
      const removedOnly = before.split("\n").filter((line) => !after.split("\n").includes(line))
        .every((line) => /"path": "/u.test(line) || line.trim() === "");
      if (!removedOnly) problems.push(`${contextMapPath} changed beyond removing entries`);
      continue;
    }
    const normalize = (text) => file.endsWith(".dart")
      ? stripDirectives(rewritePathMentions(text, moves, folders).source)
      : rewritePathMentions(text, moves, folders).source;
    if (normalize(before) !== normalize(after)) {
      problems.push(`${file} changed beyond directives and moved paths`);
    }
  }
  for (const [from, to] of moves) {
    if (!changes.some((change) => change.status === "A" && change.file === to)) {
      problems.push(`planned move did not happen: ${from} -> ${to}`);
    }
  }
  return problems;
}

function applyMoves({root, moves, folders, map, rewriteOnly}) {
  const files = trackedFiles(root);
  const barrelExports = new Map();
  if (!rewriteOnly) {
    for (const [from, to] of moves) {
      fs.mkdirSync(path.join(root, path.dirname(to)), {recursive: true});
      git(["mv", from, to], root);
    }
  }
  const reverse = new Map([...moves].map(([from, to]) => [to, from]));
  let dartFiles = 0;
  let pathMentions = 0;
  const written = [];
  for (const current of trackedFiles(root)) {
    if (!pathTextExtensions.test(current)) continue;
    const absolute = path.join(root, current);
    if (!fs.existsSync(absolute)) continue;
    let source = fs.readFileSync(absolute, "utf8");
    let changed = false;
    if (current.endsWith(".dart")) {
      const original = rewriteOnly ? current : (reverse.get(current) ?? current);
      const result = rewriteDartDirectives({
        file: original,
        source,
        moves,
        map,
        barrelExports,
      });
      if (result.changed) {
        source = result.source;
        changed = true;
        dartFiles += 1;
      }
    }
    if (!pathTextExcluded.some((pattern) => pattern.test(current))) {
      const mentions = rewritePathMentions(source, moves, folders);
      if (mentions.count > 0) {
        source = mentions.source;
        changed = true;
        pathMentions += mentions.count;
      }
    }
    if (changed) {
      fs.writeFileSync(absolute, source);
      written.push(current);
    }
  }
  const barrels = [];
  for (const [context, targets] of barrelExports) {
    const barrel = `${map.roots.contexts}${context}/${context}.dart`;
    const barrelPath = path.join(root, barrel);
    fs.writeFileSync(barrelPath, fs.existsSync(barrelPath)
      ? withBarrelExports(fs.readFileSync(barrelPath, "utf8"), context, targets, map)
      : barrelSource(context, targets, map));
    barrels.push(barrel);
    written.push(barrel);
  }
  if (!rewriteOnly) {
    const mapFile = path.join(root, contextMapPath);
    const pruned = pruneLegacyEntries(fs.readFileSync(mapFile, "utf8"), trackedFiles(root));
    fs.writeFileSync(mapFile, pruned.source);
    written.push(contextMapPath);
    return {files: files.length, dartFiles, pathMentions, barrels, written, prunedEntries: pruned.removed};
  }
  return {files: files.length, dartFiles, pathMentions, barrels, written};
}

function sortDirectives(root) {
  sortPackageDirectives(root, dartPackages);
}

// The moves a commit made are the plan computed from its parent's map and
// files, not git's rename guess.
function movesForCommit(root, commit) {
  const files = git(["ls-tree", "-r", "--name-only", `${commit}^`], root).split("\n").filter(Boolean);
  const map = loadContextMap(git(["show", `${commit}^:${contextMapPath}`], root));
  return {moves: planMoves(files, map).moves, folders: folderMoves(map)};
}

function commitChanges(root, commit) {
  return git(["diff", "--name-status", "--no-renames", `${commit}^`, commit], root)
    .split("\n").filter(Boolean).map((line) => {
      const [status, file] = line.split("\t");
      return {status: status[0], file};
    });
}

function parseArgs(argv) {
  const args = {mode: "plan", from: null, commit: null, root: null};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--plan", "--check", "--apply", "--imports-only", "--verify"].includes(arg)) {
      args.mode = arg.slice(2);
    } else if (arg === "--from" || arg === "--commit" || arg === "--root") {
      args[arg.slice(2)] = argv[(index += 1)];
    } else if (arg === "--help" || arg === "-h") {
      args.mode = "help";
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/move_to_contexts.mjs --plan
  node tool/architecture/move_to_contexts.mjs --check
  node tool/architecture/move_to_contexts.mjs --apply
  node tool/architecture/move_to_contexts.mjs --imports-only --from <move-commit>
  node tool/architecture/move_to_contexts.mjs --verify --commit <move-commit>

Moves every legacy domain/ and data/ file that ${contextMapPath} places in a
context to lib/contexts/<context>/<layer>/, and everything a legacy entry with
a "moveTo" places to that target. Rewrites every Dart directive and every
whole-path mention in text files (and mentions of a folder that moves whole),
writes or extends each context's public API file from the imports that cross
into it, and removes map entries that no longer place a file.

--check fails while any file is still waiting to move, so no new code lands in
a legacy domain/ or data/ folder. --imports-only rewrites another branch's
imports using the renames in the given move commit; for a move planned with
moveTo entries, pass the move commit from its pull request, whose parent still
holds the plan. --verify proves a move commit holds only renames, directive
lines, moved-path strings and public API files.`);
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "help") {
    printHelp();
    return;
  }
  const root = args.root ? path.resolve(args.root) : fromRepo();
  const map = loadContextMap(fs.readFileSync(path.join(root, contextMapPath), "utf8"));

  if (args.mode === "verify") {
    if (!args.commit) throw new Error("--verify needs --commit <sha>.");
    const problems = verifyMoveDiff({
      changes: commitChanges(root, args.commit),
      ...movesForCommit(root, args.commit),
      read: (side, file) => git(["show", `${side === "old" ? `${args.commit}^` : args.commit}:${file}`], root),
    });
    if (problems.length > 0) {
      console.error(`Move commit ${args.commit} is not purely mechanical:`);
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log(`Move commit ${args.commit} holds only renames, directives, moved paths and public API files.`);
    return;
  }

  if (args.mode === "imports-only") {
    if (!args.from) throw new Error("--imports-only needs --from <move-commit>.");
    const {moves, folders} = movesForCommit(root, args.from);
    if (moves.size === 0) {
      throw new Error(`${args.from} moves nothing by its parent's map; pass the move commit itself, not a squash of the whole pull request.`);
    }
    const result = applyMoves({root, moves, folders, map, rewriteOnly: true});
    sortDirectives(root);
    console.log(`Rewrote ${result.dartFiles} Dart file(s) and ${result.pathMentions} path mention(s) for ${moves.size} moved file(s).`);
    return;
  }

  const {moves, collisions} = planMoves(trackedFiles(root), map);
  if (collisions.length > 0) {
    console.error("Two files would land on one path:");
    for (const [target, sources] of collisions) console.error(`- ${target}: ${sources.join(", ")}`);
    process.exit(1);
  }
  if (args.mode === "check") {
    if (moves.size > 0) {
      console.error(`${moves.size} legacy file(s) are waiting to move:`);
      for (const [from, to] of [...moves].slice(0, 20)) console.error(`- ${from} -> ${to}`);
      process.exit(1);
    }
    console.log("No legacy file is waiting to move.");
    return;
  }
  if (args.mode === "plan") {
    const perDestination = {};
    for (const to of moves.values()) {
      const parts = to.split("/");
      const destination = parts[1] === "contexts" ? parts[2] : parts.slice(1, 3).join("/");
      perDestination[destination] = (perDestination[destination] ?? 0) + 1;
    }
    console.log(JSON.stringify({moves: moves.size, perDestination}, null, 2));
    return;
  }
  const result = applyMoves({root, moves, folders: folderMoves(map), map, rewriteOnly: false});
  sortDirectives(root);
  // Stage only what the move wrote and the Dart files the analyzer re-sorted,
  // never unrelated working-tree changes such as refreshed lockfiles.
  const resorted = git(["diff", "--name-only", "--", "*.dart"], root).split("\n").filter(Boolean);
  const toStage = [...new Set([...result.written, ...resorted])];
  for (let index = 0; index < toStage.length; index += 200) {
    git(["add", "--", ...toStage.slice(index, index + 200)], root);
  }
  delete result.written;
  console.log(JSON.stringify({moved: moves.size, ...result}, null, 2));
}
