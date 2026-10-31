/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import type {AdminSearchPeopleCallableResponse} from "../shared/generated/adminSearchPeopleCallableResponse";
import {adminSearchPeopleHandler, peopleIndexDocument, syncPeopleIndex} from "./peopleSearch";

const validate = contractValidator<AdminSearchPeopleCallableResponse>("AdminSearchPeopleCallableResponse");
const now = new Date("2026-10-31T12:00:00.000Z");

async function harness() {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  await syncPeopleIndex(firestore, "riya_uid_1", {name: "Riya Sharma", phoneNumber: "+919820040000", city: "in-mh-mumbai"}, now);
  await syncPeopleIndex(firestore, "rishi_uid_2", {firstName: "Rishi", lastName: "Kapoor", phoneNumber: "+919811112222"}, now);
  await syncPeopleIndex(firestore, "gone_uid_3", undefined, now);
  const deps = {firestore: () => firestore, serverTimestamp: () => "SERVER_TIMESTAMP" as never};
  const search = (query: string, token: Record<string, unknown> = {support: true}) =>
    adminSearchPeopleHandler(({auth: {uid: "dev", token}, data: {query, limit: 10}, rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>, deps);
  return {db, search};
}

test("the people index keeps name prefixes and phone digits, and masks the phone", () => {
  const entry = peopleIndexDocument("u1", {name: "Riya Sharma", phoneNumber: "+91 98200 40000"}, now);
  assert.ok(entry);
  assert.equal(entry.phoneMasked, "+91 ••••• 40000");
  for (const token of ["r", "riya", "sh", "sharma", "919820040000", "98200", "9820040000"]) {
    assert.ok(entry.tokens.includes(token), token);
  }
  assert.equal(peopleIndexDocument("u1", undefined, now), null);
});

test("people search finds by name, phone or user id, and every search is audited", async () => {
  const h = await harness();
  const byName = await h.search("ri");
  assert.equal(validate(byName), true);
  assert.equal(byName.kind, "name");
  assert.deepEqual(byName.rows.map((row) => row.uid).sort(), ["rishi_uid_2", "riya_uid_1"]);
  assert.deepEqual((await h.search("Riya Sh")).rows.map((row) => row.uid), ["riya_uid_1"]);
  const byPhone = await h.search("+91 98200 40000");
  assert.equal(byPhone.kind, "phone");
  assert.deepEqual(byPhone.rows.map((row) => [row.uid, row.phone, row.city]), [["riya_uid_1", "+91 ••••• 40000", "Mumbai"]]);
  assert.deepEqual((await h.search("98111")).rows.map((row) => row.uid), ["rishi_uid_2"]);
  const byUid = await h.search("rishi_uid_2");
  assert.equal(byUid.kind, "uid");
  assert.equal(byUid.rows[0].name, "Rishi Kapoor");
  const audits = h.db.entries().filter(([path]) => path.startsWith("adminAuditLogs/")).map(([, value]) => value);
  assert.equal(audits.length, 5);
  assert.deepEqual(audits[2].after, {query: "+91 98200 40000", kind: "phone", resultCount: 1});
  await assert.rejects(h.search("riya", {salesStaff: true}), /not authorized/);
});
