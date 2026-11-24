import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
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
  "../domain/organizers/organizerPublishingGuards";
import {organizerSupplyCapabilitiesFor} from
  "../shared/organizerSupplyCapabilities";
import {
  checkListingSuppression,
  listingSuppressionHmacKey,
  reviewFlagPatch,
  suppressionModule,
} from "../listingSuppressions/registry";
import {stageOrganizerAccessGrants} from
  "../domain/access/organizerAccessGrants";

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
  await db.runTransaction((tx) => stageOwnedOrganizerCreate(tx, db, {
    ownerUid, organizerRef, data, market,
    serverTimestamp: deps.serverTimestamp,
    reserveCanonicalRoute: deps.reserveCanonicalRoute,
  }));

  return {organizerId: organizerRef.id};
}


/** What stageOwnedOrganizerCreate needs to create a private owned organizer. */
export interface OwnedOrganizerCreate {
  ownerUid: string;
  organizerRef: FirebaseFirestore.DocumentReference;
  data: CreateOrganizerCallablePayload;
  market: NonNullable<ReturnType<typeof marketForIdOrAlias>>;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
}

/**
 * Creates a private, unpublished organizer owned by its creator, with the
 * owner's team membership and host profile seed, inside the caller's
 * transaction. createOrganizer and the website try-it workspace share it, so
 * a profile made on the website is the same record the app makes. It reads
 * before it writes; call it before the caller's own writes.
 */
export async function stageOwnedOrganizerCreate(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  {ownerUid, organizerRef, data, market, serverTimestamp,
    reserveCanonicalRoute}: OwnedOrganizerCreate
): Promise<void> {
  const deps = {serverTimestamp, reserveCanonicalRoute};
  const organizerId = organizerRef.id;
  const publicSlug = defaultOrganizerPublicSlug(data.name, organizerId);
  const canonicalPath = `/organizers/${publicSlug}/`;
  const teamRef = db.collection("organizerTeamMemberships")
    .doc(organizerRelationshipId(organizerId, ownerUid));
  const userRef = db.collection("users").doc(ownerUid);
  const hostProfileRef = db.collection("hostProfiles").doc(ownerUid);
  const deletedUserRef = db.collection("deletedUsers").doc(ownerUid);
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
  // A host creating their own workspace is flagged, never blocked, when it
  // matches a do-not-list case: the workspace starts private and
  // unpublished, and the real organizer may be the one signing up. Staff
  // review the flag on the case. A missing registry key only logs here.
  const suppressionKeys = (await suppressionModule())
    .suppressionKeysForIdentity({
      names: data.name,
      handles: data.instagramHandle ?? null,
      organizerIds: organizerId,
    });
  const suppression = await checkListingSuppression(
    tx,
    db,
    suppressionKeys
  );
  if (suppression.state === "unavailable") {
    logger.error(
      "createOrganizer could not check the do-not-list registry.",
      {organizerId}
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
      organizerId: organizerId,
      canonicalPath,
      slug: publicSlug,
      citySlug: market.slug,
      adminUid: ownerUid,
      // A try-it workspace is a self-created organizer too.
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
    // Setup's optional "how did you hear" answer, stored once, server-only,
    // apart from the derived channel in organizerGrowthFacts.
    ...(data.signupSource ? {
      signupSource: {source: data.signupSource, answeredAt: timestamp},
    } : {}),
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
  if (suppression.state === "suppressed") {
    tx.update(
      suppression.match.ref,
      reviewFlagPatch(suppression.match, organizerId, new Date())
    );
    logger.warn("Self-created organizer flagged by the do-not-list " +
      "registry.", {organizerId, caseId: suppression.match.caseId});
  }
  tx.set(teamRef, activeOrganizerTeamMembershipPatch({
    organizerId,
    uid: ownerUid,
    role: "owner",
  }), {merge: true});
  // The owner's access commits with the organiser (#2474 step 3).
  stageOrganizerAccessGrants(tx, db, {organizerId, before: null,
    after: {hostUserId: ownerUid, ownerUserId: ownerUid,
      hostUserIds: [ownerUid]},
    grantedBy: ownerUid, updatedAt: admin.firestore.Timestamp.now()});
  if (!hostProfileSnap.exists) {
    tx.set(
      hostProfileRef,
      hostProfileSeedPatch(ownerProfile, timestamp),
      {merge: true}
    );
  }
}

export const createOrganizer = onCall(
  appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey]),
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
