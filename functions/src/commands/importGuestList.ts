import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {ImportGuestListCallablePayload} from
  "../shared/generated/importGuestListCallablePayload";
import type {ImportGuestListCallableResponse} from
  "../shared/generated/importGuestListCallableResponse";
import {validateImportGuestListCallablePayload} from
  "../shared/generated/validators/importGuestListInput";
import type {EventAttendeeImportResult} from "../events/eventAttendees";
import {
  applyHostRosterIntake,
  defaultHostRosterIntakeApplyDeps,
  reviewResponse,
  startHostRosterIntake,
  type HostRosterIntakeManageDeps,
  type ManageHostRosterIntakeResponse,
} from "../events/hostRosterIntakeApply";
import {
  type HostRosterIntakePreview,
  type HostRosterMappingProposalProvider,
} from "../events/hostRosterIntakeCore";
import {
  aiFallbackGuestMappingRunner,
  guestMappingProposalProvider,
  modelColumnMapping,
} from "../guestImport/mappingFallback";
import type {
  CanonicalGuestRead,
  GuestColumnMapping,
  GuestField,
} from "../guestImport/canonical";
import {columnShapes, type ColumnShape} from "../guestImport/columnShapes";
import {readGuestFile, type GuestFileRead} from "../guestImport/file";
import {countUnrecognisedHeaderShape} from "../guestImport/headerShapes";
import {guestIntakeInput} from "../guestImport/intakeRows";
import {
  guestFields,
  suggestExtraMapping,
  type GuestExtraMapping,
} from "../guestImport/mapping";
import {readGuestTable} from "../guestImport/registry";
import {
  suggestGuestMergesAndTags,
  type GuestSuggestion,
} from "../guestImport/suggestions";
import {uniqueHeaders} from "../guestImport/table";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";
import {
  recordTryItEvent,
  resolveGuestListTarget,
  type GuestListTarget,
} from "./guestListTarget";

// Command guests.import-list (contracts/commands/catalog.json; #2061). One
// guest importer for every surface: the file is read on the server by the
// converter for its format (functions/src/guestImport), and the rows go
// through the host's existing review session (hostRosterIntake: draft,
// preview with reviewHash, apply through importEventAttendeesForHost).
//
// - Preview reads the file, starts or resumes the review session for it and
//   returns what would be added or updated. When no converter recognised
//   the columns and none is named "name", it answers needs_input with the
//   headers and what each column holds (no values), and the host maps the
//   columns. The model fallback stays off until go-live (owner decision).
// - Apply recomputes the preview, refuses a confirm whose preview changed,
//   applies exactly the reviewed rows and records a command receipt.
// - With no input.eventId, the guests go on the caller's try-it workspace's
//   private draft event, made if needed (guestListTarget.ts).

export const COMMAND_ID = "guests.import-list";
const HOUR_MS = 60 * 60 * 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Response = ImportGuestListCallableResponse;
type Input = ImportGuestListCallablePayload["input"];
type Mapping = Response["result"]["mapping"];

export interface ImportGuestListDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  increment: (by: number) => FirebaseFirestore.FieldValue;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof defaultCheckRateLimit;
  intake: () => HostRosterIntakeManageDeps;
  /** The model fallback for unknown columns; null while it is off. */
  mappingProvider: (context: {uid: string}) =>
    HostRosterMappingProposalProvider | null;
}

const defaultDeps: ImportGuestListDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  increment: (by) => admin.firestore.FieldValue.increment(by),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  checkRateLimit: defaultCheckRateLimit,
  intake: () => defaultHostRosterIntakeApplyDeps(),
  mappingProvider: ({uid}) => guestMappingProposalProvider({
    runner: aiFallbackGuestMappingRunner({uid, commandId: COMMAND_ID})}),
};

const fileErrors: Record<string, string> = {
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
};

