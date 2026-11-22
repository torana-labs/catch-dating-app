import type {
  MomentAction,
  MomentApproval,
  MomentAudience,
  MomentDefinition,
} from "./momentModel";

/**
 * A wedding program function a moment can target. Inputs carry identity and
 * display data only — anchor times always resolve from AnchorFacts at plan
 * time.
 */
export interface FunctionTemplateInput {
  programId: string;
  functionId: string;
  /** Display name reused in the moment name and template variables. */
  name?: string;
  /**
   * Cancelled functions can never dispatch: their anchors resolve to
   * anchorCancelled and the fire fence skips them, so every factory that
   * references one omits the moment instead.
   */
  cancelled?: boolean;
}

/** Program-level descriptor for program-anchored moments. */
export interface ProgramTemplateInput {
  programId: string;
  name?: string;
}

/** A scheduled transport departure (travel party) a moment can target. */
export interface DepartureTemplateInput {
  programId: string;
  legId: string;
  name?: string;
  /**
   * Function this departure serves. When set, the moment audience is that
   * function's attending guests — the closest representation of "guests on
   * that travel party" the audience model supports. When omitted, the
   * audience falls back to every program household.
   */
  functionId?: string;
  /** Set when the served function is cancelled; omits the moment. */
  functionCancelled?: boolean;
}

/** A travel leg whose flight status can disrupt the program. */
export interface LegTemplateInput {
  programId: string;
  legId: string;
  name?: string;
  /** Function context carried on the condition trigger, if any. */
  functionId?: string;
  /** Set when the context function is cancelled; omits the moment. */
  functionCancelled?: boolean;
}

/** Options shared by the sendTemplate factories. */
export interface MessageTemplateOptions {
  /** Messaging connection the sendTemplate action dispatches through. */
  connectionId: string;
  /** Template key override; each factory ships a default. */
  templateId?: string;
  /** Extra template variables merged over the deterministic defaults. */
  variables?: Readonly<Record<string, string>>;
  /** Moment display name override. */
  name?: string;
  /**
   * Approve-the-rule-once: when present the moment is created armed with
   * this approval; otherwise it is a draft awaiting arming.
   */
  armedBy?: MomentApproval;
}

/** Options for guest-message moments anchored on a function start. */
export interface FunctionGuestMessageOptions extends MessageTemplateOptions {
  /** Minutes relative to the anchor; negative fires before it. */
  offsetMinutes?: number;
  /** RSVP states counted as attending; defaults to ["attending"]. */
  rsvp?: ReadonlyArray<"attending" | "maybe">;
  /** Dedupe recipients by household; defaults to true. */
  householdDedupe?: boolean;
  /** Distance-aware lead: each guest's send moves earlier by their
   *  hotel→venue travel estimate. Defaults to false. */
  travelTimeLead?: boolean;
}

/** Options for the transport departure notice. */
export interface TransportReadyOptions extends MessageTemplateOptions {
  /** Minutes relative to departure; defaults to 0. */
  offsetMinutes?: number;
  /** Audience override; defaults derive from the served function. */
  audience?: MomentAudience;
}

/** Options for the RSVP deadline chase. */
export interface RsvpChaseOptions extends MessageTemplateOptions {
  /** Minutes relative to the deadline; defaults to -24h. */
  offsetMinutes?: number;
}

/** Options for the staffAttention alert factories. */
export interface StaffAlertOptions {
  /** Staff duty both the audience and the action route to. */
  duty?: string;
  severity?: Extract<MomentAction, {kind: "staffAttention"}>["severity"];
  /** Attention title template override. */
  titleTemplate?: string;
  /**
   * Duty scope override. Defaults to the ids the alert concerns — the
   * function for gate alerts and the leg for flight disruptions.
   */
  scopeIds?: ReadonlyArray<string> | null;
  name?: string;
  armedBy?: MomentApproval;
}

