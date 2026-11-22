import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {prepareCrmOriginSeatIdentity, FirestoreSeatIdentityAuthority} from
  "../events/seatIdentityAuthority";
import {fixture, approvedApplicationFixture, org, eventId, responseId,
  contactId, actorUid, offerId} from
  "../organizerFormAdmission/admissionTestFixture";
import type {ResolvedEventPreferences} from
  "../domain/formats/eventSetupPreferences/types";
import {eventPaymentTermsFromPreferences, eventPaymentTermsHash} from
  "../domain/formats/eventSetupPreferences/resolve";
import {issueOfferRecipientInvitation, claimOfferRecipientInvitation,
  offerRecipientGrantId, readVerifiedOfferRecipient} from "./recipientGrant";

const phone = "+919999999999";
const uid = "recipient1";
function setup(application = false) {
  const h = application ? approvedApplicationFixture() : fixture();
  const cleared = {value: null, source: "cleared" as const};
  const preferences: ResolvedEventPreferences = {
    defaultsRevision: 1, defaultsHash: "a".repeat(64),
    usualDurationMinutes: cleared, preferredVenueId: cleared,
    offerValidityMinutes: {value: 30, source: "event"},
    admissionPreset: cleared, collectionPreference: cleared,
    currency: {value: "INR", source: "event"},
    offerMessageTemplate: cleared, paymentInstructions: cleared,
    reusablePaymentPage: cleared,
    expectedAmountMinor: {value: 0, source: "event"},
  };
  const terms = eventPaymentTermsFromPreferences(preferences, 1);
  h.store.put(`eventSetupPreferences/${eventId}`, {organizerId: org,
    eventId, revision: 1, preferences, paymentTerms: terms});
  (h.store.get(`organizerEventOffers/${offerId}`)!.paymentSnapshot as
    Record<string, unknown>).eventPaymentHash = eventPaymentTermsHash(terms);
  h.store.get(`organizerContacts/${contactId}`)!.phoneE164 = phone;
  const scope = {organizerId: org, eventId, offerId, responseId};
  const issue = () => issueOfferRecipientInvitation({db: h.store.db(),
    actorUid, scope, expectedOfferGeneration: 1, expectedOfferRevision: 2,
    nowMillis: () => 2000});
  const claim = (token: string, recipient = uid, currentPhone = phone,
    tokenPhone = currentPhone) => claimOfferRecipientInvitation({
    db: h.store.db(), token, uid: recipient,
    authTokenPhoneNumber: tokenPhone, nowMillis: () => 2100,
    loadCurrentAuthUser: async (id) => ({uid: id, phoneNumber: currentPhone}),
  });
  const consume = (grantId: string, nowMillis = 2200) =>
    h.store.runTransaction((tx) => readVerifiedOfferRecipient({
      db: h.store.db(), tx, grantId, uid, nowMillis,
      loadCurrentAuthUser: async (id) => ({uid: id, phoneNumber: phone}),
    }));
  return {...h, issue, claim, consume, scope};
}

test("anonymous recipient claims by OTP without changing source identity",
  async () => {
    for (const application of [false, true]) {
      const h = setup(application);
      const before = JSON.stringify([...h.store.rows]);
      const response = {...h.store.get(`organizerFormResponses/${responseId}`)};
      const invitation = await h.issue();
      assert.equal(invitation.grantId, offerRecipientGrantId(invitation.token));
      const stored = h.store.get(
        `organizerEventOfferRecipients/${invitation.grantId}`)!;
      assert.equal(JSON.stringify(stored).includes(invitation.token), false);
      assert.equal(JSON.stringify(stored).includes(phone), false);
      assert.equal(stored.recipientUid, null);
      await assert.rejects(h.consume(invitation.grantId));
      const claim = await h.claim(invitation.token);
      const firstClaimWrites = h.store.writes.length;
      assert.deepEqual(await h.claim(invitation.token), claim);
      assert.equal(h.store.writes.length, firstClaimWrites);
      assert.equal((await h.consume(claim.grantId)).grant.recipientUid, uid);
      assert.deepEqual(h.store.get(`organizerFormResponses/${responseId}`),
        response);
      const otherRows = [...h.store.rows].filter(([path]) =>
        !path.startsWith("organizerEventOfferRecipients/"));
      assert.equal(JSON.stringify(otherRows), before);
    }
  });

test("forwarded links and stale OTP tokens do not claim another phone",
  async () => {
    const h = setup();
    const invitation = await h.issue();
    const writes = h.store.writes.length;
    await assert.rejects(h.claim(invitation.token, "other", "+918888888888"));
    await assert.rejects(h.claim(invitation.token, uid, phone,
      "+918888888888"));
    await assert.rejects(h.claim("x".repeat(43)));
    await assert.rejects(h.claim("not-a-token"));
    assert.equal(h.store.writes.length, writes);
    await h.claim(invitation.token);
    await assert.rejects(h.claim(invitation.token, "other", phone));
  });

