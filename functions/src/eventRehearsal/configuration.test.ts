import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import * as admin from "firebase-admin";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  CreateEventRehearsalCallablePayload,
} from "../shared/generated/createEventRehearsalCallablePayload";
import {
  EventRehearsalDocument,
  EventRehearsalActorDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  controlEventRehearsalHandler,
  createEventRehearsalHandler,
  resetEventRehearsalHandler,
  updateEventRehearsalSetupHandler,
  rehearsalGuestProjection,
} from "./handlers";

import {buildConfiguredRehearsalActors, freezeRehearsalSetup,
  rehearsalUnitCount} from "./configuration";
import {validPracticeVisit} from "./visitState";
import {validPracticeParticipation} from "./participation";

import {getEventRehearsalSummaryHandler} from "./summary";

type Data = Record<string, unknown>;
function updateData(current: Data, patch: Data): Data {
  const next = {...current, ...patch};
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof admin.firestore.FieldValue &&
        value.isEqual(admin.firestore.FieldValue.delete())) delete next[key];
  }
  return next;
}
class Store {
  readonly writes: string[] = [];
  constructor(readonly docs: Record<string, Data>) {}
  collection(name: string) {
    return new Query(this, name);
  }
  batch() {
    return new Batch(this);
  }
  async runTransaction<T>(fn: (tx: Batch) => Promise<T>) {
    const tx = this.batch();
    const result = await fn(tx);
    await tx.commit();
    return result;
  }
  asFirestore() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}
