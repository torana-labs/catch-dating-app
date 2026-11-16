import {createHash} from "crypto";
import {
  assertReadySeatState, heldSeatCount, CanonicalSeatIdentity,
  reservationPlaces, SeatAuthorityError, SeatLedger, SeatOperation,
  SeatReceipt, SeatReservation, SeatTransaction,
} from "./seatAuthority";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const digest = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
function fail(code: SeatAuthorityError["code"], message: string): never {
  throw new SeatAuthorityError(code, message);
}

export interface SeatBatchCommand<Subject> {
  eventId: string;
  batchId: string;
  expectedLedgerRevision: number;
  expectedCapacityRevision: number;
  expectedMigrationRevision: number;
  nowMillis: number;
  operations: readonly {
    subject: Subject;
    operation: SeatOperation;
    requestId: string;
    expectedReservationRevision: number;
  }[];
}

export interface SeatBatchResult {
  receipts: readonly SeatReceipt[];
  occupied: number;
  replayed: boolean;
}

const brand = Symbol("prepared-seat-batch");
const applied = new WeakSet<PreparedSeatBatch>();
export interface PreparedSeatBatch {
  readonly [brand]: true;
  readonly transaction: SeatTransaction;
  readonly ledger: Readonly<SeatLedger> | null;
  readonly reservations: readonly Readonly<SeatReservation>[];
  readonly receipts: readonly Readonly<SeatReceipt>[];
  readonly result: Readonly<SeatBatchResult>;
}

/**
 * Prepares a release/reserve transfer from one ledger snapshot. All identity,
 * reservation and receipt reads finish before the caller may apply the plan.
 * The caller still owns actor, admission and payment checks in this same tx.
 */
