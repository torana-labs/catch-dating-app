// The one way to read the tools manifest. Every reader (the runner, the
// planners, CI, checks and tests) goes through this module, so where the
// manifest lives, and how many files it spans, is decided here only.
//
// The manifest is one file per tool, so concurrent PRs that add or edit
// different tools never touch the same file:
//
//   tool/manifest/manifest.json                version, updated and ciImpact
//   tool/manifest/tools/<category>.<name>.json  the tool with id <category>:<name>
//
// Readers get the combined manifest: the header's fields, then `tools`
// sorted by id, which is byte for byte the single file this replaced. Run
// this module to print it (it is never committed).
//
// A Git revision from before the split still has tool/tools_manifest.json;
// the revision readers fall back to it, so a diff across the split compares
// like with like.
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {repoRoot} from "./repo_paths.mjs";

export const toolsManifestDir = "tool/manifest";
// The header: version, updated and ciImpact. It marks a manifest.
export const toolsManifestPath = `${toolsManifestDir}/manifest.json`;
const toolsManifestHeaderPath = toolsManifestPath;
export const toolsManifestToolsDir = `${toolsManifestDir}/tools`;
// The single file the manifest was before the split. It must not come back.
export const legacyToolsManifestPath = "tool/tools_manifest.json";

// Repository-relative globs covering every file the manifest is read from.
// Sparse checkouts, Nx inputs and selectors list these.
export const toolsManifestPatterns = [`${toolsManifestDir}/**`];

const toolIdPattern = /^([a-z0-9_-]+):([a-z0-9_-]+)$/u;
const toolFilePattern = /^([a-z0-9_-]+)\.([a-z0-9_-]+)\.json$/u;

/** The file that holds a tool: `meta:tool-manifest` lives in tools/meta.tool-manifest.json. */
export function toolsManifestToolPath(id) {
  const match = toolIdPattern.exec(id ?? "");
  if (!match) throw new Error(`Tool id ${JSON.stringify(id)} must be <category>:<name> in a-z, 0-9, _ and -.`);
  return `${toolsManifestToolsDir}/${match[1]}.${match[2]}.json`;
}

/** The tool id a tools/ file name holds, or null when the name is not one. */
export function toolIdFromManifestFile(file) {
  const name = file.startsWith(`${toolsManifestToolsDir}/`) ? file.slice(toolsManifestToolsDir.length + 1) : null;
  const match = name == null ? null : toolFilePattern.exec(name);
  return match ? `${match[1]}:${match[2]}` : null;
}

/** Whether a repository path is part of the tools manifest (the old single file included). */
export function isToolsManifestPath(file) {
  return file === legacyToolsManifestPath || file.startsWith(`${toolsManifestDir}/`);
}

/** Whether a list of changed paths touches the tools manifest. */
export function touchesToolsManifest(paths) {
  return paths.some(isToolsManifestPath);
}

/** The combined manifest as text, as the single file was written. */
export function formatToolsManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** The layout's rules, checked against a list of repository paths. */
export function toolsManifestLayoutProblems(paths) {
  const files = [...paths].filter(isToolsManifestPath).sort();
  const problems = [];
  if (files.includes(legacyToolsManifestPath)) {
    problems.push(`${legacyToolsManifestPath}: the manifest lives in ${toolsManifestDir}/; delete this file`);
  }
  if (!files.includes(toolsManifestHeaderPath)) problems.push(`${toolsManifestHeaderPath}: missing`);
  for (const file of files) {
    if (file === legacyToolsManifestPath || file === toolsManifestHeaderPath) continue;
    if (toolIdFromManifestFile(file) == null) {
      problems.push(`${file}: not a manifest file; ${toolsManifestDir}/ holds only manifest.json and ` +
        "tools/<category>.<name>.json for the tool <category>:<name>");
    }
  }
  return problems;
}

/**
 * The combined manifest from repository paths and a reader for their text.
 * Throws one Error listing every problem, so a malformed file fails every
 * reader closed.
 */
export function toolsManifestFromFiles(paths, readText) {
  const files = [...paths].filter(isToolsManifestPath).sort();
  const problems = toolsManifestLayoutProblems(files);
  if (problems.length > 0) throw manifestError(problems);
  const header = parseObject(toolsManifestHeaderPath, readText(toolsManifestHeaderPath), problems);
  if (header && Object.hasOwn(header, "tools")) {
    problems.push(`${toolsManifestHeaderPath}: tools live in ${toolsManifestToolsDir}/, not in the header`);
  }
  const tools = [];
  for (const file of files) {
    if (file === toolsManifestHeaderPath) continue;
    const tool = parseObject(file, readText(file), problems);
    if (!tool) continue;
    const id = toolIdFromManifestFile(file);
    if (tool.id !== id) {
      problems.push(`${file}: id must be "${id}", the tool its file name holds`);
      continue;
    }
    tools.push(tool);
  }
  if (problems.length > 0) throw manifestError(problems);
  tools.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return {...header, tools};
}

/**
 * The parsed manifest from a reader: `list()` returns repository paths,
 * `read(path)` a file's text. Returns `fallback` when the manifest is absent
 * and a fallback is given.
 */
