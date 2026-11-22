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

// lane P2 owns tool/architecture/carried_screens.json: the files moved from
// code not yet drawn to the new-root rules, which the lints treat as legacy.
// Until P2 merges, the file does not exist and this hook does nothing. Once
// it exists, the hook must be implemented here (add {path, from} for every
// moved file whose old path is outside the new-root roots and whose target
// is under apps/*/lib or lib/pages, then drop what catch_arch_stale_carry
// flags), so it fails rather than silently moving screens uncarried.
export function updateCarriedScreens({root}) {
  if (!fs.existsSync(path.join(root, carriedScreensPath))) {
    return {
      status: "skipped",
      reason: `${carriedScreensPath} is lane P2's file and is not on this branch; no carry entries were written.`,
    };
  }
  throw new Error(
    `${carriedScreensPath} exists, so lane P2 has merged: implement updateCarriedScreens in ` +
    "tool/architecture/lib/screen_move_outputs.mjs before applying a screen move.",
  );
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

// The analyzer's stale-exception reports for the given files. dart analyze
// takes one directory, so the root analysis (which covers apps/*) runs once
// and its findings are filtered to the files.
export function staleIgnoreFindings(root, files) {
  if (files.length === 0) return [];
  const wanted = new Set(files);
  const result = spawnSync("dart", ["analyze", "--format=machine", "."], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (result.status === 64 || result.error != null) {
    throw new Error(`dart analyze could not run:\n${result.stderr || result.error?.message}`);
  }
  const findings = [];
  for (const line of `${result.stdout}\n${result.stderr}`.split("\n")) {
    const fields = line.split("|");
    if (fields.length < 8 || !/catch_arch_invalid_ignore$/iu.test(fields[2])) continue;
    if (!fields.slice(7).join("|").startsWith("Remove this stale exception")) continue;
    const file = path.relative(fs.realpathSync(root), fs.realpathSync.native(fields[3]));
    if (wanted.has(file)) findings.push({file, line: Number(fields[4])});
  }
  return findings;
}

export function headSha(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
}