type GuestRsvp =
  Extract<MomentAudience, {kind: "functionGuests"}>["rsvp"];

export function functionStartReminder(
  fn: FunctionTemplateInput,
  opts: FunctionGuestMessageOptions,
): MomentDefinition | null {
  if (fn.cancelled) return null;
  requireId(fn.programId, "programId");
  requireId(fn.functionId, "functionId");
  requireId(opts.connectionId, "connectionId");
  const offsetMinutes = opts.offsetMinutes ?? -15;
  requireOffset(offsetMinutes);
  const display = fn.name ?? fn.functionId;
  return {
    momentId: `${fn.programId}_${fn.functionId}_function_start_reminder`,
    scope: {kind: "program", programId: fn.programId},
    name: opts.name ?? `${display} starts soon`,
    initiation: {
      kind: "anchored",
      anchorKind: "functionStart",
      anchorId: fn.functionId,
      offsetMinutes,
    },
    audience: functionGuestAudience(fn.functionId, opts),
    action: {
      kind: "sendTemplate",
      connectionId: opts.connectionId,
      templateId: opts.templateId ?? "program_function_starting",
      variables: {...functionVariables(fn), ...opts.variables},
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

export function dressReminder(
  fn: FunctionTemplateInput,
  opts: FunctionGuestMessageOptions,
): MomentDefinition | null {
  if (fn.cancelled) return null;
  requireId(fn.programId, "programId");
  requireId(fn.functionId, "functionId");
  requireId(opts.connectionId, "connectionId");
  const offsetMinutes = opts.offsetMinutes ?? -60;
  requireOffset(offsetMinutes);
  const display = fn.name ?? fn.functionId;
  return {
    momentId: `${fn.programId}_${fn.functionId}_dress_reminder`,
    scope: {kind: "program", programId: fn.programId},
    name: opts.name ?? `Get ready for ${display}`,
    initiation: {
      kind: "anchored",
      anchorKind: "functionStart",
      anchorId: fn.functionId,
      offsetMinutes,
    },
    audience: functionGuestAudience(fn.functionId, opts),
    action: {
      kind: "sendTemplate",
      connectionId: opts.connectionId,
      templateId: opts.templateId ?? "program_get_ready",
      variables: {...functionVariables(fn), ...opts.variables},
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

export function transportReadyNotice(
  departure: DepartureTemplateInput,
  opts: TransportReadyOptions,
): MomentDefinition | null {
  if (departure.functionCancelled) return null;
  requireId(departure.programId, "programId");
  requireId(departure.legId, "legId");
  requireId(opts.connectionId, "connectionId");
  if (departure.functionId !== undefined) {
    requireId(departure.functionId, "functionId");
  }
  const offsetMinutes = opts.offsetMinutes ?? 0;
  requireOffset(offsetMinutes);
  const display = departure.name ?? departure.legId;
  const audience: MomentAudience = opts.audience ??
    (departure.functionId === undefined ?
      {kind: "households", rsvpPendingOnly: false} :
      functionGuestAudience(departure.functionId, {}));
  return {
    momentId:
      `${departure.programId}_${departure.legId}_transport_ready`,
    scope: {kind: "program", programId: departure.programId},
    name: opts.name ?? `${display} transport ready`,
    initiation: {
      kind: "anchored",
      anchorKind: "travelLegTime",
      anchorId: departure.legId,
      offsetMinutes,
    },
    audience,
    action: {
      kind: "sendTemplate",
      connectionId: opts.connectionId,
      templateId: opts.templateId ?? "program_transport_ready",
      variables: {...departureVariables(departure), ...opts.variables},
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

export function rsvpDeadlineChase(
  program: ProgramTemplateInput,
  opts: RsvpChaseOptions,
): MomentDefinition {
  requireId(program.programId, "programId");
  requireId(opts.connectionId, "connectionId");
  const offsetMinutes = opts.offsetMinutes ?? -24 * 60;
  requireOffset(offsetMinutes);
  const display = program.name ?? "Program";
  return {
    momentId: `${program.programId}_rsvp_deadline_chase`,
    scope: {kind: "program", programId: program.programId},
    name: opts.name ?? `${display} RSVP deadline reminder`,
    initiation: {
      kind: "anchored",
      anchorKind: "rsvpDeadline",
      anchorId: null,
      offsetMinutes,
    },
    audience: {kind: "households", rsvpPendingOnly: true},
    action: {
      kind: "sendTemplate",
      connectionId: opts.connectionId,
      templateId: opts.templateId ?? "program_rsvp_deadline_reminder",
      variables: {...programVariables(program), ...opts.variables},
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

export function lateArrivalGateAlert(
  fn: FunctionTemplateInput,
  opts: StaffAlertOptions = {},
): MomentDefinition | null {
  if (fn.cancelled) return null;
  requireId(fn.programId, "programId");
  requireId(fn.functionId, "functionId");
  const display = fn.name ?? fn.functionId;
  const duty = opts.duty ?? "gateGreeter";
  requireId(duty, "duty");
  return {
    momentId: `${fn.programId}_${fn.functionId}_late_arrival_gate_alert`,
    scope: {kind: "program", programId: fn.programId},
    name: opts.name ?? `${display} late arrival gate alert`,
    initiation: {
      kind: "triggered",
      triggerKind: "lateArrivalAtHotel",
      functionId: fn.functionId,
    },
    audience: {
      kind: "staffDuty",
      duty,
      scopeIds: opts.scopeIds === undefined ? [fn.functionId] : opts.scopeIds,
    },
    action: {
      kind: "staffAttention",
      duty,
      severity: opts.severity ?? "warning",
      titleTemplate: opts.titleTemplate ??
        `Late arrival at hotel — escort to ${display}`,
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

export function flightDisruptionAlert(
  leg: LegTemplateInput,
  opts: StaffAlertOptions = {},
): MomentDefinition | null {
  if (leg.functionCancelled) return null;
  requireId(leg.programId, "programId");
  requireId(leg.legId, "legId");
  const display = leg.name ?? leg.legId;
  const duty = opts.duty ?? "transportDispatcher";
  requireId(duty, "duty");
  return {
    momentId: `${leg.programId}_${leg.legId}_flight_disruption_alert`,
    scope: {kind: "program", programId: leg.programId},
    name: opts.name ?? `${display} flight disruption alert`,
    initiation: {
      kind: "triggered",
      triggerKind: "flightDisrupted",
      functionId: leg.functionId ?? null,
    },
    audience: {
      kind: "staffDuty",
      duty,
      scopeIds: opts.scopeIds === undefined ? [leg.legId] : opts.scopeIds,
    },
    action: {
      kind: "staffAttention",
      duty,
      severity: opts.severity ?? "urgent",
      titleTemplate: opts.titleTemplate ??
        `Flight disruption on ${display} — rework transport`,
    },
    sense: "audience",
    ...lifecycle(opts.armedBy),
    origin: "organizer",
    revision: 1,
  };
}

function functionGuestAudience(
  functionId: string,
  opts: {rsvp?: GuestRsvp; householdDedupe?: boolean; travelTimeLead?: boolean},
): MomentAudience {
  return {
    kind: "functionGuests",
    functionId,
    rsvp: opts.rsvp ?? ["attending"],
    householdDedupe: opts.householdDedupe ?? true,
    travelTimeLead: opts.travelTimeLead ?? false,
  };
}

function functionVariables(
  fn: FunctionTemplateInput,
): Record<string, string> {
  const variables: Record<string, string> = {
    programId: fn.programId,
    functionId: fn.functionId,
  };
  if (fn.name !== undefined) variables.functionName = fn.name;
  return variables;
}

function programVariables(
  program: ProgramTemplateInput,
): Record<string, string> {
  const variables: Record<string, string> = {programId: program.programId};
  if (program.name !== undefined) variables.programName = program.name;
  return variables;
}

function departureVariables(
  departure: DepartureTemplateInput,
): Record<string, string> {
  const variables: Record<string, string> = {
    programId: departure.programId,
    legId: departure.legId,
  };
  if (departure.name !== undefined) {
    variables.legName = departure.name;
  }
  if (departure.functionId !== undefined) {
    variables.functionId = departure.functionId;
  }
  return variables;
}

// --- Event-scope system defaults ------------------------------------------
// These replace the bespoke sendEventReminders cron: a Catch event gets a
// T-15m push reminder for booked guests and, two hours after it ends, a
// feedback request for checked-in guests, both as armed system defaults.
// Push actions gate on the user's own notification preferences at send time.

/** The host's close-out thank-you moment for an event (eventSuccess). */
export function closeOutThankYouMomentId(eventId: string): string {
  return `${eventId}_close_out_thank_you`;
}

/** Event descriptor for system-default moments. */
export interface EventTemplateInput {
  eventId: string;
  name?: string;
}

/** Options for event system defaults; arming is implied. */
export interface EventDefaultOptions {
  /** Minutes relative to the anchor; reminder defaults to -15. */
  offsetMinutes?: number;
  name?: string;
  armedBy?: MomentApproval;
}

export function eventStartReminder(
  event: EventTemplateInput,
  opts: EventDefaultOptions = {},
): MomentDefinition {
  requireId(event.eventId, "eventId");
  const offsetMinutes = opts.offsetMinutes ?? -15;
  requireOffset(offsetMinutes);
  const display = event.name ?? "your event";
  return {
    momentId: `${event.eventId}_event_start_reminder`,
    scope: {kind: "event", eventId: event.eventId},
    name: opts.name ?? `${display} starts soon`,
    initiation: {
      kind: "anchored",
      anchorKind: "scopeStart",
      anchorId: null,
      offsetMinutes,
    },
    sense: "individual",
    audience: {kind: "eventParticipants", statuses: ["signedUp"]},
    action: {
      kind: "push",
      notificationType: "eventReminder",
      preferenceKey: "eventReminders",
    },
    ...lifecycle(opts.armedBy),
    origin: "systemDefault",
    revision: 1,
  };
}

/** Asks checked-in guests to rate the event. Only checked-in guests may
 *  review an event (createEventReview), so booked guests who were never
 *  checked in get no prompt they could not act on. */
export function eventFeedbackPrompt(
  event: EventTemplateInput,
  opts: EventDefaultOptions = {},
): MomentDefinition {
  requireId(event.eventId, "eventId");
  const offsetMinutes = opts.offsetMinutes ?? 2 * 60;
  requireOffset(offsetMinutes);
  const display = event.name ?? "your event";
  return {
    momentId: `${event.eventId}_event_feedback_prompt`,
    scope: {kind: "event", eventId: event.eventId},
    name: opts.name ?? `How was ${display}?`,
    initiation: {
      kind: "anchored",
      anchorKind: "scopeEnd",
      anchorId: null,
      offsetMinutes,
    },
    sense: "individual",
    audience: {kind: "eventParticipants", statuses: ["attended"]},
    action: {
      kind: "push",
      notificationType: "eventFeedback",
      preferenceKey: "eventReminders",
    },
    ...lifecycle(opts.armedBy),
    origin: "systemDefault",
    revision: 1,
  };
}

function lifecycle(
  armedBy: MomentApproval | undefined,
): Pick<MomentDefinition, "status" | "approval"> {
  return armedBy === undefined ?
    {status: "draft", approval: null} :
    {status: "armed", approval: armedBy};
}

function requireId(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RangeError(`Moment template ${field} must be non-empty.`);
  }
}

function requireOffset(offsetMinutes: number): void {
  if (!Number.isSafeInteger(offsetMinutes)) {
    throw new RangeError(
      "Moment template offsets must be safe-integer minutes.");
  }
}
