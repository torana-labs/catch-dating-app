import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {resolveCommercialTerms} from "../commercialTerms/resolver";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import {
  organizerTermsDocument,
  platformTermsDocument,
} from "../commercialTerms/testFixture";
import {computeTrialStatus, trialAnchorsFromFacts} from "../money/hostTrial";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {validateCommercialTermsRevisionDocument} from
  "../shared/generated/validators/commercialTermsRevisionDocument";
import {validateFoundingHostPlaceDocument} from
  "../shared/generated/validators/foundingHostPlaceDocument";
import type {OrganizerGrowthFactsDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  foundingHostTermsActor,
  type FoundingHostOffer,
} from "./foundingHostOffer";
import {takeFoundingHostPlace} from "./foundingHostGrant";

const opened = 1_763_000_000_000;
const offerPath = "foundingHostOffers/in-mh-mumbai";
const publicPath = "publicFoundingHostOffers/in-mh-mumbai";

function offer(patch: Partial<FoundingHostOffer> = {}): FoundingHostOffer {
  return {schemaVersion: 1, marketId: "in-mh-mumbai", revision: 1, cap: 50,
    endsAtMillis: null, trialDays: 90, takenCount: 0, openedAtMillis: opened,
    lastPlaceAtMillis: null, reason: "Owner decision 16 Nov",
    updatedByUid: "owner", updatedAtMillis: opened, ...patch};
}

function setup(offerPatch: Partial<FoundingHostOffer> | null = {}) {
  const store = new FakeFirestore({
    "commercialTerms/platform": platformTermsDocument(),
    ...(offerPatch ? {[offerPath]: {...offer(offerPatch)}} : {}),
  });
  let clock = opened + 10_000;
  const deps = {db: store as unknown as FirebaseFirestore.Firestore,
    now: () => clock++};
  const addOrganizer = (id: string, patch: Record<string, unknown> = {}) =>
    store.put(`organizers/${id}`, {ownership: {state: "userCreated"},
      locationMarketId: "in-mh-mumbai", ...patch});
  const take = (organizerId: string, ownedAtMillis = opened + 1) =>
    takeFoundingHostPlace(deps, {organizerId, ownedAtMillis,
      source: "ownershipTrigger"});
  return {store, deps, addOrganizer, take};
}

test("a new owner takes place 1 and gets 90 days through its terms override",
  async () => {
    const {store, deps, addOrganizer, take} = setup();
    addOrganizer("org-1");
    assert.deepEqual(await take("org-1"),
      {kind: "grant", placeNumber: 1, marketId: "in-mh-mumbai"});

    const place = store.get("foundingHostPlaces/org-1");
    assert.ok(validateFoundingHostPlaceDocument(place));
    const termsId = organizerCommercialTermsId("org-1");
    assert.deepEqual([place.placeNumber, place.cap, place.trialDays,
      place.source, place.commercialTerms],
    [1, 50, 90, "ownershipTrigger",
      {termsId, revision: 1, previousTrialDays: null}]);
    assert.deepEqual(store.get(`commercialTerms/${termsId}`)?.terms,
      {trial: {days: 90}});
    assert.equal(store.get(`commercialTerms/${termsId}`)?.updatedByUid,
      foundingHostTermsActor);
    assert.ok(validateCommercialTermsRevisionDocument(
      store.get(`commercialTermsRevisions/${termsId}_r1`)));
    assert.deepEqual([store.get(offerPath)?.takenCount,
      store.get(offerPath)?.revision], [1, 1]);
    assert.deepEqual(store.get(publicPath), {schemaVersion: 1,
      marketId: "in-mh-mumbai", citySlug: "mumbai", status: "open", cap: 50,
      placesLeft: 49, trialDays: 90, endsAtMillis: null,
      updatedAtMillis: place.grantedAtMillis});

    // Payments and the trial read the founding trial like any override.
    const snapshot = await resolveCommercialTerms({db: deps.db,
      organizerId: "org-1", purpose: "eventAdmission",
      moneyFlow: "hostCollected", nowMillis: opened});
    assert.equal(snapshot.trial.days, 90);
    assert.equal(snapshot.organizerRevision, 1);
    const firstEventAt = Timestamp.fromMillis(opened + 86_400_000);
    const status = computeTrialStatus({anchors: trialAnchorsFromFacts({
      milestones: {firstEventAt, firstPaidBookingAt: null},
    } as OrganizerGrowthFactsDocument), terms: snapshot, nowMillis: opened});
    assert.deepEqual([status.state, status.days, status.daysLeft],
      ["scheduled", 90, 90]);
  });

test("concurrent new owners never share or exceed the last places",
  async () => {
    const {store, addOrganizer, take} = setup({cap: 50, takenCount: 47});
    const ids = Array.from({length: 8}, (_, index) => `org-${index}`);
    ids.forEach((id) => addOrganizer(id));
    const results = await Promise.all(ids.map((id) => take(id)));
    const granted = results.filter((result) => result.kind === "grant");
    assert.deepEqual(granted.map((result) =>
      result.kind === "grant" ? result.placeNumber : 0).sort(), [48, 49, 50]);
    assert.equal(results.filter((result) => result.kind === "skip" &&
      result.reason === "soldOut").length, 5);
    assert.equal(store.paths("foundingHostPlaces/").length, 3);
    assert.equal(store.get(offerPath)?.takenCount, 50);
    assert.deepEqual([store.get(publicPath)?.status,
      store.get(publicPath)?.placesLeft], ["soldOut", 0]);
    // The hosts who missed out keep the standard trial: no override at all.
    const termsWritten = ids.filter((id) =>
      store.get(`commercialTerms/${organizerCommercialTermsId(id)}`));
    assert.equal(termsWritten.length, 3);
  });

