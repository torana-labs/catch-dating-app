/* eslint-disable max-len */
import crypto from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminApproveOrganizerListingCallablePayload} from "../shared/generated/adminApproveOrganizerListingCallablePayload";
import type {AdminApproveOrganizerListingCallableResponse} from "../shared/generated/adminApproveOrganizerListingCallableResponse";
import type {
  OrganizerDocument,
  OrganizerIntakeCurationDecisionDocument,
  OrganizerIntakeReviewDecisionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateAdminApproveOrganizerListingCallablePayload} from "../shared/generated/validators/adminApproveOrganizerListingInput";
import {validateCallableWithAjv} from "../shared/validation";
import {validateOperationWorkItem} from "../operations/validation";
import type {OperationWorkItem} from "../operations/models";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {organizerSupplyCapabilitiesFor} from "../shared/organizerSupplyCapabilities";
import {assertOrganizerPublicContent} from "../organizers/organizerPublicContent";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {buildOrganizerAdminSearchProjection} from "./organizerAdminSearch";
import {reserveOrganizerCanonicalRoute} from "./organizerPublishingGuards";
import {assertOrganizerVisibilityDecisionAllowed} from "./supplyVisibilityPolicy";
import {newSalesAccount} from "./sales/account";
import type {SalesActivity, SalesOpportunity, SalesTask} from "./sales/types";

// Approving creates Sales records, which only admins and admin owners own.
const listingApprovalRoles = ["admin", "adminOwner"] as const;
const curationCollection = "organizerIntakeCurationDecisions";
const reviewDecisionCollection = "organizerIntakeReviewDecisions";

interface ListingApprovalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: (db: FirebaseFirestore.Firestore, uid: string, action: string) => Promise<void>;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
}

const defaultDeps: ListingApprovalDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
  reserveCanonicalRoute: reserveOrganizerCanonicalRoute,
};

interface ReviewedListing {
  listingId: string;
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery";
  submittedBy: {role: string; uid: string | null; partnerId: string | null};
  contentHash: string;
  description: string | null;
  categories: string[];
  links: Array<{platform: string; url: string; normalizedKey: string}>;
}

interface StoredRequest {
  status: string;
  approval: unknown;
  request: {origin: {kind: string; id: string} | null};
}

/** One approval per listing, whoever approves it and however often. */
export function listingApprovalId(listingId: string): string {
  return `listing-${crypto.createHash("sha256").update(listingId).digest("hex").slice(0, 40)}`;
}

/**
 * Approves a listing Supply Intake built. One transaction publishes the
 * organizer page claimable and noindex, hidden in the app; records the
 * curation receipt and the review decision; marks the request approved;
 * links the website or partner enquiry it came from; and opens the
 * organizer's Sales account, opportunity, review and claim-invite tasks, and
 * an activity attributed to the request. Indexing and app discovery stay
 * separate decisions, made after the organizer is verified.
 */
