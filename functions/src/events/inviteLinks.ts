import {publicRegistrationMode} from "./publicRegistration/policy";
import {eventTitleLabel} from "../shared/eventLabels";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import type {
  EventDocument,
  EventAttendeeDocument,
  EventParticipationDocument,
  EventInviteLinkDocument,
  EventInviteLinkSecretDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {
  CreateEventInviteLinkCallablePayload,
} from "../shared/generated/createEventInviteLinkCallablePayload";
import type {
  DisableEventInviteLinkCallablePayload,
} from "../shared/generated/disableEventInviteLinkCallablePayload";
import type {
  RecordEventInviteLinkOpenCallablePayload,
} from "../shared/generated/recordEventInviteLinkOpenCallablePayload";
import type {GetEventInviteLinkTokenCallablePayload} from
  "../shared/generated/getEventInviteLinkTokenCallablePayload";
import type {RecordEventShareIntentCallablePayload} from
  "../shared/generated/recordEventShareIntentCallablePayload";
import type {ResolveEventInviteLandingCallablePayload} from
  "../shared/generated/resolveEventInviteLandingCallablePayload";
import type {ResolveEventInviteLandingCallableResponse} from
  "../shared/generated/resolveEventInviteLandingCallableResponse";
import {
  validateCreateEventInviteLinkCallablePayload,
} from "../shared/generated/validators/createEventInviteLinkInput";
import {
  validateDisableEventInviteLinkCallablePayload,
} from "../shared/generated/validators/disableEventInviteLinkInput";
import {
  validateGetEventInviteLinkTokenCallablePayload,
} from "../shared/generated/validators/getEventInviteLinkTokenInput";
import {
  validateRecordEventInviteLinkOpenCallablePayload,
} from
  "../shared/generated/validators/recordEventInviteLinkOpenInput";
import {
  validateRecordEventShareIntentCallablePayload,
} from "../shared/generated/validators/recordEventShareIntentInput";
import {
  validateResolveEventInviteLandingCallablePayload,
} from
  "../shared/generated/validators/resolveEventInviteLandingInput";
import {requireAuth} from "../shared/auth";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {eventAttendeeId, normalizeRosterPhone} from "./eventAttendees";
import {BRAND} from "../shared/generated/brand";

export type InviteLinkCounterField =
  | "openCount"
  | "requestCount"
  | "confirmedCount"
  | "paidCount"
  | "checkedInCount";

export interface InviteAttribution {
  inviteLinkId: string;
  inviteSource: string | null;
  linkKind?: NonNullable<EventInviteLinkDocument["linkKind"]>;
  ownerContactId?: string | null;
  intendedRecipientContactId?: string | null;
}

interface EventInviteLinkDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  increment: (value: number) => FirebaseFirestore.FieldValue;
}

const defaultDeps: EventInviteLinkDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  increment: (value) => admin.firestore.FieldValue.increment(value),
};

const inviteTouchRetentionMillis = 30 * 24 * 60 * 60 * 1000;
const shareIntentRetentionMillis = 90 * 24 * 60 * 60 * 1000;

