// Which CI lanes execute or read each file, derived statically from
// .github/workflows/ci.yml.
//
// A ci.yml job gated on `needs.plan.outputs.<lane> == 'true'` is a lane job:
// what it executes or reads selects those lanes. A job lane jobs need (plan,
// source preflight) gates every lane, so what it executes or reads selects
// every lane. Any other ungated job (workflow lint, Required CI) runs on every
// PR, so what only it reads needs no lane. Selector files are separate: what decides selection
// selects every lane, because a narrowed run could not validate the change
// that narrowed it.
//
// From each lane job the closure follows reusable workflows, composite
// actions, scripts named in `run:` steps, the npm scripts those steps invoke,
// and the files those scripts import or name by literal path. A reference
// that cannot be resolved statically, such as `node "$SCRIPT"`, makes every
// file its job reaches select every lane; it never selects none.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {parse} from "yaml";

export const ALL = "*";
export const ciWorkflow = ".github/workflows/ci.yml";

// Files that decide which lanes run. A change to one of them, or to a file
// the selector entry points import or load, selects every lane.
export const selectorFiles = [ciWorkflow, "nx.json", "firebase.json", "tool/ci/toolchain.env",
  "tool/harness.mjs", "tool/harness/component_graph.json", "tool/tools_manifest.json",
  "tool/repository_root_manifest.json", "tool/ci/main_push_base.mjs", "tool/ci/required_ci_floor.mjs"];
export const selectorPrefixes = ["tool/harness/", "tool/nx/"];
// The scripts the plan job selects with.
export const selectorEntries = ["tool/harness.mjs", "tool/harness/compare_selectors.mjs",
  "tool/harness/verify_local.mjs", "tool/nx/select_lanes.mjs", "tool/ci/main_push_base.mjs",
  "tool/ci/required_ci_floor.mjs"];

// Variable command targets the scan cannot read, with the files they name.
// Each entry is checked by workflow_callers.test.mjs.
export const declaredTargets = [
  {file: "tool/test_app_shell_integration.sh", command: /bash "\$\{runner\}"/u,
    targets: ["tool/test_app_shell_integration.sh"], why: "runner is ${BASH_SOURCE[0]}, the script itself"},
  {file: "tool/deploy_firebase_targets.sh", command: /\$functions_dir/u,
    targets: ["functions/package.json", "functions/package-lock.json"],
    why: "functions_dir defaults to $repo_root/functions"},
];
// The running script itself.
// The running script itself, or arguments passed through to a named program.
const selfReference = /(?:bash|sh)\s+"(?:\$0|\$\{BASH_SOURCE\[0\]\}|\$@)"/u;

