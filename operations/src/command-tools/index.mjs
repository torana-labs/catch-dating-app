import crypto from "node:crypto";
import {inputJsonSchema, schemaIssues} from "../command-client/command-catalog.mjs";
import {confirmationPolicy} from "../command-client/confirmation-policy.mjs";
import {OperationsError} from "../platform/errors.mjs";

// Turns contracts/commands/catalog.json into AI tool definitions, and runs the
// preview-then-confirm protocol around them, for an agent client such as the
// later WhatsApp surface.
//
// The protocol keeps the model out of the decision to change anything:
// 1. A tool's input schema is the command's `input` only. The model cannot set
//    mode, idempotency key, surface or confirm.
// 2. Calling a tool always previews. The handler returns the plain-language
//    summary for the model to show the person, and a pending id.
// 3. Only the client, acting on the person's own reply, applies a pending
//    preview through `confirmPending`. Apply always sends the reviewed
//    previewHash, so the server refuses if anything changed since.
// 4. For effect classes that message guests or move money, the confirmation
//    must also name the exact previewHash the person was shown.

const DEFAULT_PENDING_TTL_MS = 15 * 60 * 1000;
const PERSON_SOURCES = new Set(["person"]);

export function toolNameFor(commandId) {
  const name = commandId.replace(/[.-]/gu, "_");
  if (!/^[a-z][a-z0-9_]{0,63}$/u.test(name)) {
    throw new OperationsError("COMMAND_TOOL_NAME_INVALID",
      `${commandId} does not map to a valid tool name.`);
  }
  return name;
}

export function toolDescription(command, effectClasses = {}) {
  const policy = confirmationPolicy(command.effect);
  const confirmation = policy.previewHash ?
    "Nothing changes until the person replies to confirm this exact preview; a confirmation of anything else is refused." :
    policy.confirmCommandId ?
      "Nothing changes until the person explicitly confirms the preview." :
      "Nothing changes until the person confirms the preview.";
  return [
    command.summary,
    `Effect: ${command.effect}. ${effectClasses[command.effect] ?? policy.explain}`,
    "Calling this tool only previews. Show the person the returned summary in your own words without adding to it, then ask whether to go ahead.",
    confirmation,
    "Never claim it is done before the client reports it applied.",
  ].join(" ");
}

// Provider-neutral tool definitions ({name, description, inputSchema}) for the
// commands a surface exposes. `surface` is required so a command is never
// offered on a surface the catalog has not opened it to.
export function buildToolDefinitions(catalog, {surface}) {
  if (!surface) {
    throw new OperationsError("COMMAND_TOOL_SURFACE_REQUIRED",
      "Name the surface the tools are for.");
  }
  return catalog.commands
    .filter((command) => command.surfaces.includes(surface))
    .map((command) => ({
      name: toolNameFor(command.commandId),
      commandId: command.commandId,
      effect: command.effect,
      description: toolDescription(command, catalog.effectClasses),
      inputSchema: inputJsonSchema(catalog, command),
    }));
}

export function anthropicTool(definition) {
  return {name: definition.name, description: definition.description,
    input_schema: definition.inputSchema};
}

// Holds pending previews for one conversation and turns tool calls into
// command calls. `client` is any {invoke(callable, payload)}: the shared
// CallableTransport in production, a fake in tests.
export class CommandToolSession {
  constructor({
    catalog,
    client,
    surface,
    now = () => Date.now(),
    newKey = () => `ai_${crypto.randomUUID().replace(/-/gu, "")}`,
    pendingTtlMs = DEFAULT_PENDING_TTL_MS,
  }) {
    if (!surface) {
      throw new OperationsError("COMMAND_TOOL_SURFACE_REQUIRED",
        "Name the surface the session serves.");
    }
    this.catalog = catalog;
    this.client = client;
    this.surface = surface;
    this.now = now;
    this.newKey = newKey;
    this.pendingTtlMs = pendingTtlMs;
    this.pending = new Map();
    this.definitions = buildToolDefinitions(catalog, {surface});
    this.byName = new Map(this.definitions.map((definition) => [definition.name, definition]));
  }

  // Definitions with handlers, in the shape GuardedAgentRunner takes.
  agentTools() {
    return this.definitions.map((definition) => ({
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      handler: async (input) => this.forModel(await this.preview(definition.name, input)),
    }));
  }

