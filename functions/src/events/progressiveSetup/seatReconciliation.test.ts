import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp, FieldValue} from "firebase-admin/firestore";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {reconcilePrivateEventSeatsHandler} from "./callables";
import {Store, migrationTestAttendee, migrationTestEvent} from
  "../seatAuthority/migrationTestFixture";
import {getManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {reconcilePrivateEventSeats, SeatReconciliationDependencies} from
  "./seatReconciliation";
import {UpdatePrivateEventDetailsCommand, updatePrivateEventDetails} from
  "./details";
import {contractValidator} from "../../shared/contractTestValidators";

const validateEventSetupReceiptDocument =
  contractValidator("EventSetupReceiptDocument");

async function setup() {
  const store = new Store();
  store.rows.set("organizers/org1", {ownerUserId: "host1", hostUserId: "host1",
    hostUserIds: [], hostProfiles: [], status: "active", archived: false,
    hostDefaults: {eventPolicy: {admissionPreset: "openCapacity"}}});
  const event = migrationTestEvent();
  delete event.capacityLimit;
  store.rows.set("events/event1", event);
  store.rows.set("eventAttendees/guest1", migrationTestAttendee(1));
  const db = store.db();
  const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(db)});
  const deps: SeatReconciliationDependencies = {db,
    auth: {getUser: async (uid) => ({uid})}, nowMillis: () => 100,
    timestampFromMillis: Timestamp.fromMillis,
    serverTimestamp: () => Timestamp.fromMillis(100) as unknown as
      FirebaseFirestore.FieldValue};
  const command: UpdatePrivateEventDetailsCommand = {eventId: "event1",
    organizerId: "org1", requestId: "reconcile-1", expectedSetupRevision: 1,
    reviewedDefaultsHash: defaults.preferencesHash,
    details: {admissionTerms: {capacityLimit: 20, priceInPaise: 0,
      currency: "INR", cancellationPolicyId: "notApplicable"}}};
  const next = (pageBudget = 1, cmd = command, actorUid = "host1") =>
    reconcilePrivateEventSeats({actorUid, command: cmd, deps, pageBudget});
  const finish = async () => {
    for (let i = 0; i < 30; i++) {
      const result = await next();
      if (result.kind === "complete") return result;
    }
    throw new Error("reconciliation did not finish");
  };
  return {store, deps, command, next, finish};
}
const code = (value: unknown, expected: string) =>
  value instanceof HttpsError && value.code === expected;

test("manager resumes missing terms atomically and keeps guests and offers",
  async () => {
    const {store, command, deps, next, finish} = await setup();
    const guest = {...store.rows.get("eventAttendees/guest1")};
    const offer = {eventId: "event1", status: "offered", priceInPaise: 25000};
    store.rows.set("organizerEventOffers/offer1", offer);
    assert.equal((await next()).kind, "progress");
    assert.equal(store.rows.get("events/event1")!.capacityLimit, undefined);
    assert.equal(store.rows.get("events/event1")!.setupRevision, 1);
    const result = await finish();
    assert.equal(result.receipt.setupRevision, 2);
    assert.equal(store.rows.get("events/event1")!.capacityLimit, 20);
    assert.equal(store.rows.get("eventSeatLedgers/event1")!.occupied, 1);
    assert.equal(store.rows.get("eventSeatMigrationRuns/event1")!.phase,
      "complete");
    assert.deepEqual(store.rows.get("eventAttendees/guest1"), guest);
    assert.deepEqual(store.rows.get("organizerEventOffers/offer1"), offer);
    assert.ok(![...store.rows.keys()].some((key) =>
      key.startsWith("eventSeatMigrationStages/") ||
      key.startsWith("eventSeatMigrationPlans/")));
    const writes = store.writes.length;
    assert.equal((await finish()).receipt.replayed, true);
    assert.equal(store.writes.length, writes);
    assert.equal((await updatePrivateEventDetails({actorUid: "host1",
      command, deps})).replayed, true);
  });

