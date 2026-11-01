/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../operations/testFirestore";
import {contractValidator} from "../../shared/contractTestValidators";
import type {AdminListMyNominationsCallableResponse} from "../../shared/generated/adminListMyNominationsCallableResponse";
import {adminListMyNominationsHandler} from "./myNominations";

const validate = contractValidator<AdminListMyNominationsCallableResponse>("AdminListMyNominationsCallableResponse");

function item(itemId: string, nominatorUid: string, waitingSince: string, overrides: Record<string, unknown>) {
  return {schemaVersion: 1, itemId, type: "listing", sourceKind: "supplyIntakeRequest", sourceId: itemId,
    sourcePath: `supplyIntakeRequests/${itemId}`, title: itemId, subtitle: null, cameFrom: "Sales associate on WhatsApp",
    nominatorUid, city: "mumbai", state: {code: "ready", label: "Ready to decide", tone: "success"}, status: "waiting",
    waitingSince, updatedAt: waitingSince, doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null, ...overrides};
}

test("a sales associate sees only what they nominated, newest first, with totals per filter", async () => {
  const db = new FakeFirestore();
  db.write("adminInboxItems/supply-afterfly", item("supply-afterfly", "riya", "2026-10-28T10:00:00.000Z",
    {status: "done", doneAt: "2026-10-31T07:50:00.000Z", state: {code: "approved", label: "Approved and published", tone: "success"}}));
  db.write("adminInboxItems/supply-small", item("supply-small", "riya", "2026-10-30T10:00:00.000Z", {}));
  db.write("adminInboxItems/supply-sunday", item("supply-sunday", "riya", "2026-10-31T11:00:00.000Z",
    {type: "stuck", state: {code: "needs_person", label: "Needs a person", tone: "danger"}}));
  db.write("adminInboxItems/supply-other", item("supply-other", "karan", "2026-10-31T09:00:00.000Z", {}));
  const deps = {firestore: () => db as unknown as FirebaseFirestore.Firestore, now: () => new Date("2026-10-31T12:00:00.000Z")};
  const list = (data: Record<string, unknown>, token: Record<string, unknown> = {salesStaff: true}) =>
    adminListMyNominationsHandler(({auth: {uid: "riya", token}, data: {filter: "all", limit: 2, cursor: null, ...data},
      rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>, deps);
  const first = await list({});
  assert.equal(validate(first), true);
  assert.deepEqual(first.nominations.map((entry) => entry.itemId), ["supply-sunday", "supply-small"]);
  assert.deepEqual(first.totals, {all: 3, published: 1, waiting: 1, stuck: 1});
  const second = await list({cursor: first.nextCursor});
  assert.deepEqual(second.nominations.map((entry) => entry.itemId), ["supply-afterfly"]);
  assert.equal(second.nextCursor, null);
  assert.deepEqual((await list({filter: "stuck"})).nominations.map((entry) => entry.itemId), ["supply-sunday"]);
  await assert.rejects(list({}, {safetyReviewer: true}), /not authorized/);
});
