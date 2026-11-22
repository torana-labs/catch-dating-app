import assert from "node:assert/strict";
import test from "node:test";
import {GH_API_ATTEMPTS, GH_API_BACKOFF_MS, GH_API_TIMEOUT_MS, githubRequest} from "./capture_seeds.mjs";

const ok = body => ({status: 0, stdout: JSON.stringify(body), stderr: ""});
const failed = (stderr, status = 1) => ({status, stdout: "", stderr});
const timedOut = () => ({status: null, signal: "SIGTERM", stdout: "", stderr: "",
  error: Object.assign(new Error("spawnSync gh ETIMEDOUT"), {code: "ETIMEDOUT"})});

// Plays back one result per gh call and records each call and wait.
function harness(results) {
  const calls = [];
  const waits = [];
  const logs = [];
  return {
    calls, waits, logs,
    options: {
      spawn: (command, args, options) => {
        calls.push({command, args, timeout: options.timeout});
        return results.shift();
      },
      sleep: async ms => { waits.push(ms); },
      log: message => logs.push(message),
    },
  };
}

test("a gh api call that succeeds first time is not retried", async () => {
  const h = harness([ok({id: 7})]);
  assert.deepEqual(await githubRequest("repos/example-org/example-repo", h.options), {id: 7});
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].args, ["api", "-H", "Cache-Control: no-cache", "repos/example-org/example-repo"]);
  assert.equal(h.calls[0].timeout, GH_API_TIMEOUT_MS);
  assert.deepEqual(h.waits, []);
});

test("a timeout is named as a timeout and retried with backoff", async () => {
  const h = harness([timedOut(), failed("HTTP 502: Bad Gateway (https://api.github.com/...)"), ok({id: 7})]);
  assert.deepEqual(await githubRequest("repos/example-org/example-repo", h.options), {id: 7});
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.waits, [...GH_API_BACKOFF_MS]);
  assert.match(h.logs[0], /^gh api repos\/example-org\/example-repo timed out after 120 s\. Retrying in 5 s \(attempt 2 of 3\)\.$/u);
  assert.match(h.logs[1], /HTTP 502.*Retrying in 20 s \(attempt 3 of 3\)/u);
});

test("rate limits and network errors are retried", async () => {
  for (const stderr of ["HTTP 429: Too Many Requests", "API rate limit exceeded for installation",
    "dial tcp: lookup api.github.com: no such host", "read: connection reset by peer"]) {
    const h = harness([failed(stderr), ok({})]);
    await githubRequest("repos/example-org/example-repo", h.options);
    assert.equal(h.calls.length, 2, stderr);
  }
});

test("a timeout on every attempt fails with the timeout, not a missing exit status", async () => {
  const h = harness(Array.from({length: GH_API_ATTEMPTS}, timedOut));
  await assert.rejects(githubRequest("repos/example-org/example-repo/actions/artifacts/9/zip", {...h.options, binary: true}),
    error => {
      assert.match(error.message, /^gh api repos\/example-org\/example-repo\/actions\/artifacts\/9\/zip timed out after 120 s\. Gave up after 3 attempts\. Cannot read capture bundles\.$/u);
      assert.doesNotMatch(error.message, /null/u);
      return true;
    });
  assert.equal(h.calls.length, GH_API_ATTEMPTS);
});

test("a permanent failure fails at once", async () => {
  for (const result of [failed("HTTP 404: Not Found"), failed("HTTP 403: Resource not accessible by integration"),
    {status: null, stdout: "", stderr: "", error: Object.assign(new Error("spawnSync gh ENOENT"), {code: "ENOENT"})}]) {
    const h = harness([result, ok({})]);
    await assert.rejects(githubRequest("repos/example-org/example-repo", h.options), /Cannot read capture bundles\./u);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.waits, []);
  }
});
