import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminCreateOrganizerDraftFromCandidateCallablePayload} from
  "../shared/generated/adminCreateOrganizerDraftFromCandidateCallablePayload";
import type {AdminCreateOrganizerDraftFromCandidateCallableResponse} from
  "../shared/generated/adminCreateOrganizerDraftFromCandidateCallableResponse";
import type {
  OrganizerDocument,
  OrganizerIntakeCurationDecisionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateAdminCreateOrganizerDraftFromCandidateCallablePayload,
} from
  "../shared/generated/validators/adminCreateOrganizerDraftFromCandidateInput";
import {validateCallableWithAjv} from "../shared/validation";
import {validateOperationWorkItem} from "../operations/validation";
import type {OperationWorkItem} from "../operations/models";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {buildOrganizerAdminSearchProjection} from "./organizerAdminSearch";
import {reserveOrganizerCanonicalRoute} from "./organizerPublishingGuards";
import {organizerDraftOperationId} from "./organizerDraftIdentity";
import {organizerSupplyCapabilitiesFor} from
  "../shared/organizerSupplyCapabilities";
import {assertOrganizerPublicContent} from
  "../organizers/organizerPublicContent";

const organizerIntakeRoles = ["admin", "adminOwner", "support"] as const;
const curationCollection = "organizerIntakeCurationDecisions";

interface OrganizerDraftDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  sourceTimestamp: (
    verifiedAt: string | null
  ) => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
}

const defaultDeps: OrganizerDraftDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  sourceTimestamp: sourceTimestampFromVerifiedAt,
  checkRateLimit: defaultCheckRateLimit,
  reserveCanonicalRoute: reserveOrganizerCanonicalRoute,
};

interface OrganizerCandidate {
  candidateId: string;
  canonicalUrl: string;
  normalizedKey: string | null;
  platform: string;
  snippet: string | null;
  title: string;
  queryIntent: {
    marketSlug: string | null;
  };
  existingEntityMatches: unknown[];
  reviewContext: {
    formats: string[];
    reviewNotes: string | null;
    verifiedAt: string | null;
  } | null;
}

/**
 * Creates an unclaimed source-backed organizer draft from a reviewed work item.
 * This boundary deliberately cannot publish, index, crawl, expose in-app, or
 * assign organizer ownership.
 */
