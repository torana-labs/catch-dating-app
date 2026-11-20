import {eventRuntimeSocialMissionCopy} from "@content/eventRuntime";
import {interpolateContent as fill} from "@content/interpolate";
import {nightPlanFormats, nightPlanTryItCopy as copy, type NightPlanFormat} from "@content/nightPlanTryIt";
import type {TryItRehearsalPayload} from "../../firebase";
import type {TryItInput, TryItResponse} from "../../shared/api/tryItCommands";

/**
 * The plan-a-night tool's words for what night.plan answers
 * (contracts/callable_responses/plan_night_response.schema.json), worked out
 * here so the view only draws lines. Every line names something the plan
 * holds; mission text comes from the event runtime's copy by promptId and a
 * mission with no words on this site is left out, never made up.
 */

type PlanResult = TryItResponse<"night.plan">["result"];
export type NightPlan = NonNullable<PlanResult["plan"]>;
export type NightRehearsalSetup = NonNullable<PlanResult["rehearsalSetup"]>;
export type NightPlanInput = TryItInput<"night.plan">;

export const NIGHT_PLAN_MIN_GUESTS = 2;
export const NIGHT_PLAN_MAX_GUESTS = 1000;
/** How many pace group labels the card lists before "and N more". */
const LISTED_LABELS = 12;

export function isNightPlanFormat(value: string | null): value is NightPlanFormat {
  return value !== null && (nightPlanFormats as readonly string[]).includes(value);
}

/** The head count as typed, when it is a whole number night.plan takes; otherwise null. */
export function nightPlanGuestCount(typed: string): number | null {
  const value = typed.trim().replace(/[,\s]/gu, "");
  if (!/^\d{1,4}$/u.test(value)) return null;
  const count = Number(value);
  return count >= NIGHT_PLAN_MIN_GUESTS && count <= NIGHT_PLAN_MAX_GUESTS ? count : null;
}

/** The singular or plural form, filled with the values it names ("1 pair" names no size). */
function plural(forms: {readonly one: string; readonly other: string}, count: number, values: Record<string, string> = {}): string {
  const template: string = count === 1 ? forms.one : forms.other;
  const all: Record<string, string> = {count: String(count), ...values};
  return fill(template, Object.fromEntries(Object.entries(all).filter(([token]) => template.includes(`{${token}}`))));
}

/** "Run for 32". */
export function nightPlanHeadline(plan: NightPlan): string {
  return fill(copy.headline, {format: copy.formatLabels[plan.format], count: String(plan.guestCount)});
}

export interface NightPlanGroupLines {
  /** The groups in one line: "4 pace groups", "8 courts, 4 players on each". */
  readonly title: string;
  /** The pace group labels as the server wrote them, fastest first, and how many more there are. */
  readonly labels: readonly string[];
  readonly moreLabels: number;
  /** Further plain lines: the bench, the stops, unset paces. */
  readonly notes: readonly string[];
  /** Said when the count stopped at the plan's 200-group limit. */
  readonly limited: string | null;
}

/** The plan's groups in words, by kind. */
export function nightPlanGroupLines(plan: NightPlan): NightPlanGroupLines {
  const {groups} = plan;
  const size = String(groups.size ?? "");
  const notes: string[] = [];
  let title: string;
  switch (groups.kind) {
    case "paceGroups":
      title = plural(copy.groups.paceGroups, groups.count);
      if (groups.paceBands.some((band) => band.targetPaceSecondsPerKm === null)) notes.push(copy.groups.paceUnset);
      break;
    case "courts":
      title = plural(copy.groups.courts, groups.count, {size});
      if (groups.benchCount > 0) notes.push(plural(copy.groups.bench, groups.benchCount));
      break;
    case "units": {
      const unit = groups.unitKind === "tables" || groups.unitKind === "teams" || groups.unitKind === "pods" || groups.unitKind === "pairs" ?
        groups.unitKind : "groups";
      title = groups.unitKind === "wholeGroup" ? copy.groups.wholeGroup : plural(copy.groups.units[unit], groups.count, {size});
      break;
    }
    case "wholeGroup":
      title = copy.groups.wholeGroup;
      break;
  }
  if (plan.stops !== null) notes.push(plural(copy.groups.stops, plan.stops));
  const labels = groups.kind === "paceGroups" ? groups.labels : [];
  return {
    title,
    labels: labels.slice(0, LISTED_LABELS),
    moreLabels: Math.max(0, labels.length - LISTED_LABELS),
    notes,
    limited: groups.countLimited ? (groups.kind === "courts" ? copy.groups.countLimitedCourts : copy.groups.countLimitedGroups) : null,
  };
}

