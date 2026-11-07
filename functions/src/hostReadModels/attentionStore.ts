import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  OrganizerAttentionItemDocument,
  OrganizerAttentionScheduleDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  hostAttentionPolicyCatalog,
} from "../shared/generated/catalogs/hostAttentionPolicyCatalog";
import {requireDoc} from "../shared/validation";
import {
  AttentionOrganizerMissingError,
  attentionResolutionPatch,
  AttentionSourceInvalidError,
  AttentionSourceOverCapError,
  buildOrganizerAttentionProjectionPlan,
  loadOrganizerAttentionSources,
  maxAttentionSourceRows,
  transactionAttentionReader,
} from "../organizers/organizerAttention";
import {
  deriveOrganizerAttention,
  OrganizerAttentionSources,
} from "../organizers/organizerAttentionPolicy";

/** One evaluation writes at most this many attention rows, plus the
 *  schedule document. More is recorded as over cap, never split. */
export const maxAttentionMutations = 450;
const incompleteRetryMillis = 60 * 60 * 1000;
const itemsCollection = "organizerAttentionItems";
const schedulesCollection = "organizerAttentionSchedules";

export type AttentionReconcileOutcome =
  | {kind: "organizerMissing"; resolved: number}
  | {kind: "overCap"; incompleteSource: string; revision: number}
  | {
    kind: "invalidSource";
    source: string;
    detail: string;
    revision: number;
  }
  | {
    kind: "complete";
    sets: number;
    resolutions: number;
    openItemCount: number;
    nextEvaluationAtMillis: number | null;
    revision: number;
  };

export interface AttentionStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: AttentionStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

/**
 * Re-evaluates one organizer's Today attention queue from current sources in
 * one transaction: the twelve bounded source reads, the open rows, the
 * desired rows and the schedule document, then only the rows that changed
 * and the schedule. A source over the cap, or a source row that fails
 * validation, records the schedule alone and leaves the rows as they were,
 * so a trigger never retries forever on it. Any other error throws, so the
 * trigger retries.
 */
