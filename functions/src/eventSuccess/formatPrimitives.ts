import type {
  EventFormatSnapshot,
  EventSuccessFormatPrimitives,
} from "../shared/generated/firestoreAdminTypes";
import type {EventSuccessTopology} from "./assignmentTopology";

export type EventSuccessAssignmentAlgorithm = NonNullable<
  EventSuccessFormatPrimitives["assignmentAlgorithm"]
>;

export type EventSuccessPhoneAvailability = NonNullable<
  EventSuccessFormatPrimitives["phoneAvailability"]
>;

export type EventSuccessRotationSuitability = NonNullable<
  EventSuccessFormatPrimitives["rotationSuitability"]
>;

export type EventSuccessCompatibilityPolicy = NonNullable<
  EventSuccessFormatPrimitives["compatibilityPolicy"]
>;

export type EventSuccessMatchingObjective = NonNullable<
  EventSuccessFormatPrimitives["matchingObjective"]
>;

export type EventSuccessUnitOutcome = NonNullable<
  EventSuccessFormatPrimitives["unitOutcome"]
>;

export type EventSuccessAccountability = NonNullable<
  EventSuccessFormatPrimitives["accountability"]
>;

export type EventSuccessDurationShape = NonNullable<
  EventSuccessFormatPrimitives["durationShape"]
>;

export type EventSuccessVariableResolutionStatus =
  "supported" | "unsupported";

export interface EventSuccessVariableResolution {
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
  topology: EventSuccessTopology;
  unitOutcome: EventSuccessUnitOutcome;
  status: EventSuccessVariableResolutionStatus;
  reason: string;
}

export interface ResolvedEventSuccessPrimitives {
  interactionModel: EventFormatSnapshot["interactionModel"];
  phoneAvailability: EventSuccessPhoneAvailability;
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
  unitOutcome: EventSuccessUnitOutcome;
  accountability: EventSuccessAccountability;
  durationShape: EventSuccessDurationShape;
  assignmentResolution: EventSuccessVariableResolution;
}

const EVENT_SUCCESS_ASSIGNMENT_ALGORITHM_MEMBERS:
  Record<EventSuccessAssignmentAlgorithm, true> = {
    none: true,
    pacePods: true,
    socialPods: true,
    pairRotations: true,
    teamBalancer: true,
    tableSeating: true,
  };

const EVENT_SUCCESS_COMPATIBILITY_POLICY_MEMBERS:
  Record<EventSuccessCompatibilityPolicy, true> = {
    none: true,
    socialCohortBalance: true,
    mutualInterestOnly: true,
    questionnaireClueOnly: true,
  };

const EVENT_SUCCESS_MATCHING_OBJECTIVE_MEMBERS:
  Record<EventSuccessMatchingObjective, true> = {
    coverage: true,
    romantic: true,
    affinity: true,
    novelty: true,
    balance: true,
    spread: true,
  };

const EVENT_SUCCESS_UNIT_OUTCOME_MEMBERS:
  Record<EventSuccessUnitOutcome, true> = {
    none: true,
    completion: true,
    score: true,
    rank: true,
  };

export const EVENT_SUCCESS_ASSIGNMENT_ALGORITHMS =
  Object.keys(EVENT_SUCCESS_ASSIGNMENT_ALGORITHM_MEMBERS) as
    EventSuccessAssignmentAlgorithm[];

export const EVENT_SUCCESS_COMPATIBILITY_POLICIES =
  Object.keys(EVENT_SUCCESS_COMPATIBILITY_POLICY_MEMBERS) as
    EventSuccessCompatibilityPolicy[];

export const EVENT_SUCCESS_MATCHING_OBJECTIVES =
  Object.keys(EVENT_SUCCESS_MATCHING_OBJECTIVE_MEMBERS) as
    EventSuccessMatchingObjective[];

export const EVENT_SUCCESS_UNIT_OUTCOMES =
  Object.keys(EVENT_SUCCESS_UNIT_OUTCOME_MEMBERS) as
    EventSuccessUnitOutcome[];

