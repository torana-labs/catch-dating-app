#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {
  firestoreCollectionPath,
  firestoreContractDir,
  loadFirestoreContractFromSnapshot,
} from "../contracts/lib/firestore_contract.mjs";
import {loadContextMap} from "./check_context_map.mjs";
import {collectionWrites} from "./lib/functions_collection_writes.mjs";

const functionsMapPath = "tool/architecture/functions_context_map.json";
const appMapPath = "tool/architecture/context_map.json";
const registryPath = firestoreContractDir;
const sourceRoot = "functions/src/";
const layers = new Set(["platform", "domain", "surface", "entry", "dispatch"]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);


// The backend map reuses the app's context vocabulary (context_map.json) in
// the same order and adds backend-only contexts with their own sentence.
export function loadFunctionsContextMap(source, appMap) {
  let map;
  try {
    map = JSON.parse(source);
  } catch (error) {
    throw new Error(`Functions context map ${functionsMapPath} is invalid: ${error.message}`);
  }
  const appRank = appMap.contextRank;
  const contextRank = new Map();
  let lastAppRank = -1;
  for (const [index, entry] of (map.contexts ?? []).entries()) {
    const id = typeof entry === "string" ? entry : entry?.id;
    if (!/^[a-z][a-z_]*$/u.test(id ?? "")) {
      throw new Error(`Functions context map has an invalid context id: ${id}`);
    }
    if (contextRank.has(id)) throw new Error(`Functions context map declares ${id} twice.`);
    if (typeof entry === "string") {
      if (!appRank.has(id)) {
        throw new Error(`${id} is not a context in ${appMapPath}; declare a backend-only context as {id, owns}.`);
      }
      if (appRank.get(id) < lastAppRank) {
        throw new Error(`${id} is out of the order ${appMapPath} gives its contexts.`);
      }
      lastAppRank = appRank.get(id);
    } else {
      if (appRank.has(id)) {
        throw new Error(`${id} is a context in ${appMapPath}; name it as a plain string.`);
      }
      if (typeof entry.owns !== "string" || entry.owns.trim() === "") {
        throw new Error(`Backend context ${id} must say what it owns.`);
      }
    }
    contextRank.set(id, index);
  }
  const surfaces = new Set();
  for (const surface of map.surfaces ?? []) {
    if (!/^[a-z][a-z_]*$/u.test(surface?.id ?? "")) {
      throw new Error(`Functions context map has an invalid surface id: ${surface?.id}`);
    }
    if (surfaces.has(surface.id)) throw new Error(`Surface ${surface.id} is declared twice.`);
    if (typeof surface.owns !== "string" || surface.owns.trim() === "") {
      throw new Error(`Surface ${surface.id} must say what it serves.`);
    }
    surfaces.add(surface.id);
  }
  const roots = map.roots ?? {};
  for (const root of ["domain", "surfaces", "platform"]) {
    if (typeof roots[root] !== "string" || !roots[root].startsWith(sourceRoot) ||
        !roots[root].endsWith("/")) {
      throw new Error(`Functions root ${root} must be a folder under ${sourceRoot} ending in /.`);
    }
  }
  // An entry is a path, or a path whose one `*` stands for a single folder
  // name: the area entries (functions/src/<area>/functions.ts) the entry point stars.
  const entries = new Set((map.entry ?? []).filter((entry) => !entry.includes("*")));
  const entryPatterns = (map.entry ?? []).filter((entry) => entry.includes("*")).map((entry) => {
    if (entry.split("*").length !== 2 || !entry.startsWith(sourceRoot)) {
      throw new Error(`Functions entry pattern ${entry} must be a path under ${sourceRoot} with one *.`);
    }
    const [before, after] = entry.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
    return new RegExp(`^${before}[^/]+${after}$`, "u");
  });
  // Generated dispatch registries (issue #2451): one module per source
  // collection that imports every context's projections for it. Each `*`
  // stands for one path segment.
  let dispatchRegistry = null;
  if (map.dispatchRegistries != null) {
    const pattern = map.dispatchRegistries;
    if (typeof pattern !== "string" || !pattern.startsWith(sourceRoot) ||
        !pattern.includes("*") || !pattern.endsWith(".generated.ts")) {
      throw new Error("dispatchRegistries must be a path pattern under " +
        `${sourceRoot} with at least one * that ends in .generated.ts.`);
    }
    dispatchRegistry = new RegExp(`^${pattern.split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("[^/]+")}$`, "u");
  }
  const legacy = [];
  const seen = new Set();
  for (const entry of map.legacy ?? []) {
    if (typeof entry?.path !== "string" || !entry.path.startsWith(sourceRoot)) {
      throw new Error(`Functions placement ${entry?.path} must be a path under ${sourceRoot}.`);
    }
    if (seen.has(entry.path)) throw new Error(`Functions context map places ${entry.path} twice.`);
    seen.add(entry.path);
    const kinds = ["context", "surface", "layer"].filter((key) => entry[key] != null);
    if (kinds.length !== 1) {
      throw new Error(`${entry.path} needs exactly one of context, surface or layer.`);
    }
    if (entry.context != null && !contextRank.has(entry.context)) {
      throw new Error(`${entry.path} names undeclared context ${entry.context}.`);
    }
    if (entry.surface != null && !surfaces.has(entry.surface)) {
      throw new Error(`${entry.path} names undeclared surface ${entry.surface}.`);
    }
    if (entry.layer != null && entry.layer !== "platform") {
      throw new Error(`${entry.path} may only name the platform layer; place domain and surface code by context or surface.`);
    }
    legacy.push(entry);
  }
  legacy.sort((a, b) => b.path.length - a.path.length);
  for (const [retired, list] of [["contextOrderViolationCeiling", "knownContextOrderImports"],
    ["crossContextWriteCeiling", "knownCrossContextWrites"]]) {
    if (Object.hasOwn(map, retired)) {
      throw new Error(`${retired} is retired: list each known violation in ${list} instead.`);
    }
  }
  return {roots, contextRank, surfaces, entries, entryPatterns, legacy, dispatchRegistry,
    knownContextOrderImports: knownList(map, "knownContextOrderImports", "--list-context-order"),
    knownCrossContextWrites: knownList(map, "knownCrossContextWrites", "--list-foreign-writes")};
}

