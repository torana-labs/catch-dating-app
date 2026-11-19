import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  commercialTermsRecords,
  organizerTermsDocument,
} from "../commercialTerms/testFixture";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import type {OrganizerReferralDocument} from
  "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {validateOrganizerReferralDocument} from
  "../shared/generated/validators/organizerReferralDocument";
import {dayMillis} from "./hostTrial";
import {
  attachOrganizerReferral,
  creditableReferralLeads,
  isSelfReferral,
  nextEarnedReward,
  reconcileOrganizerReferrals,
  referralInTime,
  referralTermsActor,
  referralTrialDays,
  referralWithReward,
  type ReferralDeps,
} from "./organizerReferrals";

const now = Date.UTC(2026, 10, 19, 6);
const leadAt = now - 10 * dayMillis;
const referredTerms = organizerCommercialTermsId("referred");

function lead(id: string, referrerUid: string | null,
  extra: Record<string, unknown> = {}): Record<string, FakeData> {
  return {[`salesInboundIntents/${id}`]: {leadKind: "referral",
    status: "linked", organizerId: "referred", phone: "+919800000001",
    createdAt: Timestamp.fromMillis(leadAt),
    lead: {referralCredit: referrerUid ? {status: "referrer_account",
      referrerUid, referrerRole: "guest"} : {
      status: "missing_referrer_account", referrerUid: null,
      referrerRole: null}}, ...extra} as FakeData};
}

function seed(extra: Record<string, FakeData | undefined> = {}):
  FakeFirestore {
  return new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/referred": {name: "Kestrel Supper Club",
      ownerUserId: "referred-owner", ownership: {state: "claimed"}},
    "organizerGrowthFacts/referred": {organizerId: "referred", milestones: {
      firstEventAt: null, firstPaidBookingAt: null, claimedAt: null}},
    "organizers/referrer-org": {name: "Lantern Lane Runners",
      ownerUserId: "referrer", ownership: {state: "claimed"},
      createdAt: Timestamp.fromMillis(now - 200 * dayMillis)},
    ...lead("lead-1", "referrer"),
    ...extra,
  });
}

function deps(db: FakeFirestore, phones: Record<string, string> = {},
  atMillis = now): ReferralDeps {
  return {db: db as unknown as FirebaseFirestore.Firestore,
    now: () => atMillis, phoneOf: async (uid) => phones[uid] ?? null};
}

const attach = (db: FakeFirestore, phones: Record<string, string> = {}) =>
  attachOrganizerReferral(deps(db, phones),
    {organizerId: "referred", source: "ownershipTrigger"});

function referral(db: FakeFirestore, id = "referred"):
  OrganizerReferralDocument | undefined {
  return db.getDoc(`organizerReferrals/${id}`) as unknown as
    OrganizerReferralDocument | undefined;
}

test("website pricing states the same referral trial the server grants",
  () => {
    const pricing = readFileSync(path.join(__dirname,
      "../../../website/src/content/pricing.ts"), "utf8");
    assert.match(pricing, new RegExp(
      `referralTrialDays: ${referralTrialDays},`));
  });

test("a valid referral attaches and raises a 30-day trial to 60 in one write",
  async () => {
    const db = seed();
    const result = await attach(db);
    assert.deepEqual(result, {kind: "attached",
      referrerOrganizerId: "referrer-org", sourceIntentId: "lead-1",
      trialDaysWritten: 60});
    const stored = referral(db)!;
    assert.equal(validateOrganizerReferralDocument(stored), true);
    assert.deepEqual([stored.referrerOrganizerId, stored.referrerUid,
      stored.recordedAtMillis, stored.trialDays, stored.reward.status],
    ["referrer-org", "referrer", leadAt, 60, "pending"]);
    assert.deepEqual(stored.commercialTerms, {termsId: referredTerms,
      revision: 1, previousTrialDays: null});
    const terms = db.getDoc(`commercialTerms/${referredTerms}`) as
      {terms: {trial: {days: number}}; updatedByUid: string};
    assert.equal(terms.terms.trial.days, 60);
    assert.equal(terms.updatedByUid, referralTermsActor);
    assert.ok(db.getDoc(`commercialTermsRevisions/${referredTerms}_r1`));
  });

