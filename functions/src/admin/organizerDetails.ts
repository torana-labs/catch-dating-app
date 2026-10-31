import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import crypto from "node:crypto";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  OrganizerDocument,
  OrganizerIntakeFieldCorrectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetOrganizerDetailsCallablePayload} from
  "../shared/generated/adminGetOrganizerDetailsCallablePayload";
import type {AdminListOrganizerDetailsCallablePayload} from
  "../shared/generated/adminListOrganizerDetailsCallablePayload";
import type {AdminUpdateOrganizerDetailsCallablePayload} from
  "../shared/generated/adminUpdateOrganizerDetailsCallablePayload";
import {
  validateAdminGetOrganizerDetailsCallablePayload,
} from "../shared/generated/validators/adminGetOrganizerDetailsInput";
import {
  validateAdminListOrganizerDetailsCallablePayload,
} from "../shared/generated/validators/adminListOrganizerDetailsInput";
import {
  validateAdminUpdateOrganizerDetailsCallablePayload,
} from "../shared/generated/validators/adminUpdateOrganizerDetailsInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  readOrganizerRouteReservationStatus,
  requireValidOrganizerCanonicalPath,
  reserveOrganizerCanonicalRoute,
  type OrganizerRouteReservationStatus,
} from "./organizerPublishingGuards";
import {
  buildOrganizerAdminSearchProjection,
  organizerWithAdminFieldsForSearch,
  organizerAdminSearchQueryTokens,
} from "./organizerAdminSearch";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {assertOrganizerPublicContent} from
  "../organizers/organizerPublicContent";
import {
  adminOwnerLinks,
  storedOwnerLinks,
  type OwnerLinkInput,
} from "../organizers/organizerLinks";

const organizerDetailsRoles = ["admin", "adminOwner", "support"] as const;

interface OrganizerDetailsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerDetailsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

type OrganizerDetailsPatch = AdminUpdateOrganizerDetailsCallablePayload["fields"];
type OrganizerWithLearningSource = OrganizerDocument &
  Pick<OrganizerDocument, "intakeLearningSource">;
type OrganizerWithOwnerLinks = OrganizerDocument &
  Pick<OrganizerDocument, "ownerLinks">;

export interface AdminOrganizerDetailsSnapshot {
  organizerId: string;
  name: string;
  description: string;
  location: string | null;
  area: string;
  tags: string[];
  instagramHandle: string | null;
  phoneNumber: string | null;
  email: string | null;
  imageUrl: string | null;
  profileImageUrl: string | null;
  organizerType: string;
  publicCategoryLabel: string | null;
  entityKind: string | null;
  entitySubtypes: string[];
  displayCategory: string | null;
  cityName: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  appVisibility: string | null;
  ownershipState: string | null;
  claimState: string | null;
  publicPage: {
    slug: string | null;
    citySlug: string | null;
    canonicalPath: string | null;
    publishStatus: string | null;
    indexStatus: string | null;
    robots: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  provenance: {
    origin: string | null;
    sourceConfidence: string | null;
    verificationStatus: string | null;
  };
  publicProfile: {
    headline: string | null;
    summary: string | null;
    sourceSummary: string | null;
    formats: string[];
  };
  /** Organizer page links, expired ones included, in display order. */
  ownerLinks: OwnerLinkInput[];
}

export interface AdminGetOrganizerDetailsResponse {
  organizer: AdminOrganizerDetailsSnapshot;
}

export interface AdminOrganizerListRow {
  organizerId: string;
  name: string;
  organizerType: string;
  publicCategoryLabel: string | null;
  displayCategory: string | null;
  cityName: string | null;
  citySlug: string | null;
  regionName: string | null;
  countryCode: string | null;
  appVisibility: string | null;
  claimState: string | null;
  ownershipState: string | null;
  canonicalPath: string | null;
  publishStatus: string | null;
  indexStatus: string | null;
  robots: string | null;
  sourceConfidence: string | null;
  verificationStatus: string | null;
  routeStatus: "missing" | "valid" | "invalid";
  routeReservationStatus: OrganizerRouteReservationStatus;
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminListOrganizerDetailsResponse {
  generatedAt: string;
  rows: AdminOrganizerListRow[];
}

export interface AdminUpdateOrganizerDetailsResponse {
  organizerId: string;
  updatedFieldCount: number;
}

/**
 * Loads a review-safe organizer snapshot for the admin cleanup editor.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetOrganizerDetailsResponse>} Organizer snapshot.
 */
export async function adminGetOrganizerDetailsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerDetailsDeps = defaultDeps
): Promise<AdminGetOrganizerDetailsResponse> {
  const adminContext = requireAdminRole(request, organizerDetailsRoles);
  const data = validateCallableWithAjv<AdminGetOrganizerDetailsCallablePayload>(
    request,
    validateAdminGetOrganizerDetailsCallablePayload,
    normalizeAdminGetOrganizerDetailsPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetOrganizerDetails", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const organizerSnap = await organizerRef.get();
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer listing not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument");
  return {organizer: publicOrganizerDetails(data.organizerId, organizer)};
}

/**
 * Lists canonical organizer profile rows from organizers/{organizerId}.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminListOrganizerDetailsResponse>} Organizer list rows.
 */
export async function adminListOrganizerDetailsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerDetailsDeps = defaultDeps
): Promise<AdminListOrganizerDetailsResponse> {
  const adminContext = requireAdminRole(request, organizerDetailsRoles);
  const data = validateCallableWithAjv<AdminListOrganizerDetailsCallablePayload>(
    request,
    validateAdminListOrganizerDetailsCallablePayload,
    normalizeAdminListOrganizerDetailsPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminListOrganizerDetails", {
    maxRequests: 60, windowMs: 60 * 1000,
  });

