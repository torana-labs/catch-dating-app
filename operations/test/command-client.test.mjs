import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CallableTransport,
  callableBaseUrl,
  executeWithReceipts,
  failureEnvelope,
  isIndeterminateTransportError,
  LocalReceiptStore,
  parseCommandLine,
  successEnvelope,
} from "../../packages/command-client/src/index.mjs";
import {hashValue} from "../src/platform/canonical-json.mjs";
import {OperationsError} from "../src/platform/errors.mjs";

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {"content-type": "application/json"},
});

test("transport uses the caller's error code prefix and actor header", async () => {
  let captured;
  const client = new CallableTransport({
    baseUrl: "https://example.test/fn/",
    idToken: "id",
    appCheckToken: "ac",
    codePrefix: "COMMAND_CALLABLE",
    actorType: "cli",
    fetchImpl: async (url, options) => {
      captured = {url, options};
      return jsonResponse({error: {status: "FAILED_PRECONDITION", message: "changed"}}, 400);
    },
  });
  await assert.rejects(client.invoke("ensureTryItWorkspace", {mode: "preview"}, {
    executionId: "exec-1",
  }), {code: "COMMAND_CALLABLE_FAILED_PRECONDITION", message: "changed"});
  assert.equal(captured.url, "https://example.test/fn/ensureTryItWorkspace");
  assert.equal(captured.options.headers["x-catch-actor-type"], "cli");
  assert.deepEqual(JSON.parse(captured.options.body), {data: {mode: "preview"}});
});

test("transport reports a timeout as an indeterminate transport error", async () => {
  const client = new CallableTransport({
    baseUrl: "https://example.test",
    idToken: "id",
    appCheckToken: "ac",
    codePrefix: "COMMAND_CALLABLE",
    timeoutMs: 5,
    fetchImpl: (_url, {signal}) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), {name: "AbortError"})));
    }),
  });
  const error = await client.invoke("x", {}).catch((caught) => caught);
  assert.equal(error.code, "COMMAND_CALLABLE_TIMEOUT");
  assert.equal(isIndeterminateTransportError(error, "COMMAND_CALLABLE"), true);
  assert.equal(isIndeterminateTransportError(
    new OperationsError("COMMAND_CALLABLE_PERMISSION_DENIED", "no"),
    "COMMAND_CALLABLE"
  ), false);
});

test("transport and base URL refuse missing configuration with named codes", () => {
  assert.throws(() => new CallableTransport({baseUrl: "https://example.test", appCheckToken: "ac",
    configCodePrefix: "CATCH_CLI"}), {code: "CATCH_CLI_AUTH_REQUIRED"});
  assert.throws(() => new CallableTransport({baseUrl: "https://example.test", idToken: "id",
    configCodePrefix: "CATCH_CLI"}), {code: "CATCH_CLI_APP_CHECK_REQUIRED"});
  assert.throws(() => callableBaseUrl({configCodePrefix: "CATCH_CLI", projectHint: "--project"}),
    {code: "CATCH_CLI_PROJECT_REQUIRED", message: "--project is required."});
});

test("command line parser rejects unknown flags and exclusive pairs", () => {
  const options = {
    subjectCommands: ["run"],
    booleans: ["--apply", "--preview"],
    values: ["--json"],
    exclusive: [["--apply", "--preview"]],
    codePrefix: "CATCH_CLI",
  };
  assert.deepEqual(parseCommandLine(["run", "workspace.ensure", "--json", "{}"], options), {
    command: "run",
    subject: "workspace.ensure",
    flags: {json: "{}"},
  });
  assert.throws(() => parseCommandLine(["run", "x", "--aply"], options),
    {code: "CATCH_CLI_ARGUMENT_INVALID"});
  assert.throws(() => parseCommandLine(["run", "x", "--apply", "--preview"], options),
    {code: "CATCH_CLI_ARGUMENT_INVALID"});
  assert.throws(() => parseCommandLine(["run", "x", "--json"], options),
    {code: "CATCH_CLI_ARGUMENT_INVALID"});
});

