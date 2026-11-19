import {operationContentHash} from "../../operations/durableActions";
import type {EventDocument} from "../../shared/generated/eventDocument";
import type {EventAssistancePolicy} from
  "../../shared/generated/eventAssistancePolicy";
import {validateEventAssistancePolicy} from
  "../../shared/generated/validators/eventAssistancePolicy";
import type {EventAssistanceSettingDocument as Setting} from
  "../../shared/generated/eventAssistanceSettingDocument";
import {groupProgressSource, timestampEvidence} from "./groupProgressSource";

export type {Setting};
export type Template = Extract<Setting["preference"],
  {kind: "configured"}>["template"];
export const ASSISTANCE_POLICY_VERSION = "event-assistance/v1";
export const SETTINGS = "eventAssistanceSettings";
export const SETTING_RECEIPT_COMMAND = "eventAssistanceSetting";
export type SettingScope = Pick<Setting,
  "context" | "groupId" | "workflowKind">;

export function settingId(scope: SettingScope) {
  return "setting:" + operationContentHash([
    scope.context, scope.groupId, scope.workflowKind]);
}

/** Editing basis excludes attendance counters and live step progress. */
export function settingSource(event: EventDocument, generation: unknown,
  scope: SettingScope, now: number) {
  const progress = groupProgressSource({context: scope.context,
    groupId: scope.groupId, event, eventGeneration: generation, plan: null,
    planGeneration: null, now});
  return {destinations: progress.destinations, endAt: progress.endAt,
    hash: operationContentHash([scope.context, scope.groupId,
      timestampEvidence(generation), event.eventFormat,
      timestampEvidence(event.startTime), timestampEvidence(event.endTime),
      event.meetingLocation ?? null, event.itinerary ?? [],
      event.eventPolicy ?? null, event.constraints ?? null,
      event.capacityLimit ?? null, event.priceInPaise ?? null,
      event.currency ?? null, event.publicRegistrationEnabled ?? null])};
}

/** A suggestion is not saved or executable without a host choice. */
export function suggestedTemplate(
  kind: Setting["workflowKind"]
): Template | null {
  if (kind !== "lateJoin") return null;
  return {kind: "lateJoin", version: 1,
    setting: {kind: "enabled", authority: "prepare"}, config: {
      destination: {kind: "confirmedGroupProgress"},
      cutoff: {kind: "eventEnd"}, maxMessagesPerEpisode: 3,
      minimumMinutesBetweenMessages: 10, updateOn: "materialGuidanceChange",
      unanswered: "keepUnknownUntilCutoff"}};
}

type Destination = ReturnType<typeof settingSource>["destinations"][number][
  "target"];

/** Explicit joining references must come from this event/group's setup. */
export function templateTargetsAreCurrent(template: Template,
  targets: Destination[]): boolean {
  if (template.kind !== "lateJoin") return true;
  const destination = template.config.destination;
  switch (destination.kind) {
  case "confirmedGroupProgress": return true;
  case "fixedPlace": return targets.some((t) =>
    t.kind === "fixedPlace" && t.placeId === destination.placeId);
  case "itineraryStop": {
    const stops = targets.flatMap((t) => t.kind === "itineraryStop" &&
      t.itineraryId === destination.itineraryId ? [t.stopId] : []);
    return stops.length > 0 && destination.permittedStopIds.every((id) =>
      stops.includes(id));
  }
  case "groupCheckpoint": {
    const checkpoints = targets.flatMap((t) => t.kind === "groupCheckpoint" &&
      t.routeId === destination.routeId && t.groupId === destination.groupId ?
      [t.checkpointId] : []);
    return checkpoints.length > 0 &&
      destination.permittedCheckpointIds.every((id) =>
        checkpoints.includes(id));
  }
  }
}

/** Bind a reusable preference to one runtime subject using current source. */
export function bindPolicyTemplate(template: Template,
  scope: EventAssistancePolicy["scope"], targets: Destination[],
  confirmed: Destination | null): EventAssistancePolicy | null {
  if (!templateTargetsAreCurrent(template, targets)) return null;
  let config: unknown = template.config;
  if (template.kind === "lateJoin" &&
      template.config.destination.kind === "confirmedGroupProgress") {
    if (!confirmed || !targets.some((t) =>
      operationContentHash(t) === operationContentHash(confirmed))) return null;
    let destination: unknown;
    switch (confirmed.kind) {
    case "fixedPlace": destination = confirmed; break;
    case "itineraryStop":
      destination = {kind: confirmed.kind, itineraryId: confirmed.itineraryId,
        permittedStopIds: targets.flatMap((t) =>
          t.kind === "itineraryStop" &&
            t.itineraryId === confirmed.itineraryId ?
            [t.stopId] : [])};
      break;
    case "groupCheckpoint":
      destination = {kind: confirmed.kind, routeId: confirmed.routeId,
        groupId: confirmed.groupId, permittedCheckpointIds: targets.flatMap(
          (t) => t.kind === "groupCheckpoint" &&
            t.routeId === confirmed.routeId && t.groupId === confirmed.groupId ?
            [t.checkpointId] : [])};
      break;
    }
    config = {...template.config, destination};
  }
  const setting = template.setting.kind === "enabled" ?
    {...template.setting, policyVersion: ASSISTANCE_POLICY_VERSION} :
    template.setting;
  const result: unknown = {...template, config, scope, setting};
  if (!validateEventAssistancePolicy(result)) {
    throw new Error("Policy template cannot bind to this runtime subject");
  }
  return result;
}
