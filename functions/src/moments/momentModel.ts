/**
 * Unified send model. Every organizer-initiated or system-initiated message
 * — a one-off blast, a scheduled announcement, a T-15m reminder, a
 * "flight disrupted → alert the greeter" rule — is a Moment. Three
 * orthogonal axes describe it:
 *
 * - initiation: how it fires (manual | scheduled | anchored | triggered)
 * - sense: whether the message is about one recipient's own fact
 *   (individual) or resolved as a set at fire time (audience)
 * - action: the channel (WhatsApp template | push | staff attention)
 *
 * A Moment is scoped to a Catch event, a private program, or an organizer.
 * Organizer scope is the server-managed home for form-automation companion
 * moments — the rule stays the authored object and the projection carries
 * its approved revision pins. The anchors and audiences legal for each
 * scope differ and are enforced by `validateMomentDefinition`.
 */

export type MomentScope = {
  kind: "event";
  eventId: string;
} | {
  kind: "program";
  programId: string;
} | {
  kind: "organizer";
  organizerId: string;
};

export type MomentScopeKind = MomentScope["kind"];

export type MomentAnchorKind =
  "scopeStart" | "scopeEnd" | "functionStart" | "functionEnd" |
    "rsvpDeadline" | "travelLegTime";

export type MomentTriggerKind =
  "lateArrivalAtHotel" | "flightDisrupted" | "formAutomation";

/**
 * Server-managed binding between a companion moment and its authored
 * form-automation rule action. The rule owns editing, arming, and approval;
 * this projection carries the approved revision pins the delivery claim
 * re-verifies.
 */
export interface MomentAutomationBinding {
  ruleId: string;
  ruleRevision: number;
  actionId: string;
  recipeCampaignId: string;
  recipeRevision: number;
}

export type MomentInitiation = {
  kind: "manual";
} | {
  kind: "scheduled";
  atMillis: number;
} | {
  kind: "anchored";
  anchorKind: MomentAnchorKind;
  anchorId: string | null;
  offsetMinutes: number;
  /** Calendar-month shift applied first, in the scope's timezone; the local
   *  wall-clock time is preserved and the day clamps to the target month. */
  offsetMonths?: number;
  /** Calendar-day shift applied after months, same wall-clock semantics. */
  offsetDays?: number;
} | {
  kind: "triggered";
  triggerKind: MomentTriggerKind;
  functionId: string | null;
  /** Required when triggerKind is "formAutomation"; absent otherwise. */
  automation?: MomentAutomationBinding | null;
};

export type MomentInitiationKind = MomentInitiation["kind"];

export type MomentSense = "individual" | "audience";

export type MomentAudience = {
  /** The subject of the triggering fact; legal only with `triggered`. */
  kind: "subject";
} | {
  /** Booked participants of a Catch event. */
  kind: "eventParticipants";
  statuses: ReadonlyArray<"signedUp">;
} | {
  kind: "functionGuests";
  functionId: string;
  rsvp: ReadonlyArray<"attending" | "maybe">;
  householdDedupe: boolean;
  /** Distance-aware lead: shift each recipient's due earlier by the
   *  hotel→function travel estimate (hotel via their hotel-linked guest
   *  group). Program scopes only — functionGuests is already program-only. */
  travelTimeLead: boolean;
} | {
  kind: "households";
  rsvpPendingOnly: boolean;
} | {
  kind: "staffDuty";
  duty: string;
  scopeIds: ReadonlyArray<string> | null;
};

export type MomentAudienceKind = MomentAudience["kind"];

export type MomentAction = {
  kind: "sendTemplate";
  connectionId: string;
  templateId: string;
  variables: Readonly<Record<string, string>>;
} | {
  /** App push + activity item; copy derives from the scope at fire time. */
  kind: "push";
  notificationType: string;
  preferenceKey: string;
} | {
  kind: "staffAttention";
  duty: string;
  severity: "info" | "warning" | "urgent";
  titleTemplate: string;
};

export type MomentActionKind = MomentAction["kind"];

export type MomentStatus = "draft" | "armed" | "paused" | "done";

