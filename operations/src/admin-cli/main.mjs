#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadAdminActionCatalog, publicAction} from "../admin/action-catalog.mjs";
import {
  callableBaseUrl,
  FirebaseAdminCallableClient,
} from "../admin/callable-client.mjs";
import {AdminActionReceiptStore} from "../admin/receipt-store.mjs";
import {
  isMainModule,
  parseCommandLine,
  positiveInteger as sharedPositiveInteger,
} from "../command-client/argv.mjs";
import {runCli, successEnvelope} from "../command-client/envelope.mjs";
import {executeWithReceipts} from "../command-client/execution.mjs";
import {isIndeterminateTransportError} from "../command-client/transport.mjs";
import {hashValue} from "../platform/canonical-json.mjs";
import {OperationsError} from "../platform/errors.mjs";

const cliDirectory = path.dirname(fileURLToPath(import.meta.url));
const operationsRoot = path.resolve(cliDirectory, "..", "..");
const defaultRepoRoot = path.resolve(operationsRoot, "..");

if (isMainModule(import.meta.url)) {
  runCli({program: "catch-admin", argv: process.argv.slice(2), main});
}

export async function main(argv, dependencies = {}) {
  const parsed = parseArguments(argv);
  const repoRoot = path.resolve(parsed.flags.repoRoot ?? defaultRepoRoot);
  const catalog = dependencies.catalog ?? await loadAdminActionCatalog({repoRoot});
  const pretty = parsed.flags.pretty === true;
  let data;
  if (parsed.command === "help") data = helpData();
  else if (parsed.command === "actions") {
    data = listActions(catalog, parsed.flags);
  } else if (parsed.command === "describe") {
    data = describeAction(catalog, parsed.subject);
  } else if (parsed.command === "workflows") {
    data = {workflows: catalog.workflows};
  } else if (parsed.command === "workflow") {
    data = describeWorkflow(catalog, parsed.subject);
  } else if (parsed.command === "loop") {
    data = validateWorkflowLoop(catalog, parsed.subject, parsed.flags);
  } else if (parsed.command === "run") {
    data = await runAction({
      catalog,
      actionId: parsed.subject,
      flags: parsed.flags,
      repoRoot,
      dependencies,
    });
  } else {
    throw new OperationsError(
      "ADMIN_CLI_COMMAND_UNKNOWN",
      `Unknown command: ${parsed.command}.`,
      {exitCode: 2}
    );
  }
  return {
    pretty,
    envelope: successEnvelope({
      program: "catch-admin",
      command: parsed.command,
      data,
    }),
  };
}

export async function runAction({
  catalog,
  actionId,
  flags,
  repoRoot,
  dependencies = {},
}) {
  const action = requireAction(catalog, actionId);
  if (action.controlPlane) {
    throw new OperationsError(
      "ADMIN_ACTION_CONTROL_PLANE_ONLY",
      `${actionId} is reserved for CLI receipt orchestration.`,
      {exitCode: 2}
    );
  }
  const payload = await readPayload(flags, action);
  catalog.validateRequest(action.actionId, payload);
  const target = action.targetField ? valueAt(payload, action.targetField) : null;
  const apply = action.kind === "read" ? !flags.dryRun : flags.apply === true;
  if (!apply) {
    return {
      mode: "dry-run",
      action: publicAction(action),
      target,
      requestHash: hashValue(payload),
      confirmationRequired: action.confirmation ?? "none",
      wouldInvoke: action.callable,
    };
  }
  assertConfirmation(action, target, flags);
  const executionId = flags.executionId ?? crypto.randomUUID();
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const requestHash = hashValue(payload);
  const client = dependencies.client ?? liveClient(flags, dependencies);
  const receiptStore = dependencies.receiptStore ?? new AdminActionReceiptStore(
    path.resolve(flags.receiptDir ?? path.join(operationsRoot, ".state", "admin-actions"))
  );
  const baseReceipt = {
    schemaVersion: 1,
    executionId,
    actionId: action.actionId,
    callable: action.callable,
    target,
    requestHash,
    startedAt,
  };
  const {response, responseHash, receiptPath} = await executeWithReceipts({
    client,
    callable: action.callable,
    payload,
    executionId,
    receiptStore,
    baseReceipt,
    now,
    hash: hashValue,
    isIndeterminate: isIndeterminateCallableError,
    remoteRecorder: (update) => recordRemote(client, {
      executionId,
      actionId: action.actionId,
      callable: action.callable,
      requestHash,
      target,
      cliVersion: catalog.catalogVersion,
      ...update,
    }),
    codes: {
      receiptStartFailed: "ADMIN_ACTION_RECEIPT_START_FAILED",
      receiptIncomplete: "ADMIN_ACTION_RECEIPT_INCOMPLETE",
      subject: "admin action",
    },
  });
  return {
    mode: "live",
    executionId,
    action: publicAction(action),
    target,
    response,
    requestHash,
    responseHash,
    receiptPath,
    remotelyVisible: true,
  };
}