export async function importGuestListHandler(
  request: CallableRequest<unknown>,
  deps: ImportGuestListDeps = defaultDeps
): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<ImportGuestListCallablePayload>(
    request, validateImportGuestListCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "importGuestList",
    {maxRequests: 60, windowMs: HOUR_MS});
  const input = data.input;
  const bytes = Buffer.from(input.file.contentBase64, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_BYTES) {
    throw refusal("roster_file_too_large");
  }
  const fileFingerprint = createHash("sha256").update(bytes).digest("hex");
  let file: GuestFileRead;
  try {
    file = await readGuestFile({fileName: input.file.fileName, bytes});
  } catch (error) {
    throw refusal(errorCode(error));
  }
  if (file.matrix.length < 2) throw refusal("roster_missing_rows");

  const target = await resolveGuestListTarget(db, deps, {uid: caller.uid,
    eventId: input.eventId, commandId: COMMAND_ID, surface: data.surface});
  const {eventId, organizerId} = target;
  // What the preview hash and the receipt cover: the event, and the file by
  // fingerprint, never its contents.
  const requestInput = {eventId, fileFingerprint,
    fileName: input.file.fileName, mapping: input.mapping ?? null,
    fallbackRevenue: input.fallbackRevenue ?? null,
    excludedRowIds: [...(input.excludedRowIds ?? [])].sort()};

  const headers = uniqueHeaders(file.matrix[0]).slice(0, 41);
  const shapes = columnShapes(headers, file.matrix.slice(1));

  const {city, revenueAmount, revenueCurrency, ...canonicalMapping} =
    input.mapping ?? {};
  const suggestedExtra = suggestExtraMapping(headers);
  const extraMapping: GuestExtraMapping = {
    city: city === undefined ? suggestedExtra.city : city,
    revenueAmount: revenueAmount === undefined ?
      suggestedExtra.revenueAmount : revenueAmount,
    revenueCurrency: revenueCurrency === undefined ?
      suggestedExtra.revenueCurrency : revenueCurrency,
  };
  if (Object.values(extraMapping).some((column) => column !== null &&
      column >= headers.length)) {
    throw refusal("roster_invalid_mapping");
  }
  const reservedColumns = Object.values(extraMapping)
    .filter((column): column is number => column !== null);
  const readWith = (mapping?: Partial<GuestColumnMapping>) =>
    readGuestTable(file.matrix, {
      converterId: file.converterId ?? undefined, mapping,
      reviewStatuses: true, reservedColumns,
    });
  let read: CanonicalGuestRead;
  let modelProposal: {fields: GuestField[]; confidence: number} | null = null;
  try {
    read = readWith(input.mapping ?
      canonicalMapping as Partial<GuestColumnMapping> : undefined);
  } catch (error) {
    const code = errorCode(error);
    if (code !== "roster_missing_name_column") throw refusal(code);
    if (data.mode === "preview" && !input.mapping) {
      await countShape(db, deps, headers);
    }
    const proposed = input.mapping ? null :
      await modelMapping(deps, caller.uid, headers, shapes, reservedColumns);
    if (!proposed) {
      return needsInput(caller.uid, requestInput, file, headers, shapes,
        input.mapping);
    }
    try {
      read = readWith(proposed.mapping);
    } catch {
      return needsInput(caller.uid, requestInput, file, headers, shapes,
        input.mapping);
    }
    modelProposal = {fields: Object.keys(proposed.mapping) as GuestField[],
      confidence: proposed.confidence};
  }
  if (read.rows.length === 0) {
    throw refusal("roster_missing_guest_names",
      "No row in this file has a guest name.");
  }
  if (data.mode === "preview" && !input.mapping &&
      read.adapter.adapterId === "generic-v1") {
    await countShape(db, deps, headers);
  }

  const intakeDeps = deps.intake();
  const intake = guestIntakeInput(read, {extraMapping,
    fallbackRevenue: input.fallbackRevenue ?? null, modelProposal});
  const review = await asHttps(async () => {
    let draft = await startHostRosterIntake(intakeDeps, {
      hostUid: caller.uid, organizerId, eventId,
      fileFingerprint, fileName: input.file.fileName,
      // The review session and import receipt know csv and xlsx; a vCard is
      // tabular text, and its file name and converter id record the source.
      format: file.format === "xlsx" ? "xlsx" : "csv",
      headers: intake.headers, mapping: intake.mapping, rows: intake.rows,
    });
    const excluded = requestInput.excludedRowIds;
    if (draft.state === "review" &&
        JSON.stringify([...draft.excludedRowIds].sort()) !==
          JSON.stringify(excluded)) {
      draft = await intakeDeps.store.revise({sessionId: draft.sessionId,
        hostUid: caller.uid, expectedRevision: draft.revision,
        rows: draft.rows, excludedRowIds: excluded, mapping: draft.mapping},
      intakeDeps.authorize);
    }
    return reviewResponse(draft, intakeDeps);
  });
  const preview = review.preview;
  if (!preview) {
    throw new HttpsError("internal", "Roster intake review is missing.");
  }
  const previewHash = commandPreviewHash(COMMAND_ID, caller.uid,
    requestInput, {reviewHash: preview.reviewHash,
      modelMapping: modelProposal ? read.mapping : null});
  const suggestions = review.draft.state === "review" ?
    await suggestGuestMergesAndTags(db, organizerId, preview) : [];

  if (data.mode === "preview") {
    return describe({status: review.draft.state === "applied" ? "applied" :
      "previewed", previewHash, receiptId: null, file, read, shapes,
    review, preview, eventId, imported: null, suggestions,
    extraMapping, mappedBy: mappedBy(input.mapping, modelProposal),
    reviewFields: input.mapping ? [] : modelProposal?.fields ?? [],
    target});
  }

  const requestHash = commandRequestHash(COMMAND_ID, caller.uid,
    requestInput, data.confirm ?? null);
  const replayed = await db.runTransaction((tx) => replayCommand<Response>(
    tx, db, {commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: deps.now().getTime()}));
  if (replayed) return {...replayed.response, status: "replayed"};
  assertConfirmMatches(COMMAND_ID, data.confirm, previewHash);
  if (review.draft.state === "review" && !preview.eligibleForApply) {
    throw new HttpsError("failed-precondition",
      "Some guests need a look before this list can be saved.",
      {reason: "needs_review"});
  }
  const imported = review.draft.state === "applied" ? null :
    await asHttps(() => applyHostRosterIntake({hostUid: caller.uid,
      sessionId: review.draft.sessionId, reviewHash: preview.reviewHash},
    intakeDeps));
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, caller.uid,
    data.idempotencyKey);
  const applied = describe({status: "applied", previewHash, receiptId, file,
    read, shapes, review, preview, eventId, imported,
    receiptImportId: review.receipt?.importId ?? null, suggestions,
    extraMapping, mappedBy: mappedBy(input.mapping, modelProposal),
    reviewFields: input.mapping ? [] : modelProposal?.fields ?? [],
    target});
  return db.runTransaction(async (tx) => {
    const now = deps.now();
    const again = await replayCommand<Response>(tx, db, {
      commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime()});
    if (again) return {...again.response, status: "replayed" as const};
    if (target.source !== "event") {
      // Reads come first in a transaction: the workspace before any write.
      await recordTryItEvent(db, deps, {uid: caller.uid, eventId,
        commandId: COMMAND_ID, surface: data.surface,
        organizerName: null}, tx);
    }
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    if (imported) {
      // Counts only: names, phones and the file stay out of logs.
      logger.info("Guest list imported.", {eventId,
        converter: read.adapter.adapterId, surface: data.surface,
        created: imported.createdCount, updated: imported.updatedCount});
    }
    return applied;
  });
}

