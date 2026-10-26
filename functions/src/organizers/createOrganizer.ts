import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {CreateOrganizerCallablePayload} from
  "../shared/generated/createOrganizerCallablePayload";
import {
  validateCreateOrganizerCallablePayload,
} from "../shared/generated/validators/createOrganizerInput";
import {validateCallableWithAjv} from "../shared/validation";
import {
  normalizeOptionalUploadedPhotoForFirestore,
  normalizeUploadedPhotosForFirestore,
} from "../shared/uploadedPhotoNormalization";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  activeOrganizerTeamMembershipPatch,
  organizerRelationshipId,
} from "../shared/relationshipDocuments";
import {
  hostProfileSeedPatch,
  professionalHostSnapshot,
} from "../shared/hostProfiles";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {normalizeCreateOrganizerPayload} from
  "./organizerPayloadNormalization";
import {
  defaultOrganizerPublicSlug,
  requireFirestoreAutoId,
} from "./organizerIdentity";
import {reserveOrganizerCanonicalRoute} from
  "../admin/organizerPublishingGuards";
import {organizerSupplyCapabilitiesFor} from
  "../shared/organizerSupplyCapabilities";

interface CreateOrganizerDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
}

const defaultDeps: CreateOrganizerDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  reserveCanonicalRoute: reserveOrganizerCanonicalRoute,
};

