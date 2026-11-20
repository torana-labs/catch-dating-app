"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateApplyTarget,
} = require("../scripts/operations/import-shadow-projection.cjs");

const aliases = {
  dev: "catchdates-dev",
  prod: "catch-dating-app-64e51",
};

test("projection apply target must match its configured environment alias", () => {
  assert.throws(() => validateApplyTarget({
    environment: "dev",
    projectId: aliases.prod,
    allowProd: false,
    aliases,
    productionTarget: true,
  }), {code: "invalid_argument"});
  assert.throws(() => validateApplyTarget({
    environment: "prod",
    projectId: aliases.dev,
    allowProd: true,
    aliases,
    productionTarget: true,
  }), {code: "invalid_argument"});
});

test("projection apply requires explicit production confirmation by project id", () => {
  assert.throws(() => validateApplyTarget({
    environment: "prod",
    projectId: aliases.prod,
    allowProd: false,
    aliases,
    productionTarget: true,
  }), {code: "invalid_argument"});
  assert.deepEqual(validateApplyTarget({
    environment: "prod",
    projectId: aliases.prod,
    allowProd: true,
    aliases,
    productionTarget: true,
  }), {
    environment: "prod",
    projectId: aliases.prod,
    productionTarget: true,
  });
});

test("projection apply accepts the configured non-production target", () => {
  assert.deepEqual(validateApplyTarget({
    environment: "dev",
    projectId: aliases.dev,
    allowProd: false,
    aliases,
    productionTarget: false,
  }), {
    environment: "dev",
    projectId: aliases.dev,
    productionTarget: false,
  });
});
