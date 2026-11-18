import assert from "node:assert/strict";
import {randomBytes, randomUUID} from "node:crypto";
import {after, before, test} from "node:test";
import {deleteApp, initializeApp, type App} from "firebase-admin/app";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {nextPilotReview, recordHostPilotActivation} from "./pilotActivation";
import {enqueueHostAlert, deliverHostAlert, dispatchHostAlerts} from
  "../hostAlerts/delivery";

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
test("real Host alert transactions deduplicate and remove terminal due-work",
  {skip: !enabled}, async () => {
    const intentId = randomBytes(32).toString("hex");
    const eventId = `host_lead_${now}_${randomUUID()}`;
    const source = db.doc(`salesInboundIntents/${intentId}`);
    const receipt = db.doc(`hostOperatorAlerts/${eventId}`);
    await source.create({source: "website", classification: "sales_private",
      hostLead: {eventId, isNew: true}, status: "needs_identity_review",
      hostApplication: {organizationName: "Emulator only"},
      fullName: "Synthetic local test", email: "fixture@organizer.in",
      submissionId: "emulator-only"});
    const input = {enabled: true, since: now, db, now: () => now};
    const enqueue = () => enqueueHostAlert({...input, intentId});
    assert.equal((await Promise.all([enqueue(), enqueue(), enqueue()]))
      .filter(Boolean).length, 1);
    let sends = 0;
    const provider = {id: "fake", submit: async () => {
      sends++;
      return {kind: "accepted" as const, providerMessageId: "synthetic-mail"};
    }};
    const deliver = () => deliverHostAlert({...input, eventId, provider});
    await Promise.all([deliver(), deliver(), deliver()]);
    assert.equal(sends, 1);
    assert.equal((await receipt.get()).data()?.status, "accepted");
    assert.equal((await receipt.get()).data()?.nextAttemptAt, undefined);
    assert.equal(await dispatchHostAlerts({...input, provider}), 0);
    assert.equal(await enqueue(), false);
    await source.delete();
    await receipt.delete();
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
