import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {bootstrapEventSeatLedger} from "./seatMigrationStore";
import {advanceEventSeatLedgerMigration, PagedSeatBootstrapDeps,
  readSeatMigrationWriterFence}
  from "./seatMigrationPaged";

import {Store, Row, migrationTestEvent as event,
  migrationTestAttendee as attendee} from
  "./seatAuthority/migrationTestFixture";

function rosterOrigin(originContactId: string | undefined): Row {
  return {eventId: "event1", organizerId: "org1",
    sourceKind: "hostImport", sourceEntityKind: "eventAttendee",
    sourceEntityId: "att000", responseId: null, formId: null,
    ...(originContactId === undefined ? {} : {originContactId}),
    currentContactId: "contact1"};
}
function addRosterOrigin(store: Store, originContactId: string | undefined) {
  store.rows.set("organizerContactOrigins/origin1",
    rosterOrigin(originContactId));
  store.rows.set("organizerContacts/contact1", {organizerId: "org1",
    linkedUid: null, identityState: "unlinked", deletedAt: null,
    hiddenAt: null, mergedIntoContactId: null,
    ambiguousCandidateContactIds: []});
}
function setup(count = 1) {
  const store = new Store();
  store.rows.set("events/event1", event());
  for (let index = 0; index < count; index++) {
    store.rows.set(`eventAttendees/att${String(index).padStart(3, "0")}`,
      attendee(index));
  }
  let authCalls = 0;
  const command = {eventId: "event1", organizerId: "org1",
    migrationRevision: 1, asOfMillis: 1000};
  const deps = {db: store.db(),
    auth: {getUser: async (uid: string) => {
      authCalls++;
      return {uid, phoneNumber: null};
    }}};
  return {store, command, deps,
    authCalls: () => authCalls,
    bootstrap: () => bootstrapEventSeatLedger({command, deps})};
}
const denied = (error: unknown) => error instanceof HttpsError &&
  error.code === "failed-precondition";

test("150 guests migrate through bounded durable source/output pages",
  async () => {
    const h = setup(150);
    assert.deepEqual(await h.bootstrap(), {eventId: "event1",
      occupied: 150, migrationRevision: 1});
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "ready");
    assert.equal(h.store.rows.get("eventSeatMigrationFences/event1")?.state,
      "ready");
    assert.equal(h.store.rows.get("eventSeatMigrationRuns/event1")
      ?.outputCursor, 450);
    assert.ok(h.store.transactionCount > 15);
    assert.equal([...h.store.rows.keys()].filter((path) =>
      path.startsWith("eventSeatMigrationStages/")).length, 0);
    assert.equal(h.store.rows.get("eventSeatMigrationRuns/event1")?.phase,
      "complete");
  });

test("150 imported and 50 Catch participants reconcile one capacity",
  async () => {
    const h = setup(150);
    h.store.rows.set("events/event1", {...event(), bookedCount: 50});
    for (let index = 0; index < 50; index++) {
      h.store.rows.set(`eventParticipations/edge${index}`, {
        eventId: "event1", organizerId: "org1", uid: `uid${index}`,
        status: "signedUp"});
    }
    assert.equal((await h.bootstrap()).occupied, 200);
    assert.equal([...h.store.rows.keys()].filter((path) =>
      path.startsWith("eventSeatReservations/")).length, 200);
    assert.equal(h.authCalls(), 100,
      "Auth is read once for planning and once before activation");
  });

test("legacy unclaimed attendee omits nullable fields without UID inference",
  async () => {
    const h = setup(1);
    h.store.rows.set("eventAttendees/att000", {eventId: "event1",
      organizerId: "org1", source: "hostImport", status: "registered"});
    assert.equal((await h.bootstrap()).occupied, 1);
    assert.equal(h.authCalls(), 0);
  });

test("interrupted page resumes without duplicate reservation", async () => {
  const h = setup(80);
  h.store.failTransactionNumber = 5;
  await assert.rejects(h.bootstrap(), /interrupted transaction/);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
  h.store.failTransactionNumber = null;
  assert.equal((await h.bootstrap()).occupied, 80);
  assert.equal([...h.store.rows.keys()].filter((path) =>
    path.startsWith("eventSeatReservations/")).length, 80);
});

test("interrupted output page resumes from committed cursor", async () => {
  const h = setup(80);
  h.store.failTransactionNumber = 10;
  await assert.rejects(h.bootstrap(), /interrupted transaction/);
  const cursor = h.store.rows.get("eventSeatMigrationRuns/event1")
    ?.outputCursor as number;
  assert.ok(cursor > 0);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
  h.store.failTransactionNumber = null;
  assert.equal((await h.bootstrap()).occupied, 80);
  assert.equal([...h.store.rows.keys()].filter((path) =>
    path.startsWith("eventSeatReservations/")).length, 80);
});

