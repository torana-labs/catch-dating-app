import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {getEventRosterInsightsHandler} from
  "../organizers/eventRosterInsights";
import {contractValidator} from "../shared/contractTestValidators";
import {applyPaymentSpendChange} from "./organizerSpendStore";
import {
  backfillRosterInsights,
  maxRosterAttendees,
  reconcileRosterInsightView,
  rosterInsightFreezeMillis,
} from "./rosterInsightViewStore";

type Data = Record<string, unknown>;

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const startMillis = nowMillis + 2 * hour;
const at = (millis: number) => Timestamp.fromMillis(millis);
const clock = (millis = nowMillis) => ({now: () => at(millis)});
const validateView = contractValidator("HostEventRosterInsightViewDocument");
const attendeeId = (index: number) =>
  `att_${String(index).padStart(48, "a")}`;
const contactId = (index: number) => `oc_${String(index).padStart(48, "c")}`;

function organizer(): Data {
  return {name: "Saket Run Club", hostUserId: "owner-1",
    ownerUserId: "owner-1", hostUserIds: ["owner-1"], hostProfiles: []};
}

function event(patch: Data = {}): Data {
  return {organizerId: "org", startTime: at(startMillis),
    endTime: at(startMillis + 3 * hour), status: "active", ...patch};
}

function attendee(index: number, eventId = "event-1"): Data {
  return {eventId, organizerId: "org", displayName: `Guest ${index}`};
}

function edge(index: number, patch: Data = {}): Data {
  return {organizerId: "org", contactId: contactId(index),
    eventId: "event-1", attendeeId: attendeeId(index), expected: true,
    cancelled: false, checkedIn: false, eventStartAt: at(startMillis),
    eventEndAt: at(startMillis + 3 * hour), checkedInAt: null, ...patch};
}

/** A past event of contact [index] that it attended or missed. */
function pastEdge(index: number, eventId: string, daysAgo: number,
  checkedIn: boolean): Data {
  const start = nowMillis - daysAgo * day;
  return edge(index, {eventId, attendeeId: `${eventId}-${index}`,
    eventStartAt: at(start), eventEndAt: at(start + 3 * hour), checkedIn,
    checkedInAt: checkedIn ? at(start + hour) : null});
}

function contact(patch: Data = {}): Data {
  return {organizerId: "org", identityState: "verified", sourceCount: 2,
    linkedUid: "user-1", deletedAt: null, ...patch};
}

function payment(id: string, patch: Data = {}): Data {
  return {userId: "user-1", orderId: id, paymentId: id, eventId: "past-1",
    amount: 1500, amountMinor: 1500, currency: "INR", status: "completed",
    signUpFailed: false, createdAt: at(nowMillis - 30 * day),
    completedAt: at(nowMillis - 30 * day), ...patch};
}

/** Three attendees: a returning, linked member; an ambiguous identity; and
 *  one whose contact projection has not run yet. */
function rosterDocs(): Record<string, Data> {
  return {
    "organizers/org": organizer(),
    "events/event-1": event(),
    "events/past-1": event({startTime: at(nowMillis - 30 * day),
      endTime: at(nowMillis - 30 * day + 3 * hour)}),
    "events/past-2": event({startTime: at(nowMillis - 20 * day),
      endTime: at(nowMillis - 20 * day + 3 * hour)}),
    [`eventAttendees/${attendeeId(1)}`]: attendee(1),
    [`eventAttendees/${attendeeId(2)}`]: attendee(2),
    [`eventAttendees/${attendeeId(3)}`]: attendee(3),
    [`organizerContactEventEdges/${attendeeId(1)}`]: edge(1),
    "organizerContactEventEdges/past-1-1": pastEdge(1, "past-1", 30, true),
    "organizerContactEventEdges/past-2-1": pastEdge(1, "past-2", 20, true),
    [`organizerContactEventEdges/${attendeeId(2)}`]: edge(2),
    [`organizerContacts/${contactId(1)}`]: contact(),
    [`organizerContacts/${contactId(2)}`]: contact({
      identityState: "ambiguous", linkedUid: null}),
    [`organizerContactTraits/${contactId(1)}`]: {
      segmentIds: ["advocate", "active_member"]},
    "payments/p1": payment("p1"),
    "payments/p2": payment("p2", {eventId: "past-2",
      completedAt: at(nowMillis - 20 * day)}),
  };
}

