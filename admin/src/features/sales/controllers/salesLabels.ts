import type {
  SalesContact,
  SalesEvidence,
  SalesHoldStatus,
  SalesOpportunity,
  SalesResearchStatus,
  SalesTask,
  SalesTaskKind,
} from "../api/salesTypes";
import type {CommercialQuote, CommercialSettlementInput, CommercialStatus, CommercialTerms} from "../api/salesCommercialTypes";

export const taskKindLabels: Record<SalesTaskKind, string> = {
  research: "Review", reply: "Reply", follow_up: "Follow-up", demo: "Demo", pilot: "Pilot",
  duplicate_review: "Review", opt_out: "Opt-out", service_commitment: "Commitment",
};

/** The Today chips: a kind of task, or all of them. */
export const todayKinds = [
  {value: "reply", label: "Replies", kinds: ["reply"]},
  {value: "follow_up", label: "Follow-ups", kinds: ["follow_up", "demo"]},
  {value: "review", label: "Reviews", kinds: ["research", "duplicate_review"]},
  {value: "pilot", label: "Pilots", kinds: ["pilot", "service_commitment"]},
] as const satisfies ReadonlyArray<{value: string; label: string; kinds: readonly SalesTaskKind[]}>;
export type TodayKind = typeof todayKinds[number]["value"];

export type TodayScope = "due" | "week" | "later" | "done";
export const todayScopeLabels: Record<TodayScope, string> = {due: "Due", week: "This week", later: "Later", done: "Done"};

const dayMs = 86_400_000;

function endOfToday(now: number): number {
  const day = new Date(now);
  day.setHours(23, 59, 59, 999);
  return day.getTime();
}

/** Which Today scope an open task is in: due today or overdue, due this week, or later. */
export function taskScope(task: SalesTask, now: number = Date.now()): TodayScope {
  if (task.status !== "open") return "done";
  if (!task.dueAt) return "later";
  const due = Date.parse(task.dueAt);
  return due <= endOfToday(now) ? "due" : due <= now + 7 * dayMs ? "week" : "later";
}

/** "Overdue", "Today", "Tomorrow", "Mon", "12 Nov". */
export function dueLabel(dueAt: string | null, now: number = Date.now()): {text: string; tone?: "warning" | "danger"} {
  if (!dueAt) return {text: "No date"};
  const due = Date.parse(dueAt);
  const today = endOfToday(now);
  if (due < today - dayMs) return {text: "Overdue", tone: "danger"};
  if (due <= today) return {text: "Today", tone: "warning"};
  if (due <= today + dayMs) return {text: "Tomorrow"};
  if (due <= now + 7 * dayMs) return {text: new Intl.DateTimeFormat("en-IN", {weekday: "short"}).format(new Date(due))};
  return {text: new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short"}).format(new Date(due))};
}

/** Next Monday at 10:00, where a snoozed task lands. */
export function nextMonday(now: number = Date.now()): string {
  const day = new Date(now);
  day.setDate(day.getDate() + ((8 - day.getDay()) % 7 || 7));
  day.setHours(10, 0, 0, 0);
  return day.toISOString();
}

export const researchLabels: Record<SalesResearchStatus, {text: string; tone?: "success" | "warning"}> = {
  new: {text: "New"}, needs_research: {text: "Needs research", tone: "warning"},
  ready_for_review: {text: "Ready for review", tone: "warning"}, qualified: {text: "Qualified", tone: "success"},
  benchmark_only: {text: "Benchmark only"}, no_fit: {text: "Not a fit"}, archived: {text: "Archived"},
};

/** The Deals board's five columns, from the opportunity stages. */
export const dealColumns = [
  {value: "new", label: "New", stages: ["new_enquiry", "ready_to_contact"]},
  {value: "talking", label: "Talking", stages: ["contacted", "in_conversation"]},
  {value: "demo", label: "Demo", stages: ["demo_arranged", "demo_completed"]},
  {value: "pilot", label: "Pilot", stages: ["pilot_agreed", "pilot_running"]},
  {value: "paying", label: "Paying", stages: ["commercial_discussion", "closed_won"]},
] as const;

export function dealColumn(deal: SalesOpportunity): typeof dealColumns[number]["value"] | null {
  return dealColumns.find((column) => (column.stages as readonly string[]).includes(deal.stage))?.value ?? null;
}

/** A market slug as a person reads it: "mumbai" is "Mumbai". */
export function cityLabel(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/** The stages a person can move a deal to. Closing as won needs payment proof, so it stays in All tools. */
export const movableStages = ["new_enquiry", "ready_to_contact", "contacted", "in_conversation", "demo_arranged", "demo_completed",
  "pilot_agreed", "pilot_running", "commercial_discussion", "closed_lost"];

export const hostActivityTypes: Array<{value: "note" | "reply" | "call" | "demo" | "pilot" | "outreach_sent_manual"; label: string}> = [
  {value: "note", label: "A note"}, {value: "call", label: "A call"}, {value: "reply", label: "They replied"},
  {value: "demo", label: "A demo"}, {value: "pilot", label: "A pilot update"},
  {value: "outreach_sent_manual", label: "I messaged them elsewhere"},
];

export const dealMotions: Array<{value: string; label: string}> = [
  {value: "first_workflow_pilot", label: "First workflow pilot"},
  {value: "listing_claim_assistance", label: "Listing claim assistance"},
  {value: "inbound_stack_review", label: "Inbound stack review"},
  {value: "expansion", label: "Expansion"},
  {value: "renewal", label: "Renewal"},
];

export const decisionInfluences = [
  {value: "unknown", label: "Not sure"}, {value: "decision_maker", label: "Decides"},
  {value: "influencer", label: "Influences"}, {value: "operator", label: "Runs things day to day"},
] as const;

/** A person's contact review. None of these gives permission to send anything. */
export const contactReviewLabels: Record<SalesContact["relationship"]["contactabilityStatus"], {text: string; tone?: "success" | "warning" | "danger"}> = {
  unknown: {text: "Not reviewed"},
  draft_reviewed: {text: "Reviewed for drafts", tone: "success"},
  held: {text: "On hold", tone: "warning"},
  suppressed: {text: "Don't contact", tone: "danger"},
};

export function salesErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/aborted|revision mismatch|record changed since review/iu.test(message)) {
    return "Someone updated this record. Compare the latest details before saving again. Your edits are still here.";
  }
  return message || "The change could not be saved. Your edits are still here.";
}

