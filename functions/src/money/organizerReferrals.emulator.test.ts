import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {platformTermsDocument} from "../commercialTerms/testFixture";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
  OrganizerReferralDocument,
} from "../shared/generated/firestoreAdminTypes";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {dayMillis} from "./hostTrial";
import {adminManageOrganizerBillsHandler, type BillDeps} from
  "./organizerBills";
import {generateCycleBills} from "./organizerCycleBills";
import {attachOrganizerReferral} from "./organizerReferrals";

const projectId = "demo-catch-rules";
const ist = (5 * 60 + 30) * 60 * 1000;

/**
 * One host referral end to end in the Firestore emulator: attachment and its
 * refusals, the 60-day trial anchoring the referred host's first cycle, the
 * reward earned by its first paid bill (once), and the referrer's free month.
 * Each run uses its own organizer ids; the platform terms are shared with
 * other emulator tests and written with the same fixture.
 */
test("a host referral in the Firestore emulator: trial, reward and free month",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const run = randomUUID().slice(0, 8);
    const app = initializeApp({projectId}, `host-referrals-${run}`);
    const db = getEmulatorFirestore(app);
    const referred = `${run}-referred`;
    const referrer = `${run}-referrer`;
    const selfReferred = `${run}-self`;
    const late = `${run}-late`;
    // First events 10 Nov 2026, 12:00 IST; leads were sent ten days before.
    const firstEvent = Date.UTC(2026, 10, 10, 12) - ist;
    const attachAt = firstEvent - 2 * dayMillis;
    const leadAt = Timestamp.fromMillis(firstEvent - 10 * dayMillis);
    const refs: FirebaseFirestore.DocumentReference[] = [];
    const put = async (path: string, data: Record<string, unknown>) => {
      const ref = db.doc(path);
      refs.push(ref);
      await ref.set(data);
    };
    const lead = (id: string, organizerId: string, referrerUid: string) =>
      put(`salesInboundIntents/${id}`, {leadKind: "referral",
        status: "linked", organizerId, phone: "+919800000001",
        createdAt: leadAt, lead: {referralCredit: {
          status: "referrer_account", referrerUid,
          referrerRole: "guest"}}});
    const emptyFacts = {milestones: {firstEventAt: null,
      firstPaidBookingAt: null, claimedAt: null}};
    const referralDeps = (nowMillis: number) => ({db, now: () => nowMillis,
      phoneOf: async () => null});
    try {
      // Shared with other emulator tests, so it is written, never deleted.
      await db.doc("commercialTerms/platform").set(platformTermsDocument());
      await put(`organizers/${referrer}`, {name: "Lantern Lane Runners",
        ownerUserId: `${run}-referrer-owner`, ownership: {state: "claimed"},
        createdAt: Timestamp.fromMillis(firstEvent - 200 * dayMillis)});
      await put(`organizerGrowthFacts/${referrer}`, {organizerId: referrer,
        milestones: {firstEventAt: Timestamp.fromMillis(firstEvent),
          firstPaidBookingAt: null, claimedAt: null}});
      for (const id of [referred, selfReferred, late]) {
        await put(`organizers/${id}`, {name: "Kestrel Supper Club",
          ownerUserId: id === selfReferred ? `${run}-referrer-owner` :
            `${id}-owner`, ownership: {state: "claimed"}});
        await put(`organizerGrowthFacts/${id}`, {organizerId: id,
          ...emptyFacts});
        await lead(`${id}-lead`, id, `${run}-referrer-owner`);
      }
      await put(`organizerGrowthFacts/${late}`, {organizerId: late,
        milestones: {firstEventAt: Timestamp.fromMillis(attachAt - dayMillis),
          firstPaidBookingAt: null, claimedAt: null}});
      for (const id of [referred, selfReferred, late]) {
        refs.push(db.doc(`organizerReferrals/${id}`),
          db.doc(`commercialTerms/${organizerCommercialTermsId(id)}`),
          db.doc(`commercialTermsRevisions/${
            organizerCommercialTermsId(id)}_r1`));
      }

      // Refusals: the referrer's own second page, and a trial already begun.
      assert.deepEqual(await attachOrganizerReferral(referralDeps(attachAt),
        {organizerId: selfReferred, source: "ownershipTrigger"}),
      {kind: "skip", reason: "selfReferral"});
      assert.deepEqual(await attachOrganizerReferral(referralDeps(attachAt),
        {organizerId: late, source: "ownershipTrigger"}),
      {kind: "skip", reason: "trialStarted"});
      assert.equal((await db.doc(`organizerReferrals/${late}`).get()).exists,
        false);

      // Two attachments at once: one referral, one terms revision.
      const results = await Promise.all([1, 2].map(() =>
        attachOrganizerReferral(referralDeps(attachAt),
          {organizerId: referred, source: "ownershipTrigger"})));
      assert.deepEqual(results.map((result) => result.kind).sort(),
        ["attached", "skip"]);
      const terms = (await db.doc(`commercialTerms/${
        organizerCommercialTermsId(referred)}`).get()).data();
      assert.deepEqual([terms?.revision, terms?.terms.trial.days], [1, 60]);

      // The referred host's first event, a payment after its 60 days, and
      // its first cycle: anchored at the referral trial's end.
      await db.doc(`organizerGrowthFacts/${referred}`).update(
        {"milestones.firstEventAt": Timestamp.fromMillis(firstEvent)});
      const trialEnd = firstEvent + 60 * dayMillis;
      await put(`guestPayments/${run}-p1`, {purpose: "publicEvent",
        organizerId: referred, eventId: `${run}-ev`,
        capturedAt: Timestamp.fromMillis(trialEnd + dayMillis),
        amountPaise: 200_000, refundedAmountPaise: 0,
        routing: {selection: {route: "razorpayOAuth"}}});
      // The referrer's own sales in its first cycles after its 30 days.
      await put(`guestPayments/${run}-p2`, {purpose: "publicEvent",
        organizerId: referrer, eventId: `${run}-ev2`,
        capturedAt: Timestamp.fromMillis(trialEnd + 2 * dayMillis),
        amountPaise: 1_000_000, refundedAmountPaise: 0,
        routing: {selection: {route: "razorpayOAuth"}}});
      const billDay = trialEnd + 30 * dayMillis + dayMillis;
      const billDeps = (nowMillis: number) => ({db: () => db,
        now: () => nowMillis}) as unknown as BillDeps;
      await generateCycleBills(billDeps(billDay), null);
      const pointer = (await db.doc(`organizerBillingCycles/${referred}`)
        .get()).data() as OrganizerBillingCycleDocument;
      refs.push(db.doc(`organizerBillingCycles/${referred}`),
        db.doc(`organizerBillingCycles/${referrer}`));
      assert.equal(pointer.trialEndsAtMillis, trialEnd);
      const referredBills = (await db.collection("organizerBills")
        .where("organizerId", "==", referred).get()).docs;
      refs.push(...referredBills.map((doc) => doc.ref));
      assert.equal(referredBills.length, 1);
      const bill = referredBills[0].data() as OrganizerBillDocument;
      assert.deepEqual([bill.status, bill.totalMinor], ["toSend", 10_000]);
      // Bills made before the reward was earned are billed in full.
      const before = (await db.collection("organizerBills")
        .where("organizerId", "==", referrer).get()).docs;
      refs.push(...before.map((doc) => doc.ref));
      assert.ok(before.every((doc) => doc.data().referralReward ===
        undefined));

      // Staff send it, then mark it paid (twice: the second is refused).
      const act = (action: string, revision: number, nowMillis: number) =>
        adminManageOrganizerBillsHandler({auth: {uid: `${run}-operator`,
          token: {adminOwner: true}}, data: {action, month: null,
          organizerId: null, billId: bill.billId, expectedRevision: revision,
          note: null}} as unknown as CallableRequest<unknown>,
        {...billDeps(nowMillis), links: () => ({create: async () => {
          throw new Error("offline");
        }}), invoices: () => ({create: async () => {
          throw new Error("offline");
        }}), notify: async () => undefined} as unknown as BillDeps);
      await act("send", 1, billDay + 1000);
      await act("markPaid", 2, billDay + 2000);
      await assert.rejects(act("markPaid", 3, billDay + 3000));
      const earned = (await db.doc(`organizerReferrals/${referred}`).get())
        .data() as OrganizerReferralDocument;
      assert.deepEqual([earned.reward.status, earned.reward.earnedByBillId],
        ["earned", bill.billId]);
      refs.push(db.doc(`nominatorCredits/${bill.billId}`));

      // The referrer's next cycle with something to bill is free.
      await put(`guestPayments/${run}-p3`, {purpose: "publicEvent",
        organizerId: referrer, eventId: `${run}-ev3`,
        capturedAt: Timestamp.fromMillis(billDay + 5 * dayMillis),
        amountPaise: 400_000, refundedAmountPaise: 0,
        routing: {selection: {route: "razorpayOAuth"}}});
      await generateCycleBills(billDeps(billDay + 40 * dayMillis), null);
      const referrerBills = (await db.collection("organizerBills")
        .where("organizerId", "==", referrer).get()).docs;
      refs.push(...referrerBills.map((doc) => doc.ref));
      const free = referrerBills.map((doc) => doc.data() as
        OrganizerBillDocument).filter((item) => item.referralReward);
      assert.equal(free.length, 1);
      assert.deepEqual([free[0].status, free[0].totalMinor,
        free[0].referralReward?.referredOrganizerId],
      ["free", 0, referred]);
      const applied = (await db.doc(`organizerReferrals/${referred}`).get())
        .data() as OrganizerReferralDocument;
      assert.deepEqual([applied.reward.status, applied.reward.appliedBillId],
        ["applied", free[0].billId]);
    } finally {
      await Promise.all(refs.map((ref) => ref.delete()));
      await db.terminate();
      await deleteApp(app);
    }
  });
