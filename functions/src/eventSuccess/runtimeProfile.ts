import type {
  EventDocument,
  EventRuntimeParticipantDocument,
  EventSuccessPlanDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventSuccessPrimitivesFor} from "./formatPrimitives";

export type RuntimeFieldId =
  EventRuntimeParticipantDocument["requiredFieldIds"][number];
export type RuntimeProfile = EventRuntimeParticipantDocument["runtimeProfile"];

const PREFERENCE_AWARE_MODULE_IDS = new Set([
  "first_hello_check_in",
  "guided_rotations",
  "micro_pods",
  "wingman_requests",
]);

export function requiredRuntimeFieldIds(
  event: EventDocument,
  _plan?: EventSuccessPlanDocument | null
): RuntimeFieldId[] {
  void _plan;
  const preEventFieldId = preEventRuntimeFieldId(event);
  return preEventFieldId ? ["displayName", preEventFieldId] : ["displayName"];
}

/** Selects the single pre-event payload from resolved format variables. */
export function preEventRuntimeFieldId(
  event: EventDocument
): RuntimeFieldId | null {
  switch (eventSuccessPrimitivesFor(event.eventFormat).interactionModel) {
  case "pacePods":
    return "paceBand";
  case "pairedRotations":
    return "skillBand";
  case "seatedTable":
    return "dietaryAndSeatingNotes";
  case "freeFormMixer":
    return "questionnaireAnswerIds";
  case "teamRotations":
    return "teamName";
  case "routeStops":
  case "hostLedProgram":
  case "openFormat":
    return null;
  }
}

/** Sensitive preference fields offered by this plan, but never required. */
export function optionalRuntimeFieldIds(
  event: EventDocument,
  plan: EventSuccessPlanDocument | null
): RuntimeFieldId[] {
  if (!plan?.selectedModuleIds.some((id) =>
    PREFERENCE_AWARE_MODULE_IDS.has(id))) return [];
  const policy = eventSuccessPrimitivesFor(event.eventFormat)
    .compatibilityPolicy;
  if (policy !== "mutualInterestOnly" &&
      policy !== "socialCohortBalance") return [];
  return ["gender", "interestedInGenders"];
}

export function completedRuntimeFieldIds(
  profile: RuntimeProfile
): RuntimeFieldId[] {
  const fields: RuntimeFieldId[] = [];
  if (profile.displayName.trim().length > 0) fields.push("displayName");
  if (profile.gender !== null) fields.push("gender");
  if (profile.interestedInGenders.length > 0) {
    fields.push("interestedInGenders");
  }
  if (profile.relationshipGoal !== null) fields.push("relationshipGoal");
  if (profile.dateOfBirth !== null) fields.push("dateOfBirth");
  if (profile.paceBand != null) fields.push("paceBand");
  if (profile.skillBand != null) fields.push("skillBand");
  if (profile.dietaryAndSeatingNotes != null) {
    fields.push("dietaryAndSeatingNotes");
  }
  if ((profile.questionnaireAnswerIds?.length ?? 0) > 0) {
    fields.push("questionnaireAnswerIds");
  }
  if (profile.teamName != null) fields.push("teamName");
  return fields;
}

export function runtimeAccessStatus(
  required: RuntimeFieldId[],
  completed: RuntimeFieldId[]
): "needsInput" | "ready" {
  return required.every((field) => completed.includes(field)) ?
    "ready" : "needsInput";
}
