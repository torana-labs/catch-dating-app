import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import type {CommercialTermsRevisionDocument} from
  "../shared/generated/commercialTermsRevisionDocument";
import type {ManageCommercialTermsCallablePayload as Payload} from
  "../shared/generated/manageCommercialTermsCallablePayload";
import type {ManageCommercialTermsCallableResponse as Result} from
  "../shared/generated/manageCommercialTermsCallableResponse";
import {validateCommercialTerms} from
  "../shared/generated/validators/commercialTerms";
import {validateCommercialTermsDocument} from
  "../shared/generated/validators/commercialTermsDocument";
import {validateCommercialTermsOverride} from
  "../shared/generated/validators/commercialTermsOverride";
import {validateManageCommercialTermsCallablePayload} from
  "../shared/generated/validators/manageCommercialTermsInput";
import {validateManageCommercialTermsCallableResponse} from
  "../shared/generated/validators/manageCommercialTermsOutput";
import {effectiveCommercialTerms, readCommercialTerms} from "./resolver";
import {
  commercialTermsCollection,
  commercialTermsRevisionId,
  commercialTermsRevisionsCollection,
  mergeCommercialTerms,
  organizerCommercialTermsId,
  platformCommercialTermsId,
  type CommercialTerms,
  type CommercialTermsOverride,
} from "./terms";

interface Dependencies {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

/**
 * Finance and Admin Owner read or replace commercial terms. Terms change
 * only what new payments freeze; existing payments keep their snapshots.
 */
export async function manageCommercialTermsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, ["adminOwner", "finance"]);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageCommercialTermsCallablePayload);
  if (data.action === "read" ? data.expectedRevision !== null ||
      data.terms !== null || data.reason !== null :
    data.expectedRevision === null || data.terms === null ||
      data.reason === null || data.reason.trim().length < 3) {
    invalid("Invalid commercial terms action.");
  }
  const platformScope = data.organizerId === null;
  if (data.terms !== null && (platformScope ?
    !validateCommercialTerms(data.terms) :
    !validateCommercialTermsOverride(data.terms))) {
    invalid(platformScope ?
      "Platform terms must set every commercial term." :
      "Organizer overrides may only set known commercial terms.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "manageCommercialTerms", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const termsId = platformScope ? platformCommercialTermsId :
    organizerCommercialTermsId(data.organizerId!);
  const ref = db.collection(commercialTermsCollection).doc(termsId);
  return db.runTransaction(async (tx) => {
    const stored = await readCommercialTerms({db, tx,
      organizerId: data.organizerId});
    const before = platformScope ? stored.platform : stored.organizer;
    if (data.action === "read") {
      return project(termsId, data.organizerId, before, stored.platform,
        platformScope ? null : stored.organizer);
    }
    if (!platformScope && !(await tx.get(
      db.collection("organizers").doc(data.organizerId!))).exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    const reason = data.reason!.trim();
    const mutationHash = createHash("sha256").update(JSON.stringify([
      actor.uid, data.organizerId, data.expectedRevision, data.terms, reason,
    ])).digest("hex");
    // Only the most recent exact command replays. An intervening change must
    // be reviewed again, even when it would restore the same values.
    if (before?.lastMutationHash === mutationHash) {
      return project(termsId, data.organizerId, before, stored.platform,
        platformScope ? null : before);
    }
    if ((before?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted",
        "Commercial terms changed. Review them again.");
    }
    const nowMillis = deps.now();
    const next: CommercialTermsDocument = {
      schemaVersion: 1, scope: platformScope ? "platform" : "organizer",
      organizerId: data.organizerId, revision: (before?.revision ?? 0) + 1,
      terms: data.terms!, reason, updatedByUid: actor.uid,
      updatedAtMillis: nowMillis, lastMutationHash: mutationHash,
    };
    if (!validateCommercialTermsDocument(next)) {
      invalid("These commercial terms are not valid.");
    }
    // An override must still merge into valid terms with today's defaults.
    if (!platformScope && stored.platform && !mergeCommercialTerms(
      stored.platform.terms as CommercialTerms,
      next.terms as CommercialTermsOverride)) {
      invalid("This override does not combine with the platform terms.");
    }
    const history: CommercialTermsRevisionDocument = {
      schemaVersion: 1, termsId, scope: next.scope,
      organizerId: next.organizerId, revision: next.revision,
      terms: next.terms, reason, actorUid: actor.uid,
      createdAtMillis: nowMillis,
    };
    tx.set(ref, next);
    tx.create(db.collection(commercialTermsRevisionsCollection)
      .doc(commercialTermsRevisionId(termsId, next.revision)), history);
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: "manageCommercialTerms", targetPath: ref.path, request,
      before: {revision: before?.revision ?? 0, terms: before?.terms ?? null},
      after: {revision: next.revision, terms: next.terms},
      note: reason,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return project(termsId, data.organizerId, next,
      platformScope ? next : stored.platform, platformScope ? null : next);
  });
}

function project(termsId: string, organizerId: string | null,
  record: CommercialTermsDocument | null,
  platform: CommercialTermsDocument | null,
  organizer: CommercialTermsDocument | null): Result {
  let effectiveTerms: CommercialTerms | null = null;
  try {
    effectiveTerms = effectiveCommercialTerms({platform, organizer});
  } catch {
    effectiveTerms = null;
  }
  const result: Result = {termsId, organizerId,
    revision: record?.revision ?? 0, terms: record?.terms ?? null,
    reason: record?.reason ?? null,
    updatedAtMillis: record?.updatedAtMillis ?? null,
    effectiveTerms, platformRevision: platform?.revision ?? 0};
  if (!validateManageCommercialTermsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid commercial terms.");
  }
  return result;
}

export const manageCommercialTerms = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 10}),
  (request) => manageCommercialTermsHandler(request));
