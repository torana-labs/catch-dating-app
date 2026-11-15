#!/usr/bin/env node
// Chooses the Functions a backend deploy updates. The Firebase CLI's own skip
// works per codebase (about 80 Functions each), so one shared module change
// used to redeploy nearly every Function: on 15 Nov 2026 one store link in the
// generated brand module updated 785 of 824. This compares each Function's
// own hash (functions/scripts/build-deploy-codebases.cjs: what that Function
// loads and reads), plus the versions of the secrets it declares, with the
// hashes the environment's last delivered Functions record holds, and deploys
// exactly the Functions whose hash changed, by name.
//
// It falls back to today's plain `--only functions` (the CLI's codebase skip)
// whenever it cannot prove a Function unchanged: no record, a record from
// before per-Function hashes, a record from another toolchain, a secret whose
// newest version could not be read, a Function that moved codebase, or a
// recorded Function that is gone from the code but not listed in
// functions/retired-functions.json. That last one matters: a broad deploy
// makes the CLI stop on a deployed Function missing from source, which is
// what makes someone retire it; an exact-name deploy never looks, so the
// planner must, or a removed Function would silently stay live. A
// secret lookup failure is loud: a missing permission must not quietly make
// every run a full deploy. `full` still redeploys everything.
//
// The plan also yields the payload both deploy records store (version 2), so
// the next run compares with exactly what this one deployed.
//
// Usage: plan_function_deploy.mjs --current build/functions-codebases.json
//   [--previous <record payload>] [--secrets <versions.json>]
//   [--retired functions/retired-functions.json]
//   --toolchain '<json>' [--full true|false] [--environment dev]
//   --plan-out build/function-plan.json --record-out build/functions-record.json
//   [--summary $GITHUB_STEP_SUMMARY] [--github-output $GITHUB_OUTPUT]
import crypto from "node:crypto";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";

export const RECORD_VERSION = 2;

/** A Function's deployed identity: its own hash and the versions of the secrets it declares. */
export function finalHash(codeHash, secrets = [], versions = {}) {
  const hash = crypto.createHash("sha256").update(`${codeHash}\n`);
  for (const secret of [...secrets].sort()) hash.update(`${secret}@${versions[secret]}\n`);
  return hash.digest("hex").slice(0, 24);
}

/** A record payload this planner can compare with, or the reason it cannot. */
export function readRecord(text) {
  if (!text || !String(text).trim()) return {reason: "no delivered Functions record"};
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    return {reason: "the recorded payload is not JSON"};
  }
  if (typeof record === "string") return readRecord(record);
  if (record?.version !== RECORD_VERSION) {
    return {reason: `the record holds payload version ${record?.version ?? "none"}, from before per-Function hashes`};
  }
  if (!record.codebases || typeof record.codebases !== "object") return {reason: "the record holds no codebases"};
  for (const [codebase, entry] of Object.entries(record.codebases)) {
    if (!entry || typeof entry.functions !== "object" || entry.functions === null) {
      return {reason: `the record's ${codebase} codebase holds no Function hashes`};
    }
  }
  return {record};
}

/**
 * The deploy plan. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {{version: number, codebases: Record<string, {hash: string, functions: string[],
 *   functionHashes: Record<string, string>, functionSecrets?: Record<string, string[]>}>}} input.current
 *   This commit's packaging manifest.
 * @param {string} [input.previous] The recorded payload of the newest delivered Functions record.
 * @param {Record<string, string>|null} input.secretVersions Each secret's newest version, or null if unread.
 * @param {string[]} [input.secretFailures] Secrets whose version could not be read.
 * @param {object} input.toolchain What the deploy runs with (Firebase CLI, Node).
 * @param {boolean} [input.full]
 * @param {string[]} [input.retired] functions/retired-functions.json: removed Functions the deploy deletes.
 */
