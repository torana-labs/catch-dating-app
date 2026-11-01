/* eslint-disable max-len */
import {packagedEventPublication} from "../../operations/supplyIntake/eventPublication";
import {listingEventImportRow} from "../listingEventImports";
import {InboxSourceKind, projectListingEvent, sourceCollections} from "./model";
import {InboxSyncResult, syncInboxProjection, syncInboxSource} from "./store";

type Data = Record<string, unknown>;

/**
 * Projects the unpublished events of one completed, approved request into the
 * inbox. A published or withdrawn event is left to its own document's item.
 * Reads the organizer and each event, so it runs only once a request is approved.
 */
export async function syncListingEventItems(db: FirebaseFirestore.Firestore, requestId: string, data: Data,
  now: Date): Promise<InboxSyncResult[]> {
  if (data.status !== "completed" || !data.approval) return [];
  const runtime = await packagedEventPublication();
  const imported = await listingEventImportRow(db, runtime, requestId, data, "inbox-sync", now.toISOString());
  if (!imported) return [];
  const {row, citySlug} = imported;
  const results: InboxSyncResult[] = [];
  for (const event of row.events) {
    if (event.state === "published" || event.state === "withdrawn" || !event.eventId) continue;
    results.push(await syncInboxProjection(db, projectListingEvent({
      intakeRequestId: requestId, approvedAt: row.approvedAt, organizerName: row.organizer.name, citySlug,
      eventWorkItemId: event.eventWorkItemId, eventId: event.eventId, title: event.title, startAt: event.startAt,
      platform: event.platform, sourceUrl: event.sourceUrl, planState: event.state, blockers: event.blockers,
      findings: event.automatedFindings,
    }), now, db.collection(sourceCollections.externalEvent).doc(event.eventId)));
  }
  return results;
}

/** One source document's item, and the waiting events a request brings with it. */
export async function syncInboxDocument(db: FirebaseFirestore.Firestore, kind: InboxSourceKind, sourceId: string,
  data: Data | undefined, now: Date): Promise<InboxSyncResult[]> {
  const item = await syncInboxSource(db, kind, sourceId, data, now);
  if (kind !== "supplyIntakeRequest" || !data) return [item];
  return [item, ...await syncListingEventItems(db, sourceId, data, now)];
}
