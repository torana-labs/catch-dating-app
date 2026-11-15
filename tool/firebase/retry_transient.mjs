#!/usr/bin/env node
// Runs one Firebase CLI command (indexes or rules deploy) and retries it only
// when it failed on a temporary Google API error: HTTP 429, 500, 502, 503 or
// 504, or a dropped connection. On 14 Nov 2026 prod run 43617790051 lost its
// deploy record to one HTTP 503 from firebaserules.googleapis.com `:test`, the
// rules compile check the CLI runs before releasing.
//
// A retry is safe because these deploys are idempotent: the CLI compiles the
// rules, creates a ruleset and releases it, and index deploys converge on
// firestore.indexes.json. A failure part-way (say the ruleset was created but
// the release returned 503) leaves nothing a re-run would apply differently:
// the re-run creates an identical ruleset and releases it. So no partially
// applied state makes a retry unsafe here, and none is checked for.
//
// Never retried: any other 4xx (validation, permission, conflict), rules
// compilation errors, the CLI refusing to delete Functions non-interactively,
// and readiness failures. A failure that shows both a temporary error and one
// of these is not retried either. Functions deploys keep their own retries.
//
// It also wraps the GitHub API calls that write the deploy records. Retrying a
// deployment POST whose response was lost can leave a duplicate record of the
// same commit, which every reader treats the same as one.
//
// Usage: retry_transient.mjs [--label <name>] [--attempts 3] -- <command> [args...]
// Delays between attempts come from CATCH_TRANSIENT_RETRY_DELAYS (seconds,
// comma-separated, default "30,60") and run through `sleep`.
import {spawn, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const PERMANENT = [
  // The Firebase CLI writes "HTTP Error: 400"; gh writes "HTTP 422".
  [/HTTP (?:Error: )?4(?!29)\d\d\b/u, "a 4xx error other than 429"],
  // Every rules deploy prints "checking firestore.rules for compilation
  // errors..."; only the error report itself counts.
  [/Compilation errors in |\[E\] \d+:\d+ /u, "a rules compilation error"],
  [/cannot proceed in non-interactive mode/iu, "a refused Function deletion"],
  [/\bnot-ready\b/u, "a readiness failure"],
];
const TEMPORARY = [
  [/HTTP (?:Error: )?(429|500|502|503|504)\b/u, (match) => `HTTP ${match[1]}`],
  [/\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN)\b|socket hang up/u, (match) => match[1] ?? "socket hang up"],
];

/**
 * Whether a failed command's output shows only a temporary error. Pure, so
 * every case is testable against real CLI output.
 *
 * @param {string} output The command's combined stdout and stderr.
 * @returns {{retry: boolean, reason: string}}
 */
export function classifyFailure(output) {
  const text = String(output ?? "").replace(/\x1b\[[0-9;]*m/gu, "");
  for (const [pattern, reason] of PERMANENT) {
    if (pattern.test(text)) return {retry: false, reason};
  }
  for (const [pattern, describe] of TEMPORARY) {
    const match = pattern.exec(text);
    if (match) return {retry: true, reason: describe(match)};
  }
  return {retry: false, reason: "no temporary error in the output"};
}

/** Attempt delays in seconds: one per retry, the last repeating. */
export function retryDelays(value = process.env.CATCH_TRANSIENT_RETRY_DELAYS) {
  const delays = String(value ?? "30,60").split(",").map((entry) => entry.trim()).filter(Boolean).map(Number);
  if (delays.length === 0 || delays.some((delay) => !Number.isFinite(delay) || delay < 0)) {
    throw new Error(`Invalid CATCH_TRANSIENT_RETRY_DELAYS: ${value}`);
  }
  return delays;
}

function runOnce(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {stdio: ["inherit", "pipe", "pipe"]});
    let output = "";
    const keep = (chunk, stream) => {
      stream.write(chunk);
      output = (output + chunk.toString("utf8")).slice(-1024 * 1024);
    };
    child.stdout.on("data", (chunk) => keep(chunk, process.stdout));
    child.stderr.on("data", (chunk) => keep(chunk, process.stderr));
    child.on("error", (error) => resolve({status: 127, output: String(error)}));
    child.on("close", (code, signal) => resolve({status: code ?? (signal ? 1 : 0), output}));
  });
}

async function main(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || separator === argv.length - 1) {
    console.error("Usage: retry_transient.mjs [--label <name>] [--attempts 3] -- <command> [args...]");
    return 64;
  }
  const options = argv.slice(0, separator);
  const [command, ...args] = argv.slice(separator + 1);
  const option = (name, fallback) => {
    const index = options.indexOf(name);
    return index >= 0 ? options[index + 1] : fallback;
  };
  const label = option("--label", command);
  const attempts = Number(option("--attempts", "3"));
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
    console.error("--attempts must be an integer from 1 to 5.");
    return 64;
  }
  const delays = retryDelays();
  for (let attempt = 1; ; attempt++) {
    const {status, output} = await runOnce(command, args);
    if (status === 0) return 0;
    const {retry, reason} = classifyFailure(output);
    if (!retry || attempt >= attempts) {
      if (retry) console.error(`::error::${label} still failed with ${reason} after ${attempts} attempts.`);
      return status;
    }
    const delay = delays[Math.min(attempt - 1, delays.length - 1)];
    // stderr, so a caller capturing the command's output gets only that.
    console.error(`::warning::${label} attempt ${attempt} of ${attempts} failed with ${reason}, a temporary error; retrying in ${delay}s.`);
    spawnSync("sleep", [String(delay)], {stdio: "inherit"});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