  const limit = clampLimit(data.limit);
  const queryText = normalizeSearchText(data.query);
  const searchTokens = organizerAdminSearchQueryTokens(queryText);
  const hasSearchQuery = searchTokens.length > 0;
  const now = deps.now?.() ?? new Date();
  let query: FirebaseFirestore.Query = db.collection("organizers");
  if (hasSearchQuery) {
    query = query.where(
      "adminSearch.tokens",
      "array-contains-any",
      searchTokens
    );
  }
  if (data.citySlug) {
    query = query.where("locationMarketId", "==", data.citySlug);
  } else if (data.citySlugs && data.citySlugs.length > 0) {
    query = query.where("locationMarketId", "in", data.citySlugs);
  }
  if (data.publishStatus) {
    query = query.where("publicPage.publishStatus", "==", data.publishStatus);
  }
  if (data.appVisibility) {
    query = query.where("appVisibility", "==", data.appVisibility);
  }
  const snapshot = await query
    .limit(queryLimitForSearch(limit, hasSearchQuery))
    .get();
  const rows = snapshot.docs
    .map((doc) =>
      publicOrganizerListRow(doc.id, requireDoc<OrganizerDocument>(doc, "OrganizerDocument")))
    .filter((row) => organizerListRowMatchesQuery(row, queryText))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
  const rowsWithRouteReservations =
    await attachOrganizerRouteReservationStatuses(db, rows);

  return {
    generatedAt: now.toISOString(),
    rows: rowsWithRouteReservations,
  };
}

/**
 * Applies an audited admin cleanup patch to owner-safe organizer fields.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerDetailsDeps} deps Injectable dependencies.
 * @return {Promise<AdminUpdateOrganizerDetailsResponse>} Save summary.
 */
export async function adminUpdateOrganizerDetailsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerDetailsDeps = defaultDeps
): Promise<AdminUpdateOrganizerDetailsResponse> {
  const adminContext = requireAdminRole(request, organizerDetailsRoles);
  const data =
    validateCallableWithAjv<AdminUpdateOrganizerDetailsCallablePayload>(
      request,
      validateAdminUpdateOrganizerDetailsCallablePayload,
      normalizeAdminUpdateOrganizerDetailsPayload
    );
  const patch = buildFirestorePatch(
    data.fields,
    deps.serverTimestamp(),
    adminContext.uid
  );
  const updatedFieldCount = Object.keys(patch).length;
  if (updatedFieldCount === 0) {
    throw new HttpsError("invalid-argument", "No editable fields supplied.");
  }
  const reviewNote = data.reviewNote;
  if (!reviewNote) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for audited organizer edits."
    );
  }
  assertOrganizerPublicContent({
    description: data.fields.description,
    publicPage: data.fields.publicPage,
    publicProfile: data.fields.publicProfile,
  }, "This organizer edit");

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminUpdateOrganizerDetails", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  await db.runTransaction(async (tx) => {
    const organizerSnap = await tx.get(organizerRef);
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    const before = requireDoc<OrganizerWithLearningSource>(
      organizerSnap,
      "OrganizerDocument"
    );
    if (data.fields.publicPage !== undefined) {
      const nextPublicPage = {
        ...(before.publicPage ?? {}),
        ...data.fields.publicPage,
      };
      const canonicalPath = nextPublicPage.canonicalPath ?? null;
      if (canonicalPath) {
        await reserveOrganizerCanonicalRoute(tx, db, {
          organizerId: data.organizerId,
          canonicalPath,
          slug: nextPublicPage.slug,
          citySlug: nextPublicPage.citySlug,
          previousCanonicalPath: before.publicPage?.canonicalPath ?? null,
          adminUid: adminContext.uid,
          source: "adminUpdateOrganizerDetails",
          serverTimestamp: deps.serverTimestamp,
        });
      }
    }
    const nextOrganizerForSearch = organizerWithAdminFieldsForSearch(before, {
      ...data.fields,
      ...(patch.location !== undefined ? {location: patch.location} : {}),
      ...(patch.locationCityId !== undefined ?
        {locationCityId: patch.locationCityId} :
        {}),
      ...(patch.locationMarketId !== undefined ?
        {locationMarketId: patch.locationMarketId} :
        {}),
      ...(patch.cityName !== undefined ? {cityName: patch.cityName} : {}),
      ...(patch.regionName !== undefined ? {regionName: patch.regionName} : {}),
      ...(patch.countryCode !== undefined ?
        {countryCode: patch.countryCode} :
        {}),
      ...(patch.countryName !== undefined ?
        {countryName: patch.countryName} :
        {}),
    });
    if (data.fields.publicPage?.publishStatus === "published") {
      assertOrganizerPublicContent(
        nextOrganizerForSearch,
        "Publishing this organizer"
      );
    }
    patch.adminSearch = buildOrganizerAdminSearchProjection(
      data.organizerId,
      nextOrganizerForSearch,
      deps.serverTimestamp(),
      "adminUpdateOrganizerDetails"
    );
    for (const correction of fieldCorrectionsForUpdate({
      organizerId: data.organizerId,
      before,
      fields: data.fields,
      reviewNote,
      correctedByUid: adminContext.uid,
      correctedAt: deps.serverTimestamp(),
    })) {
      tx.create(
        db.collection("organizerIntakeFieldCorrections")
          .doc(correction.correctionId),
        correction
      );
    }
    tx.update(organizerRef, patch);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminUpdateOrganizerDetails",
      targetPath: organizerRef.path,
      request,
      before: {organizer: publicOrganizerDetails(data.organizerId, before)},
      after: {
        organizerId: data.organizerId,
        updatedFields: Object.keys(patch).sort(),
      },
      note: reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {organizerId: data.organizerId, updatedFieldCount};
}

