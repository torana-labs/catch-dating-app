import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {EventRehearsalDocument} from
  "../shared/generated/firestoreAdminTypes";
import {createEventRehearsalCallablePayloadSchema} from
  "../shared/generated/schemas/createEventRehearsalInput";
import {
  applyRehearsalBehavior,
  applyRehearsalCues,
  applyRehearsalGuestAction,
  applyRehearsalSpatialAction,
  buildRehearsalActors,
  cuesBetween,
  eventRehearsalActionDocumentId,
  momentForStep,
  resolveRehearsalControl,
  rehearsalActorConnectionState,
  statusAfterBehavior,
} from "./engine";

const now = admin.firestore.Timestamp.fromMillis(
  Date.parse("2026-08-19T10:00:00.000Z")
);

function session(
  overrides: Partial<EventRehearsalDocument> = {}
): EventRehearsalDocument {
  return {
    organizerId: "organizer-1",
    ownerUid: "host-1",
    sourceEventId: null,
    sourceEventRevision: null,
    publicRehearsalId: "abcdefghijklmnopqrstuvwx",
    viewerTokenHash: "a".repeat(64),
    scenarioId: "lateAndNoShow",
    seed: 42,
    actorCount: 12,
    actionCount: 0,
    status: "ready",
    setup: {
      title: "Practice",
      locationName: "Studio",
      durationMinutes: 120,
      hostGoal: "Learn",
      attendeePrompt: "Say hello",
      moduleIds: ["arrival", "firstHello"],
    },
    setupRevision: 0,
    runtimeRevision: 0,
    activeStepIndex: 0,
    virtualStartedAt: now,
    virtualNow: now,
    faultId: "none",
    faultConsumed: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 86400000
    ),
    completedAt: null,
    ...overrides,
  };
}

test("synthetic actors are deterministic and contain no user identifiers",
  () => {
    const first = buildRehearsalActors("session-1", 12, 42, now);
    const second = buildRehearsalActors("session-1", 12, 42, now);
    assert.deepEqual(first, second);
    assert.equal(new Set(first.map((actor) => actor.actorId)).size, 12);
    assert.ok(first.every((actor) => actor.sessionId === "session-1"));
    assert.ok(first.every((actor) => !("uid" in actor)));
  });

test("lifecycle freezes setup semantics and advances a virtual clock", () => {
  const started = resolveRehearsalControl(session(), "start");
  assert.deepEqual(started, {
    status: "running",
    activeStepIndex: 1,
    virtualNowMillis: now.toMillis(),
  });
  const advanced = resolveRehearsalControl(
    session({status: "running", activeStepIndex: 3}),
    "advanceClock",
    15
  );
  assert.equal(advanced.virtualNowMillis, now.toMillis() + 15 * 60000);
  assert.equal(advanced.activeStepIndex, 3);
  assert.throws(() => resolveRehearsalControl(
    session({status: "complete"}),
    "start"
  ));
});

test("scenario cues are emitted only when their minute is crossed", () => {
  assert.deepEqual(
    cuesBetween(
      "lateAndNoShow",
      now.toMillis(),
      now.toMillis() + 9 * 60000,
      now.toMillis() + 16 * 60000,
      12
    ),
    [
      {atMinute: 10, behavior: "arriveLate", actorIndex: 2},
      {atMinute: 15, behavior: "markNoShow", actorIndex: 5},
    ]
  );
});

