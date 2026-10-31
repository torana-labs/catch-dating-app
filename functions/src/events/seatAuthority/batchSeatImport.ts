import {createHash} from "crypto";
import {normalizeRosterPhone} from "../eventAttendees";
import {seatIdentityAliasId, SeatIdentityAlias,
  seatIdentityValueHash} from "../seatIdentityAuthority";
import {deriveEventSeatPolicy} from "./firestoreAdapter";
import {assertReadySeatState, heldSeatCount,
  SeatAuthorityError, SeatLedger, SeatReceipt,
  SeatReservation} from "./seatAuthority";

type AliasKind = "attendee" | "phone" | "external";
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
/** Includes the importer's attendee writes and its import receipt. */
export const MAX_BATCH_IMPORT_WRITES = 400;

export interface BatchImportSeatRow {
  attendeeId: string;
  rowId: string;
  status: "registered" | "checkedIn" | "invited" | "waitlisted";
  phoneE164: string | null;
  externalReference: string | null;
  /** From the existing attendee document, never from Host input. */
  linkedUid: string | null;
}

interface AliasKey {kind: AliasKind; value: string; id: string}
export interface ReadRow {
  row: BatchImportSeatRow;
  aliases: Array<{key: AliasKey; value: SeatIdentityAlias | null}>;
  reservation: SeatReservation | null;
  receipt: SeatReceipt | null;
  canonicalKey: string;
  receiptId: string;
  requestHash: string;
}

export interface BatchImportSeatReadSet {
  eventId: string;
  organizerId: string;
  importId: string;
  event: unknown;
  ledger: SeatLedger | null;
  rows: ReadRow[];
  nowMillis: number;
}

export interface BatchImportSeatWrites {
  putLedger(value: SeatLedger): void;
  createAlias(id: string, value: SeatIdentityAlias): void;
  putReservation(id: string, value: SeatReservation): void;
  createReceipt(id: string, value: SeatReceipt): void;
}

interface PlannedWrite<T> {id: string; value: T}
const batchBrand = Symbol("prepared-batch-import-seats");
const applied = new WeakSet<PreparedBatchImportSeats>();
export interface PreparedBatchImportSeats {
  readonly [batchBrand]: true;
  readonly writer: BatchImportSeatWrites;
  readonly ledger: SeatLedger | null;
  readonly aliases: readonly PlannedWrite<SeatIdentityAlias>[];
  readonly reservations: readonly PlannedWrite<SeatReservation>[];
  readonly receipts: readonly PlannedWrite<SeatReceipt>[];
  readonly newSeats: number;
  readonly replayed: boolean;
  readonly stagedWrites: number;
}

function fail(message: string): never {
  throw new SeatAuthorityError("unavailable", message);
}
function digest(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f"))
    .digest("hex");
}
function guestKey(eventId: string, attendeeId: string): string {
  // Same deterministic UID-free key as the migration planner.
  return "guest_" + digest([eventId, attendeeId]).slice(0, 48);
}
function reservationId(eventId: string, key: string): string {
  return digest([eventId, key]);
}
function receiptId(eventId: string, importId: string,
  rowId: string): string {
  return "batch_" + digest([eventId, importId, rowId]).slice(0, 48);
}
function aliasKeys(eventId: string, row: BatchImportSeatRow): AliasKey[] {
  if (!ID.test(row.attendeeId) || typeof row.rowId !== "string" ||
      row.rowId.length < 1 || row.rowId.length > 120 ||
      row.linkedUid !== null ||
      !["registered", "checkedIn", "invited", "waitlisted"]
        .includes(row.status)) fail("Import seat identity is unavailable.");
  const keys: Array<[AliasKind, string]> = [["attendee", row.attendeeId]];
  if (row.phoneE164 !== null) {
    const normalized = normalizeRosterPhone(row.phoneE164);
    if (normalized.issue || normalized.value !== row.phoneE164) {
      fail("Imported phone is not normalized.");
    }
    keys.push(["phone", row.phoneE164]);
  }
  if (row.externalReference !== null) {
    const value = row.externalReference.trim().toLowerCase();
    if (!value) fail("Imported reference is invalid.");
    keys.push(["external", value]);
  }
  return keys.map(([kind, value]) => ({kind, value,
    id: seatIdentityAliasId(eventId, kind, value)}));
}

/**
 * Performs every authority read before any write is staged. The caller must
 * use this same Firestore transaction for manager, attendee and import reads.
 */
