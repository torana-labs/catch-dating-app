import {createHash} from "crypto";
import {
  assertReadySeatState,
  CanonicalSeatIdentity,
  checkoutHeldCount,
  heldSeatCount,
  MAX_RESERVATION_PLACES,
  reservationPlaces,
  SeatAuthorityError,
  SeatCommand,
  SeatLedger,
  SeatReceipt,
  SeatReservation,
  SeatTransaction,
  fitsSeatCapacity,
} from "./seatAuthority";
import {CHECKOUT_HOLD_MILLIS} from "../../domain/payments/checkoutHold";

export type CheckoutHoldOperation = "checkoutHold" |
  "confirmCheckoutHold" | "releaseCheckoutHold";
export interface CheckoutHoldCommand<Subject> extends
  Omit<SeatCommand<Subject>, "operation"> {
  operation: CheckoutHoldOperation;
  /** Server-created immutable payment attempt ID, never a provider order ID. */
  paymentId: string;
  /** Places one payment attempt holds; missing means 1. Confirm and release
   * always use the count the hold recorded; a different value conflicts. */
  places?: number;
}

export type TemporaryHoldOperation = "temporaryHold" |
  "confirmTemporaryHold" | "releaseTemporaryHold";
export interface TemporaryHoldCommand<Subject> extends
  Omit<SeatCommand<Subject>, "operation"> {
  operation: TemporaryHoldOperation;
  ownerKind: "crossPathsPair";
  ownerId: string;
  /** Server-computed policy deadline, also pinned on confirm/release. */
  expiresAtMillis: number;
}
type HoldCommand<Subject> = CheckoutHoldCommand<Subject> |
  TemporaryHoldCommand<Subject>;

const brand = Symbol("prepared-seat-hold");
const applied = new WeakSet<PreparedSeatHold>();
export interface PreparedSeatHold {
  readonly [brand]: true;
  readonly transaction: SeatTransaction;
  readonly ledger: Readonly<SeatLedger> | null;
  readonly reservation: Readonly<SeatReservation> | null;
  readonly receipt: Readonly<SeatReceipt>;
  readonly replayed: boolean;
}
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
const validId = (value: unknown): value is string =>
  typeof value === "string" && ID.test(value);
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
function fail(code: SeatAuthorityError["code"], message: string): never {
  throw new SeatAuthorityError(code, message);
}

/**
 * Read-only plan. The caller must read and authorize the immutable payment,
 * or pair owner, event policy and recipient in this SAME transaction.
 * Confirmation requires free-entry authority or verified captured payment.
 * The caller must atomically write
 * admission/roster/ownership with this plan. Expiry never implies payment
 * cancellation: late captures must be reconciled/refunded by the caller.
 */
