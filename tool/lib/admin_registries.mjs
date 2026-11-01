// The Admin registries are split into one file per feature, so two PRs adding
// different features touch different files. These read them back as one document.
import fs from "node:fs";
import path from "node:path";
import {fromRepo} from "./repo_paths.mjs";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const jsonFiles = (directory) => fs.readdirSync(directory)
  .filter((name) => name.endsWith(".json")).sort()
  .map((name) => path.join(directory, name));

export const adminComponentRegistryPath = "design/admin/components.json";

/** design/admin/components.json plus every design/admin/components/*.json. */
export function readAdminComponentRegistry() {
  return {
    ...readJson(fromRepo(adminComponentRegistryPath)),
    components: jsonFiles(fromRepo("design/admin/components"))
      .flatMap((file) => readJson(file).components),
  };
}

/** Reads a design registry by path, whichever way it is stored. */
export function readDesignRegistry(relativePath) {
  return relativePath === adminComponentRegistryPath ?
    readAdminComponentRegistry() : readJson(fromRepo(relativePath));
}

/**
 * contracts/admin/admin_action_catalog.json plus every contracts/admin/actions/*.json. Actions
 * and workflows come back sorted, and a workflow lists the actions that name it.
 */
export function readAdminActionCatalog(catalogPath = fromRepo("contracts/admin/admin_action_catalog.json")) {
  const index = readJson(catalogPath);
  // A catalog that is already one document (a test fixture) is used as it is.
  if (index.actions) return index;
  const fragments = jsonFiles(path.join(path.dirname(catalogPath), "actions")).map(readJson);
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
