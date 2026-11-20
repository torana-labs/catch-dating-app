import type {TryItCaller} from "../../firebase";
import type {TryItCall, TryItCommandClient, TryItCommandId, TryItMode, TryItProblem, TryItResponse} from "../../shared/api/tryItCommands";
import type {GuestImportFile} from "../../features/guestImportTryIt/guestImportFlow";
import {fixtureCaller, workspaceFixtures} from "./tryItCommands";

/**
 * guests.import-list envelopes as the callable answers them on the website
 * surface, for the guest-list tool's tests and stories. Fictional guests and
 * a sample file only; guestImportFixtures.test.ts checks every one against
 * the response schema.
 */

type GuestResponse = TryItResponse<"guests.import-list">;
type GuestRow = GuestResponse["result"]["rows"][number];

const hash = (seed: string) => seed.repeat(64).slice(0, 64);
export const guestFixtureEventId = "evtGuestListDraft01";
const sessionId = `hri_${"c".repeat(48)}`;

/** A small sample guest list as a chosen file: a CSV with names, phones, emails and ticket types. */
export const guestSampleCsv = [
  "Name,Phone,Email,Ticket",
  "Meera Iyer,+919820000001,meera@guests.example,Early bird",
  "Kabir Shah,98200 00002,kabir@guests.example,Early bird",
  "Ira Desai,+91 98200 00003,ira@guests.example,Regular",
  "Rohan Pillai,12345,rohan@guests.example,Regular",
].join("\n");

export function guestSampleFile(name = "salt-air-guests.csv", text = guestSampleCsv): GuestImportFile {
  return {name, size: new TextEncoder().encode(text).byteLength, read: async () => btoa(text)};
}

const noMapping = {displayName: null, phone: null, email: null, externalReference: null, arrivalGroup: null, ticketType: null,
  status: null, city: null, revenueAmount: null, revenueCurrency: null};
const readMapping = {...noMapping, displayName: 0, phone: 1, email: 2, ticketType: 3};
const zeroCounts = {add: 0, update: 0, unchanged: 0, excluded: 0, needsReview: 0, identityConflict: 0, skipped: 0};

const row = (n: number, displayName: string, kind: GuestRow["kind"], issueCode: string | null = null,
  changedFields = ["displayName", "phone", "email", "ticketType"]): GuestRow =>
  ({rowId: `row-${n}`, sourceRowNumber: n, displayName, kind, issueCode, changedFields});

const placeholderLine = "Guests go on a private draft event called \"Guest list\" in your profile; rename or date it in the Host app.";
const closingLine = "Nothing is saved until you confirm, and guests are not messaged.";

const base = {commandId: "guests.import-list" as const, effects: [] as GuestResponse["effects"], next: [] as GuestResponse["next"], receiptId: null};
const readResult = {
  eventId: guestFixtureEventId, fileFormat: "csv" as const, converter: {id: "generic-v1", support: "generic" as const, confidence: 0.6},
  headers: ["Name", "Phone", "Email", "Ticket"], columnShapes: ["text", "phone-like", "email-like", "text"] as GuestResponse["result"]["columnShapes"],
  mapping: readMapping, mappedBy: "converter" as const, needsMapping: false, sessionId, revision: 1, skipped: [], truncatedCount: 0, import: null,
};

const suggestions: GuestResponse["result"]["suggestions"] = [
  {rowId: "row-3", kind: "merge", reason: "samePhone", contactId: "contactKabir01", otherRowId: null, tag: null,
    label: "Kabir Shah may be Kabir S., already in your contacts (same phone)."},
  {rowId: "row-3", kind: "tag", reason: "seenBefore", contactId: "contactKabir01", otherRowId: null, tag: "Returning guest",
    label: "Kabir Shah has been to your events before."},
  {rowId: "row-2", kind: "tag", reason: "ticketType", contactId: null, otherRowId: null, tag: "Early bird", label: "Tag Meera Iyer \"Early bird\" from their ticket."},
  {rowId: "row-3", kind: "tag", reason: "ticketType", contactId: null, otherRowId: null, tag: "Early bird", label: "Tag Kabir Shah \"Early bird\" from their ticket."},
  {rowId: "row-4", kind: "tag", reason: "ticketType", contactId: null, otherRowId: null, tag: "Regular", label: "Tag Ira Desai \"Regular\" from their ticket."},
];

