#!/usr/bin/env node
// Renders the Dart the schema contract generator emits at two exact commits,
// so the Flutter test selector can select the importers of what changed
// instead of treating every contract edit as a global input.
//
// Usage: node tool/harness/lib/flutter_contract_outputs.mjs --base <sha> --head <sha>
// Prints {"before": {path: source}, "after": {path: source}} on stdout.
// Exits non-zero when it cannot prove the outputs; the selector then falls
// back to its conservative behaviour.
import {execFileSync, spawn} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// What tool/contracts/generate_schema_contracts.mjs reads: contract files,
// its own sources and the anchor it resolves functions/node_modules from.
export const GENERATOR_INPUTS = ["contracts", "tool/contracts"];
const ARCHIVED = [...GENERATOR_INPUTS, "functions/package.json"];
const GENERATOR = "tool/contracts/generate_schema_contracts.mjs";

/** Generated Dart that is not tracked and that root tests can import. */
export function isGeneratedContractDart(name) {
  return name.endsWith(".dart") && (
    name.startsWith("packages/platform/lib/schema_contracts/generated/") ||
    /^lib\/contexts\/[^/]+\/data\/generated\//.test(name)
  );
}

function git(args, options = {}) {
  return execFileSync("git", args, {encoding: "utf8", maxBuffer: 1 << 30, ...options});
}

function inputKey(sha, cwd) {
  return GENERATOR_INPUTS.map((input) => git(["rev-parse", `${sha}:${input}`], {cwd}).trim()).join(" ");
}

function lockBlob(sha, cwd) {
  return git(["rev-parse", `${sha}:functions/package-lock.json`], {cwd}).trim();
}

function collect(root) {
  const outputs = {};
  const walk = (relative) => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    for (const entry of fs.readdirSync(absolute, {withFileTypes: true})) {
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile() && isGeneratedContractDart(name)) {
        outputs[name] = fs.readFileSync(path.join(root, name), "utf8");
      }
    }
  };
  walk("packages/platform/lib/schema_contracts/generated");
  const contexts = path.join(root, "lib/contexts");
  if (fs.existsSync(contexts)) {
    for (const context of fs.readdirSync(contexts)) walk(`lib/contexts/${context}/data/generated`);
  }
  return outputs;
}

async function generate(sha, repoRoot, scratch) {
  const nodeModules = path.join(repoRoot, "functions/node_modules");
  const root = fs.mkdtempSync(path.join(scratch, "tree-"));
  const archive = execFileSync("git", ["archive", sha, "--", ...ARCHIVED], {cwd: repoRoot, maxBuffer: 1 << 30});
  execFileSync("tar", ["-x", "-C", root], {input: archive});
  fs.symlinkSync(nodeModules, path.join(root, "functions/node_modules"), "dir");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [GENERATOR], {cwd: root, stdio: ["ignore", "ignore", "pipe"]});
    let errors = "";
    child.stderr.on("data", (chunk) => { errors += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() :
      reject(new Error(`Generator failed at ${sha}: ${errors.trim()}`)));
  });
  const outputs = collect(root);
  if (Object.keys(outputs).length === 0) throw new Error(`Generator emitted no Dart at ${sha}`);
  return outputs;
}

export async function contractOutputs({base, head, repoRoot = process.cwd()}) {
  if (!fs.existsSync(path.join(repoRoot, "functions/node_modules/json-schema-to-typescript"))) {
    throw new Error("functions/node_modules is not installed");
  }
  // The installed generator dependencies come from the checkout. They must
  // be the ones each rendered commit locks.
  const installed = git(["hash-object", "functions/package-lock.json"], {cwd: repoRoot}).trim();
  const same = inputKey(base, repoRoot) === inputKey(head, repoRoot);
  for (const sha of same ? [head] : [base, head]) {
    if (lockBlob(sha, repoRoot) !== installed) {
      throw new Error(`functions/package-lock.json at ${sha} differs from the installed dependencies`);
    }
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "catch-contract-outputs-"));
  try {
    const [after, before] = await Promise.all([
      generate(head, repoRoot, scratch),
      same ? null : generate(base, repoRoot, scratch),
    ]);
    return {before: before ?? after, after};
  } finally {
    fs.rmSync(scratch, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const option = (name) => {
    const index = args.indexOf(name);
    const value = index < 0 ? undefined : args[index + 1];
    if (!/^[0-9a-f]{40}$/.test(value ?? "")) throw new Error(`${name} needs an exact commit SHA`);
    return value;
  };
  try {
    const outputs = await contractOutputs({base: option("--base"), head: option("--head")});
    process.stdout.write(JSON.stringify(outputs));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
