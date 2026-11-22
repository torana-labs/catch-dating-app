import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {UpdateOrganizerCallablePayload} from
  "../shared/generated/updateOrganizerCallablePayload";
import {
  validateUpdateOrganizerCallablePayload,
} from "../shared/generated/validators/updateOrganizerInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {isOrganizerManager, isOrganizerOwner} from
  "../shared/organizerHosts";
import {
  normalizeOptionalUploadedPhotoForFirestore,
  normalizeUploadedPhotosForFirestore,
} from "../shared/uploadedPhotoNormalization";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {reserveOrganizerCanonicalRoute} from
  "../domain/organizers/organizerPublishingGuards";
import {defaultOrganizerPublicSlug} from "./organizerIdentity";
import {normalizeUpdateOrganizerPayload} from
  "./organizerPayloadNormalization";
import {
  deleteMediaStoragePaths,
  removedMediaStoragePaths,
} from "../shared/mediaStorageLifecycle";
import {hostOrganizerWomenLed, hostWomenLedRole} from "./womenLed";

interface OrganizerLifecycleDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp?: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
  deleteStoragePaths?: (paths: string[]) => Promise<void>;
}

const defaultDeps: OrganizerLifecycleDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  reserveCanonicalRoute: reserveOrganizerCanonicalRoute,
  deleteStoragePaths: deleteMediaStoragePaths,
};

export async function updateOrganizerHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerLifecycleDeps = defaultDeps
): Promise<{updated: boolean}> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpdateOrganizerCallablePayload>(
    request,
    validateUpdateOrganizerCallablePayload,
    normalizeUpdateOrganizerPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, actorUid, "updateOrganizer", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const deletedUserRef = db.collection("deletedUsers").doc(actorUid);
  let removedStoragePaths: string[] = [];

  await db.runTransaction(async (tx) => {
    const [organizerSnap, deletedUserSnap] = await Promise.all([
      tx.get(organizerRef),
      tx.get(deletedUserRef),
    ]);
    const organizer = assertCanUpdateOrganizer(
      organizerSnap,
      deletedUserSnap,
      actorUid,
      data.fields
    );
    const timestamp = deps.serverTimestamp?.() ??
      admin.firestore.FieldValue.serverTimestamp();
    let publicationIdentityPatch: Record<string, unknown> = {};
    if (data.fields.publicListingEnabled === true) {
      const route = organizerPublicationRoute(data.organizerId, organizer);
      await (deps.reserveCanonicalRoute ?? reserveOrganizerCanonicalRoute)(
        tx,
        db,
        {
          organizerId: data.organizerId,
          canonicalPath: route.canonicalPath,
          slug: route.slug,
          citySlug: route.citySlug,
          previousCanonicalPath: organizer.publicPage?.canonicalPath ?? null,
          adminUid: actorUid,
          source: "hostPublishOrganizer",
          serverTimestamp: () => timestamp,
        }
      );
      if (route.needsIdentityPatch) {
        publicationIdentityPatch = {
          "publicPage.slug": route.slug,
          "publicPage.citySlug": route.citySlug,
          "publicPage.canonicalPath": route.canonicalPath,
          "publicPage.seoTitle": null,
          "publicPage.seoDescription": null,
          "publicPage.lastRenderedAt": null,
        };
      }
    }
    const patch = organizerPatch(data.fields, actorUid, timestamp);
    Object.assign(patch, publicationIdentityPatch);
    if (data.fields.womenLed !== undefined) {
      const womenLed = hostOrganizerWomenLed(organizer.womenLed,
        data.fields.womenLed, {uid: actorUid,
          role: hostWomenLedRole(isOrganizerOwner(organizer, actorUid))},
        timestamp);
      if (womenLed) patch.womenLed = womenLed;
    }
    removedStoragePaths = removedMediaStoragePaths({
      before: organizer,
      after: {...organizer, ...patch},
      owner: {kind: "organizer", id: data.organizerId},
    });
    // A repeated women-led value alone leaves nothing to write.
    if (Object.keys(patch).length > 0) tx.update(organizerRef, patch);
  });
  await cleanupRemovedOrganizerMedia(
    deps,
    data.organizerId,
    removedStoragePaths
  );
  return {updated: true};
}

async function cleanupRemovedOrganizerMedia(
  deps: OrganizerLifecycleDeps,
  organizerId: string,
  paths: string[]
) {
  if (paths.length === 0) return;
  try {
    await deps.deleteStoragePaths?.(paths);
  } catch (error) {
    logger.error("Organizer media cleanup failed", {
      organizerId,
      paths,
      error,
    });
  }
}

function assertCanUpdateOrganizer(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  deletedUserSnap: FirebaseFirestore.DocumentSnapshot,
  actorUid: string,
  fields: UpdateOrganizerCallablePayload["fields"]
): OrganizerDocument {
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot manage organizers."
    );
  }
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  );
  if (fields.publicListingEnabled === true) {
    const requiredPublicFields = [
      organizer.name,
      organizer.description,
      organizer.location,
      organizer.area,
    ];
    if (requiredPublicFields.some((value) =>
      typeof value !== "string" || value.trim().length === 0
    )) {
      throw new HttpsError(
        "failed-precondition",
        "Add an organizer name, description, city, and area before publishing."
      );
    }
    // A page filled from a third party's public page stays unpublished
    // until its owner proves an identity that page named (owner decision,
    // 18 Nov 2026; importVerification in identityVerification/purposes.ts).
    if (organizer.importProvenance?.verification === "unverified") {
      throw new HttpsError(
        "failed-precondition",
        "Verify the Instagram or Luma page you imported before publishing.",
        {reason: "import_verification_required"}
      );
    }
  }
  if (isOrganizerOwner(organizer, actorUid)) return organizer;
  if (
    isOrganizerManager(organizer, actorUid) &&
    Object.keys(fields).every((field) =>
      field === "imageUrl" ||
      field === "profileImageUrl" ||
      field === "organizerPhotos" ||
      field === "logoPhoto" ||
      // Managers host the plans, so they may declare them women-led.
      field === "womenLed"
    )
  ) return organizer;
  throw new HttpsError(
    "permission-denied",
    "Only the organizer owner can change organizer identity."
  );
}

