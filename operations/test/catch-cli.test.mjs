import assert from "node:assert/strict";
import test from "node:test";

import {main, runCommand} from "../src/catch-cli/main.mjs";
import {loadCommandCatalog} from "../src/command-client/command-catalog.mjs";
import {OperationsError} from "../src/platform/errors.mjs";

const input = {organizerName: "Lantern Social Club", marketId: "in-indore"};
const previewHash = "a".repeat(64);
const key = "cli_fixture000000000000000000000001";

function responseFor(payload, overrides = {}) {
  return {
    commandId: "workspace.ensure",
    status: payload.mode === "apply" ? "applied" : "previewed",
    previewHash,
    summary: {headline: "Your workspace is ready", lines: ["Lantern Social Club, in-indore"]},
    effects: [],
    next: [],
    receiptId: payload.mode === "apply" ? `workspaceEnsure_${"b".repeat(64)}` : null,
    result: {
      organizerId: "A".repeat(20), organizerName: input.organizerName, marketId: input.marketId,
      exists: payload.mode === "apply", created: payload.mode === "apply",
      publishStatus: "draft", expiresAt: null,
    },
    ...overrides,
  };
}

// The real catalog entry with its effect class swapped, so confirmation rules
// are tested for every class without depending on which commands exist.
async function catalogWithEffect(effect) {
  const catalog = await loadCommandCatalog();
  const command = {...catalog.commandsById.get("workspace.ensure"), effect};
  return {...catalog, commands: [command], commandsById: new Map([[command.commandId, command]])};
}

function recordingClient(respond = responseFor) {
  const calls = [];
  return {
    calls,
    async invoke(callable, payload) {
      calls.push({callable, payload});
      return respond(payload, calls.length);
    },
  };
}

const memoryReceipts = () => {
  const receipts = [];
  return {receipts, put: async (receipt) => {
    receipts.push(receipt);
    return `/fixture/${receipt.executionId}.json`;
  }};
};

test("catch CLI previews by default and sends the shared envelope", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient();
  const result = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), idempotencyKey: key}, dependencies: {client}});
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.calls[0], {callable: "ensureTryItWorkspace", payload: {
    mode: "preview", idempotencyKey: key, surface: "cli", input,
  }});
  assert.equal(result.status, "previewed");
  assert.equal(result.previewHash, previewHash);
  assert.deepEqual(result.applyWith,
    ["--idempotency-key", key, "--apply", "--preview-hash", previewHash]);
  assert.deepEqual(result.warnings, []);
});

test("catch CLI applies a draft command and passes the preview hash through", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient();
  const receiptStore = memoryReceipts();
  const result = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), apply: true, previewHash, idempotencyKey: key},
    dependencies: {client, receiptStore}});
  assert.deepEqual(client.calls[0].payload.confirm,
    {commandId: "workspace.ensure", previewHash});
  assert.equal(client.calls[0].payload.mode, "apply");
  assert.equal(result.status, "applied");
  assert.match(result.receiptId, /^workspaceEnsure_/u);
  assert.equal(receiptStore.receipts[0].status, "succeeded");
  assert.equal(receiptStore.receipts[0].idempotencyKey, key);
});

test("catch CLI requires --confirm before a publishing command applies", async () => {
  const catalog = await catalogWithEffect("publishes");
  const client = recordingClient();
  await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), apply: true}, dependencies: {client}}),
  {code: "CATCH_CLI_CONFIRMATION_REQUIRED"});
  await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), apply: true, confirm: "organizer.publish"},
    dependencies: {client}}), {code: "CATCH_CLI_CONFIRMATION_MISMATCH"});
  assert.equal(client.calls.length, 0);
});

for (const effect of ["messages-guests", "moves-money"]) {
  test(`catch CLI requires --confirm and --preview-hash for ${effect}`, async () => {
    const catalog = await catalogWithEffect(effect);
    const client = recordingClient();
    await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
      flags: {json: JSON.stringify(input), apply: true, confirm: "workspace.ensure"},
      dependencies: {client}}), {code: "CATCH_CLI_PREVIEW_HASH_REQUIRED"});
    assert.equal(client.calls.length, 0);
    await runCommand({catalog, commandId: "workspace.ensure",
      flags: {json: JSON.stringify(input), apply: true, confirm: "workspace.ensure", previewHash},
      dependencies: {client, receiptStore: memoryReceipts()}});
    assert.deepEqual(client.calls[0].payload.confirm,
      {commandId: "workspace.ensure", previewHash});
  });
}

