import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../operations/testFirestore";
import {adminListOrganizerDirectoryHandler} from "./organizerDirectory";
import {adminListEventDirectoryHandler} from "./eventDirectory";
import {adminGetOrganizerOverviewHandler} from "./organizerOverview";

const now = new Date("2026-11-01T12:00:00.000Z");
const at = (iso: string) => Timestamp.fromDate(new Date(iso));

function request(
  data: unknown,
  token: Record<string, unknown> = {adminOwner: true},
  uid = "riya"
): CallableRequest<unknown> {
  return {data, auth: {uid, token}} as unknown as CallableRequest<unknown>;
}

function seed(): FakeFirestore {
  const db = new FakeFirestore();
  const organizer = (id: string, fields: Record<string, unknown>) =>
    db.write(`organizers/${id}`, {
      name: id, status: "active", appVisibility: "discoverable",
      locationMarketId: "in-mh-mumbai",
      publicPage: {publishStatus: "published", indexStatus: "indexed"},
      claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
      ...fields,
    });
  organizer("afterfly", {name: "Afterfly", publicCategoryLabel: "Social nights",
    area: "Bandra", createdAt: at("2026-10-31T08:00:00Z"),
    publicPage: {publishStatus: "published", indexStatus: "noindex",
      canonicalPath: "/mumbai/afterfly"},
    provenance: {origin: "scraper"}});
  organizer("lantern", {name: "Lantern Lane Social",
    publicCategoryLabel: "Trivia", createdAt: at("2026-08-14T08:00:00Z"),
    hostName: "Meher", imageUrl: "https://example.com/lantern.jpg",
    claim: {state: "claimed", claimHref: null, lastClaimRequestId: null},
    ownership: {claimedAt: at("2026-08-20T08:00:00Z")}});
  organizer("bandra", {name: "Bandra Runners", organizerType: "club",
    appVisibility: "hidden", createdAt: at("2026-10-02T08:00:00Z")});
  organizer("indore", {name: "AFTER FLY", locationMarketId: "in-mp-indore",
    publicCategoryLabel: "Social nights", createdAt: at("2026-06-20T08:00:00Z"),
    claim: {state: "claimPending", claimHref: null,
      lastClaimRequestId: "claim-1"}});
  organizer("gone", {name: "Gone Club", status: "archived",
    createdAt: at("2026-01-01T08:00:00Z")});

  db.write("organizerSalesAccounts/afterfly", {assignedOwnerUid: "riya",
    nextAction: "Send the claim link"});
  db.write("organizerSalesAccounts/lantern", {assignedOwnerUid: "riya"});
  db.write("organizerSalesAccounts/bandra", {assignedOwnerUid: "dev"});

  const event = (id: string, fields: Record<string, unknown>) =>
    db.write(`events/${id}`, {organizerId: "lantern", status: "active",
      publicationState: "published", discoveryMarketId: "in-mh-mumbai",
      bookedCount: 26, capacityLimit: 32, ...fields});
  event("trivia", {name: "Tuesday Trivia Night",
    startTime: at("2026-11-05T14:00:00Z")});
  event("supper", {name: "Long Table Supper",
    startTime: at("2026-11-20T14:00:00Z"), discoveryAvailability: "full"});
  event("cancelled", {name: "Pace pods", status: "cancelled",
    startTime: at("2026-11-03T01:00:00Z")});
  event("past", {name: "First Trivia", startTime: at("2026-09-01T14:00:00Z")});

  const imported = (id: string, fields: Record<string, unknown>) =>
    db.write(`externalEvents/${id}`, {eventId: id, canonicalHostId: "afterfly",
      status: "active", publicationStatus: "public",
      discovery: {citySlug: "in-mh-mumbai"},
      externalSource: {platform: "luma"}, ...fields});
  imported("takeoff", {title: "Takeoff: Run + Rave",
    startTime: at("2026-11-02T12:30:00Z")});
  imported("neon", {title: "Neon Night Run", publicationStatus: "draft",
    startTime: at("2026-11-15T15:30:00Z")});
  imported("old", {title: "Old Run", startTime: at("2026-10-01T12:30:00Z")});

  db.write("supplyIntakeRequests/req-1", {
    request: {kind: "nomination", submittedAt: "2026-10-28T16:11:00.000Z",
      submittedBy: {role: "associate", uid: "riya", partnerId: null},
      seed: {name: "Afterfly", urls: ["https://luma.com/afterfly"]}},
    result: {eventCount: 3},
    approval: {organizerId: "afterfly", approvedByUid: "suvrat",
      approvedAt: "2026-10-31T07:50:00.000Z"},
  });
  db.write("organizerClaimRequests/claim-1", {organizerId: "indore",
    requesterName: "Arjun Bhagat", requesterRole: "manager",
    status: "pending", createdAt: at("2026-10-30T08:00:00Z")});
  db.write("salesTasks/task-1", {taskId: "task-1", organizerId: "afterfly",
    title: "Send Afterfly the claim link", ownerUid: "riya", status: "open",
    dueAt: "2026-11-04T04:00:00.000Z"});
  return db;
}

