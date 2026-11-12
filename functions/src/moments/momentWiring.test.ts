import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {buildMomentRunnerDeps, quietEndWith} from "./momentWiring";
import type {MomentDefinition} from "./momentModel";
import type {ResolvedRecipient} from "./momentDocuments";

const ts = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);
const IST = "Asia/Kolkata";

function localMinute(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ms));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  return hour * 60 +
    Number(parts.find((p) => p.type === "minute")?.value ?? 0);
}

const quiet = {startMinute: 21 * 60, endMinute: 8 * 60};

test("quietEndWith returns a sendable boundary after quiet hours", () => {
  // 22:30 IST is inside the 21:00-08:00 window.
  const inside = Date.parse("2026-09-24T22:30:00+05:30");
  const end = quietEndWith(quiet, IST, inside);
  assert.ok(end !== null && end > inside);
  const minute = localMinute(end, IST);
  assert.ok(minute >= 480 && minute <= 495,
    `expected ~08:00 IST, got minute ${minute}`);
  // 12:00 IST is outside the window -> sendable.
  const outside = Date.parse("2026-09-24T12:00:00+05:30");
  assert.equal(quietEndWith(quiet, IST, outside), null);
  // No quiet hours configured -> never deferred.
  assert.equal(quietEndWith(null, IST, inside), null);
});

test("quietEndWith handles a wrap-midnight boundary at 02:00", () => {
  const earlyMorning = Date.parse("2026-09-24T02:15:00+05:30");
  const end = quietEndWith(quiet, IST, earlyMorning);
  assert.ok(end !== null && end > earlyMorning);
  const minute = localMinute(end, IST);
  assert.ok(minute >= 480 && minute <= 495);
});

test("deps resolve local time and quiet hours from the scope doc",
  async () => {
    const db = new FakeFirestore({
      "organizerPrograms/prog": {
        organizerId: "org-1", timezone: IST,
        messagingQuietHours: {startMinute: 1260, endMinute: 480},
        messagingDailyCap: 2,
      },
    });
    const deps = buildMomentRunnerDeps({firestore: () => db as never});
    const scope = {kind: "program" as const, programId: "prog"};
    const inside = Date.parse("2026-09-24T22:30:00+05:30");
    assert.equal(await deps.localMinuteOfDay(scope, inside), 22 * 60 + 30);
    assert.equal(await deps.localDayKey(scope, inside), "2026-09-24");
    assert.equal(await deps.dailyCapFor(scope), 2);
    const quietEnd = await deps.quietEndMillis(scope, inside);
    assert.ok(quietEnd !== null && quietEnd > inside);
  });

test("loadConsentFacts maps household consent only", async () => {
  const db = new FakeFirestore({
    "programHouseholds/hh1": {messagingConsent: {granted: false}},
    "programHouseholds/hh2": {messagingConsent: {granted: true}},
    "users/u-no": {prefsEventReminders: false},
  });
  const deps = buildMomentRunnerDeps({firestore: () => db as never});
  const pushMoment = {
    action: {kind: "push", notificationType: "eventReminder",
      preferenceKey: "eventReminders"},
  } as MomentDefinition;
  const phone = (householdId: string): ResolvedRecipient => ({
    recipientKey: `household:${householdId}`,
    endpoint: {kind: "phone", e164: "+910001"},
    householdId,
  });
  const uid = (u: string): ResolvedRecipient => ({
    recipientKey: `uid:${u}`,
    endpoint: {kind: "uid", uid: u},
    householdId: null,
  });
  assert.equal(
    (await deps.loadConsentFacts(phone("hh1"), pushMoment))
      .householdConsentGranted,
    false);
  assert.equal(
    (await deps.loadConsentFacts(phone("hh2"), pushMoment))
      .householdConsentGranted,
    true);
  // Push preference no longer feeds suppression: it gates only the FCM
  // leg at delivery so the activity item still lands (reminder parity).
  assert.deepEqual(
    await deps.loadConsentFacts(uid("u-no"), pushMoment), {});
});

test("pushCopyFor derives event reminder copy from the event doc", async () => {
  const db = new FakeFirestore({
    "events/evt": {
      status: "active", startTime: ts(1), endTime: ts(2),
      distanceKm: 5, meetingPoint: "Gate 3",
      meetingLocation: {name: "Cubbon Park"},
    },
  });
  const deps = buildMomentRunnerDeps({firestore: () => db as never});
  const moment = {
    name: "Reminder",
    scope: {kind: "event", eventId: "evt"},
    action: {kind: "push", notificationType: "eventReminder",
      preferenceKey: "eventReminders"},
  } as MomentDefinition;
  const copy = await deps.pushCopyFor(
    moment, {scope: {startsAtMillis: 1, endsAtMillis: 2,
      rsvpDeadlineAtMillis: null, revision: 0, messagingEnabled: true,
      cancelled: false}, functions: {}, travelLegs: {}});
  assert.ok(copy.title.length > 0);
});