export async function prepareSeatHold<Subject>(params: {
  tx: SeatTransaction;
  command: HoldCommand<Subject>;
  resolveIdentity: (subject: Subject) => Promise<CanonicalSeatIdentity>;
}): Promise<PreparedSeatHold> {
  const {tx, command} = params;
  const temporary = "ownerKind" in command;
  const ownerId = temporary ? command.ownerId : command.paymentId;
  const starting = command.operation === "checkoutHold" ||
    command.operation === "temporaryHold";
  const confirming = command.operation === "confirmCheckoutHold" ||
    command.operation === "confirmTemporaryHold";
  const requestedPlaces = temporary ? undefined : command.places;
  if (!validId(command.eventId) || !validId(command.requestId) ||
      temporary && "places" in command ||
      requestedPlaces !== undefined &&
        (!Number.isSafeInteger(requestedPlaces) || requestedPlaces < 1 ||
          requestedPlaces > MAX_RESERVATION_PLACES) ||
      !validId(ownerId) ||
      temporary && (command.ownerKind !== "crossPathsPair" ||
        !safe(command.expiresAtMillis)) ||
      !(temporary ? ["temporaryHold", "confirmTemporaryHold",
        "releaseTemporaryHold"] : ["checkoutHold", "confirmCheckoutHold",
        "releaseCheckoutHold"]).includes(command.operation) ||
      !safe(command.expectedLedgerRevision) ||
      !safe(command.expectedCapacityRevision) ||
      !safe(command.expectedMigrationRevision) ||
      !safe(command.expectedReservationRevision) ||
      !safe(command.nowMillis) ||
      !safe(command.nowMillis + CHECKOUT_HOLD_MILLIS)) {
    fail("invalid", "Invalid checkout hold command.");
  }
  const identity = await params.resolveIdentity(command.subject);
  if (!identity || !validId(identity.key) || !safe(identity.revision)) {
    fail("invalid", "A current canonical identity is required.");
  }
  const [ledger, reservation, prior] = await Promise.all([
    tx.ledger(command.eventId),
    tx.reservation(command.eventId, identity.key),
    tx.receipt(command.eventId, command.requestId),
  ]);
  assertReadySeatState(command.eventId, identity, ledger, reservation);
  const requestHash = createHash("sha256").update(JSON.stringify([
    temporary ? "temporary-hold-v1" : "checkout-hold-v1",
    command.eventId, command.requestId,
    command.operation, ownerId, identity.key, identity.revision,
    command.expectedLedgerRevision, command.expectedCapacityRevision,
    command.expectedMigrationRevision, command.expectedReservationRevision,
    ...(temporary ? [command.ownerKind, command.expiresAtMillis] : []),
    // Single-place requests keep their original hash, so receipts written
    // before multi-place holds still replay.
    ...(requestedPlaces !== undefined && requestedPlaces !== 1 ?
      ["places", requestedPlaces] : []),
  ])).digest("hex");
  if (prior) {
    if (!safe(prior.appliedLedgerRevision) ||
        prior.appliedLedgerRevision < 1 ||
        !safe(prior.appliedReservationRevision) ||
        prior.appliedReservationRevision < 1) {
      fail("unavailable", "Checkout hold receipt is malformed.");
    }
    if (prior.eventId !== command.eventId ||
        prior.requestId !== command.requestId ||
        prior.requestHash !== requestHash ||
        prior.operation !== command.operation ||
        prior.canonicalKey !== identity.key) {
      fail("conflict", "Checkout request ID was reused for different work.");
    }
    // Historical replay never renews a hold or re-admits a released seat.
    return freeze(tx, null, null, prior, true);
  }
  if (ledger.revision !== command.expectedLedgerRevision ||
      ledger.capacityRevision !== command.expectedCapacityRevision ||
      ledger.migrationRevision !== command.expectedMigrationRevision ||
      (reservation?.revision ?? 0) !== command.expectedReservationRevision ||
      reservation && reservation.identityRevision !== identity.revision) {
    fail("conflict", "Checkout inventory or identity changed.");
  }
  const held = temporary ? ledger.temporaryHeld ?? 0 :
    checkoutHeldCount(ledger);
  const places = starting ? requestedPlaces ?? 1 :
    reservationPlaces(reservation);
  if (!starting && requestedPlaces !== undefined &&
      requestedPlaces !== places) {
    fail("conflict", "Checkout hold place count changed.");
  }
  if (starting) {
    if (temporary && (command.expiresAtMillis <= command.nowMillis ||
        command.expiresAtMillis - command.nowMillis > 30 * 60 * 1000)) {
      fail("invalid", "Invalid temporary hold deadline.");
    }
    if (reservation?.active || reservation?.checkoutHold ||
        reservation?.temporaryHold) {
      fail("conflict", "This identity already has a seat or checkout hold.");
    }
    if (!fitsSeatCapacity(ledger.capacity,
      ledger.occupied + heldSeatCount(ledger) + places)) {
      fail("conflict", "This event is full.");
    }
  } else {
    const owns = temporary ? reservation?.temporaryHold?.ownerKind ===
      command.ownerKind && reservation.temporaryHold.ownerId === ownerId &&
      reservation.temporaryHold.expiresAtMillis === command.expiresAtMillis :
      reservation?.checkoutHold?.paymentId === ownerId;
    if (!reservation || !owns) {
      fail("conflict", "This owner does not own the seat hold.");
    }
    if (command.nowMillis < reservation.reservedAtMillis) {
      fail("invalid", "Checkout reconciliation predates its hold.");
    }
    const expires = temporary ? reservation.temporaryHold!.expiresAtMillis :
      reservation.checkoutHold!.expiresAtMillis;
    if (confirming && command.nowMillis >= expires) {
      fail("conflict", "Checkout hold expired; reconcile the payment.");
    }
  }
  if (!starting && held < places) {
    fail("unavailable", "Held seat inventory needs reconciliation.");
  }
  const nextLedger = {...ledger,
    [temporary ? "temporaryHeld" : "checkoutHeld"]:
      held + (starting ? places : -places),
    occupied: ledger.occupied + (confirming ? places : 0),
    revision: ledger.revision + 1};
  const nextReservation: SeatReservation = {
    eventId: command.eventId, canonicalKey: identity.key,
    identityRevision: identity.revision, active: confirming,
    revision: (reservation?.revision ?? 0) + 1,
    reservedAtMillis: starting || confirming ? command.nowMillis :
      reservation!.reservedAtMillis,
    releasedAtMillis: starting || confirming ? null : command.nowMillis,
    ...(places > 1 ? {places} : {}),
    ...(starting ? temporary ? {temporaryHold: {
      ownerKind: command.ownerKind, ownerId,
      expiresAtMillis: command.expiresAtMillis}} :
      {checkoutHold: {paymentId: ownerId,
        expiresAtMillis: command.nowMillis + CHECKOUT_HOLD_MILLIS}} : {}),
  };
  const receipt: SeatReceipt = {eventId: command.eventId,
    requestId: command.requestId, requestHash, operation: command.operation,
    canonicalKey: identity.key, appliedLedgerRevision: nextLedger.revision,
    appliedReservationRevision: nextReservation.revision};
  return freeze(tx, nextLedger, nextReservation, receipt, false);
}

function freeze(transaction: SeatTransaction, ledger: SeatLedger | null,
  reservation: SeatReservation | null, receipt: SeatReceipt,
  replayed: boolean): PreparedSeatHold {
  return Object.freeze({[brand]: true as const, transaction, replayed,
    ledger: ledger ? Object.freeze({...ledger}) : null,
    reservation: reservation ? Object.freeze({...reservation,
      ...(reservation.checkoutHold ? {checkoutHold:
        Object.freeze({...reservation.checkoutHold})} : {}),
      ...(reservation.temporaryHold ? {temporaryHold:
        Object.freeze({...reservation.temporaryHold})} : {})}) : null,
    receipt: Object.freeze({...receipt})});
}

/** Call after all business reads, within the preparing transaction only. */
export function applySeatHold(tx: SeatTransaction,
  plan: PreparedSeatHold): void {
  if (plan[brand] !== true || !Object.isFrozen(plan) ||
      plan.transaction !== tx || applied.has(plan)) {
    fail("invalid", "Checkout hold was not prepared in this transaction.");
  }
  applied.add(plan);
  if (plan.ledger && plan.reservation) {
    tx.putLedger(plan.ledger as SeatLedger);
    tx.putReservation(plan.reservation as SeatReservation);
    tx.createReceipt(plan.receipt as SeatReceipt);
  }
}
