/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminUpdateClubDetails. This edits owner-safe organizer listing fields through an audited admin callable.
 */
export interface AdminUpdateClubDetailsCallablePayload {
  clubId: string;
  fields: {
    name?: string;
    description?: string;
    location?: string;
    area?: string;
    /**
     * @maxItems 20
     */
    tags?: string[];
    instagramHandle?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    profileImageUrl?: string | null;
    /**
     * Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.
     */
    organizerType?:
      | "club"
      | "community"
      | "individual"
      | "eventProducer"
      | "venue"
      | "brand";
    publicCategoryLabel?: string | null;
    entityKind?:
      | "club"
      | "venue"
      | "eventOrganizer"
      | "creatorCommunity"
      | "brand";
    /**
     * @maxItems 20
     */
    entitySubtypes?: string[];
    displayCategory?: string | null;
    cityName?: string | null;
    regionName?: string | null;
    countryCode?: string | null;
    countryName?: string | null;
    appVisibility?: "discoverable" | "hidden";
    publicPage?: {
      slug?: string;
      citySlug?: string | null;
      canonicalPath?: string;
      publishStatus?: "draft" | "qa" | "published" | "suppressed" | "removed";
      seoTitle?: string | null;
      seoDescription?: string | null;
    };
    provenance?: {
      sourceConfidence?:
        | "seedOnly"
        | "low"
        | "medium"
        | "high"
        | "ownerVerified";
      verificationStatus?: "unverified" | "sourceBacked" | "ownerVerified";
    };
    /**
     * Replaces the organizer page links, in display order. An empty array removes them.
     *
     * @maxItems 20
     */
    ownerLinks?: {
      id: string;
      label: string;
      subtitle: string | null;
      url: string;
      /**
       * What an owner link is for, which picks its icon. Null lets the page infer one from the URL.
       */
      icon:
        | "link"
        | "website"
        | "community"
        | "social"
        | "tickets"
        | "calendar"
        | "shop"
        | "partner"
        | "video"
        | "route"
        | null;
      pinned: boolean;
      showUntil: string | null;
    }[];
    publicProfile?: {
      headline?: string | null;
      summary?: string | null;
      sourceSummary?: string | null;
      /**
       * @maxItems 12
       */
      formats?: string[];
    };
  };
  reviewNote?: string | null;
}
