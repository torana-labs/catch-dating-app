import assert from "node:assert/strict";
import {readdirSync, readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  adminAssignSalesPartnerCallablePayloadSchema,
} from "../../shared/generated/schemas/adminAssignSalesPartnerInput";
import {
  adminGetSalesPartnerAccessCallablePayloadSchema,
} from "../../shared/generated/schemas/adminGetSalesPartnerAccessInput";
import {
  adminRevokeSalesPartnerAccessCallablePayloadSchema,
} from "../../shared/generated/schemas/adminRevokeSalesPartnerAccessInput";
import {
  validateAdminAssignSalesPartnerCallablePayload,
} from "../../shared/generated/validators/adminAssignSalesPartnerInput";
import {
  validateAdminGetSalesPartnerAccessCallablePayload,
} from "../../shared/generated/validators/adminGetSalesPartnerAccessInput";
import {
  validateAdminRevokeSalesPartnerAccessCallablePayload,
} from "../../shared/generated/validators/adminRevokeSalesPartnerAccessInput";
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


// Partner callables validate with their own generated validators, outside
// SALES_READ_SCHEMAS and SALES_ACTION_SCHEMAS.
const PARTNER_VALIDATORS: Record<string, {
  schema: Record<string, unknown>;
  validate: (value: unknown) => boolean;
}> = {
  adminAssignSalesPartner: {
    schema: adminAssignSalesPartnerCallablePayloadSchema,
    validate: validateAdminAssignSalesPartnerCallablePayload,
  },
  adminGetSalesPartnerAccess: {
    schema: adminGetSalesPartnerAccessCallablePayloadSchema,
    validate: validateAdminGetSalesPartnerAccessCallablePayload,
  },
  adminRevokeSalesPartnerAccess: {
    schema: adminRevokeSalesPartnerAccessCallablePayloadSchema,
    validate: validateAdminRevokeSalesPartnerAccessCallablePayload,
  },
};

test("Partner catalog requests match their separate runtime validators", () => {
  const catalog = readCatalog<{actionId: string; callable: string;
    requestSchema: string; example: Record<string, unknown>}>();
  const entries = catalog.actions.filter((entry) =>
    entry.actionId.startsWith("sales.partners."));
  assert.deepEqual(entries.map((entry) => entry.callable).sort(),
    Object.keys(PARTNER_VALIDATORS).sort());
  for (const entry of entries) {
    const {schema: expected, validate} = PARTNER_VALIDATORS[entry.callable];
    const schema = JSON.parse(readFileSync(
      path.join(root, "..", entry.requestSchema), "utf8"));
    assert.deepEqual(schema, expected, `Contract drift: ${entry.callable}`);
    assert.equal(validate(entry.example), true,
      `Catalog example must validate: ${entry.callable}`);
    for (const field of schema.required as string[]) {
      const incomplete = {...entry.example};
      delete incomplete[field];
      assert.equal(validate(incomplete), false,
        `${entry.callable} must reject a missing ${field}`);
    }
  }
  const offer = entries.find((entry) =>
    entry.callable === "adminAssignSalesPartner");
  assert.ok(offer);
  assert.equal(validateAdminAssignSalesPartnerCallablePayload({
    ...offer.example, grantsSendPermission: true,
  }), false);
});