  async preview(toolName, input, {pendingId} = {}) {
    const definition = this.byName.get(toolName);
    if (!definition) {
      throw new OperationsError("COMMAND_TOOL_UNKNOWN", `Unknown tool: ${toolName}.`);
    }
    const command = this.catalog.commandsById.get(definition.commandId);
    const existing = pendingId ? this.requirePending(pendingId) : null;
    const previewKey = existing?.previewKey ?? this.newKey();
    const payload = {mode: "preview", idempotencyKey: previewKey, surface: this.surface, input};
    this.validate(command, payload);
    const response = await this.client.invoke(command.callable, payload);
    const id = existing?.pendingId ?? `pending_${crypto.randomUUID()}`;
    const record = {
      pendingId: id,
      commandId: command.commandId,
      effect: command.effect,
      input: structuredClone(input),
      previewKey,
      applyKey: existing?.applyKey ?? null,
      status: response?.status ?? null,
      previewHash: response?.previewHash ?? null,
      summary: response?.summary ?? null,
      createdAt: this.now(),
    };
    if (["previewed", "running"].includes(record.status)) this.pending.set(id, record);
    else this.pending.delete(id);
    return {...publicPending(record), response};
  }

  // Re-asks a running preview (an asynchronous read) with the same key.
  async refresh(pendingId) {
    const record = this.requirePending(pendingId);
    return this.preview(toolNameFor(record.commandId), record.input, {pendingId});
  }

  // Applies a reviewed preview. Call this only from the person's own reply,
  // never from a model tool call.
  async confirmPending(pendingId, confirmation = {}) {
    const record = this.requirePending(pendingId);
    if (!PERSON_SOURCES.has(confirmation.source)) {
      throw new OperationsError("COMMAND_TOOL_CONFIRMATION_SOURCE",
        "Only the person can confirm a preview; a model or tool call cannot.");
    }
    if (record.status !== "previewed" || !record.previewHash) {
      throw new OperationsError("COMMAND_TOOL_NOT_CONFIRMABLE",
        `This preview is ${record.status}; it can't be confirmed yet.`,
        {details: {status: record.status}});
    }
    const policy = confirmationPolicy(record.effect);
    if (policy.previewHash && confirmation.previewHash !== record.previewHash) {
      throw new OperationsError("COMMAND_TOOL_PREVIEW_MISMATCH",
        "This needs confirmation of the exact preview the person was shown.",
        {details: {effect: record.effect}});
    }
    const command = this.catalog.commandsById.get(record.commandId);
    // One apply key per pending preview: retrying after an unknown outcome
    // replays the stored result instead of applying twice.
    record.applyKey ??= this.newKey();
    const payload = {
      mode: "apply",
      idempotencyKey: record.applyKey,
      surface: this.surface,
      confirm: {commandId: record.commandId, previewHash: record.previewHash},
      input: record.input,
    };
    this.validate(command, payload);
    const response = await this.client.invoke(command.callable, payload);
    if (["applied", "replayed", "refused"].includes(response?.status)) {
      this.pending.delete(pendingId);
    }
    return {
      pendingId,
      commandId: record.commandId,
      status: response?.status ?? null,
      summary: response?.summary ?? null,
      receiptId: response?.receiptId ?? null,
      response,
    };
  }

  // What the model sees after a tool call: the summary to relay and what
  // happens next. No hashes or keys, so the model cannot confirm by itself.
  forModel(result) {
    const lines = [];
    if (result.summary) {
      lines.push(result.summary.headline, ...result.summary.lines.map((line) => `- ${line}`));
    }
    if (result.status === "previewed") {
      lines.push("", "This is a preview. Nothing has changed. Ask the person whether to go ahead.");
    } else if (result.status === "running") {
      lines.push("", "Still working on it. Tell the person it can take a minute.");
    } else if (result.status === "needs_input") {
      lines.push("", "More is needed before this can go ahead.");
    } else if (result.status === "refused") {
      lines.push("", "This can't go ahead.");
    }
    for (const next of result.response?.next ?? []) lines.push(`Next option: ${next.label}`);
    return lines.join("\n");
  }

  requirePending(pendingId) {
    const record = this.pending.get(pendingId);
    if (!record) {
      throw new OperationsError("COMMAND_TOOL_PENDING_UNKNOWN",
        "There is no open preview with that id.");
    }
    if (this.now() - record.createdAt > this.pendingTtlMs) {
      this.pending.delete(pendingId);
      throw new OperationsError("COMMAND_TOOL_PENDING_EXPIRED",
        "That preview is too old. Preview it again.");
    }
    return record;
  }

  validate(command, payload) {
    if (!command.validatePayload(payload)) {
      throw new OperationsError("COMMAND_TOOL_INPUT_INVALID",
        `Invalid input for ${command.commandId}.`,
        {details: {issues: schemaIssues(command.validatePayload)}});
    }
  }
}

function publicPending(record) {
  return {
    pendingId: record.pendingId,
    commandId: record.commandId,
    effect: record.effect,
    status: record.status,
    previewHash: record.previewHash,
    summary: record.summary,
    needsPreviewHashEcho: confirmationPolicy(record.effect).previewHash,
  };
}