test("a retried grant is a no-op and never takes a second place",
  async () => {
    const {store, addOrganizer, take} = setup();
    addOrganizer("org-1");
    await take("org-1");
    const before = store.paths();
    const offerBefore = store.get(offerPath);
    assert.deepEqual(await take("org-1"), {kind: "skip",
      reason: "alreadyHeld", marketId: "in-mh-mumbai"});
    assert.deepEqual(store.paths(), before);
    assert.deepEqual(store.get(offerPath), offerBefore);
  });

test("after the deadline new owners get the standard trial; places taken " +
  "before it stay", async () => {
  const endsAtMillis = opened + 1_000;
  const {store, addOrganizer, take} = setup({endsAtMillis});
  addOrganizer("early");
  addOrganizer("late");
  await take("early", endsAtMillis - 1);
  assert.deepEqual(await take("late", endsAtMillis), {kind: "skip",
    reason: "closed", marketId: "in-mh-mumbai"});
  assert.ok(store.get("foundingHostPlaces/early"));
  assert.equal(store.get("foundingHostPlaces/late"), undefined);
  assert.equal(store.get(
    `commercialTerms/${organizerCommercialTermsId("late")}`), undefined);
  assert.equal(store.get(offerPath)?.takenCount, 1);
});

test("a negotiated override keeps its other terms and a longer trial wins",
  async () => {
    const {store, addOrganizer, take} = setup();
    addOrganizer("pilot");
    addOrganizer("generous");
    const pilotId = organizerCommercialTermsId("pilot");
    const generousId = organizerCommercialTermsId("generous");
    store.put(`commercialTerms/${pilotId}`, organizerTermsDocument("pilot",
      {commission: {rateBasisPoints: 300}, trial: {days: 45}}, 2));
    store.put(`commercialTerms/${generousId}`, organizerTermsDocument(
      "generous", {trial: {days: 120}}, 1));

    await take("pilot");
    assert.deepEqual(store.get(`commercialTerms/${pilotId}`)?.terms,
      {commission: {rateBasisPoints: 300}, trial: {days: 90}});
    assert.equal(store.get(`commercialTerms/${pilotId}`)?.revision, 3);
    assert.deepEqual(store.get("foundingHostPlaces/pilot")?.commercialTerms,
      {termsId: pilotId, revision: 3, previousTrialDays: 45});

    await take("generous");
    assert.deepEqual(store.get(`commercialTerms/${generousId}`)?.terms,
      {trial: {days: 120}});
    assert.equal(store.get(`commercialTerms/${generousId}`)?.revision, 1);
    assert.equal(store.get("foundingHostPlaces/generous")?.commercialTerms,
      null);
    assert.equal(store.get(offerPath)?.takenCount, 2);
  });

test("organizers that are not new hosts, or outside an offer, take nothing",
  async () => {
    const {store, addOrganizer, take} = setup();
    addOrganizer("trading");
    store.put("organizerGrowthFacts/trading", {milestones: {
      firstEventAt: Timestamp.fromMillis(opened - 1)}});
    addOrganizer("unowned", {ownership: {state: "unclaimed"}});
    addOrganizer("indore", {locationMarketId: "in-mp-indore"});
    addOrganizer("nowhere", {locationMarketId: "atlantis"});
    addOrganizer("early");
    assert.equal((await take("trading")).kind, "skip");
    const reasons = await Promise.all([
      take("trading"), take("unowned"), take("indore"), take("nowhere"),
      take("missing"), take("early", opened - 1),
    ]);
    assert.deepEqual(reasons.map((result) =>
      result.kind === "skip" ? result.reason : result.kind),
    ["trialStarted", "notOwned", "noOffer", "unknownMarket", "notOwned",
      "ownedBeforeOffer"]);
    assert.deepEqual(store.paths("foundingHostPlaces/"), []);
    assert.equal(store.get(offerPath)?.takenCount, 0);
    assert.equal(store.get(publicPath), undefined);
  });

test("a market alias on the organizer resolves to the canonical city",
  async () => {
    const {store, addOrganizer, take} = setup();
    addOrganizer("aliased", {locationMarketId: undefined, location: "Mumbai"});
    assert.deepEqual(await take("aliased"),
      {kind: "grant", placeNumber: 1, marketId: "in-mh-mumbai"});
    assert.equal(store.get("foundingHostPlaces/aliased")?.marketId,
      "in-mh-mumbai");
  });

test("before platform terms exist the override still carries the trial",
  async () => {
    const {store, addOrganizer, take} = setup();
    store.remove("commercialTerms/platform");
    addOrganizer("org-1");
    await take("org-1");
    assert.deepEqual(store.get(
      `commercialTerms/${organizerCommercialTermsId("org-1")}`)?.terms,
    {trial: {days: 90}});
  });
