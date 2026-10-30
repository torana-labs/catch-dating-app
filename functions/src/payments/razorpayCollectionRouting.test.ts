import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from "./formPayments/formPaymentTestStore";
import {eventAdmissionCollectionReady, prepareRazorpayCollectionRouting,
  type RazorpayCollectionRoutingDeps} from "./razorpayCollectionRouting";
import type {RazorpayPlatformPaymentConfig} from
  "./razorpayPlatformPaymentConfig";
import {commercialTermsRecords, platformTermsDocument, testCommercialTerms} from
  "../commercialTerms/testFixture";

const now = Timestamp.fromMillis(1000);
const platformProfile: RazorpayPlatformPaymentConfig = {
  schema: "catch.razorpay-platform-payments/v1", mode: "test",
  platformAccountId: "acc_platform", keyId: "rzp_test_platform",
  keySecret: "test-secret", webhookSecret: "webhook-secret",
};
const oauthRoute = {route: "razorpayOAuth", mode: "test", currency: "INR",
  merchantCountry: "IN"};
const platformRoute = {...oauthRoute, route: "razorpayRoute"};

/** One organizer with one ready OAuth connection and a ready Route account. */
function fixture(eventAdmission: unknown) {
  const h = createFormPaymentFixture();
  h.store.records.set("organizers/org", {ownerUserId: "host"});
  for (const [path, value] of Object.entries(commercialTermsRecords({
    platform: platformTermsDocument(testCommercialTerms({formFee: 250,
      eventAdmission: 500}))}))) h.store.records.set(path, value);
  h.store.records.set("hostPaymentAccounts/host_razorpay", {
    userId: "host", provider: "razorpay", country: "IN",
    defaultCurrency: "INR", providerAccountId: "acc_host",
    razorpayAccountId: "acc_host", razorpayProductId: "accprod_host",
    stripeAccountId: "", chargesEnabled: true, payoutsEnabled: true,
    detailsSubmitted: true, onboardingStatus: "complete",
    requirementsCurrentlyDue: [], requirementsPastDue: [],
    requirementsPendingVerification: [], createdAt: now, updatedAt: now,
  });
  // Preparation checks token expiry against the real clock.
  const connectionPath = "organizerPaymentConnections/connection";
  h.store.records.set(connectionPath, {...h.store.records.get(connectionPath),
    tokenExpiresAt: Timestamp.fromMillis(Date.now() + 86_400_000)});
  if (eventAdmission !== undefined) {
    h.store.records.set("paymentRoutingPolicies/app", {
      scope: "app", organizerId: null, revision: 1, updatedAt: now,
      formFee: null, eventAdmission,
    });
  }
  const platformLoads: string[] = [];
  const deps: RazorpayCollectionRoutingDeps = {
    oauth: (async () => ({mode: "test",
      configurationVersion: "projects/catch-test/secrets/OAUTH/versions/1",
      credentials: {access: async () => ({})}})) as unknown as
      RazorpayCollectionRoutingDeps["oauth"],
    platformVersion: () => "projects/catch-test/secrets/PLATFORM/versions/1",
    platform: async (version) => {
      platformLoads.push(version);
      return platformProfile;
    },
    verifyDestination: async () => undefined,
    now: () => 1000,
  };
  const ready = () => eventAdmissionCollectionReady({db: h.db,
    organizerId: "org", nowMillis: 1000});
  const prepare = () => prepareRazorpayCollectionRouting({db: h.db,
    organizerId: "org", purpose: "eventAdmission", connectionId: null,
    amountMinor: 10000}, deps);
  const setConnection = (patch: Record<string, unknown>) => {
    const path = "organizerPaymentConnections/connection";
    h.store.records.set(path, {...h.store.records.get(path), ...patch});
  };
  return {...h, ready, prepare, setConnection, platformLoads};
}

test("an OAuth event route collects on the organizer's own account",
  async () => {
    const h = fixture(oauthRoute);
    assert.equal(await h.ready(), true);
    const snapshot = await h.prepare();
    assert.equal(snapshot.selection.route, "razorpayOAuth");
    assert.equal(snapshot.bindingId, "connection");
    assert.equal(snapshot.merchantAccountId, "acc_merchant");
    assert.equal(snapshot.checkoutKey, "rzp_test_oauth_public");
    assert.equal(snapshot.destinationAccountId, null);
    assert.equal(snapshot.transferAmountMinor, null);
    assert.deepEqual(h.platformLoads, []);
  });

test("event checkout never falls back to Catch's account", async () => {
  const cases: Array<[string, unknown, (h: ReturnType<typeof fixture>) =>
    void]> = [
      ["no policy", undefined, () => undefined],
      ["disabled purpose", {route: "disabled"}, () => undefined],
      ["null purpose", null, () => undefined],
      ["disconnected", oauthRoute,
        (h) => h.setConnection({status: "disconnected"})],
      ["needs attention", oauthRoute,
        (h) => h.setConnection({status: "needsAttention"})],
      ["refresh failed", oauthRoute,
        (h) => h.setConnection({lastErrorCode: "refreshRejected"})],
      ["webhook unverified", oauthRoute,
        (h) => h.setConnection({webhookVerifiedAt: null})],
      ["token expired", oauthRoute,
        (h) => h.setConnection({tokenExpiresAt: Timestamp.fromMillis(1000)})],
      ["other mode", {...oauthRoute, mode: "live"}, () => undefined],
      ["two merchants", oauthRoute, (h) => h.store.records.set(
        "organizerPaymentConnections/second",
        {...h.store.records.get("organizerPaymentConnections/connection"),
          accountId: "acc_second"})],
    ];
  for (const [name, policy, change] of cases) {
    const h = fixture(policy);
    change(h);
    assert.equal(await h.ready(), false, name);
    await assert.rejects(h.prepare(), (error: {code?: string}) => {
      assert.equal(error.code, "failed-precondition", name);
      return true;
    }, name);
    assert.deepEqual(h.platformLoads, [], name);
  }
});

test("only an explicit Route policy collects through Catch's account",
  async () => {
    const h = fixture(platformRoute);
    assert.equal(await h.ready(), true);
    const snapshot = await h.prepare();
    assert.equal(snapshot.merchantAccountId, "acc_platform");
    assert.equal(snapshot.destinationAccountId, "acc_host");
    assert.equal(snapshot.settlementHold, true);
    assert.equal(h.platformLoads.length, 1);

    const notReady = fixture(platformRoute);
    notReady.store.records.delete("hostPaymentAccounts/host_razorpay");
    assert.equal(await notReady.ready(), false);
  });

test("readiness reads no credentials and changes nothing", async () => {
  const h = fixture(oauthRoute);
  const before = JSON.stringify([...h.store.records]);
  assert.equal(await h.ready(), true);
  assert.equal(JSON.stringify([...h.store.records]), before);
});
