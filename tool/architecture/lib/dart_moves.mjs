// Shared mechanics for codemods that move Dart files: resolving and writing
// directive URIs across workspace packages, rewriting whole-path mentions in
// text, pruning context map entries, and the Git and analyzer helpers. The
// Phase 3 context move (move_to_contexts.mjs) and the Phase 4 screen move
// (move_screens.mjs) both build on it.
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

export const appPackage = "package:catch_dating_app/";

// The root package alone: what the Phase 3 move resolved. A codemod that moves
// files between packages passes the list packageRoots() reads instead.
export const defaultPackages = Object.freeze([
  Object.freeze({name: "catch_dating_app", dir: "", lib: "lib/"}),
]);

// Every Dart package in the repository, from its pubspec: the root package,
// apps/*, packages/* and widgetbook. `dir` is the package folder ("" for the
// root) and `lib` its library folder, both relative and ending in "/".
export function packageRoots(root, files = trackedFiles(root)) {
  const pubspecs = files.filter((file) =>
    file === "pubspec.yaml" ||
    /^(?:apps|packages)\/[^/]+\/pubspec\.yaml$/u.test(file) ||
    file === "widgetbook/pubspec.yaml");
  const packages = [];
  for (const pubspec of pubspecs) {
    const absolute = path.join(root, pubspec);
    if (!fs.existsSync(absolute)) continue;
    const name = /^name:\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*$/mu
      .exec(fs.readFileSync(absolute, "utf8"))?.[1];
    if (name == null) throw new Error(`${pubspec} has no package name.`);
    const dir = pubspec === "pubspec.yaml" ? "" : `${path.posix.dirname(pubspec)}/`;
    packages.push({name, dir, lib: `${dir}lib/`});
  }
  return sortPackages(packages);
}

export function sortPackages(packages) {
  return [...packages].sort((a, b) => b.dir.length - a.dir.length);
}

// The package a repository path belongs to: the longest package folder that
// holds it. Files outside every package belong to the root package.
export function packageOfPath(file, packages = defaultPackages) {
  return packages.find((candidate) => file.startsWith(candidate.dir)) ?? null;
}

// The package whose lib/ folder holds a path, or null for tests, tools and
// every other file a package: URI cannot name.
export function libPackageOf(file, packages = defaultPackages) {
  const owner = packageOfPath(file, packages);
  return owner != null && file.startsWith(owner.lib) ? owner : null;
}

export function packageUriFor(file, packages = defaultPackages) {
  const owner = libPackageOf(file, packages);
  return owner == null ? null : `package:${owner.name}/${file.slice(owner.lib.length)}`;
}

// The repository path a directive URI names, or null for dart: and packages
// outside the repository.
export function resolveUri(file, uri, packages = defaultPackages) {
  const packageMatch = /^package:([A-Za-z_][A-Za-z0-9_]*)\/(.+)$/u.exec(uri);
  if (packageMatch != null) {
    const owner = packages.find((candidate) => candidate.name === packageMatch[1]);
    return owner == null ? null : `${owner.lib}${packageMatch[2]}`;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(uri)) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), uri));
}

// How a file names a target. Parts stay relative. A target in another
// package's lib/ is always a package: URI; within one package the original
// style is kept, as always_use_package_imports allows a relative export of a
// file below the barrel.
export function formatUri({keyword, originalUri, fromFile, target, packages = defaultPackages}) {
  const relative = () => path.posix.relative(path.posix.dirname(fromFile), target);
  if (keyword.startsWith("part")) return relative();
  const owner = libPackageOf(target, packages);
  if (owner == null) return relative();
  const packageUri = `package:${owner.name}/${target.slice(owner.lib.length)}`;
  if (packageOfPath(fromFile, packages)?.name !== owner.name) return packageUri;
  const wasPackage = originalUri.startsWith("package:");
  if (wasPackage || keyword === "import" || fromFile.startsWith(owner.lib)) {
    if (!wasPackage && keyword === "export" &&
        target.startsWith(`${path.posix.dirname(fromFile)}/`)) {
      return relative();
    }
    return packageUri;
  }
  return relative();
}

// Text files whose whole-path mentions a move rewrites, and Phase 3's
// exclusions. Scanner tests use legacy-shaped paths as synthetic fixtures;
// they are not references to real files and must keep their shape.
export const pathTextExtensions = /\.(?:arb|json|md|mjs|js|ts|tsx|yaml|yml|sh|dart|template)$/u;
export const pathTextExcluded = [
  /(?:^|\/)node_modules\//u,
  /\.test\.mjs$/u,
  /\.(?:g|freezed)\.dart$/u,
  /^tool\/architecture\/context_map\.json$/u,
  // Vendored bundles are pinned by checksum; their comments stay as shipped.
  /^design\/source_packs\//u,
];

export const directivePattern = /^(import|export|part(?:\s+of)?)(\s[^;]*;)/gmu;