test("existing configured terms cannot change during reconciliation",
  async () => {
    const {store, next} = await setup();
    store.rows.get("events/event1")!.capacityLimit = 25;
    await assert.rejects(next(), (error) => code(error, "failed-precondition"));
    assert.equal(store.writes.length, 0);
  });

test("manager authority, revision and defaults fail closed",
  async () => {
    const {store, command, next} = await setup();
    await assert.rejects(next(1, command, "stranger"),
      (error) => code(error, "permission-denied"));
    await assert.rejects(next(1, {...command, expectedSetupRevision: 2}),
      (error) => code(error, "aborted"));
    await assert.rejects(next(1, {...command,
      reviewedDefaultsHash: "0".repeat(64)}),
    (error) => code(error, "aborted"));
    assert.equal(store.writes.length, 0);
  });

test("progress rechecks deletion and original command on every request",
  async () => {
    const {store, command, next} = await setup();
    await next();
    const count = store.writes.length;
    await assert.rejects(next(1, {...command, requestId: "different-1"}),
      (error) => code(error, "failed-precondition"));
    store.rows.set("deletedUsers/host1", {});
    await assert.rejects(next(), (error) => code(error, "failed-precondition"));
    assert.equal(store.writes.length, count);
  });

test("authority loss between pages blocks the next transaction", async () => {
  const {store, next} = await setup();
  let page = 0;
  store.beforeTransaction = () => {
    if (++page === 4) store.rows.get("organizers/org1")!.archived = true;
  };
  await assert.rejects(next(5), (error) => code(error, "failed-precondition"));
  assert.equal(store.rows.get("events/event1")!.setupRevision, 1);
  assert.equal(store.rows.get("eventSeatLedgers/event1")!.state,
    "unreconciled");
});

test("receipt after activation does not bypass staged source cleanup",
  async () => {
    const {store, next, finish} = await setup();
    for (let i = 0; i < 20; i++) {
      const result = await next();
      if (result.kind === "progress" && result.progress.phase === "cleanup") {
        break;
      }
    }
    assert.equal(store.rows.get("eventSeatMigrationRuns/event1")!.phase,
      "cleanup");
    assert.ok([...store.rows.keys()].some((key) =>
      key.startsWith("eventSetupReceipts/")));
    assert.ok([...store.rows.keys()].some((key) =>
      key.startsWith("eventSeatMigrationStages/")));
    await finish();
    assert.ok(![...store.rows.keys()].some((key) =>
      key.startsWith("eventSeatMigrationStages/")));
  });

test("production timestamp sentinels do not become unvalidated event terms",
  async () => {
    const {deps, finish} = await setup();
    deps.serverTimestamp = FieldValue.serverTimestamp;
    await finish();
  });


test("normal details cannot invalidate a pending guest reconciliation",
  async () => {
    const {store, deps, command, next, finish} = await setup();
    await next();
    await assert.rejects(updatePrivateEventDetails({actorUid: "host1", deps,
      command: {...command, requestId: "description-2",
        details: {description: "Changed elsewhere"}}}),
    (error) => code(error, "failed-precondition"));
    assert.equal(store.rows.get("events/event1")!.setupRevision, 1);
    await finish();
  });

test("explicit reviewed terms survive later organizer-default changes",
  async () => {
    const {store, next, finish} = await setup();
    await next();
    store.rows.get("organizers/org1")!.hostDefaults = {
      eventPolicy: {admissionPreset: "openCapacity"},
      eventSetup: {usualDurationMinutes: 120},
    };
    await finish();
    assert.equal(store.rows.get("events/event1")!.capacityLimit, 20);
  });


test("an already reconciled event can save unchanged admission terms",
  async () => {
    const {store, command, next, finish} = await setup();
    await finish();
    const result = await next(1, {...command, requestId: "later-save-1",
      expectedSetupRevision: 2});
    assert.equal(result.kind, "complete");
    assert.equal(store.rows.get("events/event1")!.setupRevision, 3);
    assert.equal(store.rows.get("eventSeatLedgers/event1")!.occupied, 1);
  });


