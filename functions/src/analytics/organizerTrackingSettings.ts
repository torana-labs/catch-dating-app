import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {checkInstanceRateLimit} from "../shared/instanceRateLimit";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {validateCallableWithAjv} from "../shared/validation";
import {organizerTrackingPublicationPolicy,
  trackingConfigurationEligible} from "./organizerTrackingPublicationPolicy";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerTrackingSettingsDocument} from
  "../shared/generated/organizerTrackingSettingsDocument";
import {validateGetOrganizerTrackingSettingsCallablePayload} from
  "../shared/generated/validators/getOrganizerTrackingSettingsInput";
import {validateSetOrganizerTrackingSettingsCallablePayload} from
  "../shared/generated/validators/setOrganizerTrackingSettingsInput";
import {validateOrganizerTrackingSettingsDocument} from
  "../shared/generated/validators/organizerTrackingSettingsDocument";

import {validateOrganizerTrackingSettingsCallableResponse} from
  "../shared/generated/validators/organizerTrackingSettingsOutput";

export interface TrackingSettingsDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: TrackingSettingsDependencies = {
  firestore: () => admin.firestore(), checkRateLimit,
  now: () => Date.now(),
};

// The versioned, code-owned publication policy record. Neither organizer IDs,
// saved fields nor claim approval lift it.
const {publicationAllowed} = organizerTrackingPublicationPolicy;

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
    enabled: publicationAllowed, publicationAllowed,
    policyReason: organizerTrackingPublicationPolicy.blockedReason, canEdit,
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
  checkInstanceRateLimit(actorUid, "getOrganizerTrackingSettings", {
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
      googleMeasurementId: command.googleMeasurementId,
      enabled: publicationAllowed,
      updatedByUid: actorUid, updatedAtMillis: deps.now(),
    };
    if (!validateOrganizerTrackingSettingsDocument(next)) {
      throw new HttpsError("internal", "Tracking settings need review.");
    }
    transaction.set(ref, next);
    return projection(command.organizerId, next);
  });
}

export const setOrganizerTrackingSettings = onCall(appCheckCallableOptions,
  (request) => setOrganizerTrackingSettingsHandler(request));
