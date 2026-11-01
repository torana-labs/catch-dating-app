import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {OperationsError} from "../platform/errors.mjs";
import {collectSchema} from "../platform/schema-dependencies.mjs";
import {readAdminActionCatalog} from "../../../tool/lib/admin_registries.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(moduleDirectory, "..", "..", "..");
const defaultCatalogPath = path.join(
  defaultRepoRoot,
  "contracts",
  "admin",
  "admin_action_catalog.json"
);

export async function loadAdminActionCatalog({
  repoRoot = defaultRepoRoot,
  catalogPath = defaultCatalogPath,
} = {}) {
  const catalog = readAdminActionCatalog(catalogPath);
  const validators = await requestValidators(catalog, repoRoot);
  const actionsById = new Map(catalog.actions.map((action) => [
    action.actionId,
    action,
  ]));
  const workflowsById = new Map(catalog.workflows.map((workflow) => [
    workflow.workflowId,
    workflow,
  ]));
  return {
    ...catalog,
    actionsById,
    workflowsById,
    validateRequest(actionId, value) {
      const action = actionsById.get(actionId);
      if (!action) {
        throw new OperationsError(
          "ADMIN_ACTION_UNKNOWN",
          `Unknown admin action: ${actionId}.`,
          {exitCode: 2}
        );
      }
      const validate = validators.get(actionId);
      if (!validate) {
        throw new OperationsError(
          "ADMIN_ACTION_SCHEMA_MISSING",
          `No request validator is available for ${actionId}.`
        );
      }
      if (validate(value)) return value;
      throw new OperationsError(
        "ADMIN_ACTION_INPUT_INVALID",
        `Invalid input for ${actionId}.`,
        {
          exitCode: 2,
          details: {
            issues: (validate.errors ?? []).map((error) => ({
              instancePath: error.instancePath || "/",
              keyword: error.keyword,
              message: error.message,
            })),
          },
        }
      );
    },
  };
}

async function requestValidators(catalog, repoRoot) {
  const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
  addFormats(ajv);
  const schemas = new Map();
  for (const action of catalog.actions) {
    const schemaPath = path.resolve(repoRoot, action.requestSchema);
    await collectSchema(schemaPath, schemas);
  }
  for (const schema of schemas.values()) ajv.addSchema(schema);
  return new Map(catalog.actions.map((action) => {
    const schemaPath = path.resolve(repoRoot, action.requestSchema);
    const schema = schemas.get(schemaPath);
    const validate = schema?.$id ? ajv.getSchema(schema.$id) : null;
    if (!validate) {
      throw new OperationsError(
        "ADMIN_ACTION_SCHEMA_MISSING",
        `Unable to compile ${action.requestSchema} for ${action.actionId}.`
      );
    }
    return [action.actionId, validate];
  }));
}

export function publicAction(action) {
  return {
    actionId: action.actionId,
    callable: action.callable,
    workflowIds: action.workflowIds,
    guiPath: action.guiPath,
    kind: action.kind,
    risk: action.risk,
    roles: action.roles,
    confirmation: action.confirmation ?? "none",
    targetField: action.targetField ?? null,
    requestSchema: action.requestSchema,
    summary: action.summary,
    controlPlane: action.controlPlane === true,
  };
}