/** Creates the canonical organizer and its owner team membership. */
export async function createOrganizerHandler(
  request: CallableRequest<unknown>,
  deps: CreateOrganizerDeps = defaultDeps
): Promise<{organizerId: string}> {
  const ownerUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateOrganizerCallablePayload>(
    request,
    validateCreateOrganizerCallablePayload,
    normalizeCreateOrganizerPayload
  );
  const market = marketForIdOrAlias(data.location);
  if (!market || !market.hostCreatable) {
    throw new HttpsError(
      "failed-precondition",
      "This city is not open for organizer creation yet."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, ownerUid, "createOrganizer", {
    maxRequests: 3, windowMs: 60 * 60 * 1000,
  });
  const organizerRef = data.organizerId ?
    db.collection("organizers").doc(requireFirestoreAutoId(data.organizerId)) :
    db.collection("organizers").doc();
  const organizerId = organizerRef.id;
  const publicSlug = defaultOrganizerPublicSlug(data.name, organizerId);
  const canonicalPath = `/organizers/${publicSlug}/`;
  const teamRef = db.collection("organizerTeamMemberships")
    .doc(organizerRelationshipId(organizerId, ownerUid));
  const userRef = db.collection("users").doc(ownerUid);
  const hostProfileRef = db.collection("hostProfiles").doc(ownerUid);
  const deletedUserRef = db.collection("deletedUsers").doc(ownerUid);

  await db.runTransaction(async (tx) => {
    const [
      organizerSnap,
      userSnap,
      hostProfileSnap,
      deletedUserSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(userRef),
      tx.get(hostProfileRef),
      tx.get(deletedUserRef),
    ]);
    if (organizerSnap.exists) {
      throw new HttpsError("already-exists", "Organizer already exists.");
    }
    if (deletedUserSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot create organizers."
      );
    }

    const ownerProfile = professionalHostSnapshot({
      uid: ownerUid,
      hostProfileSnap,
      userSnap,
      role: "owner",
    });
    const organizerPhotos = normalizeUploadedPhotosForFirestore(
      data.organizerPhotos
    );
    const logoPhoto = normalizeOptionalUploadedPhotoForFirestore(
      data.logoPhoto
    );
    const timestamp = deps.serverTimestamp();
    await (deps.reserveCanonicalRoute ?? reserveOrganizerCanonicalRoute)(
      tx,
      db,
      {
        clubId: organizerId,
        canonicalPath,
        slug: publicSlug,
        citySlug: market.slug,
        adminUid: ownerUid,
        source: "createOrganizer",
        serverTimestamp: deps.serverTimestamp,
      }
    );
    const common = {
      name: data.name,
      description: data.description,
      location: market.marketId,
      locationCityId: market.cityId,
      locationMarketId: market.marketId,
      area: data.area,
      hostUserId: ownerUid,
      hostName: ownerProfile.displayName,
      hostAvatarUrl: ownerProfile.avatarUrl,
      ownerUserId: ownerUid,
      hostUserIds: [ownerUid],
      hostProfiles: [ownerProfile],
      createdAt: timestamp,
      imageUrl: primaryPhotoUrl(organizerPhotos) ?? data.imageUrl ?? null,
      profileImageUrl: thumbnailOrUrl(logoPhoto) ??
        data.profileImageUrl ?? null,
      logoPhoto,
      tags: [],
      rating: 0,
      reviewCount: 0,
      nextEventAt: null,
      nextEventLabel: null,
      status: "active",
      archived: false,
      archivedAt: null,
      archiveReason: null,
      instagramHandle: data.instagramHandle ?? null,
      phoneNumber: data.phoneNumber ?? null,
      email: data.email ?? null,
      hostDefaults: data.hostDefaults ?? defaultHostDefaults(),
      organizerType: data.organizerType ?? "club",
      organizerTypeUpdatedAt: timestamp,
      organizerTypeUpdatedByUid: ownerUid,
      publicCategoryLabel: null,
      cityName: market.cityLabel,
      regionName: market.regionName,
      countryCode: market.countryIsoCode,
      countryName: market.countryName,
      // A Host workspace starts private. The owner can publish it later from
      // Catch for Hosts after proving the operations workflow is useful; the
      // Consumer app is never a prerequisite for creating or running events.
      appVisibility: "hidden",
      supplyCapabilities: organizerSupplyCapabilitiesFor({
        ownershipState: "userCreated",
        claimState: "claimed",
      }),
      ownership: {
        state: "userCreated",
        ownerUserId: ownerUid,
        primaryHostUserId: ownerUid,
        hostUserIds: [ownerUid],
        claimedAt: timestamp,
        claimedByUid: ownerUid,
      },
      claim: {
        state: "claimed",
        claimHref: null,
        lastClaimRequestId: null,
      },
      publicPage: {
        slug: publicSlug,
        citySlug: market.slug,
        canonicalPath,
        publishStatus: "draft",
        indexStatus: "noindex",
        robots: "noindex, follow",
        seoTitle: null,
        seoDescription: null,
        lastRenderedAt: null,
      },
      provenance: {
        origin: "userCreated",
        sourceConfidence: "ownerVerified",
        verificationStatus: "ownerVerified",
        lastVerifiedAt: timestamp,
      },
      publicProfile: {
        headline: null,
        summary: null,
        sourceSummary: null,
        formats: [],
        facts: [],
        eventEvidence: [],
      },
      publicSources: [],
    };

    tx.create(organizerRef, {
      ...common,
      organizerPhotos,
      followerCount: 0,
    });
    tx.set(teamRef, activeOrganizerTeamMembershipPatch({
      organizerId,
      uid: ownerUid,
      role: "owner",
    }), {merge: true});
    if (!hostProfileSnap.exists) {
      tx.set(
        hostProfileRef,
        hostProfileSeedPatch(ownerProfile, timestamp),
        {merge: true}
      );
    }
  });

  return {organizerId};
}

export const createOrganizer = onCall(
  appCheckCallableOptions,
  (request) => createOrganizerHandler(request)
);

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

function defaultHostDefaults() {
  return {
    primaryActivityKind: "socialRun",
    supportedActivityKinds: ["socialRun"],
    eventPolicy: {
      admissionPreset: "openCapacity",
      minAge: 0,
      maxAge: 99,
      maxMen: null,
      maxWomen: null,
      dynamicPricingEnabled: false,
      dynamicPricingStepInPaise: null,
      dynamicPricingMaxInPaise: null,
      cancellationPolicyId: "standard",
    },
    eventSuccess: {
      enabled: false,
      playbookId: "social_run_light",
      selectedModuleIds: [],
      structureConfig: {
        unitKind: "pods",
        unitSize: 4,
        unitCount: null,
        rotationIntervalMinutes: null,
        revealCountdownSeconds: 10,
      },
      hostGoal: "Help attendees meet at least two new people.",
      wingmanRequestsEnabled: true,
      contextualOpenersEnabled: true,
      compatibilityAffectsRanking: false,
      attendeePrompt: null,
    },
    eventSuccessByActivityKind: {},
  };
}
