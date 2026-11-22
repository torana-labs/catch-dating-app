import {createHash} from "crypto";
import {CHECKOUT_HOLD_MILLIS} from "../../domain/payments/checkoutHold";

/** Private server-owned records. No endpoint or path is registered here. */
export interface SeatLedger {
  eventId: string;
  capacity: number;
  occupied: number;
  /** Missing means zero. Never include held seats in bookedCount. */
  checkoutHeld?: number;
  /** Policy-expiring holds, distinct from payment attempts. */
  temporaryHeld?: number;
  revision: number;
  capacityRevision: number;
  policyVersion: "legacy" | "v1" | "v2";
  policyHash: string;
  migrationRevision: number;
  state: "ready" | "unreconciled" | "revoked";
}

export interface SeatReservation {
  eventId: string;
  canonicalKey: string;
  identityRevision: number;
  active: boolean;
  revision: number;
  reservedAtMillis: number;
  releasedAtMillis: number | null;
  /** Places this one booking holds (multi-place checkout). Missing means 1.
   * Ledger counts are places, so release returns every place at once. */
  places?: number;
  checkoutHold?: {paymentId: string; expiresAtMillis: number};
  temporaryHold?: {ownerKind: "crossPathsPair"; ownerId: string;
    expiresAtMillis: number};
}

export interface SeatReceipt {
  eventId: string;
  requestId: string;
  requestHash: string;
  operation: "reserve" | "release" | "checkoutHold" |
    "confirmCheckoutHold" | "releaseCheckoutHold" | "temporaryHold" |
    "confirmTemporaryHold" | "releaseTemporaryHold";
  canonicalKey: string;
  appliedLedgerRevision: number;
  appliedReservationRevision: number;
}

/** Resolver must prove all known phone/UID/import aliases in the SAME tx. */
export interface CanonicalSeatIdentity {
  key: string;
  revision: number;
}

/** Use one real Firestore transaction, never pre-read/batch writes. */
export interface SeatTransaction {
  ledger(eventId: string): Promise<SeatLedger | null>;
  reservation(eventId: string, canonicalKey: string):
    Promise<SeatReservation | null>;
  receipt(eventId: string, requestId: string): Promise<SeatReceipt | null>;
  putLedger(value: SeatLedger): void;
  putReservation(value: SeatReservation): void;
  createReceipt(value: SeatReceipt): void;
}

export type SeatOperation = "reserve" | "release";
export interface SeatCommand<Subject> {
  eventId: string;
  subject: Subject;
  operation: SeatOperation;
  requestId: string;
  expectedLedgerRevision: number;
  expectedCapacityRevision: number;
  expectedMigrationRevision: number;
  expectedReservationRevision: number;
  nowMillis: number;
}

export interface SeatResult {
  receipt: SeatReceipt;
  active: boolean;
  replayed: boolean;
}

const planBrand = Symbol("prepared-seat-plan");
const appliedPlans = new WeakSet<PreparedSeatPlan>();
export interface PreparedSeatPlan {
  readonly [planBrand]: true;
  readonly transaction: SeatTransaction;
  readonly result: Readonly<SeatResult>;
  readonly ledger: Readonly<SeatLedger> | null;
  readonly reservation: Readonly<SeatReservation> | null;
  readonly receipt: Readonly<SeatReceipt> | null;
}