export async function createEventInviteLinkHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{
  inviteLinkId: string;
  inviteToken: string;
  eventId: string;
  label: string;
  source: string | null;
}> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateEventInviteLinkCallablePayload
  >(
    request,
    validateCreateEventInviteLinkCallablePayload,
    normalizeInviteLinkPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "createEventInviteLink", {
    maxRequests: 20, windowMs: 60 * 1000,
  });

  const inviteRef = db.collection("eventInviteLinks").doc();
  const secretRef = db.collection("eventInviteLinkSecrets").doc(inviteRef.id);
  const eventRef = db.collection("events").doc(payload.eventId);
  const label = payload.label.trim();
  const source = stringOrNull(payload.source);
  const inviteToken = eventInviteToken(inviteRef.id);
  const linkKind = payload.linkKind ?? "hostChannel";
  const destinationKind = payload.destinationKind ?? "catchEvent";

  await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, hostUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager can create invite links."
      );
    }
    const organizerId = event.organizerId;
    const intendedRecipientContactId = stringOrNull(
      payload.intendedRecipientContactId
    );
    if (linkKind === "directRecipient") {
      if (!intendedRecipientContactId) {
        throw new HttpsError(
          "invalid-argument",
          "A direct-recipient link requires an audience contact."
        );
      }
      const contactSnap = await tx.get(db.collection("organizerContacts")
        .doc(intendedRecipientContactId));
      const contact = contactSnap.data() as {
        organizerId?: string;
        deletedAt?: unknown;
        identityState?: string;
      } | undefined;
      if (!contact || contact.organizerId !== organizerId ||
          contact.deletedAt != null || contact.identityState === "merged") {
        throw new HttpsError("not-found", "Audience contact not found.");
      }
    } else if (intendedRecipientContactId) {
      throw new HttpsError(
        "invalid-argument",
        "Only direct-recipient links may name a recipient."
      );
    }
    if (linkKind === "attendeeReferrer") {
      throw new HttpsError(
        "invalid-argument",
        "Attendees create referral links from the attendee surface."
      );
    }
    if (destinationKind === "externalBooking" &&
        !event.eventOrigin?.externalEventUrl) {
      throw new HttpsError(
        "failed-precondition",
        "This event has no verified external booking destination."
      );
    }
    if (destinationKind === "eventRuntime" &&
        (!event.runtimeAccess?.enabled ||
          !event.runtimeAccess.publicRuntimeId)) {
      throw new HttpsError(
        "failed-precondition",
        "Enable the event runtime before creating a runtime link."
      );
    }

    const now = deps.serverTimestamp();
    tx.create(inviteRef, {
      eventId: payload.eventId,
      organizerId,
      hostUid,
      label,
      source,
      tokenHash: inviteLinkTokenHash(inviteToken),
      contractVersion: 2,
      linkKind,
      ownerContactId: null,
      ownerUid: null,
      intendedRecipientContactId,
      campaignId: stringOrNull(payload.campaignId),
      issuanceChannel: "hostApp",
      destinationKind,
      tokenVersion: 2,
      attributionWindowEndsAt: admin.firestore.Timestamp.fromMillis(
        deps.timestamp().toMillis() + (payload.attributionWindowDays ?? 30) *
          24 * 60 * 60 * 1000
      ),
      openCount: 0,
      likelyHumanOpenCount: 0,
      shareIntentCount: 0,
      verifiedRegistrationCount: 0,
      referredRegistrationCount: 0,
      referredCheckedInCount: 0,
      requestCount: 0,
      confirmedCount: 0,
      paidCount: 0,
      checkedInCount: 0,
      catcherCount: 0,
      matchCount: 0,
      chatStartedCount: 0,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    });
    tx.create(secretRef, {
      eventId: payload.eventId,
      organizerId,
      token: inviteToken,
      tokenHash: inviteLinkTokenHash(inviteToken),
      tokenVersion: 2,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    inviteLinkId: inviteRef.id,
    inviteToken,
    eventId: payload.eventId,
    label,
    source,
  };
}