async function withTotals(db: AudienceTestStore): Promise<AudienceTestStore> {
  let change = 0;
  for (const [path, data] of Object.entries(db.docs)) {
    if (!path.startsWith("payments/")) continue;
    await applyPaymentSpendChange(db.asFirestore(),
      {changeId: `c${change++}`, after: data}, clock());
  }
  return db;
}

const view = (db: AudienceTestStore, id = "event-1") =>
  db.docs[`hostEventRosterInsightViews/${id}`] as Data | undefined;
const rows = (db: AudienceTestStore) =>
  new Map((view(db)!.rows as Data[]).map((row) =>
    [row.attendeeId as string, row]));

test("one row per attendee, event-relative, with member stored", async () => {
  const db = await withTotals(new AudienceTestStore(rosterDocs()));
  const outcome = await reconcileRosterInsightView(db.asFirestore(),
    "event-1", clock());
  assert.equal(outcome.kind, "written");
  const written = view(db)!;
  assert.ok(validateView(written), JSON.stringify(validateView.errors));
  assert.equal(written.organizerId, "org");
  assert.equal(written.cutoffAtMillis, startMillis);
  // The third attendee's contact projection is still pending.
  assert.equal(written.sourceCoverage, "partial");
  assert.equal(written.incompleteSource, "organizerContactEventEdges");
  const byAttendee = rows(db);
  assert.deepEqual(byAttendee.get(attendeeId(1)), {
    attendeeId: attendeeId(1),
    contactId: contactId(1),
    availability: "ready",
    signals: ["returning", "advocate", "known_catch_spender", "member"],
    priorAttendedEventCount: 2,
    priorExpectedEventCount: 2,
    priorNoShowCount: 0,
    lastAttendedAtMillis: nowMillis - 20 * day + hour,
    attendanceRate: 1,
    catchSpend: [{currency: "INR", amountMinor: 3000, paidOrderCount: 2}],
  });
  assert.equal(byAttendee.get(attendeeId(2))!.availability,
    "ambiguousIdentity");
  assert.equal(byAttendee.get(attendeeId(3))!.availability,
    "projectionPending");
});

test("rows match the retired callable's, except top spender and member",
  async () => {
    const docs = rosterDocs();
    // Two more paying accounts so the callable labels a top spender.
    docs["payments/p3"] = payment("p3", {userId: "user-2", amount: 100,
      amountMinor: 100});
    docs["payments/p4"] = payment("p4", {userId: "user-2", amount: 100,
      amountMinor: 100, eventId: "past-2"});
    const db = await withTotals(new AudienceTestStore(docs));
    await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
    const callable = await getEventRosterInsightsHandler({
      auth: {uid: "owner-1", token: {}} as CallableRequest["auth"],
      data: {eventId: "event-1", includeHostMembership: true},
      rawRequest: {headers: {}} as CallableRequest["rawRequest"],
    } as CallableRequest<unknown>, {
      firestore: () => db.asFirestore(),
      checkRateLimit: async () => undefined,
      timestamp: () => at(nowMillis),
    });
    const stored = rows(db);
    assert.equal(callable.rows.length, stored.size);
    let topSpenders = 0;
    for (const row of callable.rows) {
      if (row.signals.includes("top_catch_spender")) topSpenders++;
      assert.deepEqual(stored.get(row.attendeeId), {...row,
        signals: row.signals.filter((signal) =>
          signal !== "top_catch_spender")});
    }
    assert.equal(topSpenders, 1);
    assert.equal(callable.sourceCoverage, view(db)!.sourceCoverage);
  });

test("an unchanged evaluation writes nothing; a check-in elsewhere does",
  async () => {
    const db = await withTotals(new AudienceTestStore(rosterDocs()));
    await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
    const first = view(db);
    const again = await reconcileRosterInsightView(db.asFirestore(),
      "event-1", clock(nowMillis + 1000));
    assert.equal(again.kind, "unchanged");
    assert.equal(view(db), first);
    // Checking in at this event never changes its own labels...
    db.docs[`organizerContactEventEdges/${attendeeId(1)}`] =
      edge(1, {checkedIn: true, checkedInAt: at(startMillis + hour)});
    assert.equal((await reconcileRosterInsightView(db.asFirestore(),
      "event-1", clock())).kind, "unchanged");
    // ...but a missed past event does.
    db.docs["organizerContactEventEdges/past-3-1"] =
      pastEdge(1, "past-3", 10, false);
    const changed = await reconcileRosterInsightView(db.asFirestore(),
      "event-1", clock());
    assert.equal(changed.kind, "written");
    assert.equal(rows(db).get(attendeeId(1))!.priorExpectedEventCount, 3);
    assert.equal(view(db)!.revision, 2);
  });

