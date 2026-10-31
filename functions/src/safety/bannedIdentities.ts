import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentWritten} from
  "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import type {
  AccountSafetyStateDocument,
  BannedIdentityDocument,
  BlockedSignupAttemptDocument,
} from "../shared/generated/firestoreAdminTypes";
import {ACCOUNT_SAFETY_STATES} from "./accountStanding";
import {millisOf} from "./safetyPolicy";

export const BANNED_IDENTITIES = "bannedIdentities";
export const BLOCKED_SIGNUP_ATTEMPTS = "blockedSignupAttempts";

export type IdentityKind = BannedIdentityDocument["kind"];

export interface IdentityValue {
  kind: IdentityKind;
  value: string;
}

export interface BannedIdentityDeps {
  firestore: () => FirebaseFirestore.Firestore;
  auth: () => Pick<admin.auth.Auth,
    "getUser" | "updateUser" | "revokeRefreshTokens">;
  now: () => Timestamp;
}

const defaultDeps: BannedIdentityDeps = {
  firestore: () => admin.firestore(),
  auth: () => admin.auth(),
  now: () => Timestamp.now(),
};

/**
 * Hashes an identity value; the value itself is never stored.
 * @param {IdentityValue} identity Phone number or device.
 * @return {string} Identity document id.
 */
export function bannedIdentityId(identity: IdentityValue): string {
  const normalized = identity.kind === "phone" ?
    identity.value.replace(/[^+0-9]/gu, "") :
    identity.value.trim();
  const hash = createHash("sha256")
    .update(`${identity.kind}:${normalized}`).digest("hex");
  return `${identity.kind}-${hash}`;
}

/**
 * Lists the phone and devices an account has used.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {BannedIdentityDeps["auth"]} auth Auth accessor.
 * @param {string} uid Account.
 * @return {Promise<IdentityValue[]>} Identities.
 */
export async function accountIdentities(
  db: FirebaseFirestore.Firestore,
  auth: BannedIdentityDeps["auth"],
  uid: string
): Promise<IdentityValue[]> {
  const identities: IdentityValue[] = [];
  try {
    const user = await auth().getUser(uid);
    if (user.phoneNumber) {
      identities.push({kind: "phone", value: user.phoneNumber});
    }
  } catch (error) {
    if ((error as {code?: string}).code !== "auth/user-not-found") throw error;
  }
  const installations = await db.collection(`users/${uid}/pushInstallations`)
    .get();
  for (const doc of installations.docs) {
    identities.push({kind: "installation", value: doc.id});
    const token = doc.data().token;
    if (typeof token === "string" && token) {
      identities.push({kind: "pushToken", value: token});
    }
  }
  return identities;
}

/**
 * Records the phone and devices of a banned account. An identity already
 * held by another active ban keeps its original owner.
 * @param {BannedIdentityDeps} deps Dependencies.
 * @param {string} uid Banned account.
 * @param {string} actionId Ban action.
 * @return {Promise<number>} Identities recorded.
 */
export async function recordBannedIdentities(
  deps: BannedIdentityDeps,
  uid: string,
  actionId: string
): Promise<number> {
  const db = deps.firestore();
  const identities = await accountIdentities(db, deps.auth, uid);
  const now = deps.now();
  let recorded = 0;
  for (const identity of identities) {
    const identityId = bannedIdentityId(identity);
    const ref = db.collection(BANNED_IDENTITIES).doc(identityId);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      const current = existing.data() as BannedIdentityDocument | undefined;
      if (current?.active && current.actionId !== actionId) return;
      tx.set(ref, {
        schemaVersion: 1,
        identityId,
        kind: identity.kind,
        valueHash: identityId.slice(identity.kind.length + 1),
        uid,
        actionId,
        active: true,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      } satisfies BannedIdentityDocument);
      recorded++;
    });
  }
  return recorded;
}

/**
 * Releases the identities a lifted ban recorded.
 * @param {BannedIdentityDeps} deps Dependencies.
 * @param {string} actionId Lifted ban.
 */
