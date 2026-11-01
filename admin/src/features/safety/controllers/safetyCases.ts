import type {AdminQueueItem} from "../../../shared/types/adminTypes";
import type {AccountAction} from "../api/accountSafetyRepository";
import type {SafetyTriageRow} from "./useSafetyTriageController";

/**
 * The rows of the Safety boards (AdminSafety, AdminSafetyActions): open
 * cases from every queue, including launch access, due soonest first; and
 * account actions with what they are, until when, and where they stand.
 */

export type SafetyCaseKind = "report" | "flag" | "event" | "access";
export type SafetyTone = "danger" | "warning" | "success" | "secondary";

export interface SafetyCaseRow {
  key: string;
  kind: SafetyCaseKind;
  targetPath: string;
  case: {title: string; subtitle: string};
  kindLabel: {label: string; tone: "neutral"};
  due: {text: string; tone?: SafetyTone};
  dueAtMs: number;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** First look within 24 hours (Settings → Safety deadlines). */
const FIRST_LOOK_MS = 24 * HOUR;

const kindLabels: Record<SafetyCaseKind, string> = {
  report: "Report", flag: "Flag", event: "Event", access: "Access",
};

function kindFor(row: SafetyTriageRow): SafetyCaseKind {
  if (row.queueKind === "moderation") return "flag";
  if (row.queueKind === "event") return "event";
  return "report";
}

/** "Due in 2 hours", "Overdue by 1 day", "Due Mon". */
export function dueLabel(dueAtMs: number, nowMs: number):
  {text: string; tone?: SafetyTone} {
  const diff = dueAtMs - nowMs;
  if (diff < 0) {
    const late = -diff;
    return {text: late < DAY ?
      `Overdue by ${Math.max(1, Math.round(late / HOUR))}h` :
      `Overdue by ${Math.round(late / DAY)}d`, tone: "danger"};
  }
  if (diff < 6 * HOUR) {
    const hours = Math.max(1, Math.round(diff / HOUR));
    return {text: `Due in ${hours} hour${hours === 1 ? "" : "s"}`,
      tone: "danger"};
  }
  if (diff < DAY) return {text: "Due today", tone: "warning"};
  if (diff < 2 * DAY) return {text: "Due tomorrow"};
  return {text: `Due ${new Date(dueAtMs).toLocaleDateString("en-GB",
    {weekday: "short", timeZone: "Asia/Kolkata"})}`};
}

function waitingLabel(createdMs: number, nowMs: number): string {
  const days = Math.floor((nowMs - createdMs) / DAY);
  if (days >= 1) return `Waiting ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.floor((nowMs - createdMs) / HOUR));
  return `Waiting ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Every open case, due soonest first; access waits rather than falls due. */
export function safetyCaseRows(
  triage: readonly SafetyTriageRow[],
  access: readonly AdminQueueItem[],
  nowMs: number
): SafetyCaseRow[] {
  const cases = triage.map((row): SafetyCaseRow => {
    const kind = kindFor(row);
    const createdMs = row.createdAt ? Date.parse(row.createdAt) : nowMs;
    const dueAtMs = createdMs + FIRST_LOOK_MS;
    return {
      key: row.targetPath, kind, targetPath: row.targetPath,
      case: {title: row.title, subtitle: row.detail},
      kindLabel: {label: kindLabels[kind], tone: "neutral"},
      due: dueLabel(dueAtMs, nowMs), dueAtMs,
    };
  });
  const applications = access.map((row): SafetyCaseRow => {
    const createdMs = row.createdAt ? Date.parse(row.createdAt) : nowMs;
    return {
      key: `access:${row.targetPath}`, kind: "access", targetPath: row.targetPath,
      case: {title: row.title, subtitle: row.detail},
      kindLabel: {label: kindLabels.access, tone: "neutral"},
      due: {text: waitingLabel(createdMs, nowMs)},
      dueAtMs: createdMs + 7 * DAY,
    };
  });
  return [...cases, ...applications].sort((a, b) => a.dueAtMs - b.dueAtMs);
}

export function filterSafetyCases(
  rows: readonly SafetyCaseRow[],
  kind: SafetyCaseKind | "all",
  query: string
): SafetyCaseRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => (kind === "all" || row.kind === kind) &&
    (!needle || `${row.case.title} ${row.case.subtitle}`.toLowerCase()
      .includes(needle)));
}