/** Creates an attendee-owned referral link after event-scoped eligibility. */
export async function createAttendeeInviteLinkHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{
  inviteLinkId: string;
  inviteToken: string;
  eventId: string;
  label: string;
  source: string | null;
}> {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateEventInviteLinkCallablePayload
  >(
    request,
    validateCreateEventInviteLinkCallablePayload,
    normalizeInviteLinkPayload
  );
  if ((payload.linkKind ?? "attendeeReferrer") !== "attendeeReferrer" ||
      stringOrNull(payload.intendedRecipientContactId) ||
      stringOrNull(payload.campaignId)) {
    throw new HttpsError(
      "invalid-argument",
      "Attendee referral links cannot name a recipient or campaign."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createAttendeeInviteLink", {
    maxRequests: 5, windowMs: 60 * 60 * 1000,
  });
  const inviteRef = db.collection("eventInviteLinks")
    .doc(attendeeInviteLinkId(payload.eventId, actorUid));
  const secretRef = db.collection("eventInviteLinkSecrets").doc(inviteRef.id);
  const eventRef = db.collection("events").doc(payload.eventId);
  const runtimeRef = db.collection("eventRuntimeParticipants")
    .doc(`${payload.eventId}_${actorUid}`);
  const participationRef = db.collection("eventParticipations")
    .doc(eventParticipationId(payload.eventId, actorUid));
  const authPhone = normalizeRosterPhone(
    typeof request.auth?.token.phone_number === "string" ?
      request.auth.token.phone_number : null
  ).value;
  const inviteToken = eventInviteToken(inviteRef.id);
  let returnedToken = inviteToken;
  await db.runTransaction(async (tx) => {
    const [eventSnap, runtimeSnap, participationSnap] =
      await Promise.all([
        tx.get(eventRef),
        tx.get(runtimeRef),
        tx.get(participationRef),
      ]);
    if (!eventSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "Verify your event access before creating a referral link."
      );
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const runtime = runtimeSnap.data() as {
      eventId?: string;
      uid?: string;
      eventAttendeeId?: string | null;
      accessStatus?: string;
    } | undefined;
    const participation = participationSnap.data() as
      EventParticipationDocument | undefined;
    const validRuntime = runtime?.eventId === payload.eventId &&
      runtime.uid === actorUid && Boolean(runtime.eventAttendeeId) &&
      ["needsInput", "ready"].includes(runtime.accessStatus ?? "");
    const validParticipation = participation?.eventId === payload.eventId &&
      participation.uid === actorUid &&
      ["signedUp", "waitlisted", "attended"].includes(
        participation.status ?? ""
      );
    if (!validRuntime && !validParticipation) {
      throw new HttpsError(
        "permission-denied",
        "Verify your event access before creating a referral link."
      );
    }
    const attendeeId = validRuntime ? runtime!.eventAttendeeId! :
      eventAttendeeId(
        payload.eventId,
        authPhone ? `phone:${authPhone}` : `uid:${actorUid}`
      );
    const [attendeeSnap, edgeSnap] = await Promise.all([
      tx.get(db.collection("eventAttendees").doc(attendeeId)),
      tx.get(db.collection("organizerContactEventEdges").doc(attendeeId)),
    ]);
    const attendee = attendeeSnap.data() as EventAttendeeDocument | undefined;
    const edge = edgeSnap.data() as {
      organizerId?: string;
      contactId?: string;
    } | undefined;
    const organizerId = event.organizerId;
    if (!attendee || attendee.eventId !== payload.eventId ||
        attendee.linkedUid !== actorUid ||
        !edge || edge.organizerId !== organizerId || !edge.contactId) {
      throw new HttpsError(
        "failed-precondition",
        "Audience identity is still being prepared. Try again shortly."
      );
    }
    const [existingLinkSnap, existingSecretSnap] = await Promise.all([
      tx.get(inviteRef),
      tx.get(secretRef),
    ]);
    if (existingLinkSnap.exists || existingSecretSnap.exists) {
      if (!existingLinkSnap.exists || !existingSecretSnap.exists) {
        throw new HttpsError(
          "internal",
          "The attendee referral link is incomplete. Contact support."
        );
      }
      const existingLink = existingLinkSnap.data() as EventInviteLinkDocument;
      const existingSecret = existingSecretSnap.data() as
        EventInviteLinkSecretDocument;
      if (existingLink.eventId !== payload.eventId ||
          existingLink.ownerUid !== actorUid ||
          existingLink.ownerContactId !== edge.contactId ||
          existingLink.linkKind !== "attendeeReferrer" ||
          inviteLinkTokenHash(existingSecret.token) !==
            existingLink.tokenHash) {
        throw new HttpsError("internal", "Referral link integrity failed.");
      }
      returnedToken = existingSecret.token;
      return;
    }
    const destinationKind = payload.destinationKind ??
      defaultAttendeeInviteDestination(event);
    if (destinationKind === "externalBooking" &&
        !event.eventOrigin?.externalEventUrl) {
      throw new HttpsError(
        "failed-precondition",
        "This event has no verified external booking destination."
      );
    }
    if (destinationKind === "eventRuntime" &&
        (!event.runtimeAccess?.enabled ||
          !event.runtimeAccess.publicRuntimeId)) {
      throw new HttpsError(
        "failed-precondition",
        "This event does not have an active event runtime."
      );
    }
    const now = deps.serverTimestamp();
    tx.create(inviteRef, {
      eventId: payload.eventId,
      organizerId,
      hostUid: actorUid,
      label: payload.label.trim(),
      source: stringOrNull(payload.source),
      tokenHash: inviteLinkTokenHash(inviteToken),
      contractVersion: 2,
      linkKind: "attendeeReferrer",
      ownerContactId: edge.contactId,
      ownerUid: actorUid,
      intendedRecipientContactId: null,
      campaignId: null,
      issuanceChannel: payload.source === "runtime_web" ?
        "runtimeWeb" : "consumerApp",
      destinationKind,
      tokenVersion: 2,
      attributionWindowEndsAt: admin.firestore.Timestamp.fromMillis(
        deps.timestamp().toMillis() + (payload.attributionWindowDays ?? 30) *
          24 * 60 * 60 * 1000
      ),
      openCount: 0,
      likelyHumanOpenCount: 0,
      shareIntentCount: 0,
      verifiedRegistrationCount: 0,
      referredRegistrationCount: 0,
      referredCheckedInCount: 0,
      requestCount: 0,
      confirmedCount: 0,
      paidCount: 0,
      checkedInCount: 0,
      catcherCount: 0,
      matchCount: 0,
      chatStartedCount: 0,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    });
    tx.create(secretRef, {
      eventId: payload.eventId,
      organizerId,
      token: inviteToken,
      tokenHash: inviteLinkTokenHash(inviteToken),
      tokenVersion: 2,
      createdAt: now,
      updatedAt: now,
    });
  });
  return {
    inviteLinkId: inviteRef.id,
    inviteToken: returnedToken,
    eventId: payload.eventId,
    label: payload.label.trim(),
    source: stringOrNull(payload.source),
  };
}

