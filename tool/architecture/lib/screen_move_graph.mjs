// The resolved import graph the screen move plans with, read from
// tool/architecture/dart_symbol_imports.dart: which libraries each directive
// actually uses (barrels are transparent), each library's parts, who imports
// a library, and which libraries an app reaches from its own code.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {resolveUri} from "./dart_moves.mjs";

// The apps the classifier walks from. Each app's router is its own library
// (lib/routing/host_router.dart, lib/routing/consumer_router.dart), so an app
// reaches only its own screens through ordinary imports.
export const appWalks = [
  {app: "host", root: "apps/host/lib/"},
  {app: "consumer", root: "apps/consumer/lib/"},
];

const generatedPart = /\.(?:g|freezed)\.dart$/u;

export function isGeneratedPart(file) {
  return generatedPart.test(file);
}

export function isRepoPath(value) {
  return typeof value === "string" && value !== "" &&
    !value.startsWith("/") && !/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value);
}

// Runs the analyzer over the repository and returns the raw graph. The Dart
// packages must be fetched (bash tool/git/bootstrap_worktree.sh --target
// flutter).
export function runSymbolGraph(root) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "screen-move-")), "graph.json");
  execFileSync("dart", [
    "run",
    "tool/architecture/dart_symbol_imports.dart",
    "--root",
    root,
    "--out",
    out,
  ], {cwd: root, stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 28});
  return JSON.parse(fs.readFileSync(out, "utf8"));
}

export function loadSymbolGraph({root, graphPath = null, packages}) {
  const raw = graphPath == null
    ? runSymbolGraph(root)
    : JSON.parse(fs.readFileSync(graphPath, "utf8"));
  return createGraph(raw, packages);
}

// Indexes the raw graph. Targets outside the analyzed set (a package the
// analyzer could not resolve) fall back to the URI's repository path.
export function createGraph(raw, packages) {
  if (raw?.version !== 1 || raw.files == null) {
    throw new Error("The symbol import graph is missing or has an unknown version.");
  }
  const files = new Map();
  for (const [file, entry] of Object.entries(raw.files)) {
    files.set(file, {
      library: entry.library ?? file,
      directives: (entry.directives ?? []).map((directive) =>
        normalizeDirective(file, directive, packages)),
    });
  }
  const parts = new Map();
  for (const [file, entry] of files) {
    if (entry.library === file) continue;
    parts.set(entry.library, [...(parts.get(entry.library) ?? []), file].sort());
  }
  const importers = new Map();
  const exporters = new Map();
  const add = (index, key, value) => {
    if (!isRepoPath(key)) return;
    const list = index.get(key) ?? [];
    if (!list.includes(value)) list.push(value);
    index.set(key, list);
  };
  for (const [file, entry] of files) {
    for (const directive of entry.directives) {
      if (directive.kind === "import") {
        for (const used of usedLibraries(directive)) add(importers, used, file);
      } else if (directive.kind === "export") {
        for (const target of directiveTargets(directive)) add(exporters, target, file);
      }
    }
  }
  return {
    files,
    parts,
    importers,
    exporters,
    libraryOf: (file) => files.get(file)?.library ?? null,
  };
}

function normalizeDirective(file, directive, packages) {
  const target = (uri, value) => {
    if (isRepoPath(value)) return value;
    return uri == null ? null : resolveUri(file, uri, packages);
  };
  return {
    ...directive,
    target: target(directive.uri, directive.target),
    configurations: (directive.configurations ?? []).map((configuration) => ({
      ...configuration,
      target: target(configuration.uri, configuration.target),
    })),
  };
}

// The URI targets of a directive: its default and every configuration.
export function directiveTargets(directive) {
  return [directive.target, ...directive.configurations.map((c) => c.target)]
    .filter(isRepoPath);
}

// The repository libraries a directive's file depends on through it: the
// declaring libraries of every name it uses (all configurations), or the
// URI targets when the analyzer could not resolve the import. An import whose
// names are unused still names its target, so a move must still rewrite it.
export function usedLibraries(directive) {
  const used = new Set(directiveTargets(directive));
  for (const uses of [directive.uses, ...directive.configurations.map((c) => c.uses)]) {
    for (const library of Object.keys(uses ?? {})) {
      if (isRepoPath(library)) used.add(library);
    }
  }
  return [...used];
}

// A barrel import: the file uses names through it that its target does not
// declare. Such an import in a moving file becomes direct imports.
export function isBarrelImport(directive) {
  if (directive.kind !== "import" || directive.uses == null ||
      directive.configurations.length > 0 || directive.deferred) {
    return false;
  }
  const declaring = Object.keys(directive.uses);
  return declaring.length > 0 && declaring.some((library) => library !== directive.target);
}

// The library and parts that move together. Files the analyzer did not see
// fall back to their `part of` line, and generated parts to their name.
export function unitOf(graph, file, {files, read}) {
  let library = graph.libraryOf(file);
  if (library == null) {
    library = textualLibraryOf(file, read) ?? file;
  }
  const parts = new Set(graph.parts.get(library) ?? []);
  const stem = library.slice(0, -".dart".length);
  for (const suffix of [".g.dart", ".freezed.dart"]) {
    if (files.has(`${stem}${suffix}`)) parts.add(`${stem}${suffix}`);
  }
  return {library, parts: [...parts].sort()};
}

function textualLibraryOf(file, read) {
  const generated = /^(.*)\.(?:g|freezed)\.dart$/u.exec(file);
  if (generated != null) return `${generated[1]}.dart`;
  const source = read(file);
  const partOf = source == null ? null : /^part\s+of\s+['"]([^'"]+)['"]\s*;/mu.exec(source);
  if (partOf == null) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), partOf[1]));
}

// The libraries an app reaches from its own lib/ folder. Imports are followed
// through the names they use.
export function reachableLibraries(graph, {root}) {
  const reached = new Set();
  const libraries = [];
  const visitLibrary = (library) => {
    if (reached.has(library)) return;
    reached.add(library);
    libraries.push(library);
  };
  for (const [file, entry] of graph.files) {
    if (file.startsWith(root) && entry.library === file) visitLibrary(file);
  }
  while (libraries.length > 0) {
    const library = libraries.pop();
    const unit = [library, ...(graph.parts.get(library) ?? [])];
    for (const file of unit) {
      for (const directive of graph.files.get(file)?.directives ?? []) {
        if (directive.kind !== "import") continue;
        for (const used of usedLibraries(directive)) visitLibrary(used);
      }
    }
  }
  return {libraries: reached};
}

// The libraries a set of seed libraries reaches.
export function closureOf(graph, seeds) {
  const reached = new Set();
  const queue = [...seeds].filter((seed) => graph.files.has(seed));
  while (queue.length > 0) {
    const library = queue.pop();
    if (reached.has(library)) continue;
    reached.add(library);
    for (const file of [library, ...(graph.parts.get(library) ?? [])]) {
      for (const directive of graph.files.get(file)?.directives ?? []) {
        if (directive.kind !== "import") continue;
        for (const used of usedLibraries(directive)) {
          const owner = graph.libraryOf(used) ?? used;
          if (!reached.has(owner)) queue.push(owner);
        }
      }
    }
  }
  return reached;
}