// A list of today's known violations of one rule: unique strings in sorted
// order, so a change to it reads as one added or removed line.
function knownList(map, name, listFlag) {
  const list = map[name] ?? [];
  if (!Array.isArray(list) || list.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${name} must be a list of violations, one string each.`);
  }
  for (const [index, item] of list.entries()) {
    if (index > 0 && list[index - 1] >= item) {
      throw new Error(`${name} must be sorted with no repeats ("${item}"); ` +
        `print it with ${listFlag}.`);
    }
  }
  return list;
}

// The identity of one known violation. Line numbers move with every edit, so
// a context-order import is its file and target, and a cross-context write is
// its file and collection.
export const contextOrderKey = (item) => `${item.path} imports ${item.target}`;
export const foreignWriteKey = (item) => `${item.path} writes ${item.collection}`;

// Compares one rule's violations with its known list, item by item. An
// unlisted violation fails where it happens, and a listed one that no longer
// happens fails as stale, so the list only shrinks and fixing one violation
// never makes room for a different one.
export function knownViolationFindings({items, known, keyOf, listName, rule, fix}) {
  const findings = [];
  const listed = new Set(known);
  const current = new Set();
  for (const item of items) {
    const key = keyOf(item);
    current.add(key);
    if (!listed.has(key)) {
      findings.push({rule, path: item.path, line: item.line,
        reason: `${item.reason}; it is not in ${listName} in ${functionsMapPath}, so ${fix}`});
    }
  }
  for (const key of known) {
    if (!current.has(key)) {
      findings.push({rule: "staleKnownViolation", path: functionsMapPath, line: 1,
        reason: `${listName} lists "${key}", which no longer happens; remove it so it cannot return`});
    }
  }
  return findings;
}

export function contextOrderFindings(contextOrder, map) {
  return knownViolationFindings({items: contextOrder, known: map.knownContextOrderImports,
    keyOf: contextOrderKey, listName: "knownContextOrderImports", rule: "contextOrder",
    fix: "import only contexts declared earlier (or platform)"});
}

export function foreignWriteFindings(foreign, map) {
  return knownViolationFindings({items: foreign, known: map.knownCrossContextWrites,
    keyOf: foreignWriteKey, listName: "knownCrossContextWrites", rule: "foreignWrite",
    fix: "write through the owning context's functions"});
}

// The map-ready list of known keys for a rule's current violations.
export function knownKeys(items, keyOf) {
  return [...new Set(items.map(keyOf))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// Where a functions/src file sits: {layer, context?, surface?}. Target roots
// win; otherwise the longest legacy prefix decides; null when unplaced.
export function placeFunctionsPath(relativePath, map) {
  if (map.dispatchRegistry?.test(relativePath)) return {layer: "dispatch"};
  if (map.entries.has(relativePath) ||
      (map.entryPatterns ?? []).some((pattern) => pattern.test(relativePath))) return {layer: "entry"};
  const {roots} = map;
  if (relativePath.startsWith(roots.platform)) return {layer: "platform"};
  if (relativePath.startsWith(roots.domain)) {
    const context = relativePath.slice(roots.domain.length).split("/")[0];
    return {layer: "domain", context, target: true};
  }
  if (relativePath.startsWith(roots.surfaces)) {
    const surface = relativePath.slice(roots.surfaces.length).split("/")[0];
    return {layer: "surface", surface, target: true};
  }
  const entry = map.legacy.find((candidate) => relativePath === candidate.path ||
    (candidate.path.endsWith("/") && relativePath.startsWith(candidate.path)));
  if (entry == null) return null;
  if (entry.context != null) return {layer: "domain", context: entry.context};
  if (entry.surface != null) return {layer: "surface", surface: entry.surface};
  return {layer: entry.layer};
}

export function isCheckedSource(relativePath) {
  return relativePath.startsWith(sourceRoot) && relativePath.endsWith(".ts") &&
    !relativePath.endsWith(".test.ts") && !relativePath.endsWith(".d.ts") &&
    !relativePath.includes("/generated/");
}

const importPattern =
  /^[ \t]*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']|^[ \t]*import\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/gmsu;

// Relative imports of one source file, resolved to repository paths.
export function relativeImports(relativePath, source, exists) {
  const imports = [];
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (!specifier.startsWith(".")) continue;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath),
      specifier)).replace(/\.js$/u, "");
    const target = [`${base}.ts`, `${base}/index.ts`, base].find(exists) ?? `${base}.ts`;
    const line = source.slice(0, match.index).split("\n").length;
    imports.push({target, line});
  }
  return imports;
}

// The layering rules, from issue #1350 and docs/app_architecture.md:
// platform imports only platform; a domain context imports platform and the
// contexts declared before it; a surface imports platform, any domain context
// and its own files; nothing but the entry point imports a surface. A
// generated dispatch registry is the one module that may import any context
// or surface, and only an area entry imports it (issue #2451).
export function importFinding(from, to, map) {
  if (from.layer === "entry") return null;
  if (to.layer === "entry") return {rule: "entryImported", reason: "only the deploy tooling reads index.ts"};
  if (to.layer === "dispatch") {
    return {rule: "dispatchRegistryImported",
      reason: `${describe(from)} imports a dispatch registry; only its area's functions.ts re-exports it`};
  }
  if (from.layer === "dispatch") return null;
  if (from.layer === "platform") {
    return to.layer === "platform" ? null :
      {rule: "platformImportsUp", reason: `platform code imports ${describe(to)}`};
  }
  if (to.layer === "surface") {
    if (from.layer === "surface" && from.surface === to.surface) return null;
    return {
      rule: from.layer === "domain" ? "domainImportsSurface" : "surfaceImportsSurface",
      reason: `${describe(from)} imports ${describe(to)}`,
    };
  }
  if (from.layer === "domain" && to.layer === "domain" &&
      map.contextRank.get(to.context) > map.contextRank.get(from.context)) {
    return {rule: "contextOrder", reason: `${describe(from)} imports ${describe(to)}, declared after it`};
  }
  return null;
}

