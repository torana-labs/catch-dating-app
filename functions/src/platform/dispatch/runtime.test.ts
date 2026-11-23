import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {
  DISPATCH_DEAD_LETTERS,
  DISPATCH_DEAD_LETTER_RETENTION_MS,
  DISPATCH_MAX_EVENT_AGE_MS,
  DispatchFailure,
  DispatchRegistrationError,
  deadLetterId,
  defineProjections,
  dispatchEvent,
  dispatcherMemory,
  dispatcherTimeoutSeconds,
  fieldsChanged,
  registeredSpecs,
  type DispatchContext,
  type DispatchEventInput,
  type DispatchSpec,
} from "./runtime";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");

interface FakeDb {
  db: Firestore;
  writes: {path: string; data: Record<string, unknown>}[];
}

function fakeDb(): FakeDb {
  const writes: FakeDb["writes"] = [];
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({path: `${name}/${id}`}),
    }),
    batch: () => {
      const staged: FakeDb["writes"] = [];
      return {
        set: (ref: {path: string}, data: Record<string, unknown>) => {
          staged.push({path: ref.path, data});
        },
        commit: async () => {
          writes.push(...staged);
        },
      };
    },
  } as unknown as Firestore;
  return {db, writes};
}

function logs() {
  const errors: Record<string, unknown>[] = [];
  const warnings: Record<string, unknown>[] = [];
  return {
    errors,
    warnings,
    log: {
      error: (_message: string, data: Record<string, unknown>) => {
        errors.push(data);
      },
      warn: (_message: string, data: Record<string, unknown>) => {
        warnings.push(data);
      },
    } as never,
  };
}

function event(overrides: Partial<DispatchEventInput> = {}):
  DispatchEventInput {
  return {
    id: "event-1",
    time: new Date(NOW - 1000).toISOString(),
    document: "organizers/org-1",
    params: {organizerId: "org-1"},
    before: {name: "Lantern Club"},
    after: {name: "Lantern Club Runs"},
    ...overrides,
  };
}

const projection = (id: string,
  run: DispatchSpec["run"] = () => undefined,
  when: DispatchSpec["when"] = () => true): DispatchSpec =>
  ({id, kind: "projection", when, run});

test("an effect without a receipt command is rejected at registration",
  () => {
    assert.throws(() => defineProjections("organizers", [
      {id: "sendWelcome", kind: "effect", when: () => true,
        run: () => undefined} as unknown as DispatchSpec,
    ]), (error: unknown) => error instanceof DispatchRegistrationError &&
      /must name the commandReceipts command/.test(error.message));
    assert.throws(() => defineProjections("organizers", [
      {id: "sendWelcome", kind: "effect", when: () => true,
        run: () => undefined, receipt: {command: "Not_Camel"}},
    ]), DispatchRegistrationError);
    const set = defineProjections("organizers", [
      {id: "sendWelcome", kind: "effect", when: () => true,
        run: () => undefined, receipt: {command: "organizerWelcome"}},
    ]);
    assert.equal(set.specs.length, 1);
  });

test("registration rejects malformed specs, repeats and foreign sets", () => {
  assert.throws(() => defineProjections("Organizers", []),
    DispatchRegistrationError);
  assert.throws(() => defineProjections("organizers",
    [projection("bad-id")]), DispatchRegistrationError);
  assert.throws(() => defineProjections("organizers",
    [projection("a"), projection("a")]), /twice/);
  assert.throws(() => defineProjections("organizers", [
    {...projection("a"), receipt: {command: "x"}} as unknown as DispatchSpec,
  ]), /declares a receipt/);
  assert.throws(() => defineProjections("organizers", [
    {...projection("a"), kind: "sideEffect"} as unknown as DispatchSpec,
  ]), /projection or an effect/);
  assert.throws(() => defineProjections("organizers",
    [{...projection("a"), timeoutSeconds: 900}]), /invalid timeout/);
  const first = defineProjections("organizers", [projection("a")]);
  const again = defineProjections("organizers", [projection("a")]);
  const events = defineProjections("events", [projection("b")]);
  assert.throws(() => registeredSpecs("organizers", [first, again]),
    /twice/);
  assert.throws(() => registeredSpecs("organizers", [first, events]),
    /events projection set/);
  assert.deepEqual(registeredSpecs("organizers", [first]).map((s) => s.id),
    ["a"]);
});