export async function adminCreateOrganizerDraftFromCandidateHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerDraftDeps = defaultDeps
): Promise<AdminCreateOrganizerDraftFromCandidateCallableResponse> {
  const adminContext = requireAdminRole(request, organizerIntakeRoles);
  const data = validateCallableWithAjv<
    AdminCreateOrganizerDraftFromCandidateCallablePayload
  >(
    request,
    validateAdminCreateOrganizerDraftFromCandidateCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminCreateOrganizerDraftFromCandidate",
    {maxRequests: 10, windowMs: 60 * 1000}
  );

  const workItemRef = db.collection("operationWorkItems").doc(data.workItemId);
  const allocatedOrganizerRef = db.collection("organizers").doc();
  let organizerId = "";
  let organizerPath = "";
  let curationPath = "";
  let created = false;

  await db.runTransaction(async (tx) => {
    const workItemSnap = await tx.get(workItemRef);
    if (!workItemSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Supply Intake organizer candidate was not found."
      );
    }
    const workItem = requireWorkItem(
      workItemSnap.data(),
      data.workItemId
    );
    const candidate = requireOrganizerCandidate(workItem, data.candidateId);
    if (data.name !== candidate.title.trim()) {
      throw new HttpsError(
        "failed-precondition",
        "Draft name must match the reviewed source title; edit it after " +
          "creation with an audited organizer update."
      );
    }
    const sourceNormalizedKey = candidate.normalizedKey?.trim() ||
      candidate.canonicalUrl.trim().toLowerCase();
    const operationId = organizerDraftOperationId(sourceNormalizedKey);
    const operationRef = db.collection(curationCollection).doc(operationId);
    curationPath = operationRef.path;
    assertCandidateCanCreateDraft(candidate);
    const operationSnap = await tx.get(operationRef);
    assertExistingReceiptMatches(
      operationSnap.data(),
      data,
      sourceNormalizedKey
    );
    organizerId = nullableString(operationSnap.data()?.entityId) ??
      allocatedOrganizerRef.id;
    const organizerRef = db.collection("organizers").doc(organizerId);
    organizerPath = organizerRef.path;
    const organizerSnap = await tx.get(organizerRef);
    if (operationSnap.exists) {
      if (!organizerSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "Organizer draft receipt exists but its canonical organizer is " +
            "missing."
        );
      }
      return;
    }
    if (organizerSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "Allocated organizer id is already in use; retry draft creation."
      );
    }

    const market = marketForIdOrAlias(candidate.queryIntent.marketSlug);
    if (!market || !market.hostCreatable) {
      throw new HttpsError(
        "failed-precondition",
        "Candidate is not assigned to an open organizer launch market."
      );
    }
    const timestamp = deps.serverTimestamp();
    const canonicalPath = `/organizers/${data.publicSlug}/`;
    const fieldProvenance = draftFieldProvenance(workItem, candidate);
    if (fieldProvenance.length < 3) {
      throw new HttpsError(
        "failed-precondition",
        "Candidate evidence does not contain enough field provenance to " +
          "create a draft."
      );
    }
    const organizer = buildOrganizerDraft({
      adminUid: adminContext.uid,
      candidate,
      data,
      market,
      timestamp,
      sourceTimestamp: deps.sourceTimestamp(
        candidate.reviewContext?.verifiedAt ?? null
      ),
    });
    assertOrganizerPublicContent(organizer, "Organizer draft creation");
    organizer.intakeLearningSource = buildIntakeLearningSource({
      candidate,
      workItem,
      fieldProvenance,
      organizer,
      timestamp,
    });
    organizer.adminSearch = buildOrganizerAdminSearchProjection(
      organizerId,
      organizer,
      timestamp,
      "adminCreateOrganizerDraftFromCandidate"
    ) as never;

    await (deps.reserveCanonicalRoute ?? reserveOrganizerCanonicalRoute)(
      tx,
      db,
      {
        organizerId: organizerId,
        canonicalPath,
        slug: data.publicSlug,
        citySlug: market.slug,
        adminUid: adminContext.uid,
        source: "adminCreateOrganizerDraftFromCandidate",
        serverTimestamp: deps.serverTimestamp,
      }
    );

    tx.create(organizerRef, organizer);
    created = true;
    const operation: OrganizerIntakeCurationDecisionDocument = {
      schemaVersion: 1,
      operationId,
      operationType: "create_entity_draft",
      operationStatus: "active",
      entityId: organizerId,
      sourceCandidateId: data.candidateId,
      sourceWorkItemId: data.workItemId,
      sourceNormalizedKey,
      publicSlug: data.publicSlug,
      fieldProvenance: fieldProvenance as never,
      reason: data.reviewNote,
      reviewedByUid: adminContext.uid,
      reviewedAt: timestamp as never,
      updatedAt: timestamp as never,
    };
    tx.create(operationRef, operation);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminCreateOrganizerDraftFromCandidate",
      targetPath: organizerRef.path,
      request,
      before: {},
      after: {
        organizerId,
        publicSlug: data.publicSlug,
        sourceCandidateId: data.candidateId,
        sourceWorkItemId: data.workItemId,
        appVisibility: "hidden",
        ownershipState: "programmatic",
        claimState: "unclaimed",
        publishStatus: "draft",
        indexStatus: "noindex",
        crawlStatus: "disabled",
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  if (!curationPath) {
    throw new HttpsError(
      "internal",
      "Organizer draft receipt was not created."
    );
  }
  if (!organizerId || !organizerPath) {
    throw new HttpsError("internal", "Organizer draft identity was not set.");
  }
  return {
    organizerId,
    organizerPath,
    curationPath,
    created,
    appVisibility: "hidden",
    ownershipState: "programmatic",
    claimState: "unclaimed",
    publishStatus: "draft",
    indexStatus: "noindex",
    crawlStatus: "disabled",
  };
}

