import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {AddOrganizerManagerCallablePayload} from
  "../shared/generated/addOrganizerManagerCallablePayload";
import type {RemoveOrganizerManagerCallablePayload} from
  "../shared/generated/removeOrganizerManagerCallablePayload";
import type {TransferOrganizerOwnershipCallablePayload} from
  "../shared/generated/transferOrganizerOwnershipCallablePayload";
import {
  validateAddOrganizerManagerCallablePayload,
} from "../shared/generated/validators/addOrganizerManagerInput";
import {
  validateRemoveOrganizerManagerCallablePayload,
} from "../shared/generated/validators/removeOrganizerManagerInput";
import {
  validateTransferOrganizerOwnershipCallablePayload,
} from
  "../shared/generated/validators/transferOrganizerOwnershipInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  activeOrganizerTeamMembershipPatch,
  organizerRelationshipId,
} from "../shared/relationshipDocuments";
import {
  isOrganizerOwner,
  organizerHostProfiles,
  organizerManagerUserIds,
} from "../shared/organizerHosts";
import {
  hostProfileSeedPatch,
  professionalHostSnapshot,
} from "../shared/hostProfiles";

interface ManageOrganizerTeamDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ManageOrganizerTeamDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function addOrganizerManagerHandler(
  request: CallableRequest<unknown>,
  deps: ManageOrganizerTeamDeps = defaultDeps
): Promise<{added: boolean}> {
  const callerUid = requireAuth(request);
  const data = validateCallableWithAjv<AddOrganizerManagerCallablePayload>(
    request,
    validateAddOrganizerManagerCallablePayload,
    normalizeTeamPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, callerUid, "addOrganizerManager", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const targetUid = await resolveTargetUid(db, data);
  await db.runTransaction(async (tx) => {
    const organizerRef = db.collection("organizers").doc(data.organizerId);
    const targetUserRef = db.collection("users").doc(targetUid);
    const targetHostProfileRef = db.collection("hostProfiles").doc(targetUid);
    const callerDeletedRef = db.collection("deletedUsers").doc(callerUid);
    const targetDeletedRef = db.collection("deletedUsers").doc(targetUid);
    const teamRef = db.collection("organizerTeamMemberships")
      .doc(organizerRelationshipId(data.organizerId, targetUid));
    const [
      organizerSnap,
      targetUserSnap,
      targetHostProfileSnap,
      callerDeletedSnap,
      targetDeletedSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(targetUserRef),
      tx.get(targetHostProfileRef),
      tx.get(callerDeletedRef),
      tx.get(targetDeletedRef),
    ]);
    assertOwner(organizerSnap, callerDeletedSnap, callerUid);
    if (!targetUserSnap.exists && !targetHostProfileSnap.exists) {
      throw new HttpsError("not-found", "Manager profile not found.");
    }
    if (targetDeletedSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot manage organizers."
      );
    }
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    const ids = uniqueStrings([
      ...organizerManagerUserIds(organizer),
      targetUid,
    ]);
    const profile = professionalHostSnapshot({
      uid: targetUid,
      hostProfileSnap: targetHostProfileSnap,
      userSnap: targetUserSnap,
      role: "host",
    });
    const profiles = [
      ...organizerHostProfiles(organizer)
        .filter((host) => host.uid !== targetUid),
      profile,
    ].sort((a, b) => ids.indexOf(a.uid) - ids.indexOf(b.uid));
    const patch = {hostUserIds: ids, hostProfiles: profiles};
    tx.update(organizerRef, patch);
    tx.set(teamRef, activeOrganizerTeamMembershipPatch({
      organizerId: data.organizerId,
      uid: targetUid,
      role: "manager",
    }), {merge: true});
    if (!targetHostProfileSnap.exists) {
      tx.set(
        targetHostProfileRef,
        hostProfileSeedPatch(
          profile,
          admin.firestore.FieldValue.serverTimestamp()
        ),
        {merge: true}
      );
    }
  });
  return {added: true};
}

