import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {prepareFormPaymentRouting, formPaymentExecutionFor,
  formPaymentCollectionSetup} from
  "./formPaymentRoutingRuntime";
import {reserveFormPayment} from "./formPaymentSubmission";
import {formPaymentId} from "./formPaymentIdentity";
import {projectFormPayment} from "./formPaymentProjection";
import {validateGetOrganizerFormPaymentCallableResponse} from
  "../../shared/generated/validators/getOrganizerFormPaymentOutput";
import type {RazorpayPlatformPaymentConfig} from
  "../razorpayPlatformPaymentConfig";
import {prepareRazorpayCollectionRouting} from "../razorpayCollectionRouting";
import {organizerPaymentPolicyId} from "../paymentRouting";
import {commercialTermsRecords, platformTermsDocument, testCommercialTerms} from
  "../../commercialTerms/testFixture";

const now = Timestamp.fromMillis(1000);
const profile: RazorpayPlatformPaymentConfig = {
  schema: "catch.razorpay-platform-payments/v1", mode: "test",
  platformAccountId: "acc_platform", keyId: "rzp_test_platform",
  keySecret: "test-secret", webhookSecret: "webhook-secret",
};
const version = "projects/catch-test/secrets/PLATFORM/versions/1";
function fixture() {
  const h = createFormPaymentFixture();
  const paymentId = formPaymentId(h.data.draftId);
  h.version.definition.payment!.connectionId = null;
  h.store.records.delete("organizerPaymentConnections/connection");
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
  h.store.records.set("paymentRoutingPolicies/app", {
    scope: "app", organizerId: null, revision: 1, updatedAt: now,
    formFee: {route: "razorpayRoute", mode: "test", currency: "INR",
      merchantCountry: "IN"}, eventAdmission: null,
  });
  const loaded: string[] = [];
  let verified = 0;
  const deps: NonNullable<Parameters<typeof prepareFormPaymentRouting>[1]> = {
    oauth: async () => {
      throw new Error("OAuth must not be loaded");
    },
    platformVersion: () => version,
    platform: async (value) => {
      loaded.push(value); return profile;
    },
    verifyDestination: async (_, accountId, productId) => {
      assert.equal(accountId, "acc_host");
      assert.equal(productId, "accprod_host"); verified++;
    },
  };
  const prepare = () => prepareFormPaymentRouting({db: h.db, paymentId,
    organizerId: "org", connectionId: null, amountPaise: 10000}, deps);
  const reserve = async () => {
    const prepared = await prepare();
    const reserved = await reserveFormPayment({db: h.db, request: h.request,
      data: h.data, now, routing: prepared.snapshot,
      authority: prepared.runtime.authority});
    return {...reserved, prepared};
  };
  return {...h, paymentId, deps, loaded, prepare, reserve,
    verified: () => verified};
}

test("Route reserves, projects and submits without an OAuth connection",
  async () => {
    const h = fixture();
    const {payment, paymentId, prepared} = await h.reserve();
    assert.equal(h.verified(), 1);
    assert.equal(payment.connectionId, null);
    assert.equal(payment.accountId, "acc_platform");
    assert.equal(payment.routing?.transferAmountMinor, 9750);
    assert.equal(payment.routing?.settlementHold, false);
    // The fee came from commercial terms, frozen on the attempt.
    assert.equal(payment.routing?.commercialTerms?.moneyFlow, "platformSplit");
    assert.equal(payment.routing?.commercialTerms?.merchantOfRecord,
      "platform");
    assert.equal(payment.routing?.commercialTerms?.purposeTerms
      .atSourceFeeBasisPoints, 250);
    assert.equal(payment.routing?.commercialTerms?.platformRevision, 1);
    assert.equal((await prepared.runtime.processor.read(paymentId))
      .routing?.configurationVersion, version);
    const output = await projectFormPayment({db: h.db, paymentId,
      payment: {...payment, status: "checkoutReady",
        providerOrderId: "order_one"},
      respondentUid: "person", now: 1000});
    assert.equal(output.checkout?.publicToken, "rzp_test_platform");
    assert.ok(validateGetOrganizerFormPaymentCallableResponse(output));
    assert.equal(JSON.stringify(output).includes("test-secret"), false);
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
  });