const staffNames = async (uids: string[]) => new Map(uids.flatMap((uid) =>
  uid === "riya" ? [[uid, "Riya Sharma"] as [string, string]] :
    uid === "suvrat" ? [[uid, "Suvrat"] as [string, string]] : []));
const count = async (query: FirebaseFirestore.Query) =>
  (await query.get()).size;

function deps(db: FakeFirestore) {
  return {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    staffNames,
    count,
    now: () => now,
  };
}

test("organizer directory counts every view, newest first", async () => {
  const response = await adminListOrganizerDirectoryHandler(
    request({}), deps(seed()));

  assert.deepEqual(response.views, {all: 4, live: 2, unclaimed: 2, hidden: 1});
  assert.equal(response.total, 4);
  assert.deepEqual(response.scan, {complete: true, scanned: 5});
  assert.deepEqual(response.rows.map((row) => row.organizerId),
    ["afterfly", "bandra", "lantern", "indore"]);
  const [afterfly] = response.rows;
  assert.equal(afterfly.pageState, "hiddenFromSearch");
  assert.equal(afterfly.kindLabel, "Social nights");
  assert.equal(afterfly.cityLabel, "Mumbai");
  assert.deepEqual(afterfly.salesOwner, {uid: "riya", name: "Riya Sharma"});
  assert.equal(afterfly.upcomingEventCount, 2);
  const lantern = response.rows.find((row) => row.organizerId === "lantern");
  assert.equal(lantern?.claimedByName, "Meher");
  assert.equal(lantern?.upcomingEventCount, 2);
  assert.equal(response.facets.mine, 2);
  assert.deepEqual(response.facets.cities.map((f) => [f.value, f.count]),
    [["in-mh-mumbai", 3], ["in-mp-indore", 1]]);
  assert.deepEqual(response.facets.kinds.find((f) => f.value ===
    "social-nights"), {value: "social-nights", label: "Social nights",
    count: 2});
});

test("organizer directory filters and keeps other chips' counts", async () => {
  const db = seed();
  const mine = await adminListOrganizerDirectoryHandler(
    request({mine: true, citySlug: "in-mh-mumbai", limit: 1}), deps(db));
  assert.equal(mine.total, 2);
  assert.deepEqual(mine.rows.map((row) => row.organizerId), ["afterfly"]);
  assert.equal(mine.nextCursor, "o:1");
  // The city chip counts as if no city were chosen.
  assert.deepEqual(mine.facets.cities.map((f) => f.count), [2]);

  const next = await adminListOrganizerDirectoryHandler(
    request({mine: true, citySlug: "in-mh-mumbai", limit: 1, cursor: "o:1"}),
    deps(db));
  assert.deepEqual(next.rows.map((row) => row.organizerId), ["lantern"]);
  assert.equal(next.nextCursor, null);

  const waiting = await adminListOrganizerDirectoryHandler(
    request({claimState: "claimPending", query: "after"}), deps(db));
  assert.deepEqual(waiting.rows.map((row) => row.organizerId), ["indore"]);
});

test("records readers include sales staff, not safety reviewers", async () => {
  const db = seed();
  await adminListOrganizerDirectoryHandler(
    request({}, {salesStaff: true}), deps(db));
  await assert.rejects(adminListEventDirectoryHandler(
    request({}, {safetyReviewer: true}), deps(db)),
  /permission|admin/i);
});

