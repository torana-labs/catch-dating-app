import assert from "node:assert/strict";
import test from "node:test";
import {applyCheckoutHold, CheckoutHoldCommand,
  prepareCheckoutHold} from "./checkoutSeatHold";
import {
  applySeatCommand,
  SeatLedger,
  SeatReceipt,
  SeatReservation,
  SeatTransaction,
} from "./seatAuthority";
import {CHECKOUT_HOLD_MILLIS} from "../../domain/payments/checkoutHold";
import {prepareSeatBatch} from "./seatBatch";

type Identity = {key: string; revision: number};
const resolveIdentity = async (subject: Identity) => subject;
class Store implements SeatTransaction {
  value: SeatLedger = {eventId: "event-one", capacity: 1, occupied: 0,
    revision: 1, capacityRevision: 1, migrationRevision: 1,
    policyVersion: "v1", policyHash: "a".repeat(64), state: "ready"};
  reservations = new Map<string, SeatReservation>();
  receipts = new Map<string, SeatReceipt>();
  writes = 0;
  async ledger() {
    return this.value;
  }
  async reservation(_event: string, key: string) {
    return this.reservations.get(key) ?? null;
  }
  async receipt(_event: string, id: string) {
    return this.receipts.get(id) ?? null;
  }
  putLedger(value: SeatLedger) {
    this.value = value; this.writes++;
  }
  putReservation(value: SeatReservation) {
    this.reservations.set(value.canonicalKey, value); this.writes++;
  }
  createReceipt(value: SeatReceipt) {
    assert.ok(!this.receipts.has(value.requestId));
    this.receipts.set(value.requestId, value); this.writes++;
  }
  command(overrides: Partial<CheckoutHoldCommand<Identity>> = {}):
    CheckoutHoldCommand<Identity> {
    const subject = overrides.subject ?? {key: "person-one", revision: 1};
    return {eventId: this.value.eventId, subject,
      operation: "checkoutHold", paymentId: "payment-one",
      requestId: "hold-one", expectedLedgerRevision: this.value.revision,
      expectedCapacityRevision: 1, expectedMigrationRevision: 1,
      expectedReservationRevision:
        this.reservations.get(subject.key)?.revision ?? 0,
      nowMillis: 1000, ...overrides};
  }
  async execute(command = this.command()) {
    const plan = await prepareCheckoutHold({tx: this, command,
      resolveIdentity});
    applyCheckoutHold(this, plan);
    return plan;
  }
}

test("checkout holds the final seat without admitting it", async () => {
  const store = new Store();
  const input = store.command();
  const plan = await prepareCheckoutHold({tx: store, command: input,
    resolveIdentity});
  assert.equal(store.writes, 0);
  assert.ok(Object.isFrozen(plan.reservation?.checkoutHold));
  applyCheckoutHold(store, plan);
  assert.equal(store.value.occupied, 0);
  assert.equal(store.value.checkoutHeld, 1);
  assert.equal(store.reservations.get("person-one")?.active, false);
  assert.equal(store.reservations.get("person-one")?.checkoutHold
    ?.expiresAtMillis, 1000 + CHECKOUT_HOLD_MILLIS);
  await assert.rejects(store.execute(store.command({requestId: "hold-two",
    paymentId: "payment-two", subject: {key: "person-two", revision: 1}})),
  /full/u);
  await assert.rejects(applySeatCommand({tx: store,
    command: {...store.command({requestId: "ordinary",
      subject: {key: "person-two", revision: 1}}), operation: "reserve"},
    resolveIdentity}), /full/u);
});

test("a multi-place hold takes, confirms and releases every place at once",
  async () => {
    const store = new Store();
    store.value.capacity = 4;
    const hold = store.command({places: 3});
    await store.execute(hold);
    assert.equal(store.value.checkoutHeld, 3);
    assert.equal(store.value.occupied, 0);
    assert.equal(store.reservations.get("person-one")?.places, 3);
    // Replay neither doubles the hold nor renews it.
    await store.execute({...hold, nowMillis: 5000});
    assert.equal(store.value.checkoutHeld, 3);
    // One place is left: a second party of two cannot fit, one guest can.
    await assert.rejects(store.execute(store.command({requestId: "hold-two",
      paymentId: "payment-two", places: 2,
      subject: {key: "person-two", revision: 1}})), /full/u);
    await store.execute(store.command({requestId: "hold-three",
      paymentId: "payment-three", subject: {key: "person-three",
        revision: 1}}));
    assert.equal(store.value.checkoutHeld, 4);
    // Confirm and release use the recorded count; another count conflicts.
    await assert.rejects(store.execute(store.command({
      operation: "confirmCheckoutHold", requestId: "confirm-wrong",
      places: 2, nowMillis: 2000})), /place count/u);
    await store.execute(store.command({operation: "confirmCheckoutHold",
      requestId: "confirm-one", nowMillis: 2000}));
    assert.equal(store.value.occupied, 3);
    assert.equal(store.value.checkoutHeld, 1);
    assert.equal(store.reservations.get("person-one")?.active, true);
    assert.equal(store.reservations.get("person-one")?.places, 3);
    // Releasing the confirmed booking returns all three places.
    await applySeatCommand({tx: store, command: {...store.command({
      requestId: "cancel-one"}), operation: "release"}, resolveIdentity});
    assert.equal(store.value.occupied, 0);
    assert.equal(store.reservations.get("person-one")?.active, false);
    // A later ordinary booking by the same person is one place again.
    await applySeatCommand({tx: store, command: {...store.command({
      requestId: "rebook-one"}), operation: "reserve"}, resolveIdentity});
    assert.equal(store.value.occupied, 1);
    assert.equal(store.reservations.get("person-one")?.places, undefined);
  });

