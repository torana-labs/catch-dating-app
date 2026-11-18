/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {appCheckCallableOptionsWithSecrets} from "../../shared/callableOptions";
import {listingSuppressionHmacKey} from "../../listingSuppressions/registry";
import type {AdminNominateOrganizerCallablePayload} from "../../shared/generated/adminNominateOrganizerCallablePayload";
import {validateAdminNominateOrganizerCallablePayload} from "../../shared/generated/validators/adminNominateOrganizerInput";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {requireAdminRole} from "../../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../../admin/adminAudit";
import {
  createSupplyIntakeRequest,
  intakeMarket,
  requestFromSalesInboundIntent,
  supplyIntakeRequestId,
} from "./requests";

const nominatorRoles = ["admin", "adminOwner", "salesStaff"] as const;

interface NominationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: NominationDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminNominateOrganizerResponse {
  requestId: string;
  created: boolean;
  status: "queued";
}

/**
 * A Catch sales associate (or admin) nominates an organizer. The intake
 * worker builds the listing; this records who nominated whom and nothing
 * else, so a retried submission returns the same request.
 */
export async function adminNominateOrganizerHandler(request: CallableRequest<unknown>,
  deps: NominationDeps = defaultDeps): Promise<AdminNominateOrganizerResponse> {
  const context = requireAdminRole(request, nominatorRoles);
  const data = validateCallableWithAjv<AdminNominateOrganizerCallablePayload>(request,
    validateAdminNominateOrganizerCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminNominateOrganizer", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const intake = {
    schemaVersion: 1 as const,
    requestId: supplyIntakeRequestId("nom", [context.uid, data.requestId]),
    kind: "nomination" as const,
    market: intakeMarket(data.market),
    seed: {name: data.name, urls: data.urls, notes: data.notes, categories: data.categories},
    submittedBy: {role: "associate" as const, uid: context.uid, partnerId: null},
    submittedAt: now.toISOString(),
    origin: {kind: "admin_nomination" as const, id: data.requestId},
  };
  const result = await db.runTransaction(async (tx) => {
    const created = await createSupplyIntakeRequest(tx, db, intake, now);
    if (created.created) {
      setAdminAuditLogInTransaction(tx, db, context, {
        action: "adminNominateOrganizer",
        targetPath: `supplyIntakeRequests/${created.requestId}`,
        request,
        before: {},
        after: {requestId: created.requestId, kind: intake.kind, market: intake.market,
          urls: intake.seed.urls.length},
        note: null,
        serverTimestamp: deps.serverTimestamp,
      });
    }
    return created;
  });
  if (result.suppressed) {
    // Staff see which do-not-list case refused it; the case holds no names.
    throw new HttpsError("failed-precondition", `This organizer is on the do-not-list registry (case ${result.suppressed.caseId}). ` +
      "Nothing was queued.", {reason: "listing_suppressed", caseId: result.suppressed.caseId});
  }
  return {requestId: result.requestId, created: result.created, status: "queued"};
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const trimmed = (entry: unknown) => typeof entry === "string" ? entry.trim() || null : entry;
  return {
    ...data,
    name: trimmed(data.name),
    notes: trimmed(data.notes),
    market: typeof data.market === "string" ? data.market.trim().toLowerCase() : data.market,
    urls: Array.isArray(data.urls) ? [...new Set(data.urls.map((url) => typeof url === "string" ? url.trim() : url))] : data.urls,
    categories: Array.isArray(data.categories) ? [...new Set(data.categories)].sort() : data.categories,
  };
}

export const adminNominateOrganizer = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey]),
  (request) => adminNominateOrganizerHandler(request));

/**
 * Website host applications and partner nominations already arrive as
 * salesInboundIntents (ad attribution, alerts and partner credit read them).
 * Each one that names an organizer or a link also becomes an intake request.
 */
export const onSalesInboundIntentForIntake = onDocumentCreated({
  document: "salesInboundIntents/{intentId}", retry: true, maxInstances: 2, secrets: [listingSuppressionHmacKey],
}, async (event) => {
  const db = admin.firestore();
  const now = new Date();
  const intake = requestFromSalesInboundIntent(event.params.intentId, event.data?.data() ?? {}, now);
  if (!intake) return;
  // A do-not-list refusal is final (the service logs and counts it); only an
  // unavailable check throws, so the platform retries it.
  await db.runTransaction((tx) => createSupplyIntakeRequest(tx, db, intake, now));
});
