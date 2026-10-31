import type {
  WebsiteHostListingProjection,
} from "../shared/generated/websiteHostListingProjection";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {validateWebsiteHostListingProjection} from
  "../shared/generated/validators/websiteHostListingProjection";
import {
  object,
  organizerPath,
  publicDocumentId,
  publicHttpsUrl,
  publicOrganizerAuthorized,
} from "./publicReadPolicy";

/**
 * The public organizer listing. This mirrors projectPublicOrganizer in
 * website/src/server/publicOrganizerProjection.ts and the projector behind
 * it (website/scripts/next/organizerProjection.mjs and
 * website/scripts/organizerListingReadiness.mjs). The shared parity fixtures
 * in contracts/fixtures/public_pages hold both to the same output.
 */
export type HostListing = WebsiteHostListingProjection;
type Authority = HostListing["authority"];
type Capabilities = HostListing["capabilities"];
type Supply = Capabilities["supply"];
type PublicApi = HostListing["publicApi"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

// Claim, indexing, ownership, verification and publication state render
// from the structured authority. Free-text facts restating them go stale.
const authorityFactLabel = new RegExp("^(?:claim(?: state| status)?|" +
  "index(?:ing| status)?|ownership(?: state)?|verification(?: status)?|" +
  "publi(?:sh|cation)(?: state| status)?)$", "iu");
const ownerEstablished = new Set(["userCreated", "claimed", "transferred"]);

/** website/src/content/organizer.ts organizerListingCopy.detail. */
export function sourcedSummary(
  name: string, category: string, city: string
): string {
  const kind = category.charAt(0).toLowerCase() + category.slice(1);
  const article = /^[aeiou]/iu.test(kind) ? "an" : "a";
  return `${name} is ${article} ${kind} in ${city}. This profile is built ` +
    "from public sources and hasn’t been confirmed by the organiser yet.";
}

/** The serializer only accepts the closed public DTO, never a document. */
export function projectPublicOrganizer(
  id: string, data: unknown, liveMarkets: ReadonlySet<string>
): HostListing | null {
  if (!publicDocumentId(id) || !publicOrganizerAuthorized(data, liveMarkets)) {
    return null;
  }
  const projected = listingFromFirestoreOrganizer(id, data as Raw);
  if (!projected) return null;
  // This field describes the projection input. Ownership remains in authority.
  projected.dataOrigin = "organizerIntake";
  if (!validateWebsiteHostListingProjection(projected)) return null;
  const listing = JSON.parse(JSON.stringify(projected)) as HostListing;
  listing.legacyPaths = listing.legacyPaths?.filter(organizerPath);
  // A source without a public link is intake evidence, not public provenance.
  listing.sources = listing.sources.flatMap((source) => {
    const safeHref = publicHttpsUrl(source.href);
    return safeHref ? [{...source, href: safeHref}] : [];
  });
  listing.facts = listing.facts.filter((fact) =>
    !authorityFactLabel.test(fact.label.trim()));
  listing.fitNotes = [];
  if (!ownerEstablished.has(listing.authority.ownershipState)) {
    // Imported listings stay out of search, and intake prose is written for
    // operators, so visitors get a structured summary until an owner claims.
    listing.indexing = "noindex, follow";
    listing.description =
      sourcedSummary(listing.name, listing.category, listing.city);
    listing.sourceSummary = listing.description;
  }
  listing.eventEvidence = listing.eventEvidence.filter((event) =>
    publicHttpsUrl(event.sourceHref));
  const raw = data as Raw;
  const metrics: NonNullable<HostListing["metrics"]> = {};
  for (const key of
    ["followerCount", "reviewCount", "verifiedReviewCount"] as const) {
    if (key !== "followerCount" &&
        listing.capabilities.publicReviews.readState !== "enabled") continue;
    if (Number.isSafeInteger(raw[key]) && Number(raw[key]) >= 0) {
      metrics[key] = Number(raw[key]);
    }
  }
  // The canonical score is verified-review-only; never pair it with the total
  // public-review count.
  if (typeof raw.rating === "number" && raw.rating > 0 && raw.rating <= 5 &&
      (metrics.verifiedReviewCount ?? 0) > 0) metrics.rating = raw.rating;
  listing.metrics = metrics;
  listing.catchEvents = [];
  return listing;
}

function listingFromFirestoreOrganizer(
  id: string, organizer: Raw
): HostListing | null {
  const path = `organizers/${id}`;
  const readiness = organizerListingReadiness(id, path, organizer);
  if (!readiness.documentValid || organizer.archived ||
      organizer.status === "archived" ||
          organizer.claim?.state === "suppressed") {
    return null;
  }
  const listing = listingFromOrganizerDocument(path, organizer);
  if (!listing) return null;
  const authority = organizerAuthority(organizer);
  const capabilities = listingCapabilities(
    authority, readiness.publicApi, readiness.publicReviewTarget);
  if (capabilities.supply.reviewPolicy === "after_event_end") {
    capabilities.publicReviews.writeState = "disabled";
    if (readiness.publicReviewTarget.state === "enabled") {
      capabilities.publicReviews.reason =
        "Public reviews can be read here; unclaimed organizer reviews " +
        "require a finished event.";
    }
  }
  return {
    ...listing,
    dataOrigin: organizer.provenance?.origin === "userCreated" ?
      "appCreated" as HostListing["dataOrigin"] : "organizerIntake",
    legacyPaths: organizer.publicPage?.legacyPaths ?? [],
    publicApi: readiness.publicApi,
    authority,
    capabilities,
  };
}

function listingFromOrganizerDocument(
  firestorePath: string, organizer: Raw
): HostListing | null {
  if (!organizer.publicPage?.canonicalPath) return null;
  if (!["qa", "published"].includes(organizer.publicPage.publishStatus)) {
    return null;
  }
  const id = firestorePath.split("/").pop() || organizer.publicPage.slug;
  const city = organizer.cityName || organizer.area || organizer.location ||
      "Unknown";
  const citySlug = organizer.publicPage.citySlug || organizer.location ||
      "unknown";
  const publicProfile = organizer.publicProfile ?? {};
  const claimState = organizer.claim?.state ?? "unclaimed";
  const claimHref = claimState === "unclaimed" ?
    `${organizer.publicPage.canonicalPath}#claim` :
    organizer.publicPage.canonicalPath;
  const authority = organizerAuthority(organizer);
  const publicApi = disabledPublicApi(
    "This listing remains fail-closed until its Firestore claim target is " +
      "verified.",
    "static_fixture"
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
    formats: publicProfile.formats?.length ?
      publicProfile.formats : organizer.tags ?? [],
    facts: publicProfile.facts ?? [],
    eventEvidence: publicProfile.eventEvidence ?? [],
    // Reviews are attached by the page builder, never read from the document.
    reviews: [],
    fitNotes: [],
    missingEvidence: [],
    sources: publicSourcesForListing(organizer.publicSources ?? []),
    claim: {
      href: claimHref,
      label: claimState === "unclaimed" ?
        "Claim this listing" : "View organizer profile",
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
  } as HostListing;
}

function organizerAuthority(organizer: Raw): Authority {
  return {
    ownershipState: enumValue(organizer.ownership?.state,
      ["programmatic", "userCreated", "claimed", "transferred"],
      "programmatic"),
    claimState: enumValue(organizer.claim?.state,
      ["unclaimed", "claimPending", "claimed", "verified", "suppressed"],
      "unclaimed"),
    provenanceOrigin: enumValue(organizer.provenance?.origin,
      ["userCreated", "scraper", "adminSeed", "import"], "import"),
    sourceConfidence: enumValue(organizer.provenance?.sourceConfidence,
      ["seedOnly", "low", "medium", "high", "ownerVerified"], "seedOnly"),
    verificationStatus: enumValue(organizer.provenance?.verificationStatus,
      ["unverified", "sourceBacked", "ownerVerified"], "unverified"),
    appVisibility: enumValue(organizer.appVisibility,
      ["discoverable", "hidden"], "hidden"),
    publishStatus: enumValue(organizer.publicPage?.publishStatus,
      ["draft", "qa", "published", "suppressed", "removed"], "draft"),
    indexStatus: enumValue(organizer.publicPage?.indexStatus,
      ["noindex", "indexReady", "indexed"], "noindex"),
  };
}

function enumValue<T extends string>(
  value: unknown, allowed: readonly T[], fallback: T
): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

interface CapabilityState {
  state: "enabled" | "disabled";
  reason: string;
}

function listingCapabilities(
  authority: Authority,
  backendReadiness: CapabilityState,
  publicReviewTarget: CapabilityState = {
    state: "disabled",
    reason: "Public reviews are unavailable until canonical target " +
      "readiness is verified.",
  }
): Capabilities {
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

function claimCapabilityReason(claimState: string): string {
  switch (claimState) {
  case "claimPending": return "A claim request is already under review.";
  case "claimed": return "This organizer has already been claimed.";
  case "verified": return "This organizer is owner verified.";
  case "suppressed": return "This organizer is not accepting claim requests.";
  default: return "Claiming is not available for this organizer yet.";
  }
}

function canonicalOrganizerType(organizer: Raw): string {
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

function organizerTypeLabel(type: string): string {
  switch (type) {
  case "eventProducer": return "Event producer";
  case "individual": return "Individual organizer";
  default: return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  }
}

function disabledPublicApi(
  reason: string, claimTargetSyncStatus: string
): PublicApi {
  return {state: "disabled", reason, claimTargetSyncStatus} as PublicApi;
}

function publicSourcesForListing(sources: Raw[]): HostListing["sources"] {
  return sources.map((source) => {
    const listingSource: Raw = {
      type: source.type,
      label: source.label,
      detail: source.detail,
      confidence: source.confidence,
    };
    if (source.href) listingSource.href = source.href;
    return listingSource as HostListing["sources"][number];
  });
}

function searchText(values: unknown[]): string {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function initialsForName(name: unknown): string {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

function dateLabel(timestamp: unknown): string {
  if (typeof timestamp === "string" &&
      !Number.isNaN(Date.parse(timestamp))) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
  const stamp = object(timestamp);
  if (!stamp || typeof stamp._seconds !== "number") return "Unverified";
  return new Date(stamp._seconds * 1000).toISOString().slice(0, 10);
}

interface ListingReadiness {
  documentValid: boolean;
  publicApi: PublicApi & CapabilityState;
  publicReviewTarget: CapabilityState;
}

/** Readiness is evaluated on the exact canonical snapshot being built. */
function organizerListingReadiness(
  id: string, path: string, data: Raw
): ListingReadiness {
  const canonical = id.length > 0 && path === `organizers/${id}` &&
    !id.includes("/");
  const expectedSupply = supplyCapabilitiesForAuthority({
    ownershipState: data?.ownership?.state,
    claimState: data?.claim?.state,
  });
  const storedSupply = data?.supplyCapabilities;
  const supplyValid = storedSupply === undefined ||
    (storedSupply && Object.keys(storedSupply).length ===
      Object.keys(expectedSupply).length &&
      Object.entries(expectedSupply).every(([key, value]) =>
        storedSupply[key] === value));
  const valid = canonical && validateOrganizerDocument(data) && supplyValid;
  const page = data?.publicPage;
  // Approval publishes a listing claimable and noindex; indexing waits until
  // its organizer is verified, so claims need only a live page.
  const published = valid && !data.archived &&
    data.status !== "archived" && data.claim?.state !== "suppressed" &&
    page?.publishStatus === "published" &&
    /^\/organizers\/(?:[a-z0-9-]+\/){1,2}$/u.test(page.canonicalPath);
  const publicEligible = published &&
    ["indexReady", "indexed"].includes(page.indexStatus) &&
    page.robots === "index, follow";
  const ownerBound = Boolean(data?.ownerUserId || data?.hostUserId ||
    data?.hostUserIds?.length || data?.hostProfiles?.length ||
    data?.ownership?.ownerUserId || data?.ownership?.primaryHostUserId ||
    data?.ownership?.hostUserIds?.length);
  const claimReady = published && !ownerBound &&
    data.ownership?.state === "programmatic" &&
    data.claim?.state === "unclaimed";
  const invalid = !canonical ?
    "A canonical organizer document is required." :
    !valid ?
      "The canonical organizer document does not match its contract." :
      null;
  const verified = "The canonical organizer target was verified in this " +
    "Firestore snapshot.";
  const claimReason = invalid ??
    (!published ? "A published organizer page is required." : verified);
  const reviewReason = invalid ?? (!publicEligible ?
    "A published, index-ready organizer page is required." : verified);
  return {
    documentValid: Boolean(valid),
    publicApi: {
      state: claimReady ? "enabled" : "disabled",
      reason: claimReady || !published ? claimReason :
        "This organizer is not accepting new ownership requests.",
      claimTargetSyncStatus: published ? "in_sync" : "unknown",
    } as PublicApi & CapabilityState,
    publicReviewTarget: {
      state: publicEligible ? "enabled" : "disabled",
      reason: reviewReason,
    },
  };
}

function supplyCapabilitiesForAuthority(authority: {
  ownershipState?: unknown;
  claimState?: unknown;
}): Supply {
  const managed =
    ["userCreated", "claimed", "transferred"].includes(
      String(authority.ownershipState)) ||
    ["claimed", "verified"].includes(String(authority.claimState));
  if (managed) {
    return {
      mode: "claimed_managed",
      bookable: true,
      paymentsEnabled: true,
      waitlistEnabled: true,
      hostContactEnabled: true,
      claimable: false,
      reviewPolicy: "attended_event_only",
    } as Supply;
  }
  return {
    mode: "unclaimed_read_only",
    bookable: false,
    paymentsEnabled: false,
    waitlistEnabled: false,
    hostContactEnabled: false,
    claimable: authority.claimState === "unclaimed",
    reviewPolicy: "after_event_end",
  } as Supply;
}