/** A select's values and labels, from a list of both. */
export function selectChoices(options: ReadonlyArray<{value: string; label: string}>) {
  return {values: options.map((option) => option.value),
    itemLabelBuilder: (value: string) => options.find((option) => option.value === value)?.label ?? value};
}

export function stageLabel(stage: string): string {
  const words = stage.replace(/_/gu, " ");
  return words[0]?.toUpperCase() + words.slice(1);
}

export const evidenceClaimLabels: Record<SalesEvidence["claimKey"], string> = {
  identity: "Who they are", recurrence: "How often they run events", operation: "How they run events",
  stack: "Tools they use", other: "Something else",
};
export const evidenceSourceLabels: Record<SalesEvidence["sourceType"], string> = {
  first_party: "The host told us", public_web: "Public web", human_note: "Staff note", import_artifact: "An import",
};
export const evidenceConfidenceLabels: Record<SalesEvidence["confidence"], string> = {high: "High", medium: "Medium", low: "Low"};
export const holdLabels: Record<SalesHoldStatus, string> = {clear: "None", held: "On hold", suppressed: "Suppressed"};

/** What a datetime field shows: local wall-clock time, not UTC. */
export function localInput(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export const isoFrom = (local: string): string | null => {
  const at = new Date(local);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
};

/** A deal's pilot, quote and collection, in the words on the host page. */
export const pilotStatusLabels: Record<CommercialStatus, string> = {
  draft: "Draft", reviewed: "Reviewed", active: "Running", completed: "Finished", cancelled: "Cancelled",
};
export const quoteStatusLabels: Record<CommercialQuote["status"], string> = {
  draft: "Draft", approved: "Approved", accepted_reviewed: "Accepted",
};
export const billingCadenceLabels: Record<CommercialTerms["billingCadence"], string> = {
  one_time: "One time", monthly: "Monthly", annual: "Yearly", usage_based: "By usage",
};
export const settlementMethodLabels: Record<CommercialSettlementInput["settlementMethod"], string> = {
  bank_transfer: "Bank transfer", cash: "Cash", other_external: "Another way, outside Catch",
};
export const moneyLabel = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {style: "currency", currency}).format(amountMinor / 100);