export const importGuestList = onCall(appCheckCallableOptions,
  (request) => importGuestListHandler(request));

/**
 * Asks the model fallback for a mapping from headers and column shapes. Null
 * while it is off, or when its proposal is unusable: the host maps instead.
 * @return {Promise<object|null>} The proposed mapping and confidence.
 */
async function modelMapping(deps: ImportGuestListDeps, uid: string,
  headers: string[],
  shapes: ColumnShape[], reservedColumns: number[]):
  Promise<{mapping: Partial<GuestColumnMapping>; confidence: number} | null> {
  let provider: HostRosterMappingProposalProvider | null;
  try {
    provider = deps.mappingProvider({uid});
  } catch (error) {
    logger.warn("Guest mapping fallback is not ready.",
      {error: error instanceof Error ? error.message : String(error)});
    return null;
  }
  if (!provider) return null;
  try {
    const proposal = await modelColumnMapping({provider, headers, shapes,
      reservedColumns, fields: guestFields});
    return proposal ? {mapping: proposal.mapping as Partial<GuestColumnMapping>,
      confidence: proposal.confidence} : null;
  } catch (error) {
    logger.warn("Guest mapping proposal was not usable.",
      {error: error instanceof Error ? error.message : String(error)});
    return null;
  }
}

function mappedBy(hostMapping: Input["mapping"],
  modelProposal: {fields: GuestField[]} | null): "converter" | "host" |
  "model" {
  if (hostMapping) return "host";
  return modelProposal ? "model" : "converter";
}