export const adminCreateOrganizerDraftFromCandidate = onCall(
  appCheckCallableOptions,
  (request) => adminCreateOrganizerDraftFromCandidateHandler(request)
);

function buildOrganizerDraft({
  adminUid,
  candidate,
  data,
  market,
  timestamp,
  sourceTimestamp,
}: {
  adminUid: string;
  candidate: OrganizerCandidate;
  data: AdminCreateOrganizerDraftFromCandidateCallablePayload;
  market: NonNullable<ReturnType<typeof marketForIdOrAlias>>;
  timestamp: FirebaseFirestore.FieldValue;
  sourceTimestamp: FirebaseFirestore.Timestamp;
}): OrganizerDocument {
  const sourceDetail = candidate.snippet ?
    boundedText(candidate.snippet, 600) :
    `Public source page for ${data.name}.`;
  const formats = uniqueStrings(
    candidate.reviewContext?.formats ?? [],
    12,
    80
  );
  return {
    name: data.name,
    description: "",
    location: market.marketId,
    locationCityId: market.cityId,
    locationMarketId: market.marketId,
    area: "",
    hostUserId: null,
    hostName: null,
    hostAvatarUrl: null,
    ownerUserId: null,
    hostUserIds: [],
    hostProfiles: [],
    createdAt: timestamp as never,
    imageUrl: null,
    profileImageUrl: null,
    logoPhoto: null,
    tags: formats,
    organizerPhotos: [],
    followerCount: 0,
    organizerType: data.organizerType,
    organizerTypeUpdatedAt: timestamp as never,
    organizerTypeUpdatedByUid: adminUid,
    publicCategoryLabel: null,
    rating: 0,
    reviewCount: 0,
    nextEventAt: null,
    nextEventLabel: null,
    instagramHandle: null,
    phoneNumber: null,
    email: null,
    status: "active",
    archived: false,
    archivedAt: null,
    archiveReason: null,
    cityName: market.cityLabel,
    regionName: market.regionName,
    countryCode: market.countryIsoCode,
    countryName: market.countryName,
    appVisibility: "hidden",
    supplyCapabilities: organizerSupplyCapabilitiesFor({
      ownershipState: "programmatic",
      claimState: "unclaimed",
    }),
    ownership: {
      state: "programmatic",
      ownerUserId: null,
      primaryHostUserId: null,
      hostUserIds: [],
      claimedAt: null,
      claimedByUid: null,
    },
    claim: {
      state: "unclaimed",
      claimHref: null,
      lastClaimRequestId: null,
    },
    publicPage: {
      slug: data.publicSlug,
      citySlug: market.slug,
      canonicalPath: `/organizers/${data.publicSlug}/`,
      publishStatus: "draft",
      indexStatus: "noindex",
      robots: "noindex, follow",
      seoTitle: null,
      seoDescription: null,
      lastRenderedAt: null,
    },
    provenance: {
      origin: "import",
      sourceConfidence: "medium",
      verificationStatus: "sourceBacked",
      lastVerifiedAt: sourceTimestamp as never,
    },
    publicProfile: {
      headline: null,
      summary: null,
      sourceSummary: candidate.snippet ?
        boundedText(candidate.snippet, 800) :
        null,
      formats,
      facts: [],
      eventEvidence: [],
    },
    publicSources: [{
      type: boundedText(candidate.platform, 80),
      label: boundedText(`${candidate.platform} source`, 120),
      detail: sourceDetail,
      href: candidate.canonicalUrl,
      confidence: "medium",
      lastCheckedAt: sourceTimestamp as never,
    }],
  };
}

