#!/usr/bin/env node
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fromRepo} from "../lib/repo_paths.mjs";

const args = process.argv.slice(2);
const index = args.indexOf("--surface");
const surface = index < 0 ? "all" : args[index + 1];
if (!args.every((arg, i) => arg === "--check" || arg === "--surface" || (index >= 0 && i === index + 1)) ||
    !["all", "website", "admin"].includes(surface)) {
  throw new Error("Usage: check_react_ui.mjs [--check] [--surface all|website|admin]");
}
for (const selected of surface === "all" ? ["website", "admin"] : [surface]) {
  for (const command of [
    [fromRepo("node_modules/eslint/bin/eslint.js"), "src/**/*.{js,jsx,ts,tsx}"],
    [fromRepo("packages/web-config/lint/check-eslint-suppressions.mjs")],
  ]) {
    const result = spawnSync(process.execPath, command, {cwd: fromRepo(selected), stdio: "inherit"});
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  console.log(`React UI lint passed: ${path.basename(selected)}`);
}
