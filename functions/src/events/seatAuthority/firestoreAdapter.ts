import {createHash} from "crypto";
import {
  applySeatPlan, assertReadySeatState, CanonicalSeatIdentity,
  prepareSeatCommand,
  PreparedSeatPlan, SeatAuthorityError, SeatCommand, SeatLedger,
  SeatReceipt, SeatReservation, SeatResult, SeatTransaction,
} from "./seatAuthority";
import {applySeatBatch, prepareSeatBatch, PreparedSeatBatch,
  SeatBatchCommand, SeatBatchResult} from "./seatBatch";

const ledgerCollection = "eventSeatLedgers";
const reservationCollection = "eventSeatReservations";
const receiptCollection = "eventSeatRequestReceipts";

function id(eventId: string, key: string): string {
  return createHash("sha256").update(`${eventId}\u001f${key}`)
    .digest("hex");
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value);
}

/** One transaction-backed adapter; callers must not share it across tx runs. */
export class FirestoreSeatTransaction implements SeatTransaction {
  constructor(readonly db: FirebaseFirestore.Firestore,
    readonly tx: FirebaseFirestore.Transaction) {}

  async ledger(eventId: string): Promise<SeatLedger | null> {
    const snap = await this.tx.get(this.db.collection(ledgerCollection)
      .doc(eventId));
    return snap.exists ? snap.data() as SeatLedger : null;
  }

  async reservation(eventId: string, canonicalKey: string):
    Promise<SeatReservation | null> {
    const snap = await this.tx.get(this.db.collection(reservationCollection)
      .doc(id(eventId, canonicalKey)));
    return snap.exists ? snap.data() as SeatReservation : null;
  }

  async receipt(eventId: string, requestId: string):
    Promise<SeatReceipt | null> {
    const snap = await this.tx.get(this.db.collection(receiptCollection)
      .doc(id(eventId, requestId)));
    return snap.exists ? snap.data() as SeatReceipt : null;
  }

  putLedger(value: SeatLedger): void {
    this.tx.set(this.db.collection(ledgerCollection).doc(value.eventId),
      value);
  }

  putReservation(value: SeatReservation): void {
    this.tx.set(this.db.collection(reservationCollection)
      .doc(id(value.eventId, value.canonicalKey)), value);
  }

  createReceipt(value: SeatReceipt): void {
    this.tx.create(this.db.collection(receiptCollection)
      .doc(id(value.eventId, value.requestId)), value);
  }
}

/**
 * This must prove every known UID, verified phone, import, and CRM alias from
 * authoritative current records in this tx. Returning null fails closed.
 * The existing source model has no complete cross-source identity migration,
 * so this module intentionally provides no guessed default implementation.
 */
export interface SeatIdentityAuthority<Subject> {
  resolve(params: {db: FirebaseFirestore.Firestore;
    tx: FirebaseFirestore.Transaction; eventId: string;
    organizerId: string; subject: Subject}):
    Promise<CanonicalSeatIdentity | null>;
}

export interface FirestoreSeatPreparation {
  plan: PreparedSeatPlan;
  seatTransaction: FirestoreSeatTransaction;
  eventCapacity: number;
  eventCapacityRevision: number;
  eventPolicyHash: string;
  eventPolicyVersion: SeatLedger["policyVersion"];
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) {
    return Object.fromEntries(Object.keys(value).sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonical(value[key])]));
  }
  return value;
}

/** Source-owned policy projection for migration and transactional reads. */
export function deriveEventSeatPolicy(value: unknown): {
  organizerId: string;
  capacity: number;
  policyHash: string;
  policyVersion: SeatLedger["policyVersion"];
  status: "active" | "cancelled";
} {
  if (!object(value) ||
      (typeof value.organizerId !== "string" ||
        value.organizerId.length === 0) &&
        (typeof value.organizerId !== "string" ||
          value.organizerId.length === 0) ||
      typeof value.organizerId === "string" &&
        value.organizerId.length > 0 &&
        value.organizerId !== value.organizerId ||
      !Number.isSafeInteger(value.capacityLimit) ||
      Number(value.capacityLimit) < 1 ||
      !["active", "cancelled"].includes(String(value.status))) {
    throw new SeatAuthorityError("unavailable",
      "Event capacity or revision is not configured.");
  }
  let policyVersion: SeatLedger["policyVersion"] = "legacy";
  let admissionPolicy: unknown = value.constraints ?? null;
  if (value.eventPolicy !== undefined && value.eventPolicy !== null) {
    const policy = value.eventPolicy;
    if (!object(policy) ||
        policy.version !== 1 && policy.version !== 2 ||
        !object(policy.admission) ||
        policy.admission.capacityLimit !== value.capacityLimit) {
      throw new SeatAuthorityError("unavailable",
        "Event capacity policy is malformed or disagrees with the event.");
    }
    policyVersion = policy.version === 1 ? "v1" : "v2";
    admissionPolicy = policy.admission;
  }
  const policyHash = createHash("sha256").update(JSON.stringify(canonical({
    capacity: value.capacityLimit, policyVersion, admissionPolicy,
  }))).digest("hex");
  return {organizerId: typeof value.organizerId === "string" &&
    value.organizerId.length > 0 ? value.organizerId : String(
      value.organizerId),
  capacity: value.capacityLimit as number, policyHash, policyVersion,
  status: value.status as "active" | "cancelled"};
}

/** Validate a retained seat in the caller's current transaction, with no
 * occupancy writes or artificial reserve/release receipt. Caller owns reads,
 * manager/guest authority and whether the event must still be active.
 */
