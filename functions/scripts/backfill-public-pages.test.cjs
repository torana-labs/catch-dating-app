"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {parseArgs, run} = require("./backfill-public-pages.cjs");

function fakeRebuild(plans) {
  const calls = [];
  return {
    calls,
    listPublicPageScopes: async () => Object.keys(plans),
    planOrganizerScope: async (_db, id) => plans[id],
    planChanges: (plan) => plan.organizerPage !== "unchanged",
    rebuildOrganizerScope: async (_db, id, options) => {
      calls.push({id, options});
      return {status: "committed"};
    },
  };
}

const plans = {
  "a": {organizerId: "a", organizerPage: "create"},
  "b": {organizerId: "b", organizerPage: "unchanged"},
};

test("dry run is the default and never rebuilds", async () => {
  const rebuild = fakeRebuild(plans);
  const lines = [];
  const status = await run(["--project", "demo-x"], {db: {},
    prodProject: "prod-x", rebuild, log: (line) => lines.push(line)});
  assert.equal(status, 0);
  assert.equal(rebuild.calls.length, 0);
  const summary = JSON.parse(lines[0]);
  assert.equal(summary.mode, "dry-run");
  assert.deepEqual(summary.plans.map((plan) => plan.organizerId), ["a"]);
});

test("--check fails while pages are out of date", async () => {
  const status = await run(["--project", "demo-x", "--check"], {db: {},
    prodProject: "prod-x", rebuild: fakeRebuild(plans), log: () => {}});
  assert.equal(status, 1);
});

test("--apply rebuilds every scope without rail fan-out", async () => {
  const rebuild = fakeRebuild(plans);
  const status = await run(["--project", "demo-x", "--apply"], {db: {},
    prodProject: "prod-x", rebuild, log: () => {}});
  assert.equal(status, 0);
  assert.deepEqual(rebuild.calls,
    [{id: "a", options: {fanOut: false}}, {id: "b", options: {fanOut: false}}]);
});

test("prod writes need --allow-prod and arguments are strict", async () => {
  await assert.rejects(run(["--project", "prod-x", "--apply"], {db: {},
    prodProject: "prod-x", rebuild: fakeRebuild(plans), log: () => {}}),
  /--allow-prod/u);
  assert.throws(() => parseArgs(["--project", "demo-x", "--bogus"]));
  assert.throws(() => parseArgs(["--project", "demo-x", "--check",
    "--apply"]), /not both/u);
  assert.throws(() => parseArgs(["--organizer", "a"]), /--project/u);
});