export function planFunctionDeploy({current, previous, secretVersions, secretFailures = [], toolchain, full = false,
  retired = []}) {
  if (current?.version !== 2) throw new Error("The packaging manifest must be version 2 (per-Function hashes).");
  const needed = new Set(Object.values(current.codebases)
    .flatMap(({functionSecrets = {}}) => Object.values(functionSecrets).flat()));
  const missing = [...needed].filter((secret) => !secretVersions || !(secret in secretVersions)).sort();
  const unread = [...new Set([...secretFailures, ...missing])].filter((secret) => needed.has(secret)).sort();
  // The payload both records store: only when every declared secret's
  // version is known, else the next run could not trust it.
  const recordFunctions = (codebase) => Object.fromEntries(Object.entries(current.codebases[codebase].functionHashes)
    .map(([name, hash]) => [name, finalHash(hash, current.codebases[codebase].functionSecrets?.[name], secretVersions ?? {})]));
  const payload = {version: unread.length ? 1 : RECORD_VERSION, toolchain,
    codebases: Object.fromEntries(Object.entries(current.codebases).map(([codebase, {hash}]) =>
      [codebase, unread.length ? {hash} : {hash, functions: recordFunctions(codebase)}]))};
  const all = (reason) => ({mode: "all", reason, deploy: [], skipped: 0, unreadSecrets: unread, payload});
  if (full) return all("full deploy requested");
  if (unread.length) return all(`the newest version of ${unread.join(", ")} could not be read`);
  const {record, reason} = readRecord(previous);
  if (!record) return all(reason);
  if (JSON.stringify(record.toolchain ?? null) !== JSON.stringify(toolchain ?? null)) {
    return all("the record was deployed with another toolchain");
  }
  const recordedCodebase = new Map(Object.entries(record.codebases)
    .flatMap(([codebase, {functions}]) => Object.keys(functions).map((name) => [name, codebase])));
  const inCode = new Set(Object.values(current.codebases).flatMap(({functions}) => functions));
  const retiredNames = new Set(retired);
  const removed = [...recordedCodebase.keys()].filter((name) => !inCode.has(name) && !retiredNames.has(name)).sort();
  if (removed.length) {
    return all(`${removed.join(", ")} ${removed.length === 1 ? "is" : "are"} recorded but no longer in the code ` +
      "(list it in functions/retired-functions.json to delete it)");
  }
  const deploy = [];
  let skipped = 0;
  for (const [codebase, entry] of Object.entries(current.codebases)) {
    const hashes = payload.codebases[codebase].functions;
    for (const name of entry.functions) {
      const before = recordedCodebase.get(name);
      if (before && before !== codebase) return all(`${name} moved from codebase ${before} to ${codebase}`);
      const why = !before ? "new Function" :
        record.codebases[codebase].functions[name] !== hashes[name] ?
          (entry.functionHashes[name].startsWith("codebase:") ? "its codebase changed (it loads a computed path)" :
            "its code, packages, parameters or secrets changed") : null;
      if (why) deploy.push({codebase, name, target: `functions:${codebase}:${name}`, why});
      else skipped++;
    }
  }
  return {mode: "planned", reason: deploy.length ? `${deploy.length} Function(s) changed` : "no Function changed",
    deploy, skipped, unreadSecrets: [], payload};
}

export function planMarkdown(plan, environment = "this environment") {
  const lines = [`### This ${environment} deploy: ${plan.mode === "all" ?
    `every changed codebase (${plan.reason})` : `${plan.deploy.length} Function(s), ${plan.skipped} unchanged`}`, ""];
  if (plan.unreadSecrets.length) {
    lines.push(`**Warning:** the newest version of ${plan.unreadSecrets.join(", ")} could not be read, ` +
      "so this run falls back to deploying every changed codebase.", "");
  }
  if (plan.mode === "planned" && plan.deploy.length) {
    lines.push("| Function | Codebase | Why |", "|---|---|---|",
      ...plan.deploy.map(({name, codebase, why}) => `| ${name} | ${codebase} | ${why} |`), "");
  } else if (plan.mode === "planned") {
    lines.push("No Function changed; the Functions deploy is skipped.", "");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const {values} = parseArgs({options: {
    current: {type: "string"}, previous: {type: "string"}, secrets: {type: "string"}, retired: {type: "string"},
    toolchain: {type: "string"}, full: {type: "string", default: "false"},
    environment: {type: "string", default: "this environment"},
    "plan-out": {type: "string"}, "record-out": {type: "string"},
    summary: {type: "string"}, "github-output": {type: "string"},
  }});
  if (!values.current || !values["plan-out"] || !values["record-out"] || !values.toolchain) {
    console.error("Usage: plan_function_deploy.mjs --current <manifest> [--previous <payload>] [--secrets <versions>] " +
      "--toolchain <json> [--full true|false] --plan-out <file> --record-out <file> [--summary <file>] [--github-output <file>]");
    return 64;
  }
  const read = (file) => (file && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
  const secrets = read(values.secrets) ? JSON.parse(read(values.secrets)) : {versions: null, failures: []};
  const plan = planFunctionDeploy({current: JSON.parse(read(values.current)), previous: read(values.previous),
    secretVersions: secrets.versions, secretFailures: secrets.failures ?? [],
    toolchain: JSON.parse(values.toolchain), full: values.full === "true",
    retired: read(values.retired) ? JSON.parse(read(values.retired)) : []});
  fs.writeFileSync(values["plan-out"], `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(values["record-out"], `${JSON.stringify(plan.payload)}\n`);
  for (const secret of plan.unreadSecrets) {
    console.log(`::warning::The newest version of secret ${secret} could not be read; this deploy falls back to every changed codebase.`);
  }
  const markdown = planMarkdown(plan, values.environment);
  process.stdout.write(markdown);
  if (values.summary) fs.appendFileSync(values.summary, markdown);
  if (values["github-output"]) {
    fs.appendFileSync(values["github-output"],
      `mode=${plan.mode}\nonly=${plan.mode === "planned" ? plan.deploy.map(({target}) => target).join(",") : "functions"}\n` +
      `count=${plan.deploy.length}\n`);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
