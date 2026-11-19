#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  isMainModule,
  parseCommandLine,
  positiveInteger as sharedPositiveInteger,
} from "../../../packages/command-client/src/argv.mjs";
import {
  inputJsonSchema,
  loadCommandCatalog,
  publicCommand,
  requireCommand,
  schemaIssues,
} from "../command-client/command-catalog.mjs";
import {confirmationPolicy} from "../../../packages/command-client/src/confirmation-policy.mjs";
import {runCli, successEnvelope} from "../../../packages/command-client/src/envelope.mjs";
import {executeWithReceipts} from "../../../packages/command-client/src/execution.mjs";
import {LocalReceiptStore} from "../../../packages/command-client/src/receipt-store.mjs";
import {
  CallableTransport,
  callableBaseUrl,
  isIndeterminateTransportError,
} from "../../../packages/command-client/src/transport.mjs";
import {hashValue} from "../platform/canonical-json.mjs";
import {OperationsError} from "../platform/errors.mjs";

// The catch CLI: a thin client of contracts/commands/catalog.json. Every
// command previews by default. --apply runs it; the effect class decides
// whether --confirm <commandId> and --preview-hash are also required.

const PROGRAM = "catch";
const CODE = "CATCH_CLI";
const CALLABLE_CODE = "CATCH_CALLABLE";
const SURFACE = "cli";
const cliDirectory = path.dirname(fileURLToPath(import.meta.url));
const operationsRoot = path.resolve(cliDirectory, "..", "..");
const defaultRepoRoot = path.resolve(operationsRoot, "..");

if (isMainModule(import.meta.url)) {
  runCli({program: PROGRAM, argv: process.argv.slice(2), main});
}

export async function main(argv, dependencies = {}) {
  const parsed = parseArguments(argv);
  const repoRoot = path.resolve(parsed.flags.repoRoot ?? defaultRepoRoot);
  const catalog = dependencies.catalog ?? await loadCommandCatalog({repoRoot});
  let data;
  if (parsed.command === "help") data = helpData();
  else if (parsed.command === "commands") data = listCommands(catalog, parsed.flags);
  else if (parsed.command === "describe") data = describeCommand(catalog, parsed.subject);
  else if (parsed.command === "run") {
    data = await runCommand({catalog, commandId: parsed.subject, flags: parsed.flags,
      dependencies});
  } else {
    throw new OperationsError(`${CODE}_COMMAND_UNKNOWN`, `Unknown command: ${parsed.command}.`,
      {exitCode: 2});
  }
  const envelope = successEnvelope({program: PROGRAM, command: parsed.command, data,
    warnings: data?.warnings ?? []});
  return {
    pretty: parsed.flags.pretty === true,
    envelope,
    text: parsed.flags.text ? textOutput(parsed.command, data) : undefined,
  };
}

export async function runCommand({catalog, commandId, flags, dependencies = {}}) {
  const command = requireCommand(catalog, commandId, {codePrefix: `${CODE}_COMMAND`});
  if (!command.surfaces.includes(SURFACE)) {
    throw new OperationsError(`${CODE}_SURFACE_NOT_ALLOWED`,
      `${commandId} is not exposed on the CLI.`, {exitCode: 2});
  }
  const input = await readInput(flags);
  const apply = flags.apply === true;
  const confirm = confirmationFor(command, flags, apply);
  const idempotencyKey = flags.idempotencyKey ??
    (dependencies.newIdempotencyKey ?? newIdempotencyKey)();
  const payload = {
    mode: apply ? "apply" : "preview",
    idempotencyKey,
    surface: SURFACE,
    ...(confirm ? {confirm} : {}),
    input,
  };
  if (!command.validatePayload(payload)) {
    throw new OperationsError(`${CODE}_INPUT_INVALID`, `Invalid input for ${commandId}.`,
      {exitCode: 2, details: {issues: schemaIssues(command.validatePayload)}});
  }
  if (flags.dryRun) {
    return {
      mode: "dry-run",
      command: publicCommand(command),
      wouldInvoke: command.callable,
      payload,
      requestHash: hashValue(payload),
    };
  }
  const client = dependencies.client ?? liveClient(flags, dependencies);
  const now = dependencies.now ?? (() => new Date());
  if (!apply) {
    const response = await previewUntilSettled({client, command, payload, flags, dependencies});
    return describeResult({command, payload, response, apply: false});
  }
  const executionId = flags.executionId ?? crypto.randomUUID();
  const receiptStore = dependencies.receiptStore ?? new LocalReceiptStore(
    path.resolve(flags.receiptDir ?? path.join(operationsRoot, ".state", "catch-commands")),
    {conflictCode: `${CODE}_RECEIPT_CONFLICT`}
  );
  const requestHash = hashValue(payload);
  try {
    const {response, receiptPath} = await executeWithReceipts({
      client,
      callable: command.callable,
      payload,
      executionId,
      receiptStore,
      baseReceipt: {
        schemaVersion: 1,
        executionId,
        commandId: command.commandId,
        callable: command.callable,
        idempotencyKey,
        requestHash,
        startedAt: now().toISOString(),
      },
      now,
      hash: hashValue,
      isIndeterminate: (error) => isIndeterminateTransportError(error, CALLABLE_CODE),
      codes: {subject: "command"},
    });
    return {...describeResult({command, payload, response, apply: true}), executionId,
      localReceiptPath: receiptPath};
  } catch (error) {
    // An unknown outcome is safe to retry: the same idempotency key replays
    // the stored result instead of applying twice.
    if (error instanceof OperationsError && error.details?.actionCompleted === null) {
      error.details.idempotencyKey = idempotencyKey;
      error.details.retry = `Re-run with --idempotency-key ${idempotencyKey} to learn the outcome without applying twice.`;
    }
    throw error;
  }
}

