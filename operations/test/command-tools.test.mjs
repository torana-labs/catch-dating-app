import assert from "node:assert/strict";
import test from "node:test";

import {loadCommandCatalog} from "../src/command-client/command-catalog.mjs";
import {
  anthropicTool,
  buildToolDefinitions,
  CommandToolSession,
  toolNameFor,
} from "../src/command-tools/index.mjs";

const input = {organizerName: "Lantern Social Club", marketId: "in-indore"};
const previewHash = "c".repeat(64);

function responseFor(payload, overrides = {}) {
  return {
    commandId: "workspace.ensure",
    status: payload.mode === "apply" ? "applied" : "previewed",
    previewHash,
    summary: {headline: "Create your workspace", lines: ["Lantern Social Club, in-indore"]},
    effects: [],
    next: [],
    receiptId: payload.mode === "apply" ? `workspaceEnsure_${"d".repeat(64)}` : null,
    result: {organizerId: "B".repeat(20), organizerName: input.organizerName,
      marketId: input.marketId, exists: false, created: false, publishStatus: "draft",
      expiresAt: null},
    ...overrides,
  };
}

async function catalogWithEffect(effect) {
  const catalog = await loadCommandCatalog();
  const command = {...catalog.commandsById.get("workspace.ensure"), effect};
  return {...catalog, commands: [command], commandsById: new Map([[command.commandId, command]])};
}

function fakeClient(respond = responseFor) {
  const calls = [];
  return {calls, async invoke(callable, payload) {
    calls.push({callable, payload: structuredClone(payload)});
    return respond(payload, calls.length);
  }};
}

let keyCounter = 0;
const newKey = () => `ai_fixturekey${String(++keyCounter).padStart(20, "0")}`;

test("tool names follow the agent runner's naming rule", () => {
  assert.equal(toolNameFor("workspace.ensure"), "workspace_ensure");
  assert.equal(toolNameFor("organizer.import-from-link"), "organizer_import_from_link");
});

test("tool definitions expose only the command input as a closed schema", async () => {
  const catalog = await loadCommandCatalog();
  const [definition] = buildToolDefinitions(catalog, {surface: "cli"})
    .filter((tool) => tool.commandId === "workspace.ensure");
  assert.equal(definition.name, "workspace_ensure");
  assert.equal(definition.inputSchema.type, "object");
  assert.equal(definition.inputSchema.additionalProperties, false);
  assert.ok(Array.isArray(definition.inputSchema.required));
  for (const envelopeField of ["mode", "idempotencyKey", "surface", "confirm"]) {
    assert.equal(Object.hasOwn(definition.inputSchema.properties, envelopeField), false);
  }
  assert.equal(JSON.stringify(definition.inputSchema).includes("$ref"), false);
  assert.match(definition.description, /only previews/u);
  assert.deepEqual(Object.keys(anthropicTool(definition)).sort(),
    ["description", "input_schema", "name"]);
});

test("every catalog command produces a valid tool for each surface it is on", async () => {
  const catalog = await loadCommandCatalog();
  const surfaces = new Set(catalog.commands.flatMap((command) => command.surfaces));
  for (const surface of surfaces) {
    const session = new CommandToolSession({catalog, client: fakeClient(), surface});
    for (const tool of session.agentTools()) {
      assert.match(tool.name, /^[a-z][a-z0-9_]{0,63}$/u);
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.equal(typeof tool.handler, "function");
    }
  }
});

test("a command is not offered on a surface the catalog has not opened", async () => {
  const catalog = await loadCommandCatalog();
  const offered = buildToolDefinitions(catalog, {surface: "whatsapp"})
    .map((tool) => tool.commandId);
  for (const commandId of offered) {
    assert.ok(catalog.commandsById.get(commandId).surfaces.includes("whatsapp"));
  }
  assert.throws(() => buildToolDefinitions(catalog, {}), {code: "COMMAND_TOOL_SURFACE_REQUIRED"});
});

test("a model tool call previews only and returns no hash or key", async () => {
  const catalog = await loadCommandCatalog();
  const client = fakeClient();
  const session = new CommandToolSession({catalog, client, surface: "cli", newKey});
  const tool = session.agentTools().find((entry) => entry.name === "workspace_ensure");
  const text = await tool.handler(input);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].payload.mode, "preview");
  assert.equal(client.calls[0].payload.surface, "cli");
  assert.equal(Object.hasOwn(client.calls[0].payload, "confirm"), false);
  assert.match(text, /^Create your workspace\n- Lantern Social Club/u);
  assert.match(text, /Nothing has changed/u);
  assert.equal(text.includes(previewHash), false);
  assert.equal(text.includes("ai_fixturekey"), false);
});

