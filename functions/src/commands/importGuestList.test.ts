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
import {
  GUEST_MAPPING_MODEL_POLICY,
  guestMappingProposalProvider,
  type GuestMappingModelRunner,
} from "../guestImport/mappingFallback";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {importGuestListHandler, type ImportGuestListDeps} from "./importGuestList";
import {tryItWorkspaceOrganizerId} from "./workspace";

// Every name, number and address below is fictional.

const UID = "host-1";
const PHONE = "+919000000002";
const EVENT = "event-1";
const ORGANIZER = "organizer-1";

const validate = {
  response: contractValidator("ImportGuestListCallableResponse"),
  shape: contractValidator("GuestImportHeaderShapeDocument"),
  workspace: contractValidator("TryItWorkspaceDocument"),
};

function valid(validator: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${schemaErrorMessages(validator as never).join("; ")}`);
}

const LUMA_CSV = "Name,Approval Status,Registration Date,Ticket Type,Guest Key,Phone\n" +
  "Asha Sample,approved,2026-11-01,General,g-1,98765 43210\n" +
  "Ravi Sample,waitlist,2026-11-01,General,g-2,98765 43211\n";

function harness(options: {authorize?: () => Promise<void>;
  mappingProvider?: ImportGuestListDeps["mappingProvider"]} = {}) {
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
    serverTimestamp: () => "server-time" as unknown as FirebaseFirestore.FieldValue,
    timestampFromMillis: (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0}) as unknown as
      FirebaseFirestore.Timestamp,
    checkRateLimit: (async () => undefined) as never,
    intake: () => intake,
    mappingProvider: options.mappingProvider ?? (() => guestMappingProposalProvider()),
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

function sessionEnvelope(mode: "preview" | "apply", sessionId: string, extra: Record<string, unknown> = {},
  input: Record<string, unknown> = {}) {
  return {mode, idempotencyKey: "guest-import-session-0001", surface: "catch_host",
    input: {sessionId, ...input}, ...extra};
}

test("a review session is previewed, revised and saved by its id, without the file", async () => {
  const {deps, imports} = harness();
  const csv = "Name,Phone\nAsha Sample,9876543210\nRavi Sample,12\n";
  const started = await importGuestListHandler(call(envelope("preview", csv)), deps);
  const sessionId = started.result.sessionId!;

  const preview = await importGuestListHandler(call(sessionEnvelope("preview", sessionId)), deps);
  valid(validate.response, preview, "session preview");
  assert.equal(preview.status, "previewed");
  assert.equal(preview.result.sessionId, sessionId);
  assert.equal(preview.result.eventId, EVENT);
  assert.equal(preview.result.converter.id, "review-session-v1");
  assert.equal(preview.result.eligibleForApply, false);
  const flagged = preview.result.rows.find((row) => row.kind === "needsReview")!;

  const excluded = {excludedRowIds: [flagged.rowId]};
  const revised = await importGuestListHandler(call(sessionEnvelope("preview", sessionId, {}, excluded)), deps);
  assert.equal(revised.result.eligibleForApply, true);
  assert.notEqual(revised.previewHash, preview.previewHash);

  const confirm = {commandId: "guests.import-list", previewHash: revised.previewHash};
  await assert.rejects(importGuestListHandler(call(sessionEnvelope("apply", sessionId,
    {confirm: {commandId: "guests.import-list", previewHash: preview.previewHash}}, excluded)), deps),
  (error: {details?: {reason?: string}}) => error.details?.reason === "changed_since_preview");
  const applied = await importGuestListHandler(call(sessionEnvelope("apply", sessionId, {confirm}, excluded)), deps);
  valid(validate.response, applied, "session apply");
  assert.equal(applied.status, "applied");
  assert.match(applied.receiptId ?? "", /^guestsImportList_[a-f0-9]{64}$/u);
  assert.equal((imports[0] as {rows: unknown[]}).rows.length, 1);

  const replayed = await importGuestListHandler(call(sessionEnvelope("apply", sessionId, {confirm}, excluded)), deps);
  assert.equal(replayed.status, "replayed");
  assert.equal(imports.length, 1);
});

test("with only an event, preview opens the newest guest list waiting for review there", async () => {
  const {deps} = harness();
  const reason = (code: string) => (error: {details?: {reason?: string}}) => error.details?.reason === code;
  const only = {mode: "preview", idempotencyKey: "guest-import-latest-01", surface: "catch_host", input: {eventId: EVENT}};
  await assert.rejects(importGuestListHandler(call(only), deps), reason("no_draft_in_review"));
  const started = await importGuestListHandler(call(envelope("preview", LUMA_CSV)), deps);
  const waiting = await importGuestListHandler(call(only), deps);
  valid(validate.response, waiting, "latest");
  assert.equal(waiting.result.sessionId, started.result.sessionId);
  assert.equal(waiting.result.fileName, "guests.csv");
  await assert.rejects(importGuestListHandler(call({...only, mode: "apply"}), deps), reason("roster_missing_file"));
});

test("a review session refuses a file or mapping alongside it, another event, or an unknown id", async () => {
  const {deps} = harness();
  const started = await importGuestListHandler(call(envelope("preview", LUMA_CSV)), deps);
  const sessionId = started.result.sessionId!;
  const reason = (code: string) => (error: {details?: {reason?: string}}) => error.details?.reason === code;
  await assert.rejects(importGuestListHandler(call(sessionEnvelope("preview", sessionId, {},
    {mapping: {displayName: 0}})), deps), reason("session_input_conflict"));
  await assert.rejects(importGuestListHandler(call({...envelope("preview", LUMA_CSV), input: {...envelope("preview",
    LUMA_CSV).input, sessionId}}), deps), reason("session_input_conflict"));
  await assert.rejects(importGuestListHandler(call(sessionEnvelope("preview", sessionId, {},
    {eventId: "event-2"})), deps), reason("session_event_mismatch"));
  await assert.rejects(importGuestListHandler(call(sessionEnvelope("preview", "missing-session")), deps),
    reason("session_not_found"));
  await assert.rejects(importGuestListHandler(call({mode: "preview", idempotencyKey: "guest-import-0009",
    surface: "cli", input: {eventId: EVENT, excludedRowIds: ["row-1"]}}), deps), reason("roster_missing_file"));
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

test("preview suggests merges and tags, each with its reason", async () => {
  const {db, deps} = harness();
  db.write("organizerContacts/oc-1", {organizerId: ORGANIZER, displayName: "Asha S.",
    phoneE164: "+919876543210", email: null, deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null});
  db.write("organizerContacts/oc-other", {organizerId: "organizer-2", displayName: "Someone Else",
    phoneE164: "+919876543211", email: null, deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null});
  const csv = "Name,Phone,Email,Ticket Type,Attendee ID\n" +
    "Asha Sample,98765 43210,buyer@example.com,VIP,t-1\n" +
    "Ravi Sample,98765 43211,buyer@example.com,General,t-2\n";
  const preview = await importGuestListHandler(call(envelope("preview", csv)), deps);
  valid(validate.response, preview, "suggestions");
  const reasons = preview.result.suggestions.map((suggestion) =>
    [suggestion.rowId, suggestion.kind, suggestion.reason, suggestion.contactId ?? suggestion.otherRowId ?? suggestion.tag]);
  assert.deepEqual(reasons, [
    ["2", "merge", "samePhone", "oc-1"],
    ["2", "tag", "seenBefore", "oc-1"],
    ["2", "tag", "ticketType", "VIP"],
    ["3", "merge", "sameEmailInFile", "2"],
    ["3", "tag", "ticketType", "General"],
  ]);
  assert.ok(preview.summary.lines.some((line) => line.startsWith("1 guest looks like someone already in your contacts")));
});

test("city, revenue and statuses read as Catch Host's import sheet reads them", async () => {
  const {db, deps} = harness();
  const csv = "Name,Phone,City,Amount,Currency,Status\n" +
    "Asha Sample,9876543210,mumbai,\"1,499.50\",inr,Confirmed\n" +
    "Ravi Sample,9876543211,Atlantis,499,INR,Going\n" +
    "Mira Sample,9876543212,,,,Refunded\n" +
    "Kabir Sample,9876543213,,,,Maybe later\n" +
    "Zoya Sample,9876543214,,,,\n";
  const preview = await importGuestListHandler(call(envelope("preview", csv, {}, {
    fallbackRevenue: {amountMinor: 50000, currency: "INR"}})), deps);
  valid(validate.response, preview, "parity");
  assert.deepEqual(preview.result.mapping, {displayName: 0, phone: 1, email: null,
    externalReference: null, arrivalGroup: null, ticketType: null, status: 5,
    city: 2, revenueAmount: 3, revenueCurrency: 4});
  assert.deepEqual(preview.result.skipped, [{sourceRowNumber: 4, reason: "excluded-status"}]);
  const byRow = new Map(preview.result.rows.map((row) => [row.rowId, row]));
  assert.equal(byRow.get("2")?.kind, "add");
  assert.equal(byRow.get("3")?.issueCode, "invalid-city");
  assert.equal(byRow.get("5")?.issueCode, "unknown-status");
  const stored = db.read(`hostRosterIntakeSessions/${preview.result.sessionId}`) as {
    draft: {rows: Array<{value: Record<string, unknown>; fields: Record<string, {origin: string}>}>}};
  const asha = stored.draft.rows.find((row) => row.value.rowId === "2")!;
  assert.equal(asha.value.cityMarketId, "in-mh-mumbai");
  assert.equal(asha.value.revenueAmountMinor, 149950);
  assert.equal(asha.value.revenueCurrency, "INR");
  assert.equal(asha.value.revenueSource, "hostImport");
  const zoya = stored.draft.rows.find((row) => row.value.rowId === "6")!;
  assert.equal(zoya.value.revenueAmountMinor, 50000);
  assert.equal(zoya.value.revenueSource, "hostEstimate");
  assert.equal(zoya.fields.revenueAmountMinor.origin, "hostCorrection");
});

test("the model fallback is off: unknown columns go to the host", async () => {
  assert.equal(GUEST_MAPPING_MODEL_POLICY.provider.enabled, false);
  assert.equal(guestMappingProposalProvider(), null);
  assert.throws(() => guestMappingProposalProvider({policy: {...GUEST_MAPPING_MODEL_POLICY,
    provider: {...GUEST_MAPPING_MODEL_POLICY.provider, enabled: true}}}), /guest_mapping_policy_not_ready/u);
});

test("when switched on, the model sees headers and shapes only, and its columns are stored as modelProposal", async () => {
  const requests: unknown[] = [];
  const costs: number[] = [];
  const runner: GuestMappingModelRunner = {run: async (request) => {
    requests.push(request.input);
    costs.push(request.maxCostMicros);
    return {output: {mapping: {displayName: 0, phone: 1}, confidence: 0.8}};
  }};
  const policy = {...GUEST_MAPPING_MODEL_POLICY,
    provider: {...GUEST_MAPPING_MODEL_POLICY.provider, enabled: true, modelId: "fixture-model", decisionId: "fixture-decision"},
    budgets: {...GUEST_MAPPING_MODEL_POLICY.budgets, maxModelCallsPerMonth: 10, maxModelCallsPerProfilePerMonth: 2,
      maxInputTokensPerCall: 500, maxOutputTokensPerCall: 200, maxCostMicrosPerCall: 900, maxCostMicrosPerMonth: 100000}};
  const {db, deps} = harness({mappingProvider: () => guestMappingProposalProvider({policy, runner})});
  const csv = "Attendee,Contact,Seat\nAsha Sample,9876543210,A1\n";
  const preview = await importGuestListHandler(call(envelope("preview", csv)), deps);
  valid(validate.response, preview, "model mapping");
  assert.equal(preview.status, "previewed");
  assert.equal(preview.result.mappedBy, "model");
  assert.equal(preview.result.aiRead, true);
  assert.deepEqual(preview.result.reviewFields, ["displayName", "phone"]);
  assert.equal(preview.result.counts.add, 1);
  assert.deepEqual(requests, [{headers: ["Attendee", "Contact", "Seat"], columnShapes: ["text", "phone-like", "text"]}]);
  // One call's ceiling, never the month's budget (#2062).
  assert.deepEqual(costs, [900]);
  assert.equal(JSON.stringify(requests).includes("Asha"), false);
  const stored = db.read(`hostRosterIntakeSessions/${preview.result.sessionId}`) as {draft: {rows: Array<{fields: Record<string, {origin: string; confidence: number | null}>}>}};
  assert.deepEqual(stored.draft.rows[0].fields.displayName, {column: 0, header: "Attendee", origin: "modelProposal", confidence: 0.8});
  assert.ok(preview.summary.lines.some((line) => line.startsWith("We guessed which column")));
});

test("an unusable model proposal falls back to the host mapping", async () => {
  const runner: GuestMappingModelRunner = {run: async () => ({output: {mapping: {phone: 1}, confidence: 0.4}})};
  const policy = {...GUEST_MAPPING_MODEL_POLICY,
    provider: {...GUEST_MAPPING_MODEL_POLICY.provider, enabled: true, modelId: "fixture-model", decisionId: "fixture-decision"},
    budgets: {...GUEST_MAPPING_MODEL_POLICY.budgets, maxModelCallsPerMonth: 10, maxModelCallsPerProfilePerMonth: 2,
      maxOutputTokensPerCall: 200, maxCostMicrosPerCall: 900}};
  const {deps} = harness({mappingProvider: () => guestMappingProposalProvider({policy, runner})});
  const response = await importGuestListHandler(call(envelope("preview", "Attendee,Contact\nAsha Sample,9876543210\n")), deps);
  assert.equal(response.status, "needs_input");
});

// Try-it workspace target (owner decision on #2061, question 1 (a)).

const WORKSPACE_ORGANIZER = tryItWorkspaceOrganizerId(UID, 1);

async function withWorkspace() {
  const h = harness();
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), {
      firestore: h.deps.firestore, now: h.deps.now, serverTimestamp: h.deps.serverTimestamp,
      checkRateLimit: h.deps.checkRateLimit,
    } as never);
  return h;
}

function websiteEnvelope(mode: "preview" | "apply", csv: string, extra: Record<string, unknown> = {}) {
  const envelopeData = envelope(mode, csv, {surface: "website", ...extra});
  delete (envelopeData.input as {eventId?: string}).eventId;
  return envelopeData;
}

const events = (db: FakeFirestore) => db.entries().filter(([key]) => /^events\/[^/]+$/u.test(key));

test("with no event and no workspace, the caller is asked to set up their profile", async () => {
  const {db, deps} = harness();
  await assert.rejects(importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "no_workspace");
  assert.equal(events(db).length, 1, "only the seeded event");
});

test("with no event, guests go on one private placeholder draft recorded on the workspace", async () => {
  const {db, deps, imports} = await withWorkspace();
  const preview = await importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps);
  valid(validate.response, preview, "preview");
  assert.equal(preview.status, "previewed");
  const eventId = preview.result.eventId;
  assert.notEqual(eventId, EVENT);
  const event = db.read(`events/${eventId}`)!;
  assert.equal(event.organizerId, WORKSPACE_ORGANIZER);
  assert.equal(event.name, "Guest list");
  assert.deepEqual([event.publicationState, event.publicRegistrationEnabled, event.status], ["private", false, "active"]);
  assert.deepEqual([event.eventLocalDate, event.eventLocalStartTime, event.eventTimezone], ["2026-12-02", "19:00", "Asia/Kolkata"]);
  assert.ok(preview.summary.lines.some((line) => line.includes("\"Guest list\"")));
  const pointer = db.read(`tryItWorkspaces/${UID}`);
  valid(validate.workspace, pointer, "workspace");
  assert.deepEqual(pointer?.tryItEventIds, [eventId]);

  const again = await importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps);
  assert.equal(again.result.eventId, eventId, "the same draft is reused");
  assert.equal(again.previewHash, preview.previewHash);

  const confirm = {commandId: "guests.import-list", previewHash: preview.previewHash};
  const applied = await importGuestListHandler(call(websiteEnvelope("apply", LUMA_CSV, {confirm})), deps);
  valid(validate.response, applied, "apply");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.eventId, eventId);
  assert.equal(imports.length, 1);
  assert.deepEqual(db.read(`tryItWorkspaces/${UID}`)?.tryItEventIds, [eventId]);
  assert.equal(events(db).length, 2, "the seeded event and one placeholder");
});

test("with no event, guests go on the workspace's imported draft while it stays private", async () => {
  const {db, deps} = await withWorkspace();
  db.write("events/imported-1", {organizerId: WORKSPACE_ORGANIZER, publicationState: "private", status: "active"});
  db.write("events/older-1", {organizerId: WORKSPACE_ORGANIZER, publicationState: "private", status: "active"});
  db.write(`tryItWorkspaces/${UID}`, {...db.read(`tryItWorkspaces/${UID}`), tryItEventIds: ["older-1", "imported-1"]});
  const preview = await importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps);
  assert.equal(preview.result.eventId, "imported-1", "the newest try-it draft");
  assert.ok(preview.summary.lines.includes("Guests go on your private draft event in your profile."));

  db.write("events/imported-1", {organizerId: WORKSPACE_ORGANIZER, publicationState: "published", status: "active"});
  const published = await importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps);
  assert.equal(published.result.eventId, "older-1", "a published event is no longer a try-it draft");
});

test("with no event, a past night saved on the workspace is skipped for the next draft", async () => {
  const {db, deps} = await withWorkspace();
  const past = {_seconds: Math.floor(Date.parse("2026-11-10T13:30:00.000Z") / 1000), _nanoseconds: 0};
  const next = {_seconds: Math.floor(Date.parse("2026-12-02T13:30:00.000Z") / 1000), _nanoseconds: 0};
  db.write("events/upcoming-1", {organizerId: WORKSPACE_ORGANIZER, publicationState: "private", status: "active", startTime: next});
  db.write("events/past-1", {organizerId: WORKSPACE_ORGANIZER, publicationState: "private", status: "active", startTime: past});
  db.write(`tryItWorkspaces/${UID}`, {...db.read(`tryItWorkspaces/${UID}`), tryItEventIds: ["upcoming-1", "past-1"]});
  const preview = await importGuestListHandler(call(websiteEnvelope("preview", LUMA_CSV)), deps);
  assert.equal(preview.result.eventId, "upcoming-1", "a night that already happened is a record, not the draft");
});

test("a named event is used as it is, and the workspace is not touched", async () => {
  const {db, deps} = await withWorkspace();
  const before = db.read(`tryItWorkspaces/${UID}`);
  const preview = await importGuestListHandler(call(envelope("preview", LUMA_CSV, {surface: "website"})), deps);
  assert.equal(preview.result.eventId, EVENT);
  assert.deepEqual(db.read(`tryItWorkspaces/${UID}`), before);
});