export class SeatAuthorityError extends Error {
  constructor(readonly code: "invalid" | "conflict" | "unavailable",
    message: string) {
    super(message);
  }
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
function validId(value: unknown): value is string {
  return typeof value === "string" && idPattern.test(value);
}
function nonnegative(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function fail(code: SeatAuthorityError["code"], message: string): never {
  throw new SeatAuthorityError(code, message);
}
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Matches the attendee row's partySize ceiling; callers set tighter limits. */
export const MAX_RESERVATION_PLACES = 20;

/** Places a reservation holds; a reservation without `places` holds one. */
export function reservationPlaces(
  reservation: Pick<SeatReservation, "places"> | null | undefined): number {
  const places = reservation?.places;
  if (places === undefined) return 1;
  if (!Number.isSafeInteger(places) || places < 1 ||
      places > MAX_RESERVATION_PLACES) {
    fail("unavailable", "Seat reservation place count is malformed.");
  }
  return places;
}

/** Expired holds still consume capacity until atomically released. */
export function heldSeatCount(ledger: SeatLedger): number {
  const checkout = ledger.checkoutHeld === undefined ? 0 : ledger.checkoutHeld;
  const temporary = ledger.temporaryHeld === undefined ? 0 :
    ledger.temporaryHeld;
  const held = checkout + temporary;
  if (!nonnegative(checkout) || !nonnegative(temporary) ||
      !nonnegative(held) || !nonnegative(ledger.occupied) ||
      !Number.isSafeInteger(ledger.occupied + held) ||
      ledger.occupied + held > ledger.capacity) {
    fail("unavailable", "Held seat inventory needs reconciliation.");
  }
  return held;
}

/** Payment-specific count, validated against all shared seat inventory. */
export function checkoutHeldCount(ledger: SeatLedger): number {
  heldSeatCount(ledger);
  return ledger.checkoutHeld ?? 0;
}

/** Validate existing authority without creating a reservation or receipt.
 * Identity revision equality remains a caller decision for historical replay.
 */
export function assertReadySeatState(eventId: string,
  identity: CanonicalSeatIdentity, ledger: SeatLedger | null,
  reservation: SeatReservation | null): asserts ledger is SeatLedger {
  if (!validId(eventId) || !validId(identity.key) ||
      !nonnegative(identity.revision)) {
    fail("invalid", "A current canonical identity is required.");
  }
  if (!ledger || ledger.eventId !== eventId ||
      ledger.state !== "ready" || !Number.isSafeInteger(ledger.capacity) ||
      ledger.capacity < 1 || !nonnegative(ledger.occupied) ||
      ledger.occupied > ledger.capacity || !nonnegative(ledger.revision) ||
      ledger.revision === Number.MAX_SAFE_INTEGER ||
      !nonnegative(ledger.capacityRevision) ||
      ledger.capacityRevision === 0 ||
      !["legacy", "v1", "v2"].includes(ledger.policyVersion) ||
      typeof ledger.policyHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(ledger.policyHash) ||
      !nonnegative(ledger.migrationRevision) ||
      ledger.migrationRevision === 0) {
    fail("unavailable", "Seat authority is not reconciled and ready.");
  }
  const held = checkoutHeldCount(ledger);
  const hold = reservation?.checkoutHold;
  const temporary = reservation?.temporaryHold;
  const places = reservationPlaces(reservation);
  if (hold !== undefined && (!hold || typeof hold !== "object" ||
      !validId(hold.paymentId) || !nonnegative(hold.expiresAtMillis) ||
      hold.expiresAtMillis !== reservation!.reservedAtMillis +
        CHECKOUT_HOLD_MILLIS || reservation!.active ||
      reservation!.releasedAtMillis !== null || held < places)) {
    fail("unavailable", "Checkout seat hold is malformed.");
  }
  if (temporary !== undefined && (!temporary ||
      typeof temporary !== "object" || hold !== undefined ||
      temporary.ownerKind !== "crossPathsPair" ||
      !validId(temporary.ownerId) ||
      !nonnegative(temporary.expiresAtMillis) ||
      temporary.expiresAtMillis <= reservation!.reservedAtMillis ||
      temporary.expiresAtMillis - reservation!.reservedAtMillis >
        30 * 60 * 1000 || reservation!.active ||
      reservation!.releasedAtMillis !== null || places !== 1 ||
      (ledger.temporaryHeld ?? 0) < 1)) {
    fail("unavailable", "Temporary seat hold is malformed.");
  }
  if (reservation && (reservation.eventId !== eventId ||
      reservation.canonicalKey !== identity.key ||
      !nonnegative(reservation.revision) ||
      reservation.revision < 1 ||
      reservation.revision === Number.MAX_SAFE_INTEGER ||
      !nonnegative(reservation.identityRevision) ||
      !nonnegative(reservation.reservedAtMillis) ||
      !(reservation.releasedAtMillis === null ||
        nonnegative(reservation.releasedAtMillis)) ||
      reservation.active && reservation.releasedAtMillis !== null ||
      !reservation.active && !hold && !temporary &&
        reservation.releasedAtMillis === null ||
      typeof reservation.active !== "boolean")) {
    fail("unavailable", "Seat reservation is malformed.");
  }
  if (reservation?.active && ledger.occupied < places) {
    fail("unavailable", "Active seat conflicts with zero occupancy.");
  }
}

/**
 * Read-only preparation. Caller owns actor, event, admission and payment
 * authorization in the same transaction before applying the returned plan.
 * Identity resolution may read more documents but must not write. The adapter
 * must map each ledger/reservation/receipt key to a deterministic document.
 */
export async function prepareSeatCommand<Subject>(params: {
  tx: SeatTransaction;
  command: SeatCommand<Subject>;
  resolveIdentity: (subject: Subject) => Promise<CanonicalSeatIdentity>;
}): Promise<PreparedSeatPlan> {
  const {tx, command} = params;
  if (!validId(command.eventId) || !validId(command.requestId) ||
      !["reserve", "release"].includes(command.operation) ||
      !nonnegative(command.expectedLedgerRevision) ||
      !nonnegative(command.expectedCapacityRevision) ||
      !nonnegative(command.expectedMigrationRevision) ||
      !nonnegative(command.expectedReservationRevision) ||
      !nonnegative(command.nowMillis)) {
    fail("invalid", "Invalid seat command or revision.");
  }
  const identity = await params.resolveIdentity(command.subject);
  if (!validId(identity.key) || !nonnegative(identity.revision)) {
    fail("invalid", "A current canonical identity is required.");
  }
  const [ledger, reservation, prior] = await Promise.all([
    tx.ledger(command.eventId),
    tx.reservation(command.eventId, identity.key),
    tx.receipt(command.eventId, command.requestId),
  ]);
  assertReadySeatState(command.eventId, identity, ledger, reservation);
  const requestHash = hash([command.eventId, command.operation,
    command.requestId, identity.key, identity.revision,
    command.expectedLedgerRevision, command.expectedCapacityRevision,
    command.expectedMigrationRevision,
    command.expectedReservationRevision]);
  if (prior) {
    if (!Number.isSafeInteger(prior.appliedLedgerRevision) ||
        prior.appliedLedgerRevision < 1 ||
        !Number.isSafeInteger(prior.appliedReservationRevision) ||
        prior.appliedReservationRevision < 1) {
      fail("unavailable", "Seat receipt is malformed.");
    }
    if (prior.eventId !== command.eventId ||
        prior.requestId !== command.requestId ||
        prior.requestHash !== requestHash ||
        prior.operation !== command.operation ||
        prior.canonicalKey !== identity.key) {
      fail("conflict", "Seat request ID was reused for different work.");
    }
    // A released reserve replays historically; it never reactivates.
    return freezePlan(tx, {receipt: prior,
      active: reservation?.active === true, replayed: true},
    null, null, null);
  }
  if (ledger.revision !== command.expectedLedgerRevision ||
      ledger.capacityRevision !== command.expectedCapacityRevision ||
      ledger.migrationRevision !== command.expectedMigrationRevision ||
      (reservation?.revision ?? 0) !==
        command.expectedReservationRevision) {
    fail("conflict", "Seat capacity or reservation changed; review again.");
  }
  if (reservation && reservation.identityRevision !== identity.revision) {
    fail("conflict", "Canonical identity changed; reconcile it first.");
  }
  if (reservation?.checkoutHold || reservation?.temporaryHold) {
    fail("conflict", "This identity has a checkout in progress.");
  }
  if (command.operation === "reserve" && reservation?.active) {
    fail("conflict", "This identity already has a confirmed seat.");
  }
  if (command.operation === "release" && !reservation?.active) {
    fail("conflict", "There is no active seat to release.");
  }
  if (command.operation === "reserve" &&
      ledger.occupied + heldSeatCount(ledger) >= ledger.capacity) {
    fail("conflict", "This event is full.");
  }
  const active = command.operation === "reserve";
  // An ordinary reserve is one place. A release returns every place the
  // booking held and keeps the count on the inactive record as history.
  const released = active ? 1 : reservationPlaces(reservation);
  const nextReservation: SeatReservation = {
    eventId: command.eventId, canonicalKey: identity.key,
    identityRevision: identity.revision, active,
    revision: (reservation?.revision ?? 0) + 1,
    reservedAtMillis: active ? command.nowMillis :
      reservation!.reservedAtMillis,
    releasedAtMillis: active ? null : command.nowMillis,
    ...(released > 1 ? {places: released} : {}),
  };
  const nextLedger: SeatLedger = {...ledger,
    occupied: ledger.occupied + (active ? 1 : -released),
    revision: ledger.revision + 1};
  const receipt: SeatReceipt = {eventId: command.eventId,
    requestId: command.requestId, requestHash,
    operation: command.operation, canonicalKey: identity.key,
    appliedLedgerRevision: nextLedger.revision,
    appliedReservationRevision: nextReservation.revision};
  return freezePlan(tx, {receipt, active, replayed: false}, nextLedger,
    nextReservation, receipt);
}

function freezePlan(transaction: SeatTransaction, result: SeatResult,
  ledger: SeatLedger | null,
  reservation: SeatReservation | null,
  receipt: SeatReceipt | null): PreparedSeatPlan {
  const frozenReceipt = Object.freeze({...result.receipt});
  return Object.freeze({[planBrand]: true as const, transaction,
    result: Object.freeze({...result, receipt: frozenReceipt}),
    ledger: ledger ? Object.freeze({...ledger}) : null,
    reservation: reservation ? Object.freeze({...reservation}) : null,
    receipt: receipt ? frozenReceipt : null});
}

/** Apply only after all other reads and business checks in the same tx. */
export function applySeatPlan(tx: SeatTransaction,
  plan: PreparedSeatPlan): SeatResult {
  if (plan[planBrand] !== true || !Object.isFrozen(plan) ||
      plan.transaction !== tx || appliedPlans.has(plan)) {
    fail("invalid", "Seat plan was not prepared in this transaction.");
  }
  appliedPlans.add(plan);
  if (plan.ledger && plan.reservation && plan.receipt) {
    tx.putLedger(plan.ledger as SeatLedger);
    tx.putReservation(plan.reservation as SeatReservation);
    tx.createReceipt(plan.receipt as SeatReceipt);
  }
  return plan.result as SeatResult;
}

/** Convenience for callers that finished every authority read already. */
export async function applySeatCommand<Subject>(params: {
  tx: SeatTransaction;
  command: SeatCommand<Subject>;
  resolveIdentity: (subject: Subject) => Promise<CanonicalSeatIdentity>;
}): Promise<SeatResult> {
  return applySeatPlan(params.tx, await prepareSeatCommand(params));
}
