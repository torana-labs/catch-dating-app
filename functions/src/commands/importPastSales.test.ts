/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {commercialTermsRecords, testCommercialTerms} from "../commercialTerms/testFixture";
import type {HostRosterIntakeManageDeps} from "../events/hostRosterIntakeApply";
import {HostRosterIntakeSessionStore} from "../events/hostRosterIntakeSessionStore";
import {GATEWAY_NOTE} from "../salesReport/pastSalesReport";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {importPastSalesHandler, type ImportPastSalesDeps} from "./importPastSales";
import {tryItWorkspaceOrganizerId} from "./workspace";

// Every name, number and address below is fictional.

const UID = "host-1";
const PHONE = "+919000000002";
const WORKSPACE_ORGANIZER = tryItWorkspaceOrganizerId(UID, 1);

const validate = {
  response: contractValidator("ImportPastSalesCallableResponse"),
  workspace: contractValidator("TryItWorkspaceDocument"),
};

function valid(validator: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${schemaErrorMessages(validator as never).join("; ")}`);
}

// Four sold, one cancelled; two checked in, one no-show, one left blank.
// The no-show bought a ticket, so the report counts them.
const SALES_CSV = "Name,Phone,Ticket Type,Amount,Currency,Status\n" +
  "Asha Sample,98765 43210,Early bird,800,INR,checked in\n" +
  "Ravi Sample,98765 43211,Regular,1200,INR,checked in\n" +
  "Meera Sample,98765 43212,Regular,1200,INR,no show\n" +
  "Kabir Sample,98765 43213,Regular,1200,INR,\n" +
  "Tara Sample,98765 43214,Regular,1200,INR,cancelled\n";

const PLAIN_CSV = "Name,Phone\nAsha Sample,98765 43210\nRavi Sample,98765 43211\n";

function harness(options: {terms?: boolean} = {}) {
  const db = new FakeFirestore();
  if (options.terms !== false) {
    for (const [path, value] of Object.entries(commercialTermsRecords())) db.write(path, value);
  }
  const imports: Array<{rows: unknown[]}> = [];
  const store = new HostRosterIntakeSessionStore(db as unknown as FirebaseFirestore.Firestore, () => 1000);
  const intake: HostRosterIntakeManageDeps = {
    store,
    authorize: (async () => undefined) as never,
    rateLimit: async () => undefined,
    loadInitialCurrentRows: async () => new Map(),
    loadTransactionCurrentRows: async () => new Map(),
    importCanonical: async (input) => {
      imports.push(input.payload as never);
      await (db as unknown as FirebaseFirestore.Firestore).runTransaction(async (tx) => {
        await input.authorizeSource(tx, false, "imp_1");
        await input.commitSource(tx, "imp_1", input.payload, "e".repeat(64));
      });
      return {importId: "imp_1", status: "completed", rowCount: input.payload.rows.length,
        createdCount: input.payload.rows.length, updatedCount: 0, skippedCount: 0,
        errors: [], replayed: false};
    },
  };
  const deps: ImportPastSalesDeps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date("2026-11-18T08:00:00.000Z"),
    serverTimestamp: () => "server-time" as unknown as FirebaseFirestore.FieldValue,
    timestampFromMillis: (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0}) as unknown as
      FirebaseFirestore.Timestamp,
    checkRateLimit: (async () => undefined) as never,
    intake: () => intake,
  };
  return {db, deps, imports};
}

async function withWorkspace(options: {terms?: boolean} = {}) {
  const h = harness(options);
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), {
      firestore: h.deps.firestore, now: h.deps.now, serverTimestamp: h.deps.serverTimestamp,
      checkRateLimit: h.deps.checkRateLimit,
    } as never);
  return h;
}

function call(data: unknown, auth: unknown = {uid: UID, token: {phone_number: PHONE}}) {
  return {data, auth, rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>;
}

function envelope(mode: "preview" | "apply", csv: string, input: Record<string, unknown> = {},
  extra: Record<string, unknown> = {}) {
  return {mode, idempotencyKey: "past-sales-request-0001", surface: "website",
    input: {file: {fileName: "sales.csv", contentBase64: Buffer.from(csv, "utf8").toString("base64")}, ...input},
    ...extra};
}

const events = (db: FakeFirestore) => db.entries().filter(([key]) => /^events\/[^/]+$/u.test(key));

test("a caller without a verified phone is refused before the file is read", async () => {
  const {deps} = harness();
  await assert.rejects(importPastSalesHandler(call(envelope("preview", SALES_CSV), {uid: UID, token: {}}), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "phone_not_verified");
});

test("without a workspace, preview asks the caller to set up their profile", async () => {
  const {db, deps} = harness();
  const response = await importPastSalesHandler(call(envelope("preview", SALES_CSV)), deps);
  valid(validate.response, response, "needs input");
  assert.equal(response.status, "needs_input");
  assert.deepEqual(response.result.reasons, ["no_workspace"]);
  assert.equal(response.next[0]?.commandId, "workspace.ensure");
  assert.equal(events(db).length, 0);
});

test("preview reports tickets, sales, attendance and the fee comparison, and stores nothing", async () => {
  const {db, deps, imports} = await withWorkspace();
  const before = JSON.stringify(db.entries());
  const response = await importPastSalesHandler(call(envelope("preview", SALES_CSV, {
    event: {name: "Rooftop Mixer", localDate: "2026-11-14", localStartTime: "20:00"},
    currentFees: {percent: 8, perTicketMinor: 2000, currency: "INR"},
  })), deps);
  valid(validate.response, response, "preview");
  assert.equal(response.status, "previewed");
  const report = response.result.report!;
  assert.equal(report.eventName, "Rooftop Mixer");
  assert.equal(report.localDate, "2026-11-14");
  assert.equal(report.ticketsSold, 4);
  assert.equal(report.grossSalesMinor, 440_000);
  assert.equal(report.currency, "INR");
  assert.equal(report.amountSource, "file");
  assert.deepEqual(report.byTicketType, [{ticketType: "Regular", count: 3, grossMinor: 360_000},
    {ticketType: "Early bird", count: 1, grossMinor: 80_000}]);
  assert.deepEqual(report.attendance, {came: 2, noShows: 2, showRate: 0.5});
  assert.equal(report.guests, null);
  assert.equal(report.guestsReason, "no_earlier_nights");
  assert.equal(report.skippedRows, 1, "the cancelled row");

  const terms = testCommercialTerms();
  const rate = terms.commission.rateBasisPoints;
  assert.deepEqual(report.fees.catch, {feeMinor: 22_000, rateBasisPoints: rate, effectiveRateBasisPoints: rate,
    capMinor: terms.commission.capMinor, capReachedAtMinor: Math.ceil(terms.commission.capMinor! * 10_000 / rate),
    cycleDays: terms.commission.cycleDays, freeTrialDays: terms.trial.days});
  assert.deepEqual(report.fees.current, {feeMinor: 35_200 + 8_000, currency: "INR"});
  assert.equal(report.fees.differenceMinor, 43_200 - 22_000);
  assert.equal(report.fees.gatewayNote, GATEWAY_NOTE);
  assert.ok(response.summary.lines.some((line) => line.includes("less than your current tool")));

  assert.equal(JSON.stringify(db.entries()), before, "preview writes nothing");
  assert.equal(imports.length, 0);
});

test("an export without check-ins or amounts says so, and an estimate fills the sales", async () => {
  const {deps} = await withWorkspace();
  const bare = await importPastSalesHandler(call(envelope("preview", PLAIN_CSV)), deps);
  valid(validate.response, bare, "bare");
  const report = bare.result.report!;
  assert.equal(report.localDate, "2026-11-17", "yesterday in the workspace's city");
  assert.equal(report.eventName, "Past event");
  assert.equal(report.attendance, null);
  assert.equal(report.attendanceReason, "no_checkin_status");
  assert.equal(report.grossSalesMinor, null);
  assert.equal(report.fees.catch, null);
  assert.equal(report.fees.catchReason, "no_sales_amounts");

  const estimated = await importPastSalesHandler(call(envelope("preview", PLAIN_CSV,
    {fallbackTicketPrice: {amountMinor: 50_000, currency: "INR"}})), deps);
  assert.equal(estimated.result.report!.grossSalesMinor, 100_000);
  assert.equal(estimated.result.report!.amountSource, "estimate");
  assert.equal(estimated.result.report!.fees.catch?.feeMinor, 5_000);
});

test("without platform terms, the report keeps the sales and says the fee is unavailable", async () => {
  const {deps} = await withWorkspace({terms: false});
  const response = await importPastSalesHandler(call(envelope("preview", SALES_CSV)), deps);
  valid(validate.response, response, "no terms");
  assert.equal(response.result.report!.grossSalesMinor, 440_000);
  assert.equal(response.result.report!.fees.catch, null);
  assert.equal(response.result.report!.fees.catchReason, "terms_unavailable");
});

test("a future date is refused", async () => {
  const {deps} = await withWorkspace();
  await assert.rejects(importPastSalesHandler(call(envelope("preview", SALES_CSV,
    {event: {name: "Next week", localDate: "2026-11-25"}})), deps),
  (error: {details?: {reason?: string}}) => error.details?.reason === "date_in_future");
});

test("unknown columns ask for a mapping", async () => {
  const {deps} = await withWorkspace();
  const response = await importPastSalesHandler(call(envelope("preview", "Attendee,Contact\nAsha Sample,9876543210\n")), deps);
  valid(validate.response, response, "needs mapping");
  assert.equal(response.status, "needs_input");
  assert.equal(response.result.needsMapping, true);
  assert.deepEqual(response.result.headers, ["Attendee", "Contact"]);
});

test("apply saves a private past draft with its guests and a receipt; a replay returns it", async () => {
  const {db, deps, imports} = await withWorkspace();
  const input = {event: {name: "Rooftop Mixer", localDate: "2026-11-14", localStartTime: "20:00"}};
  const preview = await importPastSalesHandler(call(envelope("preview", SALES_CSV, input)), deps);
  const confirm = {commandId: "sales.import-past", previewHash: preview.previewHash};

  await assert.rejects(importPastSalesHandler(call(envelope("apply", SALES_CSV, input,
    {confirm: {commandId: "sales.import-past", previewHash: "0".repeat(64)}})), deps),
  (error: {details?: {reason?: string}}) => error.details?.reason === "changed_since_preview");

  const applied = await importPastSalesHandler(call(envelope("apply", SALES_CSV, input, {confirm})), deps);
  valid(validate.response, applied, "apply");
  assert.equal(applied.status, "applied");
  const eventId = applied.result.eventId!;
  const event = db.read(`events/${eventId}`)!;
  assert.equal(event.organizerId, WORKSPACE_ORGANIZER);
  assert.equal(event.name, "Rooftop Mixer");
  assert.deepEqual([event.publicationState, event.publicRegistrationEnabled, event.status], ["private", false, "active"]);
  assert.deepEqual([event.eventLocalDate, event.eventLocalStartTime], ["2026-11-14", "20:00"]);
  // The guest list keeps the guest list's rule: the no-show and the
  // cancelled guest are left off it.
  assert.deepEqual(applied.result.import, {importId: "imp_1", createdCount: 3, updatedCount: 0});
  assert.equal(imports.length, 1);
  assert.equal(imports[0].rows.length, 3);
  assert.match(applied.receiptId ?? "", /^salesImportPast_[a-f0-9]{64}$/u);
  const pointer = db.read(`tryItWorkspaces/${UID}`);
  valid(validate.workspace, pointer, "workspace");
  assert.deepEqual(pointer?.tryItEventIds, [eventId]);

  const replayed = await importPastSalesHandler(call(envelope("apply", SALES_CSV, input, {confirm})), deps);
  assert.equal(replayed.status, "replayed");
  assert.equal(replayed.result.eventId, eventId);
  assert.equal(imports.length, 1);
  assert.equal(events(db).length, 1);
});

test("a second night counts guests seen on the first as repeat guests", async () => {
  const {db, deps} = await withWorkspace();
  const first = await importPastSalesHandler(call(envelope("preview", SALES_CSV)), deps);
  await importPastSalesHandler(call(envelope("apply", SALES_CSV, {}, {confirm: {commandId: "sales.import-past",
    previewHash: first.previewHash}})), deps);
  const firstEvent = (db.read(`tryItWorkspaces/${UID}`)?.tryItEventIds as string[])[0];
  db.write("eventAttendees/seen-1", {eventId: firstEvent, phoneE164: "+919876543210"});
  db.write("eventAttendees/seen-2", {eventId: firstEvent, phoneE164: "+919876543211"});
  const second = await importPastSalesHandler(call({...envelope("preview",
    "Name,Phone\nAsha Sample,98765 43210\nNew Sample,98765 43299\n"), idempotencyKey: "past-sales-request-0002"}), deps);
  assert.deepEqual(second.result.report!.guests, {firstTime: 1, repeat: 1});
  assert.equal(second.result.report!.guestsReason, null);
});