export const EVENT_SUCCESS_TOPOLOGIES: readonly EventSuccessTopology[] =
  ["set", "sequence", "adjacency"];

/**
 * Closed resolution table for every implemented variable axis. Team
 * balancing and table seating run through the shape planner
 * (docs/assignment_engine.md).
 */
export const EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE:
  readonly EventSuccessVariableResolution[] =
  EVENT_SUCCESS_ASSIGNMENT_ALGORITHMS.flatMap((assignmentAlgorithm) =>
    EVENT_SUCCESS_COMPATIBILITY_POLICIES.flatMap((compatibilityPolicy) =>
      EVENT_SUCCESS_MATCHING_OBJECTIVES.flatMap((matchingObjective) =>
        EVENT_SUCCESS_TOPOLOGIES.flatMap((topology) =>
          EVENT_SUCCESS_UNIT_OUTCOMES.map((unitOutcome) => ({
            assignmentAlgorithm,
            compatibilityPolicy,
            matchingObjective,
            topology,
            unitOutcome,
            ...assignmentAlgorithmResolution(assignmentAlgorithm, topology),
          }))
        )
      )
    )
  );

/**
 * Resolves optional contract primitives from the event format.
 * @param {EventFormatSnapshot} eventFormat Persisted event format.
 * @return {ResolvedEventSuccessPrimitives} Resolved behavior primitives.
 */
export function eventSuccessPrimitivesFor(
  eventFormat: EventFormatSnapshot | undefined
): ResolvedEventSuccessPrimitives {
  const format = eventFormat ?? {
    version: 1,
    activityKind: "openActivity",
    interactionModel: "openFormat",
  };
  const raw = format.eventSuccessPrimitives;
  const defaultAssignment = defaultAssignmentAlgorithmFor(
    format.interactionModel
  );
  const assignmentAlgorithm =
    isEventSuccessAssignmentAlgorithm(raw?.assignmentAlgorithm) ?
      raw.assignmentAlgorithm :
      defaultAssignment;
  const interactionModel = effectiveInteractionModelFor(
    format.interactionModel,
    assignmentAlgorithm
  );
  const compatibilityPolicy =
    isEventSuccessCompatibilityPolicy(raw?.compatibilityPolicy) ?
      raw.compatibilityPolicy :
      defaultCompatibilityPolicyFor(format, interactionModel);
  const matchingObjective =
    isEventSuccessMatchingObjective(raw?.matchingObjective) ?
      raw.matchingObjective :
      defaultMatchingObjectiveFor(interactionModel, compatibilityPolicy);
  const unitOutcome = isEventSuccessUnitOutcome(raw?.unitOutcome) ?
    raw.unitOutcome : defaultUnitOutcomeFor(interactionModel);
  const accountability = isEventSuccessAccountability(raw?.accountability) ?
    raw.accountability : defaultAccountabilityFor(interactionModel);
  const durationShape = isEventSuccessDurationShape(raw?.durationShape) ?
    raw.durationShape : defaultDurationShapeFor(interactionModel);
  const phoneAvailability =
    isEventSuccessPhoneAvailability(raw?.phoneAvailability) ?
      raw.phoneAvailability :
      defaultPhoneAvailabilityFor(format, interactionModel);
  return {
    interactionModel,
    phoneAvailability,
    assignmentAlgorithm,
    compatibilityPolicy,
    matchingObjective,
    unitOutcome,
    accountability,
    durationShape,
    assignmentResolution: eventSuccessVariableResolutionFor({
      assignmentAlgorithm,
      compatibilityPolicy,
      matchingObjective,
      unitOutcome,
    }),
  };
}

