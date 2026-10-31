import {Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type {OrganizerPaymentConnectionDocument as Connection} from
  "../../shared/generated/firestoreAdminTypes";
import {formPaymentRuntime, formPaymentsConfigured} from "./formPaymentRuntime";
import type {FormPaymentCredentials} from "./formPaymentCredentials";

/** Ready connections are refreshed this long before their token expires, so
 * a checkout never meets an expired token while the refresh token is valid. */
export const formPaymentTokenRefreshWindowMillis = 7 * 86400_000;

/** Refreshes ready connections nearing expiry, earliest expiry first. Each
 * refresh goes through `credentials.access`, which owns the exclusive lease
 * and records an uncertain or rejected refresh for reconnection. A connection
 * in that state is never ready, so this sweep never sends its token again. */
export async function refreshOrganizerFormPaymentTokensHandler(deps: {
  db: FirebaseFirestore.Firestore; mode: "test" | "live";
  credentials: Pick<FormPaymentCredentials, "access">;
}, now = Date.now(), clock: () => number = Date.now) {
  const deadline = clock() + 4 * 60_000;
  /* firestore-index: organizerPaymentConnections (
    status:ASCENDING,mode:ASCENDING,tokenExpiresAt:ASCENDING) */
  const due = await deps.db.collection("organizerPaymentConnections")
    .where("status", "==", "ready").where("mode", "==", deps.mode)
    .where("tokenExpiresAt", "<=",
      Timestamp.fromMillis(now + formPaymentTokenRefreshWindowMillis))
    .orderBy("tokenExpiresAt").limit(50).get();
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;
  let cursor = 0;
  for (; cursor < due.docs.length && clock() < deadline; cursor++) {
    const snap = due.docs[cursor];
    const value = snap.data() as Partial<Connection>;
    // The partner client refreshes only its own mode's merchants. Unbound,
    // disconnected or flagged records need the Host, not another refresh.
    if (value.status !== "ready" || value.mode !== deps.mode ||
        !value.organizerId || !value.accountId ||
        !value.secretVersionResource || value.disconnectedAt ||
        value.lastErrorCode === "refreshOutcomeUnknown" ||
        value.lastErrorCode === "refreshRejected") {
      skipped++;
      continue;
    }
    try {
      await deps.credentials.access({organizerId: value.organizerId,
        connectionId: snap.id, accountId: value.accountId, mode: value.mode},
      {refreshWithinMillis: formPaymentTokenRefreshWindowMillis});
      refreshed++;
    } catch {
      // A held lease is retried next run; any other outcome is recorded on
      // the connection by the credential service.
      failed++;
    }
  }
  return {refreshed, failed, skipped, deferred: due.docs.length - cursor};
}

export const refreshOrganizerFormPaymentTokens = onSchedule({
  schedule: "every 60 minutes", timeZone: "Asia/Kolkata",
  timeoutSeconds: 300, maxInstances: 1,
}, async () => {
  if (!formPaymentsConfigured()) return;
  try {
    const runtime = await formPaymentRuntime();
    const summary = await refreshOrganizerFormPaymentTokensHandler({
      db: runtime.db, mode: runtime.mode, credentials: runtime.credentials});
    if (summary.refreshed || summary.failed || summary.deferred) {
      logger.info("Form payment token refresh", summary);
    }
  } catch {
    // Provider replies and credentials must never reach infrastructure logs.
    throw new Error("Form payment token refresh is unavailable.");
  }
});