/** Returns a share token to a current manager or its attendee owner. */
export async function getEventInviteLinkTokenHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{inviteLinkId: string; inviteToken: string}> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    GetEventInviteLinkTokenCallablePayload
  >(
    request,
    validateGetEventInviteLinkTokenCallablePayload,
    normalizeInviteLinkPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "getEventInviteLinkToken", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const linkRef = db.collection("eventInviteLinks").doc(payload.inviteLinkId);
  const secretRef = db.collection("eventInviteLinkSecrets")
    .doc(payload.inviteLinkId);
  return db.runTransaction(async (tx) => {
    const [linkSnap, eventSnap, secretSnap] = await Promise.all([
      tx.get(linkRef),
      tx.get(db.collection("events").doc(payload.eventId)),
      tx.get(secretRef),
    ]);
    if (!linkSnap.exists || !eventSnap.exists) {
      throw new HttpsError("not-found", "Invite link not found.");
    }
    const link = linkSnap.data() as EventInviteLinkDocument;
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (link.eventId !== payload.eventId) {
      throw new HttpsError("not-found", "Invite link not found.");
    }
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    const manager = isEventOrganizerManager(organizer, event, hostUid);
    const attendeeOwner = link.linkKind === "attendeeReferrer" &&
      link.ownerUid === hostUid;
    if (!manager && !attendeeOwner) {
      throw new HttpsError(
        "permission-denied",
        "Manager or attendee-link owner access required."
      );
    }
    if (!secretSnap.exists && link.contractVersion !== 2 &&
        link.tokenHash === inviteLinkTokenHash(payload.inviteLinkId)) {
      return {
        inviteLinkId: payload.inviteLinkId,
        inviteToken: payload.inviteLinkId,
      };
    }
    if (!secretSnap.exists) {
      throw new HttpsError("internal", "Invite token is unavailable.");
    }
    const secret = secretSnap.data() as EventInviteLinkSecretDocument;
    if (secret.eventId !== payload.eventId ||
        inviteLinkTokenHash(secret.token) !== link.tokenHash) {
      throw new HttpsError("internal", "Invite token integrity failed.");
    }
    return {inviteLinkId: payload.inviteLinkId, inviteToken: secret.token};
  });
}

export async function disableEventInviteLinkHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{disabled: boolean}> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    DisableEventInviteLinkCallablePayload
  >(
    request,
    validateDisableEventInviteLinkCallablePayload,
    normalizeInviteLinkPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "disableEventInviteLink", {
    maxRequests: 20, windowMs: 60 * 1000,
  });

  await db.runTransaction(async (tx) => {
    const linkRef = db.collection("eventInviteLinks")
      .doc(payload.inviteLinkId);
    const linkSnap = await tx.get(linkRef);
    if (!linkSnap.exists) {
      throw new HttpsError("not-found", "Invite link not found.");
    }
    const link = linkSnap.data() as Partial<EventInviteLinkDocument>;
    if (link.eventId !== payload.eventId) {
      throw new HttpsError(
        "failed-precondition",
        "Invite link does not belong to this event."
      );
    }
    const eventSnap = await tx.get(db.collection("events").doc(
      payload.eventId
    ));
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    const manager = isEventOrganizerManager(organizer, event, hostUid);
    const attendeeOwner = link.linkKind === "attendeeReferrer" &&
      link.ownerUid === hostUid;
    if (!manager && !attendeeOwner) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager or attendee-link owner can disable it."
      );
    }
    if (link.disabledAt != null) return;
    tx.set(linkRef, {
      disabledAt: deps.serverTimestamp(),
      updatedAt: deps.serverTimestamp(),
    }, {merge: true});
  });

  return {disabled: true};
}

export async function recordEventInviteLinkOpenHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{
  accepted: boolean;
  disabled: boolean;
  eventId: string;
  inviteLinkId: string;
  label: string | null;
  source: string | null;
}> {
  const payload = validateCallableWithAjv<
    RecordEventInviteLinkOpenCallablePayload
  >(
    request,
    validateRecordEventInviteLinkOpenCallablePayload,
    normalizeInviteLinkPayload
  );
  const db = deps.firestore();
  const resolved = await resolveEventInviteToken({
    db,
    eventId: payload.eventId,
    tokenOrLegacyId: payload.inviteLinkId,
  });
  if (!resolved) {
    return {
      accepted: false,
      disabled: false,
      eventId: payload.eventId,
      inviteLinkId: payload.inviteLinkId,
      label: null,
      source: null,
    };
  }
  const linkRef = db.collection("eventInviteLinks")
    .doc(resolved.inviteLinkId);
  let result = {
    accepted: false,
    disabled: false,
    eventId: payload.eventId,
    inviteLinkId: resolved.inviteLinkId,
    label: null as string | null,
    source: null as string | null,
  };

  await db.runTransaction(async (tx) => {
    const now = deps.timestamp();
    const touchRef = inviteTouchRef({
      db,
      inviteLinkId: resolved.inviteLinkId,
      actorUid: request.auth?.uid ?? null,
      sessionId: payload.sessionId ?? null,
      now,
    });
    const [linkSnap, existingTouch] = await Promise.all([
      tx.get(linkRef),
      tx.get(touchRef),
    ]);
    if (!linkSnap.exists) return;
    const link = linkSnap.data() as Partial<EventInviteLinkDocument>;
    if (link.eventId !== payload.eventId ||
        link.tokenHash !== inviteLinkTokenHash(resolved.validatedToken)) {
      return;
    }
    result = {
      accepted: link.disabledAt == null,
      disabled: link.disabledAt != null,
      eventId: payload.eventId,
      inviteLinkId: resolved.inviteLinkId,
      label: typeof link.label === "string" ? link.label : null,
      source: stringOrNull(link.source),
    };
    if (!result.accepted) return;
    if (existingTouch.exists) return;
    const likelyHuman = request.auth != null ||
      typeof payload.sessionId === "string";
    tx.set(linkRef, {
      openCount: deps.increment(1),
      likelyHumanOpenCount: deps.increment(likelyHuman ? 1 : 0),
      updatedAt: deps.serverTimestamp(),
    }, {merge: true});
    tx.create(touchRef, {
      eventId: payload.eventId,
      organizerId: stringOrNull(link.organizerId) ?? link.organizerId,
      inviteLinkId: resolved.inviteLinkId,
      touchKind: "open",
      surface: payload.surface ?? "unknown",
      actorUid: request.auth?.uid ?? null,
      sessionHash: payload.sessionId ? inviteLinkTokenHash(
        `${resolved.inviteLinkId}|${payload.sessionId}`
      ) : null,
      likelyHuman,
      botReason: likelyHuman ? null : "missingClientSignal",
      attributionEligible: likelyHuman,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + inviteTouchRetentionMillis
      ),
    });
  });

  return result;
}

/** Resolves a bearer link without requiring a generated public event page. */
export async function resolveEventInviteLandingHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<ResolveEventInviteLandingCallableResponse> {
  const payload = validateCallableWithAjv<
    ResolveEventInviteLandingCallablePayload
  >(
    request,
    validateResolveEventInviteLandingCallablePayload,
    normalizeInviteLandingPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ??
      `invite_${inviteLinkTokenHash(payload.inviteToken).slice(0, 40)}`,
    "resolveEventInviteLanding",
    {maxRequests: 120, windowMs: 60 * 1000}
  );
  const resolved = await resolveVersionedInviteToken({
    db,
    token: payload.inviteToken,
  });
  if (!resolved) {
    throw new HttpsError("not-found", "Invitation not found.");
  }
  const linkRef = db.collection("eventInviteLinks").doc(resolved.inviteLinkId);
  const eventRef = db.collection("events").doc(resolved.link.eventId!);
  const now = deps.timestamp();
  const touchRef = inviteTouchRef({
    db,
    inviteLinkId: resolved.inviteLinkId,
    actorUid: request.auth?.uid ?? null,
    sessionId: payload.sessionId ?? null,
    now,
  });
  return db.runTransaction(async (tx) => {
    const [freshEventSnap, freshLinkSnap, existingTouch] = await Promise.all([
      tx.get(eventRef), tx.get(linkRef), tx.get(touchRef),
    ]);
    const link = freshLinkSnap.data() as
      Partial<EventInviteLinkDocument> | undefined;
    const event = freshEventSnap.data() as EventDocument | undefined;
    const windowEnd = link?.attributionWindowEndsAt as
      FirebaseFirestore.Timestamp | null | undefined;
    if (!event || !link || link.eventId !== resolved.link.eventId ||
        event.status !== "active" || !isEventPubliclyAccessible(event) ||
        link.disabledAt != null ||
        link.tokenHash !== inviteLinkTokenHash(payload.inviteToken) ||
        (windowEnd && windowEnd.toMillis() < now.toMillis())) {
      throw new HttpsError("not-found", "Invitation is no longer available.");
    }
    const endTime = event.endTime;
    const locationName = event.meetingLocation?.name || event.meetingPoint;
    if (!endTime || !Number.isFinite(endTime.toMillis()) || !locationName) {
      throw new HttpsError("failed-precondition",
        "Invitation event details are incomplete.");
    }
    const destinationKind = link.destinationKind ?? "catchEvent";
    const destinationUrl = inviteDestinationUrl({
      event, eventId: resolved.link.eventId!, destinationKind,
      inviteToken: payload.inviteToken, inviteLinkId: resolved.inviteLinkId,
    });
    if (!existingTouch.exists) {
      const likelyHuman = request.auth != null ||
        typeof payload.sessionId === "string";
      tx.set(linkRef, {
        openCount: deps.increment(1),
        likelyHumanOpenCount: deps.increment(likelyHuman ? 1 : 0),
        updatedAt: deps.serverTimestamp(),
      }, {merge: true});
      tx.create(touchRef, {
        eventId: link.eventId,
        organizerId: stringOrNull(link.organizerId) ?? link.organizerId,
        inviteLinkId: resolved.inviteLinkId,
        touchKind: "open", surface: "marketingWeb",
        actorUid: request.auth?.uid ?? null,
        sessionHash: payload.sessionId ? inviteLinkTokenHash(
          `${resolved.inviteLinkId}|${payload.sessionId}`
        ) : null,
        likelyHuman, botReason: likelyHuman ? null : "missingClientSignal",
        attributionEligible: likelyHuman, createdAt: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(
          now.toMillis() + inviteTouchRetentionMillis),
      });
    }
    return {
      eventId: resolved.link.eventId!,
      title: eventTitleLabel(event),
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: endTime.toMillis(),
      locationName,
      destinationKind, destinationUrl,
      ...(destinationKind === "catchEvent" ? {
        paidBookingAvailable: Number.isSafeInteger(event.priceInPaise) &&
          (event.priceInPaise ?? 0) >= 100,
        registrationMode: event.startTime.toMillis() > now.toMillis() ?
          publicRegistrationMode(event) : "closed" as const,
      } : {}),
      sourceLabel: inviteSourceLabel(event, destinationKind),
    };
  });
}

