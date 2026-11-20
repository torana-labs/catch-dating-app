/* eslint-disable max-len */
import {resolveAssignmentTopology, type EventSuccessUnitKind} from "./assignmentTopology";
import {
  eventSuccessPlaybookShape,
  eventSuccessStructureDefaults,
  nightPlanFormats,
  type EventSuccessStructureDefault,
  type NightPlanFormat,
  type NightPlanFormatId,
} from "../shared/generated/eventSuccessPlaybookShapes";
import {
  eventSuccessSocialMissionPromptFor,
  type EventSuccessInteractionModel,
} from "../shared/generated/eventSuccessMomentPresentations";

// Plan a night (#2062 C4, rules accepted by the owner on 19 Nov 2026). Every
// number comes from the shared playbook-shape catalog
// (contracts/catalogs/event_success_playbook_shapes.json) that Catch Host
// reads too; missions are the format's existing light, personal and
// reflective prompts (event_success_moment_presentations.json). Prompt text
// lives with each client (l10n, the website's event runtime copy), keyed by
// promptId, so this returns ids, never copied text.

export const NIGHT_PLAN_MIN_GUESTS = 2;
/**
 * The only hard limits are the plan contract's own bounds: a plan's
 * targetAttendeeCount is 1–1000 and its structureConfig.unitCount is 1–200
 * (contracts/firestore/event_success_plans.schema.json,
 * contracts/shared/event_common.schema.json). Pace groups have no cap of
 * their own (owner decision, 19 Nov 2026).
 */
export const NIGHT_PLAN_MAX_GUESTS = 1000;
export const NIGHT_PLAN_MAX_UNITS = 200;

export interface NightPlanGroups {
  kind: "paceGroups" | "courts" | "units" | "wholeGroup";
  /** Groups, courts or units in play at once. */
  count: number;
  /** Target guests per group; null for pace groups, which vary by pace. */
  size: number | null;
  unitKind: EventSuccessUnitKind | null;
  /** Display labels: one per pace group, fastest first; empty for other kinds. */
  labels: string[];
  /** Pace groups, fastest first; each pace is null until the host sets it. */
  paceBands: PaceBand[];
  /** Guests waiting their turn when courts are full. */
  benchCount: number;
  /** True when the count stopped at the plan contract's unit limit (NIGHT_PLAN_MAX_UNITS). */
  countLimited: boolean;
}

/** One pace group: "~m:ss/km" once its target pace is known, else "Pace group N". */
export interface PaceBand {
  label: string;
  targetPaceSecondsPerKm: number | null;
}

export interface NightPlan {
  format: NightPlanFormatId;
  guestCount: number;
  playbookId: string;
  activityKind: string;
  interactionModel: string;
  capacity: {min: number; max: number; fit: "below" | "within" | "above"};
  groups: NightPlanGroups;
  mixingMoment: {kind: NightPlanFormat["mixingMoment"]["kind"]; stage: string; durationMinutes: number;
    rotationIntervalMinutes: number | null};
  runOfShow: Array<{stage: string; durationMinutes: number}>;
  durationMinutes: number;
  stops: number | null;
  missions: Array<{promptId: string; disclosureLevel: string}>;
  /** The plan's structure, in the shape eventSuccessPlans stores. */
  structureConfig: Record<string, unknown>;
}

/** The night for a format and head count, or null for an unknown format. */
export function planNight(format: NightPlanFormatId, guestCount: number): NightPlan | null {
  const entry = nightPlanFormats.find((item) => item.format === format);
  const shape = entry ? eventSuccessPlaybookShape(entry.playbookId) : null;
  const model = entry ? interactionModelFor(entry.playbookId) : null;
  if (!entry || !shape || !model) return null;
  const structure = eventSuccessStructureDefaults[model];
  const n = Math.max(NIGHT_PLAN_MIN_GUESTS, Math.min(NIGHT_PLAN_MAX_GUESTS, Math.floor(guestCount)));
  const structureConfig = structureConfigFor(structure, n);
  const runOfShow = shape.runOfShow.map((step) => ({stage: step.stage, durationMinutes: step.durationMinutes}));
  const mixingStep = runOfShow.find((step) => step.stage === entry.mixingMoment.stage);
  const groups = groupsFor(entry, structureConfig, structure, n);
  // Units stopped at the contract's limit are stored as a fixed count, so the live engine sizes them the same way.
  if (groups.kind === "units" && groups.countLimited) structureConfig.unitCount = groups.count;
  return {
    format, guestCount: n, playbookId: shape.playbookId, activityKind: shape.activityKind, interactionModel: model,
    capacity: {min: shape.capacity.min, max: shape.capacity.max,
      fit: n < shape.capacity.min ? "below" : n > shape.capacity.max ? "above" : "within"},
    groups,
    mixingMoment: {kind: entry.mixingMoment.kind, stage: entry.mixingMoment.stage,
      durationMinutes: mixingStep?.durationMinutes ?? 0,
      rotationIntervalMinutes: entry.mixingMoment.kind === "rotation" ? structure.rotationIntervalMinutes : null},
    runOfShow,
    durationMinutes: runOfShow.reduce((sum, step) => sum + step.durationMinutes, 0),
    stops: entry.defaultStops,
    missions: [0, 1, 2].map((activeStepIndex) => {
      const prompt = eventSuccessSocialMissionPromptFor({interactionModel: model as EventSuccessInteractionModel,
        activeStepIndex});
      return {promptId: prompt.promptId, disclosureLevel: prompt.disclosureLevel};
    }),
    structureConfig,
  };
}

