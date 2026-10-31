/* eslint-disable max-len */
import type {Firestore} from "firebase-admin/firestore";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import type {OrganizerReference, SupplyIntakeRequest} from "./runtime";

// The organizers a new listing is compared with: every organizer Catch keeps,
// in every city, whether or not its page is published. A listing in QA or
// draft, or an organizer created in the app with no page, is still the same
// organizer when a nomination names it again. The same Instagram account or
// link is the same organizer whichever city either record names, so the read
// is not limited to the request's city; the matcher weighs the city instead.
// The read is one bounded query that projects only the identity fields the
// matcher reads; contact, ownership and host fields never leave Firestore.

export const ORGANIZER_INVENTORY_LIMIT = 1_000;

/** The organizer document fields the matcher reads (see organizerReferenceFromDocument). */
export const ORGANIZER_INVENTORY_FIELDS = ["name", "instagramHandle", "publicPage.slug", "publicPage.citySlug",
  "publicSources", "location", "archived", "status"] as const;

export interface OrganizerInventory {
  organizers: OrganizerReference[];
  /** The city the read was limited to; always null now that every city is read. */
  citySlug: string | null;
  limit: number;
  /** True when the cap was reached, so some organizers were not compared. */
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
  // One past the cap tells a complete read from a truncated one.
  const snapshot = await db.collection("organizers").select(...ORGANIZER_INVENTORY_FIELDS).limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit).filter((doc) => !retired(doc.data()));
  return {
    organizers: docs.map((doc) => withCanonicalMarket(toReference(doc.id, doc.data()), doc.data())),
    citySlug: null,
    limit,
    truncated: snapshot.docs.length > limit,
  };
}

function retired(data: Record<string, unknown>): boolean {
  return data.archived === true || data.status === "archived";
}

/**
 * Pages name a city ("delhi"), records a market id ("in-dl-delhi-ncr") and
 * requests a market slug ("delhi-ncr"). The reference carries the market slug
 * the request uses, so the same city is never read as a different one.
 */
function withCanonicalMarket(reference: OrganizerReference, data: Record<string, unknown>): OrganizerReference {
  const page = data.publicPage as {citySlug?: unknown} | undefined;
  const market = [data.location, page?.citySlug].map((value) => typeof value === "string" ? marketForIdOrAlias(value) : null)
    .find((candidate) => candidate !== null);
  return market ? {...reference, markets: [market.slug]} : reference;
}
