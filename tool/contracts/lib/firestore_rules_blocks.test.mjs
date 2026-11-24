import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedMethods,
  normalizeFirestorePath,
  parseRulesMatchBlocks,
  rulesPathGoverns,
} from "./firestore_rules_blocks.mjs";

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthed() { return request.auth != null; }
    // match /commented/{id} { allow read: if true; }
    /* match /blockComment/{id} {} */
    match /users/{uid} {
      allow read: if isAuthed() && request.auth.uid == uid;
      allow create: if isAuthed();
      allow update, delete: if false;
      match /pushInstallations/{installationId} {
        allow write: if request.auth.uid == uid;
      }
    }
    match /config/{docId} {
      allow read, write: if false;
    }
    match /sales/{privateDocument=**} {
      allow read, write: if false;
    }
  }
}`;

test("parses every match block with its full nested path and line", () => {
  const blocks = parseRulesMatchBlocks(rules);
  assert.deepEqual(blocks.map(({path, line}) => [path, line]), [
    ["/users/{uid}", 7],
    ["/users/{uid}/pushInstallations/{installationId}", 11],
    ["/config/{docId}", 15],
    ["/sales/{privateDocument=**}", 18],
  ]);
  assert.equal(blocks[0].body.includes("pushInstallations"), false,
    "a block body excludes nested match blocks");
});

test("allowedMethods expands read and write and drops denied statements", () => {
  const [users, push, config] = parseRulesMatchBlocks(rules);
  assert.deepEqual([...allowedMethods(users)].sort(), ["create", "get", "list"]);
  assert.deepEqual([...allowedMethods(push)].sort(), ["create", "delete", "update"]);
  assert.deepEqual([...allowedMethods(config)], []);
});

test("a bare fragment without a documents block is all top level", () => {
  assert.deepEqual(parseRulesMatchBlocks("match /items/{id} {}").map((b) => b.path),
    ["/items/{id}"]);
});

test("rulesPathGoverns handles placeholders, literals, composite ids and recursive wildcards", () => {
  assert.equal(rulesPathGoverns("/config/{docId}", "config/publicContact"), true);
  assert.equal(rulesPathGoverns("/views/{viewId}", "views/{programId}__{alertId}"), true);
  assert.equal(rulesPathGoverns("/sales/{privateDocument=**}", "sales/{id}/rows/{rowId}"), true);
  assert.equal(rulesPathGoverns("/sales/{privateDocument=**}", "salesArchive/{id}"), false);
  assert.equal(rulesPathGoverns("/users/{uid}", "users/{uid}/pushInstallations/{id}"), false);
  assert.equal(rulesPathGoverns("/config/brand", "config/publicContact"), false);
});

test("normalizeFirestorePath erases placeholder names", () => {
  assert.equal(normalizeFirestorePath("/users/{uid}/items/{itemId}"), "users/{}/items/{}");
});
