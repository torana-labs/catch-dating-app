import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../../admin/adminAudit";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import type {AdMatchingOptOutDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {AdminManageAdMatchingOptOutCallablePayload} from
  "../../shared/generated/adminManageAdMatchingOptOutCallablePayload";
import type {AdminManageAdMatchingOptOutCallableResponse} from
  "../../shared/generated/adminManageAdMatchingOptOutCallableResponse";
import {validateAdminManageAdMatchingOptOutCallablePayload} from
  "../../shared/generated/validators/adminManageAdMatchingOptOutInput";
import {cancelOptedOutDeliveries} from "../adConversions/deliveries";
import {
  AD_MATCHING_OPT_OUTS,
  type AdMatchingIdentifierKind,
  adMatchingDigestsFromContact,
  adMatchingKeys,
} from "./optOuts";

/** Support and safety staff take opt-out requests; the owner can too. */
export const AD_MATCHING_OPT_OUT_ROLES = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;

export interface AdMatchingOptOutDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => number;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: AdMatchingOptOutDeps = {
  firestore: () => admin.firestore(),
  now: Date.now,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type Response = AdminManageAdMatchingOptOutCallableResponse;
type Kind = AdMatchingIdentifierKind;

/** A note may say where the request came from, never repeat the contact. */
function looksLikeContact(note: string): boolean {
  return note.includes("@") || /\d[\d\s().-]{5,}\d/u.test(note);
}

/**
 * Checks, records or removes an ad-matching opt-out for a phone and/or
 * email. The values are hashed here; the response names only identifier
 * kinds, and the audit entry names only kinds and counts.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdMatchingOptOutDeps} deps Dependencies.
 * @return {Promise<Response>} Kinds named, changed and now opted out.
 */
export async function adminManageAdMatchingOptOutHandler(
  request: CallableRequest<unknown>,
  deps: AdMatchingOptOutDeps = defaultDeps
): Promise<Response> {
  const context = requireAdminRole(request, AD_MATCHING_OPT_OUT_ROLES);
  const payload = validateCallableWithAjv<
    AdminManageAdMatchingOptOutCallablePayload>(request,
      validateAdminManageAdMatchingOptOutCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, context.uid, "adminManageAdMatchingOptOut",
    {maxRequests: 30, windowMs: 60_000});
  const phone = payload.phone?.trim() || null;
  const email = payload.email?.trim() || null;
  if (!phone && !email) {
    throw new HttpsError("invalid-argument",
      "Enter the phone number or email the request names.");
  }
  const digests = adMatchingDigestsFromContact({phone, email});
  if (phone && !digests.phoneSha256) {
    throw new HttpsError("invalid-argument",
      "Use a complete phone number with its country code.");
  }
  if (email && !digests.emailSha256) {
    throw new HttpsError("invalid-argument", "That email is not complete.");
  }
  const note = payload.note?.trim() || null;
  if (note && looksLikeContact(note)) {
    throw new HttpsError("invalid-argument",
      "Leave the phone number and email out of the note.");
  }
  const keys = adMatchingKeys(digests);
  const kinds = keys.map((key) => key.kind);
  const refs = keys.map((key) => ({kind: key.kind,
    ref: db.collection(AD_MATCHING_OPT_OUTS).doc(key.optOutId)}));

  if (payload.action === "check") {
    const snaps = await Promise.all(refs.map(({ref}) => ref.get()));
    return {action: "check", kinds, changed: [],
      optedOut: refs.filter((_, index) =>
        snaps[index].data()?.status === "active").map(({kind}) => kind)};
  }

  const nowMillis = deps.now();
  const now = Timestamp.fromMillis(nowMillis);
  const changed = await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map(({ref}) => tx.get(ref)));
    const touched: Kind[] = [];
    refs.forEach(({kind, ref}, index) => {
      const existing = snaps[index].data() as
        AdMatchingOptOutDocument | undefined;
      if (payload.action === "record") {
        if (existing?.status === "active") return;
        tx.set(ref, {
          schemaVersion: 1,
          optOutId: ref.id,
          kind,
          source: payload.source,
          status: "active",
          note,
          createdAt: now,
          createdByUid: context.uid,
          removedAt: null,
          removedByUid: null,
          updatedAt: now,
        } satisfies AdMatchingOptOutDocument);
        touched.push(kind);
        return;
      }
      if (existing?.status !== "active") return;
      tx.update(ref, {status: "removed", removedAt: now,
        removedByUid: context.uid, updatedAt: now,
        ...(note ? {note} : {})});
      touched.push(kind);
    });
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminManageAdMatchingOptOut",
      targetPath: AD_MATCHING_OPT_OUTS,
      request,
      after: {action: payload.action, source: payload.source, kinds,
        changed: touched},
      serverTimestamp: deps.serverTimestamp,
    });
    return touched;
  });
  if (payload.action === "record") {
    await cancelOptedOutDeliveries(db, digests, nowMillis);
  }
  return {
    action: payload.action,
    kinds,
    changed,
    optedOut: payload.action === "record" ? kinds : [],
  };
}

export const adminManageAdMatchingOptOut = onCall(appCheckCallableOptions,
  (request) => adminManageAdMatchingOptOutHandler(request));
