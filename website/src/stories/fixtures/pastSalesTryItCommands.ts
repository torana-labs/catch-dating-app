import type {TryItCaller} from "../../firebase";
import type {TryItCall, TryItCommandClient, TryItCommandId, TryItMode, TryItProblem, TryItResponse} from "../../shared/api/tryItCommands";
import {fixtureCaller, fixtureOrganizerId} from "./tryItCommands";

/**
 * sales.import-past envelopes as the callable answers them, for Reports'
 * export upload tests and stories. A fictional organiser, its fictional
 * past night and its fictional guests only; pastSalesFixtures.test.ts
 * checks every one against the response schema.
 */

const hash = (seed: string) => seed.repeat(64).slice(0, 64);
export const fixturePastEventId = "evtSaltAirPastNight01";

type Response = TryItResponse<"sales.import-past">;
type Report = NonNullable<Response["result"]["report"]>;

const base = {commandId: "sales.import-past" as const, effects: [] as Response["effects"], next: [] as Response["next"], receiptId: null};
const emptyResult = {organizerId: fixtureOrganizerId, eventId: null, converter: null, needsMapping: false, headers: [] as string[],
  columnShapes: [] as string[], report: null, rowsNeedingReview: [] as Response["result"]["rowsNeedingReview"], import: null, reasons: [] as string[]};
const gatewayNote = "Payment gateway fees are charged by your payment provider either way, so they're left out of both.";

/** A night the export tells everything about: amounts, check-ins, earlier guests and the host's current fee. */
const fullReport: Report = {
  eventName: "Salt Air Social Run", localDate: "2026-11-16", ticketsSold: 52, grossSalesMinor: 2_080_000, currency: "INR", amountSource: "file",
  byTicketType: [{ticketType: "General", count: 40, grossMinor: 1_600_000}, {ticketType: "Early bird", count: 12, grossMinor: 480_000}],
  attendance: {came: 46, noShows: 6, showRate: 46 / 52}, attendanceReason: null,
  guests: {firstTime: 11, repeat: 35}, guestsReason: null,
  fees: {
    catch: {feeMinor: 104_000, rateBasisPoints: 500, effectiveRateBasisPoints: 500, capMinor: 1_000_000, capReachedAtMinor: 20_000_000, cycleDays: 30, freeTrialDays: 30},
    catchReason: null, current: {feeMinor: 114_400, currency: "INR"}, differenceMinor: 10_400, gatewayNote,
  },
  skippedRows: 1,
};

/** A guest list with no amounts, no check-ins and no earlier nights: every gap comes with its reason, and no fee is worked out. */
const thinReport: Report = {
  eventName: "Past event", localDate: "2026-11-19", ticketsSold: 38, grossSalesMinor: null, currency: null, amountSource: "none",
  byTicketType: [{ticketType: null, count: 38, grossMinor: null}],
  attendance: null, attendanceReason: "no_checkin_status",
  guests: null, guestsReason: "no_earlier_nights",
  fees: {catch: null, catchReason: "no_sales_amounts", current: null, differenceMinor: null, gatewayNote},
  skippedRows: 0,
};

const converter = {id: "generic_csv", support: "generic", confidence: 0.82} as const;

