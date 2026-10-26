import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  EventDocument,
  EventCrossPathsConsentDocument,
  EventParticipationDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {SetCrossPathsEventConsentCallablePayload} from
  "../shared/generated/setCrossPathsEventConsentCallablePayload";
import type {SetCrossPathsEventConsentCallableResponse} from
  "../shared/generated/setCrossPathsEventConsentCallableResponse";
import {
  validateSetCrossPathsEventConsentCallablePayload,
} from
  "../shared/generated/validators/setCrossPathsEventConsentInput";
import {
  validateSetCrossPathsEventConsentCallableResponse,
} from
  "../shared/generated/validators/setCrossPathsEventConsentOutput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {normalizeEventIdPayload} from
  "../events/eventPayloadNormalization";
import {crossPathsPilotEventEnabled} from "./pilotPolicy";

export const currentCrossPathsTermsVersion = 1;

interface SetCrossPathsEventConsentDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: SetCrossPathsEventConsentDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
};

export function crossPathsConsentId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Stores or revokes a caller's private event-level Cross Paths consent.
 * Enabling is permitted only for a confirmed attendee whose private global
 * preference is explicitly true. Disabling remains available at any time.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SetCrossPathsEventConsentDeps} deps Injectable test dependencies.
 * @return {Promise<SetCrossPathsEventConsentCallableResponse>} Consent state.
 */
export async function setCrossPathsEventConsentHandler(
  request: CallableRequest<unknown>,
  deps: SetCrossPathsEventConsentDeps = defaultDeps
): Promise<SetCrossPathsEventConsentCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    SetCrossPathsEventConsentCallablePayload
  >(
    request,
    validateSetCrossPathsEventConsentCallablePayload,
    normalizeEventIdPayload
  );
  if (data.termsVersion !== currentCrossPathsTermsVersion) {
    throw new HttpsError(
      "failed-precondition",
      "Review the latest Cross Paths consent terms before continuing."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "setCrossPathsEventConsent", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const response: SetCrossPathsEventConsentCallableResponse = {
    eventId: data.eventId,
    enabled: data.enabled,
    termsVersion: currentCrossPathsTermsVersion,
  };

  await db.runTransaction(async (tx) => {
    const userRef = db.collection("users").doc(uid);
    const eventRef = db.collection("events").doc(data.eventId);
    const participationRef = db.collection("eventParticipations")
      .doc(crossPathsConsentId(data.eventId, uid));
    const consentRef = db.collection("eventCrossPathsConsents")
      .doc(crossPathsConsentId(data.eventId, uid));
    const [userSnap, eventSnap, participationSnap, consentSnap] =
      await Promise.all([
        tx.get(userRef),
        tx.get(eventRef),
        tx.get(participationRef),
        tx.get(consentRef),
      ]);
    const invitationsSnap = data.enabled ? null : await tx.get(
      db.collection("crossPathsInvitations")
        .where("participantIds", "array-contains", uid)
        .limit(50)
    );
    const now = deps.now();

    if (data.enabled) {
      if (!userSnap.exists) {
        throw new HttpsError("not-found", "User profile not found.");
      }
      const user = requireDoc<UserProfileDocument>(
        userSnap,
        "UserProfileDocument"
      );
      if (user.prefsShowInCrossPaths !== true) {
        throw new HttpsError(
          "failed-precondition",
          "Turn on Cross Paths in Privacy & Safety before enabling an event."
        );
      }
      if (!eventSnap.exists) {
        throw new HttpsError("not-found", "Event not found.");
      }
      const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
      if (
        !crossPathsPilotEventEnabled(event) ||
        event.status !== "active" ||
        event.startTime.toMillis() <= now.toMillis()
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Cross Paths is not enabled for this upcoming event."
        );
      }
      if (!participationSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "A confirmed event booking is required."
        );
      }
      const participation = requireDoc<EventParticipationDocument>(
        participationSnap,
        "EventParticipationDocument"
      );
      if (
        participation.uid !== uid ||
        participation.eventId !== data.eventId ||
        participation.status !== "signedUp"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "A confirmed event booking is required."
        );
      }
    }

    const previous = consentSnap.exists ?
      requireDoc<EventCrossPathsConsentDocument>(
        consentSnap,
        "EventCrossPathsConsentDocument"
      ) :
      undefined;
    const consentedAt = data.enabled ? previous?.consentedAt ?? now :
      previous?.consentedAt ?? null;
    const document: EventCrossPathsConsentDocument = {
      eventId: data.eventId,
      uid,
      enabled: data.enabled,
      termsVersion: currentCrossPathsTermsVersion,
      consentedAt,
      updatedAt: now,
      revokedAt: data.enabled ? null : now,
      source: data.source,
    };
    tx.set(consentRef, document);
    if (!data.enabled) {
      for (const invitationSnap of invitationsSnap?.docs ?? []) {
        const invitation = invitationSnap.data();
        if (
          invitation.eventId !== data.eventId ||
          invitation.status !== "pending"
        ) {
          continue;
        }
        tx.update(invitationSnap.ref, {
          status: "invalidated",
          updatedAt: now,
          invalidatedAt: now,
          invalidationReason: "consent_revoked",
        });
      }
    }
  });

  if (!validateSetCrossPathsEventConsentCallableResponse(response)) {
    throw new HttpsError(
      "internal",
      "setCrossPathsEventConsent produced an invalid response."
    );
  }
  return response;
}

export const setCrossPathsEventConsent = onCall(
  appCheckCallableOptions,
  (request) => setCrossPathsEventConsentHandler(request)
);
