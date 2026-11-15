import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {classifyFailure, retryDelays} from "./retry_transient.mjs";

const helper = fileURLToPath(new URL("./retry_transient.mjs", import.meta.url));

// The rules step of prod run 43617790051, 14 Nov 2026.
const rules503 = [
  "i  cloud.firestore: checking firestore.rules for compilation errors...",
  "",
  "\x1b[1m\x1b[31mError:\x1b[39m\x1b[22m Request to https://firebaserules.googleapis.com/v1/projects/catch-dating-app-64e51:test " +
    "had HTTP Error: 503, The service is currently unavailable.",
].join("\n");

test("temporary Google API errors and dropped connections are retried", () => {
  assert.deepEqual(classifyFailure(rules503), {retry: true, reason: "HTTP 503"});
  for (const [output, reason] of [
    ["Error: HTTP Error: 429, Quota exceeded for quota metric 'Per project mutation requests'", "HTTP 429"],
    ["Error: Request to https://firestore.googleapis.com/v1/x had HTTP Error: 500, Internal error", "HTTP 500"],
    ["had HTTP Error: 502, Bad Gateway", "HTTP 502"],
    ["had HTTP Error: 504, Deadline exceeded", "HTTP 504"],
    ["Error: Failed to make request: read ECONNRESET", "ECONNRESET"],
    ["Error: socket hang up", "socket hang up"],
  ]) assert.deepEqual(classifyFailure(output), {retry: true, reason}, output);
});

test("validation, compilation, deletion and readiness failures are never retried", () => {
  for (const [output, reason] of [
    ["Error: Request to https://firestore.googleapis.com/v1/x had HTTP Error: 400, Invalid index", "a 4xx error other than 429"],
    ["had HTTP Error: 403, The caller does not have permission", "a 4xx error other than 429"],
    ["had HTTP Error: 409, index already exists", "a 4xx error other than 429"],
    ["i  cloud.firestore: checking firestore.rules for compilation errors...\n" +
      "✘ [E] 12:3 - Unexpected 'allow'.\nError: Compilation errors in firestore.rules.", "a rules compilation error"],
    ["Aborting because deletion cannot proceed in non-interactive mode.", "a refused Function deletion"],
    ['{"status": "not-ready"}', "a readiness failure"],
  ]) assert.deepEqual(classifyFailure(output), {retry: false, reason}, output);
  // A permanent error wins over a temporary one in the same output.
  assert.equal(classifyFailure(`${rules503}\nhad HTTP Error: 400, Invalid argument`).retry, false);
  assert.deepEqual(classifyFailure("Error: something else broke"), {retry: false, reason: "no temporary error in the output"});
});

test("delays default to 30s then 60s and reject nonsense", () => {
  assert.deepEqual(retryDelays(undefined), [30, 60]);
  assert.deepEqual(retryDelays("0, 5"), [0, 5]);
  for (const bad of ["", "x", "-1"]) assert.throws(() => retryDelays(bad), /CATCH_TRANSIENT_RETRY_DELAYS/u);
});

function fixture(t, script) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-retry-transient-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.mkdirSync(path.join(directory, "bin"));
  // Each call appends a line, so a script can fail a set number of times.
  fs.writeFileSync(path.join(directory, "bin/command"), `#!/bin/sh\necho call >> "${directory}/calls"\n${script}\n`, {mode: 0o755});
  fs.writeFileSync(path.join(directory, "bin/sleep"), `#!/bin/sh\necho "sleep $1" >> "${directory}/calls"\n`, {mode: 0o755});
  return (args = []) => {
    const result = spawnSync(process.execPath, [helper, "--label", "Firestore rules", ...args, "--", "command"], {
      encoding: "utf8",
      env: {...process.env, PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`},
    });
    const calls = fs.existsSync(path.join(directory, "calls")) ?
      fs.readFileSync(path.join(directory, "calls"), "utf8").trim().split("\n") : [];
    return {...result, calls};
  };
}

test("a temporary failure is retried with backoff, logging each retry", (t) => {
  const run = fixture(t, `[ "$(grep -c '^call$' "$(dirname "$0")/../calls")" -ge 3 ] && exit 0\n` +
    `echo "had HTTP Error: 503, The service is currently unavailable." >&2; exit 2`);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, ["call", "sleep 30", "call", "sleep 60", "call"]);
  assert.match(result.stdout, /::warning::Firestore rules attempt 1 of 3 failed with HTTP 503, a temporary error; retrying in 30s\./u);
  assert.match(result.stdout, /attempt 2 of 3 failed with HTTP 503/u);
});

test("retries stop at the cap and keep the command's exit status", (t) => {
  const run = fixture(t, 'echo "had HTTP Error: 503, unavailable" >&2; exit 2');
  const result = run();
  assert.equal(result.status, 2);
  assert.deepEqual(result.calls.filter((call) => call === "call").length, 3);
  assert.match(result.stderr, /::error::Firestore rules still failed with HTTP 503 after 3 attempts\./u);
});

test("a permanent failure runs once and exits with its status", (t) => {
  const run = fixture(t, 'echo "Error: Compilation errors in firestore.rules." >&2; exit 1');
  const result = run();
  assert.equal(result.status, 1);
  assert.deepEqual(result.calls, ["call"]);
  assert.doesNotMatch(result.stdout, /::warning::/u);
  const success = fixture(t, "echo deployed")();
  assert.equal(success.status, 0);
  assert.deepEqual(success.calls, ["call"]);
  assert.match(success.stdout, /deployed/u);
  assert.equal(fixture(t, "exit 0")(["--attempts", "9"]).status, 64);
});
