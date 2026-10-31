import assert from "node:assert/strict";
import {test} from "node:test";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "../seatIdentityAuthority";
import {deriveEventSeatPolicy} from "./firestoreAdapter";
import {SeatLedger, SeatReceipt, SeatReservation} from "./seatAuthority";
import {applyBatchImportSeats, BatchImportSeatReadSet,
  BatchImportSeatRow, BatchImportSeatWrites,
  prepareBatchImportSeats} from "./batchSeatImport";
import {createHash} from "crypto";

const eventId = "eventA";
const organizerId = "organizerA";
const importId = "importA";
const event = {organizerId,
  status: "active", capacityLimit: 3, constraints: {}};
const policy = deriveEventSeatPolicy(event);

function digest(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f"))
    .digest("hex");
}
function row(id: string, phone: string | null = null): BatchImportSeatRow {
  return {attendeeId: id, rowId: id, status: "registered",
    phoneE164: phone, externalReference: null, linkedUid: null};
}
function read(rows: BatchImportSeatRow[], occupied = 0,
  capacity = 3): BatchImportSeatReadSet {
  const configuredEvent = {...event, capacityLimit: capacity};
  const p = deriveEventSeatPolicy(configuredEvent);
  const ledger: SeatLedger = {eventId, capacity, occupied,
    revision: 1, capacityRevision: 1, migrationRevision: 1,
    state: "ready", policyHash: p.policyHash,
    policyVersion: p.policyVersion};
  return {eventId, organizerId, importId, event: configuredEvent,
    ledger, nowMillis: 100,
    rows: rows.map((value) => {
      const keys: Array<["attendee" | "phone" | "external", string]> =
        [["attendee", value.attendeeId]];
      if (value.phoneE164) keys.push(["phone", value.phoneE164]);
      if (value.externalReference) {
        keys.push(["external", value.externalReference.toLowerCase()]);
      }
      const canonicalKey = "guest_" + digest([eventId, value.attendeeId])
        .slice(0, 48);
      return {row: value, canonicalKey,
        aliases: keys.map(([kind, v]) => ({key: {kind, value: v,
          id: seatIdentityAliasId(eventId, kind, v)}, value: null})),
        reservation: null, receipt: null,
        receiptId: "batch_" + digest([eventId, importId, value.rowId])
          .slice(0, 48),
        requestHash: digest([eventId, organizerId, importId, value.rowId,
          value.attendeeId, value.status, value.phoneE164 ?? "",
          value.externalReference?.trim().toLowerCase() ?? ""])};
    })};
}
class Writer implements BatchImportSeatWrites {
  calls: string[] = [];
  ledger: SeatLedger | null = null;
  aliases = new Map<string, unknown>();
  reservations = new Map<string, SeatReservation>();
  receipts = new Map<string, SeatReceipt>();
  putLedger(value: SeatLedger): void {
    this.calls.push("ledger"); this.ledger = value;
  }
  createAlias(id: string, value: unknown): void {
    this.calls.push("alias"); this.aliases.set(id, value);
  }
  putReservation(id: string, value: SeatReservation): void {
    this.calls.push("reservation"); this.reservations.set(id, value);
  }
  createReceipt(id: string, value: SeatReceipt): void {
    this.calls.push("receipt"); this.receipts.set(id, value);
  }
}

test("two imported guests take the final two seats from one ledger snapshot",
  () => {
    const writer = new Writer();
    const plan = prepareBatchImportSeats(read([
      row("a", "+919100000001"), row("b", "+919100000002")], 1),
    writer);
    assert.equal(plan.newSeats, 2);
    assert.equal(plan.ledger?.occupied, 3);
    assert.equal(writer.calls.length, 0);
    applyBatchImportSeats(writer, plan);
    assert.equal(writer.ledger?.occupied, 3);
    assert.equal(writer.reservations.size, 2);
    assert.equal(writer.aliases.size, 4);
    assert.equal(writer.receipts.size, 2);
    assert.throws(() => applyBatchImportSeats(writer, plan),
      /not prepared/);
  });

test("capacity failure stages zero writes for every row", () => {
  const writer = new Writer();
  assert.throws(() => prepareBatchImportSeats(read([
    row("a"), row("b")], 2), writer), /capacity/);
  assert.deepEqual(writer.calls, []);
});

test("changed import row cannot retain a prior request hash", () => {
  const writer = new Writer();
  const snapshot = read([row("a")]);
  snapshot.rows[0].row.status = "invited";
  assert.throws(() => prepareBatchImportSeats(snapshot, writer),
    /Duplicate or invalid/);
  assert.deepEqual(writer.calls, []);
});

