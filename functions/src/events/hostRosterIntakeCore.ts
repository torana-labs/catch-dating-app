import {createHash} from "crypto";
import type {ImportEventAttendeesCallablePayload} from
  "../shared/generated/importEventAttendeesCallablePayload";
import {validateImportEventAttendeesCallablePayload} from
  "../shared/generated/validators/importEventAttendeesInput";
import {canonicalImportPayload, eventAttendeeId, prepareImportRows} from
  "./eventAttendees";

type ImportRow = ImportEventAttendeesCallablePayload["rows"][number];
// Intake reviews named columns; party size comes from direct import only.
type FieldName = Exclude<keyof ImportRow, "rowId" | "partySize">;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
const HASH = /^[a-f0-9]{64}$/u;
/** Leaves ample headroom below Firestore's 1 MiB document limit. */
export const HOST_ROSTER_INTAKE_DOCUMENT_MAX_JSON_BYTES = 700000;

/** Private upload evidence. It must never enter public Supply Intake. */
export interface HostRosterSourceField {
  column: number;
  header: string;
  origin: "upload" | "hostCorrection" | "modelProposal";
  confidence: number | null;
}

export interface HostRosterIntakeRow {
  value: ImportRow;
  sourceRowNumber: number;
  fields: Partial<Record<FieldName, HostRosterSourceField>>;
  /** Original bounded cells stay available while a row is unresolved. */
  rawCells?: string[];
  /** Nonempty issues block apply until corrected or explicitly excluded. */
  issues?: string[];
}

export interface HostRosterIntakeDraft {
  sessionId: string;
  hostUid: string;
  organizerId: string;
  eventId: string;
  fileFingerprint: string;
  fileName: string;
  format: "csv" | "xlsx";
  headers: string[];
  mapping: Record<string, number>;
  sourceManifest: Array<{
    rowId: string;
    sourceRowNumber: number;
    rawEvidenceHash: string;
    originalValue: ImportRow;
    originalFields: Partial<Record<FieldName, HostRosterSourceField>>;
  }>;
  revision: number;
  state: "review" | "applied";
  rows: HostRosterIntakeRow[];
  excludedRowIds: string[];
  appliedImportId: string | null;
}

export interface HostRosterCurrentRow {
  eventId: string;
  attendeeId: string;
  source: "catchBooking" | "hostImport" | "hostManual" |
    "webOtp" | "providerSync";
  displayName: string;
  status: "invited" | "registered" | "waitlisted" | "checkedIn" |
    "cancelled";
  linkedUid: string | null;
  phoneE164: string | null;
  email: string | null;
  cityMarketId: string | null;
  externalReference: string | null;
  arrivalGroup: string | null;
  ticketType: string | null;
  revenueAmountMinor: number | null;
  revenueCurrency: string | null;
  revenueSource: "hostImport" | "hostEstimate" | "providerOrder" |
    "hostAttested" | null;
  updatedAtMillis: number;
}

export type HostRosterPreviewKind = "add" | "update" | "unchanged" |
  "excluded" | "needsReview" | "identityConflict";

export interface HostRosterPreviewRow {
  rowId: string;
  sourceRowNumber: number;
  displayName: string;
  externalReference: string | null;
  attendeeId: string | null;
  kind: HostRosterPreviewKind;
  changedFields: FieldName[];
  fieldChanges: HostRosterPreviewFieldChange[];
  issueCode: string | null;
}

export interface HostRosterPreviewFieldChange {
  field: FieldName;
  currentValue: string | null;
  proposedValue: string | null;
  origin: HostRosterSourceField["origin"] | "default" | null;
}

export interface HostRosterIntakePreview {
  sessionId: string;
  revision: number;
  reviewHash: string;
  rows: HostRosterPreviewRow[];
  counts: Record<HostRosterPreviewKind, number>;
  /** A proposal only. The destination transaction must recheck this hash. */
  eligibleForApply: boolean;
}

