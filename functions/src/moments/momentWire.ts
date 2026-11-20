import type {
  OrganizerMomentCallableResponse,
} from "../shared/generated/organizerMomentCallableResponse";
import type {MomentDefinition, MomentScope} from "./momentModel";

// The wire shape of a moment, shared by the Moments callables and the
// organizerMomentViews read model so both return the same object.

function scopeToWire(
  scope: MomentScope,
): OrganizerMomentCallableResponse["moment"]["scope"] {
  return scope.kind === "event" ?
    {kind: "event", eventId: scope.eventId, programId: null,
      organizerId: null} :
    scope.kind === "program" ?
      {kind: "program", eventId: null, programId: scope.programId,
        organizerId: null} :
      {kind: "organizer", eventId: null, programId: null,
        organizerId: scope.organizerId};
}

/** A moment as the Moments callables and views return it. */
export function momentToWire(
  moment: MomentDefinition,
): OrganizerMomentCallableResponse["moment"] {
  const initiation = moment.initiation;
  return {
    momentId: moment.momentId,
    scope: scopeToWire(moment.scope),
    name: moment.name,
    initiation: {
      kind: initiation.kind,
      atMillis: initiation.kind === "scheduled" ? initiation.atMillis : null,
      anchorKind: initiation.kind === "anchored" ?
        initiation.anchorKind : null,
      anchorId: initiation.kind === "anchored" ? initiation.anchorId : null,
      offsetMinutes: initiation.kind === "anchored" ?
        initiation.offsetMinutes : null,
      offsetDays: initiation.kind === "anchored" ?
        (initiation.offsetDays ?? 0) : null,
      offsetMonths: initiation.kind === "anchored" ?
        (initiation.offsetMonths ?? 0) : null,
      triggerKind: initiation.kind === "triggered" ?
        initiation.triggerKind : null,
      functionId: initiation.kind === "triggered" ?
        initiation.functionId : null,
    },
    sense: moment.sense,
    audience: momentAudienceToWire(moment.audience),
    action: momentActionToWire(moment.action),
    status: moment.status,
    approval: moment.approval,
    origin: moment.origin,
    revision: moment.revision,
    ...(moment.anchor ? {anchor: {...moment.anchor}} : {}),
  };
}

function momentAudienceToWire(
  audience: MomentDefinition["audience"],
): OrganizerMomentCallableResponse["moment"]["audience"] {
  switch (audience.kind) {
  case "subject":
    return {kind: "subject"};
  case "eventParticipants":
    return {kind: "eventParticipants", statuses: [...audience.statuses]};
  case "functionGuests":
    return {
      kind: "functionGuests",
      functionId: audience.functionId,
      rsvp: [...audience.rsvp],
      householdDedupe: audience.householdDedupe,
      travelTimeLead: audience.travelTimeLead,
    };
  case "households":
    return {kind: "households", rsvpPendingOnly: audience.rsvpPendingOnly};
  case "staffDuty":
    return {
      kind: "staffDuty",
      duty: audience.duty,
      scopeIds: audience.scopeIds === null ? null : [...audience.scopeIds],
    };
  }
}

function momentActionToWire(
  action: MomentDefinition["action"],
): OrganizerMomentCallableResponse["moment"]["action"] {
  switch (action.kind) {
  case "sendTemplate":
    return {
      kind: "sendTemplate",
      connectionId: action.connectionId,
      templateId: action.templateId,
      variables: {...action.variables},
    };
  case "push":
    return {
      kind: "push",
      notificationType: action.notificationType,
      preferenceKey: action.preferenceKey,
    };
  case "staffAttention":
    return {
      kind: "staffAttention",
      duty: action.duty,
      severity: action.severity,
      titleTemplate: action.titleTemplate,
    };
  }
}