test("catch CLI refuses confirmation flags on a preview", async () => {
  const catalog = await loadCommandCatalog();
  await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), previewHash}, dependencies: {client: recordingClient()}}),
  {code: "CATCH_CLI_ARGUMENT_INVALID"});
});

test("catch CLI validates input against the payload schema before calling", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient();
  await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify({organizerName: "Lantern Social Club"})},
    dependencies: {client}}), (error) => {
    assert.equal(error.code, "CATCH_CLI_INPUT_INVALID");
    assert.ok(error.details.issues.length > 0);
    return true;
  });
  assert.equal(client.calls.length, 0);
});

test("catch CLI dry-run calls nothing and needs no credentials", async () => {
  const catalog = await loadCommandCatalog();
  const result = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), dryRun: true, idempotencyKey: key},
    dependencies: {env: {}}});
  assert.equal(result.mode, "dry-run");
  assert.equal(result.payload.mode, "preview");
});

test("catch CLI reports an unknown apply outcome with a safe retry key", async () => {
  const catalog = await loadCommandCatalog();
  const receiptStore = memoryReceipts();
  const client = {invoke: async () => {
    throw new OperationsError("CATCH_CALLABLE_TIMEOUT", "timed out");
  }};
  await assert.rejects(runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), apply: true, idempotencyKey: key},
    dependencies: {client, receiptStore}}), (error) => {
    assert.equal(error.code, "CATCH_CALLABLE_TIMEOUT");
    assert.equal(error.details.actionCompleted, null);
    assert.equal(error.details.idempotencyKey, key);
    assert.match(error.details.retry, new RegExp(key, "u"));
    return true;
  });
  assert.equal(receiptStore.receipts[0].status, "indeterminate");
});

test("catch CLI --wait repeats a running preview with the same key", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient((payload, call) => call < 3 ?
    responseFor(payload, {status: "running"}) : responseFor(payload));
  const result = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input), wait: true, idempotencyKey: key},
    dependencies: {client, sleep: async () => undefined}});
  assert.equal(client.calls.length, 3);
  assert.ok(client.calls.every((call) => call.payload.idempotencyKey === key));
  assert.equal(result.status, "previewed");
});

test("catch CLI warns, without failing, when a response breaks its schema", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient((payload) => responseFor(payload, {unexpected: true}));
  const result = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input)}, dependencies: {client}});
  assert.equal(result.warnings[0].code, "CATCH_CLI_RESPONSE_SCHEMA_MISMATCH");
});

test("catch CLI lists and describes catalog commands without credentials", async () => {
  const listed = await main(["commands"]);
  assert.equal(listed.envelope.ok, true);
  assert.ok(listed.envelope.data.commands.some((command) =>
    command.commandId === "workspace.ensure"));
  const described = await main(["describe", "workspace.ensure"]);
  assert.equal(described.envelope.data.inputSchema.properties.marketId.type, "string");
  await assert.rejects(main(["describe", "no.such-command"]), {code: "CATCH_CLI_COMMAND_UNKNOWN"});
});

test("catch CLI text output shows the summary and how to apply", async () => {
  const catalog = await loadCommandCatalog();
  const out = await main(["run", "workspace.ensure", "--json", JSON.stringify(input), "--text",
    "--idempotency-key", key], {catalog, client: recordingClient()});
  assert.match(out.text, /^Your workspace is ready\n {2}Lantern Social Club/u);
  assert.match(out.text, /--apply --preview-hash a{64}/u);
});

test("catch CLI apply run built from applyWith reuses the preview's key", async () => {
  const catalog = await loadCommandCatalog();
  const client = recordingClient();
  const preview = await runCommand({catalog, commandId: "workspace.ensure",
    flags: {json: JSON.stringify(input)}, dependencies: {client,
      newIdempotencyKey: () => "cli_previewkey0000000000000000001"}});
  const flags = {json: JSON.stringify(input)};
  for (let index = 0; index < preview.applyWith.length; index += 1) {
    const flag = preview.applyWith[index];
    const name = flag.slice(2).replace(/-([a-z])/gu, (_m, letter) => letter.toUpperCase());
    if (flag === "--apply") flags.apply = true;
    else flags[name] = preview.applyWith[++index];
  }
  await runCommand({catalog, commandId: "workspace.ensure", flags, dependencies: {client,
    receiptStore: memoryReceipts(),
    newIdempotencyKey: () => "cli_differentkey000000000000000002"}});
  assert.equal(client.calls[1].payload.mode, "apply");
  assert.equal(client.calls[1].payload.idempotencyKey, client.calls[0].payload.idempotencyKey);
});
