import type {DocumentSnapshot} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventAssistanceCaseDocument as Case} from
  "../../shared/generated/eventAssistanceCaseDocument";
import type {EventAssistanceCaseCallableResponse as CaseResponse} from
  "../../shared/generated/eventAssistanceCaseCallableResponse";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventAssistanceCaseDocument} from
  "../../shared/generated/validators/eventAssistanceCaseDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {isOrganizerManager, organizerHostProfiles,
  organizerManagerUserIds} from "../../shared/organizerHosts";
import {guestIdentity, guestSourceFactsFromSnapshots} from "./guestRecords";
import {invalidSource} from "./groupProgressSource";
import {sameMessageContext} from "./messagingPolicy";

export type HostCase = Extract<Case, {owner: "eventLead"}>;
export type ManagedHostCase = Extract<HostCase, {handling: unknown}>;
export type HostCaseView = CaseResponse["view"];

/** Validate persisted identity before projecting or accepting a command. */
export function parseHostCase(value: unknown, id: string,
  context: CaseResponse["context"], now: number): HostCase {
  if (!validateEventAssistanceCaseDocument(value) ||
      value.owner !== "eventLead" || value.caseId !== id ||
      value.caseId !== "case:" + operationContentHash(value.responseId) ||
      value.guestId !== guestIdentity(value.context, value.attendeeId) ||
      !sameMessageContext(value.context, context) || value.receivedAt > now) {
    throw invalidSource();
  }
  if ("handling" in value) {
    const h = value.handling;
    if (h.updatedAt < value.receivedAt || h.updatedAt > now ||
        (h.revision === 0 && (h.assigneeUid !== null ||
          h.updatedAt !== value.receivedAt)) ||
        (h.resolution && (h.resolution.at !== h.updatedAt ||
          h.revision === 0))) throw invalidSource();
  }
  return value;
}

/** Bind retries to the original request, independently of later handling. */
export function hostCaseBindingHash(value: HostCase): string {
  return operationContentHash(Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "status" && key !== "handling")));
}

/** Old or recreated roster rows cannot inherit a prior person's request. */
export function projectHostCase(value: HostCase, event: DocumentSnapshot,
  attendee: DocumentSnapshot, organizer: OrganizerDocument): HostCaseView {
  let sourceGeneration: string | null = null;
  let attendeeGeneration: string | null = null;
  const row = attendee.data();
  if (row && row.eventId === value.context.eventId &&
      row.organizerId === value.context.organizerId) {
    if (!validateEventAttendeeDocument(row)) throw invalidSource();
    const source = guestSourceFactsFromSnapshots(value.context,
      value.attendeeId, event, attendee);
    sourceGeneration = source.sourceGeneration;
    attendeeGeneration = source.attendeeGeneration;
  }
  const modern = "handling" in value ? value : null;
  const availability = !modern ? "legacy" :
    modern.sourceGeneration === sourceGeneration &&
      modern.attendeeGeneration === attendeeGeneration ?
      "current" : "sourceChanged";
  const displayName = availability === "current" ?
    row!.displayName as string : null;
  const common = {caseId: value.caseId, displayName,
    sourceHash: operationContentHash([value, sourceGeneration,
      attendeeGeneration, displayName]), category: value.category,
    receivedAt: value.receivedAt};
  if (!modern || availability !== "current") {
    const unavailable = {...common, displayName: null, status: value.status,
      attendeeId: null, resolution: null, canChange: false as const,
      assignment: {kind: "unavailable" as const}};
    return modern ? {...unavailable, availability: "sourceChanged",
      revision: modern.handling.revision} :
      {...unavailable, availability: "legacy", revision: null};
  }
  const assigneeUid = modern.handling.assigneeUid;
  const current = {...common, availability: "current" as const,
    revision: modern.handling.revision, attendeeId: modern.attendeeId,
    assignment: assigneeUid ? {kind: "assigned" as const, uid: assigneeUid,
      authority: isOrganizerManager(organizer, assigneeUid) ?
        "current" as const : "revoked" as const} :
      {kind: "unassigned" as const}};
  return modern.status === "open" ? {...current, status: "open",
    resolution: null, canChange: true} : {...current, status: "resolved",
    resolution: modern.handling.resolution, canChange: false};
}


/** A manager snapshot; the server rechecks access for every assignment. */
export interface CaseManagerOptions {
  actorUid: string;
  managers: Array<{uid: string; displayName: string | null}>;
}

/**
 * Current organizer managers only; selected identity is rechecked on write.
 * Practice runs return it; the live console builds the same list on the
 * phone from the organizer document.
 */
export function projectCaseManagerOptions(organizer: OrganizerDocument,
  actorUid: string): CaseManagerOptions {
  if (!isOrganizerManager(organizer, actorUid)) throw invalidSource();
  const profiles = organizerHostProfiles(organizer);
  const managers = organizerManagerUserIds(organizer).map((uid) => ({uid,
    displayName: profiles.find((p) => p.uid === uid)?.displayName ?? null}));
  return {actorUid, managers};
}
