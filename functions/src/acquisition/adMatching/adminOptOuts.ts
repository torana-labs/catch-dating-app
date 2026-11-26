import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import {setAdminAuditLogInTransaction} from "../../platform/adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
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
import {
  callable,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../../platform/callables/callable";
import {adminRoles} from "../../platform/callables/policies";
import type {AdminContext} from "../../platform/adminAuth";

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
 * Policy: AD_MATCHING_OPT_OUT_ROLES (STR-10).
 * @param {AdMatchingOptOutDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminManageAdMatchingOptOutSpec(
  deps: AdMatchingOptOutDeps = defaultDeps):
  CallableSpec<
    AdminManageAdMatchingOptOutCallablePayload,
    AdminContext,
    Response> {
  return {
    name: "adminManageAdMatchingOptOut",
    policy: adminRoles(AD_MATCHING_OPT_OUT_ROLES),
    input: validateAdminManageAdMatchingOptOutCallablePayload,
    handle: (context) => adminManageAdMatchingOptOutWork(context, deps),
  };
}

/** The deployed path of adminManageAdMatchingOptOut, for tests. */
export function adminManageAdMatchingOptOutHandler(
  request: CallableRequest<unknown>, deps: AdMatchingOptOutDeps = defaultDeps):
  Promise<Response> {
  return runCallable(adminManageAdMatchingOptOutSpec(deps), request);
}

async function adminManageAdMatchingOptOutWork(
  {request, data: payload, actor: context}:
    CallableContext<AdminManageAdMatchingOptOutCallablePayload, AdminContext>,
  deps: AdMatchingOptOutDeps):
  Promise<Response> {
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

export const adminManageAdMatchingOptOut = callable(
  adminManageAdMatchingOptOutSpec());