test("top_catch_spender is never stored", async () => {
  const docs = rosterDocs();
  docs["payments/p3"] = payment("p3", {userId: "user-2", amount: 10,
    amountMinor: 10});
  docs["payments/p4"] = payment("p4", {userId: "user-2", amount: 10,
    amountMinor: 10, eventId: "past-2"});
  const db = await withTotals(new AudienceTestStore(docs));
  await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
  assert.equal(JSON.stringify(view(db)).includes("top_catch_spender"), false);
  assert.deepEqual(
    db.docs["hostOrganizerSpendProjections/org"]!
      .topQuartileThresholdByCurrency, {INR: 3000});
});

test("partial totals give no spend at all, as the callable gave none",
  async () => {
    const docs = rosterDocs();
    docs["payments/bad"] = payment("bad", {amountMinor: 1.5});
    const db = await withTotals(new AudienceTestStore(docs));
    await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
    const row = rows(db).get(attendeeId(1))!;
    assert.deepEqual(row.catchSpend, []);
    assert.equal((row.signals as string[]).includes("known_catch_spender"),
      false);
  });

test("spend straddling the cutoff is recomputed, and only then",
  async () => {
    // Before an event starts no payment can have completed after its start,
    // so an upcoming event never recomputes.
    const upcoming = await withTotals(new AudienceTestStore(rosterDocs()));
    const before = await reconcileRosterInsightView(upcoming.asFirestore(),
      "event-1", clock());
    assert.equal(before.kind === "written" && before.recomputedAccounts, 0);

    // During the event a guest pays for next week's event: its totals now
    // straddle the cutoff, and only that account is recomputed.
    const docs = rosterDocs();
    docs["events/next"] = event({startTime: at(nowMillis + 7 * day),
      endTime: at(nowMillis + 7 * day + hour)});
    docs["payments/late"] = payment("late", {eventId: "next",
      completedAt: at(startMillis + hour), amount: 900, amountMinor: 900});
    const live = await withTotals(new AudienceTestStore(docs));
    const during = await reconcileRosterInsightView(live.asFirestore(),
      "event-1", clock(startMillis + 2 * hour));
    assert.equal(during.kind === "written" && during.recomputedAccounts, 1);
    assert.deepEqual(rows(live).get(attendeeId(1))!.catchSpend,
      [{currency: "INR", amountMinor: 3000, paidOrderCount: 2}]);
  });

test("an event that ended more than a day ago is frozen", async () => {
  const db = await withTotals(new AudienceTestStore(rosterDocs()));
  const after = startMillis + 3 * hour + rosterInsightFreezeMillis + 1;
  assert.deepEqual(await reconcileRosterInsightView(db.asFirestore(),
    "event-1", clock(after)), {kind: "frozen"});
  assert.equal(view(db), undefined);
  // An event without an end freezes a day after it starts.
  db.docs["events/event-1"] = event({endTime: undefined});
  assert.deepEqual(await reconcileRosterInsightView(db.asFirestore(),
    "event-1", clock(startMillis + rosterInsightFreezeMillis + 1)),
  {kind: "frozen"});
});

test("a deleted event, or one without an organizer, loses its view",
  async () => {
    const db = await withTotals(new AudienceTestStore(rosterDocs()));
    await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
    db.docs["events/event-1"] = event({organizerId: null});
    assert.deepEqual(await reconcileRosterInsightView(db.asFirestore(),
      "event-1", clock()), {kind: "removed", existed: true});
    assert.equal(view(db), undefined);
  });

