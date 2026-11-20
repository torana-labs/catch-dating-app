#!/usr/bin/env node
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [action, environment, ...extra] = process.argv.slice(2).filter((arg) => arg !== "--print");
const printOnly = process.argv.includes("--print");

if (!new Set(["deploy", "logs"]).has(action) || !new Set(["dev", "prod"]).has(environment)) {
  console.error("Usage: node tool/firebase_functions.mjs <deploy|logs> <dev|prod> [firebase args...] [--print]");
  process.exit(64);
}

const firebaseArgs = action === "deploy"
  ? ["deploy", "--only", "functions", ...extra]
  : ["functions:log", ...extra];
const command = ["./tool/firebase_with_env.sh", environment, ...firebaseArgs];
if (printOnly) {
  console.log(command.join(" "));
  process.exit(0);
}
const result = spawnSync(command[0], command.slice(1), {cwd: repoRoot, stdio: "inherit"});
process.exit(result.status ?? 1);
