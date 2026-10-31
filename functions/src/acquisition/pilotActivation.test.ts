import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {nextPilotReview, recordHostPilotActivation} from "./pilotActivation";
const time = (n: number) => ({toMillis: () => n});
const review = nextPilotReview({eventId: "e", organizerId: "o",
  actorUid: "staff", realEvent: true, expectedRevision: 0,
  current: undefined, now: 100});
const after = {status: "checkedIn", eventId: "e", organizerId: "o",
  checkedInAt: time(200)};
function fixture() {
  const rows = new Map<string, Record<string, unknown>>([
    ["eventAttendees/a", after], ["hostPilotEventReviews/e", {...review}],
    ["organizers/o", {}], ["events/e", {
      organizerId: "o", publicationState: "published",
      status: "active", startTime: time(100), endTime: time(1000),
      eventFormat: {version: 1, activityKind: "running",
        interactionModel: "hostLedProgram"}, capacityLimit: 20,
      priceInPaise: 10000, meetingPoint: "Venue",
      meetingLocation: {name: "Venue", latitude: 19, longitude: 73},
    }],
  ]);
  let writes = 0;
  const db = {collection: (name: string) => ({doc: (key: string) =>
    ({path: `${name}/${key}`})}), runTransaction: async (
    fn: (tx: unknown) => Promise<boolean>) => {
    let writing = false;
    return fn({get: async (ref: {path: string}) => {
      assert.equal(writing, false, "read after write");
      return {exists: rows.has(ref.path), data: () => rows.get(ref.path)};
    }, create: (ref: {path: string}, data: Record<string, unknown>) => {
      writing = true; assert.equal(rows.has(ref.path), false);
      rows.set(ref.path, data); writes++;
    }});
  }} as unknown as Firestore;
  const run = (prior: Record<string, unknown> | undefined =
  {status: "registered"}, next = after) => recordHostPilotActivation({
    db, attendeeId: "a", before: prior, after: next, now: () => 300});
  return {rows, run, writes: () => writes};
}
test("review revisions reject stale saves and preserve repeated choice time",
  () => {
    assert.equal(nextPilotReview({eventId: "e", organizerId: "o",
      actorUid: "staff", realEvent: true, expectedRevision: 1,
      current: review, now: 250}), review);
    assert.throws(() => nextPilotReview({eventId: "e", organizerId: "o",
      actorUid: "staff", realEvent: false, expectedRevision: 0,
      current: review, now: 250}));
  });
test("real check-in creates one private organiser receipt", async () => {
  const h = fixture();
  assert.equal(await h.run(), true);
  assert.equal(await h.run(), false);
  assert.equal(await h.run(after), false);
  assert.equal(h.writes(), 1);
  const receipt = h.rows.get("hostOrganizerActivations/o")!;
  assert.match(String(receipt.receiptId), /^host_activation_/u);
  assert.equal(receipt.activatedAt, 200);
  assert.deepEqual(Object.keys(receipt).sort(), ["schemaVersion",
    "classification", "organizerId", "eventId", "receiptId", "activatedAt",
    "recordedAt", "reviewRevision"].sort());
});
for (const variant of ["unreviewed", "test", "late-review", "private",
  "cancelled", "wrong-organizer", "deleted-organizer", "restricted",
  "undone", "stale"]) {
  test(`activation excludes ${variant}`, async () => {
    const h = fixture();
    if (variant === "unreviewed") h.rows.delete("hostPilotEventReviews/e");
    if (variant === "test") {
      h.rows.set("hostPilotEventReviews/e",
        {...review, realEvent: false});
    }
    if (variant === "late-review") {
      h.rows.set("hostPilotEventReviews/e",
        {...review, reviewedAt: 201});
    }
    const event = h.rows.get("events/e")!;
    if (variant === "private") event.publicationState = "private";
    if (variant === "cancelled") event.status = "cancelled";
    if (variant === "wrong-organizer") event.organizerId = "other";
    if (variant === "deleted-organizer") h.rows.delete("organizers/o");
    if (variant === "restricted") h.rows.set("salesPrivacyRestrictions/o", {});
    if (variant === "undone") {
      h.rows.set("eventAttendees/a",
        {...after, status: "registered"});
    }
    if (variant === "stale") {
      h.rows.set("eventAttendees/a",
        {...after, checkedInAt: time(250)});
    }
    assert.equal(await h.run(), false);
    assert.equal(h.writes(), 0);
  });
}
