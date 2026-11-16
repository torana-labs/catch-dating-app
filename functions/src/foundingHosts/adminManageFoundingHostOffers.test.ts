import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {platformTermsDocument} from "../commercialTerms/testFixture";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {adminManageFoundingHostOffersHandler as manage} from
  "./adminManageFoundingHostOffers";
import {takeFoundingHostPlace} from "./foundingHostGrant";

const open = (patch: Record<string, unknown> = {}) => ({action: "replace",
  marketId: "in-mh-mumbai", expectedRevision: 0, cap: 50, endsAtMillis: null,
  reason: "Owner decision 16 Nov", ...patch});
const read = (marketId: string | null = null) => ({action: "read", marketId,
  expectedRevision: null, cap: null, endsAtMillis: null, reason: null});

function request(data: unknown, role = "adminOwner"): CallableRequest<unknown> {
  return {data, auth: {uid: "owner", token: {[role]: true}}} as
    unknown as CallableRequest<unknown>;
}

function fixture() {
  const store = new FakeFirestore({
    "commercialTerms/platform": platformTermsDocument()});
  let clock = 1_763_000_000_000;
  const db = store as unknown as FirebaseFirestore.Firestore;
  const deps = {db: () => db, now: () => clock++,
    rateLimit: async () => undefined};
  const grant = async (organizerId: string) => {
    store.put(`organizers/${organizerId}`, {ownership: {state: "userCreated"},
      ownerUserId: `owner-${organizerId}`, locationMarketId: "in-mh-mumbai"});
    return takeFoundingHostPlace({db, now: () => clock++},
      {organizerId, ownedAtMillis: clock++, source: "ownershipTrigger"});
  };
  return {store, deps, grant, advance: (by: number) => {
    clock += by;
  }};
}

test("only the Admin Owner reads or changes founding offers", async () => {
  const deps = {...fixture().deps, db: () => {
    throw new Error("DB accessed");
  }};
  for (const role of ["admin", "support", "salesStaff", "finance"]) {
    await assert.rejects(manage(request(read(), role), deps),
      /not authorized/);
    await assert.rejects(manage(request(open(), role), deps),
      /not authorized/);
  }
});

test("opening a city publishes its counter and audits the change",
  async () => {
    const {store, deps} = fixture();
    assert.deepEqual((await manage(request(read()), deps)).offers, []);
    const opened = await manage(request(open()), deps);
    assert.deepEqual([opened.defaultCap, opened.trialDays], [50, 90]);
    const [offer] = opened.offers;
    assert.deepEqual([offer.marketId, offer.citySlug, offer.revision,
      offer.status, offer.cap, offer.takenCount, offer.placesLeft,
      offer.trialDays, offer.endsAtMillis],
    ["in-mh-mumbai", "mumbai", 1, "open", 50, 0, 50, 90, null]);
    assert.deepEqual(store.get("publicFoundingHostOffers/in-mh-mumbai"), {
      schemaVersion: 1, marketId: "in-mh-mumbai", citySlug: "mumbai",
      status: "open", cap: 50, placesLeft: 50, trialDays: 90,
      endsAtMillis: null, updatedAtMillis: offer.updatedAtMillis});
    const audits = store.paths("adminAuditLogs/");
    assert.equal(audits.length, 1);
    assert.equal(store.get(audits[0])?.action,
      "adminManageFoundingHostOffers");
    assert.deepEqual((await manage(request(read()), deps)).offers
      .map((row) => row.marketId), ["in-mh-mumbai"]);
  });

test("changes name the reviewed revision and never drop below places taken",
  async () => {
    const {store, deps, grant} = fixture();
    await manage(request(open({cap: 3})), deps);
    await grant("org-1");
    await grant("org-2");
    // A place does not bump the revision the owner reviewed.
    await assert.rejects(manage(request(open({expectedRevision: 0,
      cap: 10})), deps), /changed/);
    await assert.rejects(manage(request(open({expectedRevision: 1,
      cap: 1})), deps), /2 founding places are already taken/);
    const lowered = await manage(request(open({expectedRevision: 1,
      cap: 2})), deps);
    assert.deepEqual([lowered.offers[0].status, lowered.offers[0].placesLeft,
      lowered.offers[0].takenCount], ["soldOut", 0, 2]);
    assert.equal(store.get("publicFoundingHostOffers/in-mh-mumbai")?.status,
      "soldOut");
    assert.equal((await grant("org-3")).kind, "skip");
    // Raising the cap again reopens the city; the places taken keep their
    // numbers and opening time.
    const raised = await manage(request(open({expectedRevision: 2,
      cap: 50})), deps);
    assert.deepEqual([raised.offers[0].status, raised.offers[0].placesLeft],
      ["open", 48]);
    assert.equal(store.get("foundingHostPlaces/org-2")?.placeNumber, 2);
    assert.deepEqual(await grant("org-4"),
      {kind: "grant", placeNumber: 3, marketId: "in-mh-mumbai"});
  });

test("a deadline closes the city for new hosts and keeps existing grants",
  async () => {
    const {store, deps, grant, advance} = fixture();
    await manage(request(open()), deps);
    await grant("org-1");
    const endsAtMillis = deps.now() + 1_000;
    const dated = await manage(request(open({expectedRevision: 1,
      endsAtMillis})), deps);
    assert.deepEqual([dated.offers[0].status, dated.offers[0].endsAtMillis],
      ["open", endsAtMillis]);
    assert.equal(store.get("publicFoundingHostOffers/in-mh-mumbai")
      ?.endsAtMillis, endsAtMillis);
    advance(2_000);
    assert.equal((await manage(request(read("in-mh-mumbai")), deps))
      .offers[0].status, "closed");
    assert.deepEqual(await grant("org-2"), {kind: "skip", reason: "closed",
      marketId: "in-mh-mumbai"});
    assert.ok(store.get("foundingHostPlaces/org-1"));
    // Clearing the deadline is the default: no end date.
    const cleared = await manage(request(open({expectedRevision: 2})), deps);
    assert.deepEqual([cleared.offers[0].status,
      cleared.offers[0].endsAtMillis], ["open", null]);
  });

test("payloads must name a catalog market and match their action",
  async () => {
    const {deps} = fixture();
    for (const data of [
      open({marketId: "mumbai"}),
      open({marketId: "atlantis"}),
      open({marketId: null}),
      open({reason: "  ok  "}),
      open({expectedRevision: null}),
      {...read(), cap: 50},
      open({cap: 0}),
      open({cap: 1001}),
    ]) {
      await assert.rejects(manage(request(data), deps),
        (error: {code?: string}) => error.code === "invalid-argument");
    }
  });