test("only the person can confirm, and apply carries the reviewed hash", async () => {
  const catalog = await loadCommandCatalog();
  const client = fakeClient();
  const session = new CommandToolSession({catalog, client, surface: "cli", newKey});
  const preview = await session.preview("workspace_ensure", input);
  await assert.rejects(session.confirmPending(preview.pendingId, {source: "model"}),
    {code: "COMMAND_TOOL_CONFIRMATION_SOURCE"});
  const applied = await session.confirmPending(preview.pendingId, {source: "person"});
  assert.equal(applied.status, "applied");
  const apply = client.calls.at(-1).payload;
  assert.equal(apply.mode, "apply");
  assert.deepEqual(apply.confirm, {commandId: "workspace.ensure", previewHash});
  // One key per action: link-import commands find their page read by it.
  assert.equal(apply.idempotencyKey, client.calls[0].payload.idempotencyKey);
  await assert.rejects(session.confirmPending(preview.pendingId, {source: "person"}),
    {code: "COMMAND_TOOL_PENDING_UNKNOWN"});
});

for (const effect of ["messages-guests", "moves-money"]) {
  test(`${effect} needs the person to confirm the exact preview hash`, async () => {
    const catalog = await catalogWithEffect(effect);
    const client = fakeClient();
    const session = new CommandToolSession({catalog, client, surface: "cli", newKey});
    const preview = await session.preview("workspace_ensure", input);
    assert.equal(preview.needsPreviewHashEcho, true);
    await assert.rejects(session.confirmPending(preview.pendingId, {source: "person"}),
      {code: "COMMAND_TOOL_PREVIEW_MISMATCH"});
    await assert.rejects(session.confirmPending(preview.pendingId,
      {source: "person", previewHash: "e".repeat(64)}), {code: "COMMAND_TOOL_PREVIEW_MISMATCH"});
    assert.equal(client.calls.length, 1);
    const applied = await session.confirmPending(preview.pendingId,
      {source: "person", previewHash});
    assert.equal(applied.status, "applied");
  });
}

test("a running preview cannot be confirmed and refreshes with the same key", async () => {
  const catalog = await loadCommandCatalog();
  const client = fakeClient((payload, call) => call === 1 ?
    responseFor(payload, {status: "running"}) : responseFor(payload));
  const session = new CommandToolSession({catalog, client, surface: "cli", newKey});
  const first = await session.preview("workspace_ensure", input);
  await assert.rejects(session.confirmPending(first.pendingId, {source: "person"}),
    {code: "COMMAND_TOOL_NOT_CONFIRMABLE"});
  const second = await session.refresh(first.pendingId);
  assert.equal(second.pendingId, first.pendingId);
  assert.equal(second.status, "previewed");
  assert.equal(client.calls[1].payload.idempotencyKey, client.calls[0].payload.idempotencyKey);
});

test("a retried confirmation after an unknown outcome reuses the preview key", async () => {
  const catalog = await loadCommandCatalog();
  const client = fakeClient((payload, call) => {
    if (call === 2) throw new Error("connection lost");
    return responseFor(payload, payload.mode === "apply" ? {status: "replayed"} : {});
  });
  const session = new CommandToolSession({catalog, client, surface: "cli", newKey});
  const preview = await session.preview("workspace_ensure", input);
  await assert.rejects(session.confirmPending(preview.pendingId, {source: "person"}));
  const retried = await session.confirmPending(preview.pendingId, {source: "person"});
  assert.equal(retried.status, "replayed");
  assert.equal(client.calls[2].payload.idempotencyKey, client.calls[1].payload.idempotencyKey);
  assert.equal(client.calls[1].payload.idempotencyKey, client.calls[0].payload.idempotencyKey);
});

test("previews expire and invalid input never reaches the callable", async () => {
  const catalog = await loadCommandCatalog();
  let clock = 0;
  const client = fakeClient();
  const session = new CommandToolSession({catalog, client, surface: "cli", newKey,
    now: () => clock, pendingTtlMs: 1000});
  const preview = await session.preview("workspace_ensure", input);
  clock = 1001;
  await assert.rejects(session.confirmPending(preview.pendingId, {source: "person"}),
    {code: "COMMAND_TOOL_PENDING_EXPIRED"});
  await assert.rejects(session.preview("workspace_ensure", {organizerName: "Lantern"}),
    {code: "COMMAND_TOOL_INPUT_INVALID"});
  assert.equal(client.calls.length, 1);
});