test("current source changes invalidate both claims and payment consumption",
  async () => {
    const mutations: Array<(h: ReturnType<typeof setup>) => void> = [
      (h) => {
 h.store.get(`organizerEventOffers/${offerId}`)!
   .status = "withdrawn";
      },
      (h) => {
 h.store.get(`organizerEventOffers/${offerId}`)!
   .generation = 2;
      },
      (h) => {
 h.store.get(`organizerEventOffers/${offerId}`)!
   .revision = 3;
      },
      (h) => {
 h.store.get(`organizerFormResponses/${responseId}`)!
   .withdrawnAt = {toMillis: () => 2150};
      },
      (h) => {
 h.store.get(`organizerContactOrigins/${h.originId}`)!
   .currentContactId = "merged-contact";
      },
      (h) => {
 h.store.get(`organizerContacts/${contactId}`)!
   .phoneE164 = "+918888888888";
      },
      (h) => {
 h.store.get(`organizerContacts/${contactId}`)!
   .ambiguousCandidateContactIds = ["ambiguous"];
      },
      (h) => {
 h.store.get(`organizerContacts/${contactId}`)!
   .linkedUid = "other";
      },
      (h) => {
 h.store.get(`organizerFormResponses/${responseId}`)!
   .respondentUid = "other";
      },
      (h) => {
 h.store.get(`events/${eventId}`)!.status = "canceled";
      },
      (h) => {
 h.store.get(`organizers/${org}`)!.archived = true;
      },
      (h) => {
        h.store.put(`deletedUsers/${uid}`, {status: "processing"});
      },
      (h) => {
        h.store.put(`users/${uid}`, {deleted: true});
      },
    ];
    for (const mutate of mutations) {
      const h = setup();
      const invitation = await h.issue();
      await h.claim(invitation.token);
      const writes = h.store.writes.length;
      mutate(h);
      await assert.rejects(h.claim(invitation.token));
      await assert.rejects(h.consume(invitation.grantId));
      assert.equal(h.store.writes.length, writes);
    }
  });

test("approval withdrawal, expiry and disabled Auth reject saved grants",
  async () => {
    const h = setup(true);
    const invitation = await h.issue();
    await h.claim(invitation.token);
    await assert.rejects(h.consume(invitation.grantId,
      invitation.expiresAtMillis));
    await assert.rejects(h.consume(invitation.grantId, 1900));
    await assert.rejects(claimOfferRecipientInvitation({db: h.store.db(),
      token: invitation.token, uid, authTokenPhoneNumber: phone,
      nowMillis: () => 2200,
      loadCurrentAuthUser: async () => ({uid, phoneNumber: phone,
        disabled: true})}));
    for (const [path, row] of h.store.rows) {
      if (path.startsWith("organizerApplications/")) {
        row.reviewStatus = "rejected";
      }
    }
    await assert.rejects(h.consume(invitation.grantId));
  });

test("invitation requires current manager and reviewed offer revision",
  async () => {
    const h = setup();
    const input = {db: h.store.db(), actorUid, scope: h.scope,
      expectedOfferGeneration: 1, expectedOfferRevision: 1,
      nowMillis: () => 2000};
    await assert.rejects(issueOfferRecipientInvitation(input));
    h.store.put("users/stranger", {deleted: false});
    await assert.rejects(issueOfferRecipientInvitation({...input,
      actorUid: "stranger", expectedOfferRevision: 2}));
    h.store.put(`deletedUsers/${actorUid}`, {status: "processing"});
    await assert.rejects(h.issue());
    assert.deepEqual(h.store.writes, []);
  });

test("OTP offer grant enrolls anonymous CRM and UID as one canonical seat",
  async () => {
    const h = setup(true);
    const invitation = await h.issue();
    await h.claim(invitation.token);
    const prepare = () => h.store.runTransaction(async (tx) => {
      const plan = await prepareCrmOriginSeatIdentity({db: h.store.db(), tx,
        eventId, organizerId: org, originId: h.originId, responseId,
        verifiedOfferRecipient: {grantId: invitation.grantId, uid,
          now: Timestamp.fromMillis(2200),
          loadCurrentAuthUser: async () => ({uid, phoneNumber: phone})}});
      plan.apply();
      return plan.identity;
    });
    const identity = await prepare();
    assert.deepEqual(await prepare(), identity);
    const resolve = (subject: Parameters<FirestoreSeatIdentityAuthority[
      "resolve"]>[0]["subject"]) => h.store.runTransaction((tx) =>
      new FirestoreSeatIdentityAuthority().resolve({db: h.store.db(), tx,
        eventId, organizerId: org, subject}));
    assert.deepEqual(await resolve({kind: "verifiedUid", uid}), identity);
    assert.deepEqual(await resolve({kind: "crmOrigin", originId: h.originId,
      responseId}), identity);
    assert.equal(h.store.get(`organizerFormResponses/${responseId}`)!
      .respondentUid, null);
    assert.equal(h.store.get(`organizerFormResponses/${responseId}`)!
      .identityKind, "anonymous");
    h.store.get(`organizerContacts/${contactId}`)!.phoneE164 =
      "+918888888888";
    const writes = h.store.writes.length;
    await assert.rejects(prepare());
    assert.equal(h.store.writes.length, writes);
  });

test("issued recipient links preserve frozen terms after defaults change",
  async () => {
    const h = setup();
    const invitation = await h.issue();
    h.store.put(`eventSetupPreferences/${eventId}`, {revision: 9});
    await h.claim(invitation.token);
    assert.equal((await h.consume(invitation.grantId)).source.offer
      .paymentSnapshot.eventPaymentRevision, 1);
    h.store.rows.delete(`eventSetupPreferences/${eventId}`);
    await h.claim(invitation.token);
    assert.equal((await h.consume(invitation.grantId)).source.offer
      .paymentSnapshot.expectedAmountMinor, 0);
  });
