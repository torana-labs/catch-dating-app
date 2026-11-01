import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {validateCallableWithAjv} from "../shared/validation";
import type {OrganizerGuestBlockDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ManageOrganizerGuestBlockCallablePayload} from
  "../shared/generated/manageOrganizerGuestBlockCallablePayload";
import type {ManageOrganizerGuestBlockCallableResponse} from
  "../shared/generated/manageOrganizerGuestBlockCallableResponse";
import type {ListOrganizerGuestBlocksCallablePayload} from
  "../shared/generated/listOrganizerGuestBlocksCallablePayload";
import type {ListOrganizerGuestBlocksCallableResponse} from
  "../shared/generated/listOrganizerGuestBlocksCallableResponse";
import {validateManageOrganizerGuestBlockCallablePayload} from
  "../shared/generated/validators/manageOrganizerGuestBlockInput";
import {validateListOrganizerGuestBlocksCallablePayload} from
  "../shared/generated/validators/listOrganizerGuestBlocksInput";
import {ORGANIZER_GUEST_BLOCKS, organizerGuestBlockId} from
  "./accountStanding";
import {millisOf, readSafetySettings} from "./safetyPolicy";

export interface OrganizerGuestBlockDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerGuestBlockDeps = {
  firestore: () => admin.firestore(),
  now: () => Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * An organizer's owner or manager stops someone booking their events, or
 * lets them back. No reason, no review; no other organizer is affected.
 * Existing bookings stay; the organizer cancels those from the guest list.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerGuestBlockDeps} deps Dependencies.
 * @return {Promise<ManageOrganizerGuestBlockCallableResponse>} Result.
 */
export async function manageOrganizerGuestBlockHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerGuestBlockDeps = defaultDeps
): Promise<ManageOrganizerGuestBlockCallableResponse> {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    ManageOrganizerGuestBlockCallablePayload>(request,
      validateManageOrganizerGuestBlockCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, actorUid, "manageOrganizerGuestBlock",
    {maxRequests: 30, windowMs: 60_000});
  if (payload.uid === actorUid) {
    throw new HttpsError("invalid-argument", "You can't block yourself.");
  }
  if (payload.blocked && !(await readSafetySettings(db)).organizerBlockLists) {
    throw new HttpsError("failed-precondition",
      "Organizer block lists are switched off.");
  }
  const ref = db.collection(ORGANIZER_GUEST_BLOCKS)
    .doc(organizerGuestBlockId(payload.organizerId, payload.uid));
  await db.runTransaction(async (tx) => {
    await requireOrganizerManager({db, organizerId: payload.organizerId,
      actorUid, transaction: tx});
    const existing = await tx.get(ref);
    if (payload.blocked && !existing.exists) {
      tx.create(ref, {
        schemaVersion: 1,
        blockId: ref.id,
        organizerId: payload.organizerId,
        uid: payload.uid,
        blockedByUid: actorUid,
        createdAt: deps.now(),
      } satisfies OrganizerGuestBlockDocument);
    } else if (!payload.blocked && existing.exists) {
      tx.delete(ref);
    }
  });
  return {
    organizerId: payload.organizerId,
    uid: payload.uid,
    blocked: payload.blocked,
  };
}

/**
 * Lists who an organizer has blocked.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerGuestBlockDeps} deps Dependencies.
 * @return {Promise<ListOrganizerGuestBlocksCallableResponse>} Items.
 */
export async function listOrganizerGuestBlocksHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerGuestBlockDeps = defaultDeps
): Promise<ListOrganizerGuestBlocksCallableResponse> {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    ListOrganizerGuestBlocksCallablePayload>(request,
      validateListOrganizerGuestBlocksCallablePayload);
  const db = deps.firestore();
  await requireOrganizerManager({db, organizerId: payload.organizerId,
    actorUid});
  const blocks = await db.collection(ORGANIZER_GUEST_BLOCKS)
    .where("organizerId", "==", payload.organizerId).limit(500).get();
  const items = blocks.docs.map((doc) =>
    doc.data() as OrganizerGuestBlockDocument);
  const users = await Promise.all(items.map((item) =>
    db.collection("users").doc(item.uid).get()));
  return {
    items: items.map((item, index) => {
      const name = users[index].data()?.displayName;
      return {
        uid: item.uid,
        displayName: typeof name === "string" ? name.slice(0, 120) : null,
        blockedByUid: item.blockedByUid,
        createdAtMillis: millisOf(item.createdAt) ?? 0,
      };
    }).sort((a, b) => b.createdAtMillis - a.createdAtMillis),
  };
}

export const manageOrganizerGuestBlock = onCall(appCheckCallableOptions,
  (request) => manageOrganizerGuestBlockHandler(request));

export const listOrganizerGuestBlocks = onCall(appCheckCallableOptions,
  (request) => listOrganizerGuestBlocksHandler(request));
