#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {readAdminActionCatalog} from "../lib/admin_registries.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
const adminGenerated = path.join(repoRoot, "admin", "src", "generated");
const adminActionsDir = path.join(adminGenerated, "adminActions");
const outputs = new Map([
  [path.join(adminGenerated, "adminActionCatalog.ts"), renderAdminLoader],
  [
    path.join(
      repoRoot,
      "functions",
      "src",
      "shared",
      "generated",
      "adminActionCatalog.ts"
    ),
    renderFunctions,
  ],
]);
const checkOnly = process.argv.includes("--check");
const selfTest = process.argv.includes("--self-test");
const catalog = readAdminActionCatalog();
validateCatalog(catalog);
// One file per workflow, so a new Admin area adds a file and touches no shared one.
for (const workflowId of new Set(catalog.actions.map(adminFileFor))) {
  outputs.set(path.join(adminActionsDir, `${workflowId}.ts`),
    (value) => renderAdminActions(value, workflowId));
}

if (selfTest) {
  const changed = structuredClone(catalog);
  changed.actions[0].kind = "simulated drift";
  if (renderFunctions(changed) === renderFunctions(catalog)) {
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
  process.exit(0);
}

let stale = false;
for (const [outputPath, render] of outputs) {
  const output = render(catalog);
  if (checkOnly) {
    const current = fs.existsSync(outputPath) ?
      fs.readFileSync(outputPath, "utf8") : "";
    if (current !== output) {
      stale = true;
      console.error(`${path.relative(repoRoot, outputPath)} is stale.`);
    }
    continue;
  }
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, output);
}
for (const name of fs.existsSync(adminActionsDir) ? fs.readdirSync(adminActionsDir) : []) {
  const filePath = path.join(adminActionsDir, name);
  if (outputs.has(filePath)) continue;
  if (checkOnly) {
    stale = true;
    console.error(`${path.relative(repoRoot, filePath)} has no workflow.`);
  } else {
    fs.rmSync(filePath);
  }
}
if (stale) process.exitCode = 1;
else console.log(checkOnly ?
  `Admin action catalog outputs are current (${catalog.actions.length} actions).` :
  `Generated admin action catalog outputs (${catalog.actions.length} actions).`);

function adminFileFor(action) {
  return action.workflowIds[0] ?? "unassigned";
}

function renderAdminActions(value, workflowId) {
  const actions = value.actions.filter((action) => adminFileFor(action) === workflowId)
    .map((action) => ({
      actionId: action.actionId,
      callable: action.callable,
      workflowIds: action.workflowIds,
      guiPath: action.guiPath,
      kind: action.kind,
      risk: action.risk,
      roles: action.roles,
      summary: action.summary,
      controlPlane: action.controlPlane === true,
    }));
  return header() + `export default ${JSON.stringify(actions, null, 2)} as const;\n`;
}

function renderAdminLoader() {
  return header() +
    `type AdminAction = {\n` +
    `  actionId: string;\n  callable: string;\n  workflowIds: readonly string[];\n  guiPath: string;\n` +
    `  kind: string;\n  risk: string;\n  roles: readonly string[];\n  summary: string;\n  controlPlane: boolean;\n};\n\n` +
    `const files = import.meta.glob<readonly AdminAction[]>("./adminActions/*.ts", {eager: true, import: "default"});\n\n` +
    `export const adminActionCatalog = {\n` +
    `  actions: Object.values(files).flat().sort((a, b) => (a.actionId < b.actionId ? -1 : 1)),\n` +
    `};\n`;
}

function renderFunctions(value) {
  // One line per action, sorted: two PRs collide here only when their new ids sort side by side.
  const lines = value.actions.map((action) =>
    `  ${JSON.stringify(action.actionId)}: ${JSON.stringify({
      callable: action.callable,
      controlPlane: action.controlPlane === true,
      kind: action.kind,
      roles: action.roles,
    })},`);
  return header() +
    `export const ADMIN_ACTION_CATALOG = {\n${lines.join("\n")}\n} as const;\n\n` +
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
