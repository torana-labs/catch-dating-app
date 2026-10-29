#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {matchesGlobPath} from "../lib/path_glob.mjs";
import {matchesCodegenInput} from "../harness/lib/component_graph.mjs";

export class PreCommitGeneratedArtifactError extends Error {}

export function planPreCommitActions({graph, stagedPaths}) {
  const paths = [...new Set(stagedPaths)].sort();
  const generators = Array.isArray(graph?.compileCodegen) ? graph.compileCodegen : [];
  const triggeredGenerators = generators.filter((generator) => {
    if (
      generator.id === "contracts.schema-projections" &&
      paths.some((candidate) => pathIsWithin(candidate, "contracts"))
    ) return true;
    if (
      generator.id === "admin.callable-validators" &&
      paths.some((candidate) => pathIsWithin(candidate, "contracts/callables"))
    ) return true;
    return paths.some((candidate) => matchesGeneratorPath(candidate, generator));
  });
  const l10n = generators.find((generator) => generator.id === "flutter.l10n");
  const l10nInputChanged = paths.some((candidate) =>
    matchesGlobPath(candidate, "lib/l10n/*.arb") ||
      (l10n != null && matchesCodegenInput(candidate, l10n)));
  return {
    // Generator outputs have an exact canonical generator format. Formatting
    // them again would invalidate the freshness check that runs in this same
    // hook. Localization outputs are written by this hook and stay formatted.
    dartPaths: paths.filter((candidate) => candidate.endsWith(".dart") &&
      !generators.some((generator) =>
        generator.id !== "flutter.l10n" &&
        (generator.outputs ?? []).some((pattern) => matchesGlobPath(candidate, pattern)))),
    l10nInputChanged,
    functionsSourceChanged: paths.some((candidate) =>
      /^functions\/src\/.*\.(?:cts|mts|tsx?)$/u.test(candidate)),
    l10nOutputs: l10n?.outputs ?? [],
    l10nWriteCommand: l10n?.writeCommand ?? null,
    triggeredGenerators,
    triggeredGeneratorIds: triggeredGenerators.map((generator) => generator.id),
  };
}

export function runPreCommitGeneratedArtifacts({
  fileExists = defaultFileExists,
  graph,
  repoRoot,
  runCommand = defaultRunCommand,
  stagedPaths: injectedStagedPaths,
  unstagedPaths: injectedUnstagedPaths,
} = {}) {
  const resolvedRoot = path.resolve(repoRoot ?? defaultRepoRoot());
  let stagedPaths = injectedStagedPaths ?? readGitPaths({
    args: ["diff", "--cached", "--name-only", "--no-renames", "-z", "--"],
    repoRoot: resolvedRoot,
    runCommand,
  });
  if (stagedPaths.length === 0) {
    return {formattedDartPaths: [], generated: [], checked: []};
  }

  const indexedGraph = graph == null ? readIndexedGraph({repoRoot: resolvedRoot, runCommand}) : null;
  let sourceGraph = graph;
  if (sourceGraph == null) {
    try { sourceGraph = JSON.parse(indexedGraph.toString("utf8")); } catch {
      throw new PreCommitGeneratedArtifactError("Refusing to use an invalid generator catalog in the Git index.");
    }
  }

  let plan = planPreCommitActions({graph: sourceGraph, stagedPaths});
  // Generation can select downstream freshness checks through its outputs.
  const preflightPlan = planPreCommitActions({graph: sourceGraph, stagedPaths:
    plan.l10nInputChanged ? [...stagedPaths, ...plan.l10nOutputs] : stagedPaths});
  if (indexedGraph != null && (preflightPlan.dartPaths.length > 0 ||
    preflightPlan.triggeredGenerators.length > 0)) {
    const catalog = "tool/harness/component_graph.json";
    assertRegularPaths(resolvedRoot, [catalog]);
    if (!fs.readFileSync(path.join(resolvedRoot, catalog)).equals(indexedGraph)) {
      throw new PreCommitGeneratedArtifactError("Refusing to use a generator catalog that differs from the Git index.");
    }
  }
  assertIndexIntegrity({plan: preflightPlan, repoRoot: resolvedRoot, runCommand,
    unstagedPaths: injectedUnstagedPaths});
  const generated = [];
  if (plan.l10nInputChanged) {
    if (!plan.l10nWriteCommand || plan.l10nOutputs.length === 0) {
      throw new PreCommitGeneratedArtifactError(
        "The compile-codegen catalog is missing the Flutter localization command or outputs.",
      );
    }
    runShellCommand({
      command: plan.l10nWriteCommand,
      failureMessage: `Localization generation failed: ${plan.l10nWriteCommand}`,
      repoRoot: resolvedRoot,
      runCommand,
    });
    const outputs = plan.l10nOutputs.filter((relativePath) =>
      fileExists(path.join(resolvedRoot, relativePath)));
    runRequiredCommand({
      args: ["add", "--", ...outputs],
      command: "git",
      failureMessage: "Could not stage generated localization outputs.",
      repoRoot: resolvedRoot,
      runCommand,
    });
    generated.push("flutter.l10n");
    stagedPaths = [...new Set([...stagedPaths, ...outputs])].sort();
    plan = planPreCommitActions({graph: sourceGraph, stagedPaths});
  }

  const formattedDartPaths = plan.dartPaths.filter((relativePath) =>
    fileExists(path.join(resolvedRoot, relativePath)));
  if (formattedDartPaths.length > 0) {
    runRequiredCommand({
      args: ["format", "--", ...formattedDartPaths],
      command: "dart",
      failureMessage: "dart format failed for staged Dart files.",
      repoRoot: resolvedRoot,
      runCommand,
    });
    runRequiredCommand({
      args: ["add", "--", ...formattedDartPaths],
      command: "git",
      failureMessage: "Could not re-stage formatted Dart files.",
      repoRoot: resolvedRoot,
      runCommand,
    });
  }

  const checked = [];
  if (plan.functionsSourceChanged) {
    runRequiredCommand({
      args: ["tool/firebase/check_functions_source_closure.mjs"],
      command: "node",
      failureMessage:
        "Functions staged TypeScript dependency closure is incomplete.",
      repoRoot: resolvedRoot,
      runCommand,
    });
    checked.push("functions.source-closure");
  }
  for (const generator of plan.triggeredGenerators) {
    runShellCommand({
      command: generator.checkCommand,
      failureMessage:
        `Generated artifact drift for ${generator.id}. Regenerate and stage with:\n` +
        `  ${generator.writeCommand}`,
      repoRoot: resolvedRoot,
      runCommand,
    });
    checked.push(generator.id);
  }
  return {checked, formattedDartPaths, generated};
}

