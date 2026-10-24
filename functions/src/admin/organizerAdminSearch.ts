import type {
  ClubDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";

const maxAdminSearchTokens = 120;
const maxQueryTokens = 30;
const maxPrefixLength = 12;
const stopWords = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export type OrganizerAdminSearchSource =
  "adminCreateOrganizerDraftFromCandidate" |
  "adminApproveOrganizerListing" |
  "adminUpdateClubDetails" |
  "adminSetClubIndexStatus" |
  "adminOrganizerSearchBackfill";

export interface OrganizerAdminSearchProjection {
  tokens: string[];
  sortKey: string;
  updatedAt: FirebaseFirestore.FieldValue;
  updatedBySource: OrganizerAdminSearchSource;
}

/**
 * Builds the deterministic admin search projection for an organizer document.
 * @param {string} clubId Firestore club document id.
 * @param {ClubDocument} club Canonical club document.
 * @param {FirebaseFirestore.FieldValue} updatedAt Server timestamp marker.
 * @param {OrganizerAdminSearchSource} updatedBySource Projection source.
 * @return {OrganizerAdminSearchProjection} Rebuildable search projection.
 */
export function buildOrganizerAdminSearchProjection(
  clubId: string,
  club: ClubDocument | OrganizerDocument,
  updatedAt: FirebaseFirestore.FieldValue,
  updatedBySource: OrganizerAdminSearchSource
): OrganizerAdminSearchProjection {
  const sourceText = organizerSearchSourceText(clubId, club);
  return {
    tokens: buildSearchTokens(sourceText, true, maxAdminSearchTokens),
    sortKey: firstSearchToken(club.name) ?? firstSearchToken(clubId) ?? clubId,
    updatedAt,
    updatedBySource,
  };
}

/**
 * Builds Firestore query tokens for admin organizer search.
 * @param {string} query Raw operator query.
 * @return {string[]} Bounded query tokens for array-contains-any.
 */
export function organizerAdminSearchQueryTokens(query: string): string[] {
  return buildSearchTokens([query], false, maxQueryTokens);
}

/**
 * Returns a lightweight next-club view after applying admin editable fields.
 * @param {ClubDocument} before Current canonical club document.
 * @param {Record<string, unknown>} fields Admin update fields.
 * @return {ClubDocument} Club document view for derived projections.
 */
export function clubWithAdminFieldsForSearch(
  before: ClubDocument,
  fields: Record<string, unknown>
): ClubDocument {
  return {
    ...before,
    ...copyTopLevelFields(fields),
    publicPage: mergeNested(before.publicPage, fields.publicPage),
    provenance: mergeNested(before.provenance, fields.provenance),
    publicProfile: mergeNested(before.publicProfile, fields.publicProfile),
  };
}

/**
 * Returns a lightweight next-club view after index status changes.
 * @param {ClubDocument} before Current canonical club document.
 * @param {object} publicPagePatch Public page patch.
 * @return {ClubDocument} Club document view for derived projections.
 */
export function clubWithPublicPageForSearch(
  before: ClubDocument,
  publicPagePatch: Record<string, unknown>
): ClubDocument {
  return {
    ...before,
    publicPage: mergeNested(before.publicPage, publicPagePatch),
  };
}

/**
 * Collects high-signal public/admin-safe organizer fields for search.
 * @param {string} clubId Firestore club document id.
 * @param {ClubDocument} club Canonical club document.
 * @return {string[]} Search source strings in priority order.
 */
function organizerSearchSourceText(
  clubId: string,
  club: ClubDocument | OrganizerDocument
): string[] {
  return compactStrings([
    clubId,
    club.name,
    club.publicPage?.slug,
    club.publicPage?.citySlug,
    club.publicPage?.canonicalPath,
    club.instagramHandle,
    club.email,
    club.organizerType,
    club.publicCategoryLabel,
    club.displayCategory,
    club.cityName,
    club.location,
    club.locationMarketId,
    club.locationCityId,
    club.area,
    club.regionName,
    club.countryCode,
    club.countryName,
    club.entityKind,
    club.appVisibility,
    club.ownership?.state,
    club.claim?.state,
    club.provenance?.sourceConfidence,
    club.provenance?.verificationStatus,
    club.publicProfile?.headline,
    club.publicProfile?.summary,
    club.publicProfile?.sourceSummary,
    ...stringArray(club.tags),
    ...stringArray(club.entitySubtypes),
    ...stringArray(club.publicProfile?.formats),
    ...factStrings(club.publicProfile?.facts),
  ]);
}

/**
 * Builds normalized search tokens from source strings.
 * @param {string[]} source Source strings.
 * @param {boolean} includePrefixes Whether to include prefix tokens.
 * @param {number} limit Maximum tokens.
 * @return {string[]} Unique tokens.
 */
function buildSearchTokens(
  source: string[],
  includePrefixes: boolean,
  limit: number
): string[] {
  const tokens = new Set<string>();
  for (const item of source) {
    for (const token of splitSearchText(item)) {
      if (stopWords.has(token)) continue;
      tokens.add(token);
      if (includePrefixes) {
        for (
          let length = 2;
          length <= Math.min(maxPrefixLength, token.length - 1);
          length += 1
        ) {
          tokens.add(token.slice(0, length));
        }
      }
      if (tokens.size >= limit) return Array.from(tokens).slice(0, limit);
    }
  }
  return Array.from(tokens).slice(0, limit);
}

/**
 * Splits text into normalized lowercase alphanumeric tokens.
 * @param {string} value Raw text.
 * @return {string[]} Tokens.
 */
function splitSearchText(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/**
 * Returns the first normalized token for stable sorting.
 * @param {string | null | undefined} value Raw text.
 * @return {string | null} First token.
 */
function firstSearchToken(value: string | null | undefined): string | null {
  if (!value) return null;
  return splitSearchText(value).find((token) => !stopWords.has(token)) ?? null;
}

/**
 * Copies top-level admin editable fields for projection rebuilding.
 * @param {Record<string, unknown>} fields Admin fields.
 * @return {Partial<ClubDocument>} Top-level patch.
 */
function copyTopLevelFields(
  fields: Record<string, unknown>
): Partial<ClubDocument> {
  const patch: Partial<ClubDocument> = {};
  for (const key of [
    "name",
    "description",
    "location",
    "locationCityId",
    "locationMarketId",
    "area",
    "tags",
    "instagramHandle",
    "phoneNumber",
    "email",
    "imageUrl",
    "profileImageUrl",
    "organizerType",
    "publicCategoryLabel",
    "entityKind",
    "entitySubtypes",
    "displayCategory",
    "cityName",
    "regionName",
    "countryCode",
    "countryName",
    "appVisibility",
  ] as const) {
    if (fields[key] !== undefined) {
      (patch as Record<string, unknown>)[key] = fields[key];
    }
  }
  return patch;
}

/**
 * Merges optional nested object patches.
 * @param {T | undefined} before Existing object.
 * @param {unknown} patch Patch object.
 * @return {T | undefined} Merged object.
 */
function mergeNested<T extends Record<string, unknown>>(
  before: T | undefined,
  patch: unknown
): T | undefined {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return before;
  }
  return {
    ...(before ?? {}),
    ...(patch as Record<string, unknown>),
  } as T;
}

/**
 * Returns only non-empty string values.
 * @param {Array<unknown>} values Raw values.
 * @return {string[]} Strings.
 */
function compactStrings(values: Array<unknown>): string[] {
  return values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  );
}

/**
 * Returns a string array when present.
 * @param {unknown} values Raw values.
 * @return {string[]} Strings.
 */
function stringArray(values: unknown): string[] {
  return Array.isArray(values) ?
    values.filter((value): value is string => typeof value === "string") :
    [];
}

/**
 * Flattens public profile fact labels and values.
 * @param {unknown} facts Raw facts.
 * @return {string[]} Fact strings.
 */
function factStrings(facts: unknown): string[] {
  if (!Array.isArray(facts)) return [];
  return facts.flatMap((fact) => {
    if (!fact || typeof fact !== "object") return [];
    const data = fact as {label?: unknown; value?: unknown};
    return compactStrings([data.label, data.value]);
  });
}