/** Records only a Catch-owned share action, never a claimed send. */
export async function recordEventShareIntentHandler(
  request: CallableRequest<unknown>,
  deps: EventInviteLinkDeps = defaultDeps
): Promise<{recorded: boolean}> {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    RecordEventShareIntentCallablePayload
  >(
    request,
    validateRecordEventShareIntentCallablePayload,
    normalizeInviteLinkPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "recordEventShareIntent", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const linkRef = db.collection("eventInviteLinks").doc(payload.inviteLinkId);
  const now = deps.timestamp();
  await db.runTransaction(async (tx) => {
    const linkSnap = await tx.get(linkRef);
    if (!linkSnap.exists) {
      throw new HttpsError("not-found", "Invite link not found.");
    }
    const link = linkSnap.data() as EventInviteLinkDocument;
    if (link.eventId !== payload.eventId || link.disabledAt != null) {
      throw new HttpsError(
        "failed-precondition",
        "Invite link is unavailable."
      );
    }
    const hostAuthorized = link.hostUid === actorUid;
    const ownerAuthorized = link.ownerUid === actorUid;
    if (!hostAuthorized && !ownerAuthorized) {
      throw new HttpsError(
        "permission-denied",
        "Only this link's Host or attendee owner can record a share intent."
      );
    }
    tx.create(db.collection("eventShareIntents").doc(), {
      eventId: payload.eventId,
      organizerId: link.organizerId,
      inviteLinkId: payload.inviteLinkId,
      actorUid,
      actorKind: hostAuthorized && link.linkKind !== "attendeeReferrer" ?
        "host" : "attendee",
      surface: payload.surface,
      creativeId: stringOrNull(payload.creativeId),
      channelHint: payload.channelHint ?? null,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + shareIntentRetentionMillis
      ),
    });
    tx.update(linkRef, {
      shareIntentCount: deps.increment(1),
      updatedAt: deps.serverTimestamp(),
    });
  });
  return {recorded: true};
}

export async function resolveInviteAttribution(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  inviteLinkId?: string | null;
}): Promise<InviteAttribution | null> {
  const inviteLinkId = stringOrNull(params.inviteLinkId);
  if (!inviteLinkId) return null;
  const resolved = await resolveEventInviteToken({
    db: params.db,
    eventId: params.eventId,
    tokenOrLegacyId: inviteLinkId,
  });
  if (!resolved) return null;
  const snap = await params.db.collection("eventInviteLinks")
    .doc(resolved.inviteLinkId).get();
  return inviteAttributionFromSnapshot({
    eventId: params.eventId,
    inviteLinkId: resolved.inviteLinkId,
    validatedToken: resolved.validatedToken,
    data: snap.data(),
  });
}

export async function resolveInviteAttributionInTransaction(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  eventId: string;
  inviteLinkId?: string | null;
}): Promise<InviteAttribution | null> {
  const inviteLinkId = stringOrNull(params.inviteLinkId);
  if (!inviteLinkId) return null;
  if (isVersionedInviteToken(inviteLinkId)) return null;
  const snap = await params.tx.get(params.db.collection("eventInviteLinks")
    .doc(inviteLinkId));
  return inviteAttributionFromSnapshot({
    eventId: params.eventId,
    inviteLinkId,
    validatedToken: inviteLinkId,
    data: snap.data(),
  });
}

/** Resolves a bearer token before callers enter their own transaction. */
export async function resolveInviteAttributionToken(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  inviteToken?: string | null;
}): Promise<InviteAttribution | null> {
  return resolveInviteAttribution({
    db: params.db,
    eventId: params.eventId,
    inviteLinkId: params.inviteToken,
  });
}

