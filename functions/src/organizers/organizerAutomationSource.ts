import type {
  EventDocument,
  OrganizerApplicationDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactOriginDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormResponseDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {
  genericFormApplicationId,
  organizerApplicationAccess,
  organizerApplicationContactId,
} from "./organizerApplicationAccess";
import {staticAudienceMembers} from "./organizerSavedAudienceMembership";

export type OrganizerAutomationEventKind =
  | "submitted"
  | "withdrawn"
  | "applicationAccepted"
  | "eventAttended";
export interface OrganizerAutomationEvent {
  sourceId: string;
  kind: OrganizerAutomationEventKind;
  organizerId: string;
  formId: string | null;
  eventId: string | null;
  contactId: string | null;
  occurredAt: FirebaseFirestore.Timestamp;
  eventEndAt: FirebaseFirestore.Timestamp | null;
  response: OrganizerFormResponseDocument | null;
}

/** Reads the current authority, never a trigger's possibly stale snapshot. */
export async function readOrganizerAutomationEvent(
  db: FirebaseFirestore.Firestore,
  kind: OrganizerAutomationEventKind,
  sourceId: string,
): Promise<OrganizerAutomationEvent | null> {
  let result: OrganizerAutomationEvent;
  if (kind === "applicationAccepted") {
    const application = (
      await db.collection("organizerApplications").doc(sourceId).get()
    ).data() as OrganizerApplicationDocument | undefined;
    if (!application || application.reviewStatus !== "approved") return null;
    const access = await organizerApplicationAccess({
      db,
      applicationId: sourceId,
      application,
    });
    if (access.accessState === "revokedParticipantGrant") return null;
    const contactId = await organizerApplicationContactId({
      db,
      applicationId: sourceId,
      application,
    });
    if (!contactId) return null;
    result = {
      sourceId,
      kind,
      organizerId: application.organizerId,
      formId: application.formId,
      eventId: null,
      contactId,
      occurredAt: application.reviewedAt ?? application.updatedAt,
      eventEndAt: null,
      response: null,
    };
  } else if (kind === "eventAttended") {
    const edge = (
      await db.collection("organizerContactEventEdges").doc(sourceId).get()
    ).data() as OrganizerContactEventEdgeDocument | undefined;
    if (!edge?.checkedIn || edge.cancelled || !edge.checkedInAt) return null;
    const event = (
      await db.collection("events").doc(edge.eventId).get()
    ).data() as EventDocument | undefined;
    const endAt = event?.endTime;
    if (
      !event || !endAt || !Number.isFinite(endAt.toMillis()) ||
      (event.organizerId) !== edge.organizerId ||
      event.status === "cancelled"
    ) {
      return null;
    }
    result = {
      sourceId,
      kind,
      organizerId: edge.organizerId,
      formId: null,
      eventId: edge.eventId,
      contactId: edge.contactId,
      occurredAt: edge.checkedInAt,
      eventEndAt: endAt,
      response: null,
    };
  } else {
    const response = (
      await db.collection("organizerFormResponses").doc(sourceId).get()
    ).data() as OrganizerFormResponseDocument | undefined;
    if (!response || response.status !== kind) return null;
    const form = (
      await db.collection("organizerForms").doc(response.formId).get()
    ).data();
    if (!form || form.organizerId !== response.organizerId) return null;
    const origin = (
      await db
        .collection("organizerContactOrigins")
        .doc(
          organizerContactOriginId({
            organizerId: response.organizerId,
            sourceKind: "hostForm",
            sourceEntityKind: "hostFormResponse",
            sourceEntityId: sourceId,
          }),
        )
        .get()
    ).data() as OrganizerContactOriginDocument | undefined;
    result = {
      sourceId,
      kind,
      organizerId: response.organizerId,
      formId: response.formId,
      eventId: null,
      contactId:
        origin?.organizerId === response.organizerId ?
          origin.currentContactId :
          null,
      occurredAt:
        kind === "withdrawn" ?
          (response.withdrawnAt ?? response.submittedAt) :
          response.submittedAt,
      eventEndAt: null,
      response,
    };
  }
  if (result.contactId) {
    const members = await staticAudienceMembers(
      db,
      result.organizerId,
      [result.contactId],
      false,
    );
    result.contactId = [...members][0] ?? null;
  }
  if (
    !result.contactId &&
    (kind === "eventAttended" || kind === "applicationAccepted")
  ) {
    return null;
  }
  return result;
}

/**
 * The transactional twin of `readOrganizerAutomationEvent`. The delivery
 * claim runs inside a Firestore transaction, so every authority document —
 * response, edge, event, application, origin, and the merge chain — is read
 * through the transaction. Identical accept/reject logic; unavailable or
 * cross-organizer inputs return null instead of throwing.
 */
export async function readOrganizerAutomationEventTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  kind: OrganizerAutomationEventKind,
  sourceId: string,
): Promise<OrganizerAutomationEvent | null> {
  const get = (collection: string, id: string) =>
    tx.get(db.collection(collection).doc(id));
  let result: OrganizerAutomationEvent;
  if (kind === "applicationAccepted") {
    const application = (
      await get("organizerApplications", sourceId)
    ).data() as OrganizerApplicationDocument | undefined;
    if (!application || application.reviewStatus !== "approved") return null;
    const access = await organizerApplicationAccess({
      db,
      applicationId: sourceId,
      application,
      transaction: tx,
    });
    if (access.accessState === "revokedParticipantGrant") return null;
    const contactId = await organizerApplicationContactIdTx({
      tx,
      db,
      applicationId: sourceId,
      application,
    });
    if (!contactId) return null;
    result = {
      sourceId,
      kind,
      organizerId: application.organizerId,
      formId: application.formId,
      eventId: null,
      contactId,
      occurredAt: application.reviewedAt ?? application.updatedAt,
      eventEndAt: null,
      response: null,
    };
  } else if (kind === "eventAttended") {
    const edge = (
      await get("organizerContactEventEdges", sourceId)
    ).data() as OrganizerContactEventEdgeDocument | undefined;
    if (!edge?.checkedIn || edge.cancelled || !edge.checkedInAt) return null;
    const event = (
      await get("events", edge.eventId)
    ).data() as EventDocument | undefined;
    const endAt = event?.endTime;
    if (
      !event || !endAt || !Number.isFinite(endAt.toMillis()) ||
      (event.organizerId) !== edge.organizerId ||
      event.status === "cancelled"
    ) {
      return null;
    }
    result = {
      sourceId,
      kind,
      organizerId: edge.organizerId,
      formId: null,
      eventId: edge.eventId,
      contactId: edge.contactId,
      occurredAt: edge.checkedInAt,
      eventEndAt: endAt,
      response: null,
    };
  } else {
    const response = (
      await get("organizerFormResponses", sourceId)
    ).data() as OrganizerFormResponseDocument | undefined;
    if (!response || response.status !== kind) return null;
    const form = (await get("organizerForms", response.formId)).data();
    if (!form || form.organizerId !== response.organizerId) return null;
    const origin = (
      await get(
        "organizerContactOrigins",
        organizerContactOriginId({
          organizerId: response.organizerId,
          sourceKind: "hostForm",
          sourceEntityKind: "hostFormResponse",
          sourceEntityId: sourceId,
        }),
      )
    ).data() as OrganizerContactOriginDocument | undefined;
    result = {
      sourceId,
      kind,
      organizerId: response.organizerId,
      formId: response.formId,
      eventId: null,
      contactId:
        origin?.organizerId === response.organizerId ?
          origin.currentContactId :
          null,
      occurredAt:
        kind === "withdrawn" ?
          (response.withdrawnAt ?? response.submittedAt) :
          response.submittedAt,
      eventEndAt: null,
      response,
    };
  }
  if (result.contactId) {
    result.contactId = await resolveAutomationContactTx(
      tx,
      db,
      result.organizerId,
      result.contactId,
    );
  }
  if (
    !result.contactId &&
    (kind === "eventAttended" || kind === "applicationAccepted")
  ) {
    return null;
  }
  return result;
}

