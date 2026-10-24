import {HttpsError} from "firebase-functions/v2/https";
import type {PublicRouteReservationDocument} from
  "../shared/generated/firestoreAdminTypes";

const organizerPathPattern =
  /^\/organizers\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/$/;

interface OrganizerPathParts {
  citySlug: string | null;
  slug: string;
}

export type OrganizerRouteReservationStatus =
  "missing" | "reserved" | "conflict";

type OrganizerRouteReservationSource =
  "createOrganizer" |
  "hostPublishOrganizer" |
  "adminCreateOrganizerDraftFromCandidate" |
  "adminApproveOrganizerListing" |
  "adminUpdateClubDetails" | "adminSetClubIndexStatus";

interface ReserveOrganizerCanonicalRouteOptions {
  clubId: string;
  canonicalPath: string;
  slug: string | null | undefined;
  citySlug: string | null | undefined;
  previousCanonicalPath?: string | null;
  adminUid: string;
  source: OrganizerRouteReservationSource;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

/**
 * Validates the canonical public path for an organizer listing.
 * @param {string | null | undefined} canonicalPath Public route path.
 * @param {string | null | undefined} slug Public page slug.
 * @param {string | null | undefined} citySlug Optional city slug.
 * @return {OrganizerPathParts} Parsed route parts.
 */
export function requireValidOrganizerCanonicalPath(
  canonicalPath: string | null | undefined,
  slug: string | null | undefined,
  citySlug: string | null | undefined
): OrganizerPathParts {
  const path = canonicalPath?.trim() ?? "";
  const match = organizerPathPattern.exec(path);
  if (!match) {
    throw new HttpsError(
      "invalid-argument",
      "Organizer canonical path must be /organizers/{slug}/ or " +
        "/organizers/{citySlug}/{slug}/."
    );
  }

  const firstSegment = match[1];
  const secondSegment = match[2] ?? null;
  const route = secondSegment ?
    {citySlug: firstSegment, slug: secondSegment} :
    {citySlug: null, slug: firstSegment};
  const expectedSlug = slug?.trim();
  if (expectedSlug && route.slug !== expectedSlug) {
    throw new HttpsError(
      "invalid-argument",
      "Organizer canonical path must end with publicPage.slug."
    );
  }

  const expectedCitySlug = citySlug?.trim();
  if (
    route.citySlug &&
    expectedCitySlug &&
    route.citySlug !== expectedCitySlug
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Organizer canonical path city segment must match publicPage.citySlug."
    );
  }

  return route;
}

/**
 * Converts an organizer canonical route into its reservation document id.
 * @param {string} canonicalPath Public route path.
 * @return {string} Deterministic reservation document id.
 */
export function organizerRouteReservationId(canonicalPath: string): string {
  return normalizedOrganizerPath(canonicalPath)
    .split("/")
    .filter(Boolean)
    .join("__");
}

/**
 * Reads route reservation state for the organizer list view.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {string} clubId Current club document id.
 * @param {string} canonicalPath Public route path.
 * @return {Promise<OrganizerRouteReservationStatus>} Reservation status.
 */
export async function readOrganizerRouteReservationStatus(
  db: FirebaseFirestore.Firestore,
  clubId: string,
  canonicalPath: string
): Promise<OrganizerRouteReservationStatus> {
  const routeKey = organizerRouteReservationId(canonicalPath);
  const snap = await db.collection("publicRouteReservations")
    .doc(routeKey)
    .get();
  if (!snap.exists) return "missing";
  const reservation = snap.data() as
    PublicRouteReservationDocument | undefined;
  if (!reservation || reservation.status !== "active") return "missing";
  const targetPath = `organizers/${clubId}`;
  return reservation.targetPath === targetPath &&
    reservation.routePath === normalizedOrganizerPath(canonicalPath) ?
    "reserved" :
    "conflict";
}

/**
 * Transactionally claims the canonical public route for an organizer.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {ReserveOrganizerCanonicalRouteOptions} options Reservation options.
 * @return {Promise<void>} Completes when the route is reserved.
 */
