import * as admin from "firebase-admin";
import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {checkIpRateLimit} from "../shared/rateLimit";
import {validateHostAcquisitionConsentHTTPRequest} from
  "../shared/generated/validators/hostAcquisitionConsentHttpRequest";
import {validateHostAcquisitionConsentDocument} from
  "../shared/generated/validators/hostAcquisitionConsentDocument";
import {validateHostAcquisitionConsentHTTPResponse} from
  "../shared/generated/validators/hostAcquisitionConsentHttpResponse";
import {HOST_CONSENT_COLLECTION, recordHostConsent} from "./consentStore";
import {
  expireHostMetaDeliveries, stopHostMetaDeliveriesForConsent,
} from "./metaDelivery";
import {hostConsentKey} from "./consentPolicy";
import {drainWithdrawnHostAttribution, expireHostAttribution,
  withdrawHostAttribution} from "./attribution";
import {BRAND} from "../shared/generated/brand";

// Activation is a separate reviewed source change after end-to-end acceptance.
export const hostServerMeasurementEnabled = false;

export function hostConsentAllowedOrigin(
  origin: string | undefined, projectId: string,
): string | null {
  if (!origin || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/u.test(projectId)) {
    return null;
  }
  const allowed = new Set([
    `https://${projectId}.web.app`,
    `https://${projectId}.firebaseapp.com`,
    ...(projectId === "catch-dating-app-64e51" ?
      [BRAND.web.origin, BRAND.web.wwwOrigin] : []),
  ]);
  return allowed.has(origin) ? origin : null;
}

/** Capability-bearing permission handshake. No contact or event data is
 * accepted, and neither request bodies nor capabilities are logged. */
export const hostAcquisitionConsent = onRequest(
  {region: "asia-south1", maxInstances: 2, timeoutSeconds: 30},
  async (request, response) => {
    response.set("Cache-Control", "no-store");
    response.set("Vary", "Origin");
    const origin = hostConsentAllowedOrigin(request.get("origin"),
      process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "");
    if (!origin) {
      response.status(403).json({error: "Origin not allowed."});
      return;
    }
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).json({error: "Method not allowed."});
      return;
    }
    if ((request.rawBody?.length ?? 0) > 2048 ||
        !validateHostAcquisitionConsentHTTPRequest(request.body)) {
      response.status(400).json({error: "Invalid privacy choice."});
      return;
    }
    const ip = request.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.ip ?? "unknown";
    // Separate from operational intake and reserve a distinct withdrawal lane.
    if (!checkIpRateLimit(`host-consent:${request.body.action}:${ip}`,
      30, 60 * 60 * 1000)) {
      response.status(429).json({error: "Please retry your privacy choice."});
      return;
    }
    try {
      const result = await recordHostConsent({
        get db() {
          return admin.firestore();
        },
        request: request.body,
        enabled: hostServerMeasurementEnabled,
      });
      if (!validateHostAcquisitionConsentHTTPResponse(result)) {
        throw new Error("Invalid privacy response.");
      }
      if ("ok" in result && result.status === "revoked") {
        await withdrawHostAttribution(admin.firestore(),
          hostConsentKey(request.body.capability)!);
        await stopHostMetaDeliveriesForConsent(admin.firestore(),
          hostConsentKey(request.body.capability)!);
      }
      response.status(200).json(result);
    } catch (error) {
      const status = error instanceof HttpsError ?
        error.code === "invalid-argument" ? 400 :
          error.code === "failed-precondition" ? 409 : 503 : 503;
      response.status(status).json({error: status === 503 ?
        "Privacy update unavailable. Please retry." :
        "Please make a fresh privacy choice."});
    }
  });

/** Bounded cleanup does not depend on an undeployed Firestore TTL policy.
 * A transaction rechecks expiry so a concurrent withdrawal cannot be erased
 * using an old query snapshot. Missing permission always stops delivery. */
export async function expireHostConsentRecords(
  db: FirebaseFirestore.Firestore, now = Date.now(),
): Promise<number> {
  const rows = await db.collection(HOST_CONSENT_COLLECTION)
    .where("expiresAt", "<=", admin.firestore.Timestamp.fromMillis(now))
    .limit(500).get();
  let removed = 0;
  for (const row of rows.docs) {
    const deleted = await db.runTransaction(async (tx) => {
      const current = await tx.get(row.ref);
      if (!current.exists) return false;
      const data = current.data();
      if (!validateHostAcquisitionConsentDocument(data) ||
          data.consentId !== row.id) return false;
      const expiry = data.expiresAt._seconds * 1000 +
        data.expiresAt._nanoseconds / 1_000_000;
      if (expiry > now) return false;
      tx.delete(row.ref);
      return true;
    });
    if (deleted) removed++;
  }
  return removed;
}

export const expireHostAcquisitionConsent = onSchedule({
  schedule: "every 15 minutes", region: "asia-south1", maxInstances: 1,
  timeoutSeconds: 300,
}, async () => {
  await drainWithdrawnHostAttribution(admin.firestore());
  await expireHostAttribution(admin.firestore());
  await expireHostMetaDeliveries(admin.firestore());
  await expireHostConsentRecords(admin.firestore());
});
