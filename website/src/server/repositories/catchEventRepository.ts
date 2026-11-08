import {
  projectLivePublicCatchEvent,
  type LivePublicCatchEvent,
} from "../../features/organizers/publicCatchEventProjection";
import {withoutDatingFraming} from "../../features/organizers/publicDatingFraming";
import {publicEventAuthorized, publicEventListed} from "../publicReadPolicy";
import {readBounded, type PublicDocument, type PublicReader} from "./publicReader";

const listBound = 400;
const organizerBound = 200;

function project(docs: readonly PublicDocument[], readAt: number,
  {listedOnly}: {listedOnly: boolean}): LivePublicCatchEvent[] {
  return docs.flatMap((doc) => {
    const raw = doc.data();
    if (!publicEventAuthorized(doc.id, raw)) return [];
    // Lists leave out link-only events; the event's own page still serves it.
    if (listedOnly && !publicEventListed(raw)) return [];
    const row = projectLivePublicCatchEvent(doc.id, raw, readAt);
    return row ? [{...row, event: withoutDatingFraming(row.event)}] : [];
  });
}

/** Every published, listed Catch event, for discovery and the sitemap. */
export async function listPublishedCatchEvents(
  db: PublicReader,
  readAt: number
): Promise<LivePublicCatchEvent[]> {
  const query = db.collection("events").where("publicationState", "==", "published");
  return project(await readBounded(query, listBound), readAt, {listedOnly: true});
}

/** One organizer's published, listed Catch events. */
export async function listPublishedCatchEventsForOrganizer(
  db: PublicReader,
  organizerId: string,
  readAt: number
): Promise<LivePublicCatchEvent[]> {
  const reads = await readBounded(db.collection("events")
    .where("organizerId", "==", organizerId)
    .where("publicationState", "==", "published"), organizerBound);
  // Document-id order, as the full collection read returns them.
  const docs = [...reads].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return project(docs, readAt, {listedOnly: true})
    .filter((row) => row.organizerId === organizerId);
}

export async function findPublishedCatchEvent(
  db: PublicReader,
  eventId: string,
  readAt: number
): Promise<LivePublicCatchEvent | null> {
  const snapshot = await db.collection("events").doc(eventId).get();
  return snapshot.exists ? project([snapshot], readAt, {listedOnly: false})[0] ?? null : null;
}