test("envelopes share one shape for success and failure", () => {
  assert.deepEqual(successEnvelope({program: "catch", command: "list", data: {n: 1}}), {
    schemaVersion: 1, program: "catch", command: "list", ok: true, data: {n: 1}, warnings: [],
  });
  const failure = failureEnvelope({program: "catch", command: "run",
    error: new OperationsError("X_FAILED", "no", {details: {a: 1}})});
  assert.deepEqual(failure.error, {code: "X_FAILED", message: "no", details: {a: 1}});
  assert.equal(failure.ok, false);
});

test("execution without a remote recorder writes one local receipt", async () => {
  const receipts = [];
  const result = await executeWithReceipts({
    client: {invoke: async () => ({status: "applied", receiptId: "r1"})},
    callable: "ensureTryItWorkspace",
    payload: {mode: "apply"},
    executionId: "exec-2",
    receiptStore: {put: async (receipt) => {
      receipts.push(receipt);
      return "/fixture/exec-2.json";
    }},
    baseReceipt: {executionId: "exec-2"},
    now: () => new Date("2026-11-18T00:00:00.000Z"),
    hash: hashValue,
    isIndeterminate: () => false,
  });
  assert.equal(result.remoteReceiptStatus, "none");
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].status, "succeeded");
  assert.equal(Object.hasOwn(receipts[0], "remoteReceiptStatus"), false);
});

test("execution without a remote recorder keeps an unknown outcome unknown", async () => {
  const receipts = [];
  const error = await executeWithReceipts({
    client: {invoke: async () => {
      throw new OperationsError("COMMAND_CALLABLE_NETWORK_ERROR", "lost");
    }},
    callable: "ensureTryItWorkspace",
    payload: {mode: "apply"},
    executionId: "exec-3",
    receiptStore: {put: async (receipt) => {
      receipts.push(receipt);
      return "/fixture/exec-3.json";
    }},
    baseReceipt: {executionId: "exec-3"},
    hash: hashValue,
    isIndeterminate: (caught) => isIndeterminateTransportError(caught, "COMMAND_CALLABLE"),
  }).catch((caught) => caught);
  assert.equal(error.code, "COMMAND_CALLABLE_NETWORK_ERROR");
  assert.equal(error.details.actionCompleted, null);
  assert.equal(receipts[0].status, "indeterminate");
});

test("local receipt store is idempotent and refuses a different receipt", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "command-receipts-"));
  const store = new LocalReceiptStore(root, {conflictCode: "CATCH_RECEIPT_CONFLICT"});
  const receipt = {executionId: "exec-4", status: "succeeded"};
  const first = await store.put(receipt);
  assert.equal(await store.put({...receipt}), first);
  await assert.rejects(store.put({...receipt, status: "failed"}),
    {code: "CATCH_RECEIPT_CONFLICT"});
});

test("operations and the shared package throw one error class", async () => {
  const platform = await import("../src/platform/errors.mjs");
  const shared = await import("../../packages/command-client/src/errors.mjs");
  assert.equal(platform.OperationsError, shared.OperationsError);
  const error = new shared.OperationsError("X_FAILED", "no");
  assert.ok(error instanceof platform.OperationsError);
  assert.equal(platform.asOperationsError(error), error);
  const platformJson = await import("../src/platform/canonical-json.mjs");
  const sharedJson = await import("../../packages/command-client/src/canonical-json.mjs");
  assert.equal(platformJson.hashValue, sharedJson.hashValue);
  // Pinned from the implementation before the move: stored hashes must not change.
  assert.equal(platformJson.hashValue({b: 1, a: [2, {z: null, y: "é"}]}),
    "ec16434fd977b8278695259ef46f4abb10fc5095b65acc000e1987bed40a04f9");
});