export async function adminApproveOrganizerListingHandler(
  request: CallableRequest<unknown>,
  deps: ListingApprovalDeps = defaultDeps
): Promise<AdminApproveOrganizerListingCallableResponse> {
  const adminContext = requireAdminRole(request, listingApprovalRoles);
  const data = validateCallableWithAjv<AdminApproveOrganizerListingCallablePayload>(request,
    validateAdminApproveOrganizerListingCallablePayload, normalizePayload);
  // The same gate as an Organizer Intake decision to publish on the web.
  assertOrganizerVisibilityDecisionAllowed({decision: "approve_public", publishStatus: "published",
    indexStatus: "noindex", appVisibility: "hidden", checklist: data.checklist});
  const market = marketForIdOrAlias(data.marketId);
  if (!market || !market.hostCreatable || market.marketId !== data.marketId) {
    throw new HttpsError("failed-precondition", "Choose an open organizer launch market for this listing.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminApproveOrganizerListing");
  const workItemRef = db.collection("operationWorkItems").doc(data.listingWorkItemId);
  const allocatedOrganizerRef = db.collection("organizers").doc();
  const materialHash = crypto.createHash("sha256").update(JSON.stringify([data.listingWorkItemId,
    data.contentHash, data.name, data.publicSlug, data.marketId, data.organizerType])).digest("hex");
  let approvalId = "";
  let organizerId = "";
  let salesOwnerUid = "";
  let created = false;

  await db.runTransaction(async (tx) => {
    const workItemSnap = await tx.get(workItemRef);
    if (!workItemSnap.exists) throw new HttpsError("not-found", "Supply Intake listing was not found.");
    const workItem = requireWorkItem(workItemSnap.data(), data.listingWorkItemId);
    const listing = requireListing(workItem);
    if (listing.contentHash !== data.contentHash) {
      throw new HttpsError("failed-precondition", "This listing was rebuilt after you reviewed it. Reload it and review again.");
    }
    approvalId = listingApprovalId(listing.listingId);
    const receiptRef = db.collection(curationCollection).doc(approvalId);
    const requestRef = db.collection(supplyIntakeCollections.requests).doc(listing.requestId);
    const [receiptSnap, requestSnap] = await Promise.all([tx.get(receiptRef), tx.get(requestRef)]);
    const stored = requestSnap.data() as StoredRequest | undefined;
    if (receiptSnap.exists) {
      // The request's approval replays an identical approval and refuses a different one.
      const receipt = receiptSnap.data() ?? {};
      const approval = recordValue(stored?.approval);
      if (receipt.operationType !== "create_entity_draft" || receipt.sourceWorkItemId !== data.listingWorkItemId ||
          approval?.approvalId !== approvalId || approval.materialHash !== materialHash) {
        throw new HttpsError("already-exists", `This listing was already approved as organizer ${String(receipt.entityId)}.`);
      }
      organizerId = String(receipt.entityId);
      salesOwnerUid = String(approval.salesOwnerUid);
      return;
    }
    if (!stored || stored.status !== "completed" || stored.approval !== null) {
      throw new HttpsError("failed-precondition", "The intake request for this listing is not ready for approval.");
    }
    const origin = stored.request.origin;
    const intentRef = origin?.kind === "sales_inbound_intent" ?
      db.collection("salesInboundIntents").doc(origin.id) : null;
    const intentSnap = intentRef ? await tx.get(intentRef) : null;
    organizerId = allocatedOrganizerRef.id;
    const organizerRef = db.collection("organizers").doc(organizerId);
    if ((await tx.get(organizerRef)).exists) {
      throw new HttpsError("already-exists", "Allocated organizer id is already in use; approve again.");
    }

    const timestamp = deps.serverTimestamp();
    const now = deps.now().toISOString();
    const organizer = buildListingOrganizer({data, listing, market, adminUid: adminContext.uid, timestamp,
      checkedAt: admin.firestore.Timestamp.fromDate(new Date(now))});
    assertOrganizerPublicContent(organizer, "Approving this listing");
    organizer.adminSearch = buildOrganizerAdminSearchProjection(organizerId, organizer, timestamp,
      "adminApproveOrganizerListing") as never;
    // An associate who nominated the organizer owns its Sales work; otherwise
    // the approver does. A partner is credited through the linked enquiry.
    salesOwnerUid = listing.submittedBy.role === "associate" && listing.submittedBy.uid ?
      listing.submittedBy.uid : adminContext.uid;
    await (deps.reserveCanonicalRoute ?? reserveOrganizerCanonicalRoute)(tx, db, {
      clubId: organizerId, canonicalPath: `/organizers/${data.publicSlug}/`, slug: data.publicSlug,
      citySlug: market.slug, adminUid: adminContext.uid, source: "adminApproveOrganizerListing",
      serverTimestamp: deps.serverTimestamp,
    });

    tx.create(organizerRef, organizer);
    const receipt: OrganizerIntakeCurationDecisionDocument = {
      schemaVersion: 1, operationId: approvalId, operationType: "create_entity_draft", operationStatus: "active",
      entityId: organizerId, sourceCandidateId: listing.listingId, sourceWorkItemId: data.listingWorkItemId,
      sourceNormalizedKey: `supply-intake:${listing.listingId}`, publicSlug: data.publicSlug, reason: data.note,
      reviewedByUid: adminContext.uid, reviewedAt: timestamp as never, updatedAt: timestamp as never,
    };
    tx.create(receiptRef, receipt);
    const decision: OrganizerIntakeReviewDecisionDocument = {
      schemaVersion: 1, entityId: organizerId, decision: "approve_public", decisionStatus: "approved_public",
      publishStatus: "published", indexStatus: "noindex", appVisibility: "hidden", checklist: data.checklist,
      note: data.note, reviewedByUid: adminContext.uid, reviewedAt: timestamp as never, updatedAt: timestamp as never,
      projectionState: "pending_static_generation",
    };
    tx.create(db.collection(reviewDecisionCollection).doc(organizerId), decision);
    tx.update(requestRef, {approval: {approvalId, organizerId, approvedByUid: adminContext.uid, approvedAt: now,
      materialHash, salesOwnerUid}, updatedAt: now});
    if (intentRef && intentSnap?.data()?.status === "needs_identity_review") {
      const intent = intentSnap.data() ?? {};
      tx.update(intentRef, {revision: Number(intent.revision) + 1, status: "linked", organizerId,
        linkedAt: admin.firestore.Timestamp.fromDate(new Date(now)), linkedBy: adminContext.uid,
        linkRequestId: approvalId, updatedAt: admin.firestore.Timestamp.fromDate(new Date(now))});
    }
    writeSalesRecords(tx, db, {approvalId, organizerId, organizer, ownerUid: salesOwnerUid,
      actorUid: adminContext.uid, now, listing, origin: origin?.kind ?? "none", name: data.name});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminApproveOrganizerListing", targetPath: organizerRef.path, request, before: {},
      after: {organizerId, approvalId, listingId: listing.listingId, requestId: listing.requestId,
        publicSlug: data.publicSlug, publishStatus: "published", indexStatus: "noindex",
        appVisibility: "hidden", claimState: "unclaimed", salesOwnerUid},
      note: data.note, serverTimestamp: deps.serverTimestamp,
    });
    created = true;
  });

  return {approvalId, organizerId, organizerPath: `organizers/${organizerId}`, created,
    publishStatus: "published", indexStatus: "noindex", appVisibility: "hidden", claimState: "unclaimed", salesOwnerUid};
}

