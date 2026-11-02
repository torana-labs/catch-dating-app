#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {readAdminActionCatalog} from "../lib/admin_registries.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
/** Where the Functions view lands. It is built on demand, never tracked. */
export const functionsCatalogModule =
  "functions/src/shared/generated/adminActionCatalog.ts";
/** The catalog the views are rendered from, relative to the repository root. */
export const catalogSource = "contracts/admin/admin_action_catalog.json";
/** The folder of per-workflow files that catalog adds up, relative to the repository root. */
export const catalogFragments = "contracts/admin/actions";
/** This renderer, relative to the repository root. */
export const catalogGenerator = "tool/admin/generate_admin_action_catalog.mjs";

const outputs = new Map([
  [
    path.join(repoRoot, "admin", "src", "generated", "adminActionCatalog.ts"),
    renderAdmin,
  ],
  [path.join(repoRoot, ...functionsCatalogModule.split("/")), renderFunctions],
]);

function selfTest(catalog) {
  const changed = structuredClone(catalog);
  changed.actions[0].summary = "simulated drift";
  if (renderAdmin(changed) === renderAdmin(catalog)) {
    throw new Error("Admin action catalog self-test did not detect drift.");
  }
  const brokenLinks = structuredClone(catalog);
  const linkedAction = brokenLinks.actions.find((action) =>
    action.workflowIds.length > 0
  );
  const linkedWorkflow = brokenLinks.workflows.find((workflow) =>
    workflow.workflowId === linkedAction.workflowIds[0]
  );
  linkedWorkflow.actions = linkedWorkflow.actions.filter((actionId) =>
    actionId !== linkedAction.actionId
  );
  try {
    validateCatalog(brokenLinks);
    throw new Error(
      "Admin action catalog self-test accepted a missing workflow link."
    );
  } catch (error) {
    if (!String(error).includes("does not list action")) throw error;
  }
  console.log("Admin action catalog generator self-test detected drift.");
}

function main() {
  const catalog = readAdminActionCatalog(path.join(repoRoot, catalogSource));
  validateCatalog(catalog);
  if (process.argv.includes("--self-test")) {
    selfTest(catalog);
    return;
  }
  // --validate checks the catalog's own links without writing anything.
  if (process.argv.includes("--validate")) {
    console.log(`Admin action catalog is valid (${catalog.actions.length} actions).`);
    return;
  }
  for (const [outputPath, render] of outputs) {
    const output = render(catalog);
    // Rewriting identical bytes would invalidate every compiler and bundler cache.
    if (fs.existsSync(outputPath) && fs.readFileSync(outputPath, "utf8") === output) continue;
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, output);
  }
  console.log(`Generated admin action catalog outputs (${catalog.actions.length} actions).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

function renderAdmin(value) {
  const publicCatalog = {
    schemaVersion: value.schemaVersion,
    catalogVersion: value.catalogVersion,
    actions: value.actions.map((action) => ({
      actionId: action.actionId,
      callable: action.callable,
      workflowIds: action.workflowIds,
      guiPath: action.guiPath,
      kind: action.kind,
      risk: action.risk,
      roles: action.roles,
      summary: action.summary,
      controlPlane: action.controlPlane === true,
    })),
    workflows: value.workflows,
  };
  return header() +
    `export const adminActionCatalog = ${JSON.stringify(publicCatalog, null, 2)} as const;\n\n` +
    "export type AdminActionId = typeof adminActionCatalog.actions[number][\"actionId\"];\n";
}

export function renderFunctions(value) {
  // Sorted, so the bytes depend on what the catalog holds, not how it is stored.
  const sorted = value.actions.toSorted((a, b) => (a.actionId < b.actionId ? -1 : 1));
  const actions = Object.fromEntries(sorted.map((action) => [
    action.actionId,
    {
      callable: action.callable,
      controlPlane: action.controlPlane === true,
      kind: action.kind,
      roles: action.roles,
    },
  ]));
  return header() +
    `export const ADMIN_ACTION_CATALOG = ${JSON.stringify(actions, null, 2)} as const;\n\n` +
    "export type AdminActionId = keyof typeof ADMIN_ACTION_CATALOG;\n";
}

function header() {
  return "// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs\n";
}

function validateCatalog(value) {
  const actions = new Map();
  for (const action of value.actions) {
    if (actions.has(action.actionId)) {
      throw new Error(`Duplicate admin action id: ${action.actionId}`);
    }
    actions.set(action.actionId, action);
  }
  const workflows = new Map();
  for (const workflow of value.workflows) {
    if (workflows.has(workflow.workflowId)) {
      throw new Error(`Duplicate admin workflow id: ${workflow.workflowId}`);
    }
    workflows.set(workflow.workflowId, workflow);
  }
  for (const action of value.actions) {
    for (const workflowId of action.workflowIds) {
      const workflow = workflows.get(workflowId);
      if (!workflow) {
        throw new Error(
          `Admin action ${action.actionId} names unknown workflow ${workflowId}.`
        );
      }
      if (!workflow.actions.includes(action.actionId)) {
        throw new Error(
          `Admin workflow ${workflowId} does not list action ${action.actionId}.`
        );
      }
    }
  }
  for (const workflow of value.workflows) {
    for (const actionId of workflow.actions) {
      const action = actions.get(actionId);
      if (!action) {
        throw new Error(
          `Admin workflow ${workflow.workflowId} names unknown action ${actionId}.`
        );
      }
      if (!action.workflowIds.includes(workflow.workflowId)) {
        throw new Error(
          `Admin action ${actionId} does not list workflow ${workflow.workflowId}.`
        );
      }
    }
  }
}
