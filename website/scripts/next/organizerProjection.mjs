// Pure projection shared by the build materializer and request-time server reader.
import {organizerListingReadiness, supplyCapabilitiesForAuthority} from "../organizerListingReadiness.mjs";

export function staticPublicApi(reason) {
  return disabledPublicApi(reason, "static_fixture");
}

export function disabledPublicApi(reason, claimTargetSyncStatus) {
  return {
    state: "disabled",
    reason,
    claimTargetSyncStatus,
  };
}

export function organizerAuthority({
  ownershipState = "programmatic",
  claimState = "unclaimed",
  provenanceOrigin = "import",
  sourceConfidence = "seedOnly",
  verificationStatus = "unverified",
  appVisibility = "hidden",
  publishStatus = "draft",
  indexStatus = "noindex",
} = {}) {
  return {
    ownershipState: enumValue(
      ownershipState,
      ["programmatic", "userCreated", "claimed", "transferred"],
      "programmatic"
    ),
    claimState: enumValue(
      claimState,
      ["unclaimed", "claimPending", "claimed", "verified", "suppressed"],
      "unclaimed"
    ),
    provenanceOrigin: enumValue(
      provenanceOrigin,
      ["userCreated", "scraper", "adminSeed", "import"],
      "import"
    ),
    sourceConfidence: enumValue(
      sourceConfidence,
      ["seedOnly", "low", "medium", "high", "ownerVerified"],
      "seedOnly"
    ),
    verificationStatus: enumValue(
      verificationStatus,
      ["unverified", "sourceBacked", "ownerVerified"],
      "unverified"
    ),
    appVisibility: enumValue(
      appVisibility,
      ["discoverable", "hidden"],
      "hidden"
    ),
    publishStatus: enumValue(
      publishStatus,
      ["draft", "qa", "published", "suppressed", "removed"],
      "draft"
    ),
    indexStatus: enumValue(
      indexStatus,
      ["noindex", "indexReady", "indexed"],
      "noindex"
    ),
  };
}

export function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function listingCapabilities(
  authority,
  backendReadiness,
  publicReviewTarget = {
    state: "disabled",
    reason: "Public reviews are unavailable until canonical target readiness is verified.",
  }
) {
  const claimable = authority.claimState === "unclaimed";
  const claimBackendEnabled = backendReadiness.state === "enabled";
  const publicReviewTargetEnabled = publicReviewTarget.state === "enabled";
  const publicReviewsEligible =
    authority.publishStatus === "published" &&
    authority.indexStatus !== "noindex" &&
    authority.claimState !== "suppressed";
  const publicReviewsEnabled =
    publicReviewsEligible && publicReviewTargetEnabled;
  return {
    claimRequest: {
      state: claimable && claimBackendEnabled ? "enabled" : "disabled",
      reason: !claimable ?
        claimCapabilityReason(authority.claimState) :
        backendReadiness.reason,
    },
    publicReviews: {
      targetState: publicReviewTargetEnabled ? "enabled" : "disabled",
      readState: publicReviewsEnabled ? "enabled" : "disabled",
      writeState: publicReviewsEnabled ? "enabled" : "disabled",
      reason: !publicReviewsEligible ?
        "Public reviews require a published, index-ready organizer page." :
        !publicReviewTargetEnabled ? publicReviewTarget.reason :
        "Public reviews are available for this published organizer page.",
    },
    supply: supplyCapabilitiesForAuthority(authority),
  };
}

export function claimCapabilityReason(claimState) {
  switch (claimState) {
  case "claimPending": return "A claim request is already under review.";
  case "claimed": return "This organizer has already been claimed.";
  case "verified": return "This organizer is owner verified.";
  case "suppressed": return "This organizer is not accepting claim requests.";
  default: return "Claiming is not available for this organizer yet.";
  }
}