test("an expired multi-place hold releases every held place", async () => {
  const store = new Store();
  store.value.capacity = 4;
  await store.execute(store.command({places: 4}));
  assert.equal(store.value.checkoutHeld, 4);
  await store.execute(store.command({operation: "releaseCheckoutHold",
    requestId: "release-one", nowMillis: 1000 + CHECKOUT_HOLD_MILLIS}));
  assert.equal(store.value.checkoutHeld, 0);
  assert.equal(store.value.occupied, 0);
});

test("place counts are validated and single-place hashes are unchanged",
  async () => {
    const store = new Store();
    store.value.capacity = 30;
    for (const places of [0, -1, 1.5, 21, NaN, "2"]) {
      await assert.rejects(store.execute(store.command({
        places: places as number})), /Invalid checkout/u);
    }
    assert.equal(store.writes, 0);
    const implicit = await prepareCheckoutHold({tx: store,
      command: store.command(), resolveIdentity});
    const explicit = await prepareCheckoutHold({tx: store,
      command: store.command({places: 1}), resolveIdentity});
    assert.equal(implicit.receipt.requestHash, explicit.receipt.requestHash);
    assert.equal(implicit.reservation?.places, undefined);
    // A ledger that holds fewer places than the reservation fails closed.
    applyCheckoutHold(store, await prepareCheckoutHold({tx: store,
      command: store.command({places: 3, requestId: "hold-three"}),
      resolveIdentity}));
    store.value = {...store.value, checkoutHeld: 2};
    await assert.rejects(store.execute(store.command({
      operation: "releaseCheckoutHold", requestId: "release-short",
      nowMillis: 1000 + CHECKOUT_HOLD_MILLIS})), /malformed/u);
  });

test("concurrent multi-place holds cannot oversell the last places",
  async () => {
    const store = new Store();
    store.value.capacity = 4;
    await store.execute(store.command({places: 2, requestId: "first",
      paymentId: "payment-first", subject: {key: "first", revision: 1}}));
    // Both parties prepare from the same snapshot; only the first applies.
    const plans = await Promise.all(["left", "right"].map((key) =>
      prepareCheckoutHold({tx: store, command: store.command({places: 2,
        requestId: `hold-${key}`, paymentId: `payment-${key}`,
        subject: {key, revision: 1}}), resolveIdentity})));
    applyCheckoutHold(store, plans[0]);
    assert.equal(store.value.checkoutHeld, 4);
    // The losing transaction retries against the new ledger revision.
    await assert.rejects(store.execute(store.command({places: 2,
      requestId: "hold-right", paymentId: "payment-right",
      subject: {key: "right", revision: 1},
      expectedLedgerRevision: plans[1].ledger!.revision - 1})), /changed/u);
    await assert.rejects(store.execute(store.command({places: 2,
      requestId: "hold-right-retry", paymentId: "payment-right",
      subject: {key: "right", revision: 1}})), /full/u);
    assert.equal(store.value.occupied + store.value.checkoutHeld!, 4);
  });

test("batch release returns every place of a multi-place booking",
  async () => {
    const store = new Store();
    store.value.capacity = 5;
    await store.execute(store.command({places: 3}));
    await store.execute(store.command({operation: "confirmCheckoutHold",
      requestId: "confirm-one", nowMillis: 2000}));
    const plan = await prepareSeatBatch({tx: store, command: {
      ...store.command(), batchId: "batch-release", operations: [
        {subject: {key: "person-one", revision: 1}, operation: "release",
          requestId: "release-one", expectedReservationRevision: 2},
        {subject: {key: "person-two", revision: 1}, operation: "reserve",
          requestId: "reserve-two", expectedReservationRevision: 0}]},
    resolveIdentity});
    assert.equal(plan.result.occupied, 1);
    assert.equal(plan.reservations[0].places, 3);
    assert.equal(plan.reservations[1].places, undefined);
  });

