import assert from "node:assert/strict";
import test from "node:test";
import {planPublicContactChange, runPublicContactChange} from "./publicContactOperator.mjs";
import {brand} from "@catch/brand";

const doc = (revision, supportEmail) => ({schemaVersion: 1, revision, supportEmail});

test("initial write is revision one and a later edit advances only the selected document", async () => {
  let current = null;
  const writes = [];
  const ref = {path: "config/publicContact", async get() {return {exists: current !== null, data: () => current};}};
  const db = {
    doc(path) {assert.equal(path, ref.path); return ref;},
    async runTransaction(fn) {return fn({get: () => ref.get(), set(target, value) {
      assert.equal(target, ref); writes.push(value); current = value;
    }});},
  };
  const first = await runPublicContactChange(db, {expectedRevision: "absent", supportEmail: brand.support.email, apply: false});
  assert.equal(first.applied, false);
  assert.equal(writes.length, 0);
  assert.deepEqual(first.after, doc(1, brand.support.email));
  await runPublicContactChange(db, {expectedRevision: "absent", supportEmail: brand.support.email, apply: true});
  await runPublicContactChange(db, {expectedRevision: 1, supportEmail: "support@example.org", apply: true});
  assert.deepEqual(writes, [doc(1, brand.support.email), doc(2, "support@example.org")]);
  assert.throws(() => planPublicContactChange(current, 1, brand.support.email), /revision changed/u);
  assert.deepEqual(planPublicContactChange(current, 2, brand.support.email).after,
    doc(3, brand.support.email));
});

test("rejects malformed existing data and unsafe destinations", () => {
  assert.throws(() => planPublicContactChange({secret: true}, "absent", brand.support.email), /malformed/u);
  assert.throws(() => planPublicContactChange(null, "absent", "a@example.org?subject=bad"), /Invalid/u);
  assert.throws(() => planPublicContactChange(null, "absent", "a@example.org\r\nBcc:bad"), /Invalid/u);
  assert.throws(() => planPublicContactChange(null, "absent", "a%0d%0a@example.org"), /Invalid/u);
});