test("the dispatcher takes the largest timeout and memory its specs ask for",
  () => {
    const plain = defineProjections("organizers", [projection("a")]);
    assert.equal(dispatcherTimeoutSeconds([plain]), 60);
    assert.equal(dispatcherMemory([plain]), "512MiB");
    const heavy = defineProjections("organizers", [
      {...projection("b"), timeoutSeconds: 300, memory: "1GiB"},
      {...projection("c"), timeoutSeconds: 120, memory: "256MiB"},
    ]);
    assert.equal(dispatcherTimeoutSeconds([plain, heavy]), 300);
    assert.equal(dispatcherMemory([plain, heavy]), "1GiB");
  });

test("when filters which specs run, and sees the derived operation",
  async () => {
    const {db} = fakeDb();
    const ran: string[] = [];
    const operations: string[] = [];
    const specs = [
      projection("nameView", () => {
        ran.push("nameView");
      }, (change) => {
        operations.push(change.operation);
        return fieldsChanged(change, ["name"]);
      }),
      projection("photoView", () => {
        ran.push("photoView");
      }, (change) => fieldsChanged(change, ["organizerPhotos"])),
    ];
    const outcome = await dispatchEvent("organizers", specs, event(),
      {db, nowMillis: () => NOW, log: logs().log});
    assert.deepEqual(ran, ["nameView"]);
    assert.deepEqual(outcome, {matched: ["nameView"], failed: [],
      deadLettered: false});
    await dispatchEvent("organizers", specs, event({before: undefined}),
      {db, nowMillis: () => NOW, log: logs().log});
    await dispatchEvent("organizers", specs, event({after: undefined}),
      {db, nowMillis: () => NOW, log: logs().log});
    assert.deepEqual(operations, ["update", "create", "delete"]);
    // A write with neither side (no data) runs nothing.
    const empty = await dispatchEvent("organizers", specs,
      event({before: undefined, after: undefined}),
      {db, nowMillis: () => NOW, log: logs().log});
    assert.deepEqual(empty.matched, []);
  });

test("out-of-order replay of convergent projections ends in the same state",
  async () => {
    const {db} = fakeDb();
    // The live source, and the view a projection derives from it.
    const store: {source: {name: string}; view?: string} =
      {source: {name: "Lantern Club Runs"}};
    const specs = [projection("nameView", () => {
      // Convergent: re-reads the source, ignores the event payload.
      store.view = store.source.name.toUpperCase();
    })];
    const deps = {db, nowMillis: () => NOW, log: logs().log};
    const older = event({id: "event-1", before: {name: "Lantern Club"},
      after: {name: "Lantern Club Runs"}});
    const newer = event({id: "event-2", before: {name: "Lantern Club Runs"},
      after: {name: "Lantern Club Runs"}});
    await dispatchEvent("organizers", specs, newer, deps);
    await dispatchEvent("organizers", specs, older, deps);
    await dispatchEvent("organizers", specs, newer, deps);
    assert.equal(store.view, "LANTERN CLUB RUNS");
  });