test("authenticated callable returns bounded validated progress then receipt",
  async () => {
    const {store, deps, command} = await setup();
    const actions: string[] = [];
    const request = {data: command, auth: {uid: "host1", token: {}}} as
      CallableRequest<unknown>;
    let complete = false;
    for (let i = 0; i < 10; i++) {
      const result = await reconcilePrivateEventSeatsHandler(request, {
        firestore: () => store.db(), seatAuth: deps.auth,
        nowMillis: deps.nowMillis, service: () => deps,
        checkRateLimit: async (_db, _uid, action) => {
          actions.push(action);
        },
      });
      if (result.kind === "complete") {
        assert.equal(result.receipt.setupRevision, 2);
        complete = true;
        break;
      }
      assert.equal(result.kind, "progress");
      if (result.kind === "progress") {
        assert.equal(result.progress.occupied, null);
      }
    }
    assert.equal(complete, true);
    assert.ok(actions.length > 1);
    assert.ok(actions.every((action) =>
      action === "reconcilePrivateEventSeats"));
  });

test("stale review proves no commit only before migration starts", async () => {
  const {store, command, next} = await setup();
  await assert.rejects(next(1, {...command, expectedSetupRevision: 2}),
    (error) => code(error, "aborted") &&
      ((error as HttpsError).details as {reason?: string}).reason ===
        "event-details-review-stale");
  await next();
  store.rows.get("events/event1")!.setupRevision = 2;
  await assert.rejects(next(), (error) => code(error, "aborted") &&
    (error as HttpsError).details === undefined);
});


test("blocked capacity can discard, resume cleanup and review a new command",
  async () => {
    const {store, deps, command, next} = await setup();
    for (let i = 2; i <= 40; i++) {
      store.rows.set(`eventAttendees/guest${i}`, migrationTestAttendee(i));
    }
    const small = {...command, details: {admissionTerms: {
      ...command.details.admissionTerms!, capacityLimit: 1}}};
    let blocked = false;
    for (let i = 0; i < 10; i++) {
      try {
        await next(1, small);
      } catch (error) {
        assert.ok(code(error, "failed-precondition"));
        blocked = true;
        break;
      }
    }
    assert.equal(blocked, true);
    assert.equal(store.rows.get("eventSeatMigrationRuns/event1")!.phase,
      "plan");
    const discard = () => reconcilePrivateEventSeats({actorUid: "host1",
      command: small, deps, pageBudget: 1, discard: true});
    const progress = await discard();
    assert.equal(progress.kind, "progress");
    assert.equal(store.rows.get("eventSeatMigrationFences/event1")!.state,
      "locked");
    store.failTransactionNumber = store.transactionCount + 2;
    await assert.rejects(discard(), /interrupted transaction/);
    store.failTransactionNumber = null;
    let discarded = false;
    for (let i = 0; i < 10; i++) {
      if ((await discard()).kind === "discarded") {
        discarded = true;
        break;
      }
    }
    assert.equal(discarded, true);
    assert.equal(store.rows.has("eventSeatMigrationFences/event1"), false);
    assert.equal(store.rows.has("eventSeatLedgers/event1"), false);
    assert.equal(store.rows.has("eventSeatMigrationRuns/event1"), false);
    assert.ok(![...store.rows.keys()].some((key) =>
      key.startsWith("eventSeatMigrationStages/")));
    assert.equal(store.rows.get("events/event1")!.setupRevision, 1);
    const tombstone = [...store.rows.entries()].find(([key]) =>
      key.startsWith("eventSetupReceipts/"))![1];
    assert.equal(validateEventSetupReceiptDocument(tombstone), true);
    assert.equal(tombstone.appliedRevision, undefined);
    assert.equal((await next(1, small)).kind, "discarded");
    await assert.rejects(updatePrivateEventDetails({actorUid: "host1",
      command: small, deps}), (error) => code(error, "aborted"));
    const revised = {...small, requestId: "revised-terms-1",
      details: {admissionTerms: {...small.details.admissionTerms,
        capacityLimit: 50}}};
    let complete = false;
    for (let i = 0; i < 30; i++) {
      if ((await next(3, revised)).kind === "complete") {
        complete = true;
        break;
      }
    }
    assert.equal(complete, true);
    assert.equal(store.rows.get("eventSeatLedgers/event1")!.occupied, 40);
    assert.equal(store.rows.get("events/event1")!.capacityLimit, 50);
  });