/** `organizerApplicationContactId` inside a transaction. */
async function organizerApplicationContactIdTx(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  applicationId: string;
  application: OrganizerApplicationDocument;
}): Promise<string | null> {
  const generic = params.application.source.kind === "native" &&
    params.applicationId ===
      genericFormApplicationId(params.application.latestResponseId);
  const origin = (
    await params.tx.get(
      params.db.collection("organizerContactOrigins").doc(
        organizerContactOriginId({
          organizerId: params.application.organizerId,
          sourceKind: "hostForm",
          sourceEntityKind: generic ?
            "hostFormResponse" : "hostApplicationResponse",
          sourceEntityId: params.application.latestResponseId,
        }),
      ),
    )
  ).data() as OrganizerContactOriginDocument | undefined;
  return origin?.organizerId === params.application.organizerId ?
    origin.currentContactId : params.application.contactId;
}

/**
 * Merge-chain resolution inside a transaction: follows
 * `mergedIntoContactId` hops (bounded at 10) and returns the live contact
 * id only when the terminal contact is available — the same rule
 * `resolveStaticAudienceSelection` applies without batch reads.
 */
async function resolveAutomationContactTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  contactId: string,
): Promise<string | null> {
  let current = contactId;
  const seen = new Set<string>();
  for (let hop = 0; hop < 10; hop += 1) {
    if (seen.has(current)) return null; // merge cycle — fail closed
    seen.add(current);
    const snap = await tx.get(db.collection("organizerContacts").doc(current));
    const contact = snap.data() as OrganizerContactDocument | undefined;
    if (!contact || contact.organizerId !== organizerId) return null;
    if (contact.mergedIntoContactId) {
      current = contact.mergedIntoContactId;
      continue;
    }
    if (contact.deletedAt || contact.hiddenAt ||
        contact.identityState === "merged") {
      return null;
    }
    return current;
  }
  return null;
}

export function organizerAutomationDueMillis(
  event: OrganizerAutomationEvent,
  rule: OrganizerFormAutomationRuleDocument,
): number {
  return (
    Math.max(event.occurredAt.toMillis(), event.eventEndAt?.toMillis() ?? 0) +
    (rule.delayMinutes ?? 0) * 60000
  );
}
