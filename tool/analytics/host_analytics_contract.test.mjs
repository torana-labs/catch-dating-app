import assert from "node:assert/strict";
import test from "node:test";
import {hostExports, hostRawViews, inspectHostExtensions, inspectHostSchedule} from "./host_analytics_contract.mjs";

const projectId = "fixture-project";
const extensions = () => Object.entries(hostExports).map(([instanceId, config]) => ({
  instanceId,
  state: "ACTIVE",
  extension: "firebase/firestore-bigquery-export",
  version: "0.3.2",
  params: {
    COLLECTION_PATH: config.collectionPath,
    TABLE_ID: config.tableId,
    BIGQUERY_PROJECT_ID: projectId,
    DATASET_ID: "catch_analytics",
    DATASET_LOCATION: "asia-south1",
    DATABASE: "(default)",
    DATABASE_REGION: "asia-south1",
  },
}));
const inspect = (instances) => inspectHostExtensions(instances, projectId);
const schedule = (override = {}) => ({
  name: "projects/fixture/locations/asia-south1/transferConfigs/fixture",
  dataSourceId: "scheduled_query",
  displayName: "Fixture refresh",
  state: "SUCCEEDED",
  params: {query: "SELECT 1;\n"},
  ...override,
});
const inspectSchedule = (configs) => inspectHostSchedule(configs, "Fixture refresh", "SELECT 1;\n");

test("one export per host collection, each with its own latest view", () => {
  assert.equal(Object.keys(hostExports).length, 8);
  assert.deepEqual(hostExports["bq-host-organizers"], {
    collectionPath: "organizers", tableId: "organizers", requiredInMart: true,
  });
  assert.deepEqual(hostRawViews, Object.values(hostExports).map(({tableId}) => `${tableId}_raw_latest`).sort());
  assert.ok(inspect(extensions()).every(({ok}) => ok));
});

test("an export is incomplete until its collection and table both match", () => {
  const instances = extensions();
  instances[0].params.COLLECTION_PATH = "other";
  instances[0].params.TABLE_ID = "other";
  assert.deepEqual(inspect(instances)[0].mismatches.map(({field}) => field), ["COLLECTION_PATH", "TABLE_ID"]);
  instances[0].params.COLLECTION_PATH = "organizers";
  assert.deepEqual(inspect(instances)[0].mismatches.map(({field}) => field), ["TABLE_ID"]);
});

test("extension checks reject missing, duplicate, wrong-source, inactive and misdirected exports", () => {
  for (const patch of [
    {state: "PROCESSING"}, {extension: "other/export"}, {version: "0.3.3"},
    {params: {...extensions()[0].params, BIGQUERY_PROJECT_ID: "other-project"}},
    {params: {...extensions()[0].params, DATABASE: "other-database"}},
  ]) {
    const instances = extensions();
    Object.assign(instances[0], patch);
    assert.equal(inspect(instances)[0].ok, false);
  }
  assert.equal(inspect(extensions().slice(1))[0].ok, false);
  assert.equal(inspect([...extensions(), extensions()[0]])[0].ok, false);
  const duplicateExporter = {...extensions()[0], instanceId: "bq-host-organizers-copy"};
  assert.equal(inspect([...extensions(), duplicateExporter]).at(-1).ok, false);
  assert.ok(inspect([...extensions(), {instanceId: "other-unrelated-extension"}]).every(({ok}) => ok));
});

test("scheduled query must match exact reviewed source, with hashes but no query payload", () => {
  const matching = inspectSchedule([schedule()]);
  assert.equal(matching.ok, true);
  assert.equal(matching.matches[0].querySha256, matching.expectedQuerySha256);
  assert.equal(Object.hasOwn(matching.matches[0], "params"), false);
  const stale = inspectSchedule([schedule({params: {query: "DELETE FROM legacy;"}})]);
  assert.equal(stale.ok, false);
  assert.equal(stale.matches[0].queryMatchesSource, false);
  assert.equal(inspectSchedule([schedule({params: {}})]).ok, false);
});

test("failed, disabled, duplicate, missing and wrong-kind schedules are incomplete", () => {
  for (const patch of [
    {state: "FAILED"}, {disabled: true},
    {scheduleOptions: {disableAutoScheduling: true}},
    {scheduleOptionsV2: {manualSchedule: {}}},
    {name: null}, {dataSourceId: "other_source"},
  ]) assert.equal(inspectSchedule([schedule(patch)]).ok, false);
  assert.equal(inspectSchedule([]).ok, false);
  assert.equal(inspectSchedule([schedule(), schedule()]).ok, false);
  assert.equal(inspectSchedule([schedule({scheduleOptionsV2: {timeBasedSchedule: {schedule: "every day 22:30"}}})]).ok, true);
});
