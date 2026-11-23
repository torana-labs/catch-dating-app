// What a screen move regenerates instead of rewriting, the carried-screens
// hook, and the comment cleanup that follows a move. Generated files are only
// ever written by their own generators.
import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {carriedScreensPath} from "./screen_move_rewrite.mjs";

export const inventoryOutputs = ["tool/ui_capture/route_inventory.json", "docs/widget_catalog.md"];
const hostFeaturesPath = "design/features/host_feature_responsibilities.json";

// The host-destination READMEs build_host_feature_responsibilities.mjs
// writes, one per feature target root.
export function hostFeatureReadmes(contractSource) {
  if (contractSource == null) return [];
  let contract;
  try {
    contract = JSON.parse(contractSource);
  } catch {
    return [];
  }
  return (contract.features ?? [])
    .map((feature) => feature.targetRoot)
    .filter((root) => typeof root === "string" && root !== "")
    .map((root) => `${root.replace(/\/$/u, "")}/README.md`);
}

// Every file a move must leave to a generator, before and after the move.
export function regeneratedOutputs({readBefore, readAfter}) {
  return new Set([
    ...inventoryOutputs,
    ...hostFeatureReadmes(readBefore(hostFeaturesPath)),
    ...hostFeatureReadmes(readAfter(hostFeaturesPath)),
  ]);
}

// The generator steps, in the order --apply runs them. The inventories need
// the exact committed source, so they run after the move commit and are
// folded into it.
export function regenerationSteps() {
  return [
    {
      id: "host-feature-readmes",
      when: "before-commit",
      command: ["node", "tool/design/build_host_feature_responsibilities.mjs"],
      outputs: "host-destination READMEs",
    },
    {
      id: "l10n",
      when: "before-commit",
      command: ["node", "tool/harness/lib/check_flutter_l10n_generated.mjs", "--check"],
      outputs: "none (confirms the generated localizations still match the ARB)",
    },
    {
      id: "inventories",
      when: "after-commit",
      command: ["node", "tool/ci/generated_inventories.mjs", "--source-sha", "<HEAD>"],
      outputs: inventoryOutputs.join(", "),
    },
  ];
}

export function runRegeneration(root, when, {sourceSha = null} = {}) {
  const ran = [];
  for (const step of regenerationSteps().filter((candidate) => candidate.when === when)) {
    const command = step.command.map((part) => (part === "<HEAD>" ? sourceSha : part));
    const result = spawnSync(command[0], command.slice(1), {
      cwd: root,
      encoding: "utf8",
      env: {...process.env, GITHUB_ACTIONS: ""},
      maxBuffer: 1 << 26,
    });
    if (result.status !== 0) {
      throw new Error(`${command.join(" ")} failed:\n${result.stderr || result.stdout}`);
    }
    ran.push(step.id);
  }
  return ran;
}

// tool/architecture/carried_screens.json (lane P2) lists files under the
// new roots that keep the lint rules of the legacy path they came from:
// {"description": ..., "carried": [{"path": <new path>, "from": <old path>}]}.
// Only this codemod adds entries. The new roots are read from the lints'
// own migration_scope.dart, so both sides agree on what is already drawn.
const migrationScopePath = "packages/catch_ui_lints/lib/src/migration_scope.dart";

export function newRootMatcher(migrationScopeSource) {
  const match = /final _newRoot = RegExp\(\s*r'([^']+)'/u.exec(migrationScopeSource ?? "");
  if (match == null) {
    throw new Error(`${migrationScopePath} no longer defines _newRoot as a raw RegExp; update newRootMatcher.`);
  }
  const pattern = new RegExp(match[1], "u");
  return (file) => pattern.test(file);
}

export function parseCarried(source) {
  const json = JSON.parse(source);
  if (json == null || typeof json !== "object" || !Array.isArray(json.carried)) {
    throw new Error(`${carriedScreensPath} must be {"description": ..., "carried": [...]}.`);
  }
  return json;
}

export function formatCarried(json) {
  const carried = [...json.carried]
    .map((entry) => ({path: entry.path, from: entry.from}))
    .sort((a, b) => a.path.localeCompare(b.path));
  return `${JSON.stringify({...json, carried}, null, 2)}\n`;
}

// The carried list after a move: every moved handwritten Dart file whose old
// path is not under a new root is carried at its new path, unless it moves
// into lib/contexts (never carried) or out of the new roots; an entry whose
// file moves again follows it and keeps its original `from`.
export function carriedAfterMove({json, moves, isNewRoot, contextsRoot = "lib/contexts/"}) {
  const byPath = new Map(json.carried.map((entry) => [entry.path, entry]));
  const added = [];
  for (const [from, to] of [...moves].sort()) {
    if (!from.endsWith(".dart") || /\.(?:g|freezed)\.dart$/u.test(from)) continue;
    const existing = byPath.get(from);
    if (existing != null) {
      byPath.delete(from);
      if (!to.startsWith(contextsRoot) && isNewRoot(to)) byPath.set(to, {path: to, from: existing.from});
      continue;
    }
    if (!from.startsWith("lib/") || isNewRoot(from) || to.startsWith(contextsRoot) || !isNewRoot(to)) continue;
    byPath.set(to, {path: to, from});
    added.push(to);
  }
  return {json: {...json, carried: [...byPath.values()]}, added};
}

