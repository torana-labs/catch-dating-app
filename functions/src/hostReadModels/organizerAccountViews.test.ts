import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {commercialTermsRecords} from "../commercialTerms/testFixture";
import {dayMillis} from "../money/hostTrial";
import {getOrganizerBillingStatusHandler} from
  "../money/organizerBillingStatus";
import {getOrganizerEntitlementHandler} from
  "../entitlements/organizerEntitlementRead";
import {ownerViewCapabilities} from "../organizerInsights/ownerAccess";
import {
  reconcileAllOrganizerBillingViews,
  reconcileOrganizerBillingView,
  reconcileOrganizerEntitlementView,
} from "./organizerAccountViews";
import {reconcileOrganizerOwnerView} from "./organizerOwnerViewStore";

const validateBilling = contractValidator("HostOrganizerBillingViewDocument");
const validateEntitlement = contractValidator(
  "HostOrganizerEntitlementViewDocument");
const validateOwner = contractValidator("HostOrganizerOwnerViewDocument");

const firstEvent = Date.UTC(2026, 9, 1, 12);
const at = (millis: number) => Timestamp.fromMillis(millis);
const request = (uid: string) => ({auth: {uid, token: {}},
  data: {organizerId: "org"}}) as unknown as CallableRequest<unknown>;

function store(extra: Record<string, Record<string, unknown>> = {}) {
  return new FakeFirestore({
    "organizers/org": {ownerUserId: "owner", hostUserId: "owner",
      hostUserIds: ["owner", "manager"], name: "Lantern Lane",
      description: "  Runs every Sunday.  ",
      ownerLinks: [], organizerPhotos: [
        {id: "p1", url: "https://example.com/p1.jpg"}]},
    "organizerGrowthFacts/org": {milestones: {
      firstEventAt: at(firstEvent), firstPaidBookingAt: null}},
    ...commercialTermsRecords(),
    ...extra,
  });
}

test("the billing view holds the trial's facts and the plan, no prices",
  async () => {
    const fake = store();
    const db = fake.asFirestore();
    await reconcileOrganizerBillingView(db, "org");
    const view = fake.get("hostOrganizerBillingViews/org")!;
    assert.equal(validateBilling(view), true,
      JSON.stringify(validateBilling.errors));
    const callable = await getOrganizerBillingStatusHandler(request("owner"),
      {db: () => db, now: () => firstEvent + 18 * dayMillis,
        checkRateLimit: async () => undefined});
    assert.deepEqual(view.trial, {days: callable.trial.days,
      anchor: callable.trial.anchor,
      startsAtMillis: callable.trial.startsAtMillis,
      endsAtMillis: callable.trial.endsAtMillis});
    assert.deepEqual(view.plan, callable.plan);
    const json = JSON.stringify(view);
    for (const hidden of ["Minor", "rateBasisPoints", "state", "daysLeft"]) {
      assert.equal(json.includes(hidden), false, hidden);
    }
  });

test("unset platform terms leave the trial unconfigured", async () => {
  const fake = store();
  fake.remove("commercialTerms/platform");
  await reconcileOrganizerBillingView(fake.asFirestore(), "org");
  assert.deepEqual(fake.get("hostOrganizerBillingViews/org")!.trial,
    {days: null, anchor: null, startsAtMillis: null, endsAtMillis: null});
});

test("a platform terms change rewrites every organizer's view", async () => {
  const fake = store({"organizers/org-2": {ownerUserId: "other"}});
  const db = fake.asFirestore();
  assert.equal(await reconcileAllOrganizerBillingViews(db), 2);
  assert.ok(fake.get("hostOrganizerBillingViews/org-2"));
  fake.remove("organizers/org-2");
  await reconcileOrganizerBillingView(db, "org-2");
  assert.equal(fake.get("hostOrganizerBillingViews/org-2"), undefined);
});

