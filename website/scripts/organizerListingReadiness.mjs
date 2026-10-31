import crypto from "node:crypto";
import {validateOrganizerDocument} from
  "../../tool/contracts/generated/schema_contract_validators.mjs";

/** Readiness is evaluated on the exact canonical snapshot being materialized. */
export function organizerListingReadiness({id, path = `organizers/${id}`, data}) {
  const canonical = typeof id === "string" && id.length > 0 &&
    path === `organizers/${id}` && !id.includes("/");
  const expectedSupply = supplyCapabilitiesForAuthority({
    ownershipState: data?.ownership?.state, claimState: data?.claim?.state,
  });
  const storedSupply = data?.supplyCapabilities;
  const supplyValid = storedSupply === undefined ||
    (storedSupply && Object.keys(storedSupply).length === Object.keys(expectedSupply).length &&
      Object.entries(expectedSupply).every(([key, value]) => storedSupply[key] === value));
  const valid = canonical && validateOrganizerDocument(data) && supplyValid;
  const page = data?.publicPage;
  // Approval publishes a listing claimable and noindex; indexing waits until
  // its organizer is verified, so claims need only a live page.
  const published = valid && !data.archived && data.status !== "archived" &&
    data.claim?.state !== "suppressed" && page?.publishStatus === "published" &&
    /^\/organizers\/(?:[a-z0-9-]+\/){1,2}$/u.test(page.canonicalPath);
  const publicEligible = published &&
    ["indexReady", "indexed"].includes(page.indexStatus) &&
    page.robots === "index, follow";
  const ownerBound = Boolean(data?.ownerUserId || data?.hostUserId ||
    data?.hostUserIds?.length || data?.hostProfiles?.length ||
    data?.ownership?.ownerUserId || data?.ownership?.primaryHostUserId ||
    data?.ownership?.hostUserIds?.length);
  const claimReady = published && !ownerBound &&
    data.ownership?.state === "programmatic" && data.claim?.state === "unclaimed";
  const invalid = !canonical ? "A canonical organizer document is required." :
    !valid ? "The canonical organizer document does not match its contract." : null;
  const verified = "The canonical organizer target was verified in this Firestore snapshot.";
  const claimReason = invalid ?? (!published ? "A published organizer page is required." : verified);
  const reviewReason = invalid ??
    (!publicEligible ? "A published, index-ready organizer page is required." : verified);
  return {
    documentValid: Boolean(valid),
    publicEligible: Boolean(publicEligible),
    publicApi: {
      state: claimReady ? "enabled" : "disabled",
      reason: claimReady || !published ? claimReason :
        "This organizer is not accepting new ownership requests.",
      claimTargetSyncStatus: published ? "in_sync" : "unknown",
    },
    publicReviewTarget: {
      state: publicEligible ? "enabled" : "disabled",
      reason: reviewReason,
    },
  };
}

/** Diagnostic evidence only; saved receipts are never capability inputs. */
export function buildOrganizerListingReadinessReceipt({
  projectId, documents, listings, generatedAt = new Date().toISOString(),
}) {
  const byId = new Map(documents.map((document) => [document.id, document]));
  return {
    schemaVersion: 2,
    receiptType: "organizer_listing_readiness",
    generatedAt,
    projectId,
    mode: {source: "firestore_read", collection: "organizers", remoteWrites: 0},
    projection: {sha256: digest(`${JSON.stringify(listings, null, 2)}\n`)},
    limits: [
      "Snapshot readiness does not prove deployed Auth, App Check or callable availability.",
      "An ownership request is pending review; it does not grant management permissions.",
      "Public listing reviews are unverified; attendance requires the event review path.",
    ],
    targets: listings.filter((listing) => byId.has(listing.id)).map((listing) => {
      const document = byId.get(listing.id);
      return {
        organizerId: listing.id,
        path: document.path ?? `organizers/${listing.id}`,
        canonicalPath: listing.path,
        documentSha256: digest(JSON.stringify(document.data)),
        claimRequest: listing.capabilities.claimRequest,
        publicReviews: listing.capabilities.publicReviews,
      };
    }),
  };
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function supplyCapabilitiesForAuthority(authority) {
  const managed =
    ["userCreated", "claimed", "transferred"].includes(
      authority.ownershipState
    ) ||
    ["claimed", "verified"].includes(authority.claimState);
  if (managed) {
    return {
      mode: "claimed_managed",
      bookable: true,
      paymentsEnabled: true,
      waitlistEnabled: true,
      hostContactEnabled: true,
      claimable: false,
      reviewPolicy: "attended_event_only",
    };
  }
  return {
    mode: "unclaimed_read_only",
    bookable: false,
    paymentsEnabled: false,
    waitlistEnabled: false,
    hostContactEnabled: false,
    claimable: authority.claimState === "unclaimed",
    reviewPolicy: "after_event_end",
  };
}