export type MomentOrigin = "organizer" | "systemDefault" | "formAutomation";

export interface MomentApproval {
  approvedByUid: string;
  approvedAtMillis: number;
}

export interface MomentDefinition {
  momentId: string;
  scope: MomentScope;
  name: string;
  initiation: MomentInitiation;
  sense: MomentSense;
  audience: MomentAudience;
  action: MomentAction;
  status: MomentStatus;
  /** Approve-the-rule-once: required to be non-null while `armed`. */
  approval: MomentApproval | null;
  origin: MomentOrigin;
  revision: number;
  /** Planner board anchor. Optional: older moments carry none and readers
   *  derive one from the initiation (`planAnchorFor`). */
  anchor?: MomentPlanAnchor | null;
}

/** What a planned programme message is tied to on the planner board. */
export interface MomentPlanAnchor {
  kind: "function" | "flight" | "date";
  id: string | null;
}

/** The stored anchor, or the one the initiation implies: function anchors
 *  tie to the function, travel legs to the flight, everything else to a
 *  date. */
export function planAnchorFor(moment: MomentDefinition): MomentPlanAnchor {
  if (moment.anchor) return moment.anchor;
  const initiation = moment.initiation;
  if (initiation.kind === "anchored") {
    if ((initiation.anchorKind === "functionStart" ||
        initiation.anchorKind === "functionEnd") && initiation.anchorId) {
      return {kind: "function", id: initiation.anchorId};
    }
    if (initiation.anchorKind === "travelLegTime") {
      return {kind: "flight", id: initiation.anchorId};
    }
  }
  if (initiation.kind === "triggered" &&
      initiation.triggerKind === "flightDisrupted") {
    return {kind: "flight", id: null};
  }
  return {kind: "date", id: null};
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Hotel/group geography for distance-aware leads. Loaded lazily per
 *  program scope — only armed moments with `travelTimeLead` need it. */
export interface TravelFacts {
  /** groupId -> hotelId for guest groups pinned to a program hotel. */
  groupHotelIds: Readonly<Record<string, string>>;
  /** hotelId -> coordinates for program hotels carrying a location. */
  hotelLocations: Readonly<Record<string, GeoPoint>>;
}

export interface AnchorFacts {
  scope: {
    startsAtMillis: number;
    endsAtMillis: number | null;
    rsvpDeadlineAtMillis: number | null;
    revision: number;
    messagingEnabled: boolean;
    cancelled: boolean;
    /** IANA zone for calendar offsets (offsetDays/offsetMonths). Optional;
     *  the planner falls back to the product default zone when absent. */
    timeZone?: string;
    /** Owning organizer; staffAttention sends stamp it for the
     *  attention-projection source query. Optional so program docs that
     *  predate the field still load. */
    organizerId?: string | null;
  };
  functions: Readonly<Record<string, {
    startsAtMillis: number;
    endsAtMillis: number;
    revision: number;
    cancelled: boolean;
    /** Venue pin; null when the function has no coordinates. Optional so
     *  event-scope facts (empty map) and older readers still compile. */
    venueLocation?: GeoPoint | null;
  }>>;
  travelLegs: Readonly<Record<string, {
    atMillis: number;
    revision: number;
  }>>;
  /** Present only when a sweep loaded hotel/group geography. */
  travel?: TravelFacts;
}

export type RunStatus =
  "planned" | "resolving" | "dispatched" | "skipped" | "superseded" |
    "failed";

export interface RunRecord {
  runId: string;
  momentId: string;
  /** Next wake/attempt time; mutable — quiet-hours, travel leads, and
   *  delivery retries move it without changing occurrence identity. */
  dueAtMillis: number;
  /** Immutable scheduled occurrence time (anchor plus offsets); the same
   *  instant runId encodes, kept inspectable rather than string-decoded. */
  nominalDueAtMillis?: number;
  /** Hard stop: a run whose wake lands past expiry skips instead of
   *  sending late. Absent on runs planned before the field existed. */
  expiresAtMillis?: number;
  /** New time-based identity: runId uses nominal due, not mutable wake. */
  occurrenceVersion?: 2;
  /** Initial cohort wake, separate from mutable quiet/recipient deferral. */
  plannedWakeAtMillis?: number;
  /** Hash of effective recipient leads for one travel planning generation. */
  travelPlanHash?: string;
  anchorRevision: number;
  status: RunStatus;
  targetFunctionId?: string;
  /** Subject of a triggered run, when the fact names one. */
  subjectId?: string;
  /** Immutable first-ingestion authority and recovery clock. */
  travelOccurrence?: {
    momentRevision: number;
    occurredAtMillis: number;
    createdAtMillis: number;
  };
  /**
   * Occurrence binding for form-automation sends. The automation engine
   * owns trigger matching and the business delay; this run materializes
   * when the action is reached. `deliveryMessageId` names the durable
   * intent that executes the send — the outbox owns the attempt history.
   */
  automation?: {
    ruleId: string;
    ruleRevision: number;
    actionId: string;
    eventKind: "submitted" | "withdrawn" | "applicationAccepted" |
      "eventAttended";
    sourceId: string;
    occurredAtMillis: number;
    /** Business-delay horizon at handoff; the claim re-derives it live. */
    dueAtMillis: number;
    /** Contact identity resolved at handoff; claim re-derives live. */
    contactId: string;
    deliveryMessageId: string;
  };
}

export function requireMillis(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      "Moment timing must be non-negative safe milliseconds.");
  }
}

