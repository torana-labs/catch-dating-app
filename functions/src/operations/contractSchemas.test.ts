import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import Ajv, {AnySchema} from "ajv";
import addFormats from "ajv-formats";
import {listIntakeOperationsRateLimit} from "../admin/intakeOperations";
import {MAX_OPERATION_WORK_ITEMS_PER_RUN} from "./models";

const schemaNames = [
  "common",
  "run",
  "work_item",
  "action_receipt",
  "decision",
  "lease",
  "publication_plan",
  "rule_proposal",
  "rule_evaluation",
  "workflow_manifest",
] as const;

function contractsDirectory(): string {
  const candidates = [
    path.resolve(process.cwd(), "contracts/operations"),
    path.resolve(process.cwd(), "../contracts/operations"),
    path.resolve(__dirname, "../../../contracts/operations"),
  ];
  const directory = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(directory, "contracts/operations directory should be discoverable");
  return directory;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function contractValidator(directory: string): Ajv {
  const schemas = new Map<string, AnySchema>();
  const load = (file: string) => {
    if (schemas.has(file)) return;
    const schema = readJson(file) as AnySchema;
    schemas.set(file, schema);
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const ref = (value as {$ref?: string}).$ref;
      if (ref && !ref.startsWith("#")) {
        load(path.resolve(path.dirname(file), ref.split("#")[0]));
      }
      Object.values(value).forEach(visit);
    };
    visit(schema);
  };
  for (const name of schemaNames) {
    load(path.join(directory, `${name}.schema.json`));
  }
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  for (const schema of schemas.values()) ajv.addSchema(schema);
  return ajv;
}

test("draft-07 operation schemas accept their canonical fixtures", () => {
  const directory = contractsDirectory();
  const ajv = contractValidator(directory);
  for (const name of schemaNames.filter((name) => name !== "common")) {
    const schemaId = `https://catch.app/contracts/operations/${name}.schema.json`;
    const fixture = readJson(path.join(
      directory,
      "fixtures",
      "valid",
      `${name}.json`
    ));
    const validate = ajv.getSchema(schemaId);
    assert.ok(validate, `validator should exist for ${name}`);
    assert.equal(
      validate(fixture),
      true,
      `${name}: ${JSON.stringify(validate.errors)}`
    );
  }
});

test("draft-07 operation schemas reject unsafe lifecycle fixtures", () => {
  const directory = contractsDirectory();
  const ajv = contractValidator(directory);
  const fixtures = [
    ["work_item", "work_item_terminal_without_outcome"],
    ["work_item", "work_item_terminal_human_review"],
    ["rule_proposal", "rule_proposal_without_approval"],
  ] as const;
  for (const [schemaName, fixtureName] of fixtures) {
    const fixture = readJson(path.join(
      directory,
      "fixtures",
      "invalid",
      `${fixtureName}.json`
    )) as {document: unknown};
    const validate = ajv.getSchema(
      `https://catch.app/contracts/operations/${schemaName}.schema.json`
    );
    assert.ok(validate, `validator should exist for ${schemaName}`);
    assert.equal(validate(fixture.document), false, fixtureName);
  }
});

test("two maximum exception inventories fit inside one admin rate " +
  "window", () => {
  const directory = contractsDirectory();
  const runSchema = readJson(path.join(directory, "run.schema.json")) as {
    properties: {budgets: {properties: {maxWorkItems: {maximum: number}}}};
  };
  const callableSchema = readJson(path.join(
    directory,
    "..",
    "callables",
    "admin_list_intake_operations_payload.schema.json"
  )) as {properties: {workItemLimit: {maximum: number}}};
  const runLimit = runSchema.properties.budgets.properties.maxWorkItems.maximum;
  const pageLimit = callableSchema.properties.workItemLimit.maximum;
  const requestLimit = listIntakeOperationsRateLimit.maxRequests;

  assert.equal(runLimit, MAX_OPERATION_WORK_ITEMS_PER_RUN);
  assert.ok(
    (1 + Math.ceil(runLimit / pageLimit)) * 2 <= requestLimit,
    JSON.stringify({runLimit, pageLimit, requestLimit})
  );
  assert.ok(
    2 * Math.ceil(runLimit / pageLimit) - 1 <= requestLimit,
    JSON.stringify({runLimit, pageLimit, requestLimit})
  );
});

test("Firestore declares the canonical human-review queue index", () => {
  const directory = contractsDirectory();
  const indexes = readJson(path.resolve(
    directory,
    "..",
    "..",
    "firestore.indexes.json"
  )) as {
    indexes: Array<{
      collectionGroup: string;
      queryScope: string;
      fields: Array<Record<string, string>>;
    }>;
  };
  assert.ok(indexes.indexes.some((index) =>
    index.collectionGroup === "operationWorkItems" &&
    index.queryScope === "COLLECTION" &&
    JSON.stringify(index.fields) === JSON.stringify([
      {fieldPath: "workflowId", mode: "ASCENDING"},
      {fieldPath: "runId", mode: "ASCENDING"},
      {fieldPath: "taskFlags", arrayConfig: "CONTAINS"},
      {fieldPath: "__name__", mode: "ASCENDING"},
    ])));
});
