/* eslint-disable max-len */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {ImportPastSalesCallablePayload} from
  "../shared/generated/importPastSalesCallablePayload";
import type {ImportPastSalesCallableResponse} from
  "../shared/generated/importPastSalesCallableResponse";
import {validateImportPastSalesCallablePayload} from
  "../shared/generated/validators/importPastSalesInput";
import {effectiveCommercialTerms, readCommercialTerms} from "../commercialTerms/resolver";
import type {CommercialTerms} from "../commercialTerms/terms";
import {
  applyHostRosterIntake,
  defaultHostRosterIntakeApplyDeps,
  reviewResponse,
  startHostRosterIntake,
  type HostRosterIntakeManageDeps,
} from "../events/hostRosterIntakeApply";
import {createPrivateEventSetup} from "../events/progressiveSetup/service";
import type {CanonicalGuestRead, GuestColumnMapping} from "../guestImport/canonical";
import {columnShapes} from "../guestImport/columnShapes";
import {readGuestFile, type GuestFileRead} from "../guestImport/file";
import {guestIntakeInput} from "../guestImport/intakeRows";
import {suggestExtraMapping, type GuestExtraMapping} from "../guestImport/mapping";
import {readGuestTable} from "../guestImport/registry";
import {normalizeHeader, uniqueHeaders} from "../guestImport/table";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {NO_SHOW, pastSalesReport, type EarlierGuests, type PastSalesReport} from "../salesReport/pastSalesReport";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandReceiptKey,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";
import {recordTryItEvent} from "./guestListTarget";
import {localDateTime} from "./importEventFromLink";
import {readTryItWorkspace, type WorkspaceLookup} from "./workspace";

// Command sales.import-past (contracts/commands/catalog.json; #2062 C7). A
// phone-verified visitor with a try-it workspace sends one past night's guest
// or sales export. The file is read by the guest import converters
// (functions/src/guestImport), and the report is built from the rows as the
// import would save them (salesReport/pastSalesReport.ts), with Catch's fee
// from the platform's commercial terms. Preview stores nothing. Apply makes a
// private past draft event in the workspace through event setup, saves the
// guests through the guest import review session (the path guests.import-list
// applies through), records the event on the workspace and writes the
// receipt. Nothing publishes or messages anyone. The numbers-only path (three
// numbers, no sign-in) is the website's own calculator, not this command.

export const COMMAND_ID = "sales.import-past";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_EVENT_NAME = "Past event";
const DEFAULT_START_TIME = "19:00";
const EARLIER_EVENTS = 10;
const EARLIER_GUESTS = 1000;

type Response = ImportPastSalesCallableResponse;
type Input = ImportPastSalesCallablePayload["input"];
type Data = Record<string, unknown>;

export interface ImportPastSalesDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof defaultCheckRateLimit;
  intake: () => HostRosterIntakeManageDeps;
}

const defaultDeps: ImportPastSalesDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  checkRateLimit: defaultCheckRateLimit,
  intake: () => defaultHostRosterIntakeApplyDeps(),
};

const FILE_ERRORS: Record<string, string> = {
  roster_file_too_large: "This file is over 5 MB.",
  roster_unsupported_file: "Send a CSV, XLSX or vCard (.vcf) file.",
  roster_unreadable_xlsx: "This spreadsheet couldn't be opened.",
  roster_expanded_file_too_large: "This spreadsheet is too large to read.",
  roster_missing_worksheet: "This spreadsheet has no rows.",
  roster_malformed_csv: "This CSV has an unclosed quote.",
  roster_missing_rows: "This file needs a header row and at least one guest.",
  roster_too_many_columns: "This file has more than 40 columns.",
  roster_invalid_mapping: "A chosen column isn't in this file.",
  roster_duplicate_mapped_column: "Each column can fill only one field.",
  roster_missing_guest_names: "No row in this file has a guest name.",
};

/** Everything a preview read, recomputed the same way on apply. */
interface Reading {
  organizerId: string;
  marketTimeZone: string;
  market: NonNullable<ReturnType<typeof marketForIdOrAlias>>;
  file: GuestFileRead;
  fileFingerprint: string;
  headers: string[];
  shapes: string[];
  read: CanonicalGuestRead | null;
  intake: ReturnType<typeof guestIntakeInput> | null;
  report: PastSalesReport | null;
  needsReview: Response["result"]["rowsNeedingReview"];
  eventName: string;
  localDate: string;
  localStartTime: string;
  requestInput: Data;
}