const codeFile = /\.(?:mjs|cjs|js|sh|bash|dart|py)$/u;
const shellFile = /\.(?:sh|bash)$/u;
const workflowFile = /^\.github\/(?:workflows\/[^/]+\.ya?ml|actions\/[^/]+\/action\.ya?ml)$/u;
const pathPattern = /(?:\.{1,2}\/)*[\w@.-]+(?:\/[\w@.-]+)+\.(?:mjs|cjs|js|ts|sh|bash|dart|py|json|ya?ml|env|txt)\b/gu;
const spawnLine = /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork|runNode|run)\s*\(|["'`](?:node|bash|sh|dart|python3)["'` ]/u;
const dataPathPattern = /(?:\.{1,2}\/)*[\w@.-]+(?:\/[\w@.-]+)+\.(?:json|ya?ml|env|txt)\b/gu;
const relativeImport = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bpart\s+)["'](\.{1,2}\/[^"']+)["']/gu;
const npmCommand = /\bnpm\s+((?:--?[\w-]+(?:[ =](?!run\b|test\b|ci\b|install\b)[^\s;&|]+)?\s+)*)(run(?:-script)?\s+([\w:.-]+)|test\b|ci\b|install\b)/gu;
const dynamicCommand = /\b(?:node|bash|sh|python3|dart\s+run)\s+(?:--?[\w-]+(?:=\S+)?\s+)*["']?\$(?!\{\{)/u;

// `"$ROOT/tool/x.mjs"` names tool/x.mjs: drop a variable that prefixes a path.
const stripRootVariables = (text) => text.replace(/\$\{?\w+\}?\//gu, "");

export function trackedFiles(root = process.cwd()) {
  return new Set(execFileSync("git", ["ls-files", "-z"], {cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024})
    .split("\0").filter(Boolean));
}

function createScanner(root, files) {
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const exists = (file) => files.has(file);
  const packageByName = new Map([...files]
    .filter((file) => file === "package.json" || file.endsWith("/package.json"))
    .map((file) => [JSON.parse(read(file)).name, path.posix.dirname(file)]));

  let tools = null;
  const manifestTools = () => (tools ??= exists("tool/tools_manifest.json")
    ? JSON.parse(read("tool/tools_manifest.json")).tools ?? [] : []);
  const unquote = (value) => value?.replace(/^["']|["']$/gu, "").replace(/^\$\{?\w+\}?\//u, "");
  const resolve = (ref, baseDir) => {
    for (const candidate of [path.posix.normalize(path.posix.join(baseDir, ref)), path.posix.normalize(ref)]) {
      if (exists(candidate)) return candidate;
      for (const suffix of [".mjs", ".js", "/index.mjs", "/index.js"]) {
        if (exists(candidate + suffix)) return candidate + suffix;
      }
    }
    return null;
  };

  // A workflow named by path in a script is read as text, not run. Workflow
  // policy (actionlint, zizmor and the wiring tests) covers those reads for
  // every workflow change, so they add no lane.
  const addPaths = (text, pattern, baseDir, out) => {
    for (const ref of stripRootVariables(text).match(pattern) ?? []) {
      const file = resolve(ref, baseDir);
      if (file && !workflowFile.test(file)) out.refs.add(file);
    }
  };

  // References in shell text: run: steps, .sh files and npm scripts.
  const shellRefs = (text, baseDir, from, out) => {
    for (const [, action] of text.matchAll(/uses:\s*\.\/(\.github\/actions\/[\w.-]+)/gu)) {
      out.refs.add(`${action}/action.yml`);
    }
    for (const [, workflow] of text.matchAll(/uses:\s*\.\/(\.github\/workflows\/[\w.-]+\.ya?ml)/gu)) {
      out.refs.add(workflow);
    }
    addPaths(text, pathPattern, baseDir, out);
    // `node tool/run.mjs check <ids>` runs those manifest checks; with
    // affected-tools or variable arguments it can run any of them.
    for (const [, args] of text.matchAll(/\bnode\s+(?:\.\/)?tool\/run\.mjs\s+([^\n;&|]*)/gu)) {
      const ids = args.trim().split(/\s+/u).slice(1);
      const any = !/^check\b/u.test(args.trim()) || ids.some((id) => id.includes("$"));
      for (const tool of manifestTools()) {
        if (!any && !ids.includes(tool.id)) continue;
        if (tool.path && exists(tool.path)) out.refs.add(tool.path);
        for (const command of [tool.command, ...(tool.checks ?? [])]) {
          if (typeof command === "string") shellRefs(command, ".", `tool/tools_manifest.json#${tool.id}`, out);
        }
      }
    }
    for (const [, flags, , script] of text.matchAll(npmCommand)) {
      const prefix = unquote(/--prefix[ =](\S+)/u.exec(flags)?.[1]);
      const workspace = unquote(/--workspace[ =](\S+)/u.exec(flags)?.[1]);
      const dir = [prefix && path.posix.normalize(path.posix.join(baseDir, prefix)), prefix && path.posix.normalize(prefix),
        workspace && (packageByName.get(workspace) ?? workspace), !prefix && !workspace && baseDir,
        !prefix && !workspace && "."].find((candidate) => candidate && exists(path.posix.join(candidate, "package.json")))
        ?? prefix ?? workspace ?? baseDir;
      const manifest = path.posix.join(dir, "package.json");
      if (!exists(manifest)) {
        const declared = declaredTargets.find((entry) => entry.file === from && entry.command.test(flags));
        if (declared) for (const target of declared.targets) out.refs.add(target);
        else out.unresolved.push({from, ref: `npm package ${dir}`});
        continue;
      }
      out.refs.add(manifest);
      if (exists(path.posix.join(dir, "package-lock.json"))) out.refs.add(path.posix.join(dir, "package-lock.json"));
      if (!script) continue;
      // A script the package does not define fails before it reads anything.
      const command = JSON.parse(read(manifest)).scripts?.[script];
      if (command != null) shellRefs(command, dir, `${manifest}#${script}`, out);
    }
    // A command whose target is a variable resolves only when the line also
    // names the file, as in `node "$ROOT/tool/x.mjs"`.
    for (const line of text.split("\n")) {
      if (!dynamicCommand.test(line) || selfReference.test(line)) continue;
      if ((stripRootVariables(line).match(pathPattern) ?? []).some((ref) => resolve(ref, baseDir))) continue;
      const declared = declaredTargets.find((entry) => entry.file === from && entry.command.test(line));
      if (declared) for (const target of declared.targets) out.refs.add(target);
      else out.unresolved.push({from, ref: line.trim()});
    }
  };

  /** What a file executes or reads directly. */
  const refsOf = (file) => {
    const out = {refs: new Set(), unresolved: []};
    if (workflowFile.test(file)) {
      const doc = parse(read(file)) ?? {};
      const steps = [...Object.values(doc.jobs ?? {}).flatMap((job) => [
        ...(job.uses ? [{uses: job.uses}] : []), ...(job.steps ?? [])]), ...(doc.runs?.steps ?? [])];
      for (const step of steps) stepRefs(step, file, out);
    } else if (codeFile.test(file)) {
      const text = read(file);
      const dir = path.posix.dirname(file);
      for (const [, ref] of text.matchAll(relativeImport)) {
        const resolved = resolve(ref, dir);
        if (resolved) out.refs.add(resolved);
      }
      if (shellFile.test(file)) shellRefs(text, dir, file, out);
      else {
        // A module reads the data files it names, and runs a script it names
        // on a line that starts a process. Other path mentions (fixtures,
        // messages, comments) are not dependencies.
        addPaths(text, dataPathPattern, dir, out);
        for (const line of text.split("\n")) {
          if (spawnLine.test(line)) addPaths(line, pathPattern, dir, out);
        }
      }
    }
    out.refs.delete(file);
    return out;
  };

  const stepRefs = (step, from, out) => {
    const dir = step["working-directory"] ?? ".";
    if (typeof step.uses === "string") shellRefs(`uses: ${step.uses}`, ".", from, out);
    if (typeof step.run === "string") shellRefs(step.run, dir, from, out);
  };

  /** What a module imports or loads by literal path: the files it depends on to decide. */
  const loadsOf = (file) => {
    const out = {refs: new Set(), unresolved: []};
    if (!/\.(?:mjs|cjs|js)$/u.test(file)) return out;
    const text = read(file);
    const dir = path.posix.dirname(file);
    for (const [, ref] of text.matchAll(relativeImport)) {
      const resolved = resolve(ref, dir);
      if (resolved) out.refs.add(resolved);
    }
    // Only data it opens: a JSON or env path inside a read call on its line.
    for (const line of text.split("\n")) {
      if (/\b(?:readFileSync|readFile|new URL|fromRepo|readJson\w*)\s*\(/u.test(line)) addPaths(line, dataPathPattern, dir, out);
    }
    out.refs.delete(file);
    return out;
  };

  return {read, refsOf, stepRefs, loadsOf};
}

function closure(entries, next) {
  const seen = new Set();
  const unresolved = [];
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const out = next(file);
    unresolved.push(...out.unresolved);
    queue.push(...out.refs);
  }
  return {files: seen, unresolved};
}

/**
 * The caller graph of ci.yml. `lanes` maps each file a lane job reaches to
 * the lanes that execute or read it, `selectors` is every file that decides
 * selection, and `unresolved` lists references no file could be found for.
 */
export function workflowCallers({root = process.cwd(), lanes: laneNames, files = trackedFiles(root)} = {}) {
  const scanner = createScanner(root, files);
  const cache = new Map();
  const refsOf = (file) => {
    if (!cache.has(file)) cache.set(file, scanner.refsOf(file));
    return cache.get(file);
  };

  const lanes = new Map();
  const jobsOf = new Map();
  const jobLanesById = new Map();
  const unresolved = [];
  const ci = parse(scanner.read(ciWorkflow));
  const jobs = Object.entries(ci.jobs ?? {});
  const laneJobs = jobs.filter(([, job]) => jobLanesOf(job, laneNames).size > 0);
  const laneJobIds = new Set(laneJobs.map(([id]) => id));
  const gateJobs = new Set(laneJobs.flatMap(([, job]) => [job.needs ?? []].flat()).filter((id) => !laneJobIds.has(id)));
  for (const [jobId, job] of jobs) {
    const jobLanes = gateJobs.has(jobId) ? new Set([ALL]) : jobLanesOf(job, laneNames);
    if (jobLanes.size === 0) continue;
    const entry = {refs: new Set(), unresolved: []};
    for (const step of [...(job.uses ? [{uses: job.uses}] : []), ...(job.steps ?? [])]) {
      scanner.stepRefs(step, `${ciWorkflow}#${jobId}`, entry);
    }
    const reach = closure(entry.refs, refsOf);
    const jobUnresolved = [...entry.unresolved, ...reach.unresolved];
    unresolved.push(...jobUnresolved.map((item) => ({...item, job: jobId})));
    jobLanesById.set(jobId, new Set(jobUnresolved.length > 0 ? [ALL, ...jobLanes] : jobLanes));
    for (const file of reach.files) {
      jobsOf.set(file, (jobsOf.get(file) ?? new Set()).add(jobId));
      const current = lanes.get(file) ?? new Set();
      if (jobUnresolved.length > 0) current.add(ALL);
      for (const lane of jobLanes) current.add(lane);
      lanes.set(file, current);
    }
  }

  const selectorReach = closure(selectorEntries.filter((file) => files.has(file)), (file) => scanner.loadsOf(file));
  const selectors = new Set([...selectorFiles, ...selectorReach.files]);
  return {lanes, jobsOf, jobLanes: jobLanesById, selectors, unresolved};
}

/** The lanes a ci.yml job runs for; none when it is ungated. */
export function jobLanesOf(job, laneNames) {
  const lanes = new Set();
  for (const [, output] of String(job.if ?? "").matchAll(/needs\.plan\.outputs\.(\w+)\s*==\s*'true'/gu)) {
    if (!laneNames || laneNames.includes(output)) lanes.add(output);
  }
  return lanes;
}

// CI configuration: the files whose selection this module decides. Other
// files keep the selection their Nx inputs give them.
export const isCiConfiguration = (file) => file.startsWith(".github/") || file.startsWith("tool/ci/");
// Tests under the selector directories check selection; they do not decide it.
export const isSelector = (file, graph) => graph.selectors.has(file) ||
  (selectorPrefixes.some((prefix) => file.startsWith(prefix)) && !/\.test\.mjs$/u.test(file));

/** The lanes changed files require because CI executes or reads them. */
export function callerLanes(changedFiles, {graph, allLanes}) {
  const selected = new Set();
  for (const file of changedFiles) {
    if (isSelector(file, graph)) return new Set(allLanes);
    if (!isCiConfiguration(file)) continue;
    for (const lane of graph.lanes.get(file) ?? []) {
      if (lane === ALL) return new Set(allLanes);
      selected.add(lane);
    }
  }
  return selected;
}
