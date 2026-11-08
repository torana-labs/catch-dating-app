import {HttpsError} from "firebase-functions/v2/https";

export type EventSuccessUnitKind =
  "wholeGroup" | "pods" | "pairs" | "teams" | "tables";

export type EventSuccessTopology = "set" | "sequence" | "adjacency";

export type EventSuccessResourceLabelId =
  "court" | "table" | "lane" | "board";

export interface EventSuccessResourceCapacity {
  concurrentUnits: number | null;
  resourceLabelId: EventSuccessResourceLabelId;
  seatsPerUnit: number | null;
}

export interface AssignmentTopologyPlan {
  structureConfig?: {
    unitKind?: unknown;
    unitSize?: unknown;
    unitCount?: unknown;
    rotationIntervalMinutes?: unknown;
    topology?: unknown;
    resourceCapacity?: unknown;
  };
}

export interface AssignmentTopology {
  unitKind: EventSuccessUnitKind;
  unitSize: number;
  groupCount: number;
  maxGroupSize: number;
  rotationIntervalMinutes: number | null;
  rotationsEnabled: boolean;
  topology?: EventSuccessTopology;
  resourceCapacity?: EventSuccessResourceCapacity | null;
}

/**
 * Resolves saved structure config into the generic assignment topology.
 * @param {AssignmentTopologyPlan} plan Persisted event-success plan.
 * @param {number} participantCount Eligible participant count.
 * @param {object} options Fallback options.
 * @param {EventSuccessUnitKind} options.defaultUnitKind Fallback unit kind.
 * @param {number} options.defaultUnitSize Fallback target unit size.
 * @return {AssignmentTopology} Generic assignment topology.
 */
export function resolveAssignmentTopology(
  plan: AssignmentTopologyPlan,
  participantCount: number,
  options: {
    defaultUnitKind: EventSuccessUnitKind;
    defaultUnitSize: number;
  }
): AssignmentTopology {
  const safeParticipantCount = Math.max(0, Math.floor(participantCount));
  const unitKind = normalizedUnitKind(plan) ?? options.defaultUnitKind;
  const unitSize = resolveUnitSize({
    plan,
    unitKind,
    participantCount: safeParticipantCount,
    defaultUnitSize: options.defaultUnitSize,
  });
  const groupCount = resolveGroupCount({
    plan,
    unitKind,
    unitSize,
    participantCount: safeParticipantCount,
  });
  const maxGroupSize = safeParticipantCount === 0 ?
    0 :
    Math.max(1, Math.ceil(safeParticipantCount / groupCount));
  const rotationIntervalMinutes = resolveRotationIntervalMinutes(plan);
  const topology = normalizedEventSuccessTopology(plan);

  return {
    unitKind,
    unitSize,
    groupCount,
    maxGroupSize,
    rotationIntervalMinutes,
    rotationsEnabled: rotationIntervalMinutes !== null,
    topology,
    resourceCapacity: resolveEventSuccessResourceCapacity(plan),
  };
}

/**
 * Throws when the pair-rotation callable is used for larger unit sizes.
 * @param {AssignmentTopologyPlan} plan Persisted event-success plan.
 */
export function assertPairRotationTopology(
  plan: AssignmentTopologyPlan
): void {
  const topology = normalizedEventSuccessTopology(plan);
  if (topology === "adjacency") {
    throw new HttpsError(
      "failed-precondition",
      "Seat adjacency belongs to table seating. " +
        "Use group assignments for tables."
    );
  }
  const unitKind = normalizedUnitKind(plan);
  const configuredSize = boundedInteger(
    plan.structureConfig?.unitSize,
    1,
    1000
  );
  if (configuredSize !== null) {
    if (configuredSize === 2) return;
  } else if (unitKind === undefined || unitKind === "pairs") {
    return;
  }
  throw new HttpsError("failed-precondition",
    "Guided rotations currently require two-person units. " +
      "Use group assignments for teams, tables, pods, or whole-group formats.");
}

/** Returns the saved topology, preserving `set` as the legacy default. */
export function normalizedEventSuccessTopology(
  plan: AssignmentTopologyPlan
): EventSuccessTopology {
  const topology = plan.structureConfig?.topology;
  if (
    topology === "set" ||
    topology === "sequence" ||
    topology === "adjacency"
  ) {
    return topology;
  }
  return "set";
}

/** Resolves the optional physical-resource capacity contract. */
export function resolveEventSuccessResourceCapacity(
  plan: AssignmentTopologyPlan
): EventSuccessResourceCapacity | null {
  const raw = plan.structureConfig?.resourceCapacity;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const resourceLabelId = normalizedResourceLabelId(value.resourceLabelId);
  if (resourceLabelId === null) return null;
  return {
    concurrentUnits: value.concurrentUnits === null ?
      null :
      boundedInteger(value.concurrentUnits, 1, 200),
    resourceLabelId,
    seatsPerUnit: value.seatsPerUnit === null ?
      null :
      boundedInteger(value.seatsPerUnit, 1, 1000),
  };
}

/**
 * Resolves the usable simultaneous sequence resources. Null capacity means
 * unconstrained, while a selected layout still bounds the physical resources.
 */
export function resolveSequenceConcurrentUnits(
  plan: AssignmentTopologyPlan,
  participantCount: number,
  availableResourceUnits: number | null = null
): number {
  const maximumUsefulUnits = Math.max(
    0,
    Math.floor(Math.max(0, participantCount) / 2)
  );
  const configured = resolveEventSuccessResourceCapacity(plan)
    ?.concurrentUnits ?? maximumUsefulUnits;
  const physicalLimit = availableResourceUnits === null ?
    maximumUsefulUnits :
    Math.max(0, Math.floor(availableResourceUnits));
  return Math.min(maximumUsefulUnits, configured, physicalLimit);
}