export async function importPastSalesHandler(request: CallableRequest<unknown>,
  deps: ImportPastSalesDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<ImportPastSalesCallablePayload>(request,
    validateImportPastSalesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "importPastSales", {maxRequests: 60, windowMs: HOUR_MS});

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
  if (lookup.kind === "new") {
    if (data.mode === "apply") {
      throw new HttpsError("failed-precondition", "Set up your organizer profile first.", {reason: "no_workspace"});
    }
    return empty(caller.uid, data.input, "needs_input", ["no_workspace"]);
  }
  const reading = await readNight(db, deps, lookup, data.input);
  const hash = commandPreviewHash(COMMAND_ID, caller.uid, reading.requestInput,
    {report: reading.report, needsReview: reading.needsReview.map((row) => row.rowId), needsMapping: !reading.read});
  if (!reading.read || !reading.report) {
    if (data.mode === "apply") {
      throw new HttpsError("failed-precondition", "Choose the file's columns first.", {reason: "needs_mapping"});
    }
    return respond(reading, "needs_input", hash, {reasons: ["needs_mapping"]});
  }
  if (data.mode === "preview") return respond(reading, "previewed", hash, {});
  return apply(db, deps, caller.uid, data, reading, hash);
}

export const importPastSales = onCall(appCheckCallableOptions, (request) => importPastSalesHandler(request));

/** Reads the file and builds the report; writes nothing. */
async function readNight(db: FirebaseFirestore.Firestore, deps: ImportPastSalesDeps,
  lookup: Exclude<WorkspaceLookup, {kind: "new"}>, input: Input): Promise<Reading> {
  const organizerId = lookup.kind === "existing" ? lookup.pointer.organizerId : lookup.organizerId;
  const market = marketForIdOrAlias(marketIdOf(lookup.organizer));
  if (!market || !market.eventCreatable) {
    throw new HttpsError("failed-precondition", "Your profile's city isn't open for events yet.",
      {reason: "city_unavailable"});
  }
  const today = localDateTime(deps.now().toISOString(), market.timeZone).date;
  const yesterday = localDateTime(new Date(deps.now().getTime() - DAY_MS).toISOString(), market.timeZone).date;
  const localDate = input.event?.localDate ?? yesterday;
  if (localDate > today) {
    throw new HttpsError("invalid-argument", "Choose a date that has already happened.", {reason: "date_in_future"});
  }
  const eventName = input.event?.name?.trim() || DEFAULT_EVENT_NAME;
  const localStartTime = input.event?.localStartTime ?? DEFAULT_START_TIME;

  const bytes = Buffer.from(input.file.contentBase64, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_BYTES) throw refusal("roster_file_too_large");
  const fileFingerprint = createHash("sha256").update(bytes).digest("hex");
  let file: GuestFileRead;
  try {
    file = await readGuestFile({fileName: input.file.fileName, bytes});
  } catch (error) {
    throw refusal(errorCode(error));
  }
  if (file.matrix.length < 2) throw refusal("roster_missing_rows");
  const headers = uniqueHeaders(file.matrix[0]).slice(0, 41);
  const shapes = columnShapes(headers, file.matrix.slice(1));
  const requestInput = {fileFingerprint, fileName: input.file.fileName, eventName, localDate, localStartTime,
    mapping: input.mapping ?? null, fallbackTicketPrice: input.fallbackTicketPrice ?? null,
    currentFees: input.currentFees ?? null, excludedRowIds: [...(input.excludedRowIds ?? [])].sort()};
  const base = {organizerId, marketTimeZone: market.timeZone, market, file, fileFingerprint, headers, shapes,
    eventName, localDate, localStartTime, requestInput};

  const {city, revenueAmount, revenueCurrency, ...canonicalMapping} = input.mapping ?? {};
  const suggested = suggestExtraMapping(headers);
  const extraMapping: GuestExtraMapping = {
    city: city === undefined ? suggested.city : city,
    revenueAmount: revenueAmount === undefined ? suggested.revenueAmount : revenueAmount,
    revenueCurrency: revenueCurrency === undefined ? suggested.revenueCurrency : revenueCurrency,
  };
  if (Object.values(extraMapping).some((column) => column !== null && column >= headers.length)) {
    throw refusal("roster_invalid_mapping");
  }
  const tableOptions = {converterId: file.converterId ?? undefined,
    mapping: input.mapping ? canonicalMapping as Partial<GuestColumnMapping> : undefined,
    reviewStatuses: true,
    reservedColumns: Object.values(extraMapping).filter((column): column is number => column !== null)};
  let read: CanonicalGuestRead;
  try {
    read = readGuestTable(file.matrix, tableOptions);
  } catch (error) {
    const code = errorCode(error);
    if (code === "roster_missing_name_column") {
      return {...base, read: null, intake: null, report: null, needsReview: []};
    }
    throw refusal(code);
  }
  if (read.rows.length === 0) throw refusal("roster_missing_guest_names");
  const fallback = input.fallbackTicketPrice ?? null;
  const intake = guestIntakeInput(read, {extraMapping, fallbackRevenue: fallback});
  const excluded = new Set(input.excludedRowIds ?? []);
  const needsReview = intake.rows.filter((row) => (row.issues?.length ?? 0) > 0 && !excluded.has(row.value.rowId))
    .slice(0, 250).map((row) => ({rowId: row.value.rowId.slice(0, 120), sourceRowNumber: row.sourceRowNumber,
      displayName: row.value.displayName.slice(0, 120), issues: (row.issues ?? []).slice(0, 10)}));
  // The guest list leaves no-shows out, but they bought a ticket: the report
  // reads the file again with their status cleared, and names their rows.
  const noShow = noShowRead(file.matrix, read, tableOptions);
  const reportRead = noShow?.read ?? read;
  const reportRows = noShow ? guestIntakeInput(noShow.read, {extraMapping, fallbackRevenue: fallback}).rows :
    intake.rows;
  const report = pastSalesReport({read: reportRead, rows: reportRows, excludedRowIds: excluded,
    noShowRowIds: noShow?.rowIds ?? new Set(), eventName, localDate,
    terms: await platformTerms(db, organizerId), currentFees: input.currentFees ?? null,
    earlier: await earlierGuests(db, lookup)});
  return {...base, read, intake, report, needsReview};
}