function confirmationFor(command, flags, apply) {
  const policy = confirmationPolicy(command.effect);
  if (!apply) {
    if (flags.confirm || flags.previewHash) {
      throw new OperationsError(`${CODE}_ARGUMENT_INVALID`,
        "--confirm and --preview-hash only apply with --apply.", {exitCode: 2});
    }
    return null;
  }
  if (flags.confirm !== undefined && flags.confirm !== command.commandId) {
    throw new OperationsError(`${CODE}_CONFIRMATION_MISMATCH`,
      `--confirm must name ${command.commandId}.`, {exitCode: 2});
  }
  if (policy.confirmCommandId && flags.confirm !== command.commandId) {
    throw new OperationsError(`${CODE}_CONFIRMATION_REQUIRED`,
      `${command.commandId} (${command.effect}) requires --confirm ${command.commandId}. ${policy.explain}`,
      {exitCode: 2, details: {effect: command.effect}});
  }
  if (policy.previewHash && !flags.previewHash) {
    throw new OperationsError(`${CODE}_PREVIEW_HASH_REQUIRED`,
      `${command.commandId} (${command.effect}) requires --preview-hash from a reviewed preview. ${policy.explain}`,
      {exitCode: 2, details: {effect: command.effect}});
  }
  if (flags.previewHash && !/^[a-f0-9]{64}$/u.test(flags.previewHash)) {
    throw new OperationsError(`${CODE}_ARGUMENT_INVALID`,
      "--preview-hash must be the 64-character previewHash of a preview.", {exitCode: 2});
  }
  // The server checks a confirm whenever one is sent, so a preview hash is
  // always passed through when the caller has one.
  return flags.previewHash ?
    {commandId: command.commandId, previewHash: flags.previewHash} : null;
}

async function previewUntilSettled({client, command, payload, flags, dependencies}) {
  const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const waitSeconds = flags.wait ?
    positiveInteger(flags.waitSeconds, 120, 1, 900) : 0;
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    const response = await client.invoke(command.callable, payload);
    if (response?.status !== "running" || !flags.wait || Date.now() >= deadline) {
      return response;
    }
    await sleep(3000);
  }
}

function describeResult({command, payload, response, apply}) {
  const warnings = [];
  if (!command.validateResponse(response)) {
    warnings.push({
      code: `${CODE}_RESPONSE_SCHEMA_MISMATCH`,
      message: `The ${command.callable} response does not match ${command.responseSchema}.`,
      issues: schemaIssues(command.validateResponse),
    });
  }
  const policy = confirmationPolicy(command.effect);
  const status = response?.status ?? null;
  const result = {
    mode: apply ? "apply" : "preview",
    commandId: command.commandId,
    effect: command.effect,
    status,
    idempotencyKey: payload.idempotencyKey,
    previewHash: response?.previewHash ?? null,
    receiptId: response?.receiptId ?? null,
    response,
    warnings,
  };
  if (!apply && status === "previewed") {
    // Apply reuses the preview's idempotency key: commands that read a page
    // find that read by it, and the preview hash covers it.
    result.applyWith = [
      "--idempotency-key", payload.idempotencyKey,
      "--apply",
      ...(policy.confirmCommandId ? ["--confirm", command.commandId] : []),
      ...(response.previewHash ? ["--preview-hash", response.previewHash] : []),
    ];
  }
  if (!apply && status === "running") {
    result.continueWith = ["--idempotency-key", payload.idempotencyKey, "--wait"];
  }
  return result;
}

function listCommands(catalog, flags) {
  const commands = catalog.commands.filter((command) =>
    (flags.all || command.surfaces.includes(SURFACE)) &&
    (!flags.effect || command.effect === flags.effect));
  return {
    total: commands.length,
    effectClasses: catalog.effectClasses,
    commands: commands.map(publicCommand),
  };
}