export const guestImportFixtures = {
  /** No converter knew the columns: the visitor chooses them. */
  needsMapping: {
    ...base, status: "needs_input", previewHash: hash("6"),
    summary: {headline: "We couldn't read this file's columns.",
      lines: ["Choose which column holds each guest's name, and their phone or email if the file has them, then preview again."]},
    result: {...readResult, converter: {id: "generic-v1", support: "generic", confidence: 0},
      headers: ["Guest", "Mobile", "Mail", "Pass"], mapping: noMapping, needsMapping: true, sessionId: null, revision: null,
      reviewHash: null, eligibleForApply: false, counts: zeroCounts, rows: [], suggestions: []},
  },
  /** Every row is ready: three to add, one already on the list. */
  previewed: {
    ...base, status: "previewed", previewHash: hash("7"),
    summary: {headline: "This adds 3 guests and updates 0 guests.", lines: [
      "Read as a guest list (columns matched by name).", placeholderLine,
      "1 guest looks like someone already in your contacts (same phone or email); you can merge them in Customers.",
      "1 guest already on the list unchanged.", closingLine]},
    result: {...readResult, reviewHash: hash("8"), eligibleForApply: true,
      counts: {...zeroCounts, add: 3, unchanged: 1},
      rows: [row(2, "Meera Iyer", "add"), row(3, "Kabir Shah", "add"), row(4, "Ira Desai", "add"), row(5, "Rohan Pillai", "unchanged", null, [])],
      suggestions},
  },
  /** Two rows need a look first, so the list cannot be saved as it is. */
  needsReview: {
    ...base, status: "previewed", previewHash: hash("9"),
    summary: {headline: "This adds 2 guests and updates 0 guests.", lines: [
      "Read as a guest list (columns matched by name).", placeholderLine,
      "2 guests need a look first: fix them in the file, or leave them out.", closingLine]},
    result: {...readResult, reviewHash: hash("a"), eligibleForApply: false,
      counts: {...zeroCounts, add: 2, needsReview: 2},
      rows: [row(2, "Meera Iyer", "add"), row(3, "Kabir Shah", "add"), row(4, "Ira Desai", "needsReview", "shared-phone-identity"),
        row(5, "Rohan Pillai", "needsReview", "invalid-phone")],
      suggestions: suggestions.filter((suggestion) => suggestion.rowId !== "row-4")},
  },
  /** The same list with the two rows left out: ready to save. */
  withLeftOut: {
    ...base, status: "previewed", previewHash: hash("b"),
    summary: {headline: "This adds 2 guests and updates 0 guests.", lines: [
      "Read as a guest list (columns matched by name).", placeholderLine, closingLine]},
    result: {...readResult, revision: 2, reviewHash: hash("c"), eligibleForApply: true,
      counts: {...zeroCounts, add: 2, excluded: 2},
      rows: [row(2, "Meera Iyer", "add"), row(3, "Kabir Shah", "add"), row(4, "Ira Desai", "excluded"), row(5, "Rohan Pillai", "excluded")],
      suggestions: suggestions.filter((suggestion) => suggestion.rowId !== "row-4")},
  },
  /** Saved into the try-it draft event. */
  applied: {
    ...base, status: "applied", previewHash: hash("7"), receiptId: `guestsImportList_${"d".repeat(64)}`,
    summary: {headline: "Saved: 3 guests added, 0 guests updated.", lines: [
      "Read as a guest list (columns matched by name).", placeholderLine, closingLine]},
    effects: [{kind: "guests_imported", ref: "eventAttendeeImports/importSaltAir01", label: "Event guest list"}],
    result: {...readResult, reviewHash: hash("8"), eligibleForApply: true,
      counts: {...zeroCounts, add: 3, unchanged: 1},
      rows: [row(2, "Meera Iyer", "add"), row(3, "Kabir Shah", "add"), row(4, "Ira Desai", "add"), row(5, "Rohan Pillai", "unchanged", null, [])],
      suggestions,
      import: {importId: "importSaltAir01", status: "completed", createdCount: 3, updatedCount: 0, skippedCount: 0}},
  },
} satisfies Record<string, GuestResponse>;

/** One scripted answer: an envelope, or a problem with the reason the callable gave. */
export type GuestScriptedAnswer<C extends TryItCommandId> = TryItResponse<C> | {problem: TryItProblem; reason?: string};

export interface GuestRecordedCall {
  readonly commandId: TryItCommandId;
  readonly mode: TryItMode;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly previewHash?: string;
}

/**
 * A command client that answers from a script, in order, per command and
 * mode, and records every call; the last answer repeats. Unlike the link
 * tools' scripted client it keeps a refusal's reason, which the guest-list
 * tool words (roster_file_too_large, needs_review, no_workspace).
 * workspace.ensure answers an existing profile unless scripted.
 */
export function scriptedGuestClient(script: {[C in TryItCommandId]?: Partial<Record<TryItMode, readonly GuestScriptedAnswer<C>[]>>},
  caller: TryItCaller | null = fixtureCaller): TryItCommandClient & {calls: GuestRecordedCall[]; setCaller(next: TryItCaller | null): void} {
  const calls: GuestRecordedCall[] = [];
  const used = new Map<string, number>();
  const answers = {"workspace.ensure": {preview: [workspaceFixtures.previewExisting]}, ...script} as typeof script;
  let current = caller;
  return {
    calls,
    setCaller(next) {
      current = next;
    },
    caller: async () => current,
    async call(commandId, request) {
      calls.push({commandId, ...request});
      const list = (answers[commandId]?.[request.mode] ?? []) as readonly GuestScriptedAnswer<typeof commandId>[];
      const at = `${commandId}:${request.mode}`;
      const index = used.get(at) ?? 0;
      used.set(at, index + 1);
      const answer = list[Math.min(index, list.length - 1)];
      if (!answer) return {ok: false, problem: "failed", reason: null};
      if ("problem" in answer) return {ok: false, problem: answer.problem, reason: answer.reason ?? null} as TryItCall<typeof commandId>;
      return {ok: true, response: answer} as TryItCall<typeof commandId>;
    },
  };
}
