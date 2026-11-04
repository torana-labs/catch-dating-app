import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  HostEventSetupDefaultViewDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  EventSetupDefaultsDependencies,
  projectManagerEventSetupDefaults,
} from "../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../organizers/eventSetupDefaults/dependencies";

export const eventSetupDefaultViewsCollection = "hostEventSetupDefaultViews";

export type EventSetupDefaultViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {
    kind: "invalidSource";
    incompleteSource: string;
    detail: string;
    revision: number;
    written: boolean;
  };

export interface EventSetupDefaultViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
  /** The same preference policy the defaults commands bind. */
  defaults: (db: FirebaseFirestore.Firestore) =>
    Pick<EventSetupDefaultsDependencies, "validateAndHashPreferences">;
}

const defaultDeps: EventSetupDefaultViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
  defaults: eventSetupDefaultsDependencies,
};

type ManagerDefaults = NonNullable<HostEventSetupDefaultViewDocument["view"]>;

/**
 * Re-evaluates hostEventSetupDefaultViews/{organizerId} from the organizer
 * and its organizerEventSetupDefaults document in one transaction, with the
 * projection and hashes the defaults commands are fenced by. Writes only
 * when the projection changed. A failed-precondition or invalid-argument
 * from the projection records sourceCoverage invalidSource and keeps the
 * previous view, so a trigger never retries forever on it; any other error
 * throws, so the trigger retries. An organizer that is gone has no view.
 */
export async function reconcileEventSetupDefaultView(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  deps: EventSetupDefaultViewStoreDeps = defaultDeps
): Promise<EventSetupDefaultViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<EventSetupDefaultViewOutcome> => {
    const viewRef = db.collection(eventSetupDefaultViewsCollection)
      .doc(organizerId);
    const [organizerSnap, defaultsSnap, viewSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(db.collection("organizerEventSetupDefaults").doc(organizerId)),
      tx.get(viewRef),
    ]);
    if (!organizerSnap.exists) {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const previous = viewSnap.exists ?
      viewSnap.data() as HostEventSetupDefaultViewDocument : null;
    const raw = defaultsSnap.data();
    let view: ManagerDefaults | null;
    let invalid: {source: string; detail: string} | null = null;
    try {
      view = projectManagerEventSetupDefaults(organizerId,
        organizerSnap.data() as OrganizerDocument, raw,
        {...deps.defaults(db), db,
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp}
      ) as ManagerDefaults;
    } catch (error) {
      if (!(error instanceof HttpsError) || !["failed-precondition",
        "invalid-argument"].includes(error.code)) throw error;
      // The defaults document owns every preference; without one only the
      // organizer's legacy hostDefaults can be malformed.
      invalid = {source: raw === undefined ? "organizers" :
        "organizerEventSetupDefaults", detail: error.message};
      view = previous?.view ?? null;
    }
    const next = {
      sourceCoverage: invalid === null ? "complete" as const :
        "invalidSource" as const,
      incompleteSource: invalid?.source ?? null,
      view,
    };
    const previousRevision = Number.isSafeInteger(previous?.revision) &&
      (previous?.revision as number) > 0 ? previous!.revision : 0;
    const unchanged = previous !== null && isDeepStrictEqual({
      sourceCoverage: previous.sourceCoverage,
      incompleteSource: previous.incompleteSource,
      view: previous.view,
    }, next);
    const revision = unchanged ? previousRevision : previousRevision + 1;
    if (!unchanged) {
      const document: HostEventSetupDefaultViewDocument = {
        schemaVersion: 1,
        organizerId,
        revision,
        evaluatedAt: deps.now(),
        ...next,
      };
      tx.set(viewRef, document);
    }
    if (invalid !== null) {
      return {kind: "invalidSource", incompleteSource: invalid.source,
        detail: invalid.detail, revision, written: !unchanged};
    }
    return unchanged ? {kind: "unchanged", revision} :
      {kind: "complete", revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host event setup defaults view read an invalid source.", {
      organizerId,
      incompleteSource: outcome.incompleteSource,
      detail: outcome.detail,
    });
  }
  return outcome;
}

export interface EventSetupDefaultViewBackfillReport {
  viewExists: boolean;
  outcome: EventSetupDefaultViewOutcome | null;
}

/** Explicit organizer scope. Without apply it only reports current state. */
export async function backfillEventSetupDefaultView(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean
): Promise<EventSetupDefaultViewBackfillReport> {
  const outcome = apply ?
    await reconcileEventSetupDefaultView(db, organizerId) : null;
  const view = await db.collection(eventSetupDefaultViewsCollection)
    .doc(organizerId).get();
  return {viewExists: view.exists, outcome};
}