function draftFieldProvenance(
  workItem: OperationWorkItem,
  candidate: OrganizerCandidate
): OperationWorkItem["fieldProvenance"] {
  const evidence = workItem.evidenceRefs[0];
  if (!evidence) return [];
  const mappings: Array<{
    target: string;
    source: string;
    present: boolean;
  }> = [
    {
      target: "name",
      source: "intake.candidate.title",
      present: true,
    },
    {
      target: "location",
      source: "intake.candidate.queryIntent.marketSlug",
      present: true,
    },
    {
      target: "publicSources[0].href",
      source: "intake.candidate.canonicalUrl",
      present: true,
    },
    {
      target: "publicProfile.sourceSummary",
      source: "intake.candidate.snippet",
      present: candidate.snippet !== null,
    },
    {
      target: "publicProfile.formats",
      source: "intake.candidate.reviewContext.formats",
      present: (candidate.reviewContext?.formats.length ?? 0) > 0,
    },
    {
      target: "tags",
      source: "intake.candidate.reviewContext.formats",
      present: (candidate.reviewContext?.formats.length ?? 0) > 0,
    },
  ];
  return mappings.flatMap((mapping) => {
    if (!mapping.present) return [];
    const source = workItem.fieldProvenance.find((entry) =>
      entry.field === mapping.source);
    if (!source) return [];
    return [{
      field: mapping.target,
      artifactId: source.artifactId,
      contentHash: source.contentHash,
      locator: source.locator,
      extractedBy: source.extractedBy,
      extractorVersion: source.extractorVersion,
      confidence: source.confidence,
    }];
  });
}

function buildIntakeLearningSource({
  candidate,
  workItem,
  fieldProvenance,
  organizer,
  timestamp,
}: {
  candidate: OrganizerCandidate;
  workItem: OperationWorkItem;
  fieldProvenance: OperationWorkItem["fieldProvenance"];
  organizer: OrganizerDocument;
  timestamp: FirebaseFirestore.FieldValue;
}): NonNullable<OrganizerDocument["intakeLearningSource"]> {
  const values = new Map<string, string | null | string[]>([
    ["name", organizer.name],
    ["location", organizer.location],
    ["tags", organizer.tags],
    [
      "publicProfile.sourceSummary",
      organizer.publicProfile?.sourceSummary ?? null,
    ],
    [
      "publicProfile.formats",
      organizer.publicProfile?.formats ?? [],
    ],
    ["publicSources[0].href", organizer.publicSources?.[0]?.href ?? null],
  ]);
  return {
    sourceProfileId: boundedText(
      `organizer_discovery:${candidate.platform}`,
      160
    ),
    sourceWorkItemId: workItem.workItemId,
    sourceCandidateId: candidate.candidateId,
    seededFields: fieldProvenance.flatMap((entry) => {
      const extractedValue = values.get(entry.field);
      if (extractedValue === undefined) return [];
      return [{
        field: entry.field as NonNullable<
          OrganizerDocument["intakeLearningSource"]
        >["seededFields"][number]["field"],
        extractedValue,
        artifactId: entry.artifactId,
        contentHash: entry.contentHash,
        locator: entry.locator,
        extractedBy: entry.extractedBy,
        extractorVersion: entry.extractorVersion,
        confidence: entry.confidence,
      }];
    }),
    capturedAt: timestamp as never,
  };
}

function sourceTimestampFromVerifiedAt(
  verifiedAt: string | null
): FirebaseFirestore.Timestamp {
  const milliseconds = verifiedAt ? Date.parse(verifiedAt) : Number.NaN;
  return admin.firestore.Timestamp.fromMillis(
    Number.isFinite(milliseconds) ? milliseconds : Date.now()
  );
}

function requireWorkItem(
  value: unknown,
  workItemId: string
): OperationWorkItem {
  const result = validateOperationWorkItem(value);
  if (!result.ok || result.value.workItemId !== workItemId) {
    throw new HttpsError(
      "failed-precondition",
      "Supply Intake work item failed contract validation."
    );
  }
  return result.value;
}