/** Whether the head count is below, within or above what the format is built for, in a line. */
export function nightPlanCapacityLine(plan: NightPlan): string {
  return fill(copy.capacity[plan.capacity.fit], {min: String(plan.capacity.min), max: String(plan.capacity.max)});
}

/** When people mix, in a line. */
export function nightPlanMixingLine(plan: NightPlan): string {
  const moment = plan.mixingMoment;
  const activity = copy.runOfShow.during[plan.format];
  switch (moment.kind) {
    case "runOfShowStage":
      return moment.durationMinutes > 0 ? fill(copy.mixing.stage, {minutes: String(moment.durationMinutes)}) : copy.mixing.stageUntimed;
    case "rotation":
      return moment.rotationIntervalMinutes !== null ?
        fill(copy.mixing.rotation, {minutes: String(moment.rotationIntervalMinutes), activity}) :
        fill(copy.mixing.rotationUntimed, {activity});
    case "teamRevealAtRoundBreak":
      return copy.mixing.teamReveal;
  }
}

export interface NightPlanStep {
  readonly stage: string;
  readonly label: string;
  readonly minutes: string;
}

/** The run of show as rows; a stage this site has no name for is left out (the total still counts it). */
export function nightPlanRunOfShow(plan: NightPlan): {steps: readonly NightPlanStep[]; total: string} {
  const stages: Readonly<Record<string, string>> = copy.runOfShow.stages;
  const steps = plan.runOfShow.flatMap((step) => {
    const label = step.stage === "activity" ? copy.runOfShow.activity[plan.format] : Object.hasOwn(stages, step.stage) ? stages[step.stage] : null;
    return label ? [{stage: step.stage, label, minutes: fill(copy.runOfShow.minutes, {minutes: String(step.durationMinutes)})}] : [];
  });
  return {steps, total: fill(copy.runOfShow.total, {minutes: String(plan.durationMinutes)})};
}

export interface NightPlanMission {
  readonly promptId: string;
  readonly title: string;
  readonly body: string;
}

/** The plan's missions in the event runtime's words; one whose promptId has no words here is skipped. */
export function nightPlanMissions(plan: NightPlan): readonly NightPlanMission[] {
  const prompts: Readonly<Record<string, string>> = eventRuntimeSocialMissionCopy.prompts;
  const titles: Readonly<Record<string, string>> = eventRuntimeSocialMissionCopy.titles;
  return plan.missions.flatMap((mission) => {
    const body = Object.hasOwn(prompts, mission.promptId) ? prompts[mission.promptId] : null;
    const title = Object.hasOwn(titles, mission.disclosureLevel) ? titles[mission.disclosureLevel] : null;
    return body && title ? [{promptId: mission.promptId, title, body}] : [];
  });
}

const MAX_REHEARSAL_ACTORS = 50;

/**
 * The practice session createEventRehearsal starts for this plan: the
 * workspace's organiser, no source event, simulated guests sized to the
 * night (2 to 50), the smooth-run scenario and the setup night.plan
 * answered, running at once so a friend opening the link can take part.
 */
export function nightRehearsalPayload(params: {organizerId: string; plan: NightPlan; setup: NightRehearsalSetup; seed: number}): TryItRehearsalPayload {
  return {
    organizerId: params.organizerId,
    sourceEventId: null,
    scenarioId: "smoothRun",
    seed: params.seed,
    actorCount: Math.max(NIGHT_PLAN_MIN_GUESTS, Math.min(MAX_REHEARSAL_ACTORS, params.plan.guestCount)),
    setup: params.setup,
    guestSource: "simulated",
    startImmediately: true,
  };
}

/** A seed in the callable's range (1 to 2^31 - 1). */
export function nightRehearsalSeed(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 2_147_483_646);
}

/** The guest link when it is a web address to show and encode; otherwise null. */
export function nightRehearsalGuestUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