export async function prepareSeatBatch<Subject>(params: {
  tx: SeatTransaction;
  command: SeatBatchCommand<Subject>;
  resolveIdentity: (subject: Subject) => Promise<CanonicalSeatIdentity>;
  validateLedger?: (ledger: SeatLedger) => void;
}): Promise<PreparedSeatBatch> {
  const {tx, command} = params;
  if (!ID.test(command.eventId) || !ID.test(command.batchId) ||
      !safe(command.expectedLedgerRevision) ||
      !safe(command.expectedCapacityRevision) ||
      !safe(command.expectedMigrationRevision) || !safe(command.nowMillis) ||
      !Array.isArray(command.operations) || command.operations.length < 1 ||
      command.operations.length > 100) {
    fail("invalid", "Invalid seat batch scope or revision.");
  }
  const requestIds = new Set<string>();
  for (const operation of command.operations) {
    if (!ID.test(operation.requestId) ||
        requestIds.has(operation.requestId) ||
        !["reserve", "release"].includes(operation.operation) ||
        !safe(operation.expectedReservationRevision)) {
      fail("invalid", "Invalid or duplicate seat batch operation.");
    }
    requestIds.add(operation.requestId);
  }
  const identities = await Promise.all(command.operations.map((operation) =>
    params.resolveIdentity(operation.subject)));
  const keys = new Set<string>();
  for (const identity of identities) {
    if (!identity || !ID.test(identity.key) || !safe(identity.revision) ||
        keys.has(identity.key)) {
      fail("conflict", "Duplicate or unresolved canonical seat identity.");
    }
    keys.add(identity.key);
  }
  const ledger = await tx.ledger(command.eventId);
  if (!ledger || ledger.eventId !== command.eventId ||
      ledger.state !== "ready" || !safe(ledger.capacity) ||
      ledger.capacity < 1 || !safe(ledger.occupied) ||
      ledger.occupied > ledger.capacity || !safe(ledger.revision) ||
      ledger.revision === Number.MAX_SAFE_INTEGER ||
      !safe(ledger.capacityRevision) || ledger.capacityRevision < 1 ||
      !safe(ledger.migrationRevision) || ledger.migrationRevision < 1 ||
      !["legacy", "v1", "v2"].includes(ledger.policyVersion) ||
      !/^[a-f0-9]{64}$/u.test(ledger.policyHash)) {
    fail("unavailable", "Seat authority is not reconciled and ready.");
  }
  heldSeatCount(ledger);
  params.validateLedger?.(ledger);
  const rows = await Promise.all(command.operations.map(async (operation,
    index) => ({
    reservation: await tx.reservation(command.eventId, identities[index].key),
    receipt: await tx.receipt(command.eventId, operation.requestId),
  })));
  const batchHash = digest(["seat-batch-v1", command.eventId,
    command.batchId, command.expectedLedgerRevision,
    command.expectedCapacityRevision, command.expectedMigrationRevision,
    command.operations.map((operation, index) => [operation.requestId,
      operation.operation, operation.expectedReservationRevision,
      identities[index].key, identities[index].revision])]);
  let replayCount = 0;
  let delta = 0;
  let releaseCount = 0;
  const nextReservations: SeatReservation[] = [];
  const nextReceipts: SeatReceipt[] = [];
  for (let i = 0; i < command.operations.length; i++) {
    const operation = command.operations[i];
    const identity = identities[i];
    const {reservation, receipt} = rows[i];
    assertReadySeatState(command.eventId, identity, ledger, reservation);
    const requestHash = digest([batchHash, operation.requestId]);
    if (receipt) {
      if (receipt.eventId !== command.eventId ||
          receipt.requestId !== operation.requestId ||
          receipt.requestHash !== requestHash ||
          receipt.operation !== operation.operation ||
          receipt.canonicalKey !== identity.key) {
        fail("conflict", "Seat request ID was reused for different work.");
      }
      if (!safe(receipt.appliedLedgerRevision) ||
          receipt.appliedLedgerRevision < 1 ||
          !safe(receipt.appliedReservationRevision) ||
          receipt.appliedReservationRevision < 1) {
        fail("unavailable", "Seat receipt is malformed.");
      }
      replayCount++;
      nextReceipts.push({...receipt});
      continue;
    }
    if ((reservation?.revision ?? 0) !==
        operation.expectedReservationRevision ||
        reservation && reservation.identityRevision !== identity.revision) {
      fail("conflict", "Seat reservation or identity changed.");
    }
    if (reservation?.checkoutHold || reservation?.temporaryHold) {
      fail("conflict", "This identity has a checkout in progress.");
    }
    if (operation.operation === "release" && !reservation?.active) {
      fail("conflict", "There is no active seat to release.");
    }
    if (operation.operation === "reserve" && reservation?.active) {
      fail("conflict", "This identity already has a confirmed seat.");
    }
    const active = operation.operation === "reserve";
    // A release returns every place a multi-place booking held.
    const places = active ? 1 : reservationPlaces(reservation);
    delta += active ? 1 : -places;
    if (!active) releaseCount += places;
    const next: SeatReservation = {eventId: command.eventId,
      canonicalKey: identity.key, identityRevision: identity.revision,
      active, revision: (reservation?.revision ?? 0) + 1,
      reservedAtMillis: active ? command.nowMillis :
        reservation!.reservedAtMillis,
      releasedAtMillis: active ? null : command.nowMillis,
      ...(places > 1 ? {places} : {})};
    nextReservations.push(next);
    nextReceipts.push({eventId: command.eventId,
      requestId: operation.requestId, requestHash,
      operation: operation.operation, canonicalKey: identity.key,
      appliedLedgerRevision: ledger.revision + 1,
      appliedReservationRevision: next.revision});
  }
  if (replayCount !== 0 && replayCount !== command.operations.length) {
    fail("conflict", "A seat batch was only partly recorded.");
  }
  if (replayCount === 0 && (ledger.revision !==
      command.expectedLedgerRevision || ledger.capacityRevision !==
      command.expectedCapacityRevision || ledger.migrationRevision !==
      command.expectedMigrationRevision)) {
    fail("conflict", "Seat capacity or migration changed; review again.");
  }
  if (replayCount === 0 && (ledger.occupied + delta < 0 ||
      ledger.occupied + heldSeatCount(ledger) + delta > ledger.capacity ||
      releaseCount > ledger.occupied)) {
    fail("conflict", "This event has insufficient seats.");
  }
  const replayed = replayCount === command.operations.length;
  const result = Object.freeze({receipts: Object.freeze(nextReceipts.map(
    (receipt) => Object.freeze(receipt))),
  occupied: replayed ? ledger.occupied : ledger.occupied + delta, replayed});
  return Object.freeze({[brand]: true as const, transaction: tx,
    ledger: replayed ? null : Object.freeze({...ledger,
      occupied: result.occupied, revision: ledger.revision + 1}),
    reservations: Object.freeze(nextReservations.map((row) =>
      Object.freeze(row))), receipts: result.receipts, result});
}

/** Stages the complete batch only after all caller authority reads pass. */
export function applySeatBatch(tx: SeatTransaction,
  plan: PreparedSeatBatch): SeatBatchResult {
  if (plan[brand] !== true || !Object.isFrozen(plan) ||
      plan.transaction !== tx || applied.has(plan)) {
    fail("invalid", "Seat batch was not prepared in this transaction.");
  }
  applied.add(plan);
  if (plan.ledger) {
    tx.putLedger(plan.ledger as SeatLedger);
    for (const reservation of plan.reservations) {
      tx.putReservation(reservation as SeatReservation);
    }
    for (const receipt of plan.receipts) {
      tx.createReceipt(receipt as SeatReceipt);
    }
  }
  return plan.result;
}