function describe(place) {
  if (place.layer === "domain") return `domain context ${place.context}`;
  if (place.layer === "surface") return `surface ${place.surface}`;
  if (place.layer === "dispatch") return "a dispatch registry";
  return place.layer;
}

export function checkFunctionsContexts({files, map, exists}) {
  const findings = [];
  const finding = (rule, filePath, line, reason) => findings.push({rule, path: filePath, line, reason});
  for (const entry of map.legacy) {
    const placesSomething = entry.path.endsWith("/") ?
      [...files.keys()].some((file) => file.startsWith(entry.path)) : exists(entry.path);
    if (!placesSomething) {
      finding("stalePlacement", functionsMapPath, 1, `${entry.path} places no file; remove it from the map`);
    }
  }
  const contextOrder = [];
  let placed = 0;
  for (const [filePath, source] of files) {
    if (!isCheckedSource(filePath)) continue;
    const from = placeFunctionsPath(filePath, map);
    if (from == null) {
      finding("unplaced", filePath, 1, `no placement in ${functionsMapPath}; place it or move it under a target root`);
      continue;
    }
    if (from.layer === "domain" && !map.contextRank.has(from.context)) {
      finding("unknownContext", filePath, 1, `${from.context} is not a context in ${functionsMapPath}`);
      continue;
    }
    if (from.layer === "surface" && !map.surfaces.has(from.surface)) {
      finding("unknownSurface", filePath, 1, `${from.surface} is not a surface in ${functionsMapPath}`);
      continue;
    }
    placed += 1;
    for (const {target, line} of relativeImports(filePath, source, exists)) {
      const to = placeFunctionsPath(target, map);
      if (to == null) continue;
      const result = importFinding(from, to, map);
      if (result == null) continue;
      const item = {rule: result.rule, path: filePath, line, target,
        reason: `${result.reason} (${target})`};
      if (result.rule === "contextOrder") contextOrder.push(item);
      else findings.push(item);
    }
  }
  findings.push(...contextOrderFindings(contextOrder, map));
  return {placed, contextOrder, findings};
}

