/* eslint-disable max-len */
import crypto from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {AdminApproveOrganizerListingCallablePayload} from "../../shared/generated/adminApproveOrganizerListingCallablePayload";
import type {AdminApproveOrganizerListingCallableResponse} from "../../shared/generated/adminApproveOrganizerListingCallableResponse";
import type {
  OrganizerDocument,
  OrganizerIntakeCurationDecisionDocument,
  OrganizerIntakeReviewDecisionDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateOperationWorkItem} from "../../operations/validation";
import type {OperationWorkItem} from "../../operations/models";
import {supplyIntakeCollections} from "../../operations/supplyIntake/worker";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {organizerSupplyCapabilitiesFor} from "../../shared/organizerSupplyCapabilities";
import {assertOrganizerPublicContent} from "../../organizers/organizerPublicContent";
import type {AdminContext} from "../../platform/adminAuth";
import {setAdminAuditLogInTransaction} from "../../platform/adminAudit";
import {buildOrganizerAdminSearchProjection} from "../organizers/organizerAdminSearch";
import {reserveOrganizerCanonicalRoute} from "../organizers/organizerPublishingGuards";
import {assertProgrammaticListingChecklist} from "./supplyVisibilityPolicy";
import {formatsForListingCategories, labelsForFormats, type ProgrammaticListingFormat} from "./listingProgramFormats";
import {assertListingProgramOpen} from "./listingProgramState";
import {newSalesAccount} from "../../admin/sales/account";
import type {SalesActivity, SalesOpportunity, SalesTask} from "../../admin/sales/types";
import {growthFactsCollection, listingChannel, newGrowthFacts} from "../../growth/organizerGrowthFacts";
import {checkListingSuppression, suppressionModule} from "../../listingSuppressions/registry";

const curationCollection = "organizerIntakeCurationDecisions";
const reviewDecisionCollection = "organizerIntakeReviewDecisions";

export interface ListingApprovalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
  reserveCanonicalRoute?: typeof reserveOrganizerCanonicalRoute;
}

export const defaultListingApprovalDeps: ListingApprovalDeps = {
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
  request: {origin: {kind: string; id: string} | null; submittedAt?: string; seed?: unknown; target?: unknown};
}

/** One approval per listing, whoever approves it and however often. */
export function listingApprovalId(listingId: string): string {
  return `listing-${crypto.createHash("sha256").update(listingId).digest("hex").slice(0, 40)}`;
}

/** The review checklist as stored with the decision. */
export type ListingDecisionChecklist = OrganizerIntakeReviewDecisionDocument["checklist"];

/** What approves a listing: the reviewer's choices, minus the callable's idempotency key. */
export type ListingApprovalInput = Omit<AdminApproveOrganizerListingCallablePayload, "requestId" | "checklist">;

/**
 * Who approves a listing and how the decision is recorded: a staff member
 * through the callable, or Supply Intake publishing a trusted nominator's
 * listing (supplyIntake/autoPublish.ts).
 */
export interface ListingApprover {
  adminContext: AdminContext;
  request?: CallableRequest<unknown>;
  auditAction: string;
  checklist: ListingDecisionChecklist;
  /** Opens the Sales activity note: "Listing approved", "Listing auto-published". */
  activityLead: string;
  /**
   * Whether the approval opens a Sales account, opportunity and tasks.
   * Defaults to true, or to false when the approval names a cohort (owner
   * decision 9, 19 Nov 2026: Sales work opens only once an organizer in the
   * cohort claims or replies).
   */
  salesRecords?: boolean;
  /**
   * True when a person approves through Admin. A listing Catch sourced then
   * needs the reviewer's formats and the programmatic checklist items;
   * auto-publishing takes the formats its categories name.
   */
  reviewedByStaff?: boolean;
}

/**
 * A listing Catch sourced itself (an Admin or message nomination, or
 * discovery): the programmatic listings the pause switch, the formats and
 * the cohort apply to. An organizer's own submission is not.
 */
export function isProgrammaticListing(kind: string): boolean {
  return kind === "nomination" || kind === "discovery";
}

/** The market a listing can be published in, or null when it is not open for organizers. */
export function openMarket(marketId: string) {
  const market = marketForIdOrAlias(marketId);
  return market && market.hostCreatable && market.marketId === marketId ? market : null;
}

