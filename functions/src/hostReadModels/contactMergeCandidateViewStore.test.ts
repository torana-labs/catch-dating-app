import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  listOrganizerContactMergeCandidatesHandler,
  organizerContactMergeCandidateId,
} from "../organizers/organizerContactMergeReview";
import {
  reconcileContactMergeCandidates,
  reconcileContactMergeCandidateView,
} from "./contactMergeCandidateViewStore";

const validate = contractValidator("HostContactMergeCandidateViewDocument");
const at = (millis: number) => Timestamp.fromMillis(millis);

function contact(id: string, extra: Record<string, unknown> = {}) {
  return {organizerId: "org", contactId: id, displayName: `Guest ${id}`,
    displayNameOverride: null, phoneE164: null,
    email: `${id}@example.com`, linkedUid: id === "c1" ? "uid-1" : null,
    primarySource: "hostImport", revision: 3, deletedAt: null,
    hiddenAt: null, identityState: "active", ...extra};
}

function link(contactId: string, kind: string, identityHash: string,
  confidence: string, updatedAtMillis: number, source = "hostImport") {
  return {organizerId: "org", contactId, kind, identityHash,
    hashVersion: "hmac-sha256-v1", confidence, source,
    createdAt: at(updatedAtMillis), updatedAt: at(updatedAtMillis)};
}

function store() {
  return new AudienceTestStore({
    "organizers/org": {ownerUserId: "manager-1",
      hostUserIds: ["manager-1", "manager-2"], hostProfiles: []},
    "organizerContacts/c1": contact("c1"),
    "organizerContacts/c2": contact("c2", {displayNameOverride: "Asha R",
      primarySource: "catchBooking"}),
    "organizerContacts/c3": contact("c3"),
    "organizerContacts/c4": contact("c4"),
    "organizerContacts/c9": contact("c9", {organizerId: "other"}),
    // A verified phone the contacts c1 and c2 both claim.
    "organizerContactIdentityClaims/claim-1": {organizerId: "org",
      kind: "phone", identityHash: "hash-phone", hashVersion: "hmac-sha256-v1",
      state: "conflicted", verifiedContactId: "c1",
      originVerifiedContactId: "c1", conflictingContactIds: ["c2"],
      revision: 1, createdAt: at(1_000), updatedAt: at(2_000)},
    // An imported email c3 and c4 share, and a confirmed one of c4.
    "organizerContactIdentityLinks/l3": link("c3", "email", "hash-mail",
      "proposed", 3_000),
    "organizerContactIdentityLinks/l4": link("c4", "email", "hash-mail",
      "proposed", 4_000, "hostForm"),
    "organizerContactIdentityLinks/l9": link("c9", "email", "hash-mail",
      "proposed", 9_000),
    "organizerContactEventEdges/e1": {organizerId: "org", contactId: "c1",
      eventId: "event-1"},
    "organizerContactEventEdges/e2": {organizerId: "org", contactId: "c2",
      eventId: "event-1"},
    "organizerContactEventEdges/e3": {organizerId: "org", contactId: "c2",
      eventId: "event-2"},
  });
}

const request = (uid: string) => ({auth: {uid, token: {}},
  data: {organizerId: "org", cursor: null, limit: 50}}) as unknown as
  CallableRequest<unknown>;

const viewPath = (pair: [string, string]) => "hostContactMergeCandidateViews/" +
  organizerContactMergeCandidateId("org", pair);

test("each pair's view is the callable's candidate, canReopen as a uid",
  async () => {
    const fake = store();
    fake.docs["organizerContactMergeReviewDecisions/" +
      organizerContactMergeCandidateId("org", ["c1", "c2"])] = {
      schemaVersion: 1, decisionId: organizerContactMergeCandidateId("org",
        ["c1", "c2"]), organizerId: "org", contactIds: ["c1", "c2"],
      state: "differentPeople", reviewedByUid: "manager-1",
      reviewedAt: at(5_000), reopenedByUid: null, reopenedAt: null,
      revision: 5_000, updatedAt: at(5_000)};
    const db = fake.asFirestore();
    for (const id of ["c1", "c2", "c3", "c4"]) {
      await reconcileContactMergeCandidates(db, "org", id);
    }
    const views = Object.entries(fake.docs).filter(([path]) =>
      path.startsWith("hostContactMergeCandidateViews/"));
    assert.equal(views.length, 2);
    for (const [, view] of views) {
      assert.equal(validate(view), true, JSON.stringify(validate.errors));
    }
    const deps = {firestore: () => db, now: () => at(10_000),
      checkRateLimit: async () => undefined};
    for (const reader of ["manager-1", "manager-2"]) {
      const callable = await listOrganizerContactMergeCandidatesHandler(
        request(reader), deps);
      assert.equal(callable.candidates.length, 1);
      assert.equal(callable.dismissedCandidates.length, 1);
      for (const candidate of [...callable.candidates,
        ...callable.dismissedCandidates]) {
        const {canReopen, ...row} = candidate;
        const view = fake.docs[viewPath(
          candidate.contacts.map((item) => item.contactId) as
            [string, string])];
        const {organizerId, contactIds, reviewedByUid, version, ...rest} =
          view as Record<string, unknown>;
        assert.deepEqual(rest, row);
        assert.equal(organizerId, "org");
        assert.equal(version, 1);
        assert.deepEqual(contactIds, row.contacts.map((item) =>
          item.contactId));
        assert.equal(canReopen, row.decisionState === "differentPeople" &&
          reviewedByUid === reader);
      }
    }
    const json = JSON.stringify(Object.fromEntries(views));
    for (const hidden of ["hash-phone", "hash-mail", "uid-1"]) {
      assert.equal(json.includes(hidden), false, hidden);
    }
  });

test("a pair leaves when a contact is hidden and returns when shown",
  async () => {
    const fake = store();
    const db = fake.asFirestore();
    await reconcileContactMergeCandidates(db, "org", "c4");
    assert.ok(fake.docs[viewPath(["c3", "c4"])]);
    fake.docs["organizerContacts/c3"].hiddenAt = at(6_000);
    await reconcileContactMergeCandidates(db, "org", "c3");
    assert.equal(fake.docs[viewPath(["c3", "c4"])], undefined);
    fake.docs["organizerContacts/c3"].hiddenAt = null;
    await reconcileContactMergeCandidates(db, "org", "c3");
    assert.ok(fake.docs[viewPath(["c3", "c4"])]);
  });

test("a pair that nothing joins any more is removed", async () => {
  const fake = store();
  const db = fake.asFirestore();
  await reconcileContactMergeCandidateView(db, "org", ["c2", "c1"]);
  assert.ok(fake.docs[viewPath(["c1", "c2"])]);
  fake.docs["organizerContactIdentityClaims/claim-1"].state = "verified";
  await reconcileContactMergeCandidateView(db, "org", ["c1", "c2"]);
  assert.equal(fake.docs[viewPath(["c1", "c2"])], undefined);
  // Contacts with no claim or proposed link in common never pair.
  await reconcileContactMergeCandidateView(db, "org", ["c1", "c3"]);
  assert.equal(fake.docs[viewPath(["c1", "c3"])], undefined);
});
