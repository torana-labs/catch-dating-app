import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {
  EventDocument,
  MatchDocument,
  OrganizerContactDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  validateStartOrganizerContactConversationCallablePayload,
} from
  "../shared/generated/validators/startOrganizerContactConversationInput";
import {
  validateStartOrganizerConversationCallablePayload,
} from
  "../shared/generated/validators/startOrganizerConversationInput";
import {organizerManagerUserIds} from "../shared/organizerHosts";
import {assertNoBlockingRelationshipInTransaction} from "../safety/blocking";
import type {StartOrganizerConversationCallablePayload} from
  "../shared/generated/startOrganizerConversationCallablePayload";
import type {StartOrganizerContactConversationCallablePayload} from
  "../shared/generated/startOrganizerContactConversationCallablePayload";
import {normalizeOrganizerHostPayload} from
  "../organizers/organizerPayloadNormalization";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

interface OrganizerConversationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

// Both entry points count against one per-caller conversation-start budget.
const startConversationRateLimit = {maxRequests: 5, windowMs: 60 * 1000};

const defaultDeps: OrganizerConversationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/** Starts or reuses a canonical organizer-host conversation. */
export async function startOrganizerConversationHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerConversationDeps = defaultDeps
): Promise<{matchId: string}> {
  const callerUid = requireAuth(request);
  const data =
    validateCallableWithAjv<StartOrganizerConversationCallablePayload>(
      request,
      validateStartOrganizerConversationCallablePayload,
      normalizeOrganizerHostPayload
    );
  return startOrganizerConversationCore(
    callerUid,
    data,
    deps,
    "startOrganizerConversation"
  );
}

/** Starts or reuses a manager-to-customer conversation for a linked contact. */
export async function startOrganizerContactConversationHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerConversationDeps = defaultDeps
): Promise<{matchId: string}> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    StartOrganizerContactConversationCallablePayload
  >(
    request,
    validateStartOrganizerContactConversationCallablePayload,
    normalizeOrganizerContactConversationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, actorUid, "startOrganizerConversation",
    startConversationRateLimit);
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const contactSnap = await db.collection("organizerContacts")
    .doc(data.contactId).get();
  const contact = contactSnap.data() as OrganizerContactDocument | undefined;
  if (!contact || contact.organizerId !== data.organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.mergedIntoContactId !== null ||
      contact.identityState !== "verified" || contact.linkedUid === null ||
      contact.ambiguousCandidateContactIds.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      "This customer does not have an available linked Catch account."
    );
  }
  return startOrganizerConversationCore(
    actorUid,
    {organizerId: data.organizerId, hostUid: contact.linkedUid},
    deps,
    "startOrganizerConversation",
    {managerUid: actorUid, rateLimitAlreadyChecked: true}
  );
}

async function startOrganizerConversationCore(
  callerUid: string,
  data: StartOrganizerConversationCallablePayload,
  deps: OrganizerConversationDeps,
  rateLimitAction: "startOrganizerConversation",
  options: {
    managerUid?: string;
    rateLimitAlreadyChecked?: boolean;
  } = {}
): Promise<{matchId: string}> {
  if (callerUid === data.hostUid) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot message yourself."
    );
  }

  const db = deps.firestore();
  if (!options.rateLimitAlreadyChecked) {
    await deps.checkRateLimit?.(db, callerUid, rateLimitAction,
      startConversationRateLimit);
  }
  const [user1Id, user2Id] = [callerUid, data.hostUid].sort();
  const scopedMatchId = organizerInquiryMatchId({
    organizerId: data.organizerId,
    eventId: data.eventId,
    user1Id,
    user2Id,
  });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const matchRef = db.collection("matches").doc(scopedMatchId);
  const eventRef = data.eventId ?
    db.collection("events").doc(data.eventId) : null;
  const callerDeletedRef = db.collection("deletedUsers").doc(callerUid);
  const hostDeletedRef = db.collection("deletedUsers").doc(data.hostUid);

  await db.runTransaction(async (tx) => {
    const [
      organizerSnap,
      matchSnap,
      callerDeletedSnap,
      hostDeletedSnap,
      eventSnap,
    ] =
      await Promise.all([
        tx.get(organizerRef),
        tx.get(matchRef),
        tx.get(callerDeletedRef),
        tx.get(hostDeletedRef),
        eventRef ? tx.get(eventRef) : Promise.resolve(null),
      ]);

    if (callerDeletedSnap.exists || hostDeletedSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This conversation is unavailable."
      );
    }
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    const hostUserIds = organizerManagerUserIds(requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    ));
    if (!hostUserIds.includes(options.managerUid ?? data.hostUid)) {
      throw new HttpsError(
        "permission-denied",
        "That user is not a manager for this organizer."
      );
    }
    if (eventRef) {
      if (!eventSnap?.exists) {
        throw new HttpsError("not-found", "Event not found.");
      }
      const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
      if (event.organizerId !== data.organizerId) {
        throw new HttpsError(
          "failed-precondition",
          "That event does not belong to this organizer."
        );
      }
    }
    await assertNoBlockingRelationshipInTransaction(
      tx,
      db,
      callerUid,
      [data.hostUid]
    );

    if (matchSnap.exists) {
      const match = requireDoc<MatchDocument>(
        matchSnap,
        "MatchDocument"
      );
      if (match.conversationType !== "organizerHostInquiry" ||
          match.organizerId !== data.organizerId) {
        throw new HttpsError(
          "failed-precondition",
          "This conversation id is unavailable."
        );
      }
      if (match.status === "blocked") {
        throw new HttpsError(
          "failed-precondition",
          "This conversation is closed."
        );
      }
      return;
    }

    const now = deps.serverTimestamp() as unknown as
      FirebaseFirestore.Timestamp;
    const matchDoc: MatchDocument = {
      user1Id,
      user2Id,
      participantIds: [user1Id, user2Id],
      eventIds: data.eventId ? [data.eventId] : [],
      createdAt: now,
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      unreadCounts: {[user1Id]: 0, [user2Id]: 0},
      status: "active",
      blockedBy: null,
      blockedAt: null,
      conversationType: "organizerHostInquiry",
      organizerId: data.organizerId,
    };
    tx.create(matchRef, matchDoc);
  });

  return {matchId: scopedMatchId};
}

/**
 * Returns a stable opaque id for one organizer/event/participant inquiry scope.
 * @param {object} scope Canonical host-inquiry identity.
 * @return {string} Firestore-safe deterministic match id.
 */
export function organizerInquiryMatchId(scope: {
  organizerId: string;
  eventId?: string;
  user1Id: string;
  user2Id: string;
}): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([
      scope.organizerId,
      scope.eventId ?? null,
      scope.user1Id,
      scope.user2Id,
    ]))
    .digest("hex")
    .slice(0, 40);
  return `organizerInquiry_${digest}`;
}

export const startOrganizerConversation = onCall(
  appCheckCallableOptions,
  (request) => startOrganizerConversationHandler(request)
);

export const startOrganizerContactConversation = onCall(
  appCheckCallableOptions,
  (request) => startOrganizerContactConversationHandler(request)
);

function normalizeOrganizerContactConversationPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "contactId"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  return normalized;
}