export function scopeId(scope: MomentScope): string {
  return scope.kind === "event" ? scope.eventId :
    scope.kind === "program" ? scope.programId : scope.organizerId;
}

export function sameScope(a: MomentScope, b: MomentScope): boolean {
  return a.kind === b.kind && scopeId(a) === scopeId(b);
}

const PROGRAM_ONLY_ANCHORS: ReadonlySet<MomentAnchorKind> = new Set([
  "functionStart", "functionEnd", "rsvpDeadline", "travelLegTime",
]);

const AUDIENCE_SCOPES: Readonly<Record<MomentAudienceKind,
  ReadonlyArray<MomentScopeKind> | null>> = {
    subject: null,
    eventParticipants: ["event"],
    functionGuests: ["program"],
    households: ["program"],
    staffDuty: ["event", "program"],
  };

/**
 * Audiences that resolve phone endpoints. Program scopes produce
 * guest:/household: keys; organizer scopes produce contact: keys. A
 * sendTemplate action needs one; any other pairing could never reach a
 * WhatsApp recipient and previously died at fire time.
 */
const PHONE_AUDIENCES: ReadonlySet<MomentAudienceKind> = new Set([
  "subject", "functionGuests", "households",
]);

export type MomentInvariantViolation =
  "subjectRequiresTriggered" | "triggeredRequiresProgramScope" |
    "anchorNotLegalForScope" | "audienceNotLegalForScope" |
    "audienceSenseMismatch" | "armedRequiresApproval" |
    "manualRequiresAudienceSense" | "sendTemplateRequiresPhoneAudience" |
    "automationTriggerRequiresOrganizerScope" |
    "automationTriggerShapeMismatch" | "organizerScopeRequiresAutomation";

/**
 * Returns every axis invariant the definition violates. Empty means valid.
 * Pure; callables translate the list into an invalid-argument error.
 */