function fieldCorrectionsForUpdate({
  organizerId,
  before,
  fields,
  reviewNote,
  correctedByUid,
  correctedAt,
}: {
  organizerId: string;
  before: OrganizerWithLearningSource;
  fields: OrganizerDetailsPatch;
  reviewNote: string;
  correctedByUid: string;
  correctedAt: FirebaseFirestore.FieldValue;
}): OrganizerIntakeFieldCorrectionDocument[] {
  const source = before.intakeLearningSource;
  if (!source) return [];
  return source.seededFields.flatMap((seeded) => {
    if (seeded.field === "publicSources[0].href") return [];
    const beforeValue = organizerLearningFieldValue(before, seeded.field);
    const update = organizerLearningUpdateValue(fields, seeded.field);
    if (!update.present ||
        !sameLearningValue(beforeValue, seeded.extractedValue) ||
        sameLearningValue(update.value, seeded.extractedValue)) {
      return [];
    }
    const digest = crypto.createHash("sha256").update(JSON.stringify({
      organizerId,
      sourceProfileId: source.sourceProfileId,
      field: seeded.field,
      extractedValue: seeded.extractedValue,
      correctedValue: update.value,
    })).digest("hex");
    return [{
      schemaVersion: 1,
      correctionId: `field-correction-${digest}`,
      fixtureId: `field-fixture-${digest}`,
      organizerId,
      sourceProfileId: source.sourceProfileId,
      sourceWorkItemId: source.sourceWorkItemId,
      sourceCandidateId: source.sourceCandidateId,
      field: seeded.field,
      extractedValue: seeded.extractedValue,
      correctedValue: update.value,
      artifactId: seeded.artifactId,
      contentHash: seeded.contentHash,
      locator: seeded.locator,
      extractedBy: seeded.extractedBy,
      extractorVersion: seeded.extractorVersion,
      confidence: seeded.confidence,
      reviewNote,
      correctedByUid,
      correctedAt: correctedAt as never,
    }];
  });
}

function organizerLearningFieldValue(
  organizer: OrganizerWithLearningSource,
  field: string
): string | null | string[] | undefined {
  switch (field) {
  case "name": return organizer.name;
  case "location": return organizer.location;
  case "tags": return organizer.tags;
  case "publicProfile.sourceSummary":
    return organizer.publicProfile?.sourceSummary ?? null;
  case "publicProfile.formats":
    return organizer.publicProfile?.formats ?? [];
  default: return undefined;
  }
}

function organizerLearningUpdateValue(
  fields: OrganizerDetailsPatch,
  field: string
): {present: boolean; value: string | null | string[]} {
  const has = (object: object, key: string) =>
    Object.prototype.hasOwnProperty.call(object, key);
  switch (field) {
  case "name":
    return {present: has(fields, "name"), value: fields.name ?? ""};
  case "location":
    return {present: has(fields, "location"), value: fields.location ?? ""};
  case "tags":
    return {present: has(fields, "tags"), value: fields.tags ?? []};
  case "publicProfile.sourceSummary":
    return {
      present: Boolean(fields.publicProfile) &&
        has(fields.publicProfile as object, "sourceSummary"),
      value: fields.publicProfile?.sourceSummary ?? null,
    };
  case "publicProfile.formats":
    return {
      present: Boolean(fields.publicProfile) &&
        has(fields.publicProfile as object, "formats"),
      value: fields.publicProfile?.formats ?? [],
    };
  default:
    return {present: false, value: null};
  }
}