test("pre-start deterministic rejection can be discarded without a ledger",
  async () => {
    const {store, deps, command, next} = await setup();
    store.rows.get("events/event1")!.capacityLimit = 25;
    await assert.rejects(next(), (error) => code(error, "failed-precondition"));
    const result = await reconcilePrivateEventSeats({actorUid: "host1",
      command, deps, discard: true});
    assert.equal(result.kind, "discarded");
    assert.equal(store.rows.get("events/event1")!.capacityLimit, 25);
    assert.equal(store.rows.has("eventSeatLedgers/event1"), false);
    assert.equal((await next()).kind, "discarded");
  });

test("discard cannot delete applied output and committed work replays",
  async () => {
    const {store, deps, command, next, finish} = await setup();
    for (let i = 0; i < 20; i++) {
      await next();
      const run = store.rows.get("eventSeatMigrationRuns/event1");
      if (Number(run?.outputCursor) > 0) {
        break;
      }
    }
    const writes = store.writes.length;
    await assert.rejects(reconcilePrivateEventSeats({actorUid: "host1",
      command, deps, discard: true}), (error) =>
      code(error, "failed-precondition") &&
      ((error as HttpsError).details as {reason: string}).reason ===
        "seat-reconciliation-discard-unavailable");
    assert.equal(store.writes.length, writes);
    await finish();
    const result = await reconcilePrivateEventSeats({actorUid: "host1",
      command, deps, discard: true});
    assert.equal(result.kind, "complete");
    assert.equal(store.rows.get("eventSeatLedgers/event1")!.occupied, 1);
  });

test("discarding a later unapplied edit preserves the ready ledger",
  async () => {
    const {store, deps, command, finish} = await setup();
    await finish();
    const ledger = {...store.rows.get("eventSeatLedgers/event1")};
    const changed = {...command, requestId: "later-discard-1",
      expectedSetupRevision: 2, details: {admissionTerms: {
        ...command.details.admissionTerms!, capacityLimit: 100}}};
    await assert.rejects(reconcilePrivateEventSeats({actorUid: "host1",
      command: changed, deps}), (error) => code(error, "failed-precondition"));
    assert.equal((await reconcilePrivateEventSeats({actorUid: "host1",
      command: changed, deps, discard: true})).kind, "discarded");
    assert.deepEqual(store.rows.get("eventSeatLedgers/event1"), ledger);
    assert.equal(store.rows.get("eventSeatMigrationRuns/event1")!.phase,
      "complete");
    assert.equal(store.rows.get("events/event1")!.capacityLimit, 20);
  });

test("discard rechecks current manager authority before deleting stages",
  async () => {
    const {store, deps, command, next} = await setup();
    for (let i = 2; i <= 40; i++) {
      store.rows.set(`eventAttendees/guest${i}`, migrationTestAttendee(i));
    }
    await next(3);
    const revokeAt = store.transactionCount + 3;
    store.beforeTransaction = () => {
      if (store.transactionCount === revokeAt) {
        store.rows.set("deletedUsers/host1", {});
      }
    };
    await assert.rejects(reconcilePrivateEventSeats({actorUid: "host1",
      command, deps, discard: true, pageBudget: 5}),
    (error) => code(error, "failed-precondition"));
    assert.equal(store.rows.get("eventSeatMigrationFences/event1")!.state,
      "locked");
    assert.ok([...store.rows.keys()].some((key) =>
      key.startsWith("eventSeatMigrationStages/")));
    store.beforeTransaction = null;
    store.rows.delete("deletedUsers/host1");
    assert.equal((await reconcilePrivateEventSeats({actorUid: "host1",
      command, deps, discard: true, pageBudget: 5})).kind, "discarded");
  });