export function readCarried(root) {
  const file = path.join(root, carriedScreensPath);
  return fs.existsSync(file) ? parseCarried(fs.readFileSync(file, "utf8")) : null;
}

// Writes the carry entries for a move. Without lane P2's file (an older
// branch) nothing is carried.
export function updateCarriedScreens({root, moves}) {
  const json = readCarried(root);
  if (json == null) {
    return {status: "skipped", reason: `${carriedScreensPath} is not on this branch; no carry entries were written.`};
  }
  const isNewRoot = newRootMatcher(readText(root, migrationScopePath));
  const result = carriedAfterMove({json, moves, isNewRoot});
  fs.writeFileSync(path.join(root, carriedScreensPath), formatCarried(result.json));
  return {status: "written", added: result.added.length, entries: result.json.carried.length};
}

// Drops every entry the analyzer reports as catch_arch_stale_carry: the file
// already meets the new-root rules.
export function dropStaleCarries({root, findings}) {
  const json = readCarried(root);
  if (json == null) return [];
  const stale = new Set(findings
    .filter((finding) => /catch_arch_stale_carry$/iu.test(finding.code))
    .map((finding) => finding.file));
  const dropped = json.carried.filter((entry) => stale.has(entry.path)).map((entry) => entry.path);
  if (dropped.length > 0) {
    fs.writeFileSync(path.join(root, carriedScreensPath), formatCarried({
      ...json,
      carried: json.carried.filter((entry) => !stale.has(entry.path)),
    }));
  }
  return dropped;
}

function readText(root, file) {
  const absolute = path.join(root, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
}

const reviewLine = /^[ \t]*\/\/[ \t]*provider-graph:[ \t]*(\S+)/u;
const ignoreLine = /^[ \t]*\/\/[ \t]*ignore:[ \t]*(catch_ui_lints\/[a-z_]+)[ \t]*(?:--.*)?$/u;

// Removes, from moved Dart files only, the provider-graph reviews the graph
// now reports stale and the catch_ui_lints ignores the analyzer reports as
// stale. Each removal is a whole line.
export function removeStaleComments({files, staleReviewIds, staleIgnores, read, write}) {
  const removed = [];
  for (const file of files) {
    const source = read(file);
    if (source == null) continue;
    const staleLines = new Set(staleIgnores.filter((finding) => finding.file === file)
      .map((finding) => finding.line));
    const keys = new Set(staleReviewIds
      .map((id) => reviewKeyFor(id, file))
      .filter(Boolean));
    const lines = source.split("\n");
    const kept = lines.filter((line, index) => {
      const review = reviewLine.exec(line);
      if (review != null && keys.has(review[1])) {
        removed.push({file, line: index + 1, kind: "provider-graph"});
        return false;
      }
      if (staleLines.has(index + 1) && ignoreLine.test(line)) {
        removed.push({file, line: index + 1, kind: "ignore"});
        return false;
      }
      return true;
    });
    if (kept.length !== lines.length) write(file, kept.join("\n"));
  }
  return removed;
}

// An ownership review id carries the path of the file holding it; any other
// id is the review key itself.
function reviewKeyFor(id, file) {
  const ownership = /^(ownership-[^:]+):([^#]+)#(.+)$/u.exec(id);
  if (ownership == null) return id;
  return ownership[2] === file ? `${ownership[1]}:${ownership[3]}` : null;
}

export function staleReviewIds(root) {
  const result = spawnSync("dart", ["run", "tool/architecture/provider_graph.dart", "--summary"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  try {
    return JSON.parse(result.stdout).health?.staleArchitectureReviewIds ?? [];
  } catch {
    throw new Error(`provider_graph.dart --summary did not print JSON:\n${result.stderr}`);
  }
}

// One root analysis (dart analyze takes a single directory; the root covers
// apps/*), as {code, file, line, message} for every reported diagnostic.
export function analyzerFindings(root) {
  const result = spawnSync("dart", ["analyze", "--format=machine", "."], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (result.status === 64 || result.error != null) {
    throw new Error(`dart analyze could not run:\n${result.stderr || result.error?.message}`);
  }
  const realRoot = fs.realpathSync(root);
  const findings = [];
  for (const line of `${result.stdout}\n${result.stderr}`.split("\n")) {
    const fields = line.split("|");
    if (fields.length < 8 || !fs.existsSync(fields[3])) continue;
    findings.push({
      code: fields[2],
      file: path.relative(realRoot, fs.realpathSync.native(fields[3])),
      line: Number(fields[4]),
      message: fields.slice(7).join("|"),
    });
  }
  return findings;
}

// The stale-exception reports among the findings, for the given files.
export function staleIgnoreFindings(findings, files) {
  const wanted = new Set(files);
  return findings.filter((finding) => wanted.has(finding.file) &&
    /catch_arch_invalid_ignore$/iu.test(finding.code) &&
    finding.message.startsWith("Remove this stale exception"));
}

export function headSha(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
}
