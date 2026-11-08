/** Typed event-local soft features. This module never grants their use. */
export type AssignmentFeatureKind =
  "category" | "set" | "number" | "ordinal";
export type AssignmentFeatureMode =
  "preferSimilar" | "preferDifferent" | "balanceAcrossGroups" |
  /** Each unit holds a cross-section of the answer's values. */
  "coverAcrossGroups";

export interface AssignmentFeatureRule {
  featureId: string;
  formId: string;
  versionId: string;
  questionId: string;
  transformVersion: number;
  kind: AssignmentFeatureKind;
  mode: AssignmentFeatureMode;
  weight: number;
  optionIds?: string[];
  scoreByOptionId?: Record<string, number>;
  minimum?: number;
  maximum?: number;
}

export type AssignmentFeatureValue =
  {kind: "category" | "ordinal"; optionId: string} |
  {kind: "set"; optionIds: string[]} |
  {kind: "number"; value: number};

export interface EventAssignmentFeatureSnapshot {
  eventId: string;
  organizerId: string;
  uid: string;
  featureId: string;
  formId: string;
  versionId: string;
  questionId: string;
  transformVersion: number;
  responseId: string;
  consentReceiptId: string;
  value: AssignmentFeatureValue;
}

export type NormalizedFeatureValue =
  {kind: "scalar"; value: number} |
  {kind: "category"; value: string} |
  {kind: "set"; values: ReadonlySet<string>};

export interface AssignmentFeatureScoringContext {
  rules: AssignmentFeatureRule[];
  valuesByUid: Map<string, Map<string, NormalizedFeatureValue>>;
  eligiblePoolByFeature: Map<string, NormalizedFeatureValue[]>;
  missingValueCount: number;
}

const MAX_RULES = 8;
const MAX_WEIGHT = 100;
const MAX_OPTIONS = 40;

/** Consumes only already-authorized snapshots for the current eligible pool. */
export function buildAssignmentFeatureScoringContext(params: {
  eventId: string;
  organizerId: string;
  eligibleUids: string[];
  rules: AssignmentFeatureRule[];
  snapshots: EventAssignmentFeatureSnapshot[];
}): AssignmentFeatureScoringContext {
  const rules = validateAssignmentFeatureRules(params.rules);
  const eligible = new Set(params.eligibleUids);
  const snapshots = new Map<string, EventAssignmentFeatureSnapshot>();
  for (const snapshot of params.snapshots) {
    if (!eligible.has(snapshot.uid)) continue;
    const key = `${snapshot.uid}|${snapshot.featureId}`;
    if (snapshots.has(key)) {
      throw new Error("Duplicate assignment feature snapshot.");
    }
    snapshots.set(key, snapshot);
  }
  const valuesByUid = new Map<string,
    Map<string, NormalizedFeatureValue>>();
  const eligiblePoolByFeature = new Map<string, NormalizedFeatureValue[]>();
  let missingValueCount = 0;
  for (const rule of rules) {
    const pool: NormalizedFeatureValue[] = [];
    for (const uid of eligible) {
      const value = normalizeAssignmentFeature(rule,
        snapshots.get(`${uid}|${rule.featureId}`),
        {eventId: params.eventId, organizerId: params.organizerId, uid});
      if (!value) {
        missingValueCount++;
        continue;
      }
      const byFeature = valuesByUid.get(uid) ?? new Map();
      byFeature.set(rule.featureId, value);
      valuesByUid.set(uid, byFeature);
      pool.push(value);
    }
    eligiblePoolByFeature.set(rule.featureId, pool);
  }
  return {rules, valuesByUid, eligiblePoolByFeature, missingValueCount};
}

export function assignmentFeaturePairAdjustment(
  context: AssignmentFeatureScoringContext | undefined,
  uidA: string,
  uidB: string
): number {
  if (!context) return 0;
  return context.rules.reduce((sum, rule) => sum +
    assignmentFeaturePairScore(rule,
      context.valuesByUid.get(uidA)?.get(rule.featureId) ?? null,
      context.valuesByUid.get(uidB)?.get(rule.featureId) ?? null), 0);
}

