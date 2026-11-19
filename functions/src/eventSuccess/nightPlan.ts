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
export const NIGHT_PLAN_MAX_GUESTS = 200;

export interface NightPlanGroups {
  kind: "paceGroups" | "courts" | "units" | "wholeGroup";
  /** Groups, courts or units in play at once. */
  count: number;
  /** Target guests per group; null for pace groups, which vary by pace. */
  size: number | null;
  unitKind: EventSuccessUnitKind | null;
  /** Pace group labels, slowest first. */
  labels: string[];
  /** Guests waiting their turn when courts are full. */
  benchCount: number;
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
  return {
    format, guestCount: n, playbookId: shape.playbookId, activityKind: shape.activityKind, interactionModel: model,
    capacity: {min: shape.capacity.min, max: shape.capacity.max,
      fit: n < shape.capacity.min ? "below" : n > shape.capacity.max ? "above" : "within"},
    groups: groupsFor(entry, structureConfig, structure, n),
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
    const count = Math.max(groups.minGroups, Math.min(groups.maxGroups, Math.ceil(n / groups.guestsPerGroup)));
    return {kind: "paceGroups", count, size: null, unitKind: null, labels: paceLabels(groups.labels, count),
      benchCount: 0};
  }
  case "courts": {
    const count = Math.max(1, Math.floor(n / groups.seatsPerCourt));
    return {kind: "courts", count, size: groups.seatsPerCourt, unitKind: "pairs", labels: [],
      benchCount: Math.max(0, n - count * groups.seatsPerCourt)};
  }
  case "structureDefault": {
    // The live assignment engine's own sizing, so the plan matches the night.
    const topology = resolveAssignmentTopology({structureConfig}, n,
      {defaultUnitKind: structure.unitKind, defaultUnitSize: typeof structure.unitSize === "number" ? structure.unitSize : n});
    return {kind: "units", count: topology.groupCount, size: topology.unitSize, unitKind: topology.unitKind,
      labels: [], benchCount: 0};
  }
  case "wholeGroup":
    return {kind: "wholeGroup", count: 1, size: n, unitKind: "wholeGroup", labels: [], benchCount: 0};
  }
}

/** Labels for [count] pace groups: the catalog's, with the slowest repeated when more groups than labels. */
function paceLabels(labels: readonly string[], count: number): string[] {
  if (count <= labels.length) {
    // One group is everyone; two drop the middle pace.
    if (count === 1) return [labels[Math.floor(labels.length / 2)]];
    if (count === 2) return [labels[0], labels[labels.length - 1]];
    return labels.slice(0, count);
  }
  return [...Array.from({length: count - labels.length}, () => labels[0]), ...labels];
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