/**
 * The file read again with each no-show status cleared, and those rows' ids
 * (the source row number, as the reader numbers them); null when the export
 * marks no one as a no-show.
 */
function noShowRead(matrix: string[][], read: CanonicalGuestRead,
  options: Parameters<typeof readGuestTable>[1]): {read: CanonicalGuestRead; rowIds: Set<string>} | null {
  const column = read.mapping.status;
  if (column === null) return null;
  const rowIds = new Set<string>();
  const cleared = matrix.map((row, index) => {
    if (index === 0 || !NO_SHOW.has(normalizeHeader(row[column] ?? ""))) return row;
    rowIds.add(String(index + 1));
    return row.map((cell, cellIndex) => cellIndex === column ? "" : cell);
  });
  if (rowIds.size === 0) return null;
  return {read: readGuestTable(cleared, {...options, mapping: read.mapping}), rowIds};
}

/** The terms Catch would bill this organizer on, or null while they aren't set. */
async function platformTerms(db: FirebaseFirestore.Firestore, organizerId: string): Promise<CommercialTerms | null> {
  try {
    return effectiveCommercialTerms(await readCommercialTerms({db, organizerId}));
  } catch (error) {
    logger.warn("Commercial terms unavailable for a past sales report.",
      {error: error instanceof Error ? error.message : String(error)});
    return null;
  }
}

/** Guests on the workspace's earlier try-it nights, by phone and email; null when there are none. */
async function earlierGuests(db: FirebaseFirestore.Firestore,
  lookup: Exclude<WorkspaceLookup, {kind: "new"}>): Promise<EarlierGuests | null> {
  const eventIds = lookup.kind === "existing" ? [...(lookup.pointer.tryItEventIds ?? [])].slice(-EARLIER_EVENTS) : [];
  const phones = new Set<string>();
  const emails = new Set<string>();
  let guests = 0;
  for (const eventId of eventIds) {
    const snap = await db.collection("eventAttendees").where("eventId", "==", eventId).limit(EARLIER_GUESTS).get();
    for (const doc of snap.docs) {
      const value = doc.data();
      guests += 1;
      if (typeof value.phoneE164 === "string") phones.add(value.phoneE164);
      if (typeof value.email === "string") emails.add(value.email.toLowerCase());
    }
  }
  return guests === 0 ? null : {phones, emails};
}

/**
 * Apply: replay a finished apply, refuse a changed preview or rows still
 * needing a look, make the past draft event, save the guests through the
 * review session, then record the event on the workspace with the receipt.
 */
