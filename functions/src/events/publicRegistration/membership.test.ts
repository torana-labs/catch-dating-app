import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {EventDocument, OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {communityMembershipRows} from
  "../../memberships/communityMembershipFixture";
import {hasEventCommunityMembership} from
  "../../memberships/communityMembershipAuthority";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {eventPolicyFromEvent} from "../eventPolicy";
import {eventGuestEntry} from "../../guestEvents/eventGuestEntry";
import {publicFixture, uid, org, now, eventId} from "./testFixture";
import {publicCheckoutQuote} from "./policy";
import {finalizePublicPayment} from "./admission";
import {PUBLIC_PAYMENT_COLLECTION} from "./paymentLedger";

async function fixture() {
  const h = await publicFixture();
  const event = h.event as unknown as EventDocument;
  Object.assign(event.eventPolicy!.admission, {format: "manualApproval",
    manualApprovalRequired: true, approvedMembersSkipReview: true});
  const policy = deriveEventSeatPolicy(event);
  Object.assign(h.store.get(`eventSeatLedgers/${eventId}`)!, {
    policyVersion: policy.policyVersion, policyHash: policy.policyHash,
  });
  const member = (state: "active" | "revoked") => {
    for (const [path, value] of Object.entries(
      communityMembershipRows(org, uid, state))) h.store.put(path, value);
  };
  const quote = publicCheckoutQuote(eventId, event,
    h.organizer as unknown as OrganizerDocument, now, true);
  // The website reads the member's step from the event's guest entry.
  const read = () => h.store.db().runTransaction((tx) =>
    eventGuestEntry(h.store.db(), tx, eventId, now));
  return {...h, event, member, read, reviewedQuote: quote};
}

test("member exemption needs current proof for both viewer and reservation",
  async () => {
    const h = await fixture();
    assert.deepEqual((await h.read())?.registration,
      {guest: "unsupported", member: "bookPaid"});
    await assert.rejects(h.reserve({reviewedQuote: h.reviewedQuote}),
      /reviewed admission/);
    // Exemptions must read real membership even without a members-only gate.
    assert.equal(await h.store.db().runTransaction((tx) =>
      hasEventCommunityMembership({db: h.store.db(), tx,
        organizerId: org, uid, policy: eventPolicyFromEvent(h.event),
        nowMillis: now})), false);
    h.member("active");
    const reserved = await h.reserve({reviewedQuote: h.reviewedQuote});
    assert.ok("payment" in reserved);
    h.member("revoked");
    await assert.rejects(h.reserve({reviewedQuote: h.reviewedQuote,
      requestId: "public_request2"}), /reviewed admission/);
  });

test("revoked membership before capture completion releases into refund",
  async () => {
    const h = await fixture();
    h.member("active");
    const reserved = await h.reserve({reviewedQuote: h.reviewedQuote});
    if (!("paymentId" in reserved)) throw new Error("Expected payment");
    Object.assign(h.store.get(
      `${PUBLIC_PAYMENT_COLLECTION}/${reserved.paymentId}`)!, {
      status: "captured", providerOrderId: "order_one",
      providerPaymentId: "pay_one", capturedAt: Timestamp.fromMillis(now + 10),
    });
    h.member("revoked");
    assert.equal(await finalizePublicPayment({db: h.store.db(),
      paymentId: reserved.paymentId, nowMillis: now + 20,
      loadCurrentAuthUser: h.auth}), "refundPending");
  });

test("member exemption cannot enable partitioned guest inventory", async () => {
  const h = await fixture();
  h.member("active");
  h.event.eventPolicy!.admission.cohortCapacityLimits = {men: 1};
  assert.equal((await h.read())?.registration.member, "unsupported");
  await assert.rejects(h.reserve({reviewedQuote: h.reviewedQuote}),
    /cohort, membership or Cross Paths/);
});