export async function readFirestoreBatchImportSeats(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  importId: string;
  rows: BatchImportSeatRow[];
  nowMillis: number;
}): Promise<BatchImportSeatReadSet> {
  const {db, tx, eventId, organizerId, importId, rows, nowMillis} = params;
  if (!ID.test(eventId) || !ID.test(organizerId) ||
      !ID.test(importId) || rows.length < 1 || rows.length > 250 ||
      !Number.isSafeInteger(nowMillis) || nowMillis < 0) {
    fail("Invalid batch import seat scope.");
  }
  const keys = rows.map((row) => aliasKeys(eventId, row));
  const [eventSnap, ledgerSnap] = await Promise.all([
    tx.get(db.collection("events").doc(eventId)),
    tx.get(db.collection("eventSeatLedgers").doc(eventId)),
  ]);
  const rowReads = await Promise.all(rows.map(async (row, index) => {
    const canonicalKey = guestKey(eventId, row.attendeeId);
    const receipt = receiptId(eventId, importId, row.rowId);
    const refs = keys[index].map((key) =>
      db.collection("eventSeatIdentityAliases")
        .doc(key.id));
    const [aliasSnaps, reservationSnap, receiptSnap] = await Promise.all([
      Promise.all(refs.map((ref) => tx.get(ref))),
      tx.get(db.collection("eventSeatReservations")
        .doc(reservationId(eventId, canonicalKey))),
      tx.get(db.collection("eventSeatRequestReceipts").doc(receipt)),
    ]);
    return {row, aliases: keys[index].map((key, i) => ({key,
      value: aliasSnaps[i].exists ? aliasSnaps[i].data() as
        SeatIdentityAlias : null})),
    reservation: reservationSnap.exists ? reservationSnap.data() as
      SeatReservation : null,
    receipt: receiptSnap.exists ? receiptSnap.data() as SeatReceipt : null,
    canonicalKey, receiptId: receipt,
    requestHash: digest([eventId, organizerId, importId, row.rowId,
      row.attendeeId, row.status, row.phoneE164 ?? "",
      row.externalReference?.trim().toLowerCase() ?? ""])};
  }));
  return {eventId, organizerId, importId, event: eventSnap.data() ?? null,
    ledger: ledgerSnap.exists ? ledgerSnap.data() as SeatLedger : null,
    rows: rowReads, nowMillis};
}