export async function reconcileOrganizerAttention(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  deps: AttentionStoreDeps = defaultDeps
): Promise<AttentionReconcileOutcome> {
  const outcome = await db.runTransaction(async (tx) => {
    // Every attempt evaluates at its own time.
    const now = deps.now();
    const items = db.collection(itemsCollection);
    const scheduleRef = db.collection(schedulesCollection).doc(organizerId);
    let sources: OrganizerAttentionSources | null = null;
    let overCapSource: string | null = null;
    let invalid: AttentionSourceInvalidError | null = null;
    let organizerMissing = false;
    try {
      sources = await loadOrganizerAttentionSources(
        db, organizerId, now, transactionAttentionReader(tx)
      );
    } catch (error) {
      if (error instanceof AttentionOrganizerMissingError) {
        organizerMissing = true;
      } else if (error instanceof AttentionSourceOverCapError) {
        overCapSource = error.source;
      } else if (error instanceof AttentionSourceInvalidError) {
        invalid = error;
      } else {
        throw error;
      }
    }
    /* firestore-index: organizerAttentionItems (
      organizerId:ASCENDING, status:ASCENDING, dueAt:ASCENDING,
      __name__:ASCENDING
    ) */
    const openSnapshot = await tx.get(items
      .where("organizerId", "==", organizerId)
      .where("status", "==", "open")
      .orderBy("dueAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1));
    const scheduleSnap = await tx.get(scheduleRef);

    if (organizerMissing) {
      let resolved = 0;
      for (const doc of openSnapshot.docs) {
        const current = requireDoc<OrganizerAttentionItemDocument>(
          doc, "OrganizerAttentionItemDocument"
        );
        if (current.status !== "open") continue;
        tx.update(items.doc(doc.id), attentionResolutionPatch(current, now));
        resolved++;
      }
      if (scheduleSnap.exists) tx.delete(scheduleRef);
      return {kind: "organizerMissing" as const, resolved};
    }

    const revision = previousRevision(scheduleSnap) + 1;
    const recordIncomplete = (
      sourceCoverage: "overCap" | "invalidSource",
      source: string
    ) => tx.set(scheduleRef, scheduleDocument({
      organizerId,
      revision,
      now,
      nextEvaluationAtMillis: now.toMillis() + incompleteRetryMillis,
      sourceCoverage,
      incompleteSource: source,
      openItemCount: openSnapshot.size,
    }));
    const recordOverCap = (source: string): AttentionReconcileOutcome => {
      recordIncomplete("overCap", source);
      return {kind: "overCap", incompleteSource: source, revision};
    };
    if (invalid !== null) {
      recordIncomplete("invalidSource", invalid.source);
      return {
        kind: "invalidSource" as const,
        source: invalid.source,
        detail: invalid.detail,
        revision,
      };
    }
    if (overCapSource !== null || sources === null) {
      return recordOverCap(overCapSource ?? "unknown");
    }
    if (openSnapshot.size > maxAttentionSourceRows) {
      return recordOverCap(itemsCollection);
    }
    const derivation = deriveOrganizerAttention({
      organizerId,
      nowMillis: now.toMillis(),
      sources,
    });
    if (derivation.items.length > maxAttentionSourceRows) {
      return recordOverCap("derivedItems");
    }

    const desiredRefs = derivation.items.map((item) =>
      items.doc(item.attentionId));
    const desiredSnapshots = desiredRefs.length > 0 ?
      await tx.getAll(...desiredRefs) : [];
    const existing = new Map<string, OrganizerAttentionItemDocument>();
    for (const doc of [...openSnapshot.docs, ...desiredSnapshots]) {
      if (doc.exists) {
        existing.set(doc.id, requireDoc<OrganizerAttentionItemDocument>(
          doc, "OrganizerAttentionItemDocument"
        ));
      }
    }
    const plan = buildOrganizerAttentionProjectionPlan({
      organizerId,
      now,
      desired: derivation.items,
      existing,
      openIds: openSnapshot.docs.map((doc) => doc.id),
    });
    if (plan.sets.length + plan.resolutions.length > maxAttentionMutations) {
      return recordOverCap("mutations");
    }
    for (const entry of plan.sets) {
      tx.set(items.doc(entry.attentionId), entry.document);
    }
    for (const entry of plan.resolutions) {
      tx.update(items.doc(entry.attentionId), entry.patch);
    }
    tx.set(scheduleRef, scheduleDocument({
      organizerId,
      revision,
      now,
      nextEvaluationAtMillis: derivation.nextChangeAtMillis,
      sourceCoverage: "complete",
      incompleteSource: null,
      openItemCount: derivation.items.length,
    }));
    return {
      kind: "complete" as const,
      sets: plan.sets.length,
      resolutions: plan.resolutions.length,
      openItemCount: derivation.items.length,
      nextEvaluationAtMillis: derivation.nextChangeAtMillis,
      revision,
    };
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "overCap") {
    logger.error("Host Today attention evaluation is over its cap.", {
      organizerId,
      incompleteSource: outcome.incompleteSource,
    });
  } else if (outcome.kind === "invalidSource") {
    logger.error("Host Today attention evaluation read an invalid source.", {
      organizerId,
      source: outcome.source,
      detail: outcome.detail,
    });
  }
  return outcome;
}

export interface AttentionBackfillReport {
  openItemCount: number;
  scheduleExists: boolean;
  outcome: AttentionReconcileOutcome | null;
}

/** Explicit organizer scope. Without apply it only reports current state. */
export async function backfillOrganizerAttention(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean
): Promise<AttentionBackfillReport> {
  const outcome = apply ?
    await reconcileOrganizerAttention(db, organizerId) : null;
  const [open, schedule] = await Promise.all([
    db.collection(itemsCollection)
      .where("organizerId", "==", organizerId)
      .where("status", "==", "open")
      .count().get(),
    db.collection(schedulesCollection).doc(organizerId).get(),
  ]);
  return {
    openItemCount: open.data().count,
    scheduleExists: schedule.exists,
    outcome,
  };
}

export const sweepPageSize = 100;
export const maxSweepOrganizers = 200;
export const sweepConcurrency = 5;

export interface AttentionSweepDeps {
  now: () => FirebaseFirestore.Timestamp;
  reconcile: (
    db: FirebaseFirestore.Firestore,
    organizerId: string
  ) => Promise<unknown>;
}

export interface AttentionSweepReport {
  evaluated: number;
  failed: number;
  remaining: boolean;
}

/**
 * Re-evaluates organizers whose queue can change with time and no source
 * write. Each evaluation rewrites nextEvaluationAt, so rereading the first
 * page advances on its own; an organizer is attempted at most once a run.
 */
export async function sweepDueOrganizerAttention(
  db: FirebaseFirestore.Firestore,
  deps: AttentionSweepDeps = {
    now: defaultDeps.now,
    reconcile: (database, organizerId) =>
      reconcileOrganizerAttention(database, organizerId),
  }
): Promise<AttentionSweepReport> {
  const attempted = new Set<string>();
  let failed = 0;
  const dueIds = async (): Promise<{ids: string[]; full: boolean}> => {
    const page = await db.collection(schedulesCollection)
      .where("nextEvaluationAt", "<=", deps.now())
      .orderBy("nextEvaluationAt")
      .limit(sweepPageSize)
      .get();
    return {
      ids: page.docs.map((doc) => doc.id)
        .filter((id) => !attempted.has(id)),
      full: page.size === sweepPageSize,
    };
  };
  while (attempted.size < maxSweepOrganizers) {
    const page = await dueIds();
    const ids = page.ids.slice(0, maxSweepOrganizers - attempted.size);
    if (ids.length === 0) break;
    for (let offset = 0; offset < ids.length; offset += sweepConcurrency) {
      const batch = ids.slice(offset, offset + sweepConcurrency);
      for (const id of batch) attempted.add(id);
      const results = await Promise.allSettled(batch.map((organizerId) =>
        deps.reconcile(db, organizerId)));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") return;
        failed++;
        logger.error("Host Today attention sweep could not evaluate.", {
          organizerId: batch[index],
          error: String(result.reason),
        });
      });
    }
    if (!page.full) break;
  }
  const remaining = attempted.size >= maxSweepOrganizers &&
    (await dueIds()).ids.length > 0;
  if (remaining) {
    logger.warn("Host Today attention sweep left due organizers.", {
      evaluated: attempted.size,
    });
  }
  return {evaluated: attempted.size - failed, failed, remaining};
}

function previousRevision(
  snapshot: FirebaseFirestore.DocumentSnapshot
): number {
  const revision = snapshot.data()?.revision;
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 0;
}

function scheduleDocument(params: {
  organizerId: string;
  revision: number;
  now: FirebaseFirestore.Timestamp;
  nextEvaluationAtMillis: number | null;
  sourceCoverage: OrganizerAttentionScheduleDocument["sourceCoverage"];
  incompleteSource: string | null;
  openItemCount: number;
}): OrganizerAttentionScheduleDocument {
  return {
    schemaVersion: 1,
    organizerId: params.organizerId,
    policyVersion: hostAttentionPolicyCatalog.policyVersion,
    revision: params.revision,
    evaluatedAt: params.now,
    nextEvaluationAt: params.nextEvaluationAtMillis === null ? null :
      admin.firestore.Timestamp.fromMillis(params.nextEvaluationAtMillis),
    sourceCoverage: params.sourceCoverage,
    incompleteSource: params.incompleteSource,
    openItemCount: params.openItemCount,
  };
}
