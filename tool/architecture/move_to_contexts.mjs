#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {loadContextMap, placePath} from "./check_context_map.mjs";

const contextMapPath = "tool/architecture/context_map.json";
const appPackage = "package:catch_dating_app/";
const pathTextExtensions = /\.(?:arb|json|md|mjs|js|ts|tsx|yaml|yml|sh|dart|template)$/u;
// Scanner tests use legacy-shaped paths as synthetic fixtures; they are not
// references to real files and must keep their shape.
const pathTextExcluded = [
  /(?:^|\/)node_modules\//u,
  /\.test\.mjs$/u,
  /\.(?:g|freezed)\.dart$/u,
  /^tool\/architecture\/context_map\.json$/u,
  // Vendored bundles are pinned by checksum; their comments stay as shipped.
  /^design\/source_packs\//u,
];

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
  if (entry?.moveTo == null) return null;
  if (entry.path.endsWith("/")) return `${entry.moveTo}${file.slice(entry.path.length)}`;
  if (source !== entry.path) return null;
  return `${entry.moveTo.slice(0, -".dart".length)}${file.slice(source.length - ".dart".length)}`;
}

// Folder entries whose whole folder moves to one place. Other text may name
// the folder itself, so its mentions move with it; a folder with a longer
// entry inside it is split and keeps its name.
export function folderMoves(map) {
  return map.legacy
    .filter((entry) => entry.moveTo != null && entry.path.endsWith("/"))
    .filter((entry) => !map.legacy.some((other) =>
      other !== entry && other.path.startsWith(entry.path)))
    .map((entry) => [entry.path, entry.moveTo]);
}

export function isFeatureBarrel(file) {
  const match = /^lib\/([^/]+)\/([^/]+)\.dart$/u.exec(file);
  return match != null && match[1] === match[2];
}

// Rewrites every directive URI in one Dart file for the moves. Cross-context
// imports from bounded-context files go through the target context's public
// API file; the files they need are recorded in barrelExports.
export function rewriteDartDirectives({file, source, moves, map, barrelExports}) {
  const newFile = moves.get(file) ?? file;
  const fromContext = contextOf(newFile, map);
  let changed = false;
  const out = source.replace(
    /^(import|export|part(?:\s+of)?)(\s[^;]*;)/gmu,
    (statement, keyword, body) => {
      const rewritten = body.replace(/(['"])([^'"]+)\1/gu, (literal, quote, uri) => {
        const oldTarget = resolveUri(file, uri);
        if (oldTarget == null) return literal;
        const newTarget = moves.get(oldTarget) ?? oldTarget;
        if (newTarget === oldTarget && newFile === file) return literal;
        let target = newTarget;
        const toContext = contextOf(newTarget, map);
        if (!keyword.startsWith("part") && fromContext != null &&
            toContext != null && toContext !== fromContext) {
          const barrel = `${map.roots.contexts}${toContext}/${toContext}.dart`;
          if (newTarget !== barrel) {
            barrelExports.set(toContext, (barrelExports.get(toContext) ?? new Set()).add(newTarget));
            target = barrel;
          }
        }
        const next = formatUri({
          keyword,
          originalUri: uri,
          fromFile: newFile,
          target,
        });
        if (next !== uri) changed = true;
        return `${quote}${next}${quote}`;
      });
      return `${keyword}${rewritten}`;
    },
  );
  return {source: changed ? dedupeImports(out) : source, changed};
}

function contextOf(file, map) {
  if (!file.startsWith(map.roots.contexts)) return null;
  return file.slice(map.roots.contexts.length).split("/")[0];
}

function resolveUri(file, uri) {
  if (uri.startsWith(appPackage)) return `lib/${uri.slice(appPackage.length)}`;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(uri)) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), uri));
}

function formatUri({keyword, originalUri, fromFile, target}) {
  const relative = () => path.posix.relative(path.posix.dirname(fromFile), target);
  if (keyword.startsWith("part")) return relative();
  const wasPackage = originalUri.startsWith(appPackage);
  if (target.startsWith("lib/") && (wasPackage || keyword === "import" || fromFile.startsWith("lib/"))) {
    if (!wasPackage && keyword === "export" &&
        target.startsWith(`${path.posix.dirname(fromFile)}/`)) {
      return relative();
    }
    return `${appPackage}${target.slice("lib/".length)}`;
  }
  return relative();
}