export function canonicalOrganizerType(organizer) {
  const value = organizer?.organizerType;
  if ([
    "club",
    "community",
    "individual",
    "eventProducer",
    "venue",
    "brand",
  ].includes(value)) return value;
  switch (organizer?.entityKind) {
  case "creatorCommunity": return "community";
  case "eventOrganizer": return "eventProducer";
  case "venue": return "venue";
  case "brand": return "brand";
  default: return "club";
  }
}

export function organizerTypeLabel(type) {
  switch (type) {
  case "eventProducer": return "Event producer";
  case "individual": return "Individual organizer";
  default: return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  }
}

export function listingFromOrganizerDocument(wrapper) {
  if (!wrapper || typeof wrapper !== "object") return null;
  const {path: firestorePath, data: organizer} = wrapper;
  if (!organizer || typeof organizer !== "object") return null;
  if (!organizer.publicPage?.canonicalPath) return null;
  if (!["qa", "published"].includes(organizer.publicPage.publishStatus)) return null;

  const id = String(firestorePath ?? "").split("/").pop() || organizer.publicPage.slug;
  const city = organizer.cityName || organizer.area || organizer.location || "Unknown";
  const citySlug = organizer.publicPage.citySlug || organizer.location || "unknown";
  const publicProfile = organizer.publicProfile ?? {};
  const claimState = organizer.claim?.state ?? "unclaimed";
  const claimHref = claimState === "unclaimed" ?
    `${organizer.publicPage.canonicalPath}#claim` :
    organizer.publicPage.canonicalPath;
  const authority = organizerAuthority({
    ownershipState: organizer.ownership?.state,
    claimState,
    provenanceOrigin: organizer.provenance?.origin,
    sourceConfidence: organizer.provenance?.sourceConfidence,
    verificationStatus: organizer.provenance?.verificationStatus,
    appVisibility: organizer.appVisibility,
    publishStatus: organizer.publicPage.publishStatus,
    indexStatus: organizer.publicPage.indexStatus,
  });
  const publicApi = staticPublicApi(
    "This listing remains fail-closed until its Firestore claim target is verified."
  );

  return {
    id,
    listingVariant: "unclaimedScraped",
    dataOrigin: "organizerIntake",
    name: organizer.name,
    slug: organizer.publicPage.slug,
    city,
    citySlug,
    region: organizer.regionName ?? "",
    country: organizer.countryName ?? "",
    path: organizer.publicPage.canonicalPath,
    legacyPaths: [],
    category: organizer.publicCategoryLabel ??
      organizer.displayCategory ??
      organizerTypeLabel(canonicalOrganizerType(organizer)),
    status: claimState,
    indexing: organizer.publicPage.robots ?? "noindex, follow",
    sourceConfidence: organizer.provenance?.sourceConfidence ?? "low",
    headline: publicProfile.headline ?? `${organizer.name} in ${city}`,
    description: publicProfile.summary ?? organizer.description,
    sourceSummary: publicProfile.sourceSummary ?? organizer.description,
    logo: {
      mode: "monogram",
      text: initialsForName(organizer.name),
      status: organizer.logoPhoto ? "source_provided" : "not_verified",
    },
    formats: publicProfile.formats?.length ? publicProfile.formats : organizer.tags ?? [],
    facts: publicProfile.facts ?? [],
    eventEvidence: publicProfile.eventEvidence ?? [],
    reviews: publicReviewsForListing(wrapper.reviews ?? [], id),
    // Organizers no longer store operator fit notes or evidence checklists;
    // the listing DTO keeps the empty lists until its own contract drops them.
    fitNotes: [],
    missingEvidence: [],
    sources: publicSourcesForListing(organizer.publicSources ?? []),
    claim: {
      href: claimHref,
      label: claimState === "unclaimed" ? "Claim this listing" : "View organizer profile",
    },
    publicApi,
    authority,
    capabilities: listingCapabilities(authority, publicApi),
    lastVerifiedAt: dateLabel(organizer.provenance?.lastVerifiedAt),
    searchText: searchText([
      organizer.name,
      city,
      organizer.area,
      organizer.organizerType,
      organizer.publicCategoryLabel,
      organizer.displayCategory,
      organizer.instagramHandle,
      ...(organizer.tags ?? []),
      ...(publicProfile.formats ?? []),
    ]),
  };
}

