import {
  projectLivePublicCatchEvent,
  type LivePublicCatchEvent,
} from "../../features/organizers/publicCatchEventProjection";
import {withoutDatingFraming} from "../../features/organizers/publicDatingFraming";
import {publicEventAuthorized} from "../publicReadPolicy";
import {readBounded, type PublicDocument, type PublicReader} from "./publicReader";

const listBound = 400;
const organizerBound = 200;

function project(docs: readonly PublicDocument[], readAt: number): LivePublicCatchEvent[] {
  return docs.flatMap((doc) => {
    const raw = doc.data();
    if (!publicEventAuthorized(doc.id, raw)) return [];
    const row = projectLivePublicCatchEvent(doc.id, raw, readAt);
    return row ? [{...row, event: withoutDatingFraming(row.event)}] : [];
  });
}

/** Every published Catch event, for discovery and the sitemap. */
export async function listPublishedCatchEvents(
  db: PublicReader,
  readAt: number
): Promise<LivePublicCatchEvent[]> {
  const query = db.collection("events").where("publicationState", "==", "published");
  return project(await readBounded(query, listBound), readAt);
}

/**
 * One organizer's published Catch events. Events that still carry only the
 * legacy `clubId` match too, as they do in the full catalog read.
 */
export async function listPublishedCatchEventsForOrganizer(
  db: PublicReader,
  organizerId: string,
  readAt: number
): Promise<LivePublicCatchEvent[]> {
  const reads = await Promise.all(["organizerId", "clubId"].map((field) =>
    readBounded(db.collection("events")
      .where(field, "==", organizerId)
      .where("publicationState", "==", "published"), organizerBound)));
  const byId = new Map<string, PublicDocument>();
  for (const doc of reads.flat()) byId.set(doc.id, doc);
  // Document-id order, as the full collection read returns them.
  const docs = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return project(docs, readAt).filter((row) => row.organizerId === organizerId);
}

export async function findPublishedCatchEvent(
  db: PublicReader,
  eventId: string,
  readAt: number
): Promise<LivePublicCatchEvent | null> {
  const snapshot = await db.collection("events").doc(eventId).get();
  return snapshot.exists ? project([snapshot], readAt)[0] ?? null : null;
}