export function assignmentFeatureGroupBalanceCost(
  context: AssignmentFeatureScoringContext | undefined,
  uids: string[]
): number {
  if (!context) return 0;
  return context.rules.reduce((sum, rule) => {
    if (rule.mode !== "balanceAcrossGroups") return sum;
    const group = uids.map((uid) =>
      context.valuesByUid.get(uid)?.get(rule.featureId))
      .filter((value): value is NormalizedFeatureValue => value !== undefined);
    return sum + assignmentFeatureBalanceCost(rule, group,
      context.eligiblePoolByFeature.get(rule.featureId) ?? []);
  }, 0);
}

/** Invalid configuration fails closed before any assignment is generated. */
export function validateAssignmentFeatureRules(
  rules: AssignmentFeatureRule[]
): AssignmentFeatureRule[] {
  if (rules.length > MAX_RULES) {
    throw new Error("Too many assignment features.");
  }
  const ids = new Set<string>();
  for (const rule of rules) {
    if (!["category", "set", "number", "ordinal"].includes(rule.kind) ||
        !["preferSimilar", "preferDifferent", "balanceAcrossGroups",
          "coverAcrossGroups"].includes(rule.mode) ||
        (rule.mode === "coverAcrossGroups" && rule.kind !== "category" &&
          rule.kind !== "set") ||
        !nonempty(rule.featureId) || !nonempty(rule.formId) ||
        !nonempty(rule.versionId) || !nonempty(rule.questionId) ||
        !Number.isSafeInteger(rule.transformVersion) ||
        rule.transformVersion < 1 || ids.has(rule.featureId) ||
        !Number.isFinite(rule.weight) || rule.weight < 0 ||
        rule.weight > MAX_WEIGHT) {
      throw new Error("Invalid assignment feature configuration.");
    }
    ids.add(rule.featureId);
    if (rule.kind === "number" || rule.kind === "ordinal") {
      const scores = rule.kind === "ordinal" ?
        Object.values(rule.scoreByOptionId ?? {}) : [];
      const bounds = rule.kind === "number" ?
        [rule.minimum, rule.maximum] : scores;
      if (bounds.length < 2 || bounds.some((v) =>
        typeof v !== "number" || !Number.isFinite(v)) ||
          Math.min(...bounds as number[]) ===
          Math.max(...bounds as number[]) ||
          !Number.isFinite(Math.max(...bounds as number[]) -
            Math.min(...bounds as number[]))) {
        throw new Error("Invalid assignment feature range.");
      }
      if (rule.kind === "number" &&
          (rule.minimum as number) >= (rule.maximum as number)) {
        throw new Error("Invalid assignment feature range.");
      }
    }
    if (rule.kind !== "number") {
      const options = rule.optionIds ?? [];
      if (!options.length || options.length > MAX_OPTIONS ||
          options.some((id) => !nonempty(id)) ||
          new Set(options).size !== options.length ||
          (rule.kind === "ordinal" &&
            (Object.keys(rule.scoreByOptionId ?? {}).length !==
              options.length || options.some((id) =>
              !Object.hasOwn(rule.scoreByOptionId ?? {}, id))))) {
        throw new Error("Invalid assignment feature options.");
      }
    }
  }
  return rules;
}