test("cleanup resumes after activation and removes private source copies",
  async () => {
    const h = setup(80);
    h.store.failTransactionNumber = 20;
    await assert.rejects(h.bootstrap(), /interrupted transaction/);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "ready");
    assert.equal(h.store.rows.get("eventSeatMigrationRuns/event1")?.phase,
      "cleanup");
    h.store.failTransactionNumber = null;
    // Retention cleanup must still finish if the event later disappears.
    h.store.rows.delete("events/event1");
    assert.equal((await h.bootstrap()).occupied, 80);
    assert.equal([...h.store.rows.keys()].filter((path) =>
      path.startsWith("eventSeatMigrationStages/")).length, 0);
  });

test("duplicate alias across page boundary denies readiness", async () => {
  const h = setup(60);
  h.store.rows.set("eventAttendees/att000", attendee(0, "+919999999999"));
  h.store.rows.set("eventAttendees/att059", attendee(59, "+919999999999"));
  await assert.rejects(h.bootstrap(), denied);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
});

test("missing or malformed original CRM contact blocks ready migration",
  async () => {
    for (const originContactId of [undefined, "invalid/id"]) {
      const h = setup();
      addRosterOrigin(h.store, originContactId);
      await assert.rejects(h.bootstrap(), denied);
      assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
        "unreconciled");
      assert.equal(h.store.rows.get("eventSeatMigrationFences/event1")?.state,
        "locked");
    }
  });

test("changed original CRM contact after staging denies final activation",
  async () => {
    const h = setup();
    addRosterOrigin(h.store, "contact1");
    let changed = false;
    h.store.beforeTransaction = () => {
      const run = h.store.rows.get("eventSeatMigrationRuns/event1");
      if (!changed && run?.phase === "apply" &&
          run.outputCursor === run.outputCount) {
        h.store.rows.set("organizerContactOrigins/origin1",
          rosterOrigin("contact2"));
        changed = true;
      }
    };
    await assert.rejects(h.bootstrap(), denied);
    assert.equal(changed, true);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
    assert.equal(h.store.rows.get("eventSeatMigrationFences/event1")?.state,
      "locked");
  });

test("lost writer fence denies activation", async () => {
  const h = setup(80);
  h.store.beforeTransaction = () => {
    if (h.store.transactionCount === 10) {
      h.store.rows.set("eventSeatMigrationFences/event1",
        {...h.store.rows.get("eventSeatMigrationFences/event1"),
          state: "released"});
    }
  };
  await assert.rejects(h.bootstrap(), denied);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
});

test("event policy drift leaves staged ledger unavailable", async () => {
  const h = setup(80);
  h.store.beforeTransaction = () => {
    if (h.store.transactionCount === 10) {
      h.store.rows.set("events/event1", {...event(), capacityLimit: 201});
    }
  };
  await assert.rejects(h.bootstrap(), denied);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
});

test("edited live attendee after staging denies final activation",
  async () => {
    const h = setup(150);
    let changed = false;
    h.store.beforeTransaction = () => {
      const run = h.store.rows.get("eventSeatMigrationRuns/event1");
      if (!changed && run?.phase === "apply" &&
          run.outputCursor === run.outputCount) {
        h.store.rows.set("eventAttendees/att000",
          {...attendee(0), status: "cancelled"});
        changed = true;
      }
    };
    await assert.rejects(h.bootstrap(), denied);
    assert.equal(changed, true);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
    assert.equal(h.store.rows.get("eventSeatMigrationFences/event1")?.state,
      "locked");
  });

test("new live participation after staging denies final activation",
  async () => {
    const h = setup(80);
    let changed = false;
    h.store.beforeTransaction = () => {
      const run = h.store.rows.get("eventSeatMigrationRuns/event1");
      if (!changed && run?.phase === "apply" &&
          run.outputCursor === run.outputCount) {
        h.store.rows.set("eventParticipations/new-edge", {
          eventId: "event1", organizerId: "org1", uid: "late-uid",
          status: "waitlisted"});
        changed = true;
      }
    };
    await assert.rejects(h.bootstrap(), denied);
    assert.equal(changed, true);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
  });

test("deleted live attendee after staging denies final activation",
  async () => {
    const h = setup(80);
    let changed = false;
    h.store.beforeTransaction = () => {
      const run = h.store.rows.get("eventSeatMigrationRuns/event1");
      if (!changed && run?.phase === "apply" &&
          run.outputCursor === run.outputCount) {
        h.store.rows.delete("eventAttendees/att000");
        changed = true;
      }
    };
    await assert.rejects(h.bootstrap(), denied);
    assert.equal(changed, true);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
  });

