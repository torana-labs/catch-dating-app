import assert from "node:assert/strict";
import test from "node:test";
import {
  atSourceFeeMinor,
  commercialTermsSnapshotsEqual,
  mergeCommercialTerms,
  moneyFlowForRoute,
  organizerCommercialTermsId,
  snapshotCommercialTerms,
} from "./terms";
import {testCommercialTerms} from "./testFixture";

test("an override replaces only the keys it sets", () => {
  const platform = testCommercialTerms();
  const merged = mergeCommercialTerms(platform, {
    commission: {rateBasisPoints: 300},
    purposes: {hostMembership: {countsTowardCommission: false}},
  })!;
  assert.equal(merged.commission.rateBasisPoints, 300);
  assert.equal(merged.commission.capMinor, 1_000_000);
  assert.equal(merged.commission.cycleDays, 30);
  assert.equal(merged.purposes.hostMembership.countsTowardCommission, false);
  assert.equal(merged.purposes.hostMembership.atSourceFeeBasisPoints, 0);
  assert.deepEqual(merged.purposes.eventAdmission,
    platform.purposes.eventAdmission);
  assert.deepEqual(mergeCommercialTerms(platform, null), platform);
  assert.deepEqual(mergeCommercialTerms(platform, {}), platform);
});

test("an explicit null cap removes the cap; absence inherits it", () => {
  const uncapped = mergeCommercialTerms(testCommercialTerms(),
    {commission: {capMinor: null}})!;
  assert.equal(uncapped.commission.capMinor, null);
  assert.equal(mergeCommercialTerms(testCommercialTerms(),
    {commission: {}})!.commission.capMinor, 1_000_000);
});

test("money flow follows the payment route, not the terms", () => {
  assert.equal(moneyFlowForRoute("razorpayOAuth"), "hostCollected");
  assert.equal(moneyFlowForRoute("razorpayRoute"), "platformSplit");
  assert.equal(moneyFlowForRoute("disabled"), null);
  assert.equal(moneyFlowForRoute("somethingNew"), null);
});

test("snapshots freeze one purpose and deduct only on platformSplit", () => {
  const terms = testCommercialTerms({eventAdmission: 250});
  const input = {terms, purpose: "eventAdmission" as const,
    organizerId: "org", platformRevision: 3, organizerRevision: 1,
    nowMillis: 1000};
  const hostCollected = snapshotCommercialTerms({...input,
    moneyFlow: "hostCollected"});
  assert.equal(hostCollected.merchantOfRecord, "host");
  assert.equal(hostCollected.purposeTerms.atSourceFeeBasisPoints, 250);
  assert.equal(atSourceFeeMinor(hostCollected, 10_000), 0);
  const split = snapshotCommercialTerms({...input, moneyFlow: "platformSplit"});
  assert.equal(split.merchantOfRecord, "platform");
  assert.equal(atSourceFeeMinor(split, 10_000), 250);
  assert.equal(atSourceFeeMinor(split, 999), 24);
  // Editing the source terms afterwards cannot reach the snapshot.
  terms.commission.rateBasisPoints = 900;
  assert.equal(split.commission.rateBasisPoints, 500);
});

test("snapshot equality ignores key order and treats absence exactly", () => {
  const snapshot = snapshotCommercialTerms({terms: testCommercialTerms(),
    purpose: "formFee", organizerId: "org", moneyFlow: "hostCollected",
    platformRevision: 1, organizerRevision: 0, nowMillis: 1});
  const reordered = Object.fromEntries(Object.entries(snapshot).reverse()) as
    typeof snapshot;
  assert.equal(commercialTermsSnapshotsEqual(snapshot, reordered), true);
  assert.equal(commercialTermsSnapshotsEqual(undefined, undefined), true);
  assert.equal(commercialTermsSnapshotsEqual(snapshot, undefined), false);
  assert.equal(commercialTermsSnapshotsEqual(snapshot,
    {...snapshot, organizerRevision: 1}), false);
});

test("organizer term ids are hashed and stable", () => {
  assert.match(organizerCommercialTermsId("org/1"), /^org_[a-f0-9]{64}$/u);
  assert.equal(organizerCommercialTermsId("a"),
    organizerCommercialTermsId("a"));
});