/** The interaction model whose default playbook this is. */
export function interactionModelFor(playbookId: string): string | null {
  return Object.values(eventSuccessStructureDefaults)
    .find((item) => item.defaultPlaybookId === playbookId)?.interactionModel ?? null;
}

function groupsFor(entry: NightPlanFormat, structureConfig: Record<string, unknown>,
  structure: EventSuccessStructureDefault, n: number): NightPlanGroups {
  const groups = entry.groups;
  switch (groups.kind) {
  case "paceGroups": {
    const wanted = Math.max(groups.minGroups, Math.ceil(n / groups.guestsPerGroup));
    const count = Math.min(NIGHT_PLAN_MAX_UNITS, wanted);
    const paceBands = paceBandsFor(Array.from({length: count}, () => null));
    return {kind: "paceGroups", count, size: null, unitKind: null, labels: paceBands.map((band) => band.label),
      paceBands, benchCount: 0, countLimited: count < wanted};
  }
  case "courts": {
    const wanted = Math.max(1, Math.floor(n / groups.seatsPerCourt));
    const count = Math.min(NIGHT_PLAN_MAX_UNITS, wanted);
    return {kind: "courts", count, size: groups.seatsPerCourt, unitKind: "pairs", labels: [], paceBands: [],
      benchCount: Math.max(0, n - count * groups.seatsPerCourt), countLimited: count < wanted};
  }
  case "structureDefault": {
    // The live assignment engine's own sizing, so the plan matches the night.
    const topology = resolveAssignmentTopology({structureConfig}, n,
      {defaultUnitKind: structure.unitKind, defaultUnitSize: typeof structure.unitSize === "number" ? structure.unitSize : n});
    const count = Math.min(NIGHT_PLAN_MAX_UNITS, topology.groupCount);
    // Past the unit limit the same number of guests share fewer, larger units.
    const size = count < topology.groupCount ? Math.ceil(n / count) : topology.unitSize;
    return {kind: "units", count, size, unitKind: topology.unitKind, labels: [], paceBands: [], benchCount: 0,
      countLimited: count < topology.groupCount};
  }
  case "wholeGroup":
    return {kind: "wholeGroup", count: 1, size: n, unitKind: "wholeGroup", labels: [], paceBands: [], benchCount: 0,
      countLimited: false};
  }
}

/**
 * Pace groups in order, fastest first. A group with a target pace is
 * labelled "~m:ss/km", matching RoutePaceGroup.targetPaceSecondsPerKm in the
 * Host app's route plan; one without is "Pace group N".
 */
export function paceBandsFor(paces: ReadonlyArray<number | null>): PaceBand[] {
  return paces.map((pace, index) => ({targetPaceSecondsPerKm: pace,
    label: pace === null ? `Pace group ${index + 1}` : `~${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km`}));
}

function structureConfigFor(structure: EventSuccessStructureDefault, n: number): Record<string, unknown> {
  const unitSize = structure.unitSize === "attendees" ? n : structure.unitSize;
  const resource = structure.resource;
  return {
    unitKind: structure.unitKind,
    unitSize,
    ...(structure.unitCount !== null ? {unitCount: structure.unitCount} : {}),
    ...(structure.rotationIntervalMinutes !== null ? {rotationIntervalMinutes: structure.rotationIntervalMinutes} : {}),
    topology: structure.topology,
    ...(resource ? {resourceCapacity: {resourceLabelId: resource.labelId, seatsPerUnit: resource.seatsPerUnit,
      concurrentUnits: resource.concurrentUnits === "attendeesPerSeat" && resource.seatsPerUnit ?
        Math.ceil(n / resource.seatsPerUnit) : null}} : {}),
  };
}
