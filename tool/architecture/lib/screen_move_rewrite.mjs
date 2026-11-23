// The text side of a screen move, computed in memory before anything is
// written: Dart directives (across packages, barrel imports in moving files
// split into direct imports, barrel exports deleted when their file leaves
// lib/ or lands where the barrel may not depend), whole-path mentions in text
// files, and the scan for mentions of folders the move empties.
import path from "node:path";
import {
  dedupeImports,
  escapeRegExp,
  formatUri,
  packageOfPath,
  packageUriFor,
  pathTextExcluded,
  pathTextExtensions,
  rewriteDartDirectives,
  resolveUri,
  rewritePathMentions,
} from "./dart_moves.mjs";
import {placePath} from "../check_context_map.mjs";
import {isBarrelImport, isRepoPath} from "./screen_move_graph.mjs";
import {appOf, isLegacyFile} from "./screen_move_plan.mjs";

const layerRank = {kernel: 0, platform: 1, context: 2, pages: 3, app: 4};

export const screenMoveLogPath = "tool/architecture/screen_move_log.json";
export const carriedScreensPath = "tool/architecture/carried_screens.json";

// Phase 3's exclusions, plus the lint probe fixtures (synthetic
// legacy-shaped paths) and the move's own records of old paths.
export const mentionExcluded = [
  ...pathTextExcluded,
  /^tool\/check_catch_ui_lints\.sh$/u,
  /^tool\/catch_ui_lints_probe\//u,
  new RegExp(`^${escapeRegExp(screenMoveLogPath)}$`, "u"),
  new RegExp(`^${escapeRegExp(carriedScreensPath)}$`, "u"),
];

export function isMentionText(file, regenerated = new Set()) {
  return pathTextExtensions.test(file) && !regenerated.has(file) &&
    !mentionExcluded.some((pattern) => pattern.test(file));
}