function matchesGeneratorPath(candidate, generator) {
  return matchesCodegenInput(candidate, generator) ||
    generator.outputs.some(pattern => matchesGlobPath(candidate, pattern)) ||
    generator.id === "flutter.l10n" && matchesGlobPath(candidate, "lib/l10n/*.arb");
}

function readIndexedGraph({repoRoot, runCommand}) {
  const candidate = "tool/harness/component_graph.json";
  const result = runCommand({command: "git", args: ["show", `:${candidate}`],
    cwd: repoRoot, encoding: "buffer"});
  const indexed = Buffer.from(result.stdout ?? "");
  if (result.error || result.status !== 0) {
    throw new PreCommitGeneratedArtifactError("Refusing to plan without the generator catalog in the Git index.");
  }
  return indexed;
}

function assertRegularPaths(repoRoot, candidates, terminalType = "file") {
  for (const candidate of candidates) {
    const parts = candidate.split("/");
    for (let count = 1; count <= parts.length; count += 1) {
      const relative = parts.slice(0, count).join("/");
      let stat;
      try { stat = fs.lstatSync(path.join(repoRoot, relative)); } catch (error) {
        if (error.code === "ENOENT") break;
        throw error;
      }
      const expectsDirectory = count < parts.length || terminalType === "directory";
      if (expectsDirectory ? !stat.isDirectory() : !stat.isFile()) {
        throw new PreCommitGeneratedArtifactError(`Refusing to use a non-regular generator or formatter path: ${JSON.stringify(relative)}`);
      }
    }
  }
}

