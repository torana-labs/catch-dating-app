import type {UserProfileDocument} from
  "../shared/generated/firestoreAdminTypes";
import {runningPreferencesFromUserProfileDoc} from
  "../shared/profileProjection";
import type {AssignmentConstraintConfig} from "./assignmentConstraints";
import type {
  AssignmentAttributeObjectiveConfig,
  AssignmentRotationPolicy,
  AssignmentRotationRepeatStrategy,
} from "./assignmentOptimizer";
import type {PlannerArrivalGroupPolicy} from "./assignmentPlanner";

export type AssignmentPrimitiveActivityAttribute =
  "paceBand" | "skillBand" | "roleBand" | "gender" | "ageBand";

/** Profile signals an event must name explicitly before they are read. */
export type AssignmentOptInProfileAttribute = "gender" | "ageBand";

export interface AssignmentPrimitiveStructureConfig {
  rotationRepeatStrategy?: unknown;
  maxPairMeetings?: unknown;
  balanceActivityAttributes?: unknown;
  clusterActivityAttributes?: unknown;
  coverActivityAttributes?: unknown;
  arrivalGroupPolicy?: unknown;
}

const VALID_ACTIVITY_ATTRIBUTES =
  new Set<AssignmentPrimitiveActivityAttribute>([
    "paceBand",
    "skillBand",
    "roleBand",
    "gender",
    "ageBand",
  ]);
const OPT_IN_PROFILE_ATTRIBUTES =
  new Set<AssignmentOptInProfileAttribute>(["gender", "ageBand"]);
const DEFAULT_MAX_PAIR_MEETINGS = 2;
const CURRENT_RUN_PREFERENCES_VERSION = 1;
const DEFAULT_PACE_MIN_SECS_PER_KM = 300;
const DEFAULT_PACE_MAX_SECS_PER_KM = 420;

/**
 * Maps saved structure controls to optimizer rotation policy.
 * @param {AssignmentPrimitiveStructureConfig} config Saved structure config.
 * @return {AssignmentRotationPolicy} Optimizer rotation policy.
 */
export function rotationPolicyForStructureConfig(
  config?: AssignmentPrimitiveStructureConfig
): AssignmentRotationPolicy {
  return {
    repeatStrategy: repeatStrategyFor(config?.rotationRepeatStrategy),
    maxPairMeetings: boundedInteger(
      config?.maxPairMeetings,
      1,
      10
    ) ?? DEFAULT_MAX_PAIR_MEETINGS,
  };
}

/**
 * Maps saved structure controls to optimizer assignment constraints.
 * @param {AssignmentPrimitiveStructureConfig} config Saved structure config.
 * @return {AssignmentConstraintConfig} Optimizer constraints.
 */
export function assignmentConstraintsForStructureConfig(
  config?: AssignmentPrimitiveStructureConfig
): AssignmentConstraintConfig {
  const balanceAttributes = sanitizeActivityAttributes(
    config?.balanceActivityAttributes
  );
  const clusterAttributes = sanitizeActivityAttributes(
    config?.clusterActivityAttributes,
    new Set(balanceAttributes)
  );
  if (balanceAttributes.length === 0 && clusterAttributes.length === 0) {
    return {};
  }
  return {
    activity: {
      balanceAttributes,
      clusterAttributes,
    },
  };
}

/**
 * Maps saved cover controls to generic objectives. Balance and cluster stay
 * on the constraint path so legacy pod and pair events keep their scorer.
 * @param {AssignmentPrimitiveStructureConfig} config Saved structure config.
 * @return {AssignmentAttributeObjectiveConfig[]} Objective configs.
 */
export function attributeObjectivesForStructureConfig(
  config?: AssignmentPrimitiveStructureConfig
): AssignmentAttributeObjectiveConfig[] {
  const claimed = new Set([
    ...sanitizeActivityAttributes(config?.balanceActivityAttributes),
    ...sanitizeActivityAttributes(config?.clusterActivityAttributes),
  ]);
  return sanitizeActivityAttributes(config?.coverActivityAttributes, claimed)
    .map((attribute) => ({attribute, mode: "cover", weight: 40}));
}

