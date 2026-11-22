// The screen-move log and what reads it: --verify, which accepts exactly the
// diff a move may make, and --imports-only, which replays logged moves onto
// another branch. The log records each group's moves, so both work however
// the move PR was merged.
import {isDeepStrictEqual} from "node:util";
import {
  holdsOnlyExports,
  pathTextExtensions,
  rewritePathMentions,
  stripDirectiveLines,
} from "./dart_moves.mjs";
import {screenMoveLogPath, carriedScreensPath} from "./screen_move_rewrite.mjs";

const contextMapPath = "tool/architecture/context_map.json";

export function parseLog(source) {
  if (source == null || source.trim() === "") return {version: 1, entries: []};
  const log = JSON.parse(source);
  if (log?.version !== 1 || !Array.isArray(log.entries)) {
    throw new Error(`${screenMoveLogPath} must be {"version": 1, "entries": [...]}.`);
  }
  const groups = new Set();
  for (const entry of log.entries) {
    if (typeof entry?.group !== "string" || entry.moves == null || typeof entry.moves !== "object") {
      throw new Error(`${screenMoveLogPath} has an entry without a group and moves.`);
    }
    if (groups.has(entry.group)) throw new Error(`${screenMoveLogPath} logs group ${entry.group} twice.`);
    groups.add(entry.group);
  }
  return log;
}

export function formatLog(log) {
  return `${JSON.stringify(log, null, 2)}\n`;
}

export function logEntry({group, entries, moves, folders}) {
  return {
    group,
    entries: entries.map((entry) => ({path: entry.path, moveTo: entry.moveTo})),
    moves: Object.fromEntries([...moves].sort((a, b) => a[0].localeCompare(b[0]))),
    folders: Object.fromEntries([...folders].sort((a, b) => a[0].localeCompare(b[0]))),
  };
}

// The entries a newer log adds to an older one. The older entries must
// survive unchanged.
export function appendedEntries(older, newer) {
  const problems = [];
  if (newer.entries.length < older.entries.length ||
      !isDeepStrictEqual(newer.entries.slice(0, older.entries.length), older.entries)) {
    problems.push(`${screenMoveLogPath} changed or removed earlier entries`);
  }
  const known = new Set(older.entries.map((entry) => entry.group));
  return {entries: newer.entries.filter((entry) => !known.has(entry.group)), problems};
}

const commentLine = /^[ \t]*\/\/[ \t]*(?:provider-graph:|ignore:)/u;

