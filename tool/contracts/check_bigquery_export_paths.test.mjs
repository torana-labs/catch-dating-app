import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {checkBigQueryExportPaths} from "./check_bigquery_export_paths.mjs";
import {writeFirestoreContract} from "./lib/firestore_contract.mjs";

const checker = fileURLToPath(new URL("./check_bigquery_export_paths.mjs", import.meta.url));
const SOURCE = "firebase/firestore-bigquery-export@0.3.2";

function fixture(t, {envs, extensions, hostExports} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-bq-exports-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
  };
  writeFirestoreContract(root, {collections: [
    {id: "events", path: "events/{eventId}"},
    {id: "guestPayments", path: "guestPayments/{paymentId}"},
    {id: "pushInstallations", path: "users/{uid}/pushInstallations/{installationId}"},
  ]});
  const envFiles = envs ?? {
    "bq-host-events": "COLLECTION_PATH=events\nTABLE_ID=events\n",
    "bq-host-guest-payments": "# guest payments\nCOLLECTION_PATH=guestPayments\nTABLE_ID=guest_payments\n",
  };
  for (const [instance, body] of Object.entries(envFiles)) write(`extensions/${instance}.env`, body);
  write("firebase.json", {extensions: extensions ??
    Object.fromEntries(Object.keys(envFiles).map((instance) => [instance, SOURCE]))});
  if (hostExports) {
    write("tool/analytics/host_analytics_contract.mjs",
      `export const hostExports = ${JSON.stringify(hostExports)};\n`);
  }
  return root;
}

test("accepts exports of registered collections, nested paths included", async t => {
  const root = fixture(t, {envs: {
    "bq-host-events": "COLLECTION_PATH=events\nTABLE_ID=events\n",
    "bq-push": "COLLECTION_PATH=\"users/{userId}/pushInstallations\"\nTABLE_ID=push\n",
  }});
  assert.deepEqual(await checkBigQueryExportPaths(root), []);
});

test("an export of a retired collection fails, the way the payments export should have", async t => {
  const root = fixture(t, {envs: {
    "bq-host-payments": "COLLECTION_PATH=payments\nTABLE_ID=payments\n",
  }});
  assert.deepEqual(await checkBigQueryExportPaths(root), [
    "extensions/bq-host-payments.env: COLLECTION_PATH=payments is not a collection in tool/contracts/firestore_contract; point the export at the live collection or retire the export with its collection",
  ]);
});

test("env files and firebase.json extension instances must match", async t => {
  const root = fixture(t, {extensions: {
    "bq-host-events": SOURCE,
    "bq-host-orphan": SOURCE,
    "unrelated-extension": "firebase/storage-resize-images@0.2.0",
  }});
  assert.deepEqual(await checkBigQueryExportPaths(root), [
    "extensions/bq-host-guest-payments.env: firebase.json lists no firebase/firestore-bigquery-export instance \"bq-host-guest-payments\"",
    "firebase.json: extension instance bq-host-orphan has no extensions/bq-host-orphan.env",
  ]);
});

test("an env file without COLLECTION_PATH fails", async t => {
  const root = fixture(t, {envs: {"bq-host-events": "TABLE_ID=events\n"}});
  assert.deepEqual(await checkBigQueryExportPaths(root),
    ["extensions/bq-host-events.env: COLLECTION_PATH is missing"]);
});

test("the host analytics contract must pin what the env files deploy", async t => {
  const root = fixture(t, {hostExports: {
    "bq-host-events": {collectionPath: "events", tableId: "events"},
    "bq-host-guest-payments": {collectionPath: "payments", tableId: "payments"},
    "bq-host-missing": {collectionPath: "events", tableId: "events"},
  }});
  assert.deepEqual(await checkBigQueryExportPaths(root), [
    "tool/analytics/host_analytics_contract.mjs (bq-host-guest-payments): pins collectionPath payments, but the env file deploys guestPayments",
    "tool/analytics/host_analytics_contract.mjs (bq-host-guest-payments): pins tableId payments, but the env file deploys guest_payments",
    "tool/analytics/host_analytics_contract.mjs (bq-host-missing): no extensions/bq-host-missing.env deploys this export",
  ]);
});

test("the CLI checks this repository and rejects malformed options", () => {
  const passed = spawnSync(process.execPath, [checker], {cwd: os.tmpdir(), encoding: "utf8"});
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /BigQuery export path check passed/u);
  const refused = spawnSync(process.execPath, [checker, "--root"], {encoding: "utf8"});
  assert.equal(refused.status, 64);
});
