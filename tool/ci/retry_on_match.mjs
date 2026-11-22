#!/usr/bin/env node
// Runs a CI command and runs it again only when it failed with error text the
// caller names. The output streams through unchanged. Each call site names the
// exact text of a failure it has seen (for example Maven Central's
// "Received status code 429 from server"), so a real build or test failure
// is never retried. Usage:
//   node tool/ci/retry_on_match.mjs --match <text> [--match <text>...]
//     [--attempts 3] [--backoff 30,90] -- <command> [args...]
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

export const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_SECONDS = Object.freeze([30, 90]);
// The tail of the output kept for matching; Gradle prints the cause last.
const TAIL_BYTES = 1024 * 1024;

const usage = "Usage: node tool/ci/retry_on_match.mjs --match <text> [--match <text>...] " +
  "[--attempts <n>] [--backoff <seconds,...>] -- <command> [args...]";

export function parseArgs(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || separator === argv.length - 1) throw new Error(usage);
  const options = argv.slice(0, separator);
  const command = argv.slice(separator + 1);
  const matches = [];
  let attempts = DEFAULT_ATTEMPTS;
  let backoff = [...DEFAULT_BACKOFF_SECONDS];
  for (let index = 0; index < options.length; index += 2) {
    const [flag, value] = [options[index], options[index + 1]];
    if (value === undefined) throw new Error(`${flag} needs a value. ${usage}`);
    if (flag === "--match") matches.push(value);
    else if (flag === "--attempts") attempts = Number(value);
    else if (flag === "--backoff") backoff = value.split(",").map(Number);
    else throw new Error(`Unknown option ${flag}. ${usage}`);
  }
  if (!matches.length || matches.some(text => !text.trim())) throw new Error(`At least one non-empty --match is required. ${usage}`);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) throw new Error("--attempts must be 1 to 5.");
  if (backoff.length < attempts - 1 || backoff.some(seconds => !Number.isFinite(seconds) || seconds < 0 || seconds > 600)) {
    throw new Error(`--backoff needs ${attempts - 1} waits of 0 to 600 seconds.`);
  }
  return {matches, attempts, backoff, command};
}

/** Runs the command once, streaming its output; resolves {code, tail}. */
export function runOnce(command, {stdout = process.stdout, stderr = process.stderr} = {}) {
  return new Promise(resolve => {
    let tail = "";
    const keep = chunk => {
      tail = (tail + chunk.toString()).slice(-TAIL_BYTES);
    };
    const child = spawn(command[0], command.slice(1), {stdio: ["inherit", "pipe", "pipe"]});
    child.stdout.on("data", chunk => { stdout.write(chunk); keep(chunk); });
    child.stderr.on("data", chunk => { stderr.write(chunk); keep(chunk); });
    child.on("error", error => resolve({code: 127, tail: `${tail}\n${error.message}`}));
    child.on("close", (code, signal) => resolve({code: code ?? (signal ? 128 : 1), tail}));
  });
}

export async function retryOnMatch({matches, attempts, backoff, command}, {
  run = runOnce, sleep = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
  log = message => console.error(message)} = {}) {
  for (let attempt = 1; ; attempt += 1) {
    const {code, tail} = await run(command);
    if (code === 0) return 0;
    const matched = matches.find(text => tail.includes(text));
    if (!matched) return code;
    if (attempt === attempts) {
      log(`::error::retry_on_match: still failing with "${matched}" after ${attempts} attempts.`);
      return code;
    }
    const wait = backoff[attempt - 1];
    log(`::warning::retry_on_match: failed with "${matched}" (exit ${code}). Retrying in ${wait} s (attempt ${attempt + 1} of ${attempts}).`);
    await sleep(wait);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--help") {
    console.log(usage);
  } else {
    let options;
    try {
      options = parseArgs(process.argv.slice(2));
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
    process.exitCode = await retryOnMatch(options);
  }
}
