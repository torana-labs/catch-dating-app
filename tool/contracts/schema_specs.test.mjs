import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {defaultTypeOutput, derivedName, discoverSchemaSpecs} from "./lib/schema_specs.mjs";

const noExceptions = {
  helperDirectories: ["shared"],
  specsInHelperDirectories: [],
  notGenerated: [],
  names: {},
  typeOutputs: {},
  additionalTypeOutputDirectories: {},
};

function discover(schemas, {exceptions = {}, order = []} = {}) {
  const contractRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-schema-specs-"));
  for (const [file, schema] of Object.entries(schemas)) {
    fs.mkdirSync(path.dirname(path.join(contractRoot, file)), {recursive: true});
    fs.writeFileSync(path.join(contractRoot, file), JSON.stringify(schema));
  }
  try {
    return discoverSchemaSpecs({contractRoot, exceptions: {...noExceptions, ...exceptions}, order});
  } finally {
    fs.rmSync(contractRoot, {recursive: true});
  }
}

test("a title names the type, in any of the shapes the contracts use", () => {
  assert.equal(derivedName({title: "CreateEventCallablePayload"}), "CreateEventCallablePayload");
  assert.equal(derivedName({title: "adminReviewPolicyPayload"}), "AdminReviewPolicyPayload");
  assert.equal(derivedName({title: "Join Waitlist HTTP Request"}), "JoinWaitlistHTTPRequest");
  assert.equal(derivedName({title: "salesPilotPlans document"}), "SalesPilotPlansDocument");
  assert.equal(derivedName({title: "commercial.quotes.accept request"}), null);
  assert.equal(derivedName({}), null);
});

test("adding a schema file is enough to get a spec", () => {
  assert.deepEqual(discover({"firestore/events.schema.json": {title: "EventDocument"}}), [{
    name: "EventDocument",
    source: "firestore/events.schema.json",
    typeOutput: defaultTypeOutput("EventDocument"),
  }]);
});

test("helper schemas, fixtures and listed files are not specs", () => {
  const specs = discover({
    "shared/common.schema.json": {title: "CommonDefinitions"},
    "shared/promoted.schema.json": {title: "PromotedDocument"},
    "firestore/skipped.schema.json": {title: "SkippedDocument"},
    "fixtures/valid/events.json": {title: "NotASchema"},
  }, {exceptions: {
    specsInHelperDirectories: ["shared/promoted.schema.json"],
    notGenerated: ["firestore/skipped.schema.json"],
  }});
  assert.deepEqual(specs.map(({name}) => name), ["PromotedDocument"]);
});

test("exceptions supply what a schema file cannot say", () => {
  const [spec] = discover({"http/join.schema.json": {title: "free text, not a type name"}}, {exceptions: {
    names: {"http/join.schema.json": "JoinHTTPRequest"},
    typeOutputs: {JoinHTTPRequest: "functions/src/shared/generated/joinHttpRequest.ts"},
    additionalTypeOutputDirectories: {"website/generated": ["JoinHTTPRequest"]},
  }});
  assert.deepEqual(spec, {
    name: "JoinHTTPRequest",
    source: "http/join.schema.json",
    typeOutput: "functions/src/shared/generated/joinHttpRequest.ts",
    additionalTypeOutputs: ["website/generated/joinHttpRequest.ts"],
  });
});

test("specs keep their recorded order, and unrecorded specs follow sorted by source", () => {
  const names = discover({
    "firestore/a.schema.json": {title: "ADocument"},
    "firestore/b.schema.json": {title: "BDocument"},
    "firestore/c.schema.json": {title: "CDocument"},
    "firestore/d.schema.json": {title: "DDocument"},
  }, {order: ["CDocument", "RemovedDocument", "ADocument"]}).map(({name}) => name);
  assert.deepEqual(names, ["CDocument", "ADocument", "BDocument", "DDocument"]);
});

test("schemas and exceptions that cannot be honoured fail with the file named", () => {
  assert.throws(() => discover({"firestore/a.schema.json": {}}), /contracts\/firestore\/a\.schema\.json needs a title/u);
  assert.throws(() => discover({
    "firestore/a.schema.json": {title: "SameDocument"},
    "firestore/b.schema.json": {title: "SameDocument"},
  }), /both give name SameDocument/u);
  assert.throws(() => discover({}, {exceptions: {notGenerated: ["firestore/gone.schema.json"]}}),
    /notGenerated names firestore\/gone\.schema\.json/u);
  assert.throws(() => discover({}, {exceptions: {typeOutputs: {GoneDocument: "x.ts"}}}),
    /typeOutputs names GoneDocument/u);
  assert.throws(() => discover({}, {exceptions: {additionalTypeOutputDirectories: {admin: ["GoneDocument"]}}}),
    /additionalTypeOutputDirectories names GoneDocument/u);
});