type OrganizerPublicationRouteSource = Pick<
  OrganizerDocument,
  "name" | "location" | "publicPage"
>;

interface OrganizerPublicationRoute {
  slug: string;
  citySlug: string;
  canonicalPath: string;
  needsIdentityPatch: boolean;
}

/**
 * Resolves or creates the stable route identity needed before Host can enable
 * an organizer website page. Legacy organizers may predate publicPage.
 * @param {string} organizerId Canonical organizer id.
 * @param {OrganizerPublicationRouteSource} organizer Current organizer data.
 * @return {OrganizerPublicationRoute} Existing or deterministic route data.
 */
export function organizerPublicationRoute(
  organizerId: string,
  organizer: OrganizerPublicationRouteSource
): OrganizerPublicationRoute {
  if (organizer.publicPage) {
    return {
      slug: organizer.publicPage.slug,
      citySlug: organizer.publicPage.citySlug,
      canonicalPath: organizer.publicPage.canonicalPath,
      needsIdentityPatch: false,
    };
  }
  const market = marketForIdOrAlias(organizer.location);
  if (!market) {
    throw new HttpsError(
      "failed-precondition",
      "Choose a supported organizer city before enabling the website page."
    );
  }
  const slug = defaultOrganizerPublicSlug(organizer.name, organizerId);
  return {
    slug,
    citySlug: market.slug,
    canonicalPath: `/organizers/${slug}/`,
    needsIdentityPatch: true,
  };
}

function organizerPatch(
  fields: UpdateOrganizerCallablePayload["fields"],
  actorUid: string,
  serverTimestamp: FirebaseFirestore.FieldValue
): Record<string, unknown> {
  const patch: Record<string, unknown> = {...fields};
  // Resolved against the stored declaration by the caller.
  delete patch.womenLed;
  if (fields.publicListingEnabled !== undefined) {
    delete patch.publicListingEnabled;
    Object.assign(
      patch,
      organizerPublicationPatch(fields.publicListingEnabled)
    );
  }
  if (fields.organizerType !== undefined) {
    patch.organizerTypeUpdatedAt = serverTimestamp;
    patch.organizerTypeUpdatedByUid = actorUid;
  }
  if (fields.location !== undefined) {
    const market = marketForIdOrAlias(fields.location);
    if (!market || !market.hostCreatable) {
      throw new HttpsError(
        "failed-precondition",
        "This city is not open for organizer creation yet."
      );
    }
    patch.location = market.marketId;
    patch.locationCityId = market.cityId;
    patch.locationMarketId = market.marketId;
    patch.cityName = market.cityLabel;
    patch.regionName = market.regionName;
    patch.countryCode = market.countryIsoCode;
    patch.countryName = market.countryName;
  }
  if (fields.organizerPhotos !== undefined) {
    const organizerPhotos = normalizeUploadedPhotosForFirestore(
      fields.organizerPhotos
    );
    patch.organizerPhotos = organizerPhotos;
    patch.imageUrl = primaryPhotoUrl(organizerPhotos);
  }
  if (fields.logoPhoto !== undefined) {
    const logoPhoto = normalizeOptionalUploadedPhotoForFirestore(
      fields.logoPhoto
    );
    patch.logoPhoto = logoPhoto;
    patch.profileImageUrl = thumbnailOrUrl(logoPhoto);
  }
  return patch;
}

export function organizerPublicationPatch(
  enabled: boolean
): Record<string, unknown> {
  if (enabled) {
    return {
      "appVisibility": "discoverable",
      "publicPage.publishStatus": "published",
      "publicPage.indexStatus": "indexReady",
      "publicPage.robots": "index, follow",
    };
  }
  return {
    "appVisibility": "hidden",
    "publicPage.publishStatus": "draft",
    "publicPage.indexStatus": "noindex",
    "publicPage.robots": "noindex, follow",
  };
}

function primaryPhotoUrl(photos: unknown[] | undefined): string | null {
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const first = photos[0];
  if (first === null || typeof first !== "object") return null;
  const url = (first as {url?: unknown}).url;
  return typeof url === "string" && url.trim().length > 0 ? url : null;
}

function thumbnailOrUrl(photo: unknown): string | null {
  if (photo === null || typeof photo !== "object") return null;
  const thumbnailUrl = (photo as {thumbnailUrl?: unknown}).thumbnailUrl;
  if (typeof thumbnailUrl === "string" && thumbnailUrl.trim().length > 0) {
    return thumbnailUrl;
  }
  const url = (photo as {url?: unknown}).url;
  return typeof url === "string" && url.trim().length > 0 ? url : null;
}

export const updateOrganizer = onCall(
  appCheckCallableOptions,
  (request) => updateOrganizerHandler(request)
);
