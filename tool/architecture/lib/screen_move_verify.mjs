// The screen-move records and what reads them: --verify, which accepts
// exactly the diff a move may make, and --imports-only, which replays recorded
// moves onto another branch. Each group's moves live in their own file under
// tool/architecture/screen_moves/, so both work however the move PR was
// merged, and two move PRs never edit the same record.
import {isDeepStrictEqual} from "node:util";
import {
  holdsOnlyExports,
  pathTextExtensions,
  rewritePathMentions,
  stripDirectiveLines,
} from "./dart_moves.mjs";
import {carriedScreensPath, screenMovesDir} from "./screen_move_rewrite.mjs";

const contextMapPath = "tool/architecture/context_map.json";

export function recordPath(group) {
  return `${screenMovesDir}${group}.json`;
}

export function isRecordPath(file) {
  return file.startsWith(screenMovesDir) && file.endsWith(".json");
}

// One group's record: {version: 1, group, sequence, entries, moves, folders}.
// `sequence` is when --apply wrote it, in milliseconds since the epoch; it
// orders replays, so a file that moves twice replays in move order.
export function parseRecord(source, file) {
  let record;
  try {
    record = JSON.parse(source);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
  if (record?.version !== 1 || typeof record.group !== "string" ||
      !Number.isSafeInteger(record.sequence) || record.moves == null || typeof record.moves !== "object") {
    throw new Error(`${file} must be {"version": 1, "group", "sequence", "entries", "moves", "folders"}.`);
  }
  if (recordPath(record.group) !== file) throw new Error(`${file} records group ${record.group}; name it ${recordPath(record.group)}.`);
  return record;
}

export function formatRecord(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function moveRecord({group, sequence, entries, moves, folders}) {
  return {
    version: 1,
    group,
    sequence,
    entries: entries.map((entry) => ({path: entry.path, moveTo: entry.moveTo})),
    moves: Object.fromEntries([...moves].sort((a, b) => a[0].localeCompare(b[0]))),
    folders: Object.fromEntries([...folders].sort((a, b) => a[0].localeCompare(b[0]))),
  };
}

// Every record among `files`, in replay order: by sequence, then group.
export function readRecords({files, read}) {
  return files.filter(isRecordPath)
    .map((file) => parseRecord(read(file) ?? "", file))
    .sort((a, b) => a.sequence - b.sequence || a.group.localeCompare(b.group));
}

const commentLine = /^[ \t]*\/\/[ \t]*(?:provider-graph:|ignore:)/u;

// What a move commit may hold, and nothing else: the logged renames; Dart
// files that differ only in directive lines once moved paths are normalised;
// other text equal after rewriting moved paths; generator-owned outputs;
// removed context map lines; carried-screens lines naming moved files;
// whole-line removals of provider-graph reviews and catch_ui_lints ignores in
// the Dart files the move touched (moved, or with rewritten imports); new
// context public API files; and the one new move record.
export function verifyScreenMove({changes, read, regenerated, packages}) {
  const problems = [];
  const records = changes.filter((change) => isRecordPath(change.file));
  for (const change of records.filter((record) => record.status !== "A")) {
    problems.push(`a move commit only adds its own record; it changed or removed ${change.file}`);
  }
  const added = records.filter((record) => record.status === "A");
  if (added.length !== 1) {
    problems.push(`a move commit adds exactly one ${screenMovesDir} record; this one adds ${added.length}`);
    return problems;
  }
  let entry;
  try {
    entry = parseRecord(read("new", added[0].file)?.toString() ?? "", added[0].file);
  } catch (error) {
    problems.push(error.message);
    return problems;
  }
  const moves = new Map(Object.entries(entry.moves));
  const folders = Object.entries(entry.folders ?? {});
  const sources = new Map([...moves].map(([from, to]) => [to, from]));
  const movedPaths = new Set([...moves.keys(), ...moves.values()]);
  const normalizeText = (text) => rewritePathMentions(text, moves, folders, packages).source;
  for (const {status, file} of changes) {
    if (isRecordPath(file)) continue;
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
      problems.push(...carriedChanges({before, after, moves}));
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
      if (onlyCommentLinesRemoved(oldText, newText)) continue;
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

// The carried list may gain entries for files this move placed, follow a
// carried file that moved again (keeping its `from`), and lose any entry
// (stale carries are dropped wherever they are). Nothing else changes.
function carriedChanges({before, after, moves}) {
  let older;
  let newer;
  try {
    older = JSON.parse(before.toString());
    newer = JSON.parse(after.toString());
  } catch {
    return [`${carriedScreensPath} is not valid JSON`];
  }
  const problems = [];
  const strip = (json) => ({...json, carried: undefined});
  if (!isDeepStrictEqual(strip(older), strip(newer))) {
    problems.push(`${carriedScreensPath} changed beyond its carried entries`);
  }
  const targets = new Map([...moves].map(([from, to]) => [to, from]));
  const oldByPath = new Map((older.carried ?? []).map((entry) => [entry.path, entry]));
  for (const entry of newer.carried ?? []) {
    const keys = Object.keys(entry).sort().join(",");
    const previous = oldByPath.get(entry.path);
    if (keys !== "from,path") {
      problems.push(`${carriedScreensPath} entry ${entry.path} must hold exactly path and from`);
    } else if (previous != null) {
      if (previous.from !== entry.from) problems.push(`${carriedScreensPath} changed the from of ${entry.path}`);
    } else if (!targets.has(entry.path)) {
      problems.push(`${carriedScreensPath} carries ${entry.path}, which this move did not place`);
    } else {
      const source = targets.get(entry.path);
      const followed = oldByPath.get(source);
      if ((followed?.from ?? source) !== entry.from) {
        problems.push(`${carriedScreensPath} entry ${entry.path} must come from ${followed?.from ?? source}`);
      }
    }
  }
  return problems;
}

// The new text is the old text with some provider-graph or ignore comment
// lines deleted, and nothing else. Directive lines are already stripped, so a
// deleted comment that sat among the imports may leave its blank line behind.
function onlyCommentLinesRemoved(oldText, newText) {
  const tidy = (text) => text.split("\n").filter((line) => !commentLine.test(line)).join("\n")
    .replace(/^\s*\n/u, "").replace(/\n{3,}/gu, "\n\n");
  if (tidy(oldText) !== tidy(newText)) return false;
  const oldComments = oldText.split("\n").filter((line) => commentLine.test(line));
  let index = 0;
  for (const line of newText.split("\n").filter((candidate) => commentLine.test(candidate))) {
    while (index < oldComments.length && oldComments[index] !== line) index += 1;
    if (index === oldComments.length) return false;
    index += 1;
  }
  return true;
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
