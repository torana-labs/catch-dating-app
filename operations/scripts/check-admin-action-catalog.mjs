#!/usr/bin/env node
import {adminCallableNames, readAdminCallableSources} from
  "../../tool/admin/callable_inventory.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadAdminActionCatalog} from "../src/admin/action-catalog.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const operationsRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(operationsRoot, "..");

if (isMain()) {
  const result = await checkAdminActionCatalog();
  const output = `${JSON.stringify(result, null, result.ok ? 0 : 2)}\n`;
  if (result.ok) process.stdout.write(output);
  else {
    process.stderr.write(output);
    process.exitCode = 1;
  }
}

export async function checkAdminActionCatalog({
  catalog,
  adminApiSource,
  functionsIndexSource,
  validatorSource,
} = {}) {
  let resolvedCatalog = catalog;
  const findings = [];
  try {
    resolvedCatalog ??= await loadAdminActionCatalog({repoRoot});
  } catch (error) {
    return failure("catalog-load-failed", error);
  }
  const apiSource = adminApiSource ?? readAdminCallableSources(repoRoot);
  const indexSource = functionsIndexSource ?? await fs.readFile(
    path.join(repoRoot, "functions", "src", "index.ts"),
    "utf8"
  );
  const generatedSource = validatorSource ?? await fs.readFile(
    path.join(
      repoRoot,
      "admin",
      "src",
      "generated",
      "validators",
      "adminCallableValidators.ts"
    ),
    "utf8"
  );
  const actionIds = resolvedCatalog.actions.map((action) => action.actionId);
  const guiCallables = callableNames(apiSource);
  // Control-plane authority is independent of presentation: an Owner-only
  // action can have an Admin UI without becoming an assistant capability.
  const guiSet = new Set(guiCallables);
  const catalogCallables = resolvedCatalog.actions
    .filter((action) => !action.controlPlane || guiSet.has(action.callable))
    .map((action) => action.callable);
  const allCatalogCallables = resolvedCatalog.actions.map((action) =>
    action.callable);
  unique(findings, "action-id-duplicate", actionIds);
  unique(findings, "callable-duplicate", catalogCallables);
  compareSets(
    findings,
    "gui-callable-catalog-drift",
    guiCallables,
    catalogCallables
  );
  const exported = new Set(indexSource.match(/\b[a-z][A-Za-z0-9]+\b/gu) ?? []);
  for (const callable of allCatalogCallables) {
    if (!exported.has(callable)) findings.push({
      id: "catalog-callable-not-exported",
      callable,
      message: "Catalog callable is not exported from functions/src/index.ts.",
    });
  }
  const strictRequests = generatedStrictRequests(generatedSource);
  compareSets(
    findings,
    "strict-request-validation-drift",
    catalogCallables,
    strictRequests
  );
  const knownActions = new Set(actionIds);
  const workflowIds = new Set(resolvedCatalog.workflows.map((workflow) =>
    workflow.workflowId));
  unique(findings, "workflow-id-duplicate", [...workflowIds]);
  const workflowMembership = new Map();
  for (const workflow of resolvedCatalog.workflows) {
    if (!workflow.actions.length) findings.push({
      id: "workflow-empty",
      workflowId: workflow.workflowId,
    });
    unique(findings, "workflow-action-duplicate", workflow.actions, {
      workflowId: workflow.workflowId,
    });
    for (const actionId of workflow.actions) {
      if (!knownActions.has(actionId)) findings.push({
        id: "workflow-action-unknown",
        workflowId: workflow.workflowId,
        actionId,
      });
      const memberships = workflowMembership.get(actionId) ?? [];
      memberships.push(workflow.workflowId);
      workflowMembership.set(actionId, memberships);
    }
  }
  for (const action of resolvedCatalog.actions) {
    const memberships = [...(workflowMembership.get(action.actionId) ?? [])]
      .sort();
    compareSets(
      findings,
      "workflow-membership-drift",
      action.workflowIds,
      memberships,
      {actionId: action.actionId}
    );
    if (!action.controlPlane && memberships.length === 0) findings.push({
      id: "action-not-in-workflow",
      actionId: action.actionId,
    });
    if (action.workflowIds.some((id) => !workflowIds.has(id))) findings.push({
      id: "action-workflow-unknown",
      actionId: action.actionId,
    });
    if (action.kind === "mutation" &&
        !["action", "action-and-target"].includes(action.confirmation)) {
      findings.push({
        id: "mutation-confirmation-missing",
        actionId: action.actionId,
      });
    }
    if (action.confirmation === "action-and-target" && !action.targetField) {
      findings.push({
        id: "mutation-target-field-missing",
        actionId: action.actionId,
      });
    }
    if (!Array.isArray(action.roles) || action.roles.length === 0) findings.push({
      id: "action-roles-missing",
      actionId: action.actionId,
    });
    try {
      resolvedCatalog.validateRequest?.(action.actionId, action.example);
    } catch (error) {
      findings.push({
        id: "action-example-invalid",
        actionId: action.actionId,
        message: error instanceof Error ? error.message : String(error),
        details: error?.details ?? null,
      });
    }
  }
  return {
    schemaVersion: 1,
    policyId: "admin-action-catalog-parity-v1",
    ok: findings.length === 0,
    findings,
    checked: {
      actions: resolvedCatalog.actions.length,
      workflows: resolvedCatalog.workflows.length,
      mutations: resolvedCatalog.actions.filter((action) =>
        action.kind === "mutation").length,
      strictRequests: strictRequests.length,
    },
  };
}

function callableNames(source) {
  return adminCallableNames(source);
}

function generatedStrictRequests(source) {
  const marker = '"strictRequests": [';
  const start = source.indexOf(marker);
  if (start === -1) return [];
  const arrayStart = source.indexOf("[", start);
  const arrayEnd = source.indexOf("]", arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) return [];
  return JSON.parse(source.slice(arrayStart, arrayEnd + 1)).sort();
}

function unique(findings, id, values, context = {}) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) findings.push({...context, id, value});
    seen.add(value);
  }
}

function compareSets(findings, id, expected, actual, context = {}) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value))
    .sort();
  const extra = [...actualSet].filter((value) => !expectedSet.has(value))
    .sort();
  if (missing.length || extra.length) findings.push({
    ...context,
    id,
    missing,
    extra,
  });
}

function failure(id, error) {
  return {
    schemaVersion: 1,
    policyId: "admin-action-catalog-parity-v1",
    ok: false,
    findings: [{
      id,
      message: error instanceof Error ? error.message : String(error),
    }],
    checked: {actions: 0, workflows: 0, mutations: 0, strictRequests: 0},
  };
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