function describeCommand(catalog, commandId) {
  const command = requireCommand(catalog, commandId, {codePrefix: `${CODE}_COMMAND`});
  return {command: publicCommand(command), inputSchema: inputJsonSchema(catalog, command)};
}

async function readInput(flags) {
  if (flags.input && flags.json) {
    throw new OperationsError(`${CODE}_INPUT_AMBIGUOUS`, "Use only one of --input or --json.",
      {exitCode: 2});
  }
  try {
    if (flags.input) return JSON.parse(await fs.readFile(path.resolve(flags.input), "utf8"));
    if (flags.json) return JSON.parse(flags.json);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new OperationsError(`${CODE}_INPUT_INVALID`, "Command input is not valid JSON.",
        {exitCode: 2, cause: error});
    }
    throw error;
  }
  throw new OperationsError(`${CODE}_INPUT_REQUIRED`,
    "Command input is required through --input <file> or --json '<object>'.", {exitCode: 2});
}

function liveClient(flags, dependencies) {
  const env = dependencies.env ?? process.env;
  return new CallableTransport({
    baseUrl: callableBaseUrl({
      baseUrl: flags.baseUrl ?? env.CATCH_FUNCTIONS_BASE_URL,
      project: flags.project ?? env.CATCH_FIREBASE_PROJECT,
      region: flags.region ?? env.CATCH_FIREBASE_REGION,
      configCodePrefix: CODE,
      projectHint: "--project or CATCH_FIREBASE_PROJECT",
    }),
    idToken: flags.idToken ?? env.CATCH_ID_TOKEN,
    appCheckToken: flags.appCheckToken ?? env.CATCH_APP_CHECK_TOKEN,
    timeoutMs: positiveInteger(flags.timeoutMs, 60_000, 1_000, 300_000),
    fetchImpl: dependencies.fetchImpl,
    codePrefix: CALLABLE_CODE,
    configCodePrefix: CODE,
    label: "Command callable",
    purpose: "live commands",
    actorType: "cli",
  });
}

export function newIdempotencyKey() {
  return `cli_${crypto.randomUUID().replace(/-/gu, "")}`;
}

function parseArguments(argv) {
  return parseCommandLine(argv, {
    subjectCommands: ["describe", "run"],
    booleans: ["--all", "--apply", "--dry-run", "--pretty", "--text", "--wait"],
    values: [
      "--app-check-token", "--base-url", "--confirm", "--effect", "--execution-id",
      "--id-token", "--idempotency-key", "--input", "--json", "--preview-hash", "--project",
      "--receipt-dir", "--region", "--repo-root", "--timeout-ms", "--wait-seconds",
    ],
    exclusive: [["--apply", "--dry-run"], ["--input", "--json"]],
    codePrefix: CODE,
  });
}

function positiveInteger(value, fallback, minimum, maximum) {
  return sharedPositiveInteger(value, fallback, minimum, maximum, {codePrefix: CODE});
}

function textOutput(command, data) {
  if (command !== "run" || !data?.response?.summary) {
    return `${JSON.stringify(data, null, 2)}\n`;
  }
  const {summary} = data.response;
  const lines = [summary.headline, ...summary.lines.map((line) => `  ${line}`)];
  if (data.applyWith) lines.push("", `To apply: catch run ${data.commandId} <same input> ${data.applyWith.join(" ")}`);
  if (data.continueWith) lines.push("", `Still working. Check again: catch run ${data.commandId} <same input> ${data.continueWith.join(" ")}`);
  for (const next of data.response.next ?? []) lines.push(`Next: ${next.label} (${next.commandId})`);
  return `${lines.join("\n")}\n`;
}

function helpData() {
  return {
    usage: "node operations/src/catch-cli/main.mjs <command> [subject] [flags]",
    commands: ["commands", "describe", "run"],
    examples: [
      "node operations/src/catch-cli/main.mjs commands --pretty",
      "node operations/src/catch-cli/main.mjs describe workspace.ensure --pretty",
      "node operations/src/catch-cli/main.mjs run workspace.ensure --json '{\"organizerName\":\"Lantern Social Club\",\"marketId\":\"in-indore\"}' --project <id>",
      "node operations/src/catch-cli/main.mjs run workspace.ensure --json '{...}' --apply --preview-hash <hash> --project <id>",
      "node operations/src/catch-cli/main.mjs run <publishing-command> --input input.json --apply --confirm <commandId> --preview-hash <hash>",
    ],
    safety: "Every command previews unless --apply is set. Preview writes nothing durable. Commands that publish need --confirm <commandId>; commands that message guests or move money also need --preview-hash from the reviewed preview. --dry-run validates locally and calls nothing.",
    authentication: "Live calls need CATCH_ID_TOKEN and CATCH_APP_CHECK_TOKEN (or --id-token/--app-check-token) for a phone-verified account, and CATCH_FIREBASE_PROJECT or --project.",
  };
}
