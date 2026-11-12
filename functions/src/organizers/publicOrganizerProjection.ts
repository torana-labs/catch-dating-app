import {isDeepStrictEqual} from "node:util";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {validatePublicOrganizerDocument} from
  "../shared/generated/validators/publicOrganizerDocument";

/**
 * Public organizer projection (#1221).
 *
 * organizers/{id} holds contact details, host defaults, provenance, intake,
 * admin search, ownership, claim and source evidence. The apps read
 * publicOrganizers/{id} for everything a guest may see, so the canonical
 * document can be limited to the organizer's own team. Fields are copied by
 * allowlist: a field added to organizers later stays private until it is
 * deliberately listed here and in public_organizers.schema.json.
 */
export const PUBLIC_ORGANIZER_FIELDS = [
  "name", "description", "location", "locationCityId", "locationMarketId",
  "area", "cityName", "regionName", "countryCode", "countryName",
  "hostUserId", "hostName", "hostAvatarUrl", "ownerUserId", "hostUserIds",
  "hostProfiles", "createdAt", "imageUrl", "profileImageUrl",
  "organizerPhotos", "logoPhoto", "tags", "memberCount", "followerCount",
  "rating", "reviewCount", "verifiedReviewCount", "nextEventAt",
  "nextEventLabel", "instagramHandle", "status", "archived", "archivedAt",
  "appVisibility", "supplyCapabilities", "organizerType",
  "publicCategoryLabel", "entityKind", "entitySubtypes", "displayCategory",
  "synthetic", "seedPrefix",
] as const;

const COLLECTION = "publicOrganizers";

type Source = Record<string, unknown>;

function hasHost(source: Source): boolean {
  const ids = Array.isArray(source.hostUserIds) ? source.hostUserIds : [];
  return typeof source.ownerUserId === "string" ||
    typeof source.hostUserId === "string" ||
    ids.some((id) => typeof id === "string");
}

/**
 * Whether an organizer gets a public projection at all. Scraped, unclaimed
 * listings that the app hides have no host and no projection; the website
 * serves them from organizerPublicPages once they are published.
 * @param {Source | undefined} source The canonical organizer document.
 * @return {boolean} True when guests may read the organizer by id.
 */
export function publicOrganizerEligible(source: Source | undefined): boolean {
  if (!source) return false;
  if (source.status !== "active" && source.status !== "archived") {
    return false;
  }
  return source.appVisibility === "discoverable" || hasHost(source);
}

/**
 * Copies the public allowlist out of an organizer document.
 * @param {Source} source The canonical organizer document.
 * @return {Source} The public projection, before validation.
 */
export function projectPublicOrganizer(source: Source): Source {
  const projection: Source = {};
  for (const field of PUBLIC_ORGANIZER_FIELDS) {
    if (source[field] !== undefined) projection[field] = source[field];
  }
  return projection;
}

export type PublicOrganizerOutcome =
  "written" | "unchanged" | "removed" | "absent" | "invalid";

interface PublicOrganizerDeps {
  firestore: () => FirebaseFirestore.Firestore;
}

const defaultDeps: PublicOrganizerDeps = {
  firestore: () => admin.firestore(),
};

/**
 * Rebuilds publicOrganizers/{id} from the current organizer document inside
 * a transaction, so out-of-order trigger delivery cannot leave a stale copy.
 * An organizer that is ineligible, deleted or fails the public contract has
 * no projection.
 * @param {string} organizerId Organizer id.
 * @param {PublicOrganizerDeps} deps Injectable Firebase dependencies.
 * @return {Promise<PublicOrganizerOutcome>} What happened to the projection.
 */
export async function reconcilePublicOrganizer(organizerId: string,
  deps: PublicOrganizerDeps = defaultDeps): Promise<PublicOrganizerOutcome> {
  const db = deps.firestore();
  const sourceRef = db.collection("organizers").doc(organizerId);
  const publicRef = db.collection(COLLECTION).doc(organizerId);
  return db.runTransaction(async (tx) => {
    const [sourceSnap, publicSnap] =
      await Promise.all([tx.get(sourceRef), tx.get(publicRef)]);
    const source = sourceSnap.exists ?
      sourceSnap.data() as Source : undefined;
    if (!publicOrganizerEligible(source)) {
      if (!publicSnap.exists) return "absent";
      tx.delete(publicRef);
      return "removed";
    }
    const projection = projectPublicOrganizer(source as Source);
    if (!validatePublicOrganizerDocument(projection)) {
      logger.warn("Organizer fails the public contract; no projection.",
        {organizerId});
      if (publicSnap.exists) tx.delete(publicRef);
      return "invalid";
    }
    if (publicSnap.exists && isDeepStrictEqual(publicSnap.data(), projection)) {
      return "unchanged";
    }
    tx.set(publicRef, projection);
    return "written";
  });
}

export const syncPublicOrganizer = onDocumentWritten(
  "organizers/{organizerId}",
  async (event) => {
    await reconcilePublicOrganizer(event.params.organizerId);
  });

/**
 * Creates or refreshes the projection for every organizer. Dry run by
 * default. It writes only publicOrganizers documents and never changes an
 * organizers document.
 * @param {PublicOrganizerDeps} deps Injectable Firebase dependencies.
 * @param {boolean} apply Whether to write.
 * @return {Promise<Record<string, number>>} Counts by outcome.
 */
export async function backfillPublicOrganizers(deps: PublicOrganizerDeps,
  apply: boolean): Promise<Record<string, number>> {
  const db = deps.firestore();
  const counts: Record<string, number> = {};
  const count = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("organizers")
      .orderBy(admin.firestore.FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      if (apply) {
        count(await reconcilePublicOrganizer(doc.id, deps));
        continue;
      }
      const source = doc.data() as Source;
      if (!publicOrganizerEligible(source)) count("ineligible");
      else if (!validatePublicOrganizerDocument(
        projectPublicOrganizer(source))) count("invalid");
      else count("eligible");
    }
    if (page.docs.length < 200) break;
    cursor = page.docs[page.docs.length - 1];
  }
  return counts;
}