export const adminApproveOrganizerListing = onCall(appCheckCallableOptions,
  (request) => adminApproveOrganizerListingHandler(request));

function writeSalesRecords(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, input: {
  approvalId: string; organizerId: string; organizer: OrganizerDocument; ownerUid: string; actorUid: string;
  now: string; listing: ReviewedListing; origin: string; name: string;
}): void {
  const {approvalId, organizerId, ownerUid, actorUid, now} = input;
  const account = {...newSalesAccount(organizerId, input.organizer as unknown as Record<string, unknown>,
    ownerUid, now), eventTypes: input.listing.categories.slice(0, 12), updatedBy: actorUid};
  tx.create(db.collection("organizerSalesAccounts").doc(organizerId), account);
  const opportunityId = `${approvalId}_opportunity`;
  const opportunity: SalesOpportunity = {schemaVersion: 1, classification: "sales_private", opportunityId,
    organizerId, revision: 1, motion: "first_workflow_pilot", stage: "new_enquiry", ownerUid,
    nextStep: `Invite ${input.name} to claim their page`, nextStepAt: null, stageEnteredAt: now,
    createdAt: now, updatedAt: now, updatedBy: actorUid};
  tx.create(db.collection("salesOpportunities").doc(opportunityId), opportunity);
  const task = (suffix: string, kind: SalesTask["kind"], title: string): SalesTask => ({
    schemaVersion: 1, classification: "sales_private", taskId: `${approvalId}_${suffix}`, organizerId,
    contactId: null, revision: 1, kind, title, dueAt: null, ownerUid, status: "open",
    createdAt: now, updatedAt: now, updatedBy: actorUid});
  for (const entry of [task("review", "research", "Check the published listing and its events"),
    task("claim", "follow_up", `Invite ${input.name} to claim their page`)]) {
    tx.create(db.collection("salesTasks").doc(entry.taskId), entry);
  }
  const activityId = `${approvalId}_approved`;
  const activity: SalesActivity = {schemaVersion: 1, classification: "sales_private", activityId, organizerId,
    opportunityId, type: "listing_approved", channel: null, outcome: null, providerConfirmed: false, occurredAt: now,
    recordedAt: now, note: `Listing approved from ${frontDoorLabel(input.listing)}. ` +
      "Published as an unclaimed page, not yet indexed.", actorUid,
    source: {kind: "supply_intake", requestId: input.listing.requestId, approvalId,
      origin: input.origin as "admin_nomination" | "sales_inbound_intent" | "discovery_run" | "none"}};
  tx.create(db.collection("salesActivities").doc(activityId), activity);
}

function frontDoorLabel(listing: ReviewedListing): string {
  if (listing.kind === "self_submission") return "the organizer's own submission";
  if (listing.kind === "discovery") return "discovery";
  return listing.submittedBy.role === "partner" ? "a partner nomination" : "an associate nomination";
}

