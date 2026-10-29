/* eslint-disable max-len */
import type {Firestore} from "firebase-admin/firestore";
import type {OrganizerReference, SupplyIntakeRequest} from "./runtime";

// The organizers a new listing is compared with: every organizer whose public
// page is published (claimed or still claimable), in the request's city when
// the request names one. The read is one bounded query that projects only the
// identity fields the matcher reads; contact, ownership and host fields never
// leave Firestore.

export const ORGANIZER_INVENTORY_LIMIT = 1_000;

/** The organizer document fields the matcher reads (see organizerReferenceFromDocument). */
export const ORGANIZER_INVENTORY_FIELDS = ["name", "instagramHandle", "publicPage.slug", "publicPage.citySlug",
  "publicSources"] as const;

// A front door records a city it could not place as "unassigned"; such a
// request is compared with every published organizer, up to the same cap.
const UNASSIGNED_MARKET = "unassigned";

export interface OrganizerInventory {
  organizers: OrganizerReference[];
  /** The city the read was limited to, or null when it read every city. */
  citySlug: string | null;
  limit: number;
  /** True when the cap was reached, so some published organizers were not compared. */
  truncated: boolean;
}

/**
 * Reads the inventory for one request, or returns null when the request must
 * not be compared: an event refresh already names the organizer it reads
 * events for, so matching would only find that organizer again.
 */
export async function loadOrganizerInventory(db: Firestore, request: SupplyIntakeRequest,
  toReference: (organizerId: string, document: unknown) => OrganizerReference,
  limit = ORGANIZER_INVENTORY_LIMIT): Promise<OrganizerInventory | null> {
  if (request.kind === "event_refresh") return null;
  const citySlug = request.market === UNASSIGNED_MARKET ? null : request.market;
  let query = db.collection("organizers").where("publicPage.publishStatus", "==", "published");
  if (citySlug) query = query.where("publicPage.citySlug", "==", citySlug);
  // One past the cap tells a full city from a truncated one.
  const snapshot = await query.select(...ORGANIZER_INVENTORY_FIELDS).limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    organizers: docs.map((doc) => toReference(doc.id, doc.data())),
    citySlug,
    limit,
    truncated: snapshot.docs.length > limit,
  };
}