test("every scheduled scenario works at every supported roster size", () => {
  const properties = createEventRehearsalCallablePayloadSchema.properties as {
    scenarioId: {enum: EventRehearsalDocument["scenarioId"][]};
    actorCount: {minimum: number; maximum: number};
  };
  const {minimum, maximum} = properties.actorCount;
  const start = now.toMillis();
  for (const scenarioId of properties.scenarioId.enum) {
    const authored = cuesBetween(scenarioId, start, start,
      start + 120 * 60000, maximum);
    for (let count = minimum; count <= maximum; count++) {
      const cues = cuesBetween(scenarioId, start, start,
        start + 120 * 60000, count);
      assert.equal(cues.length, authored.length, scenarioId);
      assert.deepEqual(cues.map(({atMinute, behavior}) =>
        ({atMinute, behavior})),
      authored.map(({atMinute, behavior}) => ({atMinute, behavior})));
      const roles = new Map<number, number>();
      for (const [index, cue] of cues.entries()) {
        assert.ok(cue.actorIndex >= 0 && cue.actorIndex < count, scenarioId);
        const role = authored[index].actorIndex;
        if (roles.has(role)) assert.equal(cue.actorIndex, roles.get(role));
        roles.set(role, cue.actorIndex);
        if (role < count) assert.equal(cue.actorIndex, role);
      }
      assert.equal(new Set(roles.values()).size, roles.size,
        "Independent scenario roles must not collapse onto one guest");
      const partitioned = Array.from({length: 120}, (_, minute) =>
        cuesBetween(scenarioId, start, start + minute * 60000,
          start + (minute + 1) * 60000, count)).flat();
      assert.deepEqual(partitioned, cues, scenarioId);
      const actors = buildRehearsalActors("session-1", count, 42, now);
      const batched = applyRehearsalCues(actors, cues, now);
      const stepped = partitioned.reduce((current, cue) =>
        applyRehearsalCues(current, [cue], now), actors);
      assert.deepEqual(batched, stepped, scenarioId);
    }
  }
});

test("default roster includes both capacity-scenario guests", () => {
  const start = now.toMillis();
  const cues = cuesBetween("rosterAndCapacity", start, start,
    start + 15 * 60000, 12);
  assert.deepEqual(cues, [
    {atMinute: 12, behavior: "leaveEarly", actorIndex: 4},
    {atMinute: 13, behavior: "walkIn", actorIndex: 0},
  ]);
  const actors = buildRehearsalActors("session-1", 12, 42, now);
  const next = applyRehearsalCues(actors, cues, now);
  assert.equal(next[4].status, "departed");
  assert.equal(next[0].status, "walkIn");
  assert.equal(next.filter((actor) => actor.status === "expected").length, 10);
  assert.ok(actors.every((actor) => actor.status === "expected"));
});

test("small rosters retain one guest across exit and return", () => {
  const start = now.toMillis();
  const actors = buildRehearsalActors("session-1", 2, 42, now);
  const exit = cuesBetween("earlyExitAndReturn", start, start,
    start + 20 * 60000, 2);
  const returning = cuesBetween("earlyExitAndReturn", start,
    start + 20 * 60000, start + 40 * 60000, 2);
  assert.equal(exit[0].actorIndex, returning[0].actorIndex);
  const departed = applyRehearsalCues(actors, exit, now);
  assert.equal(departed[0].status, "departed");
  const restored = applyRehearsalCues(departed, returning, now);
  assert.equal(restored[0].status, "returned");
  assert.equal(restored[1].status, "expected");
});

test("clock batches preserve earlier effects on the same guest", () => {
  const actors = buildRehearsalActors("session-1", 2, 42, now);
  const next = applyRehearsalCues(actors, [
    {atMinute: 2, behavior: "leaveEarly", actorIndex: 0},
    {atMinute: 1, behavior: "arrive", actorIndex: 0},
  ], now);
  assert.equal(next[0].status, "departed");
  assert.equal(next[0].confirmedLayoutUnitId, actors[0].layoutUnitId);
  assert.equal(actors[0].status, "expected");
  assert.equal(actors[0].confirmedLayoutUnitId, null);
  assert.deepEqual(next[1], actors[1]);
});

test("scenario scheduling rejects unsupported or missing rosters", () => {
  const start = now.toMillis();
  for (const count of [0, 1, 1.5, 51, NaN, Infinity]) {
    assert.throws(() => cuesBetween("smoothRun", start, start,
      start + 15 * 60000, count));
  }
  assert.throws(() => applyRehearsalCues([], [
    {atMinute: 1, behavior: "arrive", actorIndex: 0},
  ], now));
});

test("behavior simulation retains privacy and safety state", () => {
  const actor = buildRehearsalActors("session-1", 2, 7, now)[0];
  assert.ok(actor);
  const optedOut = applyRehearsalBehavior(actor, "optOut", [], now);
  const keptApart = applyRehearsalBehavior(
    optedOut,
    "keepApart",
    ["actor-01", "actor-02"],
    now
  );
  assert.equal(keptApart.optedOut, true);
  assert.deepEqual(keptApart.keepApartActorIds, ["actor-02"]);
});