function buildListingOrganizer({data, listing, market, adminUid, timestamp, checkedAt}: {
  data: AdminApproveOrganizerListingCallablePayload; listing: ReviewedListing;
  market: NonNullable<ReturnType<typeof marketForIdOrAlias>>; adminUid: string;
  timestamp: FirebaseFirestore.FieldValue; checkedAt: FirebaseFirestore.Timestamp;
}): OrganizerDocument {
  const formats = listing.categories.slice(0, 12);
  const sources = listing.links.slice(0, 8);
  return {
    name: data.name, description: listing.description ?? "", location: market.marketId,
    locationCityId: market.cityId, locationMarketId: market.marketId, area: "",
    hostUserId: null, hostName: null, hostAvatarUrl: null, ownerUserId: null, hostUserIds: [], hostProfiles: [],
    createdAt: timestamp as never,
    // Listing images stay off the public page until their media rights are settled.
    imageUrl: null, profileImageUrl: null, logoPhoto: null,
    tags: formats, organizerPhotos: [], followerCount: 0, organizerType: data.organizerType,
    organizerTypeUpdatedAt: timestamp as never, organizerTypeUpdatedByUid: adminUid, publicCategoryLabel: null,
    rating: 0, reviewCount: 0, nextEventAt: null, nextEventLabel: null, instagramHandle: null,
    phoneNumber: null, email: null, status: "active", archived: false, archivedAt: null, archiveReason: null,
    cityName: market.cityLabel, regionName: market.regionName, countryCode: market.countryIsoCode,
    countryName: market.countryName, appVisibility: "hidden",
    supplyCapabilities: organizerSupplyCapabilitiesFor({ownershipState: "programmatic", claimState: "unclaimed"}),
    ownership: {state: "programmatic", ownerUserId: null, primaryHostUserId: null, hostUserIds: [],
      claimedAt: null, claimedByUid: null},
    claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
    publicPage: {slug: data.publicSlug, citySlug: market.slug, canonicalPath: `/organizers/${data.publicSlug}/`,
      publishStatus: "published", indexStatus: "noindex", robots: "noindex, follow",
      seoTitle: null, seoDescription: null, lastRenderedAt: null},
    provenance: {origin: "import", sourceConfidence: "medium", verificationStatus: "sourceBacked",
      lastVerifiedAt: checkedAt as never},
    publicProfile: {headline: null, summary: null, sourceSummary: listing.description, formats, facts: [],
      eventEvidence: []},
    publicSources: sources.map((link) => ({type: link.platform, label: `${link.platform} page`,
      detail: `Public ${link.platform} page for ${data.name}.`, href: link.url, confidence: "medium",
      lastCheckedAt: checkedAt as never})),
  };
}

function requireWorkItem(value: unknown, workItemId: string): OperationWorkItem {
  const result = validateOperationWorkItem(value);
  if (!result.ok || result.value.workItemId !== workItemId) {
    throw new HttpsError("failed-precondition", "Supply Intake work item failed contract validation.");
  }
  return result.value;
}

function requireListing(workItem: OperationWorkItem): ReviewedListing {
  const intake = recordValue(workItem.normalizedPayload.intake);
  const listing = recordValue(intake?.listing);
  const organizer = recordValue(listing?.organizer);
  const submittedBy = recordValue(listing?.submittedBy);
  if (workItem.workflowId !== "supply-intake" || workItem.entityKind !== "organizer" ||
      workItem.lifecycleStatus === "published" || workItem.lifecycleStatus === "terminal" ||
      intake?.recordType !== "organizer_listing_draft" || !listing || !organizer || !submittedBy ||
      typeof listing.listingId !== "string" || typeof listing.requestId !== "string" ||
      typeof listing.contentHash !== "string" || !Array.isArray(organizer.links) ||
      !["nomination", "self_submission", "discovery"].includes(String(listing.kind))) {
    throw new HttpsError("failed-precondition", "Work item is not an active Supply Intake listing.");
  }
  const seen = new Set<string>();
  const links = organizer.links.flatMap((entry) => {
    const link = recordValue(entry);
    if (!link || typeof link.url !== "string" || typeof link.platform !== "string") return [];
    const key = typeof link.normalizedKey === "string" ? link.normalizedKey : link.url;
    if (!isWebUrl(link.url) || seen.has(key)) return [];
    seen.add(key);
    return [{platform: boundedText(link.platform, 80), url: link.url, normalizedKey: key}];
  });
  return {listingId: listing.listingId, requestId: listing.requestId,
    kind: listing.kind as ReviewedListing["kind"],
    submittedBy: {role: String(submittedBy.role), uid: nullableString(submittedBy.uid),
      partnerId: nullableString(submittedBy.partnerId)},
    contentHash: listing.contentHash, description: nullableString(organizer.description),
    categories: uniqueStrings(organizer.categories, 12, 80), links};
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  const trimmed = (entry: unknown) => typeof entry === "string" ? entry.trim() : entry;
  return {...data, listingWorkItemId: trimmed(data.listingWorkItemId), name: trimmed(data.name),
    publicSlug: typeof data.publicSlug === "string" ? data.publicSlug.trim().toLowerCase() : data.publicSlug,
    marketId: trimmed(data.marketId), organizerType: trimmed(data.organizerType), note: trimmed(data.note)};
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function boundedText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function uniqueStrings(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    const text = boundedText(entry, maxLength);
    return text ? [text] : [];
  }))).slice(0, maxItems);
}
