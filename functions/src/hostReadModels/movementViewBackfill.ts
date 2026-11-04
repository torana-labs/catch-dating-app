import * as admin from "firebase-admin";
import {reconcileGroupProgressViews} from "./groupProgressViewStore";
import {reconcileDepartureView, rosterIdsForEvent} from "./departureViewStore";
import {reconcileCheckpointView} from "./checkpointViewStore";
import {
  defaultMovementViewDeps,
  MovementViewDeps,
  operableEvent,
} from "./movementViewSupport";

export const movementViewModels = ["group-progress-views",
  "departure-views", "checkpoint-views"] as const;
export type MovementViewModel = typeof movementViewModels[number];

export interface MovementViewBackfillReport {
  events: number;
  rosters: number;
  outcomes: Record<string, number>;
}

const eventPageSize = 100;

/**
 * Explicit organizer scope: every event of the organizer the live console
 * can still operate (it has an assistance format and has not ended), and for
 * the departure and checkpoint models every roster of those events. Without
 * apply it only counts them.
 */
export async function backfillMovementViews(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  model: MovementViewModel,
  apply: boolean,
  deps: MovementViewDeps = defaultMovementViewDeps
): Promise<MovementViewBackfillReport> {
  const report: MovementViewBackfillReport = {events: 0, rosters: 0,
    outcomes: {}};
  const count = (kind: string) => {
    report.outcomes[kind] = (report.outcomes[kind] ?? 0) + 1;
  };
  for await (const eventId of openEventIds(db, organizerId,
    deps.now().toMillis())) {
    report.events++;
    if (model === "group-progress-views") {
      if (!apply) continue;
      const outcome = await reconcileGroupProgressViews(db, eventId, deps);
      for (const kind of ["written", "unchanged", "removed"] as const) {
        report.outcomes[kind] = (report.outcomes[kind] ?? 0) + outcome[kind];
      }
      report.outcomes.invalidSource = (report.outcomes.invalidSource ?? 0) +
        outcome.invalidSource.length;
      continue;
    }
    for await (const rosterId of rosterIdsForEvent(db, eventId)) {
      report.rosters++;
      if (!apply) continue;
      count(model === "departure-views" ?
        (await reconcileDepartureView(db, rosterId, deps)).kind :
        (await reconcileCheckpointView(db, rosterId, deps)).kind);
    }
  }
  return report;
}

/** The organizer's events that are operable and not yet ended. */
async function* openEventIds(db: FirebaseFirestore.Firestore,
  organizerId: string, nowMillis: number): AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("events")
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(eventPageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const operable = operableEvent(doc.id, doc.data());
      if (operable && operable.endAtMillis > nowMillis) yield doc.id;
    }
    cursor = page.size === eventPageSize ? page.docs.at(-1) : undefined;
  } while (cursor);
}