test("a founding host keeps its longer trial: nothing shortens it",
  async () => {
    const db = seed(commercialTermsRecords({organizers: [
      organizerTermsDocument("referred", {trial: {days: 90}})]}));
    const result = await attach(db);
    assert.equal(result.kind === "attached" && result.trialDaysWritten,
      null);
    assert.equal(referral(db)?.commercialTerms, null);
    const terms = db.getDoc(`commercialTerms/${referredTerms}`) as
      {revision: number; terms: {trial: {days: number}}};
    assert.deepEqual([terms.revision, terms.terms.trial.days], [1, 90]);
  });

test("a referral after the referred host's first event is refused",
  async () => {
    const started = seed({"organizerGrowthFacts/referred": {
      organizerId: "referred", milestones: {
        firstEventAt: Timestamp.fromMillis(now - dayMillis),
        firstPaidBookingAt: null}}});
    assert.deepEqual(await attach(started),
      {kind: "skip", reason: "trialStarted"});
    assert.equal(referral(started), undefined);
    assert.equal(started.getDoc(`commercialTerms/${referredTerms}`),
      undefined);
    // A first paid booking with no event dates the trial too.
    const paid = seed({"organizerGrowthFacts/referred": {
      organizerId: "referred", milestones: {firstEventAt: null,
        firstPaidBookingAt: Timestamp.fromMillis(now - dayMillis)}}});
    assert.deepEqual(await attach(paid),
      {kind: "skip", reason: "trialStarted"});
    // A first event still to come has not started the trial.
    const scheduled = seed({"organizerGrowthFacts/referred": {
      organizerId: "referred", milestones: {
        firstEventAt: Timestamp.fromMillis(now + 3 * dayMillis),
        firstPaidBookingAt: null}}});
    assert.equal((await attach(scheduled)).kind, "attached");
    assert.equal(referralInTime({trialStartMillis: now + dayMillis,
      recordedAtMillis: now + 2 * dayMillis, nowMillis: now}), false);
  });

test("a self-referral is refused: same account, same team or same phone",
  async () => {
    const sameOwner = seed(lead("lead-1", "referred-owner"));
    assert.deepEqual(await attach(sameOwner),
      {kind: "skip", reason: "selfReferral"});
    const manager = seed({"organizers/referred": {name: "Kestrel Supper Club",
      ownerUserId: "referred-owner", hostUserIds: ["referrer"],
      ownership: {state: "claimed"}}});
    assert.deepEqual(await attach(manager),
      {kind: "skip", reason: "selfReferral"});
    const samePhone = seed();
    assert.deepEqual(await attach(samePhone, {"referrer": "+919811111111",
      "referred-owner": "+919811111111"}),
    {kind: "skip", reason: "selfReferral"});
    const typedPhone = seed();
    assert.deepEqual(await attach(typedPhone,
      {"referred-owner": "+919800000001"}),
    {kind: "skip", reason: "selfReferral"});
    for (const db of [sameOwner, manager, samePhone, typedPhone]) {
      assert.equal(referral(db), undefined);
    }
    assert.equal(isSelfReferral({referrerUid: "a", referredOwnerUid: "b",
      referredManagerUids: ["b"], referrerOrganizerManagerUids: ["a", "b"],
      referrerPhone: null, leadPhone: null, referredOwnerPhone: null}), true);
  });