export async function removeOrganizerManagerHandler(
  request: CallableRequest<unknown>,
  deps: ManageOrganizerTeamDeps = defaultDeps
): Promise<{removed: boolean}> {
  const callerUid = requireAuth(request);
  const data = validateCallableWithAjv<RemoveOrganizerManagerCallablePayload>(
    request,
    validateRemoveOrganizerManagerCallablePayload,
    normalizeTeamPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, callerUid, "removeOrganizerManager", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await db.runTransaction(async (tx) => {
    const organizerRef = db.collection("organizers").doc(data.organizerId);
    const callerDeletedRef = db.collection("deletedUsers").doc(callerUid);
    const teamRef = db.collection("organizerTeamMemberships")
      .doc(organizerRelationshipId(data.organizerId, data.uid));
    const [organizerSnap, callerDeletedSnap] =
      await Promise.all([
        tx.get(organizerRef),
        tx.get(callerDeletedRef),
      ]);
    assertOwner(organizerSnap, callerDeletedSnap, callerUid);
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    if (isOrganizerOwner(organizer, data.uid)) {
      throw new HttpsError(
        "failed-precondition",
        "Transfer ownership before removing the organizer owner."
      );
    }
    const patch = {
      hostUserIds: organizerManagerUserIds(organizer)
        .filter((uid) => uid !== data.uid),
      hostProfiles: organizerHostProfiles(organizer)
        .filter((host) => host.uid !== data.uid),
    };
    tx.update(organizerRef, patch);
    tx.set(teamRef, {
      status: "removed",
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  });
  return {removed: true};
}

export async function transferOrganizerOwnershipHandler(
  request: CallableRequest<unknown>,
  deps: ManageOrganizerTeamDeps = defaultDeps
): Promise<{transferred: boolean}> {
  const callerUid = requireAuth(request);
  const data = validateCallableWithAjv<
    TransferOrganizerOwnershipCallablePayload
  >(
    request,
    validateTransferOrganizerOwnershipCallablePayload,
    normalizeTeamPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, callerUid, "transferOrganizerOwnership", {
    maxRequests: 5, windowMs: 60 * 1000,
  });
  await db.runTransaction(async (tx) => {
    const organizerRef = db.collection("organizers").doc(data.organizerId);
    const targetUserRef = db.collection("users").doc(data.uid);
    const targetHostProfileRef = db.collection("hostProfiles").doc(data.uid);
    const callerDeletedRef = db.collection("deletedUsers").doc(callerUid);
    const targetDeletedRef = db.collection("deletedUsers").doc(data.uid);
    const previousTeamRef = db.collection("organizerTeamMemberships")
      .doc(organizerRelationshipId(data.organizerId, callerUid));
    const nextTeamRef = db.collection("organizerTeamMemberships")
      .doc(organizerRelationshipId(data.organizerId, data.uid));
    const [
      organizerSnap,
      targetUserSnap,
      targetHostProfileSnap,
      callerDeletedSnap,
      targetDeletedSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(targetUserRef),
      tx.get(targetHostProfileRef),
      tx.get(callerDeletedRef),
      tx.get(targetDeletedRef),
    ]);
    assertOwner(organizerSnap, callerDeletedSnap, callerUid);
    if (callerUid === data.uid) return;
    if (!targetUserSnap.exists && !targetHostProfileSnap.exists) {
      throw new HttpsError("not-found", "Manager profile not found.");
    }
    if (targetDeletedSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot own organizers."
      );
    }
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    if (!organizerManagerUserIds(organizer).includes(data.uid)) {
      throw new HttpsError(
        "failed-precondition",
        "Ownership can be transferred only to an existing manager."
      );
    }
    const targetProfile = professionalHostSnapshot({
      uid: data.uid,
      hostProfileSnap: targetHostProfileSnap,
      userSnap: targetUserSnap,
      role: "owner",
    });
    const profiles = organizerHostProfiles(organizer).map((host) => {
      if (host.uid === callerUid) return {...host, role: "host" as const};
      if (host.uid === data.uid) return {...targetProfile, role: "owner"};
      return host;
    });
    const ids = uniqueStrings([
      data.uid,
      callerUid,
      ...organizerManagerUserIds(organizer),
    ]);
    const patch = {
      "ownerUserId": data.uid,
      "hostUserId": data.uid,
      "hostName": targetProfile.displayName,
      "hostAvatarUrl": targetProfile.avatarUrl,
      "hostUserIds": ids,
      "hostProfiles": profiles.sort(
        (a, b) => ids.indexOf(a.uid) - ids.indexOf(b.uid)
      ),
      "ownership.state": "transferred",
      "ownership.ownerUserId": data.uid,
      "ownership.primaryHostUserId": data.uid,
      "ownership.hostUserIds": ids,
      "ownership.claimedAt": admin.firestore.FieldValue.serverTimestamp(),
      "ownership.claimedByUid": data.uid,
    };
    tx.update(organizerRef, patch);
    tx.set(previousTeamRef, activeOrganizerTeamMembershipPatch({
      organizerId: data.organizerId,
      uid: callerUid,
      role: "manager",
    }), {merge: true});
    tx.set(nextTeamRef, activeOrganizerTeamMembershipPatch({
      organizerId: data.organizerId,
      uid: data.uid,
      role: "owner",
    }), {merge: true});
    if (!targetHostProfileSnap.exists) {
      tx.set(
        targetHostProfileRef,
        hostProfileSeedPatch(
          targetProfile,
          admin.firestore.FieldValue.serverTimestamp()
        ),
        {merge: true}
      );
    }
  });
  return {transferred: true};
}

function assertOwner(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  callerDeletedSnap: FirebaseFirestore.DocumentSnapshot,
  callerUid: string
) {
  if (callerDeletedSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot manage organizer teams."
    );
  }
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  );
  if (!isOrganizerOwner(organizer, callerUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only the organizer owner can manage the organizer team."
    );
  }
}