// Rewrites every directive URI in one Dart file for the moves. With a context
// map, cross-context imports from bounded-context files go through the target
// context's public API file; the files they need are recorded in
// barrelExports.
export function rewriteDartDirectives({
  file,
  source,
  moves,
  map = null,
  barrelExports = new Map(),
  packages = defaultPackages,
}) {
  const newFile = moves.get(file) ?? file;
  const fromContext = map == null ? null : contextOf(newFile, map);
  let changed = false;
  const out = source.replace(directivePattern, (statement, keyword, body) => {
    const rewritten = body.replace(/(['"])([^'"]+)\1/gu, (literal, quote, uri) => {
      const oldTarget = resolveUri(file, uri, packages);
      if (oldTarget == null) return literal;
      const newTarget = moves.get(oldTarget) ?? oldTarget;
      if (newTarget === oldTarget && newFile === file) return literal;
      let target = newTarget;
      const toContext = map == null ? null : contextOf(newTarget, map);
      if (!keyword.startsWith("part") && fromContext != null &&
          toContext != null && toContext !== fromContext) {
        const barrel = `${map.roots.contexts}${toContext}/${toContext}.dart`;
        if (newTarget !== barrel) {
          barrelExports.set(toContext, (barrelExports.get(toContext) ?? new Set()).add(newTarget));
          target = barrel;
        }
      }
      const next = formatUri({keyword, originalUri: uri, fromFile: newFile, target, packages});
      if (next !== uri) changed = true;
      return `${quote}${next}${quote}`;
    });
    return `${keyword}${rewritten}`;
  });
  return {source: changed ? dedupeImports(out) : source, changed};
}

export function contextOf(file, map) {
  if (!file.startsWith(map.roots.contexts)) return null;
  return file.slice(map.roots.contexts.length).split("/")[0];
}

// Two imports of one URI keep one directive, merging `show` lists and
// preferring an unrestricted import. Prefixed and conditional imports stay.
export function dedupeImports(source) {
  const first = new Map();
  const edits = [];
  for (const match of source.matchAll(/^import\s+(['"])([^'"]+)\1([^;]*);\n/gmu)) {
    const [statement, , uri, clause] = match;
    if (/\bas\b|\bif\s*\(|\bdeferred\b/u.test(clause)) continue;
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

// A context's public API file, written from the files other contexts import.
export function barrelSource(context, targets, map, writer = "tool/architecture/move_to_contexts.mjs") {
  const root = `${map.roots.contexts}${context}/`;
  const lines = [...targets]
    .map((target) => target.slice(root.length))
    .sort()
    .map((relative) => `export '${relative}';`);
  return [
    `// Public API of the ${context} context: what other contexts may import.`,
    `// Written by ${writer} from the imports that`,
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
// generators and templates embed in the Dart they write. A move between
// packages swaps the package name too. A path may start with a slash right
// after a quote, as the path fragments lints match do, or climb to the
// repository root (../../lib/...); a path inside another folder
// (apps/host/lib/...) is a different file. Mentions of a folder that moved
// whole move with it.
export function rewritePathMentions(source, moves, folders = [], packages = defaultPackages) {
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
    const fromUri = packageUriFor(from, packages);
    const toUri = packageUriFor(to, packages);
    if (fromUri != null && toUri != null) {
      replace(`${escapeRegExp(fromUri)}(?![\\w-])`, toUri);
    }
  }
  for (const [from, to] of [...folders].sort((a, b) => b[0].length - a[0].length)) {
    replace(`${repoPathStart}${escapeRegExp(from.slice(0, -1))}(?![\\w.-])`, to.slice(0, -1));
    const fromUri = packageUriFor(from, packages);
    const toUri = packageUriFor(to, packages);
    if (fromUri != null && toUri != null) replace(escapeRegExp(fromUri), toUri);
  }
  return {source: out, count};
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

// After a move, legacy entries whose path no longer places any file are
// removed, whatever other fields (moveTo, group) they carry. Entries are one
// JSON object per line.
export function pruneLegacyEntries(mapSource, files) {
  const kept = [];
  let removed = 0;
  for (const line of mapSource.split("\n")) {
    const entry = legacyEntryOnLine(line);
    if (entry != null && !files.some((file) => file.startsWith(entry.path))) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }
  let out = kept.join("\n");
  out = out.replace(/,(\s*\n\s*\])/gu, "$1").replace(/\n{3,}/gu, "\n\n");
  return {source: out, removed};
}

const legacyEntryFields = new Set(["path", "context", "layer", "moveTo", "group"]);

function legacyEntryOnLine(line) {
  const match = /^\s*(\{"path": .*\}),?$/u.exec(line);
  if (match == null) return null;
  let entry;
  try {
    entry = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (typeof entry?.path !== "string" ||
      (entry.context == null && entry.layer == null) ||
      !Object.keys(entry).every((key) => legacyEntryFields.has(key))) {
    return null;
  }
  return entry;
}

// Directives and the blank lines that separate their sections carry no
// behavior; everything else must match exactly.
export function stripDirectives(source) {
  return source
    .replace(/^(?:import|export|part(?:\s+of)?)\s[^;]*;\n?/gmu, "")
    .replace(/^\s*\n/u, "")
    .replace(/\n{3,}/gu, "\n\n");
}

// Like stripDirectives, but a comment trailing a directive on its line goes
// with it, as it does when a move deletes the directive.
export function stripDirectiveLines(source) {
  return source
    .replace(/^(?:import|export|part(?:\s+of)?)\s[^;]*;[ \t]*(?:\/\/[^\n]*)?\n?/gmu, "")
    .replace(/^\s*\n/u, "")
    .replace(/\n{3,}/gu, "\n\n");
}

// A context public API file holds exports and comments only.
export function holdsOnlyExports(source) {
  return stripDirectives(source).split("\n")
    .every((line) => line.trim() === "" || line.trim().startsWith("//"));
}

export function git(args, cwd, options = {}) {
  return execFileSync("git", args, {cwd, encoding: "utf8", maxBuffer: 1 << 28, ...options});
}

export function trackedFiles(root) {
  return git(["ls-files", "-z"], root).split("\0").filter(Boolean);
}

// Rewritten URIs change import order; the analyzer's own fixes re-sort and
// drop duplicates in every Dart package that imports the moved code.
export function sortDirectives(root, packageDirs) {
  for (const dir of packageDirs) {
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