function assertIndexIntegrity({
  plan,
  repoRoot,
  runCommand,
  unstagedPaths,
}) {
  const stagedDart = new Set(plan.dartPaths);
  if (stagedDart.size === 0 && plan.triggeredGenerators.length === 0) return;
  const unstaged = unstagedPaths ?? readGitPaths({
    args: ["diff", "--name-only", "--no-renames", "-z", "--"],
    repoRoot,
    runCommand,
  });
  const partial = unstaged.filter((candidate) => stagedDart.has(candidate)).sort();
  if (partial.length > 0) {
    throw new PreCommitGeneratedArtifactError(
      "Refusing to format partially staged Dart files because re-staging would " +
      `include unstaged work:\n${partial.map((candidate) => `  ${candidate}`).join("\n")}`,
    );
  }

  const matchesSelected = candidate => stagedDart.has(candidate) ||
    candidate === "tool/harness/component_graph.json" ||
    plan.triggeredGenerators.some(generator => matchesGeneratorPath(candidate, generator)) ||
    plan.l10nInputChanged && matchesGlobPath(candidate, "lib/l10n/generated/**");
  const patterns = [...stagedDart, "tool/harness/component_graph.json",
    ...plan.triggeredGenerators.flatMap(generator => [...generator.inputs, ...generator.outputs]),
    ...(plan.triggeredGeneratorIds.includes("flutter.l10n") ?
      ["lib/l10n/*.arb", ...(plan.l10nInputChanged ? ["lib/l10n/generated/**"] : [])] : [])];
  // Bound discovery to declared families. Do not exclude ignored files: a
  // generator can consume or overwrite them just like ordinary untracked files.
  const wildcardRoots = patterns.filter(pattern => /[*?]/u.test(pattern)).map(pattern => {
    const wildcard = pattern.search(/[*?]/u);
    const slash = pattern.lastIndexOf("/", wildcard);
    return slash < 0 ? "." : pattern.slice(0, slash);
  });
  const exactPaths = patterns.filter(pattern => !/[*?]/u.test(pattern));
  const roots = [...new Set([...exactPaths, ...wildcardRoots])];
  assertRegularPaths(repoRoot, exactPaths);
  assertRegularPaths(repoRoot, wildcardRoots, "directory");
  const untracked = readGitPaths({repoRoot, runCommand,
    args: ["ls-files", "--others", "-z", "--", ...roots.map(root => `:(literal)${root}`)]});
  const tracked = readGitPaths({repoRoot, runCommand,
    args: ["ls-files", "-v", "-z", "--", ...roots.map(root => `:(literal)${root}`)]});
  assertRegularPaths(repoRoot, tracked.map(entry => entry.slice(2)).filter(matchesSelected));
  const hidden = tracked.filter(entry => /^[a-zS] /u.test(entry)).map(entry => entry.slice(2));
  const deleted = plan.l10nInputChanged ? readGitPaths({repoRoot, runCommand,
    args: ["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=D", "-z", "--"]}) : [];
  const conflicts = [...new Set([
    ...unstaged.filter(matchesSelected),
    ...untracked.filter(matchesSelected),
    ...hidden.filter(matchesSelected),
    ...deleted.filter(candidate => plan.l10nOutputs.includes(candidate)),
  ])].sort();
  if (conflicts.length > 0) {
    throw new PreCommitGeneratedArtifactError(
      "Refusing to generate, format, or check against files that differ from the Git index " +
      "or hide their index state. Stage or preserve the selected inputs/outputs explicitly " +
      "before retrying (including staged output deletions):\n" +
      conflicts.map(candidate => `  ${JSON.stringify(candidate)}`).join("\n"),
    );
  }
}

function readGitPaths({args, repoRoot, runCommand}) {
  const result = runCommand({args, command: "git", cwd: repoRoot, encoding: "buffer"});
  if (result.error || result.status !== 0) {
    throw new PreCommitGeneratedArtifactError(
      result.error?.message || result.stderr?.toString().trim() || `git ${args.join(" ")} failed.`,
    );
  }
  const output = Buffer.isBuffer(result.stdout)
    ? result.stdout
    : Buffer.from(result.stdout ?? "");
  if (output.length === 0) return [];
  if (output.at(-1) !== 0) {
    throw new PreCommitGeneratedArtifactError("Git staged-path output was not NUL terminated.");
  }
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function runShellCommand({command, failureMessage, repoRoot, runCommand}) {
  runRequiredCommand({
    args: ["-c", command],
    command: "/bin/sh",
    failureMessage,
    repoRoot,
    runCommand,
  });
}

function runRequiredCommand({args, command, failureMessage, repoRoot, runCommand}) {
  const result = runCommand({args, command, cwd: repoRoot});
  if (result.status !== 0) throw new PreCommitGeneratedArtifactError(failureMessage);
}

function defaultRunCommand({args, command, cwd, encoding}) {
  return spawnSync(command, args, {
    cwd,
    encoding: encoding === "buffer" ? undefined : "utf8",
    shell: false,
    stdio: encoding === "buffer" ? "pipe" : "inherit",
    maxBuffer: 16 * 1024 * 1024,
    env: {...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1"},
  });
}

function defaultFileExists(candidate) {
  try {
    return fs.lstatSync(candidate).isFile();
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

function pathIsWithin(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function main() {
  try {
    const result = runPreCommitGeneratedArtifacts();
    if (result.generated.length > 0) {
      console.log(`Generated and staged: ${result.generated.join(", ")}`);
    }
    if (result.formattedDartPaths.length > 0) {
      console.log(`Formatted and re-staged ${result.formattedDartPaths.length} Dart file(s).`);
    }
    if (result.checked.length > 0) {
      console.log(`Generated artifact checks passed: ${result.checked.join(", ")}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