/** Returns the run-of-show grouping and transition vocabulary. */
export function defaultDurationShapeFor(
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessDurationShape {
  switch (interactionModel) {
  case "pacePods":
    return "segments";
  case "pairedRotations":
  case "teamRotations":
  case "freeFormMixer":
    return "rounds";
  case "seatedTable":
    return "courses";
  case "routeStops":
    return "stops";
  case "hostLedProgram":
  case "openFormat":
  default:
    return "continuous";
  }
}

/** Returns the reviewed end-of-event accountability default. */
export function defaultAccountabilityFor(
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessAccountability {
  return interactionModel === "pacePods" || interactionModel === "routeStops" ?
    "sweep" : "none";
}

/** Activities whose core is continuous movement; mirrors the kernel. */
const MOVEMENT_HEAVY_ACTIVITY_KINDS: ReadonlySet<string> = new Set([
  "socialRun", "running", "walking", "pickleball", "padel", "tennis",
  "badminton", "cycling", "spinClass",
]);

/**
 * Returns when guests can use their phones, mirroring the Dart profile.
 * @param {EventFormatSnapshot} eventFormat Persisted event format.
 * @param {string} interactionModel Effective interaction model.
 * @return {EventSuccessPhoneAvailability} Phone availability.
 */
export function defaultPhoneAvailabilityFor(
  eventFormat: Pick<EventFormatSnapshot, "activityKind">,
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessPhoneAvailability {
  switch (interactionModel) {
  case "pacePods":
    return "arrivalAndPostEventOnly";
  case "pairedRotations":
  case "teamRotations":
  case "freeFormMixer":
  case "routeStops":
    return "plannedPauses";
  case "seatedTable":
    // Phones are at the table; the format keeps them away by norm.
    return "continuous";
  case "hostLedProgram":
    return MOVEMENT_HEAVY_ACTIVITY_KINDS.has(eventFormat.activityKind) ?
      "hostOnlyLive" : "plannedPauses";
  case "openFormat":
  default:
    return "hostOnlyLive";
  }
}

/** When a guest-facing prompt, nudge or push would reach the phone. */
export type EventSuccessGuestCueTiming =
  "arrival" | "stepChange" | "midStep" | "postEvent";

/**
 * Whether a guest cue may interrupt the guest. Mirrors the Dart policy.
 * @param {EventSuccessPhoneAvailability} phoneAvailability Event property.
 * @param {EventSuccessGuestCueTiming} timing When the cue would land.
 * @param {boolean} activityUnderway Whether the core activity is running.
 * @return {boolean} Whether the cue may reach the phone.
 */
export function eventSuccessGuestCueAllowed(
  phoneAvailability: EventSuccessPhoneAvailability,
  timing: EventSuccessGuestCueTiming,
  activityUnderway: boolean
): boolean {
  switch (phoneAvailability) {
  case "continuous":
    return true;
  case "plannedPauses":
    return timing !== "midStep";
  case "arrivalAndPostEventOnly":
  case "hostOnlyLive":
  case "noneDuringActivity":
    if (timing === "postEvent") return true;
    if (timing === "midStep") return false;
    return !activityUnderway;
  }
}

/**
 * Resolves one closed variable combination without behavioral fallback.
 * @param {object} variables Assignment behavior variables.
 * @return {EventSuccessVariableResolution} Supported or honest unsupported.
 */
export function eventSuccessVariableResolutionFor(variables: {
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
  topology?: EventSuccessTopology;
  unitOutcome?: EventSuccessUnitOutcome;
}): EventSuccessVariableResolution {
  const topology = variables.topology ?? "set";
  const unitOutcome = variables.unitOutcome ?? "none";
  const resolution = EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE.find((entry) =>
    entry.assignmentAlgorithm === variables.assignmentAlgorithm &&
    entry.compatibilityPolicy === variables.compatibilityPolicy &&
    entry.matchingObjective === variables.matchingObjective &&
    entry.topology === topology &&
    entry.unitOutcome === unitOutcome
  );
  if (resolution === undefined) {
    throw new Error(
      "Event Success variable combination is absent from the resolution table."
    );
  }
  return resolution;
}

/** Returns the default recorded result primitive for an interaction model. */
export function defaultUnitOutcomeFor(
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessUnitOutcome {
  switch (interactionModel) {
  case "pacePods":
    return "completion";
  case "teamRotations":
    return "score";
  case "pairedRotations":
    return "rank";
  case "seatedTable":
  case "freeFormMixer":
  case "routeStops":
  case "hostLedProgram":
  case "openFormat":
  default:
    return "none";
  }
}

/**
 * Returns the effective interaction model after assignment primitive overrides.
 * @param {string} interactionModel Saved interaction model.
 * @param {EventSuccessAssignmentAlgorithm} assignmentAlgorithm Assignment kind.
 * @return {string} Effective interaction model.
 */
export function effectiveInteractionModelFor(
  interactionModel: EventFormatSnapshot["interactionModel"],
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm
): EventFormatSnapshot["interactionModel"] {
  switch (assignmentAlgorithm) {
  case "pacePods":
    return "pacePods";
  case "pairRotations":
    return "pairedRotations";
  case "teamBalancer":
    return "teamRotations";
  case "tableSeating":
    return "seatedTable";
  case "socialPods":
    return "freeFormMixer";
  case "none":
    return interactionModel;
  }
}

/**
 * Returns the default assignment primitive for an interaction model.
 * @param {string} interactionModel Event interaction model.
 * @return {EventSuccessAssignmentAlgorithm} Assignment primitive.
 */
export function defaultAssignmentAlgorithmFor(
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessAssignmentAlgorithm {
  switch (interactionModel) {
  case "pacePods":
    return "pacePods";
  case "pairedRotations":
    return "pairRotations";
  case "teamRotations":
    return "teamBalancer";
  case "seatedTable":
    return "tableSeating";
  case "freeFormMixer":
    return "socialPods";
  case "hostLedProgram":
  case "openFormat":
  default:
    return "none";
  }
}

/**
 * Returns the default compatibility primitive for a format.
 * @param {EventFormatSnapshot} eventFormat Persisted event format.
 * @param {string} interactionModel Effective interaction model.
 * @return {EventSuccessCompatibilityPolicy} Compatibility primitive.
 */
export function defaultCompatibilityPolicyFor(
  eventFormat: EventFormatSnapshot,
  interactionModel: EventFormatSnapshot["interactionModel"]
): EventSuccessCompatibilityPolicy {
  switch (interactionModel) {
  case "freeFormMixer":
    return eventFormat.activityKind === "singlesMixer" ?
      "mutualInterestOnly" :
      "questionnaireClueOnly";
  case "pairedRotations":
  case "teamRotations":
  case "seatedTable":
  case "routeStops":
    return "questionnaireClueOnly";
  case "pacePods":
    return "socialCohortBalance";
  case "hostLedProgram":
  case "openFormat":
  default:
    return "none";
  }
}

/**
 * Returns the reviewed matching-objective binding for a resolved format.
 * Coverage remains the engine default and the missing-signal fallback.
 * @param {string} interactionModel Effective interaction model.
 * @param {EventSuccessCompatibilityPolicy} compatibilityPolicy Signal policy.
 * @return {EventSuccessMatchingObjective} Matching objective.
 */
export function defaultMatchingObjectiveFor(
  interactionModel: EventFormatSnapshot["interactionModel"],
  compatibilityPolicy: EventSuccessCompatibilityPolicy
): EventSuccessMatchingObjective {
  switch (interactionModel) {
  case "pacePods":
    return "affinity";
  case "pairedRotations":
    return "balance";
  case "teamRotations":
    return "spread";
  case "seatedTable":
    return "affinity";
  case "freeFormMixer":
    return compatibilityPolicy === "mutualInterestOnly" ?
      "romantic" :
      "coverage";
  case "hostLedProgram":
  case "openFormat":
  default:
    return "coverage";
  }
}

/**
 * Checks assignment primitive membership.
 * @param {unknown} value Raw value.
 * @return {boolean} Whether the value is supported.
 */
export function isEventSuccessAssignmentAlgorithm(
  value: unknown
): value is EventSuccessAssignmentAlgorithm {
  return value === "none" ||
    value === "pacePods" ||
    value === "socialPods" ||
    value === "pairRotations" ||
    value === "teamBalancer" ||
    value === "tableSeating";
}

/**
 * Checks compatibility primitive membership.
 * @param {unknown} value Raw value.
 * @return {boolean} Whether the value is supported.
 */
export function isEventSuccessCompatibilityPolicy(
  value: unknown
): value is EventSuccessCompatibilityPolicy {
  return value === "none" ||
    value === "socialCohortBalance" ||
    value === "mutualInterestOnly" ||
    value === "questionnaireClueOnly";
}

/**
 * Checks matching-objective membership.
 * @param {unknown} value Raw value.
 * @return {boolean} Whether the value is supported.
 */
export function isEventSuccessMatchingObjective(
  value: unknown
): value is EventSuccessMatchingObjective {
  return value === "coverage" ||
    value === "romantic" ||
    value === "affinity" ||
    value === "novelty" ||
    value === "balance" ||
    value === "spread";
}

/** Checks unit-outcome primitive membership. */
export function isEventSuccessUnitOutcome(
  value: unknown
): value is EventSuccessUnitOutcome {
  return value === "none" ||
    value === "completion" ||
    value === "score" ||
    value === "rank";
}

/** Checks accountability primitive membership. */
export function isEventSuccessAccountability(
  value: unknown
): value is EventSuccessAccountability {
  return value === "none" || value === "rollCall" || value === "sweep";
}

/** Checks duration-shape primitive membership. */
export function isEventSuccessDurationShape(
  value: unknown
): value is EventSuccessDurationShape {
  return value === "continuous" ||
    value === "rounds" ||
    value === "courses" ||
    value === "segments" ||
    value === "stops";
}

/** Returns the implemented endpoint for an assignment algorithm. */
function assignmentAlgorithmResolution(
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm,
  topology: EventSuccessTopology
): Pick<EventSuccessVariableResolution, "status" | "reason"> {
  if (topology === "adjacency" && assignmentAlgorithm !== "tableSeating") {
    return {
      status: "unsupported",
      reason: "Seat adjacency applies only to table seating.",
    };
  }
  if (topology === "sequence" && assignmentAlgorithm !== "pairRotations") {
    return {
      status: "unsupported",
      reason: "Sequence topology currently requires pair rotations.",
    };
  }
  switch (assignmentAlgorithm) {
  case "pacePods":
  case "socialPods":
    return {
      status: "supported",
      reason: "Assignments use the implemented micro-pod engine.",
    };
  case "pairRotations":
    return {
      status: "supported",
      reason: topology === "sequence" ?
        "Assignments use the capacity-aware sequence scheduler." :
        "Assignments use the implemented pair-rotation engine.",
    };
  case "none":
    return {
      status: "unsupported",
      reason: "This format does not select an assignment algorithm.",
    };
  case "teamBalancer":
    return {
      status: "supported",
      reason: "Teams use the shape planner: balanced, solo arrivals spread.",
    };
  case "tableSeating":
    return {
      status: "supported",
      reason: topology === "adjacency" ?
        "Tables use the shape planner with seat order." :
        "Tables use the shape planner.",
    };
  }
}

/**
 * Checks phone-availability primitive membership.
 * @param {unknown} value Raw value.
 * @return {boolean} Whether the value is supported.
 */
export function isEventSuccessPhoneAvailability(
  value: unknown
): value is EventSuccessPhoneAvailability {
  return value === "continuous" ||
    value === "plannedPauses" ||
    value === "arrivalAndPostEventOnly" ||
    value === "hostOnlyLive" ||
    value === "noneDuringActivity";
}

/**
 * Checks rotation-suitability primitive membership.
 * @param {unknown} value Raw value.
 * @return {boolean} Whether the value is supported.
 */
export function isEventSuccessRotationSuitability(
  value: unknown
): value is EventSuccessRotationSuitability {
  return value === "none" ||
    value === "plannedBreaks" ||
    value === "continuousRounds";
}
