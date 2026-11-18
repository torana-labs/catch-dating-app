/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import type {HostRosterIntakeManageDeps} from "../events/hostRosterIntakeApply";
import {HostRosterIntakeSessionStore} from "../events/hostRosterIntakeSessionStore";
import {headerShapeHash} from "../guestImport/headerShapes";
import {importGuestListHandler, type ImportGuestListDeps} from "./importGuestList";

// Every name, number and address below is fictional.

const UID = "host-1";
const PHONE = "+919000000002";
const EVENT = "event-1";
const ORGANIZER = "organizer-1";

const validate = {
  response: contractValidator("ImportGuestListCallableResponse"),
  shape: contractValidator("GuestImportHeaderShapeDocument"),
};

function valid(validator: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${schemaErrorMessages(validator as never).join("; ")}`);
}

const LUMA_CSV = "Name,Approval Status,Registration Date,Ticket Type,Guest Key,Phone\n" +
  "Asha Sample,approved,2026-11-01,General,g-1,98765 43210\n" +
  "Ravi Sample,waitlist,2026-11-01,General,g-2,98765 43211\n";

function harness(options: {authorize?: () => Promise<void>} = {}) {
  const db = new FakeFirestore();
  db.write(`events/${EVENT}`, {organizerId: ORGANIZER});
  const imports: unknown[] = [];
  const store = new HostRosterIntakeSessionStore(db as unknown as FirebaseFirestore.Firestore, () => 1000);
  const intake: HostRosterIntakeManageDeps = {
    store,
    authorize: (options.authorize ?? (async () => undefined)) as never,
    rateLimit: async () => undefined,
    loadInitialCurrentRows: async () => new Map(),
    loadTransactionCurrentRows: async () => new Map(),
    importCanonical: async (input) => {
      imports.push(input.payload);
      await (db as unknown as FirebaseFirestore.Firestore).runTransaction(async (tx) => {
        await input.authorizeSource(tx, false, "imp_1");
        await input.commitSource(tx, "imp_1", input.payload, "e".repeat(64));
      });
      return {importId: "imp_1", status: "completed", rowCount: input.payload.rows.length,
        createdCount: input.payload.rows.length, updatedCount: 0, skippedCount: 0,
        errors: [], replayed: false};
    },
  };
  const deps: ImportGuestListDeps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date("2026-11-18T08:00:00.000Z"),
    increment: ((by: number) => ({__increment: by})) as never,
    checkRateLimit: (async () => undefined) as never,
    intake: () => intake,
  };
  return {db, deps, imports};
}

function call(data: unknown, auth: unknown = {uid: UID, token: {phone_number: PHONE}}) {
  return {data, auth, rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>;
}

function envelope(mode: "preview" | "apply", csv: string, extra: Record<string, unknown> = {}, input: Record<string, unknown> = {}) {
  return {mode, idempotencyKey: "guest-import-0001", surface: "cli",
    input: {eventId: EVENT, file: {fileName: "guests.csv",
      contentBase64: Buffer.from(csv, "utf8").toString("base64")}, ...input},
    ...extra};
}

test("a caller without a verified phone is refused before the file is read", async () => {
  const {deps} = harness();
  await assert.rejects(importGuestListHandler(call(envelope("preview", LUMA_CSV), {uid: UID, token: {}}), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "phone_not_verified");
});

test("preview reads a Luma export into the review session; apply saves it once", async () => {
  const {db, deps, imports} = harness();
  const preview = await importGuestListHandler(call(envelope("preview", LUMA_CSV)), deps);
  valid(validate.response, preview, "preview");
  assert.equal(preview.status, "previewed");
  assert.equal(preview.result.converter.id, "luma-v1");
  assert.deepEqual(preview.result.counts, {add: 2, update: 0, unchanged: 0, excluded: 0, needsReview: 0, identityConflict: 0, skipped: 0});
  assert.equal(preview.summary.headline, "This adds 2 guests and updates 0 guests.");
  assert.ok(preview.result.sessionId);
  const stored = db.read(`hostRosterIntakeSessions/${preview.result.sessionId}`) as {draft: {rows: Array<{fields: Record<string, {origin: string}>}>}};
  assert.equal(stored.draft.rows[0].fields.phone.origin, "upload");
  assert.equal(imports.length, 0);

  const confirm = {commandId: "guests.import-list", previewHash: preview.previewHash};
  const applied = await importGuestListHandler(call(envelope("apply", LUMA_CSV, {confirm})), deps);
  valid(validate.response, applied, "apply");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.import?.createdCount, 2);
  assert.match(applied.receiptId ?? "", /^guestsImportList_[a-f0-9]{64}$/u);
  assert.equal(imports.length, 1);

  const replayed = await importGuestListHandler(call(envelope("apply", LUMA_CSV, {confirm})), deps);
  assert.equal(replayed.status, "replayed");
  assert.equal(imports.length, 1);
});

test("apply refuses a confirm for a preview that has since changed", async () => {
  const {deps, imports} = harness();
  await assert.rejects(importGuestListHandler(call(envelope("apply", LUMA_CSV,
    {confirm: {commandId: "guests.import-list", previewHash: "0".repeat(64)}})), deps),
  (error: {details?: {reason?: string}}) => error.details?.reason === "changed_since_preview");
  assert.equal(imports.length, 0);
});

test("unknown columns ask the host to map them and count the header shape, without values", async () => {
  const {db, deps} = harness();
  const csv = "Attendee,Contact,Seat\nAsha Sample,9876543210,A1\n";
  const response = await importGuestListHandler(call(envelope("preview", csv)), deps);
  valid(validate.response, response, "needs input");
  assert.equal(response.status, "needs_input");
  assert.equal(response.result.needsMapping, true);
  assert.deepEqual(response.result.headers, ["Attendee", "Contact", "Seat"]);
  assert.deepEqual(response.result.columnShapes, ["text", "phone-like", "text"]);
  const shape = db.read(`guestImportHeaderShapes/${headerShapeHash(["Attendee", "Contact", "Seat"])}`);
  valid(validate.shape, shape, "header shape");
  assert.equal(JSON.stringify(shape).includes("Attendee"), false);

  const mapped = await importGuestListHandler(call(envelope("preview", csv, {}, {mapping: {displayName: 0, phone: 1}})), deps);
  valid(validate.response, mapped, "mapped");
  assert.equal(mapped.status, "previewed");
  assert.equal(mapped.result.counts.add, 1);
  const stored = db.read(`hostRosterIntakeSessions/${mapped.result.sessionId}`) as {draft: {rows: Array<{fields: Record<string, {origin: string}>}>}};
  assert.equal(stored.draft.rows[0].fields.displayName.origin, "hostCorrection");
});

test("rows that need a look block apply until the host leaves them out", async () => {
  const {deps, imports} = harness();
  const csv = "Name,Phone\nAsha Sample,9876543210\nRavi Sample,12\n";
  const preview = await importGuestListHandler(call(envelope("preview", csv)), deps);
  assert.equal(preview.result.counts.needsReview, 1);
  assert.equal(preview.result.eligibleForApply, false);
  const flagged = preview.result.rows.find((row) => row.kind === "needsReview");
  assert.equal(flagged?.issueCode, "invalid-phone");
  await assert.rejects(importGuestListHandler(call(envelope("apply", csv)), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "needs_review");

  const excluded = {excludedRowIds: [flagged!.rowId]};
  const second = await importGuestListHandler(call({...envelope("preview", csv, {}, excluded), idempotencyKey: "guest-import-0002"}), deps);
  assert.equal(second.result.eligibleForApply, true);
  const applied = await importGuestListHandler(call({...envelope("apply", csv, {}, excluded), idempotencyKey: "guest-import-0002"}), deps);
  assert.equal(applied.status, "applied");
  assert.equal((imports[0] as {rows: unknown[]}).rows.length, 1);
});

test("a caller who doesn't manage the event is refused by the review session", async () => {
  const {deps} = harness({authorize: async () => {
    throw new HttpsError("permission-denied", "Only an organizer manager can review this roster intake.");
  }});
  await assert.rejects(importGuestListHandler(call(envelope("preview", LUMA_CSV)), deps),
    (error: {code?: string}) => error.code === "permission-denied");
});

test("an unreadable or unsupported file gets a typed refusal", async () => {
  const {deps} = harness();
  await assert.rejects(importGuestListHandler(call(envelope("preview", "Name\n\"Asha")), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "roster_malformed_csv");
});