// Two imports of one context's files both become its public API file; keep
// one directive, merging `show` lists and preferring an unrestricted import.
function dedupeImports(source) {
  const first = new Map();
  const edits = [];
  for (const match of source.matchAll(/^import\s+(['"])([^'"]+)\1([^;]*);\n/gmu)) {
    const [statement, , uri, clause] = match;
    if (/\bas\b|\bif\s*\(/u.test(clause)) continue;
    const kept = first.get(uri);
    if (kept == null) {
      first.set(uri, {index: match.index, length: statement.length, uri, original: clause, clause});
      continue;
    }
    kept.clause = mergeClauses(kept.clause, clause);
    edits.push({index: match.index, length: statement.length, text: ""});
  }
  for (const kept of first.values()) {
    if (kept.clause.trim() !== kept.original.trim()) {
      edits.push({index: kept.index, length: kept.length, text: `import '${kept.uri}'${kept.clause};\n`});
    }
  }
  let out = source;
  for (const edit of edits.sort((x, y) => y.index - x.index)) {
    out = out.slice(0, edit.index) + edit.text + out.slice(edit.index + edit.length);
  }
  return out;
}

function mergeClauses(a, b) {
  const shows = (clause) => /^\s*show\s+(.+)$/su.exec(clause.trim())?.[1]
    ?.split(",").map((name) => name.trim()).filter(Boolean);
  const left = shows(a);
  const right = shows(b);
  if (left == null || right == null) return "";
  return ` show ${[...new Set([...left, ...right])].sort().join(", ")}`;
}

export function barrelSource(context, targets, map) {
  const root = `${map.roots.contexts}${context}/`;
  const lines = [...targets]
    .map((target) => target.slice(root.length))
    .sort()
    .map((relative) => `export '${relative}';`);
  return [
    `// Public API of the ${context} context: what other contexts may import.`,
    "// Written by tool/architecture/move_to_contexts.mjs from the imports that",
    "// crossed into this context; trim it as the context's API settles.",
    ...lines,
    "",
  ].join("\n");
}

// Adds the exports a move needs to an existing public API file, leaving its
// other lines as they are.
export function withBarrelExports(source, context, targets, map) {
  const root = `${map.roots.contexts}${context}/`;
  const present = new Set([...source.matchAll(/^export\s+'([^']+)'/gmu)].map((match) => match[1]));
  const missing = [...targets]
    .map((target) => target.slice(root.length))
    .filter((relative) => !present.has(relative))
    .sort()
    .map((relative) => `export '${relative}';\n`);
  if (missing.length === 0) return source;
  return `${source.replace(/\n*$/u, "\n")}${missing.join("")}`;
}

// Replaces whole-path mentions of moved files in text files, both as repo
// paths (lib/...) and as package URIs (package:catch_dating_app/...), which
// generators and templates embed in the Dart they write. A path may start
// with a slash right after a quote, as the path fragments lints match do, or
// climb to the repository root (../../lib/...); a path inside another folder
// (apps/host/lib/...) is a different file. Mentions of a folder that moved
// whole move with it.
export function rewritePathMentions(source, moves, folders = []) {
  const repoPathStart = "(?<![\\w.-])(?<!(?<!\\.\\.|['\"`\\s(])/)";
  let out = source;
  let count = 0;
  const replace = (pattern, replacement) => {
    out = out.replace(new RegExp(pattern, "gu"), () => {
      count += 1;
      return replacement;
    });
  };
  for (const [from, to] of [...moves].sort((a, b) => b[0].length - a[0].length)) {
    replace(`${repoPathStart}${escapeRegExp(from)}(?![\\w-])`, to);
    if (from.startsWith("lib/") && to.startsWith("lib/")) {
      replace(
        `${escapeRegExp(`${appPackage}${from.slice("lib/".length)}`)}(?![\\w-])`,
        `${appPackage}${to.slice("lib/".length)}`,
      );
    }
  }
  for (const [from, to] of [...folders].sort((a, b) => b[0].length - a[0].length)) {
    replace(`${repoPathStart}${escapeRegExp(from.slice(0, -1))}(?![\\w.-])`, to.slice(0, -1));
    if (from.startsWith("lib/") && to.startsWith("lib/")) {
      replace(
        escapeRegExp(`${appPackage}${from.slice("lib/".length)}`),
        `${appPackage}${to.slice("lib/".length)}`,
      );
    }
  }
  return {source: out, count};
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

// After the move, entries whose path no longer places any file are removed.
export function pruneLegacyEntries(mapSource, files) {
  const kept = [];
  let removed = 0;
  for (const line of mapSource.split("\n")) {
    const match = /^\s*\{"path": "([^"]+)", "(?:context|layer)": "[^"]+"(?:, "moveTo": "[^"]+")?\},?$/u.exec(line);
    if (match && !files.some((file) => file.startsWith(match[1]))) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }
  let out = kept.join("\n");
  out = out.replace(/,(\s*\n\s*\])/gu, "$1").replace(/\n{3,}/gu, "\n\n");
  return {source: out, removed};
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
      } else if (!stripDirectives(read("new", file)).split("\n")
        .every((line) => line.trim() === "" || line.trim().startsWith("//"))) {
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

// Directives and the blank lines that separate their sections carry no
// behavior; everything else must match exactly.
function stripDirectives(source) {
  return source
    .replace(/^(?:import|export|part(?:\s+of)?)\s[^;]*;\n?/gmu, "")
    .replace(/^\s*\n/u, "")
    .replace(/\n{3,}/gu, "\n\n");
}

function git(args, cwd) {
  return execFileSync("git", args, {cwd, encoding: "utf8", maxBuffer: 1 << 28});
}

function trackedFiles(root) {
  return git(["ls-files", "-z"], root).split("\0").filter(Boolean);
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

// The moves a commit made are the plan computed from its parent's map and
// files, not git's rename guess.
function sortDirectives(root) {
  for (const dir of dartPackages) {
    if (!fs.existsSync(path.join(root, dir, "pubspec.yaml"))) continue;
    execFileSync("dart", [
      "fix",
      "--apply",
      "--code=directives_ordering",
      "--code=duplicate_import",
      dir,
    ], {cwd: root, stdio: "ignore"});
  }
}

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