test("the entitlement view is the callable's grants without the clock",
  async () => {
    const fake = store({"organizerEntitlements/org": {schemaVersion: 1,
      organizerId: "org", revision: 3,
      grants: [{grantId: "g1", sku: "wedding_pro", unit: "program",
        quantityTotal: 2, quantityConsumed: 1, validFrom: at(1000),
        validUntil: null, source: "manualInvoice", grantedBy: "staff-1",
        grantedAt: at(1000), receiptRef: "receipt-marker",
        note: "internal-note-marker", revokedAt: null, revokedBy: null,
        revokeReason: null}],
      meters: {flightDaysUsed: 4, waConversationsUsed: 9,
        periodStartsAt: at(1000)},
      createdAt: at(1000), updatedAt: at(1000)}});
    const db = fake.asFirestore();
    await reconcileOrganizerEntitlementView(db, "org");
    const view = fake.get("hostOrganizerEntitlementViews/org")!;
    assert.equal(validateEntitlement(view), true,
      JSON.stringify(validateEntitlement.errors));
    const callable = await getOrganizerEntitlementHandler(request("owner"),
      {firestore: () => db, now: () => 2000});
    const grant = (view.grants as Array<Record<string, unknown>>)[0];
    const expected = {...callable.grants[0]} as Record<string, unknown>;
    delete expected.active;
    delete expected.revoked;
    assert.deepEqual({...grant, revokedAtMillis: undefined},
      {...expected, revokedAtMillis: undefined});
    assert.deepEqual(view.meters, callable.meters);
    const json = JSON.stringify(view);
    for (const hidden of ["staff-1", "receipt-marker", "internal-note-marker",
      "skuCatalog", "\"active\""]) {
      assert.equal(json.includes(hidden), false, hidden);
    }
    fake.remove("organizerEntitlements/org");
    await reconcileOrganizerEntitlementView(db, "org");
    assert.equal(fake.get("hostOrganizerEntitlementViews/org"), undefined);
  });

test("the owner view holds the page facts, the window is the reader's",
  async () => {
    const now = new Date(Date.UTC(2026, 10, 20, 9));
    const day = (offset: number) => new Date(now.getTime() -
      offset * 86_400_000).toISOString().slice(0, 10);
    const key = (offset: number) => day(offset).replace(/-/gu, "");
    const fake = store({
      [`organizerInsights/org_${key(2)}`]: {
        organizerId: "org", date: day(2), visits: 12, linkClicks: 3,
        bookingClicks: 1, newFollowers: 2,
        sources: [{source: "instagram", clicks: 3}],
        links: [{linkId: "l1", clicks: 3}], computedAtMillis: 1},
      [`organizerInsights/org_${key(35)}`]: {
        organizerId: "org", date: day(35), visits: 99, linkClicks: 0,
        bookingClicks: 0, newFollowers: 0, sources: [], links: [],
        computedAtMillis: 1},
      // Another organiser's document under a forged id is never kept.
      [`organizerInsights/org_${key(3)}`]: {
        organizerId: "org-2", date: day(3), visits: 900, linkClicks: 0,
        bookingClicks: 0, newFollowers: 0, sources: [], links: [],
        computedAtMillis: 1},
      // Days beyond the 40 the view keeps are left out.
      [`organizerInsights/org_${key(45)}`]: {
        organizerId: "org", date: day(45), visits: 7, linkClicks: 0,
        bookingClicks: 0, newFollowers: 0, sources: [], links: [],
        computedAtMillis: 1},
      "organizerFollowerMessageQuotas/org_202611": {organizerId: "org",
        month: "2026-11", requestIds: ["r1"], updatedAtMillis: 1},
    });
    const db = fake.asFirestore();
    await reconcileOrganizerOwnerView(db, "org", () => now);
    const view = fake.get("hostOrganizerOwnerViews/org")!;
    assert.equal(validateOwner(view), true,
      JSON.stringify(validateOwner.errors));
    assert.equal(view.ownerUid, "owner");
    assert.deepEqual(view.capabilitiesByRole, {
      owner: [...ownerViewCapabilities.owner],
      editor: [...ownerViewCapabilities.editor],
      analyst: [...ownerViewCapabilities.analyst]});
    const editor = (view.capabilitiesByRole as Record<string, string[]>)
      .editor;
    assert.equal(editor.includes("about"), false);
    assert.equal(editor.includes("settings"), false);
    assert.deepEqual(view.links, []);
    assert.equal(view.about, "  Runs every Sunday.  ");
    assert.deepEqual(view.photos, [{id: "p1",
      url: "https://example.com/p1.jpg", thumbnailUrl: null}]);
    assert.deepEqual(view.followerMessageMonths, [{month: "2026-11",
      used: 1}]);
    assert.equal(view.followerMessageLimit, 2);
    assert.equal(view.whatsappAvailable, false);
    // The stored days; the website works out its 30-day window from them.
    assert.deepEqual(view.insightDays, [
      {date: day(35), visits: 99, linkClicks: 0, bookingClicks: 0,
        newFollowers: 0, sources: [], links: []},
      {date: day(2), visits: 12, linkClicks: 3, bookingClicks: 1,
        newFollowers: 2, sources: [{source: "instagram", clicks: 3}],
        links: [{linkId: "l1", clicks: 3}]},
    ]);
  });