test("changed policy or destination prevents reservation without writes",
  async () => {
    for (const change of ["policy", "owner", "destination", "eligibility"]) {
      const h = fixture();
      const prepared = await h.prepare();
      if (change === "policy") {
        const path = "paymentRoutingPolicies/app";
        h.store.records.set(path, {...h.store.records.get(path), revision: 2,
          formFee: {route: "disabled"}});
      } else if (change === "owner") {
        h.store.records.set("organizers/org", {ownerUserId: "other"});
      } else {
        const path = "hostPaymentAccounts/host_razorpay";
        h.store.records.set(path, {...h.store.records.get(path),
          ...(change === "destination" ? {providerAccountId: "acc_other",
            razorpayAccountId: "acc_other"} : {payoutsEnabled: false})});
      }
      const before = [...h.store.records];
      await assert.rejects(reserveFormPayment({db: h.db, request: h.request,
        data: h.data, now, routing: prepared.snapshot,
        authority: prepared.runtime.authority}));
      assert.deepEqual([...h.store.records], before);
    }
  });

test("existing payment resumes its profile after defaults and owner change",
  async () => {
    const h = fixture();
    const {payment, paymentId} = await h.reserve();
    h.store.records.set("paymentRoutingPolicies/app", {invalid: true});
    h.store.records.set("organizers/org", {ownerUserId: "other"});
    h.deps.platformVersion = () => {
      throw new Error("No current config reads");
    };
    const execution = await formPaymentExecutionFor({db: h.db, paymentId,
      payment}, h.deps);
    assert.equal((await execution.authority!.resolve(payment)).accountId,
      "acc_platform");
    assert.equal(h.loaded.at(-1), version);
    await assert.rejects(execution.processor.read(`fp_${"a".repeat(32)}`),
      /runtime mismatch/u);
    h.store.records.set(`organizerFormPayments/${paymentId}`, {...payment,
      routing: {...payment.routing!, destinationAccountId: "acc_other"}});
    await assert.rejects(execution.processor.read(paymentId),
      /routing changed/u);
  });

test("unready or malformed payout records fail before provider work",
  async () => {
    for (const patch of [{requirementsCurrentlyDue: ["kyc"]},
      {defaultCurrency: null}, {razorpayAccountId: "acc_other"},
      {provider: "stripe"}, {chargesEnabled: false}]) {
      const h = fixture();
      const path = "hostPaymentAccounts/host_razorpay";
      h.store.records.set(path, {...h.store.records.get(path), ...patch});
      await assert.rejects(h.prepare(), /not ready/u);
      assert.equal(h.verified(), 0);
    }
  });

test("Host Route readiness stays independent of partner OAuth setup",
  async () => {
    const h = fixture();
    assert.deepEqual(await formPaymentCollectionSetup({db: h.db,
      organizerId: "org"}, h.deps),
    {route: "razorpayRoute", mode: "test", ready: true});
    h.deps.platform = async () => {
      throw new Error("Missing profile");
    };
    assert.deepEqual(await formPaymentCollectionSetup({db: h.db,
      organizerId: "org"}, h.deps),
    {route: "razorpayRoute", mode: "test", ready: false});
  });

test("event collection uses its own fee and holds settlement",
  async () => {
    const h = fixture();
    const path = "paymentRoutingPolicies/app";
    h.store.records.set(path, {...h.store.records.get(path),
      eventAdmission: {route: "razorpayRoute", mode: "test", currency: "INR",
        merchantCountry: "IN"}});
    const event = await prepareRazorpayCollectionRouting({db: h.db,
      organizerId: "org", purpose: "eventAdmission", connectionId: null,
      amountMinor: 10000}, h.deps);
    assert.equal(event.purpose, "eventAdmission");
    assert.equal(event.transferAmountMinor, 9500);
    assert.equal(event.settlementHold, true);
    const form = await h.prepare();
    assert.equal(form.snapshot.transferAmountMinor, 9750);
    assert.equal(form.snapshot.settlementHold, false);
  });

test("event collection never falls back to form fees or an unavailable rail",
  async () => {
    for (const selection of [null, {route: "disabled"},
      {route: "stripeConnectDestination", mode: "test", currency: "INR",
        merchantCountry: "IN"}]) {
      const h = fixture();
      const path = "paymentRoutingPolicies/app";
      h.store.records.set(path, {...h.store.records.get(path),
        eventAdmission: selection});
      await assert.rejects(prepareRazorpayCollectionRouting({db: h.db,
        organizerId: "org", purpose: "eventAdmission", connectionId: null,
        amountMinor: 10000}, h.deps));
      assert.equal(h.verified(), 0);
      assert.deepEqual(h.loaded, []);
    }
  });

test("organizer event override is independent of the app form route",
  async () => {
    const h = fixture();
    h.store.records.set(
      `paymentRoutingPolicies/${organizerPaymentPolicyId("org")}`, {
        scope: "organizer", organizerId: "org", revision: 2, updatedAt: now,
        formFee: null, eventAdmission: {route: "razorpayRoute", mode: "test",
          currency: "INR", merchantCountry: "IN"},
      });
    const event = await prepareRazorpayCollectionRouting({db: h.db,
      organizerId: "org", purpose: "eventAdmission", connectionId: null,
      amountMinor: 10000}, h.deps);
    assert.equal(event.policySource, "organizer");
    assert.equal(event.organizerRevision, 2);
    assert.equal((await h.prepare()).snapshot.policySource, "app");
  });

