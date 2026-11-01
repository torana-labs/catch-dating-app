import type {SalesOpportunity, SalesResearchStatus, SalesTask, SalesTaskKind} from "../api/salesTypes";

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

export function stageLabel(stage: string): string {
  const words = stage.replace(/_/gu, " ");
  return words[0]?.toUpperCase() + words.slice(1);
}
