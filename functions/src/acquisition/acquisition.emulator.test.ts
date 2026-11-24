import assert from "node:assert/strict";
import {randomBytes, randomUUID} from "node:crypto";
import {after, before, test} from "node:test";
import {deleteApp, initializeApp, type App} from "firebase-admin/app";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {nextPilotReview, recordHostPilotActivation} from "./pilotActivation";
import {ALERTS, SETTINGS_PATH, alertOnSalesIntent} from
  "../hostAlerts/delivery";
import {alertWindowId} from "../hostAlerts/alerts";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const now = 1792512000000;
let app: App;
let db: Firestore;
before(() => {
  if (!enabled) return;
  app = initializeApp({projectId: "demo-catch-host-acquisition"},
    "host-acquisition-integration");
  db = getEmulatorFirestore(app);
});
after(async () => {
  if (app) await deleteApp(app);
});
test("real operator alert transactions send once and hold past the cap",
  {skip: !enabled}, async () => {
    const intentIds = [0, 1, 2].map(() => randomBytes(32).toString("hex"));
    const clock = Date.now();
    // This file's emulator project is its own, so the fixed path is safe.
    await db.doc(SETTINGS_PATH).set({schemaVersion: 1,
      email: {provider: "resend", accountId: "account-fixture",
        from: "billing@catch.example",
        credentialVersion: "projects/demo/secrets/EMAIL/versions/1"},
      operatorAlerts: {enabled: true, recipients: ["staff@catch.example"],
        from: "alerts@catch.example", hourlyCap: 1},
      updatedAtMillis: 1});
    for (const intentId of intentIds) {
      await db.doc(`salesInboundIntents/${intentId}`).create({
        status: "needs_identity_review", source: "website",
        submissionId: `emulator-${intentId.slice(0, 8)}`,
        fullName: "Synthetic local test", email: "fixture@organizer.in",
        city: "Pune", hostApplication: {organizationName: "Emulator only"},
        createdAt: Timestamp.fromMillis(clock)});
    }
    let sends = 0;
    const deps = {db: () => db, now: () => clock,
      emailSender: async () => ({id: "fake", submit: async () => {
        sends++;
        return {kind: "accepted" as const,
          providerMessageId: "synthetic-mail"};
      }})};
    const first = await Promise.all([0, 1, 2].map(() =>
      alertOnSalesIntent(deps, intentIds[0])));
    assert.deepEqual(first.sort(), ["duplicate", "duplicate", "sent"]);
    assert.deepEqual(await Promise.all(intentIds.slice(1).map((id) =>
      alertOnSalesIntent(deps, id))), ["overflow", "overflow"]);
    assert.equal(sends, 1);
    const window = await db.doc(
      `${ALERTS}/hourly/windows/${alertWindowId(clock)}`).get();
    assert.equal(window.get("sentCount"), 1);
    assert.equal(window.get("overflowCount"), 2);
    await Promise.all([db.doc(SETTINGS_PATH).delete(), window.ref.delete(),
      ...intentIds.flatMap((id) => [
        db.doc(`salesInboundIntents/${id}`).delete(),
        db.doc(`${ALERTS}/lead_${id}`).delete()])]);
  });

test("competing reviewed check-ins create one private activation receipt",
  {skip: !enabled}, async () => {
    const organizerId = randomUUID();
    const eventId = randomUUID();
    await db.doc(`organizers/${organizerId}`).set({});
    await db.doc(`events/${eventId}`).set({
      organizerId, publicationState: "published",
      status: "active", startTime: Timestamp.fromMillis(now - 1000),
      endTime: Timestamp.fromMillis(now + 1000),
      eventFormat: {version: 1, activityKind: "running",
        interactionModel: "hostLedProgram"}, capacityLimit: 20,
      priceInPaise: 10000, meetingPoint: "Synthetic Venue",
      meetingLocation: {name: "Synthetic Venue", latitude: 19, longitude: 73},
    });
    await db.doc(`hostPilotEventReviews/${eventId}`).set(nextPilotReview({
      eventId, organizerId, realEvent: true, actorUid: "synthetic-staff",
      expectedRevision: 0, current: undefined, now: now - 1000,
    }));
    const after = {eventId, organizerId, status: "checkedIn",
      checkedInAt: Timestamp.fromMillis(now)};
    const ids = [randomUUID(), randomUUID()];
    await Promise.all(ids.map((id) =>
      db.doc(`eventAttendees/${id}`).set(after)));
    const run = (attendeeId: string) => recordHostPilotActivation({
      db, attendeeId, before: {status: "registered"}, after, now: () => now,
    });
    const results = await Promise.all(ids.map(run));
    assert.equal(results.filter(Boolean).length, 1);
    const ref = db.doc(`hostOrganizerActivations/${organizerId}`);
    const receipt = (await ref.get()).data()!;
    assert.equal(receipt.eventId, eventId);
    assert.equal(ids.some((id) => JSON.stringify(receipt).includes(id)), false);
    await db.doc(`salesPrivacyRestrictions/${organizerId}`).set({});
    await ref.delete();
    assert.equal(await run(ids[0]), false,
      "privacy restriction prevents resurrection after cleanup");
    assert.equal((await ref.get()).exists, false);
  });
