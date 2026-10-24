/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {FirestoreShadowProjectionWriter} from "../projectionImporter";
import {
  processSupplyIntakeRequest,
  supplyIntakeCollections,
  type SupplyIntakeWorkerDeps,
} from "./worker";

const SNAPSHOT_PREFIX = "supply-intake/snapshots";

function deps(): SupplyIntakeWorkerDeps {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  return {
    db,
    now: () => new Date(),
    projectionWriter: new FirestoreShadowProjectionWriter(db),
    // Snapshots are content-addressed, so a retry rewrites identical bytes.
    // storage.rules deny every client path under supply-intake/.
    putSnapshot: async (requestId, snapshot) => {
      const name = `${SNAPSHOT_PREFIX}/${requestId}/${snapshot.contentHash}.json`;
      await bucket.file(name).save(JSON.stringify(snapshot), {
        contentType: "application/json",
        resumable: false,
        metadata: {cacheControl: "private, no-store"},
      });
      return name;
    },
  };
}

/** Thrown so the platform redelivers the event after a retryable outcome. */
class SupplyIntakeRetry extends Error {}

/** A new intake request runs as soon as a front door writes it. */
export const onSupplyIntakeRequestCreated = onDocumentCreated({
  document: `${supplyIntakeCollections.requests}/{requestId}`,
  retry: true, timeoutSeconds: 540, memory: "1GiB", maxInstances: 3,
}, async (event) => {
  const outcome = await processSupplyIntakeRequest(deps(), event.params.requestId);
  logger.info("Supply intake request processed.", {requestId: event.params.requestId, outcome});
  if (outcome === "retry" || outcome === "busy") {
    throw new SupplyIntakeRetry(`Supply intake request ${outcome}.`);
  }
});

/** Recovers requests whose event was lost or whose worker stopped mid-lease. */
export const recoverSupplyIntakeRequests = onSchedule({
  schedule: "every 60 minutes", timeoutSeconds: 540, memory: "1GiB", maxInstances: 1,
}, async () => {
  const worker = deps();
  const now = worker.now().toISOString();
  const [queued, stale] = await Promise.all([
    worker.db.collection(supplyIntakeCollections.requests)
      .where("status", "==", "queued").limit(5).get(),
    worker.db.collection(supplyIntakeCollections.requests)
      .where("status", "==", "running").where("leaseUntil", "<", now).limit(5).get(),
  ]);
  for (const doc of [...queued.docs, ...stale.docs]) {
    const outcome = await processSupplyIntakeRequest(worker, doc.id);
    logger.info("Supply intake recovery attempt.", {requestId: doc.id, outcome});
  }
});