function sameLearningValue(
  left: string | null | string[] | undefined,
  right: string | null | string[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Builds the admin UI snapshot from the canonical club document.
 * @param {string} organizerId Firestore document id.
 * @param {OrganizerWithOwnerLinks} club Canonical organizer document.
 * @return {AdminOrganizerDetailsSnapshot} Admin-safe snapshot.
 */
function publicOrganizerDetails(
  organizerId: string,
  organizer: OrganizerWithOwnerLinks
): AdminOrganizerDetailsSnapshot {
  return {
    organizerId,
    name: organizer.name,
    description: organizer.description,
    location: organizer.location ?? null,
    area: organizer.area,
    tags: organizer.tags ?? [],
    instagramHandle: organizer.instagramHandle ?? null,
    phoneNumber: organizer.phoneNumber ?? null,
    email: organizer.email ?? null,
    imageUrl: organizer.imageUrl ?? null,
    profileImageUrl: organizer.profileImageUrl ?? null,
    organizerType: canonicalOrganizerType(organizer),
    publicCategoryLabel: organizer.publicCategoryLabel ??
      organizer.displayCategory ?? null,
    entityKind: organizer.entityKind ?? null,
    entitySubtypes: organizer.entitySubtypes ?? [],
    displayCategory: organizer.displayCategory ?? null,
    cityName: organizer.cityName ?? null,
    regionName: organizer.regionName ?? null,
    countryCode: organizer.countryCode ?? null,
    countryName: organizer.countryName ?? null,
    appVisibility: organizer.appVisibility ?? null,
    ownershipState: organizer.ownership?.state ?? null,
    claimState: organizer.claim?.state ?? null,
    publicPage: {
      slug: organizer.publicPage?.slug ?? null,
      citySlug: organizer.publicPage?.citySlug ?? null,
      canonicalPath: organizer.publicPage?.canonicalPath ?? null,
      publishStatus: organizer.publicPage?.publishStatus ?? null,
      indexStatus: organizer.publicPage?.indexStatus ?? null,
      robots: organizer.publicPage?.robots ?? null,
      seoTitle: organizer.publicPage?.seoTitle ?? null,
      seoDescription: organizer.publicPage?.seoDescription ?? null,
    },
    provenance: {
      origin: organizer.provenance?.origin ?? null,
      sourceConfidence: organizer.provenance?.sourceConfidence ?? null,
      verificationStatus: organizer.provenance?.verificationStatus ?? null,
    },
    publicProfile: {
      headline: organizer.publicProfile?.headline ?? null,
      summary: organizer.publicProfile?.summary ?? null,
      sourceSummary: organizer.publicProfile?.sourceSummary ?? null,
      formats: organizer.publicProfile?.formats ?? [],
    },
    ownerLinks: adminOwnerLinks(organizer.ownerLinks),
  };
}

/**
 * Builds a compact organizer row from the canonical club document.
 * @param {string} organizerId Firestore document id.
 * @param {OrganizerDocument} club Canonical club document.
 * @return {AdminOrganizerListRow} Admin-safe list row.
 */
function publicOrganizerListRow(
  organizerId: string,
  organizer: OrganizerDocument
): AdminOrganizerListRow {
  return {
    organizerId,
    name: organizer.name,
    organizerType: canonicalOrganizerType(organizer),
    publicCategoryLabel: organizer.publicCategoryLabel ??
      organizer.displayCategory ?? null,
    displayCategory: organizer.displayCategory ?? null,
    cityName: organizer.cityName ?? organizer.area ?? null,
    citySlug: organizer.locationMarketId ?? organizer.location ?? null,
    regionName: organizer.regionName ?? null,
    countryCode: organizer.countryCode ?? null,
    appVisibility: organizer.appVisibility ?? null,
    claimState: organizer.claim?.state ?? null,
    ownershipState: organizer.ownership?.state ?? null,
    canonicalPath: organizer.publicPage?.canonicalPath ?? null,
    publishStatus: organizer.publicPage?.publishStatus ?? null,
    indexStatus: organizer.publicPage?.indexStatus ?? null,
    robots: organizer.publicPage?.robots ?? null,
    sourceConfidence: organizer.provenance?.sourceConfidence ?? null,
    verificationStatus: organizer.provenance?.verificationStatus ?? null,
    routeStatus: publicRouteStatus(organizer),
    routeReservationStatus: "missing",
    searchIndexStatus: (organizer.adminSearch?.tokens?.length ?? 0) > 0 ?
      "indexed" :
      "missing",
  };
}

/**
 * Adds durable route reservation status to organizer list rows.
 * @param {FirebaseFirestore.Firestore} db Firestore database.
 * @param {AdminOrganizerListRow[]} rows Organizer rows.
 * @return {Promise<AdminOrganizerListRow[]>} Rows with reservation status.
 */
async function attachOrganizerRouteReservationStatuses(
  db: FirebaseFirestore.Firestore,
  rows: AdminOrganizerListRow[]
): Promise<AdminOrganizerListRow[]> {
  return Promise.all(rows.map(async (row) => {
    if (row.routeStatus !== "valid" || !row.canonicalPath) return row;
    return {
      ...row,
      routeReservationStatus: await readOrganizerRouteReservationStatus(
        db,
        row.organizerId,
        row.canonicalPath
      ),
    };
  }));
}

/**
 * Returns whether the public route is present and internally consistent.
 * @param {OrganizerDocument} club Canonical club document.
 * @return {"missing" | "valid" | "invalid"} Route status.
 */
function publicRouteStatus(
  organizer: OrganizerDocument
): "missing" | "valid" | "invalid" {
  if (!organizer.publicPage?.canonicalPath) return "missing";
  try {
    requireValidOrganizerCanonicalPath(
      organizer.publicPage.canonicalPath,
      organizer.publicPage.slug,
      organizer.publicPage.citySlug
    );
    return "valid";
  } catch {
    return "invalid";
  }
}

/**
 * Converts validated payload fields into Firestore dot-path updates.
 * @param {OrganizerDetailsPatch} fields Validated cleanup fields.
 * @param {FirebaseFirestore.FieldValue} timestamp Server timestamp.
 * @return {Record<string, unknown>} Firestore update patch.
 */
function buildFirestorePatch(
  fields: OrganizerDetailsPatch,
  timestamp: FirebaseFirestore.FieldValue,
  actorUid: string
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  copyDefined(patch, fields, [
    "name",
    "description",
    "location",
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
  ]);
  if (fields.organizerType !== undefined) {
    patch.organizerTypeUpdatedAt = timestamp;
    patch.organizerTypeUpdatedByUid = actorUid;
  }
  if (fields.location !== undefined) {
    const market = marketForIdOrAlias(fields.location);
    if (!market || !market.hostCreatable) {
      throw new HttpsError(
        "failed-precondition",
        "This city is not open for organizer publishing yet."
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
  copyNestedDefined(patch, "publicPage", fields.publicPage, [
    "slug",
    "citySlug",
    "canonicalPath",
    "publishStatus",
    "seoTitle",
    "seoDescription",
  ]);
  copyNestedDefined(patch, "publicProfile", fields.publicProfile, [
    "headline",
    "summary",
    "sourceSummary",
    "formats",
  ]);
  copyNestedDefined(patch, "provenance", fields.provenance, [
    "sourceConfidence",
    "verificationStatus",
  ]);
  if (fields.provenance !== undefined &&
      Object.keys(fields.provenance).length > 0) {
    patch["provenance.lastVerifiedAt"] = timestamp;
  }
  if (fields.ownerLinks !== undefined) {
    patch.ownerLinks = storedOwnerLinks(fields.ownerLinks,
      (date) => Timestamp.fromDate(date));
  }
  return patch;
}

/**
 * Copies defined top-level fields into the patch.
 * @param {Record<string, unknown>} patch Output patch.
 * @param {Record<string, unknown>} source Validated source object.
 * @param {string[]} keys Keys to copy.
 */
function copyDefined(
  patch: Record<string, unknown>,
  source: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    if (source[key] !== undefined) patch[key] = source[key];
  }
}

/**
 * Copies defined nested fields into Firestore dot paths.
 * @param {Record<string, unknown>} patch Output patch.
 * @param {string} prefix Firestore field prefix.
 * @param {Record<string, unknown> | undefined} source Nested source.
 * @param {string[]} keys Keys to copy.
 */
function copyNestedDefined(
  patch: Record<string, unknown>,
  prefix: string,
  source: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (source === undefined) return;
  for (const key of keys) {
    if (source[key] !== undefined) patch[`${prefix}.${key}`] = source[key];
  }
}

/**
 * Normalizes the get payload before schema validation.
 * @param {unknown} value Raw callable data.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminGetOrganizerDetailsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {...data, organizerId: normalizeString(data.organizerId)};
}

/**
 * Normalizes admin list payload filters before schema validation.
 * @param {unknown} value Raw callable data.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminListOrganizerDetailsPayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    query: normalizeNullableString(data.query),
    citySlug: normalizeNullableMarketId(data.citySlug),
    citySlugs: normalizeCityMarketIds(data.citySlugs),
    publishStatus: normalizeNullableString(data.publishStatus),
    appVisibility: normalizeNullableString(data.appVisibility),
  };
}

/**
 * Normalizes admin cleanup payload text and list fields before validation.
 * @param {unknown} value Raw callable data.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminUpdateOrganizerDetailsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const fields = data.fields && typeof data.fields === "object" ?
    data.fields as Record<string, unknown> :
    data.fields;
  if (!fields || typeof fields !== "object") {
    return {
      ...data,
      organizerId: normalizeString(data.organizerId),
      reviewNote: normalizeNullableString(data.reviewNote),
    };
  }
  return {
    ...data,
    organizerId: normalizeString(data.organizerId),
    reviewNote: normalizeNullableString(data.reviewNote),
    fields: normalizeOrganizerDetailsFields(fields as Record<string, unknown>),
  };
}

/**
 * Normalizes editable club fields.
 * @param {Record<string, unknown>} fields Raw fields object.
 * @return {Record<string, unknown>} Normalized fields.
 */
function normalizeOrganizerDetailsFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...mapStringFields(fields, [
      "name",
      "description",
      "location",
      "area",
      "organizerType",
      "entityKind",
      "appVisibility",
    ]),
    tags: normalizeStringArray(fields.tags),
    entitySubtypes: normalizeStringArray(fields.entitySubtypes),
    instagramHandle: normalizeNullableString(fields.instagramHandle),
    phoneNumber: normalizeNullableString(fields.phoneNumber),
    email: normalizeNullableString(fields.email),
    imageUrl: normalizeNullableString(fields.imageUrl),
    profileImageUrl: normalizeNullableString(fields.profileImageUrl),
    publicCategoryLabel: normalizeNullableString(fields.publicCategoryLabel),
    displayCategory: normalizeNullableString(fields.displayCategory),
    cityName: normalizeNullableString(fields.cityName),
    regionName: normalizeNullableString(fields.regionName),
    countryCode: normalizeCountryCode(fields.countryCode),
    countryName: normalizeNullableString(fields.countryName),
    publicPage: normalizeNestedObject(fields.publicPage, normalizePublicPage),
    provenance: normalizeNestedObject(fields.provenance, normalizeProvenance),
    publicProfile: normalizeNestedObject(
      fields.publicProfile,
      normalizePublicProfile
    ),
    ownerLinks: normalizeOwnerLinks(fields.ownerLinks),
  };
}

/**
 * Maps legacy organizer classification onto the canonical taxonomy.
 * @param {OrganizerDocument} club Organizer document in the legacy collection.
 * @return {string} Canonical organizer type.
 */
function canonicalOrganizerType(organizer: OrganizerDocument): string {
  if (organizer.organizerType) return organizer.organizerType;
  switch (organizer.entityKind) {
  case "creatorCommunity": return "community";
  case "eventOrganizer": return "eventProducer";
  case "venue": return "venue";
  case "brand": return "brand";
  default: return "club";
  }
}

/**
 * Normalizes public page cleanup fields.
 * @param {Record<string, unknown>} value Raw nested object.
 * @return {Record<string, unknown>} Normalized nested object.
 */
function normalizePublicPage(
  value: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...mapStringFields(value, [
      "slug",
      "citySlug",
      "canonicalPath",
      "publishStatus",
    ]),
    seoTitle: normalizeNullableString(value.seoTitle),
    seoDescription: normalizeNullableString(value.seoDescription),
  };
}

/**
 * Normalizes provenance fields.
 * @param {Record<string, unknown>} value Raw nested object.
 * @return {Record<string, unknown>} Normalized nested object.
 */
function normalizeProvenance(
  value: Record<string, unknown>
): Record<string, unknown> {
  return mapStringFields(value, ["sourceConfidence", "verificationStatus"]);
}

/**
 * Normalizes public profile fields.
 * @param {Record<string, unknown>} value Raw nested object.
 * @return {Record<string, unknown>} Normalized nested object.
 */
function normalizePublicProfile(
  value: Record<string, unknown>
): Record<string, unknown> {
  return {
    headline: normalizeNullableString(value.headline),
    summary: normalizeNullableString(value.summary),
    sourceSummary: normalizeNullableString(value.sourceSummary),
    formats: normalizeStringArray(value.formats),
  };
}

/**
 * Trims owner link text so blank subtitles and padded URLs validate.
 * @param {unknown} value Raw owner links.
 * @return {unknown} Normalized owner links.
 */
function normalizeOwnerLinks(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((link) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) return link;
    const fields = link as Record<string, unknown>;
    return {
      ...fields,
      ...mapStringFields(fields, ["label", "url"]),
      subtitle: normalizeNullableString(fields.subtitle),
      showUntil: normalizeNullableString(fields.showUntil),
    };
  });
}