async function apply(db: FirebaseFirestore.Firestore, deps: ImportPastSalesDeps, uid: string,
  data: ImportPastSalesCallablePayload, reading: Reading, hash: string): Promise<Response> {
  const requestHash = commandRequestHash(COMMAND_ID, uid, reading.requestInput, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, uid, data.idempotencyKey);
  const replay = await db.runTransaction((tx) => replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid,
    idempotencyKey: data.idempotencyKey, requestHash, nowMillis: deps.now().getTime()}));
  if (replay) return {...replay.response, status: "replayed" as const};
  assertConfirmMatches(COMMAND_ID, data.confirm, hash);
  if (reading.needsReview.length > 0) {
    throw new HttpsError("failed-precondition", "Some guests need a look first: fix them in the file, or leave them out.",
      {reason: "needs_review"});
  }
  const intake = reading.intake!;
  const commandKey = commandReceiptKey(uid, data.idempotencyKey);
  // Event setup replays its own receipt per request id, so a retry after an
  // unknown outcome reuses the same past draft.
  const setup = await createPrivateEventSetup({actorUid: uid, command: {organizerId: reading.organizerId,
    requestId: `pastsales-${createHash("sha256").update(commandKey).digest("hex").slice(0, 40)}`,
    basics: {name: reading.eventName, city: {mode: "set", value: {cityId: reading.market.cityId,
      marketId: reading.market.marketId}}, localDate: reading.localDate, localStartTime: reading.localStartTime,
    timezone: {mode: "set", value: reading.marketTimeZone}}},
  deps: {db, timestampFromMillis: deps.timestampFromMillis, serverTimestamp: deps.serverTimestamp}});
  const eventId = setup.eventId;
  // Recorded at once, so the expiry sweep sees the draft even if the guest
  // save below fails.
  await recordTryItEvent(db, deps, {uid, eventId, commandId: COMMAND_ID, surface: data.surface,
    organizerName: null});

  const intakeDeps = deps.intake();
  const excluded = reading.requestInput.excludedRowIds as string[];
  const review = await asHttps(async () => {
    let draft = await startHostRosterIntake(intakeDeps, {hostUid: uid, organizerId: reading.organizerId, eventId,
      fileFingerprint: reading.fileFingerprint, fileName: String(reading.requestInput.fileName),
      format: reading.file.format === "xlsx" ? "xlsx" : "csv", headers: intake.headers, mapping: intake.mapping,
      rows: intake.rows});
    if (draft.state === "review" && JSON.stringify([...draft.excludedRowIds].sort()) !== JSON.stringify(excluded)) {
      draft = await intakeDeps.store.revise({sessionId: draft.sessionId, hostUid: uid,
        expectedRevision: draft.revision, rows: draft.rows, excludedRowIds: excluded, mapping: draft.mapping},
      intakeDeps.authorize);
    }
    return reviewResponse(draft, intakeDeps);
  });
  const preview = review.preview;
  if (!preview) throw new HttpsError("internal", "Roster intake review is missing.");
  if (review.draft.state === "review" && !preview.eligibleForApply) {
    throw new HttpsError("failed-precondition", "Some guests need a look before this night can be saved.",
      {reason: "needs_review"});
  }
  const imported = review.draft.state === "applied" ? null :
    await asHttps(() => applyHostRosterIntake({hostUid: uid, sessionId: review.draft.sessionId,
      reviewHash: preview.reviewHash}, intakeDeps));
  const applied = respond(reading, "applied", hash, {receiptId, eventId,
    imported: imported ? {importId: imported.importId, createdCount: imported.createdCount,
      updatedCount: imported.updatedCount} : null});
  return db.runTransaction(async (tx) => {
    const now = deps.now();
    const again = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (again) return {...again.response, status: "replayed" as const};
    recordCommand(tx, db, {commandId: COMMAND_ID, uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    // Counts only: names, phones and the file stay out of logs.
    logger.info("Past sales imported.", {eventId, surface: data.surface,
      created: imported?.createdCount ?? 0});
    return applied;
  });
}

function respond(reading: Reading, status: Response["status"], hash: string, options: {reasons?: string[];
  receiptId?: string; eventId?: string; imported?: Response["result"]["import"]}): Response {
  const report = reading.report;
  const reasons = options.reasons ?? [];
  const needsMapping = reasons.includes("needs_mapping");
  const eventId = options.eventId ?? null;
  return {
    commandId: COMMAND_ID, status, previewHash: hash,
    summary: summaryFor(status, report, reasons, reading.needsReview.length),
    effects: status === "applied" && eventId ? [{kind: "draft_event", ref: `events/${eventId}`,
      label: `Private past event: ${reading.eventName}`.slice(0, 200)}] : [],
    next: [], receiptId: options.receiptId ?? null,
    result: {organizerId: reading.organizerId, eventId,
      converter: reading.read ? {id: reading.read.adapter.adapterId, support: reading.read.adapter.support,
        confidence: reading.read.adapter.confidence} : null,
      needsMapping,
      headers: needsMapping ? reading.headers.map((header) => header.slice(0, 120)) : [],
      columnShapes: needsMapping ? reading.shapes.slice(0, reading.headers.length) : [],
      report, rowsNeedingReview: reading.needsReview, import: options.imported ?? null, reasons},
  };
}

function empty(uid: string, input: Input, status: Response["status"], reasons: string[]): Response {
  return {
    commandId: COMMAND_ID, status,
    previewHash: commandPreviewHash(COMMAND_ID, uid, {fileName: input.file.fileName}, {status, reasons}),
    summary: summaryFor(status, null, reasons, 0),
    effects: [],
    next: reasons.includes("no_workspace") ? [{commandId: "workspace.ensure", label: "Set up your organizer profile"}] : [],
    receiptId: null,
    result: {organizerId: null, eventId: null, converter: null, needsMapping: false, headers: [], columnShapes: [],
      report: null, rowsNeedingReview: [], import: null, reasons},
  };
}

function summaryFor(status: Response["status"], report: PastSalesReport | null, reasons: string[],
  needsReview: number): Response["summary"] {
  if (reasons.includes("no_workspace")) {
    return {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your past night."]};
  }
  if (reasons.includes("needs_mapping") || !report) {
    return {headline: "We couldn't read this file's columns.",
      lines: ["Choose which column holds each guest's name, then preview again."]};
  }
  const money = (minor: number | null) => minor === null || !report.currency ? null :
    new Intl.NumberFormat("en-IN", {style: "currency", currency: report.currency, maximumFractionDigits: 0})
      .format(minor / 100);
  const lines: string[] = [];
  const gross = money(report.grossSalesMinor);
  lines.push(gross ? `${report.ticketsSold} tickets sold, ${gross} in sales${report.amountSource === "estimate" ||
    report.amountSource === "mixed" ? " (partly from your ticket price)" : ""}.` :
    `${report.ticketsSold} tickets sold.`);
  if (report.attendance) {
    lines.push(`${report.attendance.came} came, ${report.attendance.noShows} didn't (${Math.round(report.attendance.showRate * 100)}% showed up).`);
  }
  if (report.guests) lines.push(`${report.guests.firstTime} first-timers, ${report.guests.repeat} back again.`);
  const catchFee = report.fees.catch ? money(report.fees.catch.feeMinor) : null;
  if (catchFee) {
    lines.push(`Catch's fee would be ${catchFee}, after your first ${report.fees.catch!.freeTrialDays} days free.`);
  }
  if (report.fees.current && report.fees.differenceMinor !== null) {
    const difference = money(Math.abs(report.fees.differenceMinor));
    lines.push(report.fees.differenceMinor > 0 ? `That's ${difference} less than your current tool.` :
      report.fees.differenceMinor < 0 ? `That's ${difference} more than your current tool.` :
        "That's the same as your current tool.");
  }
  lines.push(report.fees.gatewayNote);
  if (needsReview > 0) lines.push(`${needsReview} guest row${needsReview === 1 ? "" : "s"} need a look before saving.`);
  if (status === "applied") {
    return {headline: `"${report.eventName}" is saved as a private past event.`.slice(0, 200), lines: lines.slice(0, 12)};
  }
  lines.push("Nothing is saved until you confirm, and no one is messaged.");
  return {headline: `Your night on ${report.localDate}`.slice(0, 200), lines: lines.slice(0, 12)};
}

function marketIdOf(organizer: Data): string | null {
  for (const value of [organizer.locationMarketId, organizer.location]) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function errorCode(error: unknown): string {
  if (error instanceof HttpsError) {
    const reason = (error.details as {reason?: unknown} | undefined)?.reason;
    if (typeof reason === "string") return reason;
  }
  const code = (error as {code?: unknown})?.code;
  if (typeof code === "string") return code;
  const message = error instanceof Error ? error.message : "";
  return /^[a-z_]+$/u.test(message) ? message : "roster_unsupported_file";
}

function refusal(code: string): HttpsError {
  return new HttpsError("invalid-argument", FILE_ERRORS[code] ?? FILE_ERRORS.roster_unsupported_file, {reason: code});
}

async function asHttps<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("failed-precondition", error instanceof Error ? error.message : "This import couldn't be saved.");
  }
}