test("a partial failure logs and throws, and the retry converges",
  async () => {
    const {db, writes} = fakeDb();
    const store = {source: 3, doubled: 0, squared: 0};
    let squareAttempts = 0;
    const specs = [
      projection("doubled", () => {
        store.doubled = store.source * 2;
      }),
      projection("squared", () => {
        squareAttempts += 1;
        if (squareAttempts === 1) throw new Error("index not ready");
        store.squared = store.source ** 2;
      }),
    ];
    const first = logs();
    await assert.rejects(dispatchEvent("organizers", specs, event(),
      {db, nowMillis: () => NOW, log: first.log}),
    (error: unknown) => error instanceof DispatchFailure &&
      error.eventId === "event-1" &&
      error.failedSpecIds.join() === "squared");
    assert.equal(store.doubled, 6);
    assert.deepEqual(first.errors.map((entry) => [entry.projectionId,
      entry.eventId, entry.sourcePath]),
    [["squared", "event-1", "organizers/org-1"]]);
    // Eventarc redelivers the same event: both run again, nothing changes
    // for the one that already succeeded.
    const outcome = await dispatchEvent("organizers", specs, event(),
      {db, nowMillis: () => NOW + 30_000, log: logs().log});
    assert.deepEqual(outcome.failed, []);
    assert.deepEqual(store, {source: 3, doubled: 6, squared: 9});
    assert.equal(writes.length, 0);
  });

test("a poison event past the max age writes one dead letter and returns",
  async () => {
    const {db, writes} = fakeDb();
    let neighbourRuns = 0;
    const specs = [
      projection("neighbour", () => {
        neighbourRuns += 1;
      }),
      projection("poison", () => {
        throw new Error("cannot parse organizer");
      }),
    ];
    // Inside the max age it keeps throwing, so Eventarc keeps retrying.
    await assert.rejects(dispatchEvent("organizers", specs, event(),
      {db, nowMillis: () => NOW, log: logs().log}), DispatchFailure);
    assert.equal(writes.length, 0);
    const late = NOW + DISPATCH_MAX_EVENT_AGE_MS + 1000;
    const record = logs();
    const outcome = await dispatchEvent("organizers", specs, event(),
      {db, nowMillis: () => late, log: record.log});
    assert.deepEqual(outcome, {matched: ["neighbour", "poison"],
      failed: ["poison"], deadLettered: true});
    assert.equal(neighbourRuns, 2);
    assert.equal(writes.length, 1);
    const [letter] = writes;
    assert.equal(letter.path, `${DISPATCH_DEAD_LETTERS}/poison_event-1`);
    assert.deepEqual({...letter.data, eventTime: undefined,
      createdAt: undefined, expiresAt: undefined}, {
      projectionId: "poison",
      kind: "projection",
      eventId: "event-1",
      source: "organizers",
      sourcePath: "organizers/org-1",
      error: "Error: cannot parse organizer",
      eventTime: undefined,
      createdAt: undefined,
      expiresAt: undefined,
    });
    assert.equal((letter.data.expiresAt as Timestamp).toMillis(),
      late + DISPATCH_DEAD_LETTER_RETENTION_MS);
    assert.equal((letter.data.eventTime as Timestamp).toMillis(), NOW - 1000);
    assert.equal(record.warnings.length, 1);
  });

test("a predicate that throws counts as a failure of its spec", async () => {
  const {db} = fakeDb();
  const specs = [projection("broken", () => undefined, () => {
    throw new Error("bad predicate");
  })];
  await assert.rejects(dispatchEvent("organizers", specs, event(),
    {db, nowMillis: () => NOW, log: logs().log}), DispatchFailure);
});

test("an effect gets its receipt keyed by the event id", async () => {
  const {db} = fakeDb();
  const seen: DispatchContext[] = [];
  const specs: DispatchSpec[] = [
    {id: "welcome", kind: "effect", receipt: {command: "organizerWelcome"},
      when: () => true, run: (_change, ctx) => {
        seen.push(ctx);
      }},
    projection("view", (_change, ctx) => {
      seen.push(ctx);
    }),
  ];
  await dispatchEvent("organizers", specs, event({id: "evt-9"}),
    {db, nowMillis: () => NOW, log: logs().log});
  assert.deepEqual(seen[0].receipt, {command: "organizerWelcome",
    id: "evt-9"});
  assert.equal(seen[1].receipt, undefined);
  assert.equal(seen[0].eventId, "evt-9");
});

test("dead letter ids stay valid and bounded", () => {
  assert.equal(deadLetterId("view", "abc-123"), "view_abc-123");
  const long = deadLetterId("view", "x/".repeat(80));
  assert.match(long, /^view_h[a-f0-9]{64}$/);
});