export function inviteAttributionWriteFields(
  attribution: InviteAttribution | null | undefined
): Record<string, unknown> {
  if (!attribution) return {};
  return {
    inviteLinkId: attribution.inviteLinkId,
    inviteSource: attribution.inviteSource,
    inviteCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export function incrementInviteLinkCounterInTransaction(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  attribution: InviteAttribution | null | undefined;
  field: InviteLinkCounterField;
  delta?: number;
}) {
  if (!params.attribution) return;
  params.tx.set(params.db.collection("eventInviteLinks")
    .doc(params.attribution.inviteLinkId), {
    [params.field]: admin.firestore.FieldValue.increment(params.delta ?? 1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
}

export async function incrementInviteLinkCounterBestEffort(params: {
  db: FirebaseFirestore.Firestore;
  inviteLinkId?: string | null;
  field: InviteLinkCounterField;
  delta?: number;
}): Promise<void> {
  const inviteLinkId = stringOrNull(params.inviteLinkId);
  if (!inviteLinkId) return;
  try {
    await params.db.collection("eventInviteLinks").doc(inviteLinkId).set({
      [params.field]: admin.firestore.FieldValue.increment(params.delta ?? 1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  } catch (error) {
    logger.error("Failed to update invite link counter", {
      inviteLinkId,
      field: params.field,
      error,
      reasonMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export function inviteLinkTokenHash(inviteLinkId: string): string {
  return crypto.createHash("sha256").update(inviteLinkId).digest("hex");
}

export function eventInviteToken(inviteLinkId: string): string {
  const random = crypto.randomBytes(32).toString("base64url");
  return `v2_${inviteLinkId}_${random}`;
}

export function attendeeInviteLinkId(eventId: string, uid: string): string {
  return `eal_${inviteLinkTokenHash(`${eventId}|${uid}`).slice(0, 48)}`;
}

function inviteTouchRef(params: {
  db: FirebaseFirestore.Firestore;
  inviteLinkId: string;
  actorUid: string | null;
  sessionId: string | null;
  now: FirebaseFirestore.Timestamp;
}): FirebaseFirestore.DocumentReference {
  const tenMinuteBucket = Math.floor(params.now.toMillis() / (10 * 60 * 1000));
  const identity = params.actorUid ?? params.sessionId ??
    crypto.randomBytes(16).toString("base64url");
  const id = `eit_${inviteLinkTokenHash(
    `${params.inviteLinkId}|${identity}|${tenMinuteBucket}`
  ).slice(0, 48)}`;
  return params.db.collection("eventInviteTouches").doc(id);
}

export async function resolveEventInviteToken(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  tokenOrLegacyId: string;
}): Promise<{inviteLinkId: string; validatedToken: string} | null> {
  const token = params.tokenOrLegacyId.trim();
  if (!isVersionedInviteToken(token)) {
    const snap = await params.db.collection("eventInviteLinks")
      .doc(token).get();
    const link = snap.data() as Partial<EventInviteLinkDocument> | undefined;
    if (!link || link.eventId !== params.eventId ||
        link.contractVersion === 2 ||
        link.tokenHash !== inviteLinkTokenHash(token)) return null;
    return {inviteLinkId: token, validatedToken: token};
  }
  const inviteLinkId = inviteLinkIdFromToken(token);
  if (!inviteLinkId) return null;
  const snap = await params.db.collection("eventInviteLinks")
    .doc(inviteLinkId).get();
  const link = snap.data() as Partial<EventInviteLinkDocument> | undefined;
  if (!link || link.eventId !== params.eventId || link.contractVersion !== 2 ||
      link.tokenHash !== inviteLinkTokenHash(token)) return null;
  return {inviteLinkId, validatedToken: token};
}

async function resolveVersionedInviteToken(params: {
  db: FirebaseFirestore.Firestore;
  token: string;
}): Promise<{
  inviteLinkId: string;
  link: Partial<EventInviteLinkDocument>;
} | null> {
  const inviteLinkId = inviteLinkIdFromToken(params.token);
  if (!inviteLinkId) return null;
  const snap = await params.db.collection("eventInviteLinks")
    .doc(inviteLinkId).get();
  const link = snap.data() as Partial<EventInviteLinkDocument> | undefined;
  if (!link || link.contractVersion !== 2 || !link.eventId ||
      link.tokenHash !== inviteLinkTokenHash(params.token)) return null;
  return {inviteLinkId, link};
}

function inviteDestinationUrl(params: {
  event: EventDocument;
  eventId: string;
  destinationKind: NonNullable<EventInviteLinkDocument["destinationKind"]>;
  inviteToken: string;
  inviteLinkId: string;
}): string | null {
  if (params.destinationKind === "catchEvent") return null;
  if (params.destinationKind === "eventRuntime") {
    const runtimeId = params.event.runtimeAccess?.publicRuntimeId;
    if (params.event.runtimeAccess?.enabled !== true || !runtimeId) {
      throw new HttpsError(
        "failed-precondition", "Event mode is no longer available."
      );
    }
    return `${BRAND.web.origin}/join/${encodeURIComponent(runtimeId)}` +
      `?il=${encodeURIComponent(params.inviteToken)}`;
  }
  if (params.destinationKind === "externalBooking") {
    const url = params.event.eventOrigin?.externalEventUrl;
    if (params.event.eventOrigin?.mode !== "externalCompanion" || !url) {
      throw new HttpsError(
        "failed-precondition", "External registration is unavailable."
      );
    }
    const destination = new URL(url);
    destination.searchParams.set("utm_source", "catch");
    destination.searchParams.set("utm_medium", "organizer_invite");
    destination.searchParams.set("catch_ref", params.inviteLinkId);
    return destination.toString();
  }
  return `${BRAND.web.origin}/events/${encodeURIComponent(params.eventId)}` +
    `?il=${encodeURIComponent(params.inviteToken)}`;
}

function defaultAttendeeInviteDestination(
  event: EventDocument
): NonNullable<EventInviteLinkDocument["destinationKind"]> {
  return event.eventOrigin?.mode === "externalCompanion" &&
    Boolean(event.eventOrigin.externalEventUrl) ?
    "externalBooking" : "catchEvent";
}

function inviteSourceLabel(
  event: EventDocument,
  destinationKind: NonNullable<EventInviteLinkDocument["destinationKind"]>
): string {
  if (destinationKind !== "externalBooking") return "Catch";
  const labels: Record<string, string> = {
    luma: "Luma",
    eventbrite: "Eventbrite",
    partiful: "Partiful",
    posh: "POSH",
    bookmyshow: "BookMyShow",
    district: "District",
    sortmyscene: "SortMyScene",
    airbnb: "Airbnb",
    generic: "the booking provider",
  };
  return labels[event.eventOrigin?.provider ?? "generic"] ??
    "the booking provider";
}

function isVersionedInviteToken(value: string): boolean {
  return /^v2_[A-Za-z0-9_-]{1,180}_[A-Za-z0-9_-]{43}$/.test(value);
}

function inviteLinkIdFromToken(token: string): string | null {
  const match = /^v2_([A-Za-z0-9_-]{1,180})_[A-Za-z0-9_-]{43}$/.exec(token);
  return match?.[1] ?? null;
}

function inviteAttributionFromSnapshot(params: {
  eventId: string;
  inviteLinkId: string;
  validatedToken: string;
  data: FirebaseFirestore.DocumentData | undefined;
}): InviteAttribution | null {
  const link = params.data as Partial<EventInviteLinkDocument> | undefined;
  if (!link) return null;
  if (link.eventId !== params.eventId) return null;
  if (link.disabledAt != null) return null;
  if (link.tokenHash !== inviteLinkTokenHash(params.validatedToken)) {
    return null;
  }
  const windowEnd = link.attributionWindowEndsAt as
    FirebaseFirestore.Timestamp | null | undefined;
  if (windowEnd && windowEnd.toMillis() < Date.now()) return null;
  const source = stringOrNull(link.source) ?? stringOrNull(link.label);
  return {
    inviteLinkId: params.inviteLinkId,
    inviteSource: source,
    linkKind: link.linkKind ?? "hostChannel",
    ownerContactId: stringOrNull(link.ownerContactId),
    intendedRecipientContactId: stringOrNull(
      link.intendedRecipientContactId
    ),
  };
}

function normalizeInviteLinkPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const payload = {...data as Record<string, unknown>};
  for (const key of [
    "eventId",
    "inviteLinkId",
    "label",
    "source",
    "intendedRecipientContactId",
    "campaignId",
    "creativeId",
  ]) {
    if (typeof payload[key] === "string") {
      payload[key] = payload[key].trim();
    }
  }
  return payload;
}

function normalizeInviteLandingPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const payload = {...data as Record<string, unknown>};
  if (typeof payload.inviteToken === "string") {
    payload.inviteToken = payload.inviteToken.trim();
  }
  return payload;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const createEventInviteLink = onCall(appCheckCallableOptions, (
  request
) => createEventInviteLinkHandler(request));

export const createAttendeeInviteLink = onCall(appCheckCallableOptions, (
  request
) => createAttendeeInviteLinkHandler(request));

export const getEventInviteLinkToken = onCall(appCheckCallableOptions, (
  request
) => getEventInviteLinkTokenHandler(request));

export const disableEventInviteLink = onCall(appCheckCallableOptions, (
  request
) => disableEventInviteLinkHandler(request));

export const recordEventInviteLinkOpen = onCall(appCheckCallableOptions, (
  request
) => recordEventInviteLinkOpenHandler(request));

export const resolveEventInviteLanding = onCall(appCheckCallableOptions, (
  request
) => resolveEventInviteLandingHandler(request));

export const recordEventShareIntent = onCall(appCheckCallableOptions, (
  request
) => recordEventShareIntentHandler(request));
