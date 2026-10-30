import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  CommercialTermsUnavailableError,
  resolveCommercialTerms,
  resolveCommercialTermsIfConfigured,
} from "./resolver";
import {
  commercialTermsRecords,
  organizerTermsDocument,
  platformTermsDocument,
} from "./testFixture";
import {organizerCommercialTermsId} from "./terms";

function db(records: Record<string, Record<string, unknown>>) {
  return new FakeFirestore(records) as unknown as FirebaseFirestore.Firestore;
}

const resolve = (store: FirebaseFirestore.Firestore, organizerId = "org-1") =>
  resolveCommercialTerms({db: store, organizerId, purpose: "hostMembership",
    moneyFlow: "hostCollected", nowMillis: 5000});

test("platform defaults apply to every organizer without an override",
  async () => {
    const snapshot = await resolve(db(commercialTermsRecords()));
    assert.deepEqual([snapshot.platformRevision, snapshot.organizerRevision,
      snapshot.commission.rateBasisPoints, snapshot.commission.capMinor,
      snapshot.trial.days, snapshot.toolsOnly.feeMinor,
      snapshot.gatewayFeeBearer, snapshot.resolvedAtMillis],
    [1, 0, 500, 1_000_000, 30, 500_000, "host", 5000]);
    assert.equal(snapshot.purpose, "hostMembership");
    assert.equal(snapshot.merchantOfRecord, "host");
  });

test("an organizer override wins for that organizer only", async () => {
  const store = db(commercialTermsRecords({organizers: [
    organizerTermsDocument("org-1", {commission: {rateBasisPoints: 250,
      capMinor: null}, trial: {days: 60}}, 4)]}));
  const overridden = await resolve(store);
  assert.deepEqual([overridden.commission.rateBasisPoints,
    overridden.commission.capMinor, overridden.trial.days,
    overridden.organizerRevision], [250, null, 60, 4]);
  const other = await resolve(store, "org-2");
  assert.deepEqual([other.commission.rateBasisPoints, other.organizerRevision],
    [500, 0]);
});

test("missing or malformed records fail closed", async () => {
  await assert.rejects(resolve(db(commercialTermsRecords({platform: null}))),
    (error) => error instanceof CommercialTermsUnavailableError &&
      error.reason === "platformUnconfigured");
  const corrupt = commercialTermsRecords();
  (corrupt["commercialTerms/platform"].terms as Record<string, unknown>)
    .currency = "USD";
  await assert.rejects(resolve(db(corrupt)), (error) =>
    error instanceof CommercialTermsUnavailableError &&
    error.reason === "invalidRecord");
  // An override stored under another organizer's id is never applied.
  const path = `commercialTerms/${organizerCommercialTermsId("org-1")}`;
  await assert.rejects(resolve(db({...commercialTermsRecords(),
    [path]: organizerTermsDocument("org-9", {}) as unknown as
      Record<string, unknown>})), /not configured/);
});

test("the lenient variant returns null only for unconfigured terms",
  async () => {
    assert.equal(await resolveCommercialTermsIfConfigured({
      db: db(commercialTermsRecords({platform: null})), organizerId: "org-1",
      purpose: "eventAdmission", moneyFlow: "hostCollected", nowMillis: 1}),
    null);
    const snapshot = await resolveCommercialTermsIfConfigured({
      db: db(commercialTermsRecords({platform: platformTermsDocument(
        undefined, 7)})), organizerId: "org-1", purpose: "formFee",
      moneyFlow: "hostCollected", nowMillis: 1});
    assert.equal(snapshot?.platformRevision, 7);
  });
