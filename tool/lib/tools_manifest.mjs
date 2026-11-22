// The one way to read the tools manifest. Every reader (the runner, the
// planners, CI, checks and tests) goes through this module, so where the
// manifest lives, and how many files it spans, is decided here only.
//
// Today the manifest is one file, tool/tools_manifest.json. Readers get its
// parsed object (or, for the semantic diff in tool/nx/manifest_diff.mjs, its
// text) exactly as JSON.parse of that file gave them before.
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repoRoot} from "./repo_paths.mjs";

export const toolsManifestPath = "tool/tools_manifest.json";

// Repository-relative globs covering every file the manifest is read from.
// Sparse checkouts, Nx inputs and selectors list these.
export const toolsManifestPatterns = [toolsManifestPath];

/** Whether a repository path is part of the tools manifest. */
export function isToolsManifestPath(file) {
  return file === toolsManifestPath;
}

/** Whether a list of changed paths touches the tools manifest. */
export function touchesToolsManifest(paths) {
  return paths.some(isToolsManifestPath);
}

/**
 * The manifest's text from a reader: `read(path)` returns a file's text, and
 * `exists(path)`, when given, says whether it is present. Returns null when the
 * manifest is absent and `exists` says so.
 */
export function toolsManifestTextFrom({read, exists}) {
  if (exists && !exists(toolsManifestPath)) return null;
  return read(toolsManifestPath);
}

/** The parsed manifest from a reader (see toolsManifestTextFrom), or `fallback` when absent. */
export function toolsManifestFrom({read, exists, fallback = null}) {
  const text = toolsManifestTextFrom({read, exists});
  return text == null ? fallback : JSON.parse(text);
}

/** The manifest in a checkout or fixture root. */
export function loadToolsManifest({root = repoRoot, fallback} = {}) {
  return toolsManifestFrom({
    read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
    exists: fallback === undefined ? undefined : (file) => fs.existsSync(path.join(root, file)),
    fallback,
  });
}

/**
 * The manifest through a repository snapshot (tool/lib/repository_snapshot.mjs).
 * Without `fallback` it is required; with one, an absent manifest returns it.
 */
export function loadToolsManifestFromSnapshot(snapshot, {fallback} = {}) {
  if (fallback === undefined) return snapshot.readJson(toolsManifestPath, {required: true});
  return snapshot.readJson(toolsManifestPath) ?? fallback;
}

/** The manifest's text at a Git revision, or null when it cannot be read there. */
export function toolsManifestTextAt(ref, {cwd = repoRoot, show} = {}) {
  const read = show ?? ((file) => {
    const result = spawnSync("git", ["show", `${ref}:${file}`],
      {cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
    return result.status === 0 ? result.stdout : null;
  });
  return read(toolsManifestPath);
}

/** The parsed manifest at a Git revision, or null when it cannot be read there. */
export function toolsManifestAt(ref, options) {
  const text = toolsManifestTextAt(ref, options);
  return text == null ? null : JSON.parse(text);
}

/** Writes a manifest object into a fixture root. Tests use it instead of naming the file. */
export function writeToolsManifest(root, manifest, {text} = {}) {
  const target = path.join(root, toolsManifestPath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, text ?? `${JSON.stringify(manifest, null, 2)}\n`);
}