function listActions(catalog, flags) {
  const actions = catalog.actions.filter((action) =>
    (flags.includeInternal || !action.controlPlane) &&
    (!flags.workflow || action.workflowIds.includes(flags.workflow)) &&
    (!flags.kind || action.kind === flags.kind)
  );
  return {total: actions.length, actions: actions.map(publicAction)};
}

function describeAction(catalog, actionId) {
  const action = requireAction(catalog, actionId);
  return {action: publicAction(action), example: action.example};
}

function describeWorkflow(catalog, workflowId) {
  const workflow = requireWorkflow(catalog, workflowId);
  return {
    workflow,
    actions: workflow.actions.map((actionId) =>
      publicAction(requireAction(catalog, actionId))),
  };
}

function validateWorkflowLoop(catalog, workflowId, flags) {
  const workflows = flags.all ? catalog.workflows : [
    requireWorkflow(catalog, workflowId),
  ];
  return {
    mode: "contract-loop",
    liveEffects: false,
    workflows: workflows.map((workflow) => ({
      workflowId: workflow.workflowId,
      label: workflow.label,
      guiPath: workflow.guiPath,
      blockedCapabilities: workflow.blockedCapabilities ?? [],
      steps: workflow.actions.map((actionId, index) => {
        const action = requireAction(catalog, actionId);
        catalog.validateRequest(actionId, action.example);
        return {
          step: index + 1,
          actionId,
          callable: action.callable,
          kind: action.kind,
          result: "schema-valid",
          requestHash: hashValue(action.example),
          confirmationRequired: action.confirmation ?? "none",
        };
      }),
    })),
  };
}

function assertConfirmation(action, target, flags) {
  if (action.kind !== "mutation") return;
  if (flags.confirm !== action.actionId) {
    throw new OperationsError(
      "ADMIN_ACTION_CONFIRMATION_REQUIRED",
      `Live mutation requires --confirm ${action.actionId}.`,
      {exitCode: 2}
    );
  }
  if (action.confirmation === "action-and-target" &&
      String(flags.confirmTarget ?? "") !== String(target ?? "")) {
    throw new OperationsError(
      "ADMIN_ACTION_TARGET_CONFIRMATION_REQUIRED",
      `Live mutation requires --confirm-target matching ${action.targetField}.`,
      {exitCode: 2, details: {targetField: action.targetField}}
    );
  }
}

async function readPayload(flags, action) {
  if (flags.input && flags.json) {
    throw new OperationsError(
      "ADMIN_CLI_INPUT_AMBIGUOUS",
      "Use only one of --input or --json.",
      {exitCode: 2}
    );
  }
  if (flags.input) {
    return JSON.parse(await fs.readFile(path.resolve(flags.input), "utf8"));
  }
  if (flags.json) return JSON.parse(flags.json);
  if (flags.example) return structuredClone(action.example);
  if (action.kind === "read") return {};
  throw new OperationsError(
    "ADMIN_CLI_INPUT_REQUIRED",
    "Mutation input is required through --input or --json.",
    {exitCode: 2}
  );
}