// What a move commit may hold, and nothing else: the logged renames; Dart
// files that differ only in directive lines once moved paths are normalised;
// other text equal after rewriting moved paths; generator-owned outputs;
// removed context map lines; carried-screens lines naming moved files;
// whole-line removals of provider-graph reviews and catch_ui_lints ignores in
// moved files; new context public API files; and the one appended log entry.
export function verifyScreenMove({changes, read, regenerated, packages}) {
  const problems = [];
  const older = safeLog(read("old", screenMoveLogPath), problems, "parent");
  const newer = safeLog(read("new", screenMoveLogPath), problems, "commit");
  if (older == null || newer == null) return problems;
  const appended = appendedEntries(older, newer);
  problems.push(...appended.problems);
  if (appended.entries.length !== 1) {
    problems.push(`a move commit appends exactly one ${screenMoveLogPath} entry; this one appends ${appended.entries.length}`);
    return problems;
  }
  const entry = appended.entries[0];
  const moves = new Map(Object.entries(entry.moves));
  const folders = Object.entries(entry.folders ?? {});
  const sources = new Map([...moves].map(([from, to]) => [to, from]));
  const movedPaths = new Set([...moves.keys(), ...moves.values()]);
  const normalizeText = (text) => rewritePathMentions(text, moves, folders, packages).source;
  for (const {status, file} of changes) {
    if (file === screenMoveLogPath) continue;
    if (status === "D") {
      if (!moves.has(file)) problems.push(`deleted a file the log does not move: ${file}`);
      continue;
    }
    if (regenerated.has(file)) {
      if (status === "A" && !sources.has(file)) {
        problems.push(`added a generated output that no moved file explains: ${file}`);
      }
      continue;
    }
    if (status === "A" && !sources.has(file)) {
      if (!/^lib\/contexts\/([^/]+)\/\1\.dart$/u.test(file)) {
        problems.push(`added a file the log does not move: ${file}`);
      } else if (!holdsOnlyExports(read("new", file).toString())) {
        problems.push(`public API file holds more than exports: ${file}`);
      }
      continue;
    }
    const before = read("old", sources.get(file) ?? file);
    const after = read("new", file);
    if (file === contextMapPath) {
      // Removing an entry may drop the comma of the line before a closing ].
      const beforeLines = before.toString().split("\n");
      const afterLines = after.toString().split("\n");
      const beforeSet = new Set(beforeLines);
      const afterSet = new Set(afterLines);
      const removed = beforeLines.filter((line) => !afterSet.has(line));
      const added = afterLines.filter((line) => !beforeSet.has(line));
      if (!removed.every((line) => /"path": "/u.test(line) || line.trim() === "") ||
          !added.every((line) => beforeSet.has(`${line},`))) {
        problems.push(`${contextMapPath} changed beyond removing entries`);
      }
      continue;
    }
    if (file === carriedScreensPath) {
      const beforeLines = new Set(before.toString().split("\n"));
      const afterLines = new Set(after.toString().split("\n"));
      const touched = [...afterLines].filter((line) => !beforeLines.has(line))
        .concat([...beforeLines].filter((line) => !afterLines.has(line)));
      const structural = (line) => /^[\s[\]{},]*$/u.test(line);
      if (!touched.every((line) => structural(line) ||
          [...movedPaths].some((moved) => line.includes(`"${moved}"`)))) {
        problems.push(`${carriedScreensPath} changed beyond entries for moved files`);
      }
      continue;
    }
    if (!pathTextExtensions.test(file)) {
      if (!Buffer.from(before).equals(Buffer.from(after))) {
        problems.push(`${file} changed content`);
      }
      continue;
    }
    if (file.endsWith(".dart")) {
      const strip = (text) => stripDirectiveLines(normalizeText(text));
      const oldText = strip(before.toString());
      const newText = strip(after.toString());
      if (oldText === newText) continue;
      if (moves.has(sources.get(file) ?? "") && onlyCommentLinesRemoved(oldText, newText)) continue;
      problems.push(`${file} changed beyond directives and moved paths`);
      continue;
    }
    if (normalizeText(before.toString()) !== after.toString()) {
      problems.push(`${file} changed beyond moved paths`);
    }
  }
  for (const [from, to] of moves) {
    if (!changes.some((change) => change.status === "A" && change.file === to)) {
      problems.push(`logged move did not happen: ${from} -> ${to}`);
    }
    if (!changes.some((change) => change.status === "D" && change.file === from)) {
      problems.push(`logged move left its source: ${from}`);
    }
  }
  return problems;
}

function safeLog(source, problems, side) {
  try {
    return parseLog(source == null ? null : source.toString());
  } catch (error) {
    problems.push(`the ${side}'s ${screenMoveLogPath} is invalid: ${error.message}`);
    return null;
  }
}

// The new text is the old text with some provider-graph or ignore comment
// lines deleted, and nothing else.
function onlyCommentLinesRemoved(oldText, newText) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  let index = 0;
  for (const line of oldLines) {
    if (index < newLines.length && newLines[index] === line) {
      index += 1;
    } else if (!commentLine.test(line)) {
      return false;
    }
  }
  return index === newLines.length;
}

// For --imports-only: the files a replay must still move. A file the branch
// added under a moved folder (a group entry's folder, or a test folder the
// move emptied) follows that folder; a generated part follows its source.
export function replayMoves({entries, files}) {
  const moves = new Map();
  const folders = [];
  for (const entry of entries) {
    for (const [from, to] of Object.entries(entry.moves)) moves.set(from, to);
    for (const mapped of entry.entries ?? []) {
      if (mapped.path.endsWith("/")) folders.push([mapped.path, mapped.moveTo]);
    }
    for (const [from, to] of Object.entries(entry.folders ?? {})) folders.push([from, to]);
  }
  folders.sort((a, b) => b[0].length - a[0].length);
  const present = new Set(files);
  const branchMoves = new Map();
  for (const file of files) {
    if (moves.has(file)) {
      branchMoves.set(file, moves.get(file));
      continue;
    }
    const generated = /^(.*)\.(?:g|freezed)\.dart$/u.exec(file);
    const source = generated == null ? null : `${generated[1]}.dart`;
    const folder = folders.find(([from]) => (source ?? file).startsWith(from));
    if (folder == null) continue;
    const target = `${folder[1]}${file.slice(folder[0].length)}`;
    if (!present.has(target)) branchMoves.set(file, target);
  }
  return {logged: moves, branchMoves, folders};
}
