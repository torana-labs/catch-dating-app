#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";

const scriptPath = fileURLToPath(import.meta.url);

export function buildWorkspaceAnalysisPlan(snapshot = createRepositorySnapshot()) {
  const pubspecPaths = snapshot.listFiles()
    .filter((relativePath) => relativePath === "pubspec.yaml" || relativePath.endsWith("/pubspec.yaml"))
    .sort((left, right) => {
      if (left === "pubspec.yaml") return -1;
      if (right === "pubspec.yaml") return 1;
      return left.localeCompare(right);
    });
  if (!pubspecPaths.includes("pubspec.yaml")) {
    throw new Error("The repository-root pubspec.yaml is required.");
  }
  const packages = pubspecPaths.map((pubspecPath) => {
    const directory = path.posix.dirname(pubspecPath);
    const source = snapshot.readText(pubspecPath, {required: true});
    return {
      directory: directory === "." ? "" : directory,
      pubspecPath,
      workspaceMember: /^resolution:\s*workspace\s*$/mu.test(source),
    };
  });
  return {
    packages,
    steps: [
      ...packages
        .filter((entry) => entry.directory === "" || !entry.workspaceMember)
        .map((entry) => ({phase: "resolve", directory: entry.directory, command: "flutter", args: ["pub", "get"]})),
      ...packages.map((entry) => entry.directory === ""
        ? {
            phase: "analyze",
            directory: "",
            command: "dart",
            args: ["analyze", "--format", "machine", "--fatal-infos"],
          }
        // The root excludes nested packages. Flutter's directory-wide analyzer
        // can report success without visiting design packages; an explicit Dart
        // source target is required (verified with a seeded unresolved symbol).
        : ["packages/catch_tokens", "packages/catch_ui", "packages/kernel"].includes(entry.directory)
          ? {phase: "analyze", directory: entry.directory, command: "dart", args: ["analyze", "lib", ...(snapshot.listFiles().some((file) => file.startsWith(`${entry.directory}/test/`)) ? ["test"] : []), "--fatal-infos"]}
          : {phase: "analyze", directory: entry.directory, command: "flutter", args: ["analyze", "--fatal-infos", "--no-pub"]}),
    ],
  };
}

export function runWorkspaceAnalysis({
  snapshot = createRepositorySnapshot(),
  runner = spawnSync,
  rootDiagnosticsDir,
} = {}) {
  const plan = buildWorkspaceAnalysisPlan(snapshot);
  const startedAt = performance.now();
  for (const step of plan.steps) {
    const label = step.directory || ".";
    console.log(`==> ${step.phase} ${label}: ${step.command} ${step.args.join(" ")}`);
    const capture = rootDiagnosticsDir && step.phase === "analyze" && step.directory === "";
    const result = runner(step.command, step.args, {
      cwd: path.join(snapshot.root, step.directory),
      env: process.env,
      encoding: "utf8",
      stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (capture) {
      const output = (result.stdout ?? "") + (result.stderr ?? "");
      fs.mkdirSync(rootDiagnosticsDir, {recursive: true});
      fs.writeFileSync(path.join(rootDiagnosticsDir, "analyze.machine"), output);
      const pluginFailed = output.includes("An error occurred while executing an analyzer plugin");
      fs.writeFileSync(path.join(rootDiagnosticsDir, "analyze.status"), String(pluginFailed ? 1 : result.status ?? 1) + "\n");
      if (output) process.stdout.write(output);
      if (pluginFailed) {
        throw new Error("Root analyzer plugin failed; diagnostics cannot be reused.");
      }
    }
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`${step.phase} failed for ${label} with status ${result.status}.`);
    }
  }
  const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log(`Flutter workspace analysis passed: ${plan.packages.length} packages in ${seconds}s.`);
  return plan;
}

if (process.argv[1] === scriptPath) {
  const args = process.argv.slice(2);
  let rootDiagnosticsDir;
  const unknown = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--list") continue;
    if (args[i] === "--root-diagnostics-dir" && args[i + 1] && !args[i + 1].startsWith("--")) {
      rootDiagnosticsDir = path.resolve(args[++i]);
    } else unknown.push(args[i]);
  }
  if (unknown.length > 0) {
    console.error(`Unknown or incomplete argument(s): ${unknown.join(", ")}`);
    process.exit(64);
  }
  try {
    const snapshot = createRepositorySnapshot();
    const plan = buildWorkspaceAnalysisPlan(snapshot);
    if (process.argv.includes("--list")) {
      for (const entry of plan.packages) console.log(entry.directory || ".");
    } else {
      runWorkspaceAnalysis({snapshot, rootDiagnosticsDir});
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