function liveClient(flags, dependencies) {
  const env = dependencies.env ?? process.env;
  return new FirebaseAdminCallableClient({
    baseUrl: callableBaseUrl({
      baseUrl: flags.baseUrl ?? env.CATCH_ADMIN_FUNCTIONS_BASE_URL,
      project: flags.project ?? env.CATCH_ADMIN_FIREBASE_PROJECT,
      region: flags.region ?? env.CATCH_ADMIN_FIREBASE_REGION,
    }),
    idToken: flags.idToken ?? env.CATCH_ADMIN_ID_TOKEN,
    appCheckToken: flags.appCheckToken ?? env.CATCH_ADMIN_APP_CHECK_TOKEN,
    timeoutMs: positiveInteger(flags.timeoutMs, 30_000, 1_000, 120_000),
    fetchImpl: dependencies.fetchImpl,
  });
}

async function recordRemote(client, payload) {
  await client.invoke("adminRecordActionExecution", payload, {
    executionId: payload.executionId,
  });
}

function isIndeterminateCallableError(error) {
  return isIndeterminateTransportError(error, "ADMIN_CALLABLE");
}

function requireAction(catalog, actionId) {
  if (!actionId) {
    throw new OperationsError(
      "ADMIN_ACTION_REQUIRED",
      "An admin action id is required.",
      {exitCode: 2}
    );
  }
  const action = catalog.actionsById.get(actionId);
  if (!action) {
    throw new OperationsError(
      "ADMIN_ACTION_UNKNOWN",
      `Unknown admin action: ${actionId}.`,
      {exitCode: 2}
    );
  }
  return action;
}

function requireWorkflow(catalog, workflowId) {
  if (!workflowId) {
    throw new OperationsError(
      "ADMIN_WORKFLOW_REQUIRED",
      "An admin workflow id is required unless --all is used.",
      {exitCode: 2}
    );
  }
  const workflow = catalog.workflowsById.get(workflowId);
  if (!workflow) {
    throw new OperationsError(
      "ADMIN_WORKFLOW_UNKNOWN",
      `Unknown admin workflow: ${workflowId}.`,
      {exitCode: 2}
    );
  }
  return workflow;
}

function valueAt(value, key) {
  const result = value?.[key];
  return typeof result === "string" || typeof result === "number" ?
    String(result) : null;
}

function parseArguments(argv) {
  return parseCommandLine(argv, {
    subjectCommands: ["describe", "workflow", "loop", "run"],
    booleans: [
      "--all", "--apply", "--dry-run", "--example", "--include-internal",
      "--pretty",
    ],
    values: [
      "--app-check-token", "--base-url", "--confirm", "--confirm-target",
      "--execution-id", "--id-token", "--input", "--json", "--kind",
      "--project", "--receipt-dir", "--region", "--repo-root", "--timeout-ms",
      "--workflow",
    ],
    exclusive: [["--apply", "--dry-run"]],
    codePrefix: "ADMIN_CLI",
  });
}

function positiveInteger(value, fallback, minimum, maximum) {
  return sharedPositiveInteger(value, fallback, minimum, maximum, {
    codePrefix: "ADMIN_CLI",
  });
}

function helpData() {
  return {
    usage: "node operations/src/admin-cli/main.mjs <command> [subject] [flags]",
    commands: ["actions", "describe", "workflows", "workflow", "loop", "run"],
    examples: [
      "node operations/src/admin-cli/main.mjs actions --workflow safety --pretty",
      "node operations/src/admin-cli/main.mjs describe safety.decide --pretty",
      "node operations/src/admin-cli/main.mjs loop --all --pretty",
      "node operations/src/admin-cli/main.mjs run overview.get --project <id>",
      "node operations/src/admin-cli/main.mjs run events.update --input payload.json --apply --confirm events.update --confirm-target <event-id>",
    ],
    safety: "Reads execute unless --dry-run is set. Mutations are dry-run unless --apply and the catalog confirmation policy are satisfied.",
    authentication: "Live calls require CATCH_ADMIN_ID_TOKEN and CATCH_ADMIN_APP_CHECK_TOKEN (or matching flags).",
  };
}
