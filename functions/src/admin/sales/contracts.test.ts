import assert from "node:assert/strict";
import {readdirSync, readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  adminAssignSalesPartnerCallablePayloadSchema,
} from "../../shared/generated/schemas/adminAssignSalesPartnerInput";
import {
  validateAdminAssignSalesPartnerCallablePayload,
} from "../../shared/generated/validators/adminAssignSalesPartnerInput";
import {SALES_ACTION_SCHEMAS, SALES_READ_SCHEMAS} from "./schemas";

const root = path.resolve(__dirname, "../../../../contracts");

// The catalog is one file per workflow under contracts/admin/actions/.
function readCatalog<Action extends {actionId: string}>() {
  const directory = path.join(root, "admin/actions");
  const fragments = readdirSync(directory).map((file) => JSON.parse(
    readFileSync(path.join(directory, file), "utf8")) as {actions: Action[]});
  const actions = fragments.flatMap((fragment) => fragment.actions);
  return {
    actions: actions.sort((a, b) => a.actionId.localeCompare(b.actionId)),
  };
}

test("Sales catalog requests match the runtime validator authority", () => {
  const catalog = readCatalog<{actionId: string; callable: string;
    requestSchema: string}>();
  const actions = {...SALES_READ_SCHEMAS, ...SALES_ACTION_SCHEMAS};
  const entries = catalog.actions.filter((entry) =>
    entry.actionId.startsWith("sales.") &&
    !entry.actionId.startsWith("sales.demo.") &&
    !entry.actionId.startsWith("sales.partners.") &&
    !entry.actionId.startsWith("sales.intelligence.") &&
    !entry.actionId.startsWith("sales.intake.") &&
    !entry.actionId.startsWith("sales.fitQueue.") &&
    !entry.actionId.startsWith("sales.reporting.") &&
    !entry.actionId.startsWith("sales.privacy."));
  assert.equal(entries.length, Object.keys(actions).length);
  for (const entry of entries) {
    const action = entry.actionId.slice("sales.".length);
    const expected = actions[action as keyof typeof actions];
    assert.ok(expected, `Unknown Sales action ${action}`);
    assert.match(entry.callable, /^admin[A-Z]/u);
    const schemaPath = path.join(root, "..", entry.requestSchema);
    const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as
      Record<string, unknown>;
    delete schema.$schema;
    delete schema.$id;
    delete schema.title;
    delete schema.description;
    delete schema["x-callable-aliases"];
    assert.deepEqual(schema, expected, `Contract drift: ${action}`);
  }
});


test("Partner catalog requests match their separate runtime validator", () => {
  const catalog = readCatalog<{actionId: string; callable: string;
    requestSchema: string; example: Record<string, unknown>}>();
  const entries = catalog.actions.filter((entry) =>
    entry.actionId.startsWith("sales.partners."));
  assert.deepEqual(entries.map((entry) => entry.callable),
    ["adminAssignSalesPartner"]);
  const entry = entries[0];
  const schema = JSON.parse(readFileSync(
    path.join(root, "..", entry.requestSchema), "utf8"));
  assert.deepEqual(schema, adminAssignSalesPartnerCallablePayloadSchema);
  assert.equal(validateAdminAssignSalesPartnerCallablePayload(entry.example),
    true);
  for (const field of schema.required as string[]) {
    const incomplete = {...entry.example};
    delete incomplete[field];
    assert.equal(validateAdminAssignSalesPartnerCallablePayload(incomplete),
      false, `Missing partner offer field must be rejected: ${field}`);
  }
  assert.equal(validateAdminAssignSalesPartnerCallablePayload({
    ...entry.example, grantsSendPermission: true,
  }), false);
});