async function resolveTargetUid(
  db: FirebaseFirestore.Firestore,
  data: AddOrganizerManagerCallablePayload
): Promise<string> {
  if (typeof data.uid === "string" && data.uid.length > 0) return data.uid;
  const phoneNumber = normalizePhoneNumber(data.phoneNumber);
  if (!phoneNumber) {
    throw new HttpsError(
      "invalid-argument",
      "Provide a manager user id or phone number."
    );
  }
  const snap = await db.collection("users")
    .where("phoneNumber", "==", phoneNumber).limit(2).get();
  if (snap.empty) {
    throw new HttpsError("not-found", "No Catch profile uses that phone.");
  }
  if (snap.docs.length > 1) {
    throw new HttpsError(
      "failed-precondition",
      "More than one profile uses that phone."
    );
  }
  return snap.docs[0].id;
}

function normalizeTeamPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const result = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "uid", "phoneNumber"]) {
    if (typeof result[field] === "string") {
      result[field] = result[field].trim();
    }
  }
  return result;
}

function normalizePhoneNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d+]/g, "");
  if (normalized.length === 0) return null;
  if (normalized.startsWith("+")) return normalized;
  const withoutLeadingZero = normalized.replace(/^0+/, "");
  if (withoutLeadingZero.length === 10) return `+91${withoutLeadingZero}`;
  return withoutLeadingZero;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export const addOrganizerManager = onCall(
  appCheckCallableOptions,
  (request) => addOrganizerManagerHandler(request)
);
export const removeOrganizerManager = onCall(
  appCheckCallableOptions,
  (request) => removeOrganizerManagerHandler(request)
);
export const transferOrganizerOwnership = onCall(
  appCheckCallableOptions,
  (request) => transferOrganizerOwnershipHandler(request)
);
