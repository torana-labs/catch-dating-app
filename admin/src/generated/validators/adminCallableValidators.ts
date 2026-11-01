// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
// Each Admin area's validators load on that area's first call, so no single
// chunk carries every callable's schemas.
import {
  type AdminCallableValidators,
  missingAdminCallableValidators,
} from "./adminCallableValidation";

export {
  AdminCallableValidationError,
  type AdminCallableValidators,
} from "./adminCallableValidation";

type GroupMeta = {callables: readonly string[]; strictRequests: readonly string[]; strictResponses: readonly string[]};

const metas = import.meta.glob<GroupMeta>("./groups/*.meta.ts", {eager: true, import: "default"});
const loaders = import.meta.glob<AdminCallableValidators>(["./groups/*.ts", "!./groups/*.meta.ts"]);
const groupOf = new Map(Object.entries(metas).flatMap(([file, meta]) =>
  meta.callables.map((callable) => [callable, file.replace(".meta.ts", ".ts")] as const)));
const sorted = (key: keyof GroupMeta) => Object.values(metas).flatMap((meta) => meta[key]).sort();

export const adminCallableValidationCoverage = {
  callables: sorted("callables"),
  strictRequests: sorted("strictRequests"),
  strictResponses: sorted("strictResponses"),
} as const;

/** Loads the validators of the Admin area that owns this callable. */
export async function loadAdminCallableValidators(
  callable: string
): Promise<AdminCallableValidators> {
  const group = groupOf.get(callable);
  const load = group === undefined ? undefined : loaders[group];
  return load ? load() : missingAdminCallableValidators;
}