/**
 * Preserves undefined nested objects so partial patches stay partial.
 * @param {unknown} value Raw nested value.
 * @param {function(Record<string, unknown>): Record<string, unknown>}
 * normalizer Normalizer.
 * @return {unknown} Normalized value.
 */
function normalizeNestedObject(
  value: unknown,
  normalizer: (value: Record<string, unknown>) => Record<string, unknown>
): unknown {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return normalizer(value as Record<string, unknown>);
}

/**
 * Trims selected string fields while preserving absent keys.
 * @param {Record<string, unknown>} source Source object.
 * @param {string[]} keys Keys to normalize.
 * @return {Record<string, unknown>} Normalized key subset.
 */
function mapStringFields(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      normalized[key] = normalizeString(source[key]);
    }
  }
  return normalized;
}

/**
 * Trims a string value.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Normalizes a canonical market id while preserving schema failures.
 * @param {unknown} value Raw market id.
 * @return {unknown} Normalized market id, null, or validation passthrough.
 */
function normalizeNullableMarketId(value: unknown): unknown {
  const normalized = normalizeNullableString(value);
  return typeof normalized === "string" ? normalized.toLowerCase() : normalized;
}

/**
 * Normalizes bounded multi-market admin list filters.
 * @param {unknown} value Raw citySlugs payload containing market ids.
 * @return {unknown} Unique normalized market ids or validation passthrough.
 */