/** Pure full-batch decision against one ledger snapshot. */
export function prepareBatchImportSeats(read: BatchImportSeatReadSet,
  writer: BatchImportSeatWrites): PreparedBatchImportSeats {
  const {eventId, organizerId, ledger, rows, nowMillis} = read;
  if (!ID.test(eventId) || !ID.test(organizerId) ||
      !ID.test(read.importId) || !Number.isSafeInteger(nowMillis) ||
      nowMillis < 0 || rows.length < 1 || rows.length > 250) {
    fail("Invalid batch import seat scope.");
  }
  const event = read.event as Record<string, unknown> | null;
  if (!event || event.organizerId !== organizerId ||
      event.organizerId !== undefined && event.organizerId !== organizerId) {
    fail("Imported event owner is unavailable.");
  }
  const policy = deriveEventSeatPolicy(event);
  const admission = event.eventPolicy as Record<string, unknown> | null |
    undefined;
  const admissionRules = admission?.admission as Record<string, unknown> |
    undefined;
  const constraints = event.constraints as Record<string, unknown> |
    undefined;
  const cohortCaps = admissionRules?.cohortCapacityLimits;
  // Host rows contain no verified cohort. Never consume a capped/balanced
  // cohort or pair inventory as ordinary general capacity.
  if (constraints?.maxMen != null || constraints?.maxWomen != null ||
      admissionRules?.format === "fixedCohortCaps" ||
      admissionRules?.format === "balancedRatio" ||
      admissionRules?.balancedRatioPolicy != null ||
      cohortCaps != null &&
        (typeof cohortCaps !== "object" || Array.isArray(cohortCaps) ||
          Object.keys(cohortCaps).length > 0) ||
      (admissionRules?.crossPathsPairInventory as
        Record<string, unknown> | undefined)?.enabled === true) {
    fail("Host import has no verified cohort capacity evidence.");
  }
  if (policy.organizerId !== organizerId || policy.status !== "active" ||
      !ledger || ledger.eventId !== eventId || ledger.state !== "ready" ||
      ledger.capacity !== policy.capacity ||
      ledger.policyHash !== policy.policyHash ||
      ledger.policyVersion !== policy.policyVersion ||
      !Number.isSafeInteger(ledger.occupied) || ledger.occupied < 0 ||
      ledger.occupied > ledger.capacity ||
      !Number.isSafeInteger(ledger.revision) || ledger.revision < 1 ||
      ledger.revision === Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(ledger.capacityRevision) ||
      ledger.capacityRevision < 1 ||
      !Number.isSafeInteger(ledger.migrationRevision) ||
      ledger.migrationRevision < 1) {
    fail("Event seat ledger needs reconciliation.");
  }
  heldSeatCount(ledger);
  const seenAlias = new Map<string, string>();
  const seenRows = new Set<string>();
  const seenAttendees = new Set<string>();
  const aliases: PlannedWrite<SeatIdentityAlias>[] = [];
  const reservations: PlannedWrite<SeatReservation>[] = [];
  const receipts: PlannedWrite<SeatReceipt>[] = [];
  let newSeats = 0;
  let replayed = true;
  for (const item of rows) {
    const {row, canonicalKey} = item;
    if (seenRows.has(row.rowId) ||
        seenAttendees.has(row.attendeeId) || !ID.test(row.attendeeId) ||
        typeof row.rowId !== "string" || row.rowId.length < 1 ||
        row.rowId.length > 120 || row.linkedUid !== null ||
        canonicalKey !== guestKey(eventId, row.attendeeId) ||
        item.receiptId !== receiptId(eventId, read.importId, row.rowId) ||
        item.requestHash !== digest([eventId, organizerId, read.importId,
          row.rowId, row.attendeeId, row.status, row.phoneE164 ?? "",
          row.externalReference?.trim().toLowerCase() ?? ""]) ||
        item.aliases.length !== aliasKeys(eventId, row).length) {
      fail("Duplicate or invalid imported attendee.");
    }
    seenRows.add(row.rowId);
    seenAttendees.add(row.attendeeId);
    const prior = item.receipt;
    if (prior && (prior.eventId !== eventId ||
        prior.requestId !== item.receiptId ||
        prior.requestHash !== item.requestHash ||
        prior.canonicalKey !== canonicalKey ||
        prior.operation !== "reserve" ||
        !Number.isSafeInteger(prior.appliedLedgerRevision) ||
        prior.appliedLedgerRevision < 1 ||
        !Number.isSafeInteger(prior.appliedReservationRevision) ||
        prior.appliedReservationRevision < 1)) {
      fail("Import seat receipt conflicts with this row.");
    }
    const requiredKeys = aliasKeys(eventId, row);
    for (let i = 0; i < requiredKeys.length; i++) {
      const {key, value} = item.aliases[i];
      const expected = requiredKeys[i];
      if (key.id !== expected.id || key.kind !== expected.kind ||
          key.value !== expected.value) fail("Incomplete alias read set.");
      const seen = seenAlias.get(key.id);
      if (seen && seen !== canonicalKey) {
        fail("Duplicate identity appears in this import batch.");
      }
      seenAlias.set(key.id, canonicalKey);
      if (value) {
        if (value.eventId !== eventId ||
            value.organizerId !== organizerId ||
            value.kind !== key.kind ||
            value.valueHash !== seatIdentityValueHash(key.kind,
              key.value) || value.canonicalKey !== canonicalKey ||
            value.migrationRevision !== ledger.migrationRevision ||
            value.identityRevision !== 1 || value.state !== "ready") {
          fail("Imported identity conflicts with an existing seat.");
        }
      } else if (!prior) {
        if (item.reservation) {
          fail("Existing seat is missing its identity alias.");
        }
        aliases.push({id: key.id, value: {eventId, organizerId,
          kind: key.kind, valueHash: seatIdentityValueHash(key.kind,
            key.value), canonicalKey, identityRevision: 1,
          migrationRevision: ledger.migrationRevision, state: "ready"}});
      } else fail("Replayed seat is missing its identity alias.");
    }
    const active = row.status === "registered" ||
      row.status === "checkedIn";
    const existing = item.reservation;
    assertReadySeatState(eventId, {key: canonicalKey, revision: 1},
      ledger, existing);
    if (existing && existing.identityRevision !== 1) {
      fail("Imported identity needs reconciliation.");
    }
    if (existing?.checkoutHold || existing?.temporaryHold) {
      fail("Import cannot change a seat held for checkout.");
    }
    if (prior && (!active || !existing?.active)) {
      fail("Replayed import no longer matches an active seat.");
    }
    if (!active) {
      if (existing?.active) {
        fail("Import cannot silently release a confirmed seat.");
      }
      continue;
    }
    if (existing?.active) {
      if (!prior) replayed = false;
    } else {
      if (prior) fail("Replayed import cannot re-activate a seat.");
      newSeats++;
      replayed = false;
      reservations.push({id: reservationId(eventId, canonicalKey),
        value: {eventId, canonicalKey, identityRevision: 1,
          active: true, revision: (existing?.revision ?? 0) + 1,
          reservedAtMillis: nowMillis, releasedAtMillis: null}});
    }
    if (!prior) {
      receipts.push({id: item.receiptId,
        value: {eventId, requestId: item.receiptId,
          requestHash: item.requestHash, operation: "reserve", canonicalKey,
          appliedLedgerRevision: ledger.revision + (newSeats > 0 ? 1 : 0),
          appliedReservationRevision: existing?.active ? existing.revision :
            (existing?.revision ?? 0) + 1}});
    }
  }
  if (ledger.occupied + heldSeatCount(ledger) + newSeats >
      ledger.capacity) {
    fail("Import exceeds the event seat capacity.");
  }
  const nextLedger = newSeats > 0 ? {...ledger,
    occupied: ledger.occupied + newSeats, revision: ledger.revision + 1} : null;
  for (const receipt of receipts) {
    receipt.value.appliedLedgerRevision = nextLedger?.revision ??
      ledger.revision;
  }
  replayed = replayed && aliases.length === 0 && receipts.length === 0;
  const stagedWrites = aliases.length + reservations.length +
    receipts.length + (nextLedger ? 1 : 0) + rows.length + 1;
  if (stagedWrites > MAX_BATCH_IMPORT_WRITES) {
    fail("Import exceeds one transaction's supported write budget.");
  }
  const freezeEntries = <T>(entries: PlannedWrite<T>[]) =>
    Object.freeze(entries.map(({id, value}) => Object.freeze({id,
      value: Object.freeze(value)})));
  return Object.freeze({[batchBrand]: true as const, writer,
    ledger: nextLedger ? Object.freeze(nextLedger) : null,
    aliases: freezeEntries(aliases),
    reservations: freezeEntries(reservations),
    receipts: freezeEntries(receipts), newSeats, replayed,
    stagedWrites});
}