export function toolsManifestFrom({read, list, fallback}) {
  const paths = list().filter(isToolsManifestPath);
  if (fallback !== undefined && paths.length === 0) return fallback;
  return toolsManifestFromFiles(paths, read);
}

/** The combined manifest's text from a reader (see toolsManifestFrom), or null when absent. */
export function toolsManifestTextFrom(reader) {
  const manifest = toolsManifestFrom({...reader, fallback: null});
  return manifest == null ? null : formatToolsManifest(manifest);
}

/** The manifest in a checkout or fixture root. */
export function loadToolsManifest({root = repoRoot, fallback} = {}) {
  return toolsManifestFrom({
    list: () => listUnder(root),
    read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
    fallback,
  });
}

/**
 * The manifest through a repository snapshot (tool/lib/repository_snapshot.mjs).
 * Without `fallback` it is required; with one, an absent manifest returns it.
 */
export function loadToolsManifestFromSnapshot(snapshot, {fallback} = {}) {
  const paths = [...snapshot.listFiles({prefix: `${toolsManifestDir}/`}),
    ...(snapshot.exists(legacyToolsManifestPath) ? [legacyToolsManifestPath] : [])];
  if (fallback !== undefined && paths.length === 0) return fallback;
  const texts = snapshot.readTexts(paths, {required: true});
  return toolsManifestFromFiles(paths, (file) => texts.get(file));
}

/**
 * The combined manifest's text at a Git revision. A revision from before the
 * split gives its tool/tools_manifest.json as it was. When the manifest cannot
 * be read there, returns null, or throws with `strict`. `show(file)` and
 * `list()` replace the Git reads (tests).
 */
export function toolsManifestTextAt(ref, {cwd = repoRoot, show, list, strict = false} = {}) {
  try {
    const paths = list ? list() : gitList(ref, cwd);
    const read = show ?? gitReader(ref, cwd, paths);
    if (!paths.includes(toolsManifestHeaderPath) && paths.includes(legacyToolsManifestPath)) {
      return read(legacyToolsManifestPath);
    }
    return formatToolsManifest(toolsManifestFromFiles(paths, read));
  } catch (error) {
    if (strict) throw error;
    return null;
  }
}

/** The parsed manifest at a Git revision, or null when it cannot be read there. */
export function toolsManifestAt(ref, options) {
  const text = toolsManifestTextAt(ref, options);
  return text == null ? null : JSON.parse(text);
}

/** The files a combined manifest splits into, as a Map of repository path to text. */
export function splitToolsManifest(manifest) {
  const {tools = [], ...header} = manifest ?? {};
  const files = new Map([[toolsManifestHeaderPath, formatToolsManifest(header)]]);
  for (const tool of tools) files.set(toolsManifestToolPath(tool.id), formatToolsManifest(tool));
  return files;
}

/** Writes a combined manifest into a fixture root as split files, replacing any manifest there. */
export function writeToolsManifest(root, manifest) {
  fs.rmSync(path.join(root, toolsManifestDir), {recursive: true, force: true});
  fs.rmSync(path.join(root, legacyToolsManifestPath), {force: true});
  for (const [file, text] of splitToolsManifest(manifest)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, text);
  }
}

function listUnder(root) {
  const paths = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else paths.push(child);
    }
  };
  if (fs.existsSync(path.join(root, toolsManifestDir))) walk(toolsManifestDir);
  if (fs.existsSync(path.join(root, legacyToolsManifestPath))) paths.push(legacyToolsManifestPath);
  return paths;
}

function git(args, cwd, input) {
  const result = spawnSync("git", args, {cwd, input, maxBuffer: 64 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${String(result.stderr).trim()}`);
  return result.stdout;
}

function gitList(ref, cwd) {
  return git(["ls-tree", "-r", "--name-only", ref, "--", toolsManifestDir, legacyToolsManifestPath], cwd)
    .toString("utf8").split("\n").filter(Boolean);
}

// Reads every listed blob in one `git cat-file --batch` call.
function gitReader(ref, cwd, paths) {
  if (paths.length === 0) throw new Error(`no tools manifest at ${ref}`);
  const output = git(["cat-file", "--batch"], cwd, paths.map((file) => `${ref}:${file}\n`).join(""));
  const texts = new Map();
  let offset = 0;
  for (const file of paths) {
    const headerEnd = output.indexOf(0x0a, offset);
    const header = output.subarray(offset, headerEnd).toString("utf8").split(" ");
    if (header[1] !== "blob") throw new Error(`${ref}:${file} is not a blob`);
    const start = headerEnd + 1;
    const end = start + Number(header[2]);
    texts.set(file, output.subarray(start, end).toString("utf8"));
    offset = end + 1;
  }
  return (file) => {
    if (!texts.has(file)) throw new Error(`${ref}:${file} was not listed`);
    return texts.get(file);
  };
}

function parseObject(file, text, problems) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    problems.push(`${file}: invalid JSON (${error.message})`);
    return null;
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    problems.push(`${file}: must hold a JSON object`);
    return null;
  }
  return value;
}

function manifestError(problems) {
  return new Error(`Tools manifest files are malformed:\n- ${problems.join("\n- ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(formatToolsManifest(loadToolsManifest()));
}