// Rule 7: one context writes each collection. The registry names it per
// collection as writerContext: a domain context, a surface (for its own read
// models), "platform", or "shared" for a deliberate shared outbox, which
// says why in sharedWriterReason.
// `registry` is the combined contract from tool/contracts/lib/firestore_contract.mjs.
export function loadWriterContexts(registry, map) {
  const valid = new Set([...map.contextRank.keys(), ...map.surfaces, "platform", "shared"]);
  const byName = new Map();
  const findings = [];
  for (const collection of registry.collections ?? []) {
    const writer = collection.writerContext;
    if (!valid.has(writer)) {
      findings.push({rule: "writerContext", path: firestoreCollectionPath(collection.id), line: 1,
        reason: `${collection.id} needs a writerContext: a context or surface in ${functionsMapPath}, platform or shared`});
      continue;
    }
    if (writer === "shared" && (typeof collection.sharedWriterReason !== "string" ||
        collection.sharedWriterReason.trim() === "")) {
      findings.push({rule: "writerContext", path: firestoreCollectionPath(collection.id), line: 1,
        reason: `${collection.id} is shared and must say why in sharedWriterReason`});
    }
    const segments = String(collection.path ?? "").split("/");
    const name = segments[segments.length - 2] ?? collection.id;
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(writer);
  }
  return {byName, findings};
}

export function placeId(place) {
  if (place.layer === "domain") return place.context;
  if (place.layer === "surface") return place.surface;
  return place.layer;
}