test("only an organizer refers, and the first valid lead wins", async () => {
  const guestOnly = seed(lead("lead-1", "guest"));
  assert.deepEqual(await attach(guestOnly),
    {kind: "skip", reason: "referrerNotOrganizer"});
  // An older lead from someone who runs no organizer does not block a
  // later lead from a host.
  const db = seed({...lead("lead-0", "guest",
    {createdAt: Timestamp.fromMillis(leadAt - dayMillis)})});
  const result = await attach(db);
  assert.equal(result.kind === "attached" && result.sourceIntentId,
    "lead-1");
  // An archived organizer does not count as the referrer's.
  const archived = seed({"organizers/referrer-org": {name: "Old Page",
    ownerUserId: "referrer", ownership: {state: "claimed"},
    archived: true}});
  assert.deepEqual(await attach(archived),
    {kind: "skip", reason: "referrerNotOrganizer"});
});

test("a referral attaches once, and never from a signed-out lead",
  async () => {
    const db = seed();
    assert.equal((await attach(db)).kind, "attached");
    assert.deepEqual(await attach(db),
      {kind: "skip", reason: "alreadyAttached"});
    assert.equal(db.getDoc(`commercialTermsRevisions/${referredTerms}_r2`),
      undefined);
    assert.deepEqual(await attach(seed(lead("lead-1", null))),
      {kind: "skip", reason: "noReferral"});
    const unclaimed = seed({"organizers/referred": {name: "Kestrel",
      ownership: {state: "unclaimed"}}});
    assert.deepEqual(await attach(unclaimed),
      {kind: "skip", reason: "notOwned"});
    assert.deepEqual(creditableReferralLeads([{id: "x", data: {
      leadKind: "referral", status: "needs_identity_review",
      organizerId: "referred"}}], "referred"), []);
  });

test("the daily reconcile attaches a recent claim or a recently linked lead",
  async () => {
    const db = seed({"organizerGrowthFacts/referred": {
      organizerId: "referred", milestones: {firstEventAt: null,
        firstPaidBookingAt: null,
        claimedAt: Timestamp.fromMillis(now - dayMillis)}}});
    assert.deepEqual(await reconcileOrganizerReferrals(deps(db)),
      {checked: 1, attached: 1});
    assert.equal(referral(db)?.source, "dailyReconcile");
    assert.deepEqual(await reconcileOrganizerReferrals(deps(db)),
      {checked: 1, attached: 0});
    const linked = seed(lead("lead-1", "referrer",
      {linkedAt: Timestamp.fromMillis(now - dayMillis)}));
    assert.deepEqual(await reconcileOrganizerReferrals(deps(linked)),
      {checked: 1, attached: 1});
  });

test("rewards stack one per referred host, oldest earned first", () => {
  const base = (id: string, status: "pending" | "earned" | "applied",
    earnedAtMillis: number | null): OrganizerReferralDocument => ({
    schemaVersion: 1, referredOrganizerId: id, referredOrganizerName: id,
    referrerOrganizerId: "referrer-org", referrerUid: "referrer",
    sourceIntentId: `lead-${id}`, recordedAtMillis: 1, attachedAtMillis: 1,
    source: "ownershipTrigger", trialDays: 60, commercialTerms: null,
    reward: {status, earnedAtMillis, earnedByBillId: earnedAtMillis ?
      `${id}_c2026-11-01` : null, appliedAtMillis: null,
    appliedBillId: null}, updatedAtMillis: 1});
  const rewards = [base("b", "earned", 20), base("a", "earned", 10),
    base("c", "pending", null), base("d", "applied", 5)];
  assert.equal(nextEarnedReward(rewards)?.referredOrganizerId, "a");
  assert.equal(nextEarnedReward([rewards[2], rewards[3]]), null);
  const applied = referralWithReward(rewards[1], "referrer-org_c2026-12-01",
    99);
  assert.deepEqual(applied.reward, {status: "applied", earnedAtMillis: 10,
    earnedByBillId: "a_c2026-11-01", appliedAtMillis: 99,
    appliedBillId: "referrer-org_c2026-12-01"});
  assert.equal(referralWithReward(applied, null, 100).reward.status,
    "earned");
});
