#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {ESLint} from "eslint";

export function violationCounts(results, cwd) {
  const counts = {};
  for (const result of results) {
    for (const message of result.messages) {
      if (!message.ruleId || message.fatal) throw new Error(`${result.filePath}: ${message.message}`);
      const file = path.relative(cwd, result.filePath).split(path.sep).join("/");
      const rules = counts[file] ??= {};
      (rules[message.ruleId] ??= {count: 0}).count += 1;
    }
  }
  return counts;
}

export function compareSuppressions(recorded, actual, accepted = null) {
  const problems = [];
  for (const file of new Set([...Object.keys(recorded), ...Object.keys(actual)])) {
    for (const rule of new Set([...Object.keys(recorded[file] ?? {}), ...Object.keys(actual[file] ?? {})])) {
      const count = recorded[file]?.[rule]?.count ?? 0;
      const remaining = actual[file]?.[rule]?.count ?? 0;
      if (!Number.isSafeInteger(count) || count < 0) problems.push(`${file}: invalid ${rule} count`);
      if (remaining !== count) problems.push(`${file}: ${rule} records ${count}, ${remaining} remain`);
      if (accepted && count > (accepted[file]?.[rule]?.count ?? 0)) {
        problems.push(`${file}: ${rule} suppression grew above accepted ${accepted[file]?.[rule]?.count ?? 0}`);
      }
    }
  }
  return problems;
}

export async function checkSuppressions(cwd = process.cwd(), base = "origin/main") {
  cwd = fs.realpathSync(cwd);
  const recorded = JSON.parse(fs.readFileSync(path.join(cwd, "eslint-suppressions.json"), "utf8"));
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {cwd, encoding: "utf8"}).trim();
  execFileSync("git", ["rev-parse", "--verify", `${base}^{commit}`], {cwd, stdio: "ignore"});
  const relative = path.relative(root, path.join(cwd, "eslint-suppressions.json")).split(path.sep).join("/");
  const exists = execFileSync("git", ["ls-tree", "--name-only", base, "--", relative], {cwd: root, encoding: "utf8"}).trim();
  const accepted = exists ? JSON.parse(execFileSync("git", ["show", `${base}:${relative}`], {cwd: root, encoding: "utf8"})) : null;
  const actual = violationCounts(await new ESLint({cwd}).lintFiles(["src/**/*.{js,jsx,ts,tsx}"]), cwd);
  return compareSuppressions(recorded, actual, accepted);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = await checkSuppressions();
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error("Fix new debt; prune resolved counts with eslint --prune-suppressions. Suppressions may only shrink.");
    process.exitCode = 1;
  } else console.log("ESLint suppressions match source and do not exceed accepted counts.");
}