export function safetyCaseCounts(rows: readonly SafetyCaseRow[]):
  Record<SafetyCaseKind | "all", number> {
  const count = (kind: SafetyCaseKind) =>
    rows.filter((row) => row.kind === kind).length;
  return {all: rows.length, report: count("report"), flag: count("flag"),
    event: count("event"), access: count("access")};
}

export interface AccountActionRow {
  key: string;
  who: {title: string; subtitle: string};
  action: {label: string; tone: "neutral"};
  until: string;
  state: {text: string; tone?: SafetyTone};
}

const actionNames: Record<AccountAction["kind"], string> = {
  warn: "Warning", restrict: "Restriction", suspend: "Suspension",
  ban: "Ban",
};

export function actionName(kind: AccountAction["kind"]): string {
  return actionNames[kind];
}

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {day: "numeric",
    month: "short", timeZone: "Asia/Kolkata"});
}

/** Where an action stands: appealed, in force, or how it ended. */
export function actionState(action: AccountAction):
  {text: string; tone?: SafetyTone} {
  if (action.appeal?.status === "open") {
    return {text: "Appealed", tone: "warning"};
  }
  if (action.status === "lifted") return {text: "Lifted"};
  if (action.status === "expired") return {text: "Ended"};
  if (action.status === "replaced") return {text: "Reduced on appeal"};
  if (action.automatic) return {text: "Pending review", tone: "warning"};
  return {text: "In force"};
}

export function accountActionRows(actions: readonly AccountAction[]):
  AccountActionRow[] {
  return actions.map((action) => ({
    key: action.actionId,
    who: {
      title: action.displayName ?? action.uid,
      subtitle: action.automatic ?
        `${action.reasonLabel} · restricted automatically` :
        action.reasonLabel,
    },
    action: {label: actionNames[action.kind], tone: "neutral"},
    until: action.kind === "warn" ? "—" : action.endsAtMillis === null ?
      action.kind === "ban" ? "Permanent" : "Until lifted" :
      `Until ${dateLabel(action.endsAtMillis)}`,
    state: actionState(action),
  }));
}

/** The facts beside an action, in the board's order. */
export function accountActionFacts(action: AccountAction):
  Array<{label: string; value: string; tone?: SafetyTone}> {
  const decidedBy = action.decidedByRole === "system" ?
    "Automatically, on a severe report" :
    action.decidedByRole === "owner" ? "The owner" : "Ops";
  const facts: Array<{label: string; value: string; tone?: SafetyTone}> = [
    {label: "Action", value: `${actionNames[action.kind]} on ` +
      dateLabel(action.startsAtMillis)},
    {label: "Rule", value: action.reasonLabel},
    {label: "Decided by", value: decidedBy},
  ];
  if (action.kind === "suspend" || action.kind === "ban") {
    const {cancelled, needsOrganizer} = action.bookings;
    facts.push({label: "Bookings", value: needsOrganizer > 0 ?
      `${cancelled} cancelled · ${needsOrganizer} for the organizer to ` +
        "refund" : `${cancelled} cancelled`,
    tone: needsOrganizer > 0 ? "warning" : undefined});
  }
  if (action.kind === "ban") {
    facts.push({label: "New accounts",
      value: action.blockedSignupAttempts === 0 ? "None tried" :
        `${action.blockedSignupAttempts} blocked`,
      tone: action.blockedSignupAttempts > 0 ? "danger" : undefined});
  }
  if (action.caseTargetPaths.length > 0) {
    facts.push({label: "Case", value: action.caseTargetPaths.join(", ")});
  }
  return facts;
}