test("duplicate phone, attendee or existing other-seat alias rejects batch",
  () => {
    const writer = new Writer();
    assert.throws(() => prepareBatchImportSeats(read([
      row("a", "+919100000001"), row("b", "+919100000001")]),
    writer), /Duplicate identity/);
    assert.throws(() => prepareBatchImportSeats(read([
      row("a"), row("a")]), writer), /Duplicate/);
    const snapshot = read([row("a", "+919100000001")]);
    const phone = snapshot.rows[0].aliases[1];
    phone.value = {eventId, organizerId, kind: "phone",
      valueHash: seatIdentityValueHash("phone", "+919100000001"),
      canonicalKey: "guest_other", identityRevision: 1,
      migrationRevision: 1, state: "ready"};
    assert.throws(() => prepareBatchImportSeats(snapshot, writer),
      /conflicts/);
    assert.deepEqual(writer.calls, []);
  });

test("exact existing seat and receipt replay stage no writes", () => {
  const writer = new Writer();
  const snapshot = read([row("a", "+919100000001")], 1);
  const item = snapshot.rows[0];
  for (const alias of item.aliases) {
    alias.value = {eventId, organizerId, kind: alias.key.kind,
      valueHash: seatIdentityValueHash(alias.key.kind, alias.key.value),
      canonicalKey: item.canonicalKey, identityRevision: 1,
      migrationRevision: 1, state: "ready"};
  }
  item.reservation = {eventId, canonicalKey: item.canonicalKey,
    identityRevision: 1, active: true, revision: 1,
    reservedAtMillis: 1, releasedAtMillis: null};
  item.receipt = {eventId, requestId: item.receiptId,
    requestHash: item.requestHash, operation: "reserve",
    canonicalKey: item.canonicalKey, appliedLedgerRevision: 1,
    appliedReservationRevision: 1};
  const plan = prepareBatchImportSeats(snapshot, writer);
  assert.equal(plan.replayed, true);
  // The caller still budgets its attendee and import receipt writes.
  assert.equal(plan.stagedWrites, 2);
  applyBatchImportSeats(writer, plan);
  assert.deepEqual(writer.calls, []);
  item.receipt.requestHash = "different";
  assert.throws(() => prepareBatchImportSeats(snapshot, new Writer()),
    /receipt conflicts/);
});

test("Host phone never enrolls UID; claimed attendee needs other proof",
  () => {
    const writer = new Writer();
    const snapshot = read([row("a", "+919100000001")]);
    snapshot.rows[0].row.linkedUid = "userA";
    assert.throws(() => prepareBatchImportSeats(snapshot, writer),
      /identity is unavailable|Duplicate or invalid/);
    assert.deepEqual(writer.calls, []);
    const safe = prepareBatchImportSeats(read([
      row("a", "+919100000001")]), writer);
    assert.equal(safe.aliases.some((entry) =>
      entry.value.kind === "uid"), false);
    assert.equal(policy.policyVersion, "legacy");
  });

test("cohort constrained import fails without verified cohort evidence", () => {
  const writer = new Writer();
  const snapshot = read([row("a")]);
  snapshot.event = {...event, constraints: {maxMen: 2}};
  assert.throws(() => prepareBatchImportSeats(snapshot, writer),
    /verified cohort/);
  assert.deepEqual(writer.calls, []);
});

test("normal importer row IDs may contain spaces", () => {
  const writer = new Writer();
  const value = row("attendeeOne");
  value.rowId = "row one";
  const snapshot = read([value]);
  const plan = prepareBatchImportSeats(snapshot, writer);
  assert.equal(plan.newSeats, 1);
});

test("write budget denies a large alias-heavy batch before staging", () => {
  const writer = new Writer();
  const rows = Array.from({length: 100}, (_, index) => ({
    ...row(`attendee${index}`, `+9191${String(index).padStart(8, "0")}`),
    externalReference: `external${index}`,
  }));
  const snapshot = read(rows, 0, 200);
  assert.throws(() => prepareBatchImportSeats(snapshot, writer),
    /write budget/);
  assert.deepEqual(writer.calls, []);
});

test("policy drift from migrated ledger denies whole import", () => {
  const writer = new Writer();
  const snapshot = read([row("a")]);
  snapshot.ledger!.policyHash = "f".repeat(64);
  assert.throws(() => prepareBatchImportSeats(snapshot, writer),
    /reconciliation/);
  assert.deepEqual(writer.calls, []);
});

test("active existing seat with missing alias cannot self-heal", () => {
  const writer = new Writer();
  const snapshot = read([row("a")], 1);
  snapshot.rows[0].reservation = {eventId,
    canonicalKey: snapshot.rows[0].canonicalKey,
    identityRevision: 1, active: true, revision: 1,
    reservedAtMillis: 1, releasedAtMillis: null};
  assert.throws(() => prepareBatchImportSeats(snapshot, writer),
    /missing its identity alias/);
  assert.deepEqual(writer.calls, []);
});


test("import capacity includes outstanding checkout holds", () => {
  const writer = new Writer();
  const snapshot = read([row("a"), row("b")], 1);
  snapshot.ledger!.checkoutHeld = 1;
  assert.throws(() => prepareBatchImportSeats(snapshot, writer), /capacity/u);
  assert.deepEqual(writer.calls, []);
});