export async function reserveOrganizerCanonicalRoute(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  options: ReserveOrganizerCanonicalRouteOptions
): Promise<void> {
  const route = requireValidOrganizerCanonicalPath(
    options.canonicalPath,
    options.slug,
    options.citySlug
  );
  const routePath = normalizedOrganizerPath(options.canonicalPath);
  await assertOrganizerCanonicalPathAvailable(
    tx,
    db,
    options.clubId,
    routePath
  );

  const targetPath = `organizers/${options.clubId}`;
  const routeKey = organizerRouteReservationId(routePath);
  const reservationRef = db.collection("publicRouteReservations").doc(routeKey);
  const previousRouteKey = previousReservationId(
    options.previousCanonicalPath,
    routePath
  );
  const previousReservationRef = previousRouteKey ?
    db.collection("publicRouteReservations").doc(previousRouteKey) :
    null;

  const reservationSnap = await tx.get(reservationRef);
  const previousReservationSnap = previousReservationRef ?
    await tx.get(previousReservationRef) :
    null;
  const existing = reservationSnap.data() as
    PublicRouteReservationDocument | undefined;
  if (existing?.status === "active" &&
      (
        existing.targetPath !== targetPath ||
        existing.routePath !== routePath
      )) {
    throw new HttpsError(
      "already-exists",
      `Organizer canonical route is already reserved by ${existing.targetPath}.`
    );
  }

  const timestamp = options.serverTimestamp();
  const reservationPatch: Record<string, unknown> = {
    routeKey,
    routePath,
    routeKind: "organizerCanonical",
    routeSegments: routePath.split("/").filter(Boolean),
    status: "active",
    ownerType: "organizer",
    ownerCollection: "organizers",
    ownerId: options.clubId,
    targetPath,
    slug: route.slug,
    citySlug: route.citySlug,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastVerifiedAt: timestamp,
    lastVerifiedByUid: options.adminUid,
    lastVerifiedSource: options.source,
    releasedAt: null,
    releasedByUid: null,
    replacementRoutePath: null,
  };

  const previousReservation = previousReservationSnap?.data() as
    PublicRouteReservationDocument | undefined;
  if (previousReservationRef &&
      previousReservation?.status === "active" &&
      previousReservation.targetPath === targetPath) {
    tx.set(previousReservationRef, {
      status: "released",
      updatedAt: timestamp,
      releasedAt: timestamp,
      releasedByUid: options.adminUid,
      replacementRoutePath: routePath,
    }, {merge: true});
  }

  tx.set(reservationRef, reservationPatch, {merge: true});
}

/**
 * Verifies no other club document owns this canonical organizer path.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {string} clubId Current club document id.
 * @param {string} canonicalPath Public route path.
 * @return {Promise<void>} Completes when the path is available.
 */
export async function assertOrganizerCanonicalPathAvailable(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  clubId: string,
  canonicalPath: string
): Promise<void> {
  const query = db
    .collection("organizers")
    .where("publicPage.canonicalPath", "==", canonicalPath)
    .limit(2);
  const existing = await tx.get(query);
  const conflict = existing.docs.find((doc) => doc.id !== clubId);
  if (conflict) {
    throw new HttpsError(
      "already-exists",
      `Organizer canonical path is already used by ${conflict.id}.`
    );
  }
}

/**
 * Normalizes route text into a canonical slash-wrapped path.
 * @param {string} canonicalPath Public route path.
 * @return {string} Trimmed route path.
 */
function normalizedOrganizerPath(canonicalPath: string): string {
  return canonicalPath.trim();
}

/**
 * Safely derives the previous reservation id when the old route is valid.
 * @param {string | null | undefined} previousCanonicalPath Previous route.
 * @param {string} nextCanonicalPath Next route.
 * @return {string | null} Previous reservation document id.
 */
function previousReservationId(
  previousCanonicalPath: string | null | undefined,
  nextCanonicalPath: string
): string | null {
  const previousPath = previousCanonicalPath?.trim();
  if (!previousPath || previousPath === nextCanonicalPath) return null;
  if (!organizerPathPattern.test(previousPath)) return null;
  return organizerRouteReservationId(previousPath);
}
