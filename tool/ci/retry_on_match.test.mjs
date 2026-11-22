import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {DEFAULT_BACKOFF_SECONDS, parseArgs, retryOnMatch} from "./retry_on_match.mjs";

const script = fileURLToPath(new URL("./retry_on_match.mjs", import.meta.url));
const maven429 = "Could not GET 'https://repo.maven.apache.org/maven2/org/example/lib.pom'. " +
  "Received status code 429 from server: Too Many Requests";

function harness(results) {
  const runs = [];
  const waits = [];
  const logs = [];
  return {
    runs, waits, logs,
    deps: {
      run: async command => { runs.push(command); return results.shift(); },
      sleep: async seconds => { waits.push(seconds); },
      log: message => logs.push(message),
    },
  };
}
const options = extra => parseArgs(["--match", "Received status code 429 from server", ...extra, "--", "build", "apk"]);

test("a command that passes runs once", async () => {
  const h = harness([{code: 0, tail: ""}]);
  assert.equal(await retryOnMatch(options([]), h.deps), 0);
  assert.deepEqual(h.runs, [["build", "apk"]]);
  assert.deepEqual(h.waits, []);
});

test("a failure with the named text is retried with backoff, then passes", async () => {
  const h = harness([{code: 1, tail: maven429}, {code: 1, tail: maven429}, {code: 0, tail: ""}]);
  assert.equal(await retryOnMatch(options([]), h.deps), 0);
  assert.equal(h.runs.length, 3);
  assert.deepEqual(h.waits, [...DEFAULT_BACKOFF_SECONDS]);
  assert.match(h.logs[0], /^::warning::retry_on_match: failed with "Received status code 429 from server" \(exit 1\)\. Retrying in 30 s \(attempt 2 of 3\)\.$/u);
});

test("the named failure on every attempt keeps the command's exit code", async () => {
  const h = harness([{code: 1, tail: maven429}, {code: 1, tail: maven429}, {code: 7, tail: maven429}]);
  assert.equal(await retryOnMatch(options([]), h.deps), 7);
  assert.equal(h.runs.length, 3);
  assert.match(h.logs.at(-1), /still failing .* after 3 attempts/u);
});

test("any other failure is not retried", async () => {
  const h = harness([{code: 1, tail: "error: Compilation failed; see the compiler error output for details."}, {code: 0, tail: ""}]);
  assert.equal(await retryOnMatch(options([]), h.deps), 1);
  assert.equal(h.runs.length, 1);
  assert.deepEqual(h.waits, []);
});

test("arguments are checked: a match is required and limits hold", () => {
  assert.throws(() => parseArgs(["--", "build"]), /--match is required/u);
  assert.throws(() => parseArgs(["--match", " ", "--", "build"]), /non-empty/u);
  assert.throws(() => parseArgs(["--match", "x"]), /Usage/u);
  assert.throws(() => parseArgs(["--match", "x", "--attempts", "9", "--", "build"]), /1 to 5/u);
  assert.throws(() => parseArgs(["--match", "x", "--attempts", "4", "--", "build"]), /3 waits/u);
  assert.throws(() => parseArgs(["--matches", "x", "--", "build"]), /Unknown option/u);
  assert.deepEqual(parseArgs(["--match", "a", "--match", "b", "--attempts", "2", "--backoff", "5", "--", "x", "--help"]),
    {matches: ["a", "b"], attempts: 2, backoff: [5], command: ["x", "--help"]});
});

test("end to end: output streams through and a named failure reruns the real command", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "retry-on-match-"));
  const counter = path.join(dir, "count");
  // Fails with the 429 text on the first run, passes on the second.
  const child = `const fs=require("fs");const n=fs.existsSync(${JSON.stringify(counter)})?1:0;` +
    `fs.writeFileSync(${JSON.stringify(counter)},"1");console.log("run "+n);` +
    `if(n===0){console.error(${JSON.stringify(maven429)});process.exit(1);}`;
  const result = spawnSync(process.execPath, [script, "--match", "Received status code 429 from server",
    "--backoff", "0,0", "--", process.execPath, "-e", child], {encoding: "utf8"});
  fs.rmSync(dir, {recursive: true, force: true});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /run 0\nrun 1\n/u);
  assert.match(result.stderr, /Too Many Requests[\s\S]*Retrying in 0 s/u);
});