export function validateMomentDefinition(
  moment: MomentDefinition,
): MomentInvariantViolation[] {
  const violations: MomentInvariantViolation[] = [];
  const {initiation, audience, scope, sense, action} = moment;
  if (audience.kind === "subject" && initiation.kind !== "triggered") {
    violations.push("subjectRequiresTriggered");
  }
  if (action.kind === "sendTemplate" &&
      !PHONE_AUDIENCES.has(audience.kind)) {
    violations.push("sendTemplateRequiresPhoneAudience");
  }
  const automationTriggered = initiation.kind === "triggered" &&
    initiation.triggerKind === "formAutomation";
  if (initiation.kind === "triggered" && !automationTriggered &&
      scope.kind !== "program") {
    violations.push("triggeredRequiresProgramScope");
  }
  // Organizer scope is reserved for the server-managed automation subset:
  // triggered initiation bound to a rule action, one contact subject,
  // template send only.
  if (scope.kind === "organizer" && !automationTriggered) {
    violations.push("organizerScopeRequiresAutomation");
  }
  if (initiation.kind === "triggered" &&
      initiation.triggerKind === "formAutomation") {
    if (scope.kind !== "organizer") {
      violations.push("automationTriggerRequiresOrganizerScope");
    }
    if (initiation.automation == null || audience.kind !== "subject" ||
        action.kind !== "sendTemplate") {
      violations.push("automationTriggerShapeMismatch");
    }
  }
  if (initiation.kind === "anchored" &&
      PROGRAM_ONLY_ANCHORS.has(initiation.anchorKind) &&
      scope.kind !== "program") {
    violations.push("anchorNotLegalForScope");
  }
  const legalScopes = AUDIENCE_SCOPES[audience.kind];
  if (legalScopes !== null && !legalScopes.includes(scope.kind)) {
    violations.push("audienceNotLegalForScope");
  }
  if (audience.kind === "subject" && sense !== "individual") {
    violations.push("audienceSenseMismatch");
  }
  if (initiation.kind === "manual" && sense !== "audience") {
    violations.push("manualRequiresAudienceSense");
  }
  if (moment.status === "armed" && moment.approval === null) {
    violations.push("armedRequiresApproval");
  }
  return violations;
}

export type LifecycleResult = {
  kind: "ok";
  moment: MomentDefinition;
} | {
  kind: "rejected";
  reason: "invalidDefinition" | "notArmable" | "notPausable" |
    "notResumable" | "alreadyDone";
  violations?: MomentInvariantViolation[];
};

/**
 * Approve-the-rule-once: arming records who approved and when. Once armed,
 * individual (transactional) runs fire without further approval; audience
 * runs materialize pre-approved.
 */
export function armMoment(
  moment: MomentDefinition,
  approval: MomentApproval,
): LifecycleResult {
  requireMillis(approval.approvedAtMillis);
  if (moment.status === "done") {
    return {kind: "rejected", reason: "alreadyDone"};
  }
  if (moment.status === "armed") {
    return {kind: "rejected", reason: "notArmable"};
  }
  const next: MomentDefinition = {
    ...moment,
    status: "armed",
    approval,
    revision: moment.revision + 1,
  };
  const violations = validateMomentDefinition(next);
  if (violations.length > 0) {
    return {kind: "rejected", reason: "invalidDefinition", violations};
  }
  return {kind: "ok", moment: next};
}

export function pauseMoment(moment: MomentDefinition): LifecycleResult {
  if (moment.status !== "armed") {
    return {kind: "rejected", reason: "notPausable"};
  }
  return {
    kind: "ok",
    moment: {...moment, status: "paused", revision: moment.revision + 1},
  };
}

/** Resuming keeps the original approval — the rule itself did not change. */
export function resumeMoment(moment: MomentDefinition): LifecycleResult {
  if (moment.status !== "paused" || moment.approval === null) {
    return {kind: "rejected", reason: "notResumable"};
  }
  return {
    kind: "ok",
    moment: {...moment, status: "armed", revision: moment.revision + 1},
  };
}

/**
 * Any edit to when/who/what invalidates the standing approval: the moment
 * drops back to draft and must be re-armed.
 */
export function reviseMoment(
  moment: MomentDefinition,
  patch: Partial<Pick<MomentDefinition,
    "name" | "initiation" | "sense" | "audience" | "action" | "anchor">>,
): LifecycleResult {
  if (moment.status === "done") {
    return {kind: "rejected", reason: "alreadyDone"};
  }
  const next: MomentDefinition = {
    ...moment,
    ...patch,
    status: "draft",
    approval: null,
    revision: moment.revision + 1,
  };
  const violations = validateMomentDefinition(next);
  if (violations.length > 0) {
    return {kind: "rejected", reason: "invalidDefinition", violations};
  }
  return {kind: "ok", moment: next};
}
