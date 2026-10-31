/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../testFirestore";
import {validateSupplyIntakeRequest} from
  "../../shared/generated/validators/supplyIntakeRequest";
import {adminRefreshOrganizerEventsHandler, eventPageLinks} from "./organizerEventRefresh";
import {supplyIntakeRequestId} from "./requests";
import {contractValidator} from "../../shared/contractTestValidators";

const validateSupplyIntakeRequestsDocument =
  contractValidator("SupplyIntakeRequestsDocument");

const NOW = new Date("2026-10-25T08:00:00.000Z");

const call = (db: FakeFirestore, data: Record<string, unknown>, token: Record<string, unknown> = {salesStaff: true}) =>
  adminRefreshOrganizerEventsHandler({auth: {uid: "associate-1", token}, data, rawRequest: {headers: {}}} as
    unknown as CallableRequest<unknown>, {firestore: () => db as unknown as Firestore, now: () => NOW,
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue});

function listedOrganizer(overrides: Record<string, unknown> = {}) {
  return {name: "Afterfly", locationMarketId: "in-mh-mumbai", location: "in-mh-mumbai", status: "active",
    claim: {state: "unclaimed"}, publicPage: {publishStatus: "published", canonicalPath: "/organizers/afterfly/"},
    publicSources: [{href: "https://www.instagram.com/afterfly/"}, {href: "https://lu.ma/afterfly"},
      {href: "https://district.in/events/afterfly-run"}], ...overrides};
}

test("staff read new events for a listed organizer from its page's calendar links", async () => {
  const db = new FakeFirestore();
  db.write("organizers/afterfly", listedOrganizer());
  const response = await call(db, {requestId: "refresh-001", organizerId: "afterfly", urls: []});
  assert.equal(response.requestId, supplyIntakeRequestId("refresh", ["associate-1", "refresh-001"]));
  assert.deepEqual([response.created, response.status, response.urls], [true, "queued",
    ["https://lu.ma/afterfly", "https://district.in/events/afterfly-run"]]);
  const stored = db.read(`supplyIntakeRequests/${response.requestId}`) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.equal(validateSupplyIntakeRequestsDocument(stored), true,
    JSON.stringify(validateSupplyIntakeRequestsDocument.errors));
  assert.deepEqual([stored.request.kind, stored.request.market, stored.request.target, stored.request.origin.kind],
    ["event_refresh", "mumbai", {organizerId: "afterfly"}, "admin_event_refresh"]);
  // The listed organizer's approval travels with the request, so it skips listing review.
  assert.deepEqual([stored.status, stored.approval.organizerId, stored.approval.approvedByUid],
    ["queued", "afterfly", "associate-1"]);
  assert.equal(db.entries().filter(([path]) => path.startsWith("adminAuditLogs/")).length, 1);

  const replay = await call(db, {requestId: "refresh-001", organizerId: "afterfly", urls: []});
  assert.equal(replay.created, false);
  const given = await call(db, {requestId: "refresh-002", organizerId: "afterfly", urls: ["https://lu.ma/afterfly-x"]});
  assert.deepEqual(given.urls, ["https://lu.ma/afterfly-x"]);
});

test("a refresh is refused for a claimed, unpublished or calendar-less organizer, and for other roles", async () => {
  const db = new FakeFirestore();
  db.write("organizers/claimed", listedOrganizer({claim: {state: "claimed"}}));
  db.write("organizers/draft", listedOrganizer({publicPage: {publishStatus: "draft"}}));
  db.write("organizers/insta", listedOrganizer({publicSources: [{href: "https://instagram.com/x"}]}));
  db.write("organizers/afterfly", listedOrganizer());
  await assert.rejects(call(db, {requestId: "r-claimed-1", organizerId: "claimed", urls: []}), /claimed its page/);
  await assert.rejects(call(db, {requestId: "r-draft-001", organizerId: "draft", urls: []}), /published page/);
  await assert.rejects(call(db, {requestId: "r-insta-001", organizerId: "insta", urls: []}), /links no event calendar/);
  await assert.rejects(call(db, {requestId: "r-missing-1", organizerId: "missing", urls: []}), /not found/);
  await assert.rejects(call(db, {requestId: "r-role-0001", organizerId: "afterfly", urls: []}, {}),
    /permission|role|admin/i);
  assert.equal(db.entries().filter(([path]) => path.startsWith("supplyIntakeRequests/")).length, 0);
});

test("only refresh requests name a target organizer", () => {
  const base = {schemaVersion: 1, requestId: "refresh-x", market: "mumbai", submittedAt: NOW.toISOString(),
    seed: {name: "Afterfly", urls: ["https://lu.ma/afterfly"], notes: null, categories: []},
    submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, origin: null};
  assert.equal(validateSupplyIntakeRequest({...base, kind: "event_refresh", target: {organizerId: "afterfly"}}), true);
  assert.equal(validateSupplyIntakeRequest({...base, kind: "event_refresh"}), false, "a refresh names its organizer");
  assert.equal(validateSupplyIntakeRequest({...base, kind: "nomination", target: {organizerId: "afterfly"}}), false,
    "a nomination builds a new listing, so it has no target");
  assert.deepEqual(eventPageLinks([{href: "https://www.lu.ma/a"}, {href: "not a url"}, {href: "https://lu.ma/a"}]),
    ["https://www.lu.ma/a", "https://lu.ma/a"]);
});