test("missing final page checkpoint cannot claim complete source", async () => {
  const h = setup(26);
  h.store.beforeTransaction = () => {
    const run = h.store.rows.get("eventSeatMigrationRuns/event1");
    if (run?.phase === "scan" && run.sourceIndex === 2 &&
        run.cursor === null) {
      h.store.rows.set("eventSeatMigrationRuns/event1",
        {...run, phase: "apply", sourceIndex: 2});
    }
  };
  await assert.rejects(h.bootstrap(), denied);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
});

test("integrated source writer is blocked while a scan is in progress",
  async () => {
    const h = setup(80);
    h.store.failTransactionNumber = 3;
    await assert.rejects(h.bootstrap(), /interrupted transaction/);
    await assert.rejects(h.store.runTransaction(async (tx) => {
      await readSeatMigrationWriterFence({db: h.store.db(),
        tx: tx as FirebaseFirestore.Transaction, eventId: "event1"});
      throw new Error("source write was unexpectedly allowed");
    }), denied);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
  });


test("outstanding holds block before locking writers", async () => {
  for (const [collection, value] of [
    ["eventWaitlistOffers", {status: "active"}],
    ["eventWaitlistOffers", {status: "accepted"}],
    ["crossPathsPairHolds", {status: "active"}],
    ["razorpayPendingOrders", {status: "pending"}],
    ["payments", {status: "pending"}],
    ["payments", {status: "completed", signUpFailed: true}],
    ["guestPayments", {purpose: "publicEvent", status: "checkoutReady"}],
    ["guestPayments", {purpose: "offer", status: "captured"}],
    ["eventSeatReservations", {checkoutHold: {paymentId: "payment1"}}],
    ["eventWaitlistOffers", {status: "unknown"}],
  ] as const) {
    const h = setup();
    h.store.rows.set(`${collection}/hold1`, {eventId: "event1", ...value});
    await assert.rejects(h.bootstrap(), denied);
    assert.equal(h.store.writes.length, 0);
  }
});

test("settled financial history permits roster migration", async () => {
  const h = setup();
  for (const [collection, value] of [
    ["eventWaitlistOffers", {status: "expired"}],
    ["crossPathsPairHolds", {status: "confirmed",
      requesterBookingStatus: "confirmed"}],
    ["razorpayPendingOrders", {status: "failed"}],
    ["payments", {status: "completed", signUpFailed: false}],
    ["guestPayments", {purpose: "publicEvent", status: "refunded"}],
    ["guestPayments", {purpose: "offer", status: "cancelled"}],
  ] as const) {
    h.store.rows.set(`${collection}/old-${Object.values(value).join("-")}`,
      {eventId: "event1", ...value});
  }
  assert.equal((await h.bootstrap()).occupied, 1);
});

test("a new hold during migration prevents activation", async () => {
  const h = setup();
  h.store.beforeTransaction = () => {
    const run = h.store.rows.get("eventSeatMigrationRuns/event1");
    if (run?.phase === "apply" && run.outputCursor === run.outputCount) {
      h.store.rows.set("guestPayments/late1", {
        eventId: "event1", status: "checkoutReady"});
    }
  };
  await assert.rejects(h.bootstrap(), denied);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
  assert.equal(h.store.rows.get("eventSeatMigrationFences/event1")?.state,
    "locked");
});


test("combined roster reservations may exceed one source bound", async () => {
  const h = setup(150);
  h.store.rows.set("events/event1", {...event(), bookedCount: 150,
    capacityLimit: 400});
  for (let index = 0; index < 150; index++) {
    h.store.rows.set(`eventParticipations/edge${index}`, {
      eventId: "event1", organizerId: "org1", uid: `uid${index}`,
      status: "signedUp"});
  }
  assert.equal((await h.bootstrap()).occupied, 300);
});


test("bounded Host advances never report readiness before all pages finish",
  async () => {
    const h = setup(80);
    let checks = 0;
    const deps = {...h.deps, authorizeTransaction: async () => {
      checks++;
    }};
    let progress = await advanceEventSeatLedgerMigration({
      command: h.command, deps, pageBudget: 1});
    assert.equal(progress.phase, "scan");
    assert.equal(progress.scannedRows, 0);
    assert.equal(progress.occupied, null);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
      "unreconciled");
    for (let call = 0; call < 100 && progress.phase !== "complete"; call++) {
      progress = await advanceEventSeatLedgerMigration({
        command: h.command, deps, pageBudget: 2});
    }
    assert.equal(progress.phase, "complete");
    assert.equal(progress.occupied, 80);
    assert.equal(progress.appliedRows, progress.outputRows);
    assert.equal(checks, h.store.transactionCount);
  });