/** Returns null for absent, withheld, stale or unmapped answers. */
export function normalizeAssignmentFeature(
  rule: AssignmentFeatureRule,
  snapshot: EventAssignmentFeatureSnapshot | null | undefined,
  authority: {eventId: string; organizerId: string; uid: string}
): NormalizedFeatureValue | null {
  if (!snapshot || !nonempty(snapshot.consentReceiptId) ||
      snapshot.eventId !== authority.eventId ||
      snapshot.organizerId !== authority.organizerId ||
      snapshot.uid !== authority.uid ||
      snapshot.featureId !== rule.featureId ||
      snapshot.formId !== rule.formId ||
      snapshot.versionId !== rule.versionId ||
      snapshot.questionId !== rule.questionId ||
      snapshot.transformVersion !== rule.transformVersion ||
      snapshot.value.kind !== rule.kind) return null;
  const value = snapshot.value;
  if (value.kind === "number" && rule.kind === "number") {
    if (!Number.isFinite(value.value) ||
        value.value < (rule.minimum as number) ||
        value.value > (rule.maximum as number)) return null;
    return {kind: "scalar", value: (value.value - (rule.minimum as number)) /
      ((rule.maximum as number) - (rule.minimum as number))};
  }
  if (value.kind === "category" && rule.kind === "category") {
    return rule.optionIds?.includes(value.optionId) ?
      {kind: "category", value: value.optionId} : null;
  }
  if (value.kind === "ordinal" && rule.kind === "ordinal") {
    const score = rule.scoreByOptionId?.[value.optionId];
    if (!rule.optionIds?.includes(value.optionId) ||
        typeof score !== "number" || !Number.isFinite(score)) return null;
    const values = Object.values(rule.scoreByOptionId!);
    return {kind: "scalar", value: (score - Math.min(...values)) /
      (Math.max(...values) - Math.min(...values))};
  }
  if (value.kind === "set" && rule.kind === "set") {
    if (!value.optionIds.length || value.optionIds.length > MAX_OPTIONS ||
        new Set(value.optionIds).size !== value.optionIds.length ||
        value.optionIds.some((id) => !rule.optionIds?.includes(id))) {
      return null;
    }
    return {kind: "set", values: new Set(value.optionIds)};
  }
  return null;
}

/** Neutral zero when either person withheld this feature. */
export function assignmentFeaturePairScore(
  rule: AssignmentFeatureRule,
  a: NormalizedFeatureValue | null,
  b: NormalizedFeatureValue | null
): number {
  if (!a || !b || a.kind !== b.kind ||
      rule.mode === "balanceAcrossGroups" ||
      rule.mode === "coverAcrossGroups") return 0;
  let similarity: number;
  if (a.kind === "scalar" && b.kind === "scalar") {
    similarity = 1 - Math.abs(a.value - b.value);
  } else if (a.kind === "category" && b.kind === "category") {
    similarity = a.value === b.value ? 1 : 0;
  } else if (a.kind === "set" && b.kind === "set") {
    const intersection = [...a.values].filter((v) => b.values.has(v)).length;
    const union = new Set([...a.values, ...b.values]).size;
    if (union === 0) return 0;
    similarity = intersection / union;
  } else return 0;
  return rule.weight * (rule.mode === "preferSimilar" ?
    similarity : 1 - similarity);
}

/** Penalizes a group's departure from the present eligible pool proportion. */
export function assignmentFeatureBalanceCost(
  rule: AssignmentFeatureRule,
  group: NormalizedFeatureValue[],
  eligiblePool: NormalizedFeatureValue[]
): number {
  if (rule.mode !== "balanceAcrossGroups" || !group.length ||
      !eligiblePool.length) return 0;
  const categoryDistance = (values: NormalizedFeatureValue[],
    optionId: string): number => values.filter((value) =>
    value.kind === "category" && value.value === optionId).length /
      values.length;
  if (rule.kind === "category") {
    return rule.weight * (rule.optionIds ?? []).reduce((cost, id) =>
      cost + Math.abs(categoryDistance(group, id) -
        categoryDistance(eligiblePool, id)), 0) / 2;
  }
  if (rule.kind === "number" || rule.kind === "ordinal") {
    const mean = (values: NormalizedFeatureValue[]) =>
      values.reduce((sum, value) => sum +
        (value.kind === "scalar" ? value.value : 0), 0) / values.length;
    return rule.weight * Math.abs(mean(group) - mean(eligiblePool));
  }
  if (rule.kind === "set") {
    return rule.weight * (rule.optionIds ?? []).reduce((cost, id) => {
      const proportion = (values: NormalizedFeatureValue[]) =>
        values.filter((value) => value.kind === "set" &&
          value.values.has(id)).length / values.length;
      return cost + Math.abs(proportion(group) -
        proportion(eligiblePool));
    }, 0) / (rule.optionIds?.length ?? 1);
  }
  return 0;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}