// Writes from a module outside the collection's writer context.
export function foreignWrites({writes, writers, map}) {
  const foreign = [];
  for (const [collection, byFile] of writes) {
    const owners = writers.get(collection);
    if (owners == null || owners.size !== 1) continue;
    const [owner] = owners;
    if (owner === "shared") continue;
    for (const file of byFile.keys()) {
      const place = placeFunctionsPath(file, map);
      if (place == null || place.layer === "entry" || place.layer === "dispatch") continue;
      const writer = placeId(place);
      if (writer !== owner) {
        foreign.push({rule: "foreignWrite", path: file, line: 1, collection,
          reason: `${describe(place)} writes ${collection}, which ${owner} owns`});
      }
    }
  }
  return foreign.sort((a, b) => `${a.path}${a.reason}`.localeCompare(`${b.path}${b.reason}`));
}

export function scanFunctionsContexts({snapshot}) {
  if (snapshot == null || typeof snapshot.readTexts !== "function") {
    throw new Error("Functions context check requires a repository snapshot.");
  }
  const maps = snapshot.readTexts([functionsMapPath, appMapPath], {required: true});
  const map = loadFunctionsContextMap(maps.get(functionsMapPath),
    loadContextMap(maps.get(appMapPath)));
  const sourcePaths = snapshot.listFiles({prefix: sourceRoot}).filter(isCheckedSource);
  const files = snapshot.readTexts(sourcePaths, {required: true});
  const known = new Set(snapshot.listFiles({prefix: sourceRoot}));
  const result = checkFunctionsContexts({files, map, exists: (file) => known.has(file)});
  const registry = loadWriterContexts(loadFirestoreContractFromSnapshot(snapshot), map);
  const foreign = foreignWrites({writes: collectionWrites({files}), writers: registry.byName, map});
  const findings = [...result.findings, ...registry.findings, ...foreignWriteFindings(foreign, map)];
  return {...result, findings, foreignWrites: foreign};
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_functions_contexts.mjs
  node tool/architecture/check_functions_contexts.mjs --json
  node tool/architecture/check_functions_contexts.mjs --list-context-order
  node tool/architecture/check_functions_contexts.mjs --list-foreign-writes

Places every handwritten functions/src module by ${functionsMapPath} and
checks its relative imports: platform imports only platform, domain code never
imports a surface, a surface never imports another surface, and domain
contexts import only contexts declared before them, and a collection is
written only from the writerContext ${registryPath} names. A generated
dispatch registry (the map's dispatchRegistries pattern) may import any
context or surface, and only an area entry may import it.

Until issue #1350's file splits land, today's context-order imports and
cross-context writes are listed one by one in the map's
knownContextOrderImports and knownCrossContextWrites. Any other violation
fails, and so does a listed one that no longer happens: remove it. The two
--list flags print the current violations in the form the lists use.`);
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  const unknown = args.find((arg) =>
    !["--json", "--list-context-order", "--list-foreign-writes"].includes(arg));
  if (unknown != null) {
    console.error(`Unknown argument: ${unknown}`);
    process.exit(2);
  }
  const result = scanFunctionsContexts({snapshot: createRepositorySnapshot({root: fromRepo()})});
  if (args.includes("--list-context-order")) {
    for (const key of knownKeys(result.contextOrder, contextOrderKey)) console.log(key);
    return;
  }
  if (args.includes("--list-foreign-writes")) {
    for (const key of knownKeys(result.foreignWrites, foreignWriteKey)) console.log(key);
    return;
  }
  if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
  if (result.findings.length > 0) {
    if (!args.includes("--json")) {
      console.error(`Functions context check failed (${result.findings.length} finding(s)).`);
      for (const finding of result.findings) {
        console.error(`- ${finding.path}:${finding.line} [${finding.rule}] ${finding.reason}`);
      }
    }
    process.exit(1);
  }
  if (!args.includes("--json")) {
    const imports = knownKeys(result.contextOrder, contextOrderKey).length;
    const writes = knownKeys(result.foreignWrites, foreignWriteKey).length;
    console.log(`Functions context check passed (${result.placed} modules placed; ` +
      `${imports} known context-order imports and ${writes} known cross-context writes, ` +
      `each listed in ${functionsMapPath}).`);
  }
}

if (isCliEntrypoint) runCli();