async function countShape(db: FirebaseFirestore.Firestore,
  deps: ImportGuestListDeps, headers: string[]): Promise<void> {
  try {
    await countUnrecognisedHeaderShape(db, headers, deps.now(),
      deps.increment);
  } catch (error) {
    logger.warn("Unrecognised header shape was not counted.",
      {error: error instanceof Error ? error.message : String(error)});
  }
}

function needsInput(uid: string, requestInput: unknown, file: GuestFileRead,
  headers: string[], shapes: ColumnShape[],
  hostMapping: Input["mapping"]): Response {
  const mapping = emptyMapping();
  for (const [field, column] of Object.entries(hostMapping ?? {})) {
    if (field in mapping) mapping[field as keyof Mapping] = column ?? null;
  }
  return {
    commandId: COMMAND_ID, status: "needs_input",
    previewHash: commandPreviewHash(COMMAND_ID, uid, requestInput,
      {needsMapping: true}),
    summary: {headline: "We couldn't read this file's columns.",
      lines: ["Choose which column holds each guest's name, and their " +
        "phone or email if the file has them, then preview again."]},
    effects: [], next: [], receiptId: null,
    result: {eventId: (requestInput as {eventId: string}).eventId,
      fileFormat: file.format,
      converter: {id: "generic-v1", support: "generic", confidence: 0},
      headers: headers.map((header) => header.slice(0, 120)),
      columnShapes: shapes, mapping, mappedBy: hostMapping ? "host" :
        "converter", aiRead: false, reviewFields: [],
      needsMapping: true, sessionId: null,
      revision: null, reviewHash: null, eligibleForApply: false,
      counts: {add: 0, update: 0, unchanged: 0, excluded: 0, needsReview: 0,
        identityConflict: 0, skipped: 0},
      rows: [], skipped: [], suggestions: [], truncatedCount: 0,
      import: null},
  };
}