// Rewrites one Dart file's directives. `file` is its path before the move.
export function rewriteScreenDirectives({file, source, graph, moves, packages, map, barrelExports}) {
  const newFile = moves.get(file) ?? file;
  const after = (target) => moves.get(target) ?? target;
  const entry = graph.files.get(file);
  const fallback = () => {
    const result = rewriteDartDirectives({file, source, moves, map, barrelExports, packages});
    return {...result, deletedExports: [], splitBarrels: 0};
  };
  if (entry == null) return fallback();
  const directives = [...entry.directives].sort((a, b) => b.offset - a.offset);
  if (directives.some((directive) =>
    !source.startsWith(directive.kind.split(" ")[0], directive.offset))) {
    // The file changed since the graph was built; rewrite it by its text.
    return fallback();
  }
  const moving = moves.has(file);
  const newPackage = packageOfPath(newFile, packages)?.name;
  const deletedExports = [];
  let splitBarrels = 0;
  let out = source;
  for (const directive of directives) {
    const text = source.slice(directive.offset, directive.end);
    let replacement = null;
    if (directive.kind === "export" && isRepoPath(directive.target)) {
      const exported = after(directive.target);
      if ((appOf(exported) != null && packageOfPath(exported, packages)?.name !== newPackage) ||
          exportTurnsIllegal({exporter: newFile, library: directive.target, moves, map})) {
        replacement = "";
        deletedExports.push(directive.target);
      }
    } else if (moving && isBarrelImport(directive) && isRepoPath(directive.target) &&
        isLegacyFile(directive.target, map) &&
        Object.keys(directive.uses).every(isRepoPath)) {
      replacement = directImports({directive, file, newFile, after, graph, packages});
      splitBarrels += 1;
    } else if (isBarrelImport(directive) && isRepoPath(directive.target)) {
      const lost = new Set(Object.keys(directive.uses).filter((library) =>
        library !== directive.target &&
        exportTurnsIllegal({exporter: after(directive.target), library, moves, map})));
      if (lost.size > 0) {
        replacement = splitLostImports({
          directive, text, file, newFile, after, graph, packages, map, moves, barrelExports, lost,
        });
        splitBarrels += 1;
      }
    }
    if (replacement == null) {
      replacement = rewriteDartDirectives({
        file,
        source: text,
        moves,
        map,
        barrelExports,
        packages,
      }).source;
    }
    if (replacement === text) continue;
    let start = directive.offset;
    let end = directive.end;
    if (replacement === "") {
      // A deleted directive takes its whole line, trailing comment included.
      const lineStart = out.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = out.indexOf("\n", end);
      const tail = out.slice(end, lineEnd < 0 ? out.length : lineEnd);
      if (out.slice(lineStart, start).trim() === "" && /^\s*(?:\/\/.*)?$/u.test(tail)) {
        start = lineStart;
        end = lineEnd < 0 ? out.length : lineEnd + 1;
      }
    }
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  const changed = out !== source;
  return {source: changed ? dedupeImports(out) : source, changed, deletedExports, splitBarrels};
}

// One import per library that declares a name the barrel import provided,
// keeping its prefix and narrowing its show and hide lists.
function directImports({directive, file, newFile, after, graph, packages}) {
  const ownLibrary = graph.libraryOf(file) ?? file;
  return Object.entries(directive.uses).sort()
    .filter(([library]) => library !== ownLibrary)
    .map(([library, names]) => importLine({directive, library, names, newFile, after, packages}))
    .filter((line) => line != null)
    .join("\n");
}

// The import of one declaring library, with the barrel import's prefix and
// its show and hide lists narrowed to that library; null when its show list
// names nothing from it.
function importLine({directive, library, names, newFile, after, packages}) {
  const show = directive.show == null
    ? null
    : directive.show.filter((name) => names.includes(name));
  if (show != null && show.length === 0) return null;
  const hide = Object.entries(directive.hide ?? {})
    .filter(([, declaring]) => declaring === library)
    .map(([name]) => name);
  const uri = formatUri({
    keyword: "import",
    originalUri: directive.uri,
    fromFile: newFile,
    target: after(library),
    packages,
  });
  return [
    `import '${uri}'`,
    directive.prefix == null ? "" : ` as ${directive.prefix}`,
    show == null ? "" : ` show ${show.join(", ")}`,
    hide.length === 0 ? "" : ` hide ${hide.join(", ")}`,
    ";",
  ].join("");
}

// Whether the move makes `exporter`'s re-export of `library` an illegal
// dependency: the library lands in a higher layer (a legacy feature barrel
// placed in its context re-exporting a file that moves into lib/pages), or in
// a context declared after the exporter's (a barrel of events re-exporting a
// controller that moves into bookings). The move deletes such an export, and
// every import that reached the library through the barrel imports the
// library directly instead.
export function exportTurnsIllegal({exporter, library, moves, map}) {
  if (!moves.has(library)) return false;
  const target = moves.get(library);
  const from = exporter.startsWith("lib/") ? placePath(exporter, map) : null;
  const to = target.startsWith("lib/") ? placePath(target, map) : null;
  if (from == null || to == null) return false;
  if (layerRank[to.layer] !== layerRank[from.layer]) return layerRank[to.layer] > layerRank[from.layer];
  return from.layer === "context" && to.context !== from.context &&
    (map.contextRank.get(to.context) ?? -1) > (map.contextRank.get(from.context) ?? -1);
}

// A barrel import that loses some of its libraries to the move: those come
// in directly, and the barrel import stays for the rest. A staying file is
// not un-barrelled further, since direct imports of legacy presentation
// files would trip catch_arch_cross_feature_presentation_import.
function splitLostImports({directive, text, file, newFile, after, graph, packages, map, moves, barrelExports, lost}) {
  const ownLibrary = graph.libraryOf(file) ?? file;
  const lostLines = () => Object.entries(directive.uses).sort()
    .filter(([library]) => lost.has(library) && library !== ownLibrary)
    .map(([library, names]) => importLine({directive, library, names, newFile, after, packages}))
    .filter((line) => line != null);
  const lines = [];
  const kept = Object.entries(directive.uses).filter(([library]) => !lost.has(library));
  if (kept.length > 0) {
    const keptNames = new Set(kept.flatMap(([, names]) => names));
    const lostNames = new Set(Object.entries(directive.uses)
      .filter(([library]) => lost.has(library))
      .flatMap(([, names]) => names));
    const hidesLost = Object.values(directive.hide ?? {}).some((declaring) => lost.has(declaring));
    if (directive.show == null && !hidesLost) {
      lines.push(rewriteDartDirectives({file, source: text, moves, map, barrelExports, packages}).source);
    } else {
      const show = directive.show?.filter((name) => keptNames.has(name) || !lostNames.has(name)) ?? null;
      if (show != null && show.length === 0) return lostLines().join("\n");
      const hide = Object.entries(directive.hide ?? {})
        .filter(([, declaring]) => !lost.has(declaring))
        .map(([name]) => name);
      const uri = formatUri({
        keyword: "import",
        originalUri: directive.uri,
        fromFile: newFile,
        target: after(directive.target),
        packages,
      });
      lines.push([
        `import '${uri}'`,
        directive.prefix == null ? "" : ` as ${directive.prefix}`,
        show == null ? "" : ` show ${show.join(", ")}`,
        hide.length === 0 ? "" : ` hide ${hide.join(", ")}`,
        ";",
      ].join(""));
    }
  }
  return [...lines, ...lostLines()].join("\n");
}

// The text-only form of the barrel-export rule, for replays without a graph:
// an export of a file now in another app package than the exporting file is
// deleted, with its line.
export function deleteAppExports({file, source, moves, packages}) {
  const newFile = moves.get(file) ?? file;
  const newPackage = packageOfPath(newFile, packages)?.name;
  const deleted = [];
  const out = source.replace(
    /^export\s+(['"])([^'"]+)\1[^;]*;[ \t]*(?:\/\/[^\n]*)?\n?/gmu,
    (line, quote, uri) => {
      const target = resolveUri(file, uri, packages);
      if (target == null) return line;
      const exported = moves.get(target) ?? target;
      if (appOf(exported) == null || packageOfPath(exported, packages)?.name === newPackage) return line;
      deleted.push(target);
      return "";
    },
  );
  return {source: out, deleted};
}

// Folders that hold tracked files before the move and none after. A folder
// whose files all moved under one new folder maps to it, so text naming it
// moves too; the others must no longer be named anywhere.
export function emptiedFolders({files, moves}) {
  const after = new Set(files.map((file) => moves.get(file) ?? file));
  const remaining = new Set();
  for (const file of after) {
    for (let dir = path.posix.dirname(file); dir !== "."; dir = path.posix.dirname(dir)) {
      if (remaining.has(`${dir}/`)) break;
      remaining.add(`${dir}/`);
    }
  }
  const folders = new Map();
  for (const from of moves.keys()) {
    for (let dir = path.posix.dirname(from); dir !== "."; dir = path.posix.dirname(dir)) {
      const folder = `${dir}/`;
      if (remaining.has(folder) || folders.has(folder)) continue;
      folders.set(folder, null);
    }
  }
  const mapped = [];
  const unmapped = [];
  for (const folder of folders.keys()) {
    const inside = files.filter((file) => file.startsWith(folder));
    let target = null;
    let consistent = inside.length > 0;
    for (const file of inside) {
      const to = moves.get(file);
      const rest = file.slice(folder.length);
      if (to == null || !to.endsWith(`/${rest}`)) {
        consistent = false;
        break;
      }
      const candidate = to.slice(0, to.length - rest.length);
      if (target != null && candidate !== target) {
        consistent = false;
        break;
      }
      target = candidate;
    }
    if (consistent) mapped.push([folder, target]);
    else unmapped.push(folder);
  }
  return {mapped: mapped.sort(), unmapped: unmapped.sort()};
}

// Whole-path mentions in every text file: moved files, moved tests and
// golden baselines, and folders that moved whole, as repository paths and as
// package URIs. One combined pattern finds the files worth rewriting.
export function rewriteMentions({texts, moves, folders, packages}) {
  const needles = new Set();
  for (const [from] of [...moves, ...folders]) {
    needles.add(from.endsWith("/") ? from.slice(0, -1) : from);
    const uri = packageUriFor(from, packages);
    if (uri != null) needles.add(uri.endsWith("/") ? uri.slice(0, -1) : uri);
  }
  const written = new Map();
  if (needles.size === 0) return written;
  const finder = new RegExp([...needles].map(escapeRegExp).join("|"), "u");
  for (const [file, source] of texts) {
    if (!finder.test(source)) continue;
    const ownMoves = new Map([...moves].filter(([from]) =>
      source.includes(from) || source.includes(packageUriFor(from, packages) ?? "\0")));
    const ownFolders = folders.filter(([from]) =>
      source.includes(from.slice(0, -1)) || source.includes(packageUriFor(from, packages) ?? "\0"));
    const result = rewritePathMentions(source, ownMoves, ownFolders, packages);
    if (result.count > 0) written.set(file, result.source);
  }
  return written;
}

// Text that still names a folder the move emptied without a single new home.
export function staleFolderMentions({texts, folders}) {
  const findings = [];
  if (folders.length === 0) return findings;
  const repoPathStart = "(?<![\\w.-])(?<!(?<!\\.\\.|['\"`\\s(])/)";
  const patterns = folders.map((folder) => [folder, new RegExp(
    `${repoPathStart}${escapeRegExp(folder.slice(0, -1))}(?![\\w.-])`, "u")]);
  for (const [file, source] of texts) {
    for (const [folder, pattern] of patterns) {
      if (!source.includes(folder.slice(0, -1))) continue;
      const lines = source.split("\n");
      for (const [index, line] of lines.entries()) {
        if (pattern.test(line)) findings.push({file, line: index + 1, folder});
      }
    }
  }
  return findings;
}