export async function releaseBannedIdentities(
  deps: BannedIdentityDeps,
  actionId: string
): Promise<void> {
  const db = deps.firestore();
  const held = await db.collection(BANNED_IDENTITIES)
    .where("actionId", "==", actionId).get();
  const now = deps.now();
  for (const doc of held.docs) {
    await doc.ref.update({active: false, updatedAt: now});
  }
}

/**
 * Stops a new account that uses a banned phone or device: it is disabled,
 * held like a ban, and the attempt is recorded on the original ban. Only
 * accounts created after the ban are stopped; an older account that shares
 * a device is left alone.
 * @param {BannedIdentityDeps} deps Dependencies.
 * @param {string} attemptedUid New account.
 * @param {IdentityValue[]} identities Its phone or device.
 * @return {Promise<boolean>} Whether the account was stopped.
 */
export async function screenNewAccountIdentities(
  deps: BannedIdentityDeps,
  attemptedUid: string,
  identities: IdentityValue[]
): Promise<boolean> {
  const db = deps.firestore();
  const now = deps.now();
  let createdAtMillis: number | null = null;
  try {
    const user = await deps.auth().getUser(attemptedUid);
    createdAtMillis = Date.parse(user.metadata.creationTime);
  } catch (error) {
    if ((error as {code?: string}).code === "auth/user-not-found") return false;
    throw error;
  }
  for (const identity of identities) {
    const identityId = bannedIdentityId(identity);
    const snap = await db.collection(BANNED_IDENTITIES).doc(identityId).get();
    const banned = snap.data() as BannedIdentityDocument | undefined;
    if (!banned?.active || banned.uid === attemptedUid) continue;
    const bannedAt = millisOf(banned.createdAt) ?? 0;
    if (!Number.isFinite(createdAtMillis) ||
        (createdAtMillis ?? 0) < bannedAt) {
      continue;
    }
    await deps.auth().updateUser(attemptedUid, {disabled: true});
    await deps.auth().revokeRefreshTokens(attemptedUid);
    const attemptId = createHash("sha256")
      .update(`${attemptedUid}:${identityId}`).digest("hex");
    const attemptRef = db.collection(BLOCKED_SIGNUP_ATTEMPTS).doc(attemptId);
    const stateRef = db.collection(ACCOUNT_SAFETY_STATES).doc(attemptedUid);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(attemptRef);
      if (!existing.exists) {
        tx.create(attemptRef, {
          schemaVersion: 1,
          attemptId,
          attemptedUid,
          identityId,
          kind: identity.kind,
          bannedUid: banned.uid,
          actionId: banned.actionId,
          outcome: "disabled",
          at: now,
          retainUntil: null,
        } satisfies BlockedSignupAttemptDocument);
      }
      tx.set(stateRef, {
        schemaVersion: 1,
        uid: attemptedUid,
        level: "banned",
        messaging: {held: true, until: null},
        booking: {held: true, until: null},
        authDisabledBySafety: true,
        activeActionIds: [banned.actionId],
        updatedAt: now,
      } satisfies AccountSafetyStateDocument);
    });
    logger.warn("Stopped a new account using a banned identity.", {
      attemptedUid,
      kind: identity.kind,
      actionId: banned.actionId,
    });
    return true;
  }
  return false;
}

/** Screens a new profile's phone number against Catch-wide bans. */
export const onUserCreatedSafetyScreen = onDocumentCreated(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    let phone: string | undefined;
    try {
      phone = (await defaultDeps.auth().getUser(uid)).phoneNumber;
    } catch (error) {
      if ((error as {code?: string}).code === "auth/user-not-found") return;
      throw error;
    }
    if (!phone) return;
    await screenNewAccountIdentities(defaultDeps, uid,
      [{kind: "phone", value: phone}]);
  }
);

/** Screens a device an account registers against Catch-wide bans. */
export const onPushInstallationSafetyScreen = onDocumentWritten(
  "users/{uid}/pushInstallations/{installationId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const identities: IdentityValue[] = [
      {kind: "installation", value: event.params.installationId},
    ];
    const token = after.data()?.token;
    if (typeof token === "string" && token) {
      identities.push({kind: "pushToken", value: token});
    }
    await screenNewAccountIdentities(defaultDeps, event.params.uid,
      identities);
  }
);
