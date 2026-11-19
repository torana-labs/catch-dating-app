/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {createEventInviteLinkHandler, inviteLinkTokenHash} from "./inviteLinks";

// Pins what createEventInviteLinkHandler stores for a host channel link, so
// the shared builders it uses (hostInviteLinkDocuments,
// authorizeInviteLinkManager) keep writing exactly these documents.

const NOW_MILLIS = Date.UTC(2026, 10, 18, 8, 0, 0);
const SERVER_TIME = "SERVER_TIME";

function harness() {
  const db = new FakeFirestore();
  db.write("organizers/org-1", {name: "Driftwood Bay Runners", ownerUserId: "host-1",
    hostUserId: "host-1", hostUserIds: ["host-1"], status: "active"});
  db.write("events/event-1", {organizerId: "org-1", name: "Sunday sea-face run"});
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: (async () => undefined) as never,
    timestamp: () => ({toMillis: () => NOW_MILLIS}) as unknown as FirebaseFirestore.Timestamp,
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    increment: (value: number) => ({increment: value}) as unknown as FirebaseFirestore.FieldValue,
  };
  return {db, deps};
}

function call(data: unknown, uid = "host-1") {
  return {data, auth: {uid, token: {}}, rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>;
}

test("a host channel link stores the link and its secret with every counter at zero", async () => {
  const {db, deps} = harness();
  const created = await createEventInviteLinkHandler(call({eventId: "event-1", label: "  Instagram bio ",
    source: "instagram", campaignId: "launch-week", attributionWindowDays: 14}), deps);
  assert.equal(created.label, "Instagram bio");
  assert.equal(created.source, "instagram");
  const link = db.read(`eventInviteLinks/${created.inviteLinkId}`)!;
  const windowEnds = link.attributionWindowEndsAt as {_seconds: number};
  assert.equal(windowEnds._seconds * 1000, NOW_MILLIS + 14 * 24 * 60 * 60 * 1000);
  assert.deepEqual({...link, attributionWindowEndsAt: null}, {
    eventId: "event-1", organizerId: "org-1", hostUid: "host-1", label: "Instagram bio", source: "instagram",
    tokenHash: inviteLinkTokenHash(created.inviteToken), contractVersion: 2, linkKind: "hostChannel",
    ownerContactId: null, ownerUid: null, intendedRecipientContactId: null, campaignId: "launch-week",
    issuanceChannel: "hostApp", destinationKind: "catchEvent", tokenVersion: 2, attributionWindowEndsAt: null,
    openCount: 0, likelyHumanOpenCount: 0, shareIntentCount: 0, verifiedRegistrationCount: 0,
    referredRegistrationCount: 0, referredCheckedInCount: 0, requestCount: 0, confirmedCount: 0, paidCount: 0,
    checkedInCount: 0, catcherCount: 0, matchCount: 0, chatStartedCount: 0, disabledAt: null,
    createdAt: SERVER_TIME, updatedAt: SERVER_TIME,
  });
  assert.deepEqual(db.read(`eventInviteLinkSecrets/${created.inviteLinkId}`), {
    eventId: "event-1", organizerId: "org-1", token: created.inviteToken,
    tokenHash: inviteLinkTokenHash(created.inviteToken), tokenVersion: 2,
    createdAt: SERVER_TIME, updatedAt: SERVER_TIME,
  });
});

test("only an organizer manager can create a link, and nothing is written otherwise", async () => {
  const {db, deps} = harness();
  await assert.rejects(createEventInviteLinkHandler(call({eventId: "event-1", label: "Flyer"}, "guest-1"), deps),
    {code: "permission-denied"});
  await assert.rejects(createEventInviteLinkHandler(call({eventId: "missing", label: "Flyer"}), deps),
    {code: "not-found"});
  assert.equal(db.entries().filter(([key]) => key.startsWith("eventInviteLink")).length, 0);
});