/** The approval transaction itself, shared by staff review and auto-publishing. */
export async function approveListing(deps: ListingApprovalDeps, approver: ListingApprover,
  data: ListingApprovalInput): Promise<AdminApproveOrganizerListingCallableResponse> {
  const {adminContext, request} = approver;
  const market = openMarket(data.marketId);
  if (!market) throw new HttpsError("failed-precondition", "Choose an open organizer launch market for this listing.");
  const db = deps.firestore();
  const workItemRef = db.collection("operationWorkItems").doc(data.listingWorkItemId);
  const allocatedOrganizerRef = db.collection("organizers").doc();
  // The programme fields join the hash only when set, so an approval made
  // before they existed still replays.
  const programme = data.formats !== undefined || data.cohortId !== undefined || data.salesRecords !== undefined ?
    [data.formats ?? null, data.cohortId ?? null, data.salesRecords ?? null] : [];
  const materialHash = crypto.createHash("sha256").update(JSON.stringify([data.listingWorkItemId,
    data.contentHash, data.name, data.publicSlug, data.marketId, data.organizerType, ...programme])).digest("hex");
  let approvalId = "";
  let organizerId = "";
  let salesOwnerUid = "";
  let created = false;
  let formats: ProgrammaticListingFormat[] = [];
  let salesRecords = true;

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
    const programmatic = isProgrammaticListing(listing.kind);
    if (programmatic) {
      await assertListingProgramOpen(db, "Nothing was published.", tx);
      if (approver.reviewedByStaff) {
        if (!data.formats?.length) {
          throw new HttpsError("invalid-argument", "Choose at least one format for this listing.");
        }
        assertProgrammaticListingChecklist(approver.checklist);
      }
    } else if (data.cohortId !== undefined) {
      throw new HttpsError("invalid-argument", "A cohort is only for a listing Catch sourced (a nomination or discovery).");
    }
    formats = data.formats ?? (programmatic ? formatsForListingCategories(listing.categories) : []);
    salesRecords = approver.salesRecords ?? data.cohortId === undefined;
    // Backstop for the do-not-list registry: the built listing can name a
    // handle or link the nomination did not, and a case may postdate intake.
    await assertListingNotSuppressed(tx, db, {data, listing, request: stored.request});
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
      checkedAt: admin.firestore.Timestamp.fromDate(new Date(now)), formats});
    assertOrganizerPublicContent(organizer, "Approving this listing");
    organizer.adminSearch = buildOrganizerAdminSearchProjection(organizerId, organizer, timestamp,
      "adminApproveOrganizerListing") as never;
    // An associate who nominated the organizer owns its Sales work; otherwise
    // the approver does. A partner is credited through the linked enquiry.
    salesOwnerUid = listing.submittedBy.role === "associate" && listing.submittedBy.uid ?
      listing.submittedBy.uid : adminContext.uid;
    await (deps.reserveCanonicalRoute ?? reserveOrganizerCanonicalRoute)(tx, db, {
      organizerId: organizerId, canonicalPath: `/organizers/${data.publicSlug}/`, slug: data.publicSlug,
      citySlug: market.slug, adminUid: adminContext.uid, source: "adminApproveOrganizerListing",
      serverTimestamp: deps.serverTimestamp,
    });

    tx.create(organizerRef, organizer);
    // The listing fixes the organizer's one acquisition channel and its first nominator.
    const channel = listingChannel({requestId: listing.requestId, kind: listing.kind,
      submittedBy: listing.submittedBy, submittedAt: new Date(stored.request.submittedAt ?? now),
      originKind: origin?.kind ?? null, intent: intentSnap?.data() ?? null});
    tx.create(db.collection(growthFactsCollection).doc(organizerId),
      newGrowthFacts(organizerId, market.marketId, channel, admin.firestore.Timestamp.fromDate(new Date(now))));
    const receipt: OrganizerIntakeCurationDecisionDocument = {
      schemaVersion: 1, operationId: approvalId, operationType: "create_entity_draft", operationStatus: "active",
      entityId: organizerId, sourceCandidateId: listing.listingId, sourceWorkItemId: data.listingWorkItemId,
      sourceNormalizedKey: `supply-intake:${listing.listingId}`, publicSlug: data.publicSlug, reason: data.note,
      reviewedByUid: adminContext.uid, reviewedAt: timestamp as never, updatedAt: timestamp as never,
    };
    tx.create(receiptRef, receipt);
    const decision: OrganizerIntakeReviewDecisionDocument = {
      schemaVersion: 1, entityId: organizerId, decision: "approve_public", decisionStatus: "approved_public",
      publishStatus: "published", indexStatus: "noindex", appVisibility: "hidden", checklist: approver.checklist,
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
    if (salesRecords) {
      writeSalesRecords(tx, db, {approvalId, organizerId, organizer, ownerUid: salesOwnerUid,
        actorUid: adminContext.uid, now, listing, origin: salesOrigin(origin?.kind), name: data.name,
        activityLead: approver.activityLead});
    }
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: approver.auditAction, targetPath: organizerRef.path, request, before: {},
      after: {organizerId, approvalId, listingId: listing.listingId, requestId: listing.requestId,
        publicSlug: data.publicSlug, publishStatus: "published", indexStatus: "noindex",
        appVisibility: "hidden", claimState: "unclaimed", salesOwnerUid, formats,
        cohortId: data.cohortId ?? null, salesRecords},
      note: data.note, serverTimestamp: deps.serverTimestamp,
    });
    created = true;
  });

  return {approvalId, organizerId, organizerPath: `organizers/${organizerId}`, created,
    publishStatus: "published", indexStatus: "noindex", appVisibility: "hidden", claimState: "unclaimed", salesOwnerUid};
}

