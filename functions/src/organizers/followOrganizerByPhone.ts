import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerCommunicationPermissionReceiptDocument,
  OrganizerCommunicationPreferenceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {FollowOrganizerByPhoneCallablePayload} from
  "../shared/generated/followOrganizerByPhoneCallablePayload";
import type {FollowOrganizerByPhoneCallableResponse} from
  "../shared/generated/followOrganizerByPhoneCallableResponse";
import {validateFollowOrganizerByPhoneCallablePayload} from
  "../shared/generated/validators/followOrganizerByPhoneInput";
import {validateFollowOrganizerByPhoneCallableResponse} from
  "../shared/generated/validators/followOrganizerByPhoneOutput";
import {
  organizerCommunicationPreferenceId,
  unknownOrganizerCommunicationChannel,
} from "../shared/organizerCommunicationPreferences";
import {
  activeOrganizerFollowPatch,
  organizerRelationshipId,
} from "../shared/relationshipDocuments";
import {
  followByPhonePermissionReceipt,
  followerWhatsappGrant,
  followerWhatsappTermsVersion,
} from "./organizerFollowerWhatsapp";

type Preference = OrganizerCommunicationPreferenceDocument;
type Receipt = OrganizerCommunicationPermissionReceiptDocument;

export interface FollowOrganizerByPhoneDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: FollowOrganizerByPhoneDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
};

const e164 = /^\+[1-9][0-9]{6,14}$/u;

/**
 * Follow with just a phone number (CAT-253). The caller signed in with the
 * website's phone code, so the auth token carries a verified phone; no name
 * or profile is needed. The follow edge is written exactly as followOrganizer
 * writes it. Only an explicit WhatsApp tick (whatsappUpdates with the
 * reviewed terms) also grants the followerUpdates WhatsApp purpose, bound to
 * that verified phone, with an immutable receipt keyed by the request.
 */
export async function followOrganizerByPhoneHandler(
  request: CallableRequest<unknown>,
  deps: FollowOrganizerByPhoneDeps = defaultDeps,
): Promise<FollowOrganizerByPhoneCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<FollowOrganizerByPhoneCallablePayload>(
    request, validateFollowOrganizerByPhoneCallablePayload, normalize);
  if (data.expectedUid !== undefined && data.expectedUid !== uid) {
    throw new HttpsError("aborted", "Your signed-in account changed.");
  }
  const phone = request.auth?.token?.phone_number;
  if (typeof phone !== "string" || !e164.test(phone)) {
    throw new HttpsError("failed-precondition",
      "Confirm your phone number with a code first.");
  }
  if (data.whatsappUpdates &&
      data.termsVersion !== followerWhatsappTermsVersion) {
    throw new HttpsError("invalid-argument",
      "Review the WhatsApp permission again.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "followOrganizerByPhone", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const followRef = db.collection("organizerFollows")
    .doc(organizerRelationshipId(data.organizerId, uid));
  const preferenceRef = db.collection("organizerCommunicationPreferences")
    .doc(organizerCommunicationPreferenceId(data.organizerId, uid));
  const response = await db.runTransaction(async (tx) => {
    const [organizerSnap, deletedSnap, followSnap, preferenceSnap] =
      await Promise.all([
        tx.get(organizerRef),
        tx.get(db.collection("deletedUsers").doc(uid)),
        tx.get(followRef),
        tx.get(preferenceRef),
      ]);
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    if (deletedSnap.exists) {
      throw new HttpsError("failed-precondition",
        "This account cannot follow organizers.");
    }
    const previous = preferenceSnap.data() as Preference | undefined;
    if (previous && (previous.uid !== uid ||
        previous.organizerId !== data.organizerId)) {
      throw new HttpsError("failed-precondition",
        "Messaging permission ownership is inconsistent.");
    }
    const receipt = data.whatsappUpdates ? followByPhonePermissionReceipt({
      organizerId: data.organizerId, uid, endpointE164: phone,
      requestId: data.requestId,
      supersedesReceiptId:
        previous?.whatsappPurposes?.followerUpdates?.currentReceiptId ?? null,
      now,
    }) : null;
    const receiptRef = receipt ?
      db.collection("organizerCommunicationPermissionReceipts")
        .doc(receipt.id) : null;
    const replaySnap = receiptRef ? await tx.get(receiptRef) : null;

    // Follow edge: identical to followOrganizer, minus the profile gate.
    const follow = followSnap.data() as
      {status?: string; pushNotificationsEnabled?: boolean} | undefined;
    if (follow?.status !== "active") {
      const followerCount = organizerSnap.get("followerCount");
      tx.update(organizerRef, {followerCount:
        (typeof followerCount === "number" ? followerCount : 0) + 1});
    }
    tx.set(followRef, activeOrganizerFollowPatch({
      organizerId: data.organizerId, uid,
      pushNotificationsEnabled: follow?.pushNotificationsEnabled,
    }), {merge: true});

    if (!receipt || !receiptRef) {
      return {following: true as const,
        whatsappUpdates: "notRequested" as const,
        receiptId: null, idempotentReplay: false};
    }
    if (replaySnap?.exists) {
      const stored = replaySnap.data() as Receipt;
      if (stored.uid !== uid || stored.organizerId !== data.organizerId ||
          stored.purpose !== "followerUpdates" ||
          stored.endpointE164 !== phone || stored.decision !== "optedIn") {
        throw new HttpsError("already-exists",
          "This request was used with different follow settings.");
      }
      return {following: true as const, whatsappUpdates: "optedIn" as const,
        receiptId: receipt.id, idempotentReplay: true};
    }
    tx.create(receiptRef, receipt.document);
    const grant = followerWhatsappGrant({receiptId: receipt.id,
      endpointE164: phone, now});
    const document: Preference = {
      organizerId: data.organizerId,
      uid,
      whatsapp: previous?.whatsapp ?? unknownOrganizerCommunicationChannel(),
      whatsappPurposes: {...(previous?.whatsappPurposes ?? {}),
        followerUpdates: grant},
      sms: previous?.sms ?? unknownOrganizerCommunicationChannel(),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    tx.set(preferenceRef, document);
    return {following: true as const, whatsappUpdates: "optedIn" as const,
      receiptId: receipt.id, idempotentReplay: false};
  });
  if (!validateFollowOrganizerByPhoneCallableResponse(response)) {
    throw new HttpsError("internal", "The follow needs review.");
  }
  return response;
}

function normalize(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const input = {...raw as Record<string, unknown>};
  for (const field of ["organizerId", "requestId", "expectedUid"]) {
    if (typeof input[field] === "string") {
      input[field] = (input[field] as string).trim();
    }
  }
  return input;
}

export const followOrganizerByPhone = onCall(
  appCheckCallableOptions,
  (request) => followOrganizerByPhoneHandler(request),
);