function requireOrganizerCandidate(
  workItem: OperationWorkItem,
  candidateId: string
): OrganizerCandidate {
  if (
    workItem.workflowId !== "supply-intake" ||
    workItem.entityKind !== "organizer" ||
    workItem.lifecycleStatus === "published" ||
    workItem.lifecycleStatus === "terminal"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Work item is not an active Supply Intake organizer candidate."
    );
  }
  const intake = recordValue(workItem.normalizedPayload.intake);
  const candidate = recordValue(intake?.candidate);
  const queryIntent = recordValue(candidate?.queryIntent);
  const reviewContext = recordValue(candidate?.reviewContext);
  if (
    intake?.recordType !== "organizer_search_candidate" ||
    !candidate ||
    candidate.candidateId !== candidateId ||
    workItem.externalKey !== candidateId ||
    typeof candidate.title !== "string" ||
    typeof candidate.canonicalUrl !== "string" ||
    typeof candidate.platform !== "string" ||
    !queryIntent ||
    !Array.isArray(candidate.existingEntityMatches)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Work item candidate identity does not match the reviewed request."
    );
  }
  try {
    const url = new URL(candidate.canonicalUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }
  } catch {
    throw new HttpsError(
      "failed-precondition",
      "Candidate canonical source URL is invalid."
    );
  }
  return {
    candidateId,
    canonicalUrl: candidate.canonicalUrl,
    normalizedKey: nullableString(candidate.normalizedKey),
    platform: candidate.platform,
    snippet: nullableString(candidate.snippet),
    title: candidate.title,
    queryIntent: {
      marketSlug: nullableString(queryIntent.marketSlug),
    },
    existingEntityMatches: candidate.existingEntityMatches,
    reviewContext: reviewContext ? {
      formats: uniqueStrings(reviewContext.formats, 12, 80),
      reviewNotes: nullableString(reviewContext.reviewNotes),
      verifiedAt: nullableString(reviewContext.verifiedAt),
    } : null,
  };
}

function assertCandidateCanCreateDraft(candidate: OrganizerCandidate) {
  if (candidate.existingEntityMatches.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      "Candidate matches an existing organizer; attach it instead."
    );
  }
  if (!candidate.reviewContext?.verifiedAt) {
    throw new HttpsError(
      "failed-precondition",
      "Candidate evidence must be reviewed before creating a draft."
    );
  }
  if (!Number.isFinite(Date.parse(candidate.reviewContext.verifiedAt))) {
    throw new HttpsError(
      "failed-precondition",
      "Candidate evidence review timestamp is invalid."
    );
  }
}

function assertExistingReceiptMatches(
  value: FirebaseFirestore.DocumentData | undefined,
  data: AdminCreateOrganizerDraftFromCandidateCallablePayload,
  sourceNormalizedKey: string
) {
  if (!value) return;
  if (
    value.operationType !== "create_entity_draft" ||
    value.sourceCandidateId !== data.candidateId ||
    value.sourceWorkItemId !== data.workItemId ||
    value.sourceNormalizedKey !== sourceNormalizedKey
  ) {
    throw new HttpsError(
      "already-exists",
      "This candidate identity already has a different organizer draft."
    );
  }
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    workItemId: trimmedString(data.workItemId),
    candidateId: trimmedString(data.candidateId),
    publicSlug: slugString(data.publicSlug),
    name: trimmedString(data.name),
    organizerType: trimmedString(data.organizerType),
    reviewNote: trimmedString(data.reviewNote),
  };
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> :
    null;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimmedString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function slugString(value: unknown): unknown {
  return typeof value === "string" ?
    value.trim().toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "") :
    value;
}

function boundedText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function uniqueStrings(
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    const text = boundedText(entry, maxLength);
    return text ? [text] : [];
  }))).slice(0, maxItems);
}
