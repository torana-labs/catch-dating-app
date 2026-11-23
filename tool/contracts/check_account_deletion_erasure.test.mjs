import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  checkAccountDeletionErasure,
  coverageTable,
  erasurePath,
  markdownCell,
  uidFieldPattern,
} from "./check_account_deletion_erasure.mjs";
import {writeFirestoreContract} from "./lib/firestore_contract.mjs";

const checker = fileURLToPath(new URL("./check_account_deletion_erasure.mjs", import.meta.url));
const repoRoot = path.resolve(path.dirname(checker), "../..");
const handler = "functions/src/safety/accountDeletion.ts";

function schema(collectionPath, properties, extra = {}) {
  return {"$schema": "http://json-schema.org/draft-07/schema#", "type": "object",
    "x-firestore-path": collectionPath, properties, ...extra};
}

function fixture(t, {collections, schemas, entries, handlerSource}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-erasure-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value, null, 2));
  };
  writeFirestoreContract(root, {collections});
  for (const [name, body] of Object.entries(schemas)) write(`contracts/firestore/${name}`, body);
  write(handler, handlerSource ?? "db.collection(\"savedEvents\").where(\"uid\", \"==\", uid);\n");
  write(erasurePath, {description: "fixture", handlers: [handler], collections: entries});
  return root;
}

const baseCollections = [
  {id: "events", path: "events/{eventId}"},
  {id: "savedEvents", path: "savedEvents/{savedEventId}"},
  {id: "adminAuditLogs", path: "adminAuditLogs/{logId}"},
];
const baseSchemas = {
  "events.schema.json": schema("events/{eventId}", {title: {type: "string"}, uidCount: {type: "integer"}}),
  "saved_events.schema.json": schema("savedEvents/{savedEventId}", {uid: {type: "string"}}),
  "admin_audit_logs.schema.json": schema("adminAuditLogs/{logId}", {actorUid: {type: "string"}}),
};
const baseEntries = {
  adminAuditLogs: {handling: "kept", reason: "Staff audit trail of an operator action."},
  savedEvents: {handling: "deleted", how: "queueSavedEventCleanup deletes them."},
};

test("passes when every uid-bearing collection has an entry the flow honours", t => {
  const root = fixture(t, {collections: baseCollections, schemas: baseSchemas, entries: baseEntries});
  const {errors, rows} = checkAccountDeletionErasure(root);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((row) => row.id), ["adminAuditLogs", "savedEvents"]);
  assert.match(coverageTable(rows), /\| savedEvents \| uid \| deleted \|/u);
});

test("a fixture collection with a uid field and no entry fails", t => {
  const root = fixture(t, {
    collections: [...baseCollections, {id: "guestNotes", path: "guestNotes/{noteId}"}],
    schemas: {...baseSchemas, "guest_notes.schema.json": schema("guestNotes/{noteId}", {guestUid: {type: "string"}})},
    entries: baseEntries,
  });
  const {errors} = checkAccountDeletionErasure(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^guestNotes \(guestNotes\/\{noteId\}\) holds guestUid but has no erasure entry/u);
  const run = spawnSync(process.execPath, [checker, "--root", root], {encoding: "utf8"});
  assert.equal(run.status, 1);
  assert.match(run.stdout, /\| guestNotes \| guestUid \| MISSING \|/u);
  assert.match(run.stderr, /guestNotes .* has no erasure entry/u);
});

test("nested, $ref'd and path-keyed uids count; look-alike counters do not", t => {
  const root = fixture(t, {
    collections: [...baseCollections,
      {id: "pairs", path: "pairs/{pairId}"},
      {id: "drafts", path: "drafts/{uid}"}],
    schemas: {...baseSchemas,
      "pairs.schema.json": schema("pairs/{pairId}", {slots: {type: "array", items: {$ref: "#/definitions/slot"}}},
        {definitions: {slot: {type: "object", properties: {peerUid: {type: "string"}}}}}),
      "drafts.schema.json": schema("drafts/{uid}", {text: {type: "string"}})},
    entries: baseEntries,
  });
  const missing = checkAccountDeletionErasure(root).errors;
  assert.equal(missing.length, 2);
  assert.match(missing.find((error) => error.startsWith("drafts")), /holds \(path \{uid\}\)/u);
  assert.match(missing.find((error) => error.startsWith("pairs")), /holds slots\[\]\.peerUid/u);
  for (const name of ["uid", "peerUid", "selectedUids", "reporterUserId", "hostUserIds", "userId"]) {
    assert.ok(uidFieldPattern.test(name), name);
  }
  for (const name of ["uidCount", "perUidDailyReads", "guidance", "organizerId"]) {
    assert.ok(!uidFieldPattern.test(name), name);
  }
});

test("a deleted entry the deletion flow never writes fails", t => {
  const root = fixture(t, {collections: baseCollections, schemas: baseSchemas, entries: baseEntries,
    handlerSource: "// nothing here\n"});
  assert.deepEqual(checkAccountDeletionErasure(root).errors, [
    `${erasurePath} savedEvents: marked deleted, but ${handler} never name "savedEvents"; ` +
      "write the deletion in the flow, or say why it is kept",
  ]);
});

test("malformed, stale and unordered entries fail", t => {
  const root = fixture(t, {collections: baseCollections, schemas: baseSchemas, entries: {
    savedEvents: {handling: "kept", needsDecision: true},
    adminAuditLogs: {handling: "deleted-ish", reason: "Staff audit trail of an operator action."},
    retiredThing: {handling: "notPersonal", reason: "Gone a long time ago."},
  }});
  const errors = checkAccountDeletionErasure(root).errors;
  assert.ok(errors.some((error) => /keep collections in alphabetical order/u.test(error)));
  assert.ok(errors.some((error) => /retiredThing is not a collection/u.test(error)));
  assert.ok(errors.some((error) => /adminAuditLogs: handling must be one of/u.test(error)));
  assert.ok(errors.some((error) => /savedEvents: a kept entry gives its reason/u.test(error)));
});

test("needsDecision belongs only on kept entries", t => {
  const root = fixture(t, {collections: baseCollections, schemas: baseSchemas, entries: {
    ...baseEntries,
    savedEvents: {handling: "deleted", how: "queueSavedEventCleanup deletes them.", needsDecision: true},
  }});
  assert.deepEqual(checkAccountDeletionErasure(root).errors,
    [`${erasurePath} savedEvents: needsDecision is only "true" on a kept entry`]);
});

test("the repository's erasure entries cover every uid-bearing collection", () => {
  const {errors, rows} = checkAccountDeletionErasure(repoRoot);
  assert.deepEqual(errors, []);
  for (const id of ["participantSignalFacts", "eventSuccessFeedback", "eventSuccessCompatibilityResponses",
    "eventSuccessConversationGraphs", "eventRuntimeParticipants"]) {
    assert.equal(rows.find((row) => row.id === id)?.handling, "deleted", id);
  }
});

test("table cells escape backslashes before pipes", () => {
  assert.equal(markdownCell("a|b"), "a\\|b");
  assert.equal(markdownCell("a\\|b"), "a\\\\\\|b");
  assert.equal(markdownCell("one\ntwo"), "one two");
});
