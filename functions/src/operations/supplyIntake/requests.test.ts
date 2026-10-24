/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../testFirestore";
import {validateSupplyIntakeRequestsDocument} from "../../shared/generated/validators/supplyIntakeRequestsDocument";
import {adminNominateOrganizerHandler} from "./nominations";
import {
  createSupplyIntakeRequest,
  intakeMarket,
  requestFromSalesInboundIntent,
  supplyIntakeRequestId,
} from "./requests";

const NOW = new Date("2026-10-24T08:00:00.000Z");

function nominationRequest(uid: string | null, data: Record<string, unknown>,
  token: Record<string, unknown> = {salesStaff: true}): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

const payload = (overrides: Record<string, unknown> = {}) => ({
  requestId: "nomination-001", name: "Afterfly", market: "Mumbai",
  urls: ["https://lu.ma/afterfly"], notes: "Weekly socials in Bandra.", categories: ["social"], ...overrides,
});

function deps(db: FakeFirestore) {
  return {
    firestore: () => db as unknown as Firestore,
    now: () => NOW,
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
  };
}

test("an associate's nomination queues one intake request and an audit log", async () => {
  const db = new FakeFirestore();
  const response = await adminNominateOrganizerHandler(nominationRequest("associate-1", payload()), deps(db));
  assert.deepEqual([response.created, response.status], [true, "queued"]);
  assert.equal(response.requestId, supplyIntakeRequestId("nom", ["associate-1", "nomination-001"]));
  const stored = db.read(`supplyIntakeRequests/${response.requestId}`) as Record<string, unknown>;
  assert.equal(validateSupplyIntakeRequestsDocument(stored), true,
    JSON.stringify(validateSupplyIntakeRequestsDocument.errors));
  const request = stored.request as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.deepEqual([request.kind, request.market, request.submittedBy, request.origin], ["nomination", "mumbai",
    {role: "associate", uid: "associate-1", partnerId: null}, {kind: "admin_nomination", id: "nomination-001"}]);
  assert.equal(stored.status, "queued");
  assert.equal(db.entries().filter(([path]) => path.startsWith("adminAuditLogs/")).length, 1);

  // A retried submission returns the same request and writes nothing new.
  const replay = await adminNominateOrganizerHandler(nominationRequest("associate-1", payload()), deps(db));
  assert.deepEqual(replay, {...response, created: false});
  assert.equal(db.entries().filter(([path]) => path.startsWith("adminAuditLogs/")).length, 1);
  // The same nominator request id with different content is refused.
  await assert.rejects(adminNominateOrganizerHandler(nominationRequest("associate-1", payload({name: "Other"})),
    deps(db)), /different request/u);
});

test("nominations need a sales or admin role and a name or a link", async () => {
  const db = new FakeFirestore();
  await assert.rejects(adminNominateOrganizerHandler(nominationRequest(null, payload()), deps(db)));
  await assert.rejects(adminNominateOrganizerHandler(nominationRequest("member-1", payload(), {}), deps(db)));
  await assert.rejects(adminNominateOrganizerHandler(nominationRequest("associate-1",
    payload({name: null, urls: []})), deps(db)));
  await assert.rejects(adminNominateOrganizerHandler(nominationRequest("associate-1",
    payload({urls: ["javascript:alert(1)"]})), deps(db)));
  const admin = await adminNominateOrganizerHandler(nominationRequest("admin-1", payload(), {admin: true}), deps(db));
  assert.equal(admin.created, true);
});

test("website host applications and partner nominations become intake requests", () => {
  const createdAt = {toDate: () => new Date("2026-10-23T10:00:00.000Z")};
  const website = requestFromSalesInboundIntent("intent-web", {source: "website", city: "Bengaluru", createdAt,
    hostApplication: {organizationName: " The Bhag ", communityLink: "https://thebhag.in",
      operatingCity: "Bengaluru", operatingNotes: "Sunday long runs"}}, NOW);
  assert.deepEqual(website && {kind: website.kind, market: website.market, seed: website.seed,
    submittedBy: website.submittedBy, submittedAt: website.submittedAt, origin: website.origin}, {
    kind: "self_submission", market: intakeMarket("Bengaluru"),
    seed: {name: "The Bhag", urls: ["https://thebhag.in"], notes: "Sunday long runs", categories: []},
    submittedBy: {role: "organizer", uid: null, partnerId: null},
    submittedAt: "2026-10-23T10:00:00.000Z", origin: {kind: "sales_inbound_intent", id: "intent-web"},
  });
  const partner = requestFromSalesInboundIntent("intent-partner", {source: "partner", partnerUid: "partner-9",
    hostApplication: {organizationName: "Afterfly", communityLink: "https://lu.ma/afterfly", operatingCity: "Bombay"}},
  NOW);
  assert.deepEqual([partner?.kind, partner?.submittedBy], ["nomination",
    {role: "partner", uid: "partner-9", partnerId: "partner-9"}]);
  assert.equal(partner?.requestId, supplyIntakeRequestId("intent", ["intent-partner"]), "one request per intent");
  // Nothing to read and nothing named: no request; personal fields never copy over.
  assert.equal(requestFromSalesInboundIntent("intent-empty", {hostApplication: {communityLink: "not a url"}}, NOW), null);
  assert.equal(requestFromSalesInboundIntent("intent-member", {hostApplication: null}, NOW), null);
  assert.equal(JSON.stringify(website).includes("@"), false);
  assert.deepEqual([intakeMarket("Mumbai"), intakeMarket("in-mh-mumbai"), intakeMarket("Somewhere unknown, 99"),
    intakeMarket(null)], ["mumbai", "mumbai", "unassigned", "unassigned"]);
});

test("the shared service refuses invalid requests and replays identical ones", async () => {
  const db = new FakeFirestore();
  const intake = requestFromSalesInboundIntent("intent-1", {hostApplication: {organizationName: "Afterfly"}}, NOW)!;
  const store = db as unknown as Firestore;
  const first = await store.runTransaction((tx) => createSupplyIntakeRequest(tx, store, intake, NOW));
  const again = await store.runTransaction((tx) => createSupplyIntakeRequest(tx, store, intake, NOW));
  assert.deepEqual([first.created, again.created], [true, false]);
  await assert.rejects(store.runTransaction((tx) => createSupplyIntakeRequest(tx, store,
    {...intake, kind: "discovery"}, NOW)), /contract/u);
});
