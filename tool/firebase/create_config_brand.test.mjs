import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Ajv from "ajv";
import record from "../../packages/brand/brand.json" with {type: "json"};
import {
  configBrandContractSchema,
  configBrandDocument,
  contractSchemaPath,
  renderContractSchema,
} from "./create_config_brand.mjs";

const {$schema: _schema, ...brandRecord} = record;
const contract = JSON.parse(fs.readFileSync(contractSchemaPath, "utf8"));
const validate = new Ajv({allErrors: true, strict: false}).compile(contract);

test("the config/brand payload equals packages/brand/brand.json", () => {
  assert.deepEqual(configBrandDocument(), brandRecord);
});

test("the contract schema is brand.schema.json in draft-07 form", () => {
  assert.equal(fs.readFileSync(contractSchemaPath, "utf8"), renderContractSchema(),
    "contracts/firestore/config_brand.schema.json is stale; run node tool/firebase/create_config_brand.mjs --write-schema");
  assert.equal(contract["x-firestore-path"], "config/brand");
  assert.ok(!JSON.stringify(contract).includes("$defs"));
});

test("the payload satisfies the contract, and the contract refuses a bad record", () => {
  assert.ok(validate(configBrandDocument()), JSON.stringify(validate.errors));
  assert.equal(validate({...brandRecord, web: {...brandRecord.web, origin: "http://insecure.example"}}), false);
  assert.equal(validate({...brandRecord, extra: true}), false);
});

test("$refs are rewritten everywhere, nested ones included", () => {
  const schema = configBrandContractSchema({
    required: ["a"], properties: {$schema: {type: "string"}, a: {type: "object", properties: {b: {$ref: "#/$defs/x"}}}},
    $defs: {x: {anyOf: [{$ref: "#/$defs/y"}]}, y: {type: "string"}},
  });
  assert.deepEqual(schema.properties, {a: {type: "object", properties: {b: {$ref: "#/definitions/x"}}}});
  assert.deepEqual(schema.definitions.x, {anyOf: [{$ref: "#/definitions/y"}]});
});
