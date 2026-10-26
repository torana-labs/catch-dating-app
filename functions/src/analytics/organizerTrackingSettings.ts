import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkIpRateLimit, checkRateLimit} from "../shared/rateLimit";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {assertPublicOrganizerPageEligible} from "../shared/publicOrganizerPage";
import {validateCallableWithAjv} from "../shared/validation";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerTrackingSettingsDocument} from
  "../shared/generated/organizerTrackingSettingsDocument";
import {validateGetOrganizerTrackingSettingsCallablePayload} from
  "../shared/generated/validators/getOrganizerTrackingSettingsInput";
import {validateSetOrganizerTrackingSettingsCallablePayload} from
  "../shared/generated/validators/setOrganizerTrackingSettingsInput";
import {validateReadPublicOrganizerTrackingSettingsCallablePayload} from
  "../shared/generated/validators/readPublicOrganizerTrackingSettingsInput";
import {validateOrganizerTrackingSettingsDocument} from
  "../shared/generated/validators/organizerTrackingSettingsDocument";

import {validateOrganizerTrackingSettingsCallableResponse} from
  "../shared/generated/validators/organizerTrackingSettingsOutput";
import {validatePublicOrganizerTrackingSettingsCallableResponse} from
  "../shared/generated/validators/publicOrganizerTrackingSettingsOutput";

export interface TrackingSettingsDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  checkIpRateLimit: typeof checkIpRateLimit;
  now: () => number;
}
const defaultDeps: TrackingSettingsDependencies = {
  firestore: () => admin.firestore(), checkRateLimit, checkIpRateLimit,
  now: () => Date.now(),
};

// No existing reviewed advertising policy permits live publication. This gate
// is code-owned: neither organizer IDs,
// saved fields nor claim approval lift it.
const publicationAllowed = false;

export function trackingConfigurationEligible(organizer: OrganizerDocument) {
  return !organizer.archived && organizer.status !== "archived" &&
    organizer.claim?.state !== "suppressed" &&
    !!organizer.ownerUserId &&
    (organizer.ownership?.state === "userCreated" ||
     organizer.claim?.state === "verified");
}

function projection(organizerId: string, stored: unknown, canEdit = true) {
  if (stored !== undefined && !validateOrganizerTrackingSettingsDocument(
    stored)) {
    throw new HttpsError("internal", "Tracking settings need review.");
  }
  const settings = stored as OrganizerTrackingSettingsDocument | undefined;
  if (settings && settings.organizerId !== organizerId) {
    throw new HttpsError("internal", "Tracking settings scope needs review.");
  }
  const result = {organizerId, revision: settings?.revision ?? 0,
    metaPixelId: settings?.metaPixelId ?? null,
    googleMeasurementId: settings?.googleMeasurementId ?? null,
    enabled: false as const, publicationAllowed,
    policyReason: "policyReviewRequired" as const, canEdit,
    editBlockedReason: canEdit ? "none" as const : "unclaimed" as const};
  if (!validateOrganizerTrackingSettingsCallableResponse(result)) {
    throw new HttpsError("internal", "Tracking settings need review.");
  }
  return result;
}

export async function getOrganizerTrackingSettingsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv(request,
    validateGetOrganizerTrackingSettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerTrackingSettings", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (transaction) => {
    await requireOrganizerManager({db, organizerId, actorUid, transaction});
    const stored = await transaction.get(db.collection(
      "organizerTrackingSettings")
      .doc(organizerId));
    const organizer = await transaction.get(db.collection("organizers").doc(
      organizerId));
    return projection(organizerId, stored.exists ? stored.data() : undefined,
      trackingConfigurationEligible(organizer.data() as OrganizerDocument));
  });
}

export async function setOrganizerTrackingSettingsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateSetOrganizerTrackingSettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setOrganizerTrackingSettings", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (transaction) => {
    await requireOrganizerManager({db, organizerId: command.organizerId,
      actorUid, transaction});
    const organizerSnapshot = await transaction.get(db.collection("organizers")
      .doc(command.organizerId));
    const organizer = organizerSnapshot.data() as OrganizerDocument;
    if (!trackingConfigurationEligible(organizer)) {
      throw new HttpsError("failed-precondition",
        "Tracking settings require a first-party " +
        "or verified claimed organizer.");
    }
    const ref = db.collection("organizerTrackingSettings").doc(
      command.organizerId);
    const snapshot = await transaction.get(ref);
    const current = projection(command.organizerId,
      snapshot.exists ? snapshot.data() : undefined);
    if (command.expectedRevision !== current.revision) {
      throw new HttpsError("aborted",
        "Tracking settings changed. Refresh before saving.");
    }
    if (command.enabled && !publicationAllowed) {
      throw new HttpsError("failed-precondition",
        "Advertising publication requires Catch policy " +
        "and live integration review.");
    }
    if (current.revision === Number.MAX_SAFE_INTEGER) {
      throw new HttpsError("failed-precondition",
        "Tracking revision needs review.");
    }
    const next: OrganizerTrackingSettingsDocument = {
      organizerId: command.organizerId, revision: current.revision + 1,
      metaPixelId: command.metaPixelId,
      googleMeasurementId: command.googleMeasurementId, enabled: false,
      updatedByUid: actorUid, updatedAtMillis: deps.now(),
    };
    if (!validateOrganizerTrackingSettingsDocument(next)) {
      throw new HttpsError("internal", "Tracking settings need review.");
    }
    transaction.set(ref, next);
    return projection(command.organizerId, next);
  });
}

/** Classification is canonical eventFormat, never free-text names/answers. */
export function trackingEventPolicyReason(event: Record<string, unknown>) {
  const format = event.eventFormat as Record<string, unknown> | undefined;
  if (!format || format.version !== 1 ||
      typeof format.activityKind !== "string" ||
      typeof format.interactionModel !== "string") {
    return "eventClassificationUnavailable" as const;
  }
  if (["socialRun", "singlesMixer", "barCrawl", "dinner"]
    .includes(format.activityKind) ||
    ["pairedRotations", "seatedTable", "freeFormMixer"]
      .includes(format.interactionModel)) {
    return "sensitiveEvent" as const;
  }
  return "policyReviewRequired" as const;
}

export async function readPublicOrganizerTrackingSettingsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const {organizerId, eventId} = validateCallableWithAjv(request,
    validateReadPublicOrganizerTrackingSettingsCallablePayload);
  const ip = request.rawRequest.ip ||
    request.rawRequest.socket.remoteAddress || "unknown";
  if (!deps.checkIpRateLimit(ip, 60, 60 * 1000)) {
    throw new HttpsError("resource-exhausted",
      "Too many tracking settings reads.");
  }
  const db = deps.firestore();
  const snapshot = await db.collection("organizers").doc(organizerId).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found",
      "Organizer not found.");
  }
  const organizer = snapshot.data() as OrganizerDocument;
  assertPublicOrganizerPageEligible(organizer);
  if (!trackingConfigurationEligible(organizer)) {
    throw new HttpsError("failed-precondition",
      "Organizer tracking is unavailable.");
  }
  let policyReason: "policyReviewRequired" | "sensitiveEvent" |
    "eventClassificationUnavailable" = "policyReviewRequired";
  if (eventId) {
    const nativeEvent = await db.collection("events").doc(eventId).get();
    const event = nativeEvent.exists ? nativeEvent :
      await db.collection("externalEvents").doc(eventId).get();
    if (!event.exists) throw new HttpsError("not-found", "Event not found.");
    const value = event.data()!;
    const ownerId = nativeEvent.exists ?
      value.organizerId ?? value.clubId : value.canonicalHostId;
    if (ownerId !== organizerId ||
        (nativeEvent.exists && value.organizerId && value.clubId &&
         value.organizerId !== value.clubId)) {
      throw new HttpsError("permission-denied",
        "Event organizer does not match.");
    }
    const published = nativeEvent.exists ?
      value.publicationState === "published" :
      value.publicationStatus === "public";
    if (!published || value.status !== "active") {
      throw new HttpsError("failed-precondition", "Event is not public.");
    }
    // External listings have no reviewed canonical tracking classification.
    policyReason = nativeEvent.exists ? trackingEventPolicyReason(value) :
      "eventClassificationUnavailable";
  }
  // Never read private settings here while publication is blocked. Public
  // projection cannot expose IDs, staff audit, private URLs or form values.
  const result = {organizerId, eventId, enabled: false as const,
    metaPixelId: null, googleMeasurementId: null, policyReason};
  if (!validatePublicOrganizerTrackingSettingsCallableResponse(result)) {
    throw new HttpsError("internal", "Public tracking settings need review.");
  }
  return result;
}
export const getOrganizerTrackingSettings = onCall(appCheckCallableOptions,
  (request) => getOrganizerTrackingSettingsHandler(request));
export const setOrganizerTrackingSettings = onCall(appCheckCallableOptions,
  (request) => setOrganizerTrackingSettingsHandler(request));
export const readPublicOrganizerTrackingSettings = onCall(
  appCheckCallableOptions, (request) =>
    readPublicOrganizerTrackingSettingsHandler(request));