export function listingFromFirestoreOrganizer({id, path = `organizers/${id}`, data: organizer}) {
  const readiness = organizerListingReadiness({id, path, data: organizer});
  if (!readiness.documentValid || organizer.archived || organizer.status === "archived" ||
      organizer.claim?.state === "suppressed") return null;
  const wrapper = {path, data: organizer};
  const listing = listingFromOrganizerDocument(wrapper);
  if (!listing) return null;
  const {publicApi, publicReviewTarget} = readiness;
  const authority = organizerAuthority({
    ownershipState: organizer.ownership?.state,
    claimState: organizer.claim?.state,
    provenanceOrigin: organizer.provenance?.origin,
    sourceConfidence: organizer.provenance?.sourceConfidence,
    verificationStatus: organizer.provenance?.verificationStatus,
    appVisibility: organizer.appVisibility,
    publishStatus: organizer.publicPage?.publishStatus,
    indexStatus: organizer.publicPage?.indexStatus,
  });
  const capabilities = listingCapabilities(authority, publicApi, publicReviewTarget);
  if (capabilities.supply.reviewPolicy === "after_event_end") {
    capabilities.publicReviews.writeState = "disabled";
    if (publicReviewTarget.state === "enabled") {
      capabilities.publicReviews.reason =
        "Public reviews can be read here; unclaimed organizer reviews require a finished event.";
    }
  }
  return {
    ...listing,
    dataOrigin: organizer.provenance?.origin === "userCreated" ?
      "appCreated" :
      "organizerIntake",
    legacyPaths: organizer.publicPage?.legacyPaths ?? [],
    publicApi,
    authority,
    capabilities,
  };
}

export function publicReviewsForListing(reviews, organizerId) {
  if (!Array.isArray(reviews)) return [];
  return reviews
    .map((entry) => {
      const review = entry?.data ?? entry;
      if (!review || typeof review !== "object") return null;
      if ((review.organizerId) !== organizerId) return null;
      if (review.moderationStatus && review.moderationStatus !== "published") {
        return null;
      }
      return {
        id: String(entry?.path ?? review.id ?? "").split("/").pop() || null,
        eventId: typeof review.eventId === "string" ? review.eventId : null,
        reviewerName: review.reviewerName ?? "Catch member",
        rating: review.rating,
        comment: review.comment ?? "",
        createdAt: dateLabel(review.createdAt),
        verificationStatus:
          review.verificationStatus ?? (review.eventId ? "verified" : "unverified"),
        source:
          review.source ?? (review.eventId ? "catchEvent" : "publicListing"),
        isAnonymous: review.isAnonymous === true,
        ownerResponse: publicOwnerResponse(review.ownerResponse),
      };
    })
    .filter(Boolean);
}

export function publicOwnerResponse(response) {
  if (!response || typeof response !== "object") return null;
  return {
    hostName: response.hostName ?? "Host",
    hostAvatarUrl: response.hostAvatarUrl ?? null,
    message: response.message ?? "",
    updatedAt: dateLabel(response.updatedAt),
  };
}

export function publicSourcesForListing(sources) {
  return sources.map((source) => {
    const listingSource = {
      type: source.type,
      label: source.label,
      detail: source.detail,
      confidence: source.confidence,
    };
    if (source.href) listingSource.href = source.href;
    return listingSource;
  });
}

export function searchText(values) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function initialsForName(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

export function dateLabel(timestamp) {
  if (typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
  if (!timestamp || typeof timestamp._seconds !== "number") {
    return "Unverified";
  }
  return new Date(timestamp._seconds * 1000).toISOString().slice(0, 10);
}