test("an invalid edge is recorded and keeps the previous rows", async () => {
  const db = await withTotals(new AudienceTestStore(rosterDocs()));
  await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
  const previousRows = view(db)!.rows;
  db.docs[`organizerContactEventEdges/${attendeeId(2)}`] =
    edge(2, {checkedIn: "yes"});
  const outcome = await reconcileRosterInsightView(db.asFirestore(),
    "event-1", clock());
  assert.equal(outcome.kind, "invalidSource");
  const written = view(db)!;
  assert.ok(validateView(written), JSON.stringify(validateView.errors));
  assert.equal(written.sourceCoverage, "invalidSource");
  assert.equal(written.incompleteSource, "organizerContactEventEdges");
  assert.deepEqual(written.rows, previousRows);
  const again = await reconcileRosterInsightView(db.asFirestore(), "event-1",
    clock());
  assert.equal(again.kind === "invalidSource" && again.written, false);
});

test("more than 1,000 attendees is partial with the first 1,000",
  async () => {
    const docs: Record<string, Data> = {"organizers/org": organizer(),
      "events/event-1": event()};
    for (let index = 0; index <= maxRosterAttendees; index++) {
      docs[`eventAttendees/${attendeeId(index)}`] = attendee(index);
    }
    const db = new AudienceTestStore(docs);
    await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
    const written = view(db)!;
    assert.equal(written.sourceCoverage, "partial");
    assert.equal(written.incompleteSource, "eventAttendees");
    assert.equal((written.rows as Data[]).length, maxRosterAttendees);
  });

/** Firestore's documented storage size: names, values and nesting. */
function storageSize(value: unknown): number {
  if (value === null || typeof value === "boolean") return 1;
  if (typeof value === "number") return 8;
  if (typeof value === "string") return Buffer.byteLength(value) + 1;
  if (value instanceof Timestamp) return 8;
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + storageSize(item), 0);
  }
  return Object.entries(value as Data).reduce((sum, [key, item]) =>
    sum + Buffer.byteLength(key) + 1 + storageSize(item), 0);
}

test("a full view of ready, paying regulars stays under 1 MiB", async () => {
  const docs: Record<string, Data> = {"organizers/org": organizer(),
    "events/event-1": event()};
  for (let index = 0; index < maxRosterAttendees; index++) {
    docs[`eventAttendees/${attendeeId(index)}`] = attendee(index);
    docs[`organizerContactEventEdges/${attendeeId(index)}`] = edge(index);
    for (const past of [10, 20, 30]) {
      docs[`organizerContactEventEdges/p${past}-${index}`] =
        pastEdge(index, `past-${past}`, past, true);
    }
    docs[`organizerContacts/${contactId(index)}`] =
      contact({linkedUid: `user-${index}`});
    docs[`organizerContactTraits/${contactId(index)}`] = {segmentIds: [
      "advocate", "high_impact_advocate", "active_member"]};
    for (const currency of ["INR", "USD", "EUR"]) {
      for (const order of [1, 2]) {
        docs[`payments/${currency}-${order}-${index}`] = payment(
          `${currency}-${order}-${index}`, {userId: `user-${index}`,
            currency, eventId: "past-1"});
      }
    }
  }
  const db = await withTotals(new AudienceTestStore(docs));
  await reconcileRosterInsightView(db.asFirestore(), "event-1", clock());
  const written = view(db)!;
  assert.equal(written.sourceCoverage, "exact");
  assert.equal((written.rows as Data[]).length, maxRosterAttendees);
  const bytes = storageSize(written);
  assert.ok(bytes < 1024 * 1024, `${bytes} bytes`);
  // Measured: about 360 KiB, every row ready with five labels and three
  // currencies, ids as long as production's.
  assert.ok(bytes > 300 * 1024, `${bytes} bytes`);
});

test("backfill rebuilds spend, then every open view", async () => {
  const db = new AudienceTestStore(rosterDocs());
  const dryRun = await backfillRosterInsights(db.asFirestore(), "org", false,
    clock());
  assert.equal(dryRun.spend.written, false);
  assert.equal(dryRun.events, 3);
  assert.equal(view(db), undefined);
  const applied = await backfillRosterInsights(db.asFirestore(), "org", true,
    clock());
  assert.equal(applied.spend.uidCount, 1);
  assert.deepEqual(applied.outcomes, {removed: 0, frozen: 2, unchanged: 0,
    written: 1, invalidSource: 0});
  assert.ok(validateView(view(db)), JSON.stringify(validateView.errors));
});
