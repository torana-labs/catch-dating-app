import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {
  ManageOrganizerOwnerPageCallablePayload,
} from "../shared/generated/manageOrganizerOwnerPageCallablePayload";
import type {
  ManageOrganizerOwnerPageCallableResponse,
} from "../shared/generated/manageOrganizerOwnerPageCallableResponse";
import {
  validateManageOrganizerOwnerPageCallablePayload,
} from "../shared/generated/validators/manageOrganizerOwnerPageInput";
import {
  validateManageOrganizerOwnerPageCallableResponse,
} from "../shared/generated/validators/manageOrganizerOwnerPageOutput";
import {adminOwnerLinks, storedOwnerLinks} from "../organizers/organizerLinks";
import {createOrganizerPostHandler} from "../organizers/organizerPosts";
import {requireOwnerViewCapability} from "./ownerAccess";
import {
  followerMessageLimit,
  releaseFollowerMessage,
  reserveFollowerMessage,
} from "./followerMessages";

export interface OwnerPageDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  timestampFromDate: (date: Date) => unknown;
  checkRateLimit?: typeof defaultCheckRateLimit;
  sendFollowerUpdate: (
    request: CallableRequest<unknown>
  ) => Promise<unknown>;
}

const defaultDeps: OwnerPageDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
  checkRateLimit: defaultCheckRateLimit,
  sendFollowerUpdate: (request) => createOrganizerPostHandler(request),
};

/**
 * The website owner view's writes that no existing command covers (#1109).
 * setLinks lets the organiser's team edit the page's owner links (add,
 * reorder, pin, schedule) through the same owner-link policy the admin
 * editor uses; the page read model rebuilds from the organiser write.
 * sendFollowerMessage sends one follower update through createOrganizerPost
 * after reserving one of the month's two sends.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OwnerPageDeps} deps Injectable dependencies.
 * @return {Promise<ManageOrganizerOwnerPageCallableResponse>} The result.
 */
export async function manageOrganizerOwnerPageHandler(
  request: CallableRequest<unknown>,
  deps: OwnerPageDeps = defaultDeps
): Promise<ManageOrganizerOwnerPageCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    ManageOrganizerOwnerPageCallablePayload
  >(request, validateManageOrganizerOwnerPageCallablePayload, normalize);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "manageOrganizerOwnerPage", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const response = data.action === "setLinks" ?
    await setLinks(db, uid, data, deps) :
    data.action === "setPhotoOrder" ?
      await setPhotoOrder(db, uid, data) :
      await sendFollowerMessage(db, uid, data, request, deps);
  if (!validateManageOrganizerOwnerPageCallableResponse(response)) {
    throw new HttpsError("internal", "The page change needs review.");
  }
  return response;
}

async function setLinks(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: ManageOrganizerOwnerPageCallablePayload,
  deps: OwnerPageDeps
): Promise<ManageOrganizerOwnerPageCallableResponse> {
  const ref = db.collection("organizers").doc(data.organizerId);
  const saved = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Organizer not found.");
    const organizer = requireDoc<OrganizerDocument>(snap, "OrganizerDocument");
    requireOwnerViewCapability(organizer, uid, "links");
    const ownerLinks = storedOwnerLinks(data.links ?? [],
      deps.timestampFromDate);
    tx.update(ref, {ownerLinks});
    return ownerLinks;
  });
  return {action: "setLinks", idempotentReplay: false,
    links: adminOwnerLinks(saved), photoIds: null, followerMessages: null};
}

/**
 * Reorders the page's existing photos, as updateOrganizer does for a
 * reordered gallery: positions follow the order and the first photo becomes
 * the cover (imageUrl). The ids must be exactly the stored ones, so nothing
 * is added or removed here and no stored media is orphaned.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Caller.
 * @param {ManageOrganizerOwnerPageCallablePayload} data Payload.
 * @return {Promise<ManageOrganizerOwnerPageCallableResponse>} Saved order.
 */
async function setPhotoOrder(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: ManageOrganizerOwnerPageCallablePayload
): Promise<ManageOrganizerOwnerPageCallableResponse> {
  const ref = db.collection("organizers").doc(data.organizerId);
  const ids = data.photoIds ?? [];
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Organizer not found.");
    const organizer = requireDoc<OrganizerDocument>(snap, "OrganizerDocument");
    requireOwnerViewCapability(organizer, uid, "photos");
    const photos = organizer.organizerPhotos ?? [];
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    if (ids.length !== photos.length || ids.some((id) => !byId.has(id))) {
      throw new HttpsError("failed-precondition",
        "The photos changed. Refresh and try again.");
    }
    const organizerPhotos = ids.map((id, position) =>
      ({...byId.get(id)!, position}));
    tx.update(ref, {organizerPhotos,
      imageUrl: organizerPhotos[0]?.url ?? null});
  });
  return {action: "setPhotoOrder", idempotentReplay: false, links: null,
    photoIds: ids, followerMessages: null};
}

async function sendFollowerMessage(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: ManageOrganizerOwnerPageCallablePayload,
  request: CallableRequest<unknown>,
  deps: OwnerPageDeps
): Promise<ManageOrganizerOwnerPageCallableResponse> {
  const snap = await db.collection("organizers").doc(data.organizerId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Organizer not found.");
  const organizer = requireDoc<OrganizerDocument>(snap, "OrganizerDocument");
  requireOwnerViewCapability(organizer, uid, "messageFollowers");
  const now = deps.now();
  const reservation = await reserveFollowerMessage(db, {
    organizerId: data.organizerId, requestId: data.requestId, now});
  try {
    await deps.sendFollowerUpdate({...request, data: {
      organizerId: data.organizerId,
      requestId: data.requestId,
      text: data.text,
    }});
  } catch (error) {
    if (!reservation.replay) {
      await releaseFollowerMessage(db, {organizerId: data.organizerId,
        requestId: data.requestId, month: reservation.month, now});
    }
    throw error;
  }
  return {action: "sendFollowerMessage", idempotentReplay: reservation.replay,
    links: null, photoIds: null, followerMessages: {month: reservation.month,
      limit: followerMessageLimit, used: reservation.used}};
}

function normalize(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const input = {...raw as Record<string, unknown>};
  for (const field of ["organizerId", "requestId", "text"]) {
    if (typeof input[field] === "string") {
      input[field] = (input[field] as string).trim();
    }
  }
  return input;
}

export const manageOrganizerOwnerPage = onCall(
  appCheckCallableOptions,
  (request) => manageOrganizerOwnerPageHandler(request)
);