/** Call only after the importer has completed every authority read. */
export function applyBatchImportSeats(writer: BatchImportSeatWrites,
  plan: PreparedBatchImportSeats): void {
  if (plan[batchBrand] !== true || !Object.isFrozen(plan) ||
      plan.writer !== writer || applied.has(plan)) {
    fail("Batch seat plan was not prepared for this transaction.");
  }
  applied.add(plan);
  if (plan.ledger) writer.putLedger(plan.ledger as SeatLedger);
  for (const row of plan.aliases) {
    writer.createAlias(row.id, row.value as SeatIdentityAlias);
  }
  for (const row of plan.reservations) {
    writer.putReservation(row.id, row.value as SeatReservation);
  }
  for (const row of plan.receipts) {
    writer.createReceipt(row.id, row.value as SeatReceipt);
  }
}

/** Same transaction as the importer; no writes before apply. */
export class FirestoreBatchSeatImportWriter implements BatchImportSeatWrites {
  constructor(private readonly db: FirebaseFirestore.Firestore,
    private readonly tx: FirebaseFirestore.Transaction) {}
  putLedger(value: SeatLedger): void {
    this.tx.set(this.db.collection("eventSeatLedgers").doc(value.eventId),
      value);
  }
  createAlias(id: string, value: SeatIdentityAlias): void {
    this.tx.create(this.db.collection("eventSeatIdentityAliases")
      .doc(id), value);
  }
  putReservation(id: string, value: SeatReservation): void {
    this.tx.set(this.db.collection("eventSeatReservations").doc(id), value);
  }
  createReceipt(id: string, value: SeatReceipt): void {
    this.tx.create(this.db.collection("eventSeatRequestReceipts").doc(id),
      value);
  }
}

/** Importer-facing entry point binding reads and writes to the same tx. */
export async function prepareFirestoreBatchSeatImport(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  importId: string;
  rows: BatchImportSeatRow[];
  nowMillis: number;
}): Promise<{writer: FirestoreBatchSeatImportWriter;
  plan: PreparedBatchImportSeats}> {
  const read = await readFirestoreBatchImportSeats(params);
  const writer = new FirestoreBatchSeatImportWriter(params.db, params.tx);
  return {writer, plan: prepareBatchImportSeats(read, writer)};
}
