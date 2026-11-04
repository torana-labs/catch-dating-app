import * as admin from "firebase-admin";
import {reconcileAccountabilityView} from "./accountabilityViewStore";
import {reconcileMembershipView} from "./membershipViewStore";
import {reconcileSettingViews} from "./settingViewStore";
import {reconcileRuntimeView} from "./runtimeViewStore";
import {
  defaultGuestViewDeps,
  GuestViewDeps,
  maxEventAttendees,
  operableEvent,
} from "./guestViewSupport";

export const guestViewModels = ["accountability-views", "membership-views",
  "setting-views", "runtime-views"] as const;
export type GuestViewModel = typeof guestViewModels[number];

export interface GuestViewBackfillReport {
  events: number;
  attendees: number;
  outcomes: Record<string, number>;
}

const pageSize = 100;

/**
 * Explicit organizer scope: every event of the organizer the live console
 * can still operate (it has an assistance format and has not ended), and for
 * the accountability and membership models every attendee of those events.
 * Without apply it only counts them.
 */
export async function backfillGuestViews(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  model: GuestViewModel,
  apply: boolean,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<GuestViewBackfillReport> {
  const report: GuestViewBackfillReport = {events: 0, attendees: 0,
    outcomes: {}};
  const count = (kind: string, by = 1) => {
    report.outcomes[kind] = (report.outcomes[kind] ?? 0) + by;
  };
  const now = deps.now().toMillis();
  for await (const eventId of pages(db.collection("events")
    .where("organizerId", "==", organizerId), (doc) => {
    const operable = operableEvent(doc.id, doc.data());
    return operable !== null && operable.endAtMillis > now;
  })) {
    report.events++;
    if (model === "setting-views" || model === "runtime-views") {
      if (!apply) continue;
      if (model === "runtime-views") {
        count((await reconcileRuntimeView(db, eventId, deps)).kind);
        continue;
      }
      const outcome = await reconcileSettingViews(db, eventId, deps);
      count("written", outcome.written);
      count("unchanged", outcome.unchanged);
      count("removed", outcome.removed);
      count("invalidSource", outcome.invalidSource.length);
      continue;
    }
    let attendees = 0;
    for await (const attendeeId of pages(db.collection("eventAttendees")
      .where("eventId", "==", eventId), () => true)) {
      if (attendees++ >= maxEventAttendees) break;
      report.attendees++;
      if (!apply) continue;
      count(model === "accountability-views" ?
        (await reconcileAccountabilityView(db, eventId, attendeeId, deps))
          .kind :
        (await reconcileMembershipView(db, eventId, attendeeId, deps)).kind);
    }
  }
  return report;
}

async function* pages(query: FirebaseFirestore.Query,
  keep: (doc: FirebaseFirestore.QueryDocumentSnapshot) => boolean):
  AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let page = query.orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (cursor) page = page.startAfter(cursor);
    const snapshot = await page.get();
    for (const doc of snapshot.docs) if (keep(doc)) yield doc.id;
    cursor = snapshot.size === pageSize ? snapshot.docs.at(-1) : undefined;
  } while (cursor);
}