export const pastSalesFixtures = {
  noWorkspace: {
    ...base, status: "needs_input", previewHash: hash("1"),
    summary: {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your past night."]},
    next: [{commandId: "workspace.ensure", label: "Set up your organizer profile"}],
    result: {...emptyResult, organizerId: null, reasons: ["no_workspace"]},
  },
  needsMapping: {
    ...base, status: "needs_input", previewHash: hash("2"),
    summary: {headline: "We couldn't read this file's columns.", lines: ["Choose which column holds each guest's name, then preview again."]},
    result: {...emptyResult, needsMapping: true, headers: ["Attendee", "Mobile", "Tier", "Paid (INR)", "Checked in"],
      columnShapes: ["text", "phone-like", "text", "number", "text"], reasons: ["needs_mapping"]},
  },
  previewed: {
    ...base, status: "previewed", previewHash: hash("3"),
    summary: {headline: "Your night on 2026-11-16", lines: ["52 tickets sold, ₹20,800 in sales.", "46 came, 6 didn't (88% showed up).",
      "Nothing is saved until you confirm, and no one is messaged."]},
    result: {...emptyResult, converter, report: fullReport},
  },
  previewedAgain: {
    ...base, status: "previewed", previewHash: hash("4"),
    summary: {headline: "Your night on 2026-11-16", lines: ["51 tickets sold, ₹20,400 in sales.", "Nothing is saved until you confirm, and no one is messaged."]},
    result: {...emptyResult, converter, report: {...fullReport, ticketsSold: 51, grossSalesMinor: 2_040_000, skippedRows: 2}},
  },
  thin: {
    ...base, status: "previewed", previewHash: hash("5"),
    summary: {headline: "Your night on 2026-11-19", lines: ["38 tickets sold.", gatewayNote, "Nothing is saved until you confirm, and no one is messaged."]},
    result: {...emptyResult, converter, report: thinReport},
  },
  rowsNeedReview: {
    ...base, status: "previewed", previewHash: hash("6"),
    summary: {headline: "Your night on 2026-11-16", lines: ["52 tickets sold, ₹20,800 in sales.", "1 guest row need a look before saving."]},
    result: {...emptyResult, converter, report: fullReport,
      rowsNeedingReview: [{rowId: "7", sourceRowNumber: 7, displayName: "Ananya Rao", issues: ["invalid-revenue-amount"]}]},
  },
  applied: {
    ...base, status: "applied", previewHash: hash("4"), receiptId: `salesImportPast_${"a".repeat(64)}`,
    summary: {headline: "\"Salt Air Social Run\" is saved as a private past event.", lines: ["51 tickets sold, ₹20,400 in sales."]},
    effects: [{kind: "draft_event", ref: `events/${fixturePastEventId}`, label: "Private past event: Salt Air Social Run"}],
    result: {...emptyResult, converter, eventId: fixturePastEventId, report: {...fullReport, ticketsSold: 51, grossSalesMinor: 2_040_000, skippedRows: 2},
      import: {importId: "imp_saltair_01", createdCount: 49, updatedCount: 2}},
  },
} satisfies Record<string, Response>;

/** One scripted answer: an envelope, or a problem the command client names with the command's reason. */
export type PastSalesScriptedAnswer<C extends TryItCommandId> = TryItResponse<C> | {problem: TryItProblem; reason?: string};

export interface PastSalesRecordedCall {
  readonly commandId: TryItCommandId;
  readonly mode: TryItMode;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly previewHash?: string;
}

/**
 * A command client that answers from a script, in order, per command and
 * mode, and records every call; the last answer repeats when the script
 * runs out, so a story can stay on a step. Unlike the link tools' scripted
 * client it passes the command's reason with a problem, which the upload's
 * file errors are worded from.
 */
export function scriptedPastSalesClient(script: {[C in TryItCommandId]?: Partial<Record<TryItMode, readonly PastSalesScriptedAnswer<C>[]>>},
  caller: TryItCaller | null = fixtureCaller): TryItCommandClient & {calls: PastSalesRecordedCall[]; setCaller(next: TryItCaller | null): void} {
  const calls: PastSalesRecordedCall[] = [];
  const used = new Map<string, number>();
  let current = caller;
  return {
    calls,
    setCaller(next) {
      current = next;
    },
    caller: async () => current,
    async call(commandId, request) {
      calls.push({commandId, ...request});
      const answers = (script[commandId]?.[request.mode] ?? []) as readonly PastSalesScriptedAnswer<typeof commandId>[];
      const at = `${commandId}:${request.mode}`;
      const index = used.get(at) ?? 0;
      used.set(at, index + 1);
      const answer = answers[Math.min(index, answers.length - 1)];
      if (!answer) return {ok: false, problem: "failed", reason: null};
      if ("problem" in answer) return {ok: false, problem: answer.problem, reason: answer.reason ?? null} as TryItCall<typeof commandId>;
      return {ok: true, response: answer} as TryItCall<typeof commandId>;
    },
  };
}

/** A small export as the visitor would choose it. */
export function fixtureExportFile(name = "salt-air-sales.csv"): File {
  return new File(["Name,Ticket,Amount\nAnanya Rao,General,400\nMaya,Early bird,400\n"], name, {type: "text/csv"});
}