/**
 * Reads a supported unit kind from a saved plan.
 * @param {AssignmentTopologyPlan} plan Persisted event-success plan.
 * @return {EventSuccessUnitKind|undefined} Unit kind when supported.
 */
export function normalizedUnitKind(
  plan: AssignmentTopologyPlan
): EventSuccessUnitKind | undefined {
  const unitKind = plan.structureConfig?.unitKind;
  if (
    unitKind === "wholeGroup" ||
    unitKind === "pods" ||
    unitKind === "pairs" ||
    unitKind === "teams" ||
    unitKind === "tables"
  ) {
    return unitKind;
  }
  return undefined;
}

/**
 * Reads optional rotation cadence from saved structure config.
 * @param {AssignmentTopologyPlan} plan Persisted event-success plan.
 * @return {number|null} Rotation cadence in minutes, or null when off.
 */
export function resolveRotationIntervalMinutes(
  plan: AssignmentTopologyPlan
): number | null {
  return boundedInteger(
    plan.structureConfig?.rotationIntervalMinutes,
    5,
    180
  );
}

/**
 * Computes available rotation rounds from duration and cadence.
 * @param {object} params Rotation timing params.
 * @param {number} params.eventStartMillis Event start timestamp in millis.
 * @param {number} params.eventEndMillis Event end timestamp in millis.
 * @param {number} params.rotationIntervalMinutes Rotation cadence in minutes.
 * @return {number} Duration-limited rotation count.
 */
export function rotationRoundCountForDuration(params: {
  eventStartMillis: number;
  eventEndMillis: number;
  rotationIntervalMinutes: number;
}): number {
  const durationMinutes = Math.max(
    0,
    Math.floor((params.eventEndMillis - params.eventStartMillis) / 60000)
  );
  return Math.floor(durationMinutes / params.rotationIntervalMinutes);
}

/**
 * Builds a compact label such as Pod A, Team B, or Table C.
 * @param {EventSuccessUnitKind} unitKind Structure unit kind.
 * @param {number} index Zero-based unit index.
 * @return {string} Display label.
 */
export function unitLabel(
  unitKind: EventSuccessUnitKind,
  index: number
): string {
  const base = String.fromCharCode(65 + (index % 26));
  const suffix = index >= 26 ? `${Math.floor(index / 26) + 1}` : "";
  return `${unitSingularLabel(unitKind)} ${base}${suffix}`;
}

/**
 * Builds attendee-facing group-size copy.
 * @param {EventSuccessUnitKind} unitKind Structure unit kind.
 * @param {number} groupSize Number of people in the unit.
 * @return {string} Display subtitle.
 */
export function unitSubtitle(
  unitKind: EventSuccessUnitKind,
  groupSize: number
): string {
  const people = `${groupSize} ${groupSize === 1 ? "person" : "people"}`;
  switch (unitKind) {
  case "tables":
    return `${people} at this table.`;
  case "teams":
    return `${people} on this team.`;
  case "pairs":
    return `${people} in this pair.`;
  case "wholeGroup":
    return `${people} in this event group.`;
  case "pods":
    return `${people} in this event pod.`;
  }
}

/**
 * Returns a singular display noun for a unit kind.
 * @param {EventSuccessUnitKind} unitKind Structure unit kind.
 * @return {string} Singular display noun.
 */
export function unitSingularLabel(unitKind: EventSuccessUnitKind): string {
  switch (unitKind) {
  case "wholeGroup":
    return "Group";
  case "pods":
    return "Pod";
  case "pairs":
    return "Pair";
  case "teams":
    return "Team";
  case "tables":
    return "Table";
  }
}

/**
 * Returns an integer in range from a possibly-untyped Firestore value.
 * @param {unknown} value Raw numeric value.
 * @param {number} min Minimum accepted value.
 * @param {number} max Maximum accepted value.
 * @return {number|null} Clamped integer or null.
 */
export function boundedInteger(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function normalizedResourceLabelId(
  value: unknown
): EventSuccessResourceLabelId | null {
  if (
    value === "court" ||
    value === "table" ||
    value === "lane" ||
    value === "board"
  ) {
    return value;
  }
  return null;
}

/**
 * Resolves target unit size from saved structure.
 * @param {object} params Unit size params.
 * @return {number} Resolved target unit size.
 */
function resolveUnitSize(params: {
  plan: AssignmentTopologyPlan;
  unitKind: EventSuccessUnitKind;
  participantCount: number;
  defaultUnitSize: number;
}): number {
  if (params.unitKind === "wholeGroup") {
    return Math.max(1, params.participantCount);
  }
  const maxUnitSize = Math.max(2, params.participantCount);
  return boundedInteger(
    params.plan.structureConfig?.unitSize,
    2,
    maxUnitSize
  ) ?? Math.max(2, Math.min(maxUnitSize, params.defaultUnitSize));
}

/**
 * Resolves desired group count from saved structure.
 * @param {object} params Group count params.
 * @return {number} Resolved group count.
 */
function resolveGroupCount(params: {
  plan: AssignmentTopologyPlan;
  unitKind: EventSuccessUnitKind;
  unitSize: number;
  participantCount: number;
}): number {
  if (params.participantCount === 0) return 0;
  if (params.unitKind === "wholeGroup") return 1;
  const maxGroupCount = Math.max(1, Math.ceil(params.participantCount / 2));
  const configuredCount = boundedInteger(
    params.plan.structureConfig?.unitCount,
    1,
    maxGroupCount
  );
  if (configuredCount !== null) return configuredCount;
  return Math.max(
    1,
    Math.min(
      maxGroupCount,
      Math.ceil(params.participantCount / params.unitSize)
    )
  );
}
