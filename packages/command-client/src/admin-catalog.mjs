import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

// The admin action catalog is an index, contracts/admin/admin_action_catalog.json,
// plus one file per workflow under contracts/admin/actions/, so two PRs adding
// different workflows touch different files. This reads them back as one
// document for tool/ (generators, checks) and operations/ (catch-admin) alike.

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(moduleDirectory, "..", "..", "..");
export const adminActionCatalogPath = path.join(defaultRepoRoot,
  "contracts", "admin", "admin_action_catalog.json");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

/**
 * One catalog document from its index and its files under actions/. Actions
 * and workflows come back sorted, and a workflow lists the actions that name it.
 */
export function assembleAdminActionCatalog(index, fragments) {
  const byId = (a, b) => (a.actionId < b.actionId ? -1 : a.actionId > b.actionId ? 1 : 0);
  const actions = fragments.flatMap((fragment) => fragment.actions).sort(byId);
  const workflows = fragments.flatMap((fragment) => fragment.workflow ? [fragment.workflow] : [])
    .map((workflow) => ({
      ...workflow,
      actions: actions.filter((action) => action.workflowIds.includes(workflow.workflowId))
        .map((action) => action.actionId),
    }));
  return {...index, actions, workflows};
}

/** The index plus every actions/*.json beside it. A catalog that is already one document (a test fixture) is used as it is. */
export function readAdminActionCatalog(catalogPath = adminActionCatalogPath) {
  const index = readJson(catalogPath);
  if (index.actions) return index;
  const directory = path.join(path.dirname(catalogPath), "actions");
  const fragments = fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort()
    .map((name) => readJson(path.join(directory, name)));
  return assembleAdminActionCatalog(index, fragments);
}
