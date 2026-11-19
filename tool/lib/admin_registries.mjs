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

// The admin action catalog reader is shared with operations/ (catch-admin)
// through packages/command-client, so there is one copy of it.
export {assembleAdminActionCatalog, readAdminActionCatalog} from
  "../../packages/command-client/src/admin-catalog.mjs";