/**
 * Reads the saved arrival-group policy; undefined means unit-kind default.
 * @param {AssignmentPrimitiveStructureConfig} config Saved structure config.
 * @return {PlannerArrivalGroupPolicy | undefined} Policy.
 */
export function arrivalGroupPolicyForStructureConfig(
  config?: AssignmentPrimitiveStructureConfig
): PlannerArrivalGroupPolicy | undefined {
  const value = config?.arrivalGroupPolicy;
  return value === "keepTogether" || value === "spread" ||
    value === "ignore" ? value : undefined;
}

/**
 * Returns the sensitive profile attributes this event explicitly named.
 * Nothing is returned for an event that did not opt in.
 * @param {AssignmentPrimitiveStructureConfig} config Saved structure config.
 * @return {Set<AssignmentOptInProfileAttribute>} Opted-in attributes.
 */
export function optInProfileAttributesForStructureConfig(
  config?: AssignmentPrimitiveStructureConfig
): Set<AssignmentOptInProfileAttribute> {
  const named = new Set<AssignmentOptInProfileAttribute>();
  for (const raw of [
    config?.balanceActivityAttributes,
    config?.clusterActivityAttributes,
    config?.coverActivityAttributes,
  ]) {
    for (const attribute of sanitizeActivityAttributes(raw)) {
      if (OPT_IN_PROFILE_ATTRIBUTES.has(
        attribute as AssignmentOptInProfileAttribute
      )) {
        named.add(attribute as AssignmentOptInProfileAttribute);
      }
    }
  }
  return named;
}

/**
 * Adds opted-in profile signals to a participant's attribute bag. Absent
 * opt-in, the bag is returned unchanged, so gender and age never reach the
 * engine for an event that did not name them.
 * @param {object} params Participant signals and the opted-in set.
 * @return {Record<string, string | number | boolean | null>} Attributes.
 */
export function withOptInProfileAttributes(params: {
  attributes: Record<string, string | number | boolean | null>;
  optIn: ReadonlySet<AssignmentOptInProfileAttribute>;
  gender?: string;
  dateOfBirth?: {toDate(): Date} | null;
  atMillis: number;
}): Record<string, string | number | boolean | null> {
  if (params.optIn.size === 0) return params.attributes;
  const next = {...params.attributes};
  if (params.optIn.has("gender") && params.gender !== undefined &&
      params.gender.length > 0) {
    next.gender = params.gender;
  }
  if (params.optIn.has("ageBand")) {
    const band = ageBandAt(params.dateOfBirth, params.atMillis);
    if (band !== null) next.ageBand = band;
  }
  return next;
}

/**
 * Buckets an age into coarse bands so the engine never sees a birth date.
 * @param {object | null | undefined} dateOfBirth Firestore timestamp.
 * @param {number} atMillis Reference instant (event start).
 * @return {string | null} Age band or null when unknown.
 */
export function ageBandAt(
  dateOfBirth: {toDate(): Date} | null | undefined,
  atMillis: number
): string | null {
  if (dateOfBirth === null || dateOfBirth === undefined ||
      typeof dateOfBirth.toDate !== "function") return null;
  const birth = dateOfBirth.toDate();
  if (Number.isNaN(birth.getTime())) return null;
  const at = new Date(atMillis);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  if (at.getUTCMonth() < birth.getUTCMonth() ||
      (at.getUTCMonth() === birth.getUTCMonth() &&
        at.getUTCDate() < birth.getUTCDate())) age--;
  if (age < 18 || age > 120) return null;
  if (age < 25) return "18-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 50) return "40-49";
  return "50+";
}

/**
 * Extracts assignment-visible activity attributes from a user profile.
 * @param {Partial<UserProfileDocument>} profile User profile data.
 * @return {Record<string, string | number | boolean | null>} Attributes.
 */