class Ref {
  constructor(
    readonly store: Store,
    readonly path: string,
  ) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  async get() {
    return new Snap(this);
  }
  async update(value: Data) {
    this.store.writes.push(this.path);
    this.store.docs[this.path] = updateData(
      this.store.docs[this.path], value
    );
  }
}
class Snap {
  constructor(readonly ref: Ref) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this.ref.store.docs[this.ref.path] !== undefined;
  }
  data() {
    return this.ref.store.docs[this.ref.path];
  }
  get(field: string) {
    return this.data()?.[field];
  }
}
class Query {
  constructor(
    readonly store: Store,
    readonly name: string,
    readonly filters: Array<[string, string, unknown]> = [],
    readonly max = Infinity,
  ) {}
  doc(id: string) {
    return new Ref(this.store, `${this.name}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new Query(
      this.store,
      this.name,
      [...this.filters, [field, op, value]],
      this.max,
    );
  }
  limit(max: number) {
    return new Query(this.store, this.name, this.filters, max);
  }
  async get() {
    const docs = Object.entries(this.store.docs)
      .filter(
        ([key, value]) =>
          key.startsWith(`${this.name}/`) &&
          this.filters.every(([field, op, expected]) =>
            op === "in" ?
              (expected as unknown[]).includes(value[field]) :
              value[field] === expected,
          ),
      )
      .slice(0, this.max)
      .map(([key]) => new Snap(new Ref(this.store, key)));
    return {docs, size: docs.length, empty: docs.length === 0};
  }
}
class Batch {
  readonly pending: Array<() => void> = [];
  constructor(readonly store: Store) {}
  async get(ref: Ref | Query) {
    return ref.get();
  }
  set(ref: Ref, value: Data) {
    this.pending.push(() => {
      this.store.docs[ref.path] = value;
      this.store.writes.push(ref.path);
    });
  }
  create(ref: Ref, value: Data) {
    this.set(ref, value);
  }
  update(ref: Ref, value: Data) {
    this.set(ref, updateData(this.store.docs[ref.path], value));
  }
  delete(ref: Ref) {
    this.pending.push(() => {
      delete this.store.docs[ref.path];
      this.store.writes.push(ref.path);
    });
  }
  async commit() {
    for (const write of this.pending) write();
  }
}
function request(data: unknown) {
  return {
    auth: {uid: "host-1", token: {}},
    data,
  } as CallableRequest<unknown>;
}
const setup: NonNullable<CreateEventRehearsalCallablePayload["setup"]> = {
  title: "My practice",
  locationName: "Courtyard",
  durationMinutes: 90,
  hostGoal: "Welcome each team",
  attendeePrompt: "Say hello",
  moduleIds: ["arrival", "pods"],
  eventFormat: {
    version: 1,
    activityKind: "pubQuiz",
    interactionModel: "teamRotations",
  },
  successDefaults: {
    playbookId: "pub_quiz_teams",
    layoutId: "real-layout",
    selectedModuleIds: ["check_in", "micro_pods"],
    moduleSelectionConfigured: true,
    structureConfig: {
      unitKind: "teams",
      unitSize: 6,
      revealCountdownSeconds: 10,
    },
  },
};
function storeWithRoster(count = 2) {
  const start = admin.firestore.Timestamp.fromMillis(Date.now());
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  return new Store({
    "organizers/org-1": {
      ...Object.fromEntries(Object.entries(fixture).filter(([key]) =>
        key in schema.properties)),
      followerCount: 0, organizerPhotos: [], organizerType: "community",
      ownerUserId: "host-1",
      hostUserIds: [],
      hostProfiles: [],
    },
    "events/event-1": {
      organizerId: "org-1",
      name: "Real event",
      startTime: start,
      endTime: admin.firestore.Timestamp.fromMillis(
        start.toMillis() + 5400000,
      ),
      meetingPoint: "Courtyard",
      meetingLocation: {name: "Courtyard"},
      eventFormat: setup.eventFormat,
    },
    ...Object.fromEntries(
      Array.from({length: count}, (_, index) => [
        `eventAttendees/private-${index}`,
        {
          eventId: "event-1",
          organizerId: "org-1",
          displayName: `Actual guest ${index}`,
          status: index === 0 ? "checkedIn" : "registered",
          linkedUid: `real-user-${index}`,
          email: "private@example.com",
          phoneE164: "+919999999999",
        },
      ]),
    ),
    "eventAttendees/cancelled": {
      eventId: "event-1",
      organizerId: "org-1",
      displayName: "Cancelled",
      status: "cancelled",
    },
  });
}
const payload = {
  organizerId: "org-1",
  sourceEventId: "event-1",
  seed: 8,
  actorCount: 12,
  scenarioId: "smoothRun",
  guestSource: "event",
  startImmediately: true,
  setup,
};

test("creation freezes setup and roster without live writes", async () => {
  const db = storeWithRoster();
  const production = JSON.stringify(db.docs);
  const created = await createEventRehearsalHandler(
    request(payload),
    db.asFirestore(),
  );
  const session = db.docs[
    `eventRehearsals/${created.sessionId}`
  ] as unknown as EventRehearsalDocument;
  assert.equal(session.status, "running");
  assert.equal(session.actorCount, 2);
  assert.equal(session.setup.eventFormat?.activityKind, "pubQuiz");
  assert.equal(session.setup.successDefaults?.layoutId, null);
  assert.equal(session.setup.successDefaults?.structureConfig?.unitSize, 6);
  assert.equal(session.setup.title, "My practice");
  const actors = Object.values(db.docs).filter(
    (d) => d.sessionId === created.sessionId,
  ) as unknown as EventRehearsalActorDocument[];
  assert.deepEqual(
    actors.map((a) => a.displayName),
    ["Actual guest 0", "Actual guest 1"],
  );
  assert.deepEqual(
    actors.map((a) => a.status),
    ["present", "expected"],
  );
  assert.ok(
    actors.every(
      (a) =>
        a.actorId.startsWith("actor-") &&
        !("linkedUid" in a) &&
        !("email" in a),
    ),
  );
  assert.equal(actors[0].visit?.checkedInAtMillis,
    session.virtualNow.toMillis());
  assert.equal(actors[1].visit?.checkedInAtMillis, null);
  assert.ok(actors.every((actor) => actor.visit &&
    validPracticeVisit(actor.visit, session.virtualStartedAt.toMillis(),
      session.virtualNow.toMillis()) && validPracticeParticipation(actor)));
  assert.equal(session.rosterReconciliation?.rows.length, 2);
  const publicGuest = rehearsalGuestProjection(session, actors[0], "token");
  assert.equal(publicGuest.actor.displayName, "Practice guest 01");
  assert.ok(!JSON.stringify(publicGuest).includes("Actual guest"));
  assert.ok(
    db.writes.every(
      (p) => p.startsWith("eventRehearsal") || p.startsWith("rateLimits/"),
    ),
  );
  assert.equal(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(db.docs).filter(([key]) => !db.writes.includes(key)),
      ),
    ),
    production,
  );
});

test("reset and fork preserve the frozen roster", async () => {
  const db = storeWithRoster();
  const created = await createEventRehearsalHandler(
    request(payload),
    db.asFirestore(),
  );
  db.docs["eventAttendees/private-0"].displayName = "Changed after copy";
  delete db.docs["events/event-1"];
  const reset = await resetEventRehearsalHandler(
    request({sessionId: created.sessionId, fork: false, seed: null}),
    db.asFirestore(),
  );
  assert.ok("actors" in reset);
  assert.equal(reset.actors[0].displayName, "Actual guest 0");
  assert.equal(reset.actors[0].status, "present");
  const fork = await resetEventRehearsalHandler(
    request({sessionId: created.sessionId, fork: true, seed: null}),
    db.asFirestore(),
  );
  assert.ok("sessionId" in fork);
  const forkSession = db.docs[
    `eventRehearsals/${fork.sessionId}`
  ] as unknown as EventRehearsalDocument;
  assert.deepEqual(forkSession.rosterSnapshot, [
    {displayName: "Actual guest 0", status: "present"},
    {displayName: "Actual guest 1", status: "expected"},
  ]);
  await assert.rejects(
    updateEventRehearsalSetupHandler(
      request({
        sessionId: created.sessionId,
        expectedRevision: 1,
        actorCount: 3,
        scenarioId: "smoothRun",
        setup,
      }),
      db.asFirestore(),
    ),
    /cannot be resized/,
  );
});

test("copied roster limits reject truncation or padding", async () => {
  for (const count of [0, 1, 51]) {
    const db = storeWithRoster(count);
    await assert.rejects(
      createEventRehearsalHandler(request(payload), db.asFirestore()),
      /between 2 and 50/,
    );
    assert.ok(!db.writes.some((p) => p.startsWith("eventRehearsals/")));
  }
  const db = storeWithRoster(51);
  const created = await createEventRehearsalHandler(
    request({...payload, guestSource: "simulated", actorCount: 8}),
    db.asFirestore(),
  );
  const session = db.docs[
    `eventRehearsals/${created.sessionId}`
  ] as unknown as EventRehearsalDocument;
  assert.equal(session.actorCount, 8);
  assert.equal(session.rosterSnapshot, undefined);
});

test("source ownership and host authorization are required", async () => {
  const db = storeWithRoster();
  db.docs["events/event-1"].organizerId = "another-organizer";
  await assert.rejects(
    createEventRehearsalHandler(request(payload), db.asFirestore()),
    /does not belong/,
  );
  await assert.rejects(
    createEventRehearsalHandler(
      {
        ...request(payload),
        auth: {uid: "stranger", token: {}},
      } as CallableRequest<unknown>,
      db.asFirestore(),
    ),
    /owners and managers/,
  );
  assert.ok(!db.writes.some((p) => p.startsWith("eventRehearsals/")));
});

test("custom setup retains safe shape and strips production references", () => {
  const frozen = freezeRehearsalSetup({...setup,
    eventFormat: {...setup.eventFormat!, activityDetails: {
      productionAttendeeId: "private-person", arbitrary: "private"}},
  });
  assert.equal(frozen.eventFormat?.activityDetails, undefined);
  assert.equal(frozen.successDefaults?.layoutId, null);
  assert.equal(frozen.successDefaults?.playbookId, "pub_quiz_teams");
  const now = admin.firestore.Timestamp.now();
  const actors = buildConfiguredRehearsalActors("practice", 14, 1,
    now, undefined, frozen);
  assert.deepEqual(actors.map((actor) => actor.layoutUnitId), [
    ...Array(6).fill("table-1"), ...Array(6).fill("table-2"),
    "table-3", "table-3",
  ]);
  assert.equal(rehearsalUnitCount({actorCount: 14, setup: frozen} as
    EventRehearsalDocument), 3);
});

test("event guests require a source and matching ownership", async () => {
  const noSource = storeWithRoster();
  await assert.rejects(createEventRehearsalHandler(
    request({...payload, sourceEventId: null}), noSource.asFirestore()),
  /Choose an event/);
  const mixed = storeWithRoster();
  mixed.docs["eventAttendees/private-1"].organizerId = "other";
  await assert.rejects(createEventRehearsalHandler(
    request(payload), mixed.asFirestore()), /Roster organizer mismatch/);
  for (const db of [noSource, mixed]) {
    assert.ok(!db.writes.some((path) => path.startsWith("eventRehearsal")));
  }
});

test("legacy requests still create a draft with simulated guests", async () => {
  const db = storeWithRoster();
  const legacy = {organizerId: payload.organizerId,
    sourceEventId: payload.sourceEventId, seed: payload.seed,
    actorCount: payload.actorCount, scenarioId: payload.scenarioId};
  const created = await createEventRehearsalHandler(request(legacy),
    db.asFirestore());
  const session = db.docs[`eventRehearsals/${created.sessionId}`];
  assert.equal(session.status, "draft");
  assert.equal(session.actorCount, 12);
  assert.equal(session.guestSource, "simulated");
  assert.equal(session.rosterSnapshot, undefined);
});

test("completion survives reset, fork and session deletion", async () => {
  const db = storeWithRoster();
  const summary = () => getEventRehearsalSummaryHandler(
    request({organizerId: "org-1"}), db.asFirestore());
  assert.deepEqual(await summary(), {hasCompletedRehearsal: false});
  const created = await createEventRehearsalHandler(request(payload),
    db.asFirestore());
  assert.deepEqual(await summary(), {hasCompletedRehearsal: false});
  const complete = request({sessionId: created.sessionId, action: "complete",
    expectedRevision: 0, clientActionId: "complete-once"});
  await controlEventRehearsalHandler(complete, db.asFirestore());
  const milestone = db.docs["eventRehearsalMilestones/org-1"];
  assert.ok(milestone.completedAt instanceof admin.firestore.Timestamp);
  assert.deepEqual(await summary(), {hasCompletedRehearsal: true});
  const writesBeforeReplay = db.writes.filter((path) =>
    path.startsWith("eventRehearsalMilestones/")).length;
  await controlEventRehearsalHandler(complete, db.asFirestore());
  assert.equal(db.writes.filter((path) =>
    path.startsWith("eventRehearsalMilestones/")).length, writesBeforeReplay);
  for (const fork of [true, false]) {
    await resetEventRehearsalHandler(request({sessionId: created.sessionId,
      fork, seed: null}), db.asFirestore());
    assert.deepEqual(await summary(), {hasCompletedRehearsal: true});
  }
  for (const path of Object.keys(db.docs)) {
    if (path.startsWith("eventRehearsals/")) delete db.docs[path];
  }
  assert.deepEqual(await summary(), {hasCompletedRehearsal: true});
  assert.equal(db.docs["eventRehearsalMilestones/org-1"], milestone);
});

test("summary authorizes each read and keeps errors distinct from false",
  async () => {
    const db = storeWithRoster();
    const summary = () => getEventRehearsalSummaryHandler(
      request({organizerId: "org-1"}), db.asFirestore());
    db.docs["eventRehearsals/legacy-complete"] = {
      organizerId: "other-org", status: "complete",
    };
    assert.deepEqual(await summary(), {hasCompletedRehearsal: false});
    db.docs["eventRehearsals/legacy-complete"].organizerId = "org-1";
    assert.deepEqual(await summary(), {hasCompletedRehearsal: true});
    assert.equal(db.docs["eventRehearsalMilestones/org-1"], undefined);
    db.docs["eventRehearsalMilestones/org-1"] = {organizerId: "org-1"};
    await assert.rejects(summary(), /evidence needs review/);
    db.docs["organizers/org-1"].ownerUserId = "another-owner";
    db.docs["organizers/org-1"].hostUserId = "another-owner";
    await assert.rejects(summary(), /owners and managers/);
  });

test("failed completion never stamps a milestone", async () => {
  const db = storeWithRoster();
  const created = await createEventRehearsalHandler(
    request({...payload, startImmediately: false}), db.asFirestore());
  await assert.rejects(controlEventRehearsalHandler(
    request({sessionId: created.sessionId, action: "complete",
      expectedRevision: 0, clientActionId: "invalid-completion"}),
    db.asFirestore()));
  assert.equal(db.docs["eventRehearsalMilestones/org-1"], undefined);
});