test("confirm converts only the owning hold once and never extends expiry",
  async () => {
    const store = new Store();
    const original = store.command();
    await store.execute(original);
    await store.execute({...original, nowMillis: 5000});
    assert.equal(store.value.checkoutHeld, 1);
    assert.equal(store.reservations.get("person-one")?.checkoutHold
      ?.expiresAtMillis, 1000 + CHECKOUT_HOLD_MILLIS);
    await assert.rejects(store.execute(store.command({
      operation: "confirmCheckoutHold", requestId: "wrong-payment",
      paymentId: "payment-other"})), /does not own/u);
    const confirm = store.command({operation: "confirmCheckoutHold",
      requestId: "confirm-one", nowMillis: 2000});
    await store.execute(confirm);
    await store.execute(confirm);
    assert.equal(store.value.occupied, 1);
    assert.equal(store.value.checkoutHeld, 0);
    assert.equal(store.reservations.get("person-one")?.active, true);
    assert.equal(store.reservations.get("person-one")?.checkoutHold, undefined);
    assert.equal(store.writes, 6);
  });

test("at expiry capture cannot admit; release and replay never resurrect hold",
  async () => {
    const store = new Store();
    const original = store.command();
    await store.execute(original);
    const expired = 1000 + CHECKOUT_HOLD_MILLIS;
    await assert.rejects(store.execute(store.command({
      operation: "confirmCheckoutHold", requestId: "late-capture",
      nowMillis: expired})), /expired/u);
    const release = store.command({operation: "releaseCheckoutHold",
      requestId: "release-one", nowMillis: expired});
    await store.execute(release);
    await store.execute({...release, nowMillis: expired + 100});
    await store.execute({...original, nowMillis: expired + 100});
    assert.equal(store.value.checkoutHeld, 0);
    assert.equal(store.value.occupied, 0);
    assert.equal(store.reservations.get("person-one")?.checkoutHold, undefined);
    const second = store.command({requestId: "hold-two",
      paymentId: "payment-two", nowMillis: expired + 100});
    await store.execute(second);
    await store.execute(release);
    assert.equal(store.value.checkoutHeld, 1);
    assert.equal(store.reservations.get("person-one")?.checkoutHold
      ?.paymentId, "payment-two");
  });

test("ordinary reserve/release and batch transfer cannot overwrite a hold",
  async () => {
    const store = new Store();
    store.value.capacity = 2;
    await store.execute();
    for (const operation of ["reserve", "release"] as const) {
      await assert.rejects(applySeatCommand({tx: store,
        command: {...store.command({requestId: operation}), operation},
        resolveIdentity}), /checkout in progress/u);
      await assert.rejects(prepareSeatBatch({tx: store, command: {
        ...store.command(), batchId: "batch-one", operations: [{
          subject: {key: "person-one", revision: 1}, operation,
          requestId: operation, expectedReservationRevision: 1}]},
      resolveIdentity}), /checkout in progress/u);
    }
    assert.equal(store.writes, 3);
  });

test("hold revisions, identity, receipt, counts and plan ownership fail closed",
  async () => {
    const store = new Store();
    const original = store.command();
    await store.execute();
    await assert.rejects(store.execute({...original, requestId: "stale"}),
      /changed/u);
    await assert.rejects(store.execute({...original, paymentId: "changed"}),
      /reused/u);
    await assert.rejects(store.execute(store.command({
      operation: "confirmCheckoutHold", requestId: "confirm",
      subject: {key: "person-one", revision: 2}})), /changed/u);
    for (const held of [-1, 0, 0.5, 2, NaN, null]) {
      store.value = {...store.value, checkoutHeld: held as number};
      await assert.rejects(store.execute(store.command()),
        /inventory|malformed/u);
    }
    const other = new Store();
    const plan = await prepareCheckoutHold({tx: other,
      command: other.command(), resolveIdentity});
    assert.throws(() => applyCheckoutHold(store, plan), /transaction/u);
    applyCheckoutHold(other, plan);
    assert.throws(() => applyCheckoutHold(other, plan), /transaction/u);
  });

test("batch capacity includes holds owned by identities outside the batch",
  async () => {
    const store = new Store();
    await store.execute();
    await assert.rejects(prepareSeatBatch({tx: store, command: {
      ...store.command(), batchId: "batch-two", operations: [{
        subject: {key: "person-two", revision: 1}, operation: "reserve",
        requestId: "reserve-two", expectedReservationRevision: 0}]},
    resolveIdentity}), /insufficient seats/u);
    assert.equal(store.writes, 3);
  });


test("missing payment identity cannot create a hold", async () => {
  const store = new Store();
  for (const paymentId of [undefined, null, 42, "", "has/slash"]) {
    await assert.rejects(store.execute(store.command({
      paymentId: paymentId as string})), /Invalid checkout/u);
  }
  assert.equal(store.writes, 0);
});
