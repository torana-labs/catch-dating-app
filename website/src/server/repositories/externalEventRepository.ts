import {withoutExternalDatingFraming} from "../../features/organizers/publicDatingFraming";
import type {HostListingExternalEvent} from "../../features/organizers/types";
import {publicExternalEvent} from "../publicExternalEvent";
import {readBounded, type PublicDocument, type PublicReader} from "./publicReader";

const listBound = 400;
const organizerBound = 200;

export interface PublicExternalEventRow {
  organizerId: string;
  event: HostListingExternalEvent;
}

function project(docs: readonly PublicDocument[]): PublicExternalEventRow[] {
  return docs.flatMap((doc) => {
    const row = publicExternalEvent(doc.id, doc.data() as Record<string, unknown>);
    return row ? [{...row, event: withoutExternalDatingFraming(row.event)}] : [];
  });
}

/** Every public external event, for discovery and the sitemap. */
export async function listPublicExternalEvents(db: PublicReader): Promise<PublicExternalEventRow[]> {
  const query = db.collection("externalEvents").where("publicationStatus", "==", "public");
  return project(await readBounded(query, listBound));
}

/** One organizer's public external events, matched on the projected canonical host. */
export async function listPublicExternalEventsForOrganizer(
  db: PublicReader,
  organizerId: string
): Promise<PublicExternalEventRow[]> {
  const query = db.collection("externalEvents")
    .where("canonicalHostId", "==", organizerId)
    .where("publicationStatus", "==", "public");
  return project(await readBounded(query, organizerBound))
    .filter((row) => row.organizerId === organizerId);
}

export async function findPublicExternalEvent(
  db: PublicReader,
  eventId: string
): Promise<PublicExternalEventRow | null> {
  const snapshot = await db.collection("externalEvents").doc(eventId).get();
  return snapshot.exists ? project([snapshot])[0] ?? null : null;
}