function describe(params: {
  status: "previewed" | "applied";
  previewHash: string;
  receiptId: string | null;
  file: GuestFileRead;
  read: CanonicalGuestRead;
  shapes: ColumnShape[];
  review: ManageHostRosterIntakeResponse;
  preview: HostRosterIntakePreview;
  eventId: string;
  imported: EventAttendeeImportResult | null;
  receiptImportId?: string | null;
  suggestions: GuestSuggestion[];
  extraMapping: GuestExtraMapping;
  mappedBy: "converter" | "host" | "model";
  /** Mapping fields the model chose, for the host to check. */
  reviewFields: GuestField[];
  target: GuestListTarget;
}): Response {
  const {status, preview, read, review, imported} = params;
  const counts = {...preview.counts, skipped: read.skipped.length};
  const alreadyApplied = review.draft.state === "applied" && !imported;
  const guests = (count: number) => count === 1 ? "1 guest" :
    `${count} guests`;
  const headline = status === "previewed" ?
    `This adds ${guests(counts.add)} and updates ${guests(counts.update)}.` :
    alreadyApplied ? "This guest list was already saved." :
      `Saved: ${guests(imported?.createdCount ?? 0)} added, ` +
        `${guests(imported?.updatedCount ?? 0)} updated.`;
  const lines = [`Read as ${converterLabel(read.adapter.adapterId)}.`];
  if (params.target.source === "try_it_placeholder" ||
      params.target.source === "try_it_draft") {
    lines.push(params.target.source === "try_it_placeholder" ?
      "Guests go on a private draft event called \"Guest list\" in your " +
        "profile; rename or date it in the Host app." :
      "Guests go on your private draft event in your profile.");
  }
  if (params.mappedBy === "model") {
    lines.push("We guessed which column is which from the headers; check " +
      "the columns before you confirm.");
  }
  if (counts.needsReview + counts.identityConflict > 0) {
    lines.push(`${guests(counts.needsReview + counts.identityConflict)} ` +
      "need a look first: fix them in the file, or leave them out.");
  }
  const known = new Set(params.suggestions.filter((suggestion) =>
    suggestion.kind === "merge" && suggestion.contactId)
    .map((suggestion) => suggestion.rowId)).size;
  if (known > 0) {
    lines.push(known === 1 ?
      "1 guest looks like someone already in your contacts (same phone " +
        "or email); you can merge them in Customers." :
      `${known} guests look like people already in your contacts (same ` +
        "phone or email); you can merge them in Customers.");
  }
  if (counts.unchanged > 0) {
    lines.push(`${guests(counts.unchanged)} already on the list ` +
      "unchanged.");
  }
  if (counts.skipped > 0) {
    lines.push(`${counts.skipped} row${counts.skipped === 1 ? "" : "s"} ` +
      "skipped (no name, or a cancelled or failed booking).");
  }
  if (read.truncatedCount > 0) {
    lines.push(`Only the first 250 guests were read; ${read.truncatedCount}` +
      " more rows were left out.");
  }
  lines.push("Nothing is saved until you confirm, and guests are not " +
    "messaged.");
  const importId = imported?.importId ?? params.receiptImportId ?? null;
  const importSummary = imported ? {importId: imported.importId,
    status: imported.status, createdCount: imported.createdCount,
    updatedCount: imported.updatedCount,
    skippedCount: imported.skippedCount} : null;
  const mapping = emptyMapping();
  for (const [field, column] of Object.entries({...read.mapping,
    ...params.extraMapping})) {
    if (field in mapping) mapping[field as keyof Mapping] = column;
  }
  return {
    commandId: COMMAND_ID, status, previewHash: params.previewHash,
    summary: {headline, lines: lines.slice(0, 12)},
    effects: status === "applied" && importId ? [{kind: "guests_imported",
      ref: `eventAttendeeImports/${importId}`.slice(0, 300),
      label: "Event guest list"}] : [],
    next: [], receiptId: params.receiptId,
    result: {eventId: params.eventId, fileFormat: params.file.format,
      converter: {id: read.adapter.adapterId, support: read.adapter.support,
        confidence: read.adapter.confidence},
      headers: read.headers.map((header) => header.slice(0, 120)),
      columnShapes: params.shapes.slice(0, read.headers.length),
      mapping, mappedBy: params.mappedBy,
      aiRead: params.mappedBy === "model",
      reviewFields: params.mappedBy === "model" ? [...params.reviewFields] : [],
      needsMapping: false,
      sessionId: preview.sessionId,
      revision: preview.revision, reviewHash: preview.reviewHash,
      eligibleForApply: preview.eligibleForApply, counts,
      rows: preview.rows.map((row) => ({rowId: row.rowId,
        sourceRowNumber: row.sourceRowNumber,
        displayName: row.displayName.slice(0, 120), kind: row.kind,
        issueCode: row.issueCode?.slice(0, 80) ?? null,
        changedFields: [...row.changedFields]})),
      skipped: read.skipped.slice(0, 250).map((row) => ({
        sourceRowNumber: row.sourceRowNumber, reason: row.reason})),
      suggestions: params.suggestions,
      truncatedCount: read.truncatedCount, import: importSummary},
  };
}

const converterLabels: Record<string, string> = {
  "luma-v1": "a Luma guest export",
  "eventbrite-v1": "an Eventbrite attendee report",
  "partiful-v1": "a Partiful guest list",
  "posh-v1": "a Posh order export",
  "google-forms-v1": "Google Forms responses",
  "typeform-v1": "Typeform responses",
  "townscript-v1": "a Townscript attendee report",
  "instamojo-v1": "an Instamojo payments export",
  "vcard-v1": "shared contacts (vCard)",
};

function converterLabel(id: string): string {
  return converterLabels[id] ?? "a guest list (columns matched by name)";
}

function emptyMapping(): Mapping {
  return {displayName: null, phone: null, email: null,
    externalReference: null, arrivalGroup: null, ticketType: null,
    status: null, city: null, revenueAmount: null, revenueCurrency: null};
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : "roster_unreadable";
}

function refusal(code: string, message?: string): HttpsError {
  return new HttpsError("invalid-argument",
    message ?? fileErrors[code] ?? "This file couldn't be read.",
    {reason: code});
}

/** Session store errors are plain Errors; callers get a typed refusal. */
async function asHttps<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/stale|still needs review/iu.test(message)) {
      throw new HttpsError("aborted",
        "This changed since your preview. Review it again.",
        {reason: "changed_since_preview"});
    }
    throw new HttpsError("failed-precondition",
      "This guest list can't be imported as it is.",
      {reason: "intake_refused"});
  }
}