export interface HostRosterApprovedApply {
  reviewHash: string;
  payload: ImportEventAttendeesCallablePayload;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Bounded session input for private trusted persistence. */
export function createHostRosterIntakeDraft(input: Omit<HostRosterIntakeDraft,
  "sessionId" | "revision" | "state" | "excludedRowIds" |
  "appliedImportId" | "sourceManifest">): HostRosterIntakeDraft {
  if (![input.hostUid, input.organizerId, input.eventId].every((id) =>
    ID.test(id)) || !HASH.test(input.fileFingerprint) ||
    typeof input.fileName !== "string" ||
    input.fileName.length < 1 || input.fileName.length > 255 ||
    !["csv", "xlsx"].includes(input.format) ||
    !Array.isArray(input.headers) ||
    input.headers.length < 1 || input.headers.length > 40 ||
    input.headers.some((header) =>
      typeof header !== "string" ||
      header.length < 1 || header.length > 120) ||
    !input.mapping || typeof input.mapping !== "object" ||
    Array.isArray(input.mapping) ||
    !validMapping(input.mapping, input.headers.length) ||
    !Array.isArray(input.rows) ||
    input.rows.length < 1 || input.rows.length > 250 ||
    input.rows.some((row) => !row || typeof row !== "object")) {
    throw new Error("Invalid private roster intake scope or upload bounds.");
  }
  const readyValues = input.rows.filter((row) => !row.issues?.length)
    .map((row) => row.value);
  if (readyValues.length > 0 &&
      !validateImportEventAttendeesCallablePayload({
        eventId: input.eventId, importKey: "host-intake-validation",
        fileName: input.fileName, format: input.format, rows: readyValues,
      })) {
    throw new Error("Invalid private roster intake row values.");
  }
  const rowIds = new Set<string>();
  for (const row of input.rows) {
    const unresolved = (row.issues?.length ?? 0) > 0;
    if (!Number.isSafeInteger(row.sourceRowNumber) ||
        row.sourceRowNumber < 2 || row.sourceRowNumber > 100000 ||
        typeof row.value?.rowId !== "string" ||
        !row.value.rowId || row.value.rowId.length > 120 ||
        !row.fields || typeof row.fields !== "object" ||
        Array.isArray(row.fields) ||
        row.issues && !Array.isArray(row.issues) ||
        row.issues && (row.issues.length > 10 || row.issues.some((issue) =>
          typeof issue !== "string" || !/^[a-z][a-z0-9-]{0,79}$/u
            .test(issue))) ||
        row.rawCells && !Array.isArray(row.rawCells) ||
        row.rawCells && (row.rawCells.length > 40 ||
          row.rawCells.some((cell) => typeof cell !== "string" ||
            cell.length > 500)) ||
        rowIds.has(row.value.rowId)) {
      throw new Error("Invalid private roster intake row identity.");
    }
    rowIds.add(row.value.rowId);
    for (const [key, field] of Object.entries(row.fields)) {
      if (!comparedFields.includes(key as FieldName) ||
          !unresolved && row.value[key as FieldName] == null) {
        throw new Error("Invalid private roster field provenance.");
      }
      if (!field || !Number.isSafeInteger(field.column) ||
          field.column < -1 || field.column >= 40 ||
          !field.header || field.header.length > 120 ||
          !["upload", "hostCorrection", "modelProposal"]
            .includes(field.origin) ||
          field.confidence !== null &&
          (!Number.isFinite(field.confidence) ||
            field.confidence < 0 || field.confidence > 1)) {
        throw new Error("Invalid private roster field provenance.");
      }
    }
    for (const key of comparedFields) {
      if (!unresolved && key !== "status" && row.value[key] != null &&
          !row.fields[key]) {
        throw new Error("Missing private roster field provenance.");
      }
    }
  }
  const rows = structuredClone(input.rows);
  const sourceManifest = rows.map((row) => ({
    rowId: row.value.rowId,
    sourceRowNumber: row.sourceRowNumber,
    rawEvidenceHash: hash([row.rawCells ?? null, row.value, row.fields]),
    originalValue: structuredClone(row.value),
    originalFields: structuredClone(row.fields),
  }));
  const draft = {...input, rows,
    sessionId: "hri_" + hash([input.hostUid, input.organizerId,
      input.eventId, input.fileFingerprint]).slice(0, 48),
    revision: 1, state: "review", excludedRowIds: [],
    sourceManifest, appliedImportId: null} satisfies HostRosterIntakeDraft;
  assertHostRosterIntakeDocumentBound(draft);
  return draft;
}

/** Reserves more than 300 KiB for Firestore document overhead. */
export function assertHostRosterIntakeDocumentBound(value: unknown): void {
  if (Buffer.byteLength(JSON.stringify(value), "utf8") >
      HOST_ROSTER_INTAKE_DOCUMENT_MAX_JSON_BYTES) {
    throw new Error("Private roster intake evidence exceeds bounds.");
  }
}

/** A revision change invalidates any earlier preview or approval. */
export function reviseHostRosterIntakeDraft(params: {
  draft: HostRosterIntakeDraft;
  expectedRevision: number;
  rows: HostRosterIntakeRow[];
  excludedRowIds: string[];
  mapping?: Record<string, number>;
}): HostRosterIntakeDraft {
  const {draft, expectedRevision, rows, excludedRowIds} = params;
  const sourceById = new Map(draft.sourceManifest.map((source) =>
    [source.rowId, source]));
  const validManifest = draft.sourceManifest.every((source) =>
    source.rawEvidenceHash === hash([
      draft.rows.find((row) => row.value.rowId === source.rowId)?.rawCells ??
        null,
      source.originalValue,
      source.originalFields,
    ]));
  if (draft.state !== "review" || draft.revision !== expectedRevision ||
      !validManifest ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision >= Number.MAX_SAFE_INTEGER ||
      excludedRowIds.length !== new Set(excludedRowIds).size ||
      rows.length !== draft.sourceManifest.length ||
      rows.some((row) => {
        const source = sourceById.get(row.value.rowId);
        return !source || source.sourceRowNumber !== row.sourceRowNumber ||
          hash(row.rawCells ?? null) !== hash(draft.rows.find((original) =>
            original.value.rowId === row.value.rowId)?.rawCells ?? null);
      }) ||
      excludedRowIds.some((id) => !rows.some((row) =>
        row.value.rowId === id))) {
    throw new Error("Stale or invalid roster intake revision.");
  }
  const checked = createHostRosterIntakeDraft({...draft, rows,
    mapping: params.mapping ?? draft.mapping});
  const revised = {...checked, sessionId: draft.sessionId,
    revision: expectedRevision + 1,
    sourceManifest: structuredClone(draft.sourceManifest),
    excludedRowIds: [...excludedRowIds]};
  assertHostRosterIntakeDocumentBound(revised);
  return revised;
}

const comparedFields: FieldName[] = ["displayName", "phone", "email",
  "cityMarketId", "externalReference", "arrivalGroup", "ticketType",
  "revenueAmountMinor", "revenueCurrency", "revenueSource", "status"];
type PreparedRow = ReturnType<typeof prepareImportRows>["prepared"][number];

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function proposedValue(row: ImportRow | PreparedRow,
  field: FieldName): string | null {
  if (field === "phone") {
    return displayValue("phoneE164" in row ? row.phoneE164 : row.phone);
  }
  return displayValue(row[field as keyof typeof row]);
}

function currentValue(row: HostRosterCurrentRow | null,
  field: FieldName): string | null {
  if (!row) return null;
  return displayValue(field === "phone" ? row.phoneE164 : row[field]);
}

function fieldChanges(source: HostRosterIntakeRow,
  row: ImportRow | PreparedRow, current: HostRosterCurrentRow | null,
  fields: FieldName[]): HostRosterPreviewFieldChange[] {
  return fields.map((field) => ({field,
    currentValue: currentValue(current, field),
    proposedValue: proposedValue(row, field),
    origin: source.fields[field]?.origin ??
      (field === "status" ? "default" : null)}));
}

/** Proposal from the complete, event-scoped authoritative roster snapshot. */
export function previewHostRosterIntake(params: {
  draft: HostRosterIntakeDraft;
  currentRows: ReadonlyMap<string, HostRosterCurrentRow>;
}): HostRosterIntakePreview {
  const {draft, currentRows} = params;
  if (draft.state !== "review") {
    throw new Error("Applied roster intake cannot be reviewed again.");
  }
  for (const [id, row] of currentRows) {
    if (id !== row.attendeeId || row.eventId !== draft.eventId) {
      throw new Error("Roster snapshot is outside the intake scope.");
    }
  }
  const excluded = new Set(draft.excludedRowIds);
  const imported = prepareImportRows({eventId: draft.eventId,
    importKey: draft.sessionId, format: draft.format,
    rows: draft.rows.filter((row) =>
      !excluded.has(row.value.rowId) && !row.issues?.length)
      .map((row) => row.value)});
  const prepared = new Map(imported.prepared.map((row) => [row.rowId, row]));
  const errors = new Map(imported.errors.map((error) =>
    [error.rowId, error.code]));
  const rows: HostRosterPreviewRow[] = draft.rows.map((source) => {
    const value = source.value;
    const base = {rowId: value.rowId,
      sourceRowNumber: source.sourceRowNumber,
      displayName: value.displayName,
      externalReference: value.externalReference ?? null};
    const sourceFields = comparedFields.filter((field) =>
      proposedValue(value, field) !== null);
    if (excluded.has(value.rowId)) {
      return {...base, attendeeId: null, kind: "excluded" as const,
        changedFields: sourceFields,
        fieldChanges: fieldChanges(source, value, null, sourceFields),
        issueCode: null};
    }
    if (source.issues?.length) {
      return {...base, attendeeId: null, kind: "needsReview" as const,
        changedFields: sourceFields,
        fieldChanges: fieldChanges(source, value, null, sourceFields),
        issueCode: source.issues[0]};
    }
    const row = prepared.get(value.rowId);
    if (!row) {
      return {...base, attendeeId: null, kind: "needsReview" as const,
        changedFields: sourceFields,
        fieldChanges: fieldChanges(source, value, null, sourceFields),
        issueCode: errors.get(value.rowId) ?? "invalid"};
    }
    const current = currentRows.get(row.attendeeId);
    const phoneKeyRow = row.phoneE164 ? currentRows.get(eventAttendeeId(
      draft.eventId, `phone:${row.phoneE164}`)) : null;
    const phoneConflict = row.phoneE164 && [...currentRows.values()]
      .some((other) => other.attendeeId !== row.attendeeId &&
        other.phoneE164 === row.phoneE164);
    if (phoneKeyRow && phoneKeyRow.attendeeId !== row.attendeeId ||
        phoneConflict) {
      return {...base, attendeeId: row.attendeeId,
        kind: "identityConflict" as const, changedFields: sourceFields,
        fieldChanges: fieldChanges(source, row, null, sourceFields),
        issueCode: phoneKeyRow?.source === "catchBooking" ?
          "catch-booking-authority" :
          "contact-belongs-to-another-attendee"};
    }
    if (!current) {
      const addedFields = comparedFields.filter((field) =>
        proposedValue(row, field) !== null);
      return {...base, attendeeId: row.attendeeId, kind: "add" as const,
        changedFields: addedFields,
        fieldChanges: fieldChanges(source, row, null, addedFields),
        issueCode: null};
    }
    if (row.email && !row.phoneE164 && !row.externalReference) {
      return {...base, attendeeId: row.attendeeId,
        kind: "identityConflict" as const, changedFields: sourceFields,
        fieldChanges: fieldChanges(source, row, current, sourceFields),
        issueCode: "email-only-identity"};
    }
    if (current.source === "catchBooking" ||
        current.linkedUid &&
          (row.phoneE164 && row.phoneE164 !== current.phoneE164 ||
            row.email && row.email !== current.email)) {
      return {...base, attendeeId: row.attendeeId,
        kind: "identityConflict" as const, changedFields: sourceFields,
        fieldChanges: fieldChanges(source, row, current, sourceFields),
        issueCode: current.source === "catchBooking" ?
          "catch-booking-authority" : "claimed-identity"};
    }
    if (current.status === "cancelled" && !source.fields.status) {
      return {...base, attendeeId: row.attendeeId,
        kind: "needsReview" as const, changedFields: sourceFields,
        fieldChanges: fieldChanges(source, row, current, sourceFields),
        issueCode: "cancelled-status-needs-explicit-review"};
    }
    const previousValues: Partial<Record<FieldName, unknown>> = {
      displayName: current.displayName,
      phone: current.phoneE164,
      email: current.email,
      cityMarketId: current.cityMarketId,
      externalReference: current.externalReference,
      arrivalGroup: current.arrivalGroup,
      ticketType: current.ticketType,
      revenueAmountMinor: current.revenueAmountMinor,
      revenueCurrency: current.revenueCurrency,
      revenueSource: current.revenueSource,
      status: current.status,
    };
    const changedFields = comparedFields.filter((field) => {
      const next = field === "phone" ? row.phoneE164 :
        field === "status" && current.status === "checkedIn" ?
          "checkedIn" :
          field === "status" && !source.fields.status ?
            current.status : row[field];
      if (next === null || next === undefined) return false;
      return next !== previousValues[field];
    });
    return {...base, attendeeId: row.attendeeId,
      kind: changedFields.length ? "update" as const : "unchanged" as const,
      changedFields,
      fieldChanges: fieldChanges(source, row, current, changedFields),
      issueCode: null};
  });
  const counts = {add: 0, update: 0, unchanged: 0, excluded: 0,
    needsReview: 0, identityConflict: 0};
  for (const row of rows) counts[row.kind] += 1;
  const rosterEvidence = rows.map((row) => {
    const current = row.attendeeId ? currentRows.get(row.attendeeId) : null;
    return [row.rowId, row.kind, current ?? null];
  });
  return {sessionId: draft.sessionId, revision: draft.revision, rows,
    counts, reviewHash: hash([draft.sessionId, draft.revision,
      draft.headers, draft.mapping, draft.rows, draft.excludedRowIds,
      rosterEvidence]),
    eligibleForApply: counts.needsReview === 0 &&
      counts.identityConflict === 0 && counts.add + counts.update > 0};
}

/** One approval pins a revision and exact roster evidence for the writer. */
export function approveHostRosterIntakeApply(params: {
  draft: HostRosterIntakeDraft;
  currentRows: ReadonlyMap<string, HostRosterCurrentRow>;
  reviewHash: string;
}): HostRosterApprovedApply {
  const {draft, currentRows, reviewHash} = params;
  const preview = previewHostRosterIntake({draft, currentRows});
  if (!preview.eligibleForApply || preview.reviewHash !== reviewHash) {
    throw new Error("Roster approval is stale or still needs review.");
  }
  const selectedIds = new Set(preview.rows.filter((row) =>
    row.kind === "add" || row.kind === "update").map((row) => row.rowId));
  const byRowId = new Map(preview.rows.map((row) => [row.rowId, row]));
  const rows = draft.rows.filter((row) => selectedIds.has(row.value.rowId))
    .map((source) => {
      const selected = byRowId.get(source.value.rowId)!;
      const current = selected.attendeeId ?
        currentRows.get(selected.attendeeId) : null;
      const value = {...source.value};
      // The canonical writer requires status. A parser default is not a
      // host instruction to replace an existing status.
      if (current && !source.fields.status &&
          current.status !== "checkedIn" &&
          current.status !== "cancelled") {
        value.status = current.status;
      }
      return value;
    });
  return {reviewHash, payload: canonicalImportPayload({
    eventId: draft.eventId,
    importKey: "host-intake-" + hash([draft.sessionId, draft.revision,
      reviewHash]),
    fileName: draft.fileName,
    format: draft.format,
    rows,
  })};
}

/** Private model proposals are optional and have zero live provider binding. */
export interface HostRosterMappingProposalProvider {
  propose(input: {headers: string[]; sampleRows: string[][]}):
    Promise<{mapping: Record<string, number>; confidence: number}>;
}

const allowedMappingFields = new Set(["displayName", "phone", "email",
  "city", "externalReference", "arrivalGroup", "ticketType",
  "revenueAmount", "revenueCurrency", "status"]);

function validMapping(mapping: Record<string, number>,
  headerCount: number): boolean {
  const entries = Object.entries(mapping);
  return entries.every(([field, index]) =>
    allowedMappingFields.has(field) &&
    Number.isSafeInteger(index) && index >= 0 && index < headerCount) &&
    new Set(entries.map((entry) => entry[1])).size === entries.length;
}

export async function proposeHostRosterMapping(params: {
  headers: string[];
  sampleRows: string[][];
  deterministicMapping: Record<string, number>;
  provider?: HostRosterMappingProposalProvider;
}): Promise<{mapping: Record<string, number>; source: "deterministic" |
  "modelProposal"; confidence: number}> {
  const {headers, sampleRows, deterministicMapping, provider} = params;
  if (headers.length < 1 || headers.length > 40 ||
      headers.some((header) => header.length < 1 || header.length > 120) ||
      sampleRows.length > 20 || sampleRows.some((row) =>
    row.length > headers.length || row.some((cell) =>
      cell.length > 500)) ||
      !validMapping(deterministicMapping, headers.length)) {
    throw new Error("Private mapping input exceeds bounds.");
  }
  if (deterministicMapping.displayName !== undefined) {
    return {mapping: {...deterministicMapping},
      source: "deterministic", confidence: 1};
  }
  if (!provider) throw new Error("Mapping needs human review.");
  const proposal = await provider.propose({headers: [...headers],
    sampleRows: sampleRows.map((row) => [...row])});
  if (!Number.isFinite(proposal.confidence) ||
      proposal.confidence < 0 || proposal.confidence > 1 ||
      !validMapping(proposal.mapping, headers.length) ||
      proposal.mapping.displayName === undefined) {
    throw new Error("Model mapping proposal is invalid.");
  }
  return {mapping: {...proposal.mapping}, source: "modelProposal",
    confidence: proposal.confidence};
}
