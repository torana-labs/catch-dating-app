import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import type {
  EventInviteAttributionDocument,
  EventInviteLinkDocument,
  OrganizerContactEventEdgeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {rebuildOrganizerContact} from
  "../organizers/organizerAudienceProjection";
import {
  isStaleSourceEvent,
  sourceVersionOf,
  type SourceVersion,
} from "../shared/sourceVersion";

interface AttributionProjectionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: AttributionProjectionDeps = {
  firestore: () => admin.firestore(),
  timestamp: () => admin.firestore.Timestamp.now(),
};

type AttributionFactKind = "registration" | "checkIn";
type AttributionOperation = "credit" | "reversal";

/**
 * Projects verified attendee transitions into attribution facts. Given the
 * edge's document, each fact the transition touched is decided by the edge
 * as re-read inside its transaction: credited while the edge holds it,
 * reversed once it no longer does. So a late or racing delivery lands on the
 * edge's latest state, never on the event's (#2472).
 */
export async function projectEventInviteAttributions(
  before: OrganizerContactEventEdgeDocument | undefined,
  after: OrganizerContactEventEdgeDocument | undefined,
  deps: AttributionProjectionDeps = defaultDeps,
  edgeRef?: FirebaseFirestore.DocumentReference
): Promise<void> {
  const edge = after ?? before;
  const inviteLinkId = edge?.inviteLinkId ?? null;
  if (!edge || !inviteLinkId || !edge.linkedUid) return;
  const transitions = attributionTransitions(before, after);
  for (const transition of transitions) {
    await projectAttributionTransition(
      edge,
      inviteLinkId,
      transition.factKind,
      transition.operation,
      deps,
      edgeRef
    );
  }
}

/**
 * The trigger path: re-reads the edge, skips an event older than the edge's
 * current version, and projects the transition from the event's before to
 * the edge as stored now, deciding each fact by the edge read in its
 * transaction.
 * @param {string} edgeId The organizerContactEventEdges document id.
 * @param {OrganizerContactEventEdgeDocument | undefined} before Event before.
 * @param {SourceVersion | undefined} eventVersion What the event saw.
 * @param {AttributionProjectionDeps} deps Dependencies.
 * @return {Promise<"applied" | "stale">} Whether the event was projected.
 */
export async function projectEventInviteAttributionEvent(
  edgeId: string,
  before: OrganizerContactEventEdgeDocument | undefined,
  eventVersion: SourceVersion | undefined,
  deps: AttributionProjectionDeps = defaultDeps
): Promise<"applied" | "stale"> {
  const edgeRef = deps.firestore().collection("organizerContactEventEdges")
    .doc(edgeId);
  const snap = await edgeRef.get();
  if (isStaleSourceEvent(snap, eventVersion)) return "stale";
  const current = snap.exists ?
    snap.data() as OrganizerContactEventEdgeDocument : undefined;
  await projectEventInviteAttributions(before, current, deps, edgeRef);
  return "applied";
}

function holdsFact(edge: OrganizerContactEventEdgeDocument | undefined,
  factKind: AttributionFactKind): boolean {
  return factKind === "registration" ? registered(edge) :
    edge?.checkedIn === true;
}

async function projectAttributionTransition(
  eventEdge: OrganizerContactEventEdgeDocument,
  inviteLinkId: string,
  factKind: AttributionFactKind,
  eventOperation: AttributionOperation,
  deps: AttributionProjectionDeps,
  edgeRef?: FirebaseFirestore.DocumentReference
): Promise<void> {
  const db = deps.firestore();
  const linkRef = db.collection("eventInviteLinks").doc(inviteLinkId);
  const sourceFactId = `${eventEdge.attendeeId}:${factKind}`;
  const creditId = attributionId(sourceFactId, "credit");
  const creditRef = db.collection("eventInviteAttributions").doc(creditId);
  const reversalRef = db.collection("eventInviteAttributions")
    .doc(attributionId(sourceFactId, "reversal"));
  let attributionIdValue = attributionId(sourceFactId, eventOperation);
  const advocateContactId = await db.runTransaction(async (tx) => {
    const [linkSnap, creditSnap, reversalSnap, edgeSnap] = await Promise.all([
      tx.get(linkRef),
      tx.get(creditRef),
      tx.get(reversalRef),
      edgeRef ? tx.get(edgeRef) : Promise.resolve(null),
    ]);
    // The edge as stored now decides; without its reference (direct
    // calls), the event's own transition does.
    const latest = edgeSnap ? edgeSnap.data() as
      OrganizerContactEventEdgeDocument | undefined : undefined;
    const edge = latest ?? eventEdge;
    const operation: AttributionOperation = edgeSnap ?
      holdsFact(latest, factKind) ? "credit" : "reversal" :
      eventOperation;
    attributionIdValue = attributionId(sourceFactId, operation);
    const attributionRef = operation === "credit" ? creditRef : reversalRef;
    const attributionSnap = operation === "credit" ? creditSnap :
      reversalSnap;
    if (attributionSnap.exists || !linkSnap.exists) return null;
    if (latest && (latest.inviteLinkId !== inviteLinkId ||
        !latest.linkedUid)) return null;
    const link = linkSnap.data() as EventInviteLinkDocument;
    if (link.eventId !== edge.eventId ||
        link.organizerId !== edge.organizerId) return null;
    if (operation === "reversal" && !creditSnap.exists) return null;
    if (operation === "credit" && !withinAttributionWindow(edge, link)) {
      return null;
    }
    const referral = isReferralCredit({
      linkKind: link.linkKind ?? "hostChannel",
      ownerContactId: link.ownerContactId ??
        link.intendedRecipientContactId ?? null,
      intendedRecipientContactId: link.intendedRecipientContactId ?? null,
      subjectContactId: edge.contactId,
    });
    const now = deps.timestamp();
    const credit = creditSnap.data() as
      Partial<EventInviteAttributionDocument> | undefined;
    const occurredAt = operation === "reversal" ? credit?.occurredAt :
      attributionOccurredAt(edge, factKind);
    if (!occurredAt) return null;
    const attribution: EventInviteAttributionDocument = {
      eventId: edge.eventId,
      organizerId: edge.organizerId,
      inviteLinkId,
      linkKind: link.linkKind ?? "hostChannel",
      ownerContactId: link.ownerContactId ??
        link.intendedRecipientContactId ?? null,
      intendedRecipientContactId:
        link.intendedRecipientContactId ?? null,
      subjectContactId: edge.contactId,
      subjectUid: edge.linkedUid,
      factKind,
      operation,
      sourceKind: "eventAttendee",
      sourceFactId,
      primaryCredit: true,
      confidence: "exact",
      referralCredit: referral,
      amountMinor: null,
      currency: null,
      reversalOfAttributionId: operation === "reversal" ? creditId : null,
      occurredAt,
      createdAt: now,
    };
    const delta = operation === "credit" ? 1 : -1;
    const verifiedRegistrationCount = link.verifiedRegistrationCount ?? 0;
    const referredRegistrationCount = link.referredRegistrationCount ?? 0;
    const referredCheckedInCount = link.referredCheckedInCount ?? 0;
    tx.create(attributionRef, attribution);
    tx.update(linkRef, {
      ...(factKind === "registration" ? {
        verifiedRegistrationCount: nonnegativeDelta(
          verifiedRegistrationCount,
          delta
        ),
        ...(referral ? {
          referredRegistrationCount: nonnegativeDelta(
            referredRegistrationCount,
            delta
          ),
        } : {}),
      } : referral ? {
        referredCheckedInCount: nonnegativeDelta(
          referredCheckedInCount,
          delta
        ),
      } : {}),
      updatedAt: now,
    });
    return referral ? link.ownerContactId ??
      link.intendedRecipientContactId ?? null : null;
  });
  if (advocateContactId !== null) {
    await rebuildOrganizerContact(
      advocateContactId,
      `${attributionIdValue}|advocate`,
      {
        firestore: deps.firestore,
        timestamp: deps.timestamp,
        identitySecret: () => "unused-by-attribution-rebuild".padEnd(32, "_"),
      }
    );
  }
}

function attributionOccurredAt(
  edge: OrganizerContactEventEdgeDocument,
  factKind: AttributionFactKind
): FirebaseFirestore.Timestamp | null {
  if (factKind === "checkIn") {
    return edge.checkedInAt ?? edge.eventStartAt ?? edge.sourceUpdatedAt;
  }
  return edge.registeredAt ?? edge.sourceCreatedAt;
}

export function attributionTransitions(
  before: OrganizerContactEventEdgeDocument | undefined,
  after: OrganizerContactEventEdgeDocument | undefined
): Array<{
  factKind: AttributionFactKind;
  operation: AttributionOperation;
}> {
  const transitions: Array<{
    factKind: AttributionFactKind;
    operation: AttributionOperation;
  }> = [];
  appendTransition(transitions, "registration", registered(before),
    registered(after));
  appendTransition(transitions, "checkIn", before?.checkedIn === true,
    after?.checkedIn === true);
  return transitions;
}

export function isReferralCredit(params: {
  linkKind: NonNullable<EventInviteLinkDocument["linkKind"]>;
  ownerContactId: string | null;
  intendedRecipientContactId: string | null;
  subjectContactId: string;
}): boolean {
  if (params.linkKind === "attendeeReferrer") {
    return params.ownerContactId !== null &&
      params.ownerContactId !== params.subjectContactId;
  }
  if (params.linkKind === "directRecipient") {
    return params.intendedRecipientContactId !== null &&
      params.intendedRecipientContactId !== params.subjectContactId;
  }
  return false;
}

function appendTransition(
  result: Array<{
    factKind: AttributionFactKind;
    operation: AttributionOperation;
  }>,
  factKind: AttributionFactKind,
  before: boolean,
  after: boolean
): void {
  if (before === after) return;
  result.push({factKind, operation: after ? "credit" : "reversal"});
}

function registered(
  edge: OrganizerContactEventEdgeDocument | undefined
): boolean {
  return edge?.registered === true && edge.cancelled !== true;
}

function withinAttributionWindow(
  edge: OrganizerContactEventEdgeDocument,
  link: EventInviteLinkDocument
): boolean {
  const end = link.attributionWindowEndsAt as
    FirebaseFirestore.Timestamp | null | undefined;
  if (!end) return true;
  const captured = edge.inviteCapturedAt as
    FirebaseFirestore.Timestamp | null | undefined;
  return captured !== null && captured !== undefined &&
    captured.toMillis() <= end.toMillis();
}

function nonnegativeDelta(value: number, delta: number): number {
  return Math.max(0, value + delta);
}

function attributionId(
  sourceFactId: string,
  operation: AttributionOperation
): string {
  return `eia_${createHash("sha256")
    .update(`${sourceFactId}|${operation}`)
    .digest("hex").slice(0, 48)}`;
}

/**
 * Retried: attribution ids make each credit and reversal a single create,
 * and every fact is decided by the edge as stored now.
 */
export const onOrganizerContactEventEdgeInviteAttributed = onDocumentWritten(
  {document: "organizerContactEventEdges/{edgeId}", retry: true},
  async (event) => {
    const before = event.data?.before.data() as
      OrganizerContactEventEdgeDocument | undefined;
    await projectEventInviteAttributionEvent(event.params.edgeId, before,
      sourceVersionOf(event.data?.after));
  }
);