test("event OAuth selects one ready organizer merchant and rejects ambiguity",
  async () => {
    for (const count of [0, 1, 2]) {
      const h = createFormPaymentFixture();
      const connection = h.store.records.get(
        "organizerPaymentConnections/connection")!;
      connection.tokenExpiresAt = Timestamp.fromMillis(Date.now() + 3600_000);
      h.store.records.delete("organizerPaymentConnections/connection");
      for (let index = 0; index < count; index++) {
        h.store.records.set(`organizerPaymentConnections/merchant${index}`,
          {...connection});
      }
      h.store.records.set("paymentRoutingPolicies/app", {
        scope: "app", organizerId: null, revision: 1, updatedAt: now,
        formFee: null, eventAdmission: {route: "razorpayOAuth", mode: "test",
          currency: "INR", merchantCountry: "IN"}});
      let accesses = 0;
      const deps = {...fixture().deps, oauth: async () => ({mode: "test",
        configurationVersion: version, credentials: {access: async () => {
          accesses++;
        }}})} as unknown as NonNullable<Parameters<
          typeof prepareRazorpayCollectionRouting>[1]>;
      const prepare = () => prepareRazorpayCollectionRouting({db: h.db,
        organizerId: "org", purpose: "eventAdmission", connectionId: null,
        amountMinor: 10000}, deps);
      if (count === 1) {
        const snapshot = await prepare();
        assert.equal(snapshot.bindingId, "merchant0");
        assert.equal(snapshot.selection.route, "razorpayOAuth");
        assert.equal(snapshot.purpose, "eventAdmission");
        assert.equal(accesses, 1);
      } else {
        await assert.rejects(prepare());
        assert.equal(accesses, 0);
      }
    }
  });

test("Route fails closed until commercial terms are configured", async () => {
  const h = fixture();
  h.store.records.delete("commercialTerms/platform");
  await assert.rejects(h.prepare(), /commercial terms are not configured/);
});

test("a terms change applies to new attempts and keeps old ones",
  async () => {
    const h = fixture();
    const before = await h.prepare();
    h.store.records.set("commercialTerms/platform", platformTermsDocument(
      testCommercialTerms({formFee: 900}), 2) as unknown as
      Record<string, unknown>);
    const after = await h.prepare();
    assert.deepEqual([before.snapshot.transferAmountMinor,
      before.snapshot.commercialTerms?.platformRevision],
    [9750, 1]);
    assert.deepEqual([after.snapshot.transferAmountMinor,
      after.snapshot.commercialTerms?.platformRevision], [9100, 2]);
  });

test("hostCollected tickets freeze terms when configured, never block",
  async () => {
    for (const configured of [true, false]) {
      const h = createFormPaymentFixture();
      const connection = h.store.records.get(
        "organizerPaymentConnections/connection")!;
      connection.tokenExpiresAt = Timestamp.fromMillis(Date.now() + 3600_000);
      h.store.records.set("paymentRoutingPolicies/app", {
        scope: "app", organizerId: null, revision: 1, updatedAt: now,
        formFee: null, eventAdmission: {route: "razorpayOAuth", mode: "test",
          currency: "INR", merchantCountry: "IN"}});
      if (configured) {
        for (const [path, value] of Object.entries(commercialTermsRecords())) {
          h.store.records.set(path, value);
        }
      }
      const deps = {...fixture().deps, now: () => 4242,
        oauth: async () => ({mode: "test", configurationVersion: version,
          credentials: {access: async () => undefined}})} as unknown as
        NonNullable<Parameters<typeof prepareRazorpayCollectionRouting>[1]>;
      const snapshot = await prepareRazorpayCollectionRouting({db: h.db,
        organizerId: "org", purpose: "eventAdmission", connectionId: null,
        amountMinor: 10000}, deps);
      // Guest money goes to the organizer's own account either way.
      assert.equal(snapshot.transferAmountMinor, null);
      if (configured) {
        assert.deepEqual([snapshot.commercialTerms?.moneyFlow,
          snapshot.commercialTerms?.merchantOfRecord,
          snapshot.commercialTerms?.purpose,
          snapshot.commercialTerms?.commission.rateBasisPoints,
          snapshot.commercialTerms?.resolvedAtMillis],
        ["hostCollected", "host", "eventAdmission", 500, 4242]);
      } else {
        assert.equal(snapshot.commercialTerms, undefined);
      }
    }
  });
