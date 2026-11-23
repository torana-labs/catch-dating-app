#!/usr/bin/env node
// Writes the generated dispatch registry for each source collection
// (issue #2451): functions/src/<area>/dispatch/<source>.generated.ts imports
// every defineProjections set that names the source and passes them to
// dispatchTrigger, the one trigger for that collection. The registry is the
// one module the Functions context check lets import any context
// (tool/architecture/check_functions_contexts.mjs), so contexts keep owning
// their projections. Reads source text only; never imports Functions code.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";

export const sourcesConfigPath = "functions/dispatch-sources.json";
export const runtimePath = "functions/src/platform/dispatch/runtime.ts";
export const registryPattern = /^functions\/src\/([^/]+)\/dispatch\/([^/]+)\.generated\.ts$/u;
const sourceRoot = "functions/src/";
const camelName = /^[a-z][A-Za-z0-9]{0,63}$/u;
const areaName = /^[A-Za-z][A-Za-z0-9]*$/u;
// One registration per statement: `export const <name> = defineProjections("<source>", ...`.
const registration =
  /^export const ([A-Za-z_$][\w$]*)\s*(?::\s*[\w.<>[\]\s]+)?=\s*defineProjections\(\s*["']([^"']*)["']/gmu;
const anyCall = /\bdefineProjections\s*\(/gu;

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const registryPath = (area, source) =>
  `functions/src/${area}/dispatch/${source}.generated.ts`;
export const dispatcherName = (source) =>
  `dispatch${source[0].toUpperCase()}${source.slice(1)}`;

/** Parses functions/dispatch-sources.json into a sorted list of sources. */
export function loadSourcesConfig(text, {areas} = {}) {
  let config;
  try {
    config = JSON.parse(text);
  } catch (error) {
    throw new Error(`${sourcesConfigPath} is invalid JSON: ${error.message}`);
  }
  const sources = config?.sources;
  if (sources == null || typeof sources !== "object" || Array.isArray(sources)) {
    throw new Error(`${sourcesConfigPath} needs a sources object.`);
  }
  return Object.keys(sources).sort().map((id) => {
    const entry = sources[id];
    if (!camelName.test(id)) throw new Error(`Dispatch source ${id} must be a camelCase name.`);
    if (typeof entry?.document !== "string" ||
        !/^[A-Za-z][A-Za-z0-9_]*\/\{[A-Za-z]+\}(\/[A-Za-z][A-Za-z0-9_]*\/\{[A-Za-z]+\})*$/u
          .test(entry.document)) {
      throw new Error(`Dispatch source ${id} needs a document path like collection/{id}.`);
    }
    if (typeof entry.area !== "string" || !areaName.test(entry.area)) {
      throw new Error(`Dispatch source ${id} needs the area whose functions.ts re-exports it.`);
    }
    if (areas != null && !areas.has(entry.area)) {
      throw new Error(`Dispatch source ${id} names area ${entry.area}, which no codebase in functions/deploy-codebases.json lists.`);
    }
    const extra = Object.keys(entry).filter((key) => !["document", "area"].includes(key));
    if (extra.length) throw new Error(`Dispatch source ${id} has unknown keys: ${extra.join(", ")}.`);
    return {id, document: entry.document, area: entry.area};
  });
}

const isScannedSource = (file) => file.startsWith(sourceRoot) && file.endsWith(".ts") &&
  !file.endsWith(".test.ts") && !file.endsWith(".d.ts") && !file.includes("/generated/") &&
  !registryPattern.test(file) && file !== runtimePath;

/** Every defineProjections set in functions/src, by source, with problems found. */
export function findRegistrations(files) {
  const bySource = new Map();
  const errors = [];
  for (const [file, text] of [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!isScannedSource(file)) continue;
    const calls = text.match(anyCall)?.length ?? 0;
    if (calls === 0) continue;
    const found = [...text.matchAll(registration)];
    if (found.length !== calls) {
      errors.push(`${file}: call defineProjections only as ` +
        "export const <name> = defineProjections(\"<source>\", [...]), one per statement.");
    }
    for (const [, name, source] of found) {
      if (!camelName.test(source)) {
        errors.push(`${file}: ${name} registers with "${source}", which is not a camelCase source name.`);
        continue;
      }
      if (!bySource.has(source)) bySource.set(source, []);
      bySource.get(source).push({file, name});
    }
  }
  return {bySource, errors};
}

function importSpecifier(fromFile, toFile) {
  const relative = path.posix.relative(path.posix.dirname(fromFile), toFile).replace(/\.ts$/u, "");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/** The text of one source's registry. */
export function renderRegistry(source, registrations) {
  const file = registryPath(source.area, source.id);
  const used = new Map();
  const imports = [];
  const sets = [];
  for (const {file: from, name} of registrations) {
    let local = name;
    if (used.has(local) || local === "dispatchTrigger") {
      local = `${name}${used.size + 1}`;
    }
    used.set(local, true);
    const specifier = importSpecifier(file, from);
    imports.push(local === name ?
      `import {${name}} from\n  "${specifier}";` :
      `import {${name} as ${local}} from\n  "${specifier}";`);
    sets.push(`  ${local},`);
  }
  return [
    "/* eslint-disable max-len */",
    `// GENERATED by tool/architecture/generate_dispatch_registries.mjs from`,
    `// functions/dispatch-sources.json; do not edit. The one trigger for`,
    `// ${source.document} (issue #2451).`,
    `import {dispatchTrigger} from\n  "${importSpecifier(file, runtimePath)}";`,
    ...imports,
    "",
    `export const ${dispatcherName(source.id)} = dispatchTrigger(` +
      `"${source.id}",\n  "${source.document}", [`,
    ...sets,
    "  ]);",
    "",
  ].join("\n");
}

/** True when the area entry re-exports the dispatcher from its registry. */
export function areaReExports(entryText, source) {
  const name = dispatcherName(source.id);
  const specifier = `./dispatch/${source.id}.generated`;
  const pattern = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']` +
    `${specifier.replace(/[.*+?^${}()|[\]\\/]/gu, "\\$&")}["']`, "u");
  return pattern.test(entryText ?? "");
}

/**
 * The registries functions/src should hold, and every problem: a set for an
 * unknown source, a malformed call, a source with no area re-export.
 */
export function planDispatchRegistries({config, files}) {
  const {bySource, errors} = findRegistrations(files);
  const known = new Map(config.map((source) => [source.id, source]));
  for (const [source, registrations] of bySource) {
    if (!known.has(source)) {
      for (const {file, name} of registrations) {
        errors.push(`${file}: ${name} registers with source "${source}", which ${sourcesConfigPath} does not list.`);
      }
    }
  }
  const outputs = new Map();
  for (const source of config) {
    const registrations = bySource.get(source.id) ?? [];
    if (registrations.length === 0) continue;
    outputs.set(registryPath(source.area, source.id), renderRegistry(source, registrations));
    const entry = `functions/src/${source.area}/functions.ts`;
    if (!areaReExports(files.get(entry), source)) {
      errors.push(`${entry} must re-export ${dispatcherName(source.id)} from ` +
        `"./dispatch/${source.id}.generated", or the dispatcher never deploys.`);
    }
  }
  return {outputs, errors};
}

/** Compares the plan with the registries on disk: stale, missing or extra. */
export function registryDrift({outputs, existing}) {
  const drift = [];
  for (const [file, text] of outputs) {
    if (!existing.has(file)) drift.push(`${file} is missing`);
    else if (existing.get(file) !== text) drift.push(`${file} is stale`);
  }
  for (const file of existing.keys()) {
    if (!outputs.has(file)) drift.push(`${file} registers nothing; delete it`);
  }
  return drift;
}

function readInputs(snapshot) {
  const codebases = JSON.parse(snapshot.readTexts(["functions/deploy-codebases.json"],
    {required: true}).get("functions/deploy-codebases.json"));
  const areas = new Set(Object.values(codebases.codebases ?? {}).flat());
  const config = loadSourcesConfig(snapshot.readTexts([sourcesConfigPath], {required: true})
    .get(sourcesConfigPath), {areas});
  const sourcePaths = snapshot.listFiles({prefix: sourceRoot})
    .filter((file) => file.endsWith(".ts"));
  const files = snapshot.readTexts(sourcePaths, {required: true});
  const existing = new Map([...files].filter(([file]) => registryPattern.test(file)));
  return {config, files, existing};
}

export function checkDispatchRegistries({snapshot}) {
  const {config, files, existing} = readInputs(snapshot);
  const plan = planDispatchRegistries({config, files});
  return {...plan, drift: registryDrift({outputs: plan.outputs, existing})};
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/generate_dispatch_registries.mjs          write the registries
  node tool/architecture/generate_dispatch_registries.mjs --check  fail when one is stale

Writes functions/src/<area>/dispatch/<source>.generated.ts for each source in
${sourcesConfigPath} that has at least one set registered with
export const <name> = defineProjections("<source>", [...]) in functions/src.
--check also fails on a registration for an unlisted source, a malformed
call, and a registry its area's functions.ts does not re-export.`);
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  const unknown = args.find((arg) => arg !== "--check");
  if (unknown != null) {
    console.error(`Unknown argument: ${unknown}`);
    process.exit(2);
  }
  const root = fromRepo();
  const result = checkDispatchRegistries({snapshot: createRepositorySnapshot({root})});
  if (args.includes("--check")) {
    const problems = [...result.errors, ...result.drift];
    if (problems.length) {
      console.error(`Dispatch registry check failed (${problems.length}); ` +
        "run node tool/architecture/generate_dispatch_registries.mjs.");
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log(`Dispatch registry check passed (${result.outputs.size} registries).`);
    return;
  }
  for (const [file, text] of result.outputs) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
  const existing = readInputs(createRepositorySnapshot({root})).existing;
  for (const file of existing.keys()) {
    if (!result.outputs.has(file)) fs.rmSync(path.join(root, file));
  }
  for (const error of result.errors) console.error(`- ${error}`);
  console.log(`Wrote ${result.outputs.size} dispatch registries.`);
  if (result.errors.length) process.exit(1);
}

if (isCliEntrypoint) runCli();