export function assertCurrentReadySeatSnapshot(params: {
  event: unknown;
  eventId: string;
  organizerId: string;
  identity: CanonicalSeatIdentity;
  ledger: SeatLedger | null;
  reservation: SeatReservation | null;
  expectedActive?: boolean;
}): void {
  const {eventId, organizerId, identity, ledger, reservation} = params;
  const policy = deriveEventSeatPolicy(params.event);
  assertReadySeatState(eventId, identity, ledger, reservation);
  if (policy.organizerId !== organizerId || identity.revision < 1 ||
      ledger.revision < 1 ||
      ledger.capacity !== policy.capacity ||
      ledger.policyHash !== policy.policyHash ||
      ledger.policyVersion !== policy.policyVersion ||
      reservation && reservation.identityRevision !== identity.revision ||
      params.expectedActive !== undefined &&
        (reservation?.active === true) !== params.expectedActive) {
    throw new SeatAuthorityError("unavailable",
      "Current event, identity and reserved seat authority disagree.");
  }
}

/**
 * Read-only preparation. The caller reads event, payment, offer, admission,
 * and any other authority in this SAME tx; only then calls applyFirestoreSeat.
 * A missing or unreconciled ledger and an absent identity resolver deny writes.
 */
export async function prepareFirestoreSeat<Subject>(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  command: SeatCommand<Subject>;
  identityAuthority?: SeatIdentityAuthority<Subject>;
}): Promise<FirestoreSeatPreparation> {
  const {db, tx, command, identityAuthority} = params;
  if (!identityAuthority) {
    throw new SeatAuthorityError("unavailable",
      "Canonical seat identity authority is not installed.");
  }
  const eventSnap = await tx.get(db.collection("events").doc(command.eventId));
  const event = deriveEventSeatPolicy(eventSnap.data());
  if (command.operation === "reserve" && event.status !== "active") {
    throw new SeatAuthorityError("unavailable",
      "Event is not open for a new seat.");
  }
  const seatTransaction = new FirestoreSeatTransaction(db, tx);
  const ledger = await seatTransaction.ledger(command.eventId);
  if (!ledger || ledger.capacity !== event.capacity ||
      ledger.policyHash !== event.policyHash ||
      ledger.policyVersion !== event.policyVersion ||
      ledger.state !== "ready" || ledger.migrationRevision < 1) {
    throw new SeatAuthorityError("unavailable",
      "Event seat ledger needs migration or policy reconciliation.");
  }
  const plan = await prepareSeatCommand({tx: seatTransaction, command,
    resolveIdentity: async (subject) => {
      const resolved = await identityAuthority.resolve({db, tx,
        eventId: command.eventId, organizerId: event.organizerId, subject});
      if (!resolved) {
        throw new SeatAuthorityError("unavailable",
          "Canonical attendee identity is unresolved or ambiguous.");
      }
      return resolved;
    }});
  return {plan, seatTransaction, eventCapacity: event.capacity,
    eventCapacityRevision: ledger.capacityRevision,
    eventPolicyHash: event.policyHash,
    eventPolicyVersion: event.policyVersion};
}

/** Stages seat writes; the caller stages its booking/admission writes next. */
export function applyFirestoreSeat(prepared: FirestoreSeatPreparation):
  SeatResult {
  return applySeatPlan(prepared.seatTransaction, prepared.plan);
}

export interface FirestoreSeatBatchPreparation {
  plan: PreparedSeatBatch;
  seatTransaction: FirestoreSeatTransaction;
  eventCapacity: number;
  eventPolicyHash: string;
}

/**
 * The caller completes manager, cancellation, waitlist and payment reads in
 * this same Firestore transaction before applying. No writer is activated.
 */
export async function prepareFirestoreSeatBatch<Subject>(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  command: SeatBatchCommand<Subject>;
  identityAuthority?: SeatIdentityAuthority<Subject>;
}): Promise<FirestoreSeatBatchPreparation> {
  const {db, tx, command, identityAuthority} = params;
  if (!identityAuthority) {
    throw new SeatAuthorityError("unavailable",
      "Canonical seat identity authority is not installed.");
  }
  const eventSnap = await tx.get(db.collection("events").doc(command.eventId));
  const event = deriveEventSeatPolicy(eventSnap.data());
  if (event.status !== "active" &&
      command.operations.some((row) => row.operation === "reserve")) {
    throw new SeatAuthorityError("unavailable",
      "Event is not open for a new seat.");
  }
  const seatTransaction = new FirestoreSeatTransaction(db, tx);
  const plan = await prepareSeatBatch({tx: seatTransaction, command,
    validateLedger: (ledger) => {
      if (ledger.capacity !== event.capacity ||
          ledger.policyHash !== event.policyHash ||
          ledger.policyVersion !== event.policyVersion) {
        throw new SeatAuthorityError("unavailable",
          "Event seat ledger needs policy reconciliation.");
      }
    },
    resolveIdentity: async (subject) => {
      const resolved = await identityAuthority.resolve({db, tx,
        eventId: command.eventId, organizerId: event.organizerId, subject});
      if (!resolved) {
        throw new SeatAuthorityError("unavailable",
          "Canonical attendee identity is unresolved or ambiguous.");
      }
      return resolved;
    }});
  return {plan, seatTransaction, eventCapacity: event.capacity,
    eventPolicyHash: event.policyHash};
}

export function applyFirestoreSeatBatch(
  prepared: FirestoreSeatBatchPreparation): SeatBatchResult {
  return applySeatBatch(prepared.seatTransaction, prepared.plan);
}