function normalizeCityMarketIds(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return value;
  return Array.from(new Set(
    value
      .map((item) => normalizeNullableMarketId(item))
      .filter((item): item is string => typeof item === "string")
  ));
}

/**
 * Trims optional string fields and converts blanks to null.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized nullable text.
 */
function normalizeNullableString(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Trims and uppercases optional country codes.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized country code.
 */
function normalizeCountryCode(value: unknown): unknown {
  const normalized = normalizeNullableString(value);
  return typeof normalized === "string" ? normalized.toUpperCase() : normalized;
}

/**
 * Trims, drops blanks, and dedupes string arrays.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized array or original value for validation errors.
 */
function normalizeStringArray(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return value;
  return Array.from(new Set(
    value
      .map((item) => typeof item === "string" ? item.trim() : item)
      .filter((item) => typeof item === "string" && item.length > 0)
  ));
}

/**
 * Bounds the list limit.
 * @param {number | undefined} value Raw limit.
 * @return {number} Safe limit.
 */
function clampLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

/**
 * Returns a larger candidate window for token-backed searches.
 * @param {number} limit Requested row limit.
 * @param {boolean} hasSearchQuery Whether search tokens are applied.
 * @return {number} Firestore query limit.
 */
function queryLimitForSearch(limit: number, hasSearchQuery: boolean): number {
  if (hasSearchQuery) return Math.min(500, Math.max(limit * 10, limit));
  return Math.min(250, Math.max(limit * 4, limit));
}

/**
 * Normalizes a free-text admin search query.
 * @param {string | null | undefined} value Raw query.
 * @return {string} Search query.
 */
function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Applies deterministic text matching to a compact list row.
 * @param {AdminOrganizerListRow} row Organizer row.
 * @param {string} queryText Normalized query.
 * @return {boolean} Whether the row matches.
 */
function organizerListRowMatchesQuery(
  row: AdminOrganizerListRow,
  queryText: string
): boolean {
  if (!queryText) return true;
  const haystack = [
    row.organizerId,
    row.name,
    row.displayCategory,
    row.cityName,
    row.citySlug,
    row.regionName,
    row.countryCode,
    row.canonicalPath,
    row.publishStatus,
    row.indexStatus,
    row.appVisibility,
    row.claimState,
    row.ownershipState,
    row.sourceConfidence,
    row.verificationStatus,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  return queryText
    .split(/\s+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export const adminListOrganizerDetails = onCall(
  appCheckCallableOptions,
  (request) => adminListOrganizerDetailsHandler(request)
);

export const adminGetOrganizerDetails = onCall(
  appCheckCallableOptions,
  (request) => adminGetOrganizerDetailsHandler(request)
);

export const adminUpdateOrganizerDetails = onCall(
  appCheckCallableOptions,
  (request) => adminUpdateOrganizerDetailsHandler(request)
);