test("event directory joins Catch and imported events", async () => {
  const response = await adminListEventDirectoryHandler(
    request({view: "upcoming"}), deps(seed()));

  assert.deepEqual(response.views, {upcoming: 4, past: 2, cancelled: 1});
  assert.deepEqual(response.rows.map((row) => [row.key, row.status]), [
    ["imported:takeoff", "live"],
    ["catch:trivia", "live"],
    ["imported:neon", "needsCheck"],
    ["catch:supper", "full"],
  ]);
  const takeoff = response.rows[0];
  assert.equal(takeoff.platform, "luma");
  assert.equal(takeoff.organizerName, "Afterfly");
  assert.equal(takeoff.bookedCount, null);
  assert.equal(response.rows[1].bookedCount, 26);
  assert.deepEqual(response.facets, {catch: 2, imported: 2, needsCheck: 1,
    thisWeek: 2, cities: [{value: "in-mh-mumbai", label: "Mumbai",
      count: 4}]});
});

test("event directory narrows by source, check, week and search", async () => {
  const db = seed();
  const imported = await adminListEventDirectoryHandler(
    request({source: "imported", needsCheck: true}), deps(db));
  assert.deepEqual(imported.rows.map((row) => row.key), ["imported:neon"]);
  assert.equal(imported.facets.catch, 0);

  const searched = await adminListEventDirectoryHandler(
    request({query: "lantern"}), deps(db));
  assert.deepEqual(searched.rows.map((row) => row.key),
    ["catch:trivia", "catch:supper"]);

  const past = await adminListEventDirectoryHandler(
    request({view: "past"}), deps(db));
  assert.deepEqual(past.rows.map((row) => row.key),
    ["imported:old", "catch:past"]);

  const cancelled = await adminListEventDirectoryHandler(
    request({view: "cancelled"}), deps(db));
  assert.deepEqual(cancelled.rows.map((row) => [row.key, row.status]),
    [["catch:cancelled", "cancelled"]]);
});

test("organizer overview reads the journey from nomination on", async () => {
  const response = await adminGetOrganizerOverviewHandler(
    request({organizerId: "afterfly"}), deps(seed()));

  assert.deepEqual(response.organizer.pageState, "hiddenFromSearch");
  assert.equal(response.organizer.hasImage, false);
  assert.deepEqual(response.salesOwner, {uid: "riya", name: "Riya Sharma"});
  assert.equal(response.nextAction, "Send the claim link");
  assert.deepEqual(response.nextTask, {taskId: "task-1",
    title: "Send Afterfly the claim link",
    dueAt: "2026-11-04T04:00:00.000Z", ownerName: "Riya Sharma"});
  assert.deepEqual(response.terms,
    {source: "unset", rateBasisPoints: null, capMinor: null});
  assert.deepEqual(response.payments,
    {state: "notConnected", webhookVerified: false});
  assert.deepEqual(response.journey.map((step) =>
    [step.kind, step.actorName, step.detail]), [
    ["nominated", "Riya Sharma", "https://luma.com/afterfly"],
    ["listingBuilt", null, "3"],
    ["approved", "Suvrat", null],
    ["listed", null, null],
  ]);
  assert.equal(response.nextStep, "claim");
  assert.deepEqual(response.upcomingEvents.map((event) =>
    [event.key, event.status]),
  [["imported:takeoff", "live"], ["imported:neon", "needsCheck"]]);
  assert.equal(response.upcomingEventCount, 2);
});

test("organizer overview shows a waiting claim and a host", async () => {
  const db = seed();
  const indore = await adminGetOrganizerOverviewHandler(
    request({organizerId: "indore"}), deps(db));
  assert.equal(indore.nextStep, "decideClaim");
  assert.deepEqual(indore.pendingClaim, {requestId: "claim-1",
    requesterName: "Arjun Bhagat", requesterRole: "manager",
    createdAt: "2026-10-30T08:00:00.000Z"});
  assert.deepEqual(indore.journey.map((step) => step.kind),
    ["listed", "claimRequested"]);

  const lantern = await adminGetOrganizerOverviewHandler(
    request({organizerId: "lantern"}), deps(db));
  assert.equal(lantern.organizer.claimedByName, "Meher");
  assert.equal(lantern.nextStep, null);
  assert.deepEqual(lantern.journey.map((step) => step.kind),
    ["listed", "claimed", "firstEvent"]);
  assert.equal(lantern.upcomingEventCount, 2);

  await assert.rejects(adminGetOrganizerOverviewHandler(
    request({organizerId: "missing"}), deps(db)), /not found/);
});