test("manager authority is rechecked after interruption and on completion",
  async () => {
    const h = setup(40);
    let authorized = true;
    const deps = {...h.deps, authorizeTransaction: async () => {
      if (!authorized) throw new HttpsError("permission-denied", "Revoked");
    }};
    await advanceEventSeatLedgerMigration({command: h.command, deps});
    const writes = h.store.writes.length;
    authorized = false;
    await assert.rejects(advanceEventSeatLedgerMigration({
      command: h.command, deps}), (e) => e instanceof HttpsError &&
      e.code === "permission-denied");
    assert.equal(h.store.writes.length, writes);
    authorized = true;
    await bootstrapEventSeatLedger({command: h.command, deps});
    authorized = false;
    await assert.rejects(advanceEventSeatLedgerMigration({
      command: h.command, deps}), (e) => e instanceof HttpsError &&
      e.code === "permission-denied");
  });

test("invalid Host page budgets fail before migration writes", async () => {
  const h = setup();
  for (const pageBudget of [0, 6, 1.5]) {
    await assert.rejects(advanceEventSeatLedgerMigration({
      command: h.command, deps: h.deps, pageBudget}), denied);
  }
  assert.equal(h.store.writes.length, 0);
});


test("reviewed missing terms commit only with reconciled capacity and receipt",
  async () => {
    const h = setup(3);
    const original = event();
    delete original.capacityLimit;
    h.store.rows.set("events/event1", original);
    const command = {...h.command, reviewedRequestHash: "a".repeat(64)};
    const deps: PagedSeatBootstrapDeps = {...h.deps,
      authorizeTransaction: async () => undefined,
      prepareReviewedEvent: async ({tx, event: source}) => {
        if (source.setupRevision !== 1) {
          throw new HttpsError("aborted", "Review changed");
        }
        return {patch: {capacityLimit: 10, setupRevision: 2},
          finish: () => tx.create(h.deps.db.collection("testReceipts")
            .doc("review1"), {eventId: "event1", appliedRevision: 2})};
      }};
    let progress = await advanceEventSeatLedgerMigration({command, deps,
      pageBudget: 1});
    assert.equal(h.store.rows.get("events/event1")?.capacityLimit, undefined);
    assert.equal(h.store.rows.has("testReceipts/review1"), false);
    for (let i = 0; i < 30 && progress.phase !== "complete"; i++) {
      progress = await advanceEventSeatLedgerMigration({command, deps});
    }
    assert.equal(progress.phase, "complete");
    assert.equal(progress.occupied, 3);
    assert.equal(h.store.rows.get("events/event1")?.capacityLimit, 10);
    assert.equal(h.store.rows.get("events/event1")?.setupRevision, 2);
    assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.capacity, 10);
    assert.equal(h.store.rows.get("testReceipts/review1")?.appliedRevision, 2);
    const writes = h.store.writes.length;
    await advanceEventSeatLedgerMigration({command, deps});
    assert.equal(h.store.writes.length, writes);
    await assert.rejects(advanceEventSeatLedgerMigration({deps,
      command: {...command, reviewedRequestHash: "b".repeat(64)}}), denied);
  });

test("changed review cannot activate a staged ledger", async () => {
  const h = setup(3);
  const command = {...h.command, reviewedRequestHash: "a".repeat(64)};
  const deps: PagedSeatBootstrapDeps = {...h.deps,
    authorizeTransaction: async () => undefined,
    prepareReviewedEvent: async ({event: source}) => {
      if (source.setupRevision !== 1) {
        throw new HttpsError("aborted", "Review changed");
      }
      return {patch: {capacityLimit: 200, setupRevision: 2}};
    }};
  await advanceEventSeatLedgerMigration({command, deps, pageBudget: 1});
  h.store.rows.set("events/event1", {...event(), setupRevision: 3});
  await assert.rejects(advanceEventSeatLedgerMigration({command, deps}),
    (e) => e instanceof HttpsError && e.code === "aborted");
  assert.equal(h.store.rows.get("events/event1")?.setupRevision, 3);
  assert.equal(h.store.rows.get("eventSeatLedgers/event1")?.state,
    "unreconciled");
});


test("progress verifies the final ready fence", async () => {
  const h = setup();
  await h.bootstrap();
  const changeAt = h.store.transactionCount + 2;
  h.store.beforeTransaction = () => {
    if (h.store.transactionCount === changeAt) {
      const fence = h.store.rows.get("eventSeatMigrationFences/event1")!;
      h.store.rows.set("eventSeatMigrationFences/event1", {
        ...fence, token: "changed_token"});
    }
  };
  await assert.rejects(advanceEventSeatLedgerMigration({
    command: h.command, deps: h.deps}), denied);
});