test("connection faults never change attendance, placement or safety state",
  () => {
    const base = buildRehearsalActors("session-1", 2, 7, now)[0];
    const later = admin.firestore.Timestamp.fromMillis(now.toMillis() + 1000);
    for (const status of ["expected", "present", "late", "noShow", "departed",
      "returned", "walkIn", "ambiguousClaim"] as const) {
      const actor = {...base, status, optedOut: true, helpRequested: true,
        confirmedLayoutUnitId: "table-1", keepApartActorIds: ["actor-02"]};
      const disconnected = applyRehearsalBehavior(
        actor, "disconnect", [], later);
      assert.equal(disconnected.connectionState, "disconnected");
      assert.deepEqual({...disconnected, connectionState: actor.connectionState,
        lastActionAt: actor.lastActionAt, updatedAt: actor.updatedAt}, actor);
      const reconnected = applyRehearsalBehavior(disconnected,
        "reconnect", [], later);
      assert.equal(reconnected.connectionState, "connected");
      assert.equal(reconnected.status, status);
      assert.equal(reconnected.confirmedLayoutUnitId, "table-1");
      assert.deepEqual(actor, {...base, status, optedOut: true,
        helpRequested: true, confirmedLayoutUnitId: "table-1",
        keepApartActorIds: ["actor-02"]});
    }
    assert.equal(statusAfterBehavior("disconnect"), null);
    assert.equal(statusAfterBehavior("reconnect"), null);
  });

test("legacy reconnection cannot invent an arrival", () => {
  const actor = {...buildRehearsalActors("session-1", 2, 7, now)[0],
    status: "disconnected" as const};
  delete actor.connectionState;
  delete actor.participation;
  assert.equal(rehearsalActorConnectionState(actor), "disconnected");
  const connected = applyRehearsalBehavior(actor, "reconnect", [], now);
  assert.equal(connected.status, "disconnected");
  assert.equal(rehearsalActorConnectionState(connected), "connected");
  const arrived = applyRehearsalGuestAction(connected, "confirmArrival", now);
  assert.equal(arrived.status, "present");
  assert.equal(rehearsalActorConnectionState(arrived), "connected");
});

test("guest actions mutate only the synthetic actor", () => {
  const actor = buildRehearsalActors("session-1", 2, 7, now)[0];
  assert.ok(actor);
  const checkedIn = applyRehearsalGuestAction(actor, "checkIn", now);
  const prompted = applyRehearsalGuestAction(
    checkedIn,
    "completePrompt",
    now
  );
  assert.equal(prompted.status, "present");
  assert.equal(prompted.promptCompleted, true);
  assert.equal(momentForStep(99), "complete");
});

test("duplicate client delivery resolves to one stable receipt", () => {
  const first = eventRehearsalActionDocumentId(
    "session-1",
    "host",
    "client-42"
  );
  const retry = eventRehearsalActionDocumentId(
    "session-1",
    "host",
    "client-42"
  );
  const next = eventRehearsalActionDocumentId(
    "session-1",
    "host",
    "client-43"
  );
  const guest = eventRehearsalActionDocumentId(
    "session-1",
    "guest-slot-1",
    "client-42"
  );
  assert.equal(first, retry);
  assert.notEqual(first, next);
  assert.notEqual(first, guest);
});

test("Room placement persists current-round and pinned semantics", () => {
  const actor = buildRehearsalActors("session-1", 8, 7, now)[0];
  assert.ok(actor);
  assert.equal(actor.layoutUnitId, "table-1");
  const currentRound = applyRehearsalSpatialAction(
    actor,
    "reassign",
    "table-2",
    "thisRound",
    2,
    now
  );
  assert.equal(currentRound.layoutUnitId, "table-2");
  assert.equal(currentRound.confirmedLayoutUnitId, null);
  const pinned = applyRehearsalSpatialAction(
    currentRound,
    "confirmPosition",
    null,
    null,
    2,
    now
  );
  assert.equal(pinned.confirmedLayoutUnitId, "table-2");
  const released = applyRehearsalSpatialAction(
    pinned,
    "releasePinned",
    null,
    null,
    2,
    now
  );
  assert.equal(released.layoutUnitId, "table-2");
  assert.equal(released.confirmedLayoutUnitId, null);
});

test("Room placement rejects destinations outside the rehearsal layout", () => {
  const actor = buildRehearsalActors("session-1", 8, 7, now)[0];
  assert.ok(actor);
  assert.throws(() => applyRehearsalSpatialAction(
    actor,
    "reassign",
    "table-3",
    "pinned",
    2,
    now
  ));
});
