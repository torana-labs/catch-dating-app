import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fromRepo} from "../../lib/repo_paths.mjs";

// The inputs of a web capture: what its story and Storybook preview import,
// followed through TypeScript, JSON, CSS @import and url(), plus the renderer.
// Dependency-free on purpose: the Linux plan and reuse jobs and the macOS
// renderer run it without installing the repository's packages, so it can't
// use TypeScript or react_dependency_graph.mjs. It mirrors the website's
// resolution rules (relative paths, @content, workspace exports) and keeps
// type-only imports, so it errs towards re-rendering.

const renderer = [
  "tool/marketing/lib/web_capture_render.mjs",
  "tool/marketing/lib/web_capture_screen.mjs",
  "tool/marketing/lib/web_capture_inputs.mjs",
  "tool/marketing/lib/capture_provenance.mjs",
  "tool/marketing/frame_device_capture.dart",
  "tool/lib/repo_paths.mjs",
];
// Storybook's own config and global decorators wrap every story.
const storybookConfig = "website/.storybook";
const sourceExtensions = [".ts", ".tsx", ".js", ".mjs", ".jsx", ".json"];
// Packages whose resolved version changes how a page or the renderer draws.
const rendererPackages = ["playwright", "playwright-core"];
// A capture renders from these manifest fields alone; copy and pages don't count.
export const webRenderFields = ["id", "kind", "status", "device", "story", "address", "sourcePath"];

/** Files and external package versions a web capture's story depends on. */
export function webCaptureClosure(storyFile) {
  const files = new Set();
  const externals = new Map();
  const queue = [storyFile, ...treeFiles(storybookConfig)];
  const lock = readLock();
  const workspaces = workspacePackages();
  for (let index = 0; index < queue.length; index += 1) {
    const file = queue[index];
    if (files.has(file)) continue;
    if (!fs.existsSync(fromRepo(file))) throw new Error(`Missing web capture input: ${file}`);
    files.add(file);
    const extension = path.extname(file);
    if (![".css", ...sourceExtensions].includes(extension) || extension === ".json") continue;
    const source = fs.readFileSync(fromRepo(file), "utf8");
    for (const specifier of extension === ".css" ? cssReferences(source) : moduleReferences(source)) {
      const resolved = resolve(specifier, file, workspaces);
      if (resolved.file) queue.push(resolved.file);
      else if (resolved.external) externals.set(resolved.external, packageVersion(lock, resolved.external));
    }
    // Pages also load files from public/ by absolute path at runtime.
    if (extension !== ".css") {
      for (const match of source.matchAll(/["'`](\/assets\/[^"'`$?#\s]+)/gu)) {
        const asset = `website/public${match[1]}`;
        if (fs.existsSync(fromRepo(asset)) && fs.statSync(fromRepo(asset)).isFile()) queue.push(asset);
      }
    }
  }
  for (const name of rendererPackages) externals.set(name, packageVersion(lock, name));
  return {files, externals};
}

/** The render-input hash of one web-capture manifest entry. */
export function webCaptureInputHash(capture) {
  const {files, externals} = webCaptureClosure(capture.story.file);
  const recipe = Object.fromEntries(webRenderFields.map(key => [key, capture[key] ?? null]));
  const hash = crypto.createHash("sha256").update(JSON.stringify(recipe));
  for (const file of [...new Set([...files, ...renderer])].sort()) {
    hash.update(file).update("\0").update(fs.readFileSync(fromRepo(file))).update("\0");
  }
  for (const [name, version] of [...externals].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(`${name}@${version}\0`);
  }
  // The frame tool's drawing package and the pinned Node/Flutter toolchain.
  hash.update(`image@${dartPackageVersion("image")}\0`).update(fs.readFileSync(fromRepo("tool/ci/toolchain.env")));
  return hash.digest("hex");
}

function moduleReferences(source) {
  const specifiers = [];
  // Static imports start a statement; dynamic imports can appear anywhere.
  const patterns = [
    /^\s*(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"'\s]+)["']/gmu,
    /^\s*import\s*["']([^"'\s]+)["']/gmu,
    /\bimport\s*\(\s*["']([^"'\s]+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

function cssReferences(source) {
  const specifiers = [];
  for (const match of source.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?\)?/gu)) specifiers.push(match[1]);
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/gu)) {
    if (!/^(?:data:|https?:|#)/u.test(match[1])) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolve(rawSpecifier, fromFile, workspaces) {
  const specifier = rawSpecifier.replace(/[?#].*$/u, "");
  if (specifier.startsWith(".")) return {file: resolveFile(path.posix.join(path.posix.dirname(fromFile), specifier), fromFile, rawSpecifier)};
  if (specifier.startsWith("/")) {
    const asset = `website/public${specifier}`;
    return fs.existsSync(fromRepo(asset)) ? {file: asset} : {};
  }
  if (specifier.startsWith("@content/")) return {file: resolveFile(`website/src/content/${specifier.slice(9)}`, fromFile, rawSpecifier)};
  const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
  const workspace = workspaces.get(name);
  if (workspace) {
    const subpath = `.${specifier.slice(name.length)}`;
    const target = exportTarget(workspace.exports, subpath) ?? (subpath === "." ? "./src/index.ts" : subpath);
    return {file: resolveFile(path.posix.join(workspace.dir, target), fromFile, rawSpecifier)};
  }
  if (specifier.startsWith("node:")) return {};
  return {external: name};
}

function resolveFile(candidate, fromFile, specifier) {
  const base = path.posix.normalize(candidate);
  const options = [base, ...sourceExtensions.map(extension => `${base}${extension}`),
    ...sourceExtensions.map(extension => `${base}/index${extension}`)];
  // TypeScript lets a .js specifier name its .ts source.
  if (/\.js$/u.test(base)) options.push(base.replace(/\.js$/u, ".ts"), base.replace(/\.js$/u, ".tsx"));
  const found = options.find(option => !option.startsWith("../") && fs.existsSync(fromRepo(option)) && fs.statSync(fromRepo(option)).isFile());
  if (!found) throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
  return found;
}

function exportTarget(exports, subpath) {
  if (!exports || typeof exports !== "object") return null;
  const entry = exports[subpath];
  if (typeof entry === "string") return entry;
  return entry?.import ?? entry?.default ?? entry?.types ?? null;
}

function workspacePackages() {
  const workspaces = new Map();
  for (const dir of JSON.parse(fs.readFileSync(fromRepo("package.json"), "utf8")).workspaces ?? []) {
    const manifest = fromRepo(`${dir}/package.json`);
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    workspaces.set(pkg.name, {dir, exports: pkg.exports});
  }
  return workspaces;
}

function readLock() {
  return JSON.parse(fs.readFileSync(fromRepo("package-lock.json"), "utf8")).packages ?? {};
}

function packageVersion(lock, name) {
  const version = lock[`node_modules/${name}`]?.version;
  if (!version) throw new Error(`package-lock.json has no resolved version for ${name}`);
  return version;
}

function dartPackageVersion(name) {
  const lock = fs.readFileSync(fromRepo("pubspec.lock"), "utf8");
  const version = lock.match(new RegExp(`^  ${name}:\\n(?:    .*\\n)*?    version: "([^"]+)"`, "mu"))?.[1];
  if (!version) throw new Error(`pubspec.lock has no version for ${name}`);
  return version;
}

function treeFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(fromRepo(dir), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...treeFiles(file));
    else files.push(file);
  }
  return files;
}