/**
 * Refuses a listing whose approved name, slug, links or intake request match
 * an active do-not-list case, and fails closed while a case exists but the
 * registry key is unavailable. Reads only, inside the approval transaction.
 */
async function assertListingNotSuppressed(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore,
  {data, listing, request}: {data: ListingApprovalInput; listing: ReviewedListing; request: StoredRequest["request"]}): Promise<void> {
  const module = await suppressionModule();
  const keys = [...new Set([
    ...module.suppressionKeysForIdentity({names: data.name, slugs: data.publicSlug,
      urls: listing.links.map((link) => link.url)}),
    ...listing.links.map((link) => link.normalizedKey).filter((key) => typeof key === "string" && key.length > 0),
    ...module.suppressionKeysForIntakeRequest(request),
  ])];
  const suppression = await checkListingSuppression(tx, db, keys);
  if (suppression.state === "unavailable") {
    throw new HttpsError("unavailable", "The do-not-list check is unavailable (LISTING_SUPPRESSION_HMAC_KEY), " +
      "so listings cannot be approved. Nothing was published.");
  }
  if (suppression.state === "suppressed") {
    throw new HttpsError("failed-precondition", `This listing matches do-not-list case ${suppression.match.caseId} ` +
      "and cannot be approved.", {reason: "listing_suppressed", caseId: suppression.match.caseId});
  }
}

type SalesOrigin = "admin_nomination" | "sales_inbound_intent" | "message_nomination" | "discovery_run" | "none";

/** The Sales activity names only the front doors its contract lists; any other origin reads as none. */
function salesOrigin(kind: string | undefined): SalesOrigin {
  return kind === "admin_nomination" || kind === "sales_inbound_intent" || kind === "message_nomination" ||
    kind === "discovery_run" ? kind : "none";
}

function writeSalesRecords(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, input: {
  approvalId: string; organizerId: string; organizer: OrganizerDocument; ownerUid: string; actorUid: string;
  now: string; listing: ReviewedListing; origin: SalesOrigin; name: string; activityLead: string;
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
    recordedAt: now, note: `${input.activityLead} from ${frontDoorLabel(input.listing)}. ` +
      "Published as an unclaimed page, not yet indexed.", actorUid,
    source: {kind: "supply_intake", requestId: input.listing.requestId, approvalId, origin: input.origin}};
  tx.create(db.collection("salesActivities").doc(activityId), activity);
}

function frontDoorLabel(listing: ReviewedListing): string {
  if (listing.kind === "self_submission") return "the organizer's own submission";
  if (listing.kind === "discovery") return "discovery";
  return listing.submittedBy.role === "partner" ? "a partner nomination" : "an associate nomination";
}

/**
 * The organizer an approval creates. Chosen formats are written as their
 * page labels to publicProfile.formats, with the first as the public
 * category, so the city-by-format pages count the organizer; without them
 * the listing's categories stand in, as before.
 */
function buildListingOrganizer({data, listing, market, adminUid, timestamp, checkedAt,
  formats: chosen}: {
  data: ListingApprovalInput; listing: ReviewedListing;
  market: NonNullable<ReturnType<typeof marketForIdOrAlias>>; adminUid: string;
  timestamp: FirebaseFirestore.FieldValue; checkedAt: FirebaseFirestore.Timestamp;
  formats: readonly ProgrammaticListingFormat[];
}): OrganizerDocument {
  const tags = listing.categories.slice(0, 12);
  const labels = labelsForFormats(chosen);
  const formats = labels.length ? labels : tags;
  const sources = listing.links.slice(0, 8);
  return {
    name: data.name, description: listing.description ?? "", location: market.marketId,
    locationCityId: market.cityId, locationMarketId: market.marketId, area: "",
    hostUserId: null, hostName: null, hostAvatarUrl: null, ownerUserId: null, hostUserIds: [], hostProfiles: [],
    createdAt: timestamp as never,
    // Listing images stay off the public page until their media rights are settled.
    imageUrl: null, profileImageUrl: null, logoPhoto: null,
    tags, organizerPhotos: [], followerCount: 0, organizerType: data.organizerType,
    organizerTypeUpdatedAt: timestamp as never, organizerTypeUpdatedByUid: adminUid,
    publicCategoryLabel: labels[0] ?? null,
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
    ...(data.cohortId ? {listingProgram: {cohortId: data.cohortId, approvedAt: checkedAt as never}} : {}),
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