export function activityAttributesForProfile(
  profile: Partial<UserProfileDocument>
): Record<string, string | number | boolean | null> {
  const attributes: Record<string, string | number | boolean | null> = {};
  const running = runningPreferencesFromUserProfileDoc(
    profile as UserProfileDocument
  );
  if (hasRunPreferenceSignal(running)) {
    const paceBand = paceBandForRange(
      running.paceMinSecsPerKm,
      running.paceMaxSecsPerKm
    );
    if (paceBand !== undefined) {
      attributes.paceBand = paceBand;
    }
  }
  return attributes;
}

/** Preserves event-scoped pace and skill answers for assignment constraints. */
export function activityAttributesForRuntimeProfile(profile: {
  paceBand: "competitive" | "fast" | "moderate" | "easy" | null;
  skillBand: "beginner" | "intermediate" | "advanced" | null;
}): Record<string, string | number | boolean | null> {
  return {
    ...(profile.paceBand ? {paceBand: profile.paceBand} : {}),
    ...(profile.skillBand ? {skillBand: profile.skillBand} : {}),
  };
}

/**
 * Buckets a running pace range into optimizer-friendly pace bands.
 * @param {number} minSecsPerKm Lower pace bound in seconds per kilometer.
 * @param {number} maxSecsPerKm Upper pace bound in seconds per kilometer.
 * @return {string | undefined} Pace band when the range is usable.
 */
export function paceBandForRange(
  minSecsPerKm: number,
  maxSecsPerKm: number
): "competitive" | "fast" | "moderate" | "easy" | undefined {
  if (
    !Number.isFinite(minSecsPerKm) ||
    !Number.isFinite(maxSecsPerKm) ||
    minSecsPerKm <= 0 ||
    maxSecsPerKm <= 0
  ) {
    return undefined;
  }
  const average = (minSecsPerKm + maxSecsPerKm) / 2;
  if (average <= 300) return "competitive";
  if (average <= 360) return "fast";
  if (average <= 420) return "moderate";
  return "easy";
}

/**
 * Returns whether a supported activity attribute key was selected.
 * @param {unknown} value Raw attribute key.
 * @return {boolean} Whether the key is supported.
 */
function isActivityAttribute(
  value: unknown
): value is AssignmentPrimitiveActivityAttribute {
  const candidate = value as AssignmentPrimitiveActivityAttribute;
  return typeof value === "string" &&
    VALID_ACTIVITY_ATTRIBUTES.has(candidate);
}

/**
 * Sanitizes a raw activity attribute list for optimizer use.
 * @param {unknown} raw Raw Firestore value.
 * @param {Set<string>} excluded Attribute names already claimed.
 * @return {string[]} Sanitized attributes.
 */
function sanitizeActivityAttributes(
  raw: unknown,
  excluded: Set<string> = new Set()
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const attributes: string[] = [];
  for (const item of raw) {
    if (!isActivityAttribute(item) || excluded.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    attributes.push(item);
  }
  return attributes;
}

/**
 * Normalizes repeat policy names.
 * @param {unknown} value Raw saved repeat strategy.
 * @return {AssignmentRotationRepeatStrategy} Supported repeat strategy.
 */
function repeatStrategyFor(value: unknown): AssignmentRotationRepeatStrategy {
  return value === "allowWhenExhausted" ? "allowWhenExhausted" : "avoid";
}

/**
 * Returns an integer in range from a raw saved value.
 * @param {unknown} value Raw numeric value.
 * @param {number} min Minimum accepted value.
 * @param {number} max Maximum accepted value.
 * @return {number | null} Bounded integer.
 */
function boundedInteger(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

/**
 * Treats default run preferences as missing rather than assignment signal.
 * @param {object} running Normalized running preferences.
 * @return {boolean} Whether the runner supplied meaningful preferences.
 */
function hasRunPreferenceSignal(
  running: ReturnType<typeof runningPreferencesFromUserProfileDoc>
): boolean {
  return Boolean(
    running.version >= CURRENT_RUN_PREFERENCES_VERSION ||
    running.preferredDistances.length ||
    running.runningReasons.length ||
    running.preferredRunTimes.length ||
    running.paceMinSecsPerKm !== DEFAULT_PACE_MIN_SECS_PER_KM ||
    running.paceMaxSecsPerKm !== DEFAULT_PACE_MAX_SECS_PER_KM
  );
}
