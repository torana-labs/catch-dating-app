import crypto from "node:crypto";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import type {AdminCreateMarketingContentDraftCallablePayload} from
  "../shared/generated/adminCreateMarketingContentDraftCallablePayload";
import type {AdminCreateMarketingContentDraftCallableResponse} from
  "../shared/generated/adminCreateMarketingContentDraftCallableResponse";
import type {AdminRecordMarketingReviewDecisionCallablePayload} from
  "../shared/generated/adminRecordMarketingReviewDecisionCallablePayload";
import type {AdminRecordMarketingReviewDecisionCallableResponse} from
  "../shared/generated/adminRecordMarketingReviewDecisionCallableResponse";
import {
  validateAdminCreateMarketingContentDraftCallablePayload,
} from
  "../shared/generated/validators/adminCreateMarketingContentDraftInput";
import {
  validateAdminRecordMarketingReviewDecisionCallablePayload,
} from
  "../shared/generated/validators/adminRecordMarketingReviewDecisionInput";
import {validateCallableWithAjv} from "../shared/validation";

const marketingOpsRoles = ["admin", "adminOwner", "support"] as const;
const decisionCollection = "marketingReviewDecisions";

const targetTypes = new Set([
  "source_profile",
  "query_template",
  "run_plan",
  "source_result",
  "event_candidate",
  "recommendation_item",
  "recommendation_set",
  "content_draft",
]);

const decisions = new Set([
  "approve",
  "needs_changes",
  "hold",
  "reject",
  "export_ready",
]);

interface MarketingOpsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: MarketingOpsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

type MarketingOpsDecision =
  | "approve"
  | "needs_changes"
  | "hold"
  | "reject"
  | "export_ready";

type MarketingOpsTargetType =
  | "source_profile"
  | "query_template"
  | "run_plan"
  | "source_result"
  | "event_candidate"
  | "recommendation_item"
  | "recommendation_set"
  | "content_draft";

interface MarketingReviewChecklist {
  sourceReviewed?: boolean;
  dateReviewed?: boolean;
  venueReviewed?: boolean;
  copyReviewed?: boolean;
  rightsReviewed?: boolean;
  noCatchHostingImplied?: boolean;
}

type AdminRecordMarketingReviewDecisionPayload =
  AdminRecordMarketingReviewDecisionCallablePayload;

type AdminRecordMarketingReviewDecisionResponse =
  AdminRecordMarketingReviewDecisionCallableResponse;

type MarketingDraftType = "event_highlights" | "feature_explainer";

type AdminCreateMarketingContentDraftPayload =
  AdminCreateMarketingContentDraftCallablePayload;

type AdminCreateMarketingContentDraftResponse =
  AdminCreateMarketingContentDraftCallableResponse;

interface AdminGetMarketingOpsDashboardResponse {
  bridge: Record<string, unknown>;
}

/**
 * Returns the latest Firestore-published marketing ops dashboard. Missing
 * operational state returns an explicit empty dashboard; production never
 * falls back to a repository snapshot.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {MarketingOpsDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetMarketingOpsDashboardResponse>} Dashboard bridge.
 */
export async function adminGetMarketingOpsDashboardHandler(
  request: CallableRequest<unknown>,
  deps: MarketingOpsDeps = defaultDeps
): Promise<AdminGetMarketingOpsDashboardResponse> {
  const adminContext = requireAdminRole(request, marketingOpsRoles);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetMarketingOpsDashboard",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const snap = await db
    .collection("marketingOpsDashboards")
    .doc("current")
    .get();
  const data = snap.exists ? snap.data() ?? {} : {};
  const bridge = data.bridge;
  if (bridge && typeof bridge === "object" && !Array.isArray(bridge)) {
    return {bridge: bridge as Record<string, unknown>};
  }
  return {bridge: emptyMarketingOpsBridge(deps.now?.() ?? new Date())};
}

/**
 * Records a manual review decision for one marketing loop object. This is a
 * decision/audit write only; it does not publish posts, create app events, or
 * run web crawlers.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {MarketingOpsDeps} deps Injectable dependencies.
 * @return {Promise<AdminRecordMarketingReviewDecisionResponse>} Decision.
 */
export async function adminRecordMarketingReviewDecisionHandler(
  request: CallableRequest<unknown>,
  deps: MarketingOpsDeps = defaultDeps
): Promise<AdminRecordMarketingReviewDecisionResponse> {
  const adminContext = requireAdminRole(request, marketingOpsRoles);
  validateCallableWithAjv(
    request,
    validateAdminRecordMarketingReviewDecisionCallablePayload
  );
  const data = normalizePayload(request.data);
  assertPayload(data);
  assertDecisionAllowed(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminRecordMarketingReviewDecision",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionId = decisionIdForMarketingTarget(
    data.targetType,
    data.targetId
  );
  const decisionRef = db.collection(decisionCollection).doc(decisionId);
  const timestamp = deps.serverTimestamp();
  const decisionStatus = decisionStatusFor(data.decision);
  const decisionDoc = {
    schemaVersion: 1,
    decisionId,
    targetType: data.targetType,
    targetId: data.targetId,
    decision: data.decision,
    decisionStatus,
    runId: data.runId ?? null,
    note: data.note ?? null,
    checklist: data.checklist ?? {},
    edits: sanitizeForFirestore(data.edits ?? {}),
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp,
    updatedAt: timestamp,
    effect: "decision_only_no_publish",
  };

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(decisionRef);
    tx.set(decisionRef, decisionDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminRecordMarketingReviewDecision",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        targetType: data.targetType,
        targetId: data.targetId,
        decision: data.decision,
        decisionStatus,
        runId: data.runId ?? null,
      },
      note: data.note ?? null,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    decisionId,
    targetType: data.targetType,
    targetId: data.targetId,
    decision: data.decision,
    decisionStatus,
    decisionPath: decisionRef.path,
  };
}

/**
 * Creates a new editable content draft in the current marketing ops bridge.
 * The draft is not published; it is only appended for manual review/export.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {MarketingOpsDeps} deps Injectable dependencies.
 * @return {Promise<AdminCreateMarketingContentDraftResponse>} Draft result.
 */
export async function adminCreateMarketingContentDraftHandler(
  request: CallableRequest<unknown>,
  deps: MarketingOpsDeps = defaultDeps
): Promise<AdminCreateMarketingContentDraftResponse> {
  const adminContext = requireAdminRole(request, marketingOpsRoles);
  validateCallableWithAjv(
    request,
    validateAdminCreateMarketingContentDraftCallablePayload
  );
  const data = normalizeDraftPayload(request.data);
  assertDraftPayload(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminCreateMarketingContentDraft",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const dashboardRef = db.collection("marketingOpsDashboards").doc("current");
  const now = deps.now?.() ?? new Date();
  const createdAt = now.toISOString();
  const timestamp = deps.serverTimestamp();
  let createdDraft: Record<string, unknown> | null = null;
  let nextBridge: Record<string, unknown> | null = null;

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(dashboardRef);
    const before = beforeSnap.exists ? beforeSnap.data() ?? {} : {};
    const bridge = bridgeFromDashboard(before, now);
    const draft = buildMarketingContentDraft(bridge, data, createdAt);
    const updatedBridge = appendDraftToBridge(
      bridge,
      draft,
      adminContext.uid,
      data.draftType,
      createdAt
    );

    tx.set(dashboardRef, {
      bridge: sanitizeForFirestore(updatedBridge),
      updatedAt: timestamp,
    }, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminCreateMarketingContentDraft",
      targetPath: dashboardRef.path,
      request,
      before: before,
      after: {
        draftId: draft.id,
        draftType: data.draftType,
        contentDrafts: draftCount(updatedBridge),
      },
      note: data.title ?? null,
      serverTimestamp: deps.serverTimestamp,
    });

    createdDraft = draft;
    nextBridge = updatedBridge;
  });

  if (!createdDraft || !nextBridge) {
    throw new HttpsError("internal", "Unable to create marketing draft.");
  }

  return {
    draft: createdDraft,
    bridge: nextBridge,
    dashboardPath: dashboardRef.path,
  };
}

/**
 * Builds a stable Firestore-safe decision id.
 * @param {MarketingOpsTargetType} targetType Target type.
 * @param {string} targetId Target id.
 * @return {string} Decision id.
 */
export function decisionIdForMarketingTarget(
  targetType: MarketingOpsTargetType,
  targetId: string
): string {
  const slug = `${targetType}-${targetId}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "marketing-target";
  const base = `marketing-${slug}`;
  if (base.length <= 150) return base;
  const hash = crypto
    .createHash("sha256")
    .update(`${targetType}:${targetId}`)
    .digest("hex")
    .slice(0, 12);
  return `${base.slice(0, 137).replace(/-+$/g, "")}-${hash}`;
}

/**
 * Normalizes incoming data before validation.
 * @param {unknown} value Raw payload.
 * @return {AdminRecordMarketingReviewDecisionPayload} Normalized payload.
 */
function normalizePayload(
  value: unknown
): AdminRecordMarketingReviewDecisionPayload {
  const data = value && typeof value === "object" ?
    value as Record<string, unknown> :
    {};
  return {
    targetType: trim(data.targetType) as MarketingOpsTargetType,
    targetId: trim(data.targetId),
    decision: trim(data.decision) as MarketingOpsDecision,
    runId: nullableTrim(data.runId),
    note: trim(data.note),
    edits: plainRecord(data.edits),
    checklist: plainRecord(data.checklist) as MarketingReviewChecklist,
  };
}

/**
 * Normalizes incoming draft creation data.
 * @param {unknown} value Raw payload.
 * @return {AdminCreateMarketingContentDraftPayload} Normalized payload.
 */
function normalizeDraftPayload(
  value: unknown
): AdminCreateMarketingContentDraftPayload {
  const data = value && typeof value === "object" ?
    value as Record<string, unknown> :
    {};
  return {
    draftType: trim(data.draftType) as MarketingDraftType,
    cityId: nullableTrim(data.cityId),
    weekStart: nullableTrim(data.weekStart),
    sourceRecommendationSetId: nullableTrim(data.sourceRecommendationSetId),
    title: nullableTrim(data.title),
  };
}

/**
 * Validates payload shape.
 * @param {AdminRecordMarketingReviewDecisionPayload} data Payload.
 */
function assertPayload(data: AdminRecordMarketingReviewDecisionPayload): void {
  if (!targetTypes.has(data.targetType)) {
    throw new HttpsError("invalid-argument", "Unknown marketing target type.");
  }
  if (!data.targetId) {
    throw new HttpsError(
      "invalid-argument",
      "Marketing target id is required."
    );
  }
  if (!decisions.has(data.decision)) {
    throw new HttpsError("invalid-argument", "Unknown marketing decision.");
  }
  if (!data.note) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for marketing decisions."
    );
  }
  if (data.note && data.note.length > 2000) {
    throw new HttpsError("invalid-argument", "Review note is too long.");
  }
  if (JSON.stringify(data.edits ?? {}).length > 50000) {
    throw new HttpsError("invalid-argument", "Edited payload is too large.");
  }
}

/**
 * Validates draft creation payload shape.
 * @param {AdminCreateMarketingContentDraftPayload} data Payload.
 */
function assertDraftPayload(
  data: AdminCreateMarketingContentDraftPayload
): void {
  if (
    data.draftType !== "event_highlights" &&
    data.draftType !== "feature_explainer"
  ) {
    throw new HttpsError("invalid-argument", "Unknown marketing draft type.");
  }
  if (data.title && data.title.length > 140) {
    throw new HttpsError("invalid-argument", "Draft title is too long.");
  }
  if (data.cityId && !/^[a-z0-9-]{2,60}$/.test(data.cityId)) {
    throw new HttpsError("invalid-argument", "Invalid marketing city id.");
  }
  if (data.weekStart && !/^\d{4}-\d{2}-\d{2}$/.test(data.weekStart)) {
    throw new HttpsError("invalid-argument", "Invalid marketing week.");
  }
}

/**
 * Enforces human-review guardrails for approvals.
 * @param {AdminRecordMarketingReviewDecisionPayload} data Payload.
 */
function assertDecisionAllowed(
  data: AdminRecordMarketingReviewDecisionPayload
): void {
  if (data.decision !== "approve" && data.decision !== "export_ready") {
    return;
  }
  const checklist = data.checklist ?? {};
  if (!checklist.noCatchHostingImplied) {
    throw new HttpsError(
      "failed-precondition",
      "Approval requires confirming the copy does not imply Catch hosts " +
        "third-party events."
    );
  }
  if (data.targetType === "event_candidate" &&
    (!checklist.sourceReviewed ||
      !checklist.dateReviewed ||
      !checklist.venueReviewed)) {
    throw new HttpsError(
      "failed-precondition",
      "Event candidate approval requires source, date, and venue review."
    );
  }
  if (data.targetType === "recommendation_item" &&
    (!checklist.sourceReviewed || !checklist.copyReviewed)) {
    throw new HttpsError(
      "failed-precondition",
      "Recommendation approval requires source and copy review."
    );
  }
  if (data.targetType === "content_draft" &&
    (!checklist.copyReviewed || !checklist.rightsReviewed)) {
    throw new HttpsError(
      "failed-precondition",
      "Content draft export requires copy and rights review."
    );
  }
}

/**
 * Maps decisions to stable statuses.
 * @param {MarketingOpsDecision} decision Decision.
 * @return {AdminRecordMarketingReviewDecisionResponse["decisionStatus"]}
 * Status.
 */
function decisionStatusFor(
  decision: MarketingOpsDecision
): AdminRecordMarketingReviewDecisionResponse["decisionStatus"] {
  if (decision === "approve") return "approved";
  if (decision === "hold") return "held";
  if (decision === "reject") return "rejected";
  if (decision === "export_ready") return "export_ready";
  return "needs_changes";
}

/**
 * Removes values Firestore rejects.
 * @param {Record<string, unknown>} value Raw record.
 * @return {Record<string, unknown>} Sanitized record.
 */
function sanitizeForFirestore(
  value: Record<string, unknown>
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/**
 * Extracts the bridge record from a dashboard document.
 * @param {Record<string, unknown>} dashboard Dashboard document.
 * @param {Date} now Stable timestamp for generated empty state.
 * @return {Record<string, unknown>} Marketing bridge.
 */
function bridgeFromDashboard(
  dashboard: Record<string, unknown>,
  now: Date
): Record<string, unknown> {
  const bridge = dashboard.bridge;
  if (bridge && typeof bridge === "object" && !Array.isArray(bridge)) {
    return structuredClone(bridge) as Record<string, unknown>;
  }
  return emptyMarketingOpsBridge(now);
}

/**
 * Builds an editable draft from current bridge data.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @param {AdminCreateMarketingContentDraftPayload} data Payload.
 * @param {string} createdAt Creation timestamp.
 * @return {Record<string, unknown>} Content draft.
 */
function buildMarketingContentDraft(
  bridge: Record<string, unknown>,
  data: AdminCreateMarketingContentDraftPayload,
  createdAt: string
): Record<string, unknown> {
  const cityId = data.cityId ?? stringFromPath(bridge, "city.id") ?? "mumbai";
  const weekStart = data.weekStart ?? stringValue(bridge.weekStart) ??
    createdAt.slice(0, 10);
  const existingDrafts = recordArray(bridge.contentDrafts);
  const draftId = marketingDraftId(
    data.draftType,
    cityId,
    weekStart,
    createdAt,
    existingDrafts.length
  );
  const base = {
    id: draftId,
    recommendationSetId: "manual",
    cityId,
    weekStart,
    format: "instagram_carousel",
    tone: data.draftType,
    status: "draft",
    reviewState: "new",
    aspectRatio: "4:5",
    delivery: {
      posting: "manual_instagram_upload",
      currentExport: "copy_and_png",
      finalImageExport: "1080x1350_png",
      autoPosting: false,
    },
    brandContract: {
      logo: "Catch _",
      headlineFont: "Archivo",
      labelFont: "IBM Plex Mono",
      bodyFont: "SF Pro Text",
      primitives: ["wordmark", "activity-accent", "source-footnote"],
      rendererStatus: "admin_draft",
    },
    ctas: [
      {
        id: "join-waitlist",
        label: "Join waitlist",
        destination: "catch_waitlist",
        purpose: "member_acquisition",
      },
      {
        id: "submit-event",
        label: "Submit an event",
        destination: "organizer_intake",
        purpose: "organizer_acquisition",
      },
    ],
    latestDecision: null,
  };
  if (data.draftType === "feature_explainer") {
    return {
      ...base,
      recommendationSetId: "app-feature-media",
      caption: featureDraftCaption(),
      slides: buildFeatureDraftSlides(bridge),
    };
  }
  const recommendationSet = selectRecommendationSet(
    bridge,
    data.sourceRecommendationSetId
  );
  return {
    ...base,
    recommendationSetId: stringValue(recommendationSet?.id) ?? "manual",
    caption: eventDraftCaption(bridge, recommendationSet),
    slides: buildEventDraftSlides(bridge, recommendationSet),
  };
}

/**
 * Appends a draft and updates bridge summary/audit fields.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @param {Record<string, unknown>} draft Draft to append.
 * @param {string} actorUid Admin actor uid.
 * @param {MarketingDraftType} draftType Draft type.
 * @param {string} createdAt Creation timestamp.
 * @return {Record<string, unknown>} Updated bridge.
 */
function appendDraftToBridge(
  bridge: Record<string, unknown>,
  draft: Record<string, unknown>,
  actorUid: string,
  draftType: MarketingDraftType,
  createdAt: string
): Record<string, unknown> {
  const contentDrafts = [...recordArray(bridge.contentDrafts), draft];
  const summary = plainRecord(bridge.summary) ?? {};
  return {
    ...bridge,
    generatedAt: stringValue(bridge.generatedAt) ?? createdAt,
    summary: {
      ...summary,
      contentDrafts: contentDrafts.length,
      exportReadyDrafts: contentDrafts.filter(isExportReadyDraft).length,
    },
    contentDrafts,
    auditTrail: [
      ...recordArray(bridge.auditTrail),
      {
        targetType: "content_draft",
        targetId: draft.id,
        decision: "new",
        note: `Created ${draftType.replace("_", " ")} draft.`,
        reviewer: actorUid,
        reviewedAt: createdAt,
        edits: {draftType},
      },
    ],
  };
}

/**
 * Builds a stable-ish readable draft id with a collision-resistant suffix.
 * @param {MarketingDraftType} draftType Draft type.
 * @param {string} cityId City id.
 * @param {string} weekStart Week start date.
 * @param {string} createdAt Creation timestamp.
 * @param {number} existingCount Existing draft count.
 * @return {string} Draft id.
 */
function marketingDraftId(
  draftType: MarketingDraftType,
  cityId: string,
  weekStart: string,
  createdAt: string,
  existingCount: number
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${draftType}:${cityId}:${weekStart}:${createdAt}:${existingCount}`)
    .digest("hex")
    .slice(0, 8);
  return [
    cityId,
    weekStart,
    draftType.replace("_", "-"),
    hash,
  ].join("-");
}

/**
 * Selects a recommendation set for an event highlights draft.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @param {string | null | undefined} requestedId Requested set id.
 * @return {Record<string, unknown> | null} Recommendation set.
 */
function selectRecommendationSet(
  bridge: Record<string, unknown>,
  requestedId?: string | null
): Record<string, unknown> | null {
  const sets = recordArray(bridge.recommendationSets);
  const requested = requestedId ?
    sets.find((set) => set.id === requestedId) :
    null;
  if (requested) return requested;
  return sets.find((set) => recordArray(set.items).length > 0) ??
    sets[0] ??
    null;
}

/**
 * Builds event-highlight carousel slides from recommendation items.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @param {Record<string, unknown> | null} set Recommendation set.
 * @return {Record<string, unknown>[]} Slides.
 */
function buildEventDraftSlides(
  bridge: Record<string, unknown>,
  set: Record<string, unknown> | null
): Record<string, unknown>[] {
  const eventById = new Map(
    recordArray(bridge.eventCandidates).map((event) => [
      stringValue(event.id) ?? "",
      event,
    ])
  );
  const items = recordArray(set?.items).slice(0, 3);
  const slides: Record<string, unknown>[] = [
    {
      id: "cover",
      role: "cover",
      headline: stringValue(set?.title) ?? "Plans worth leaving the app for.",
      body: "Source-backed events for the week, checked for public use " +
        "before export.",
      image: null,
    },
  ];
  items.forEach((item, index) => {
    const event = eventById.get(stringValue(item.eventCandidateId) ?? "");
    slides.push({
      id: `event-${index + 1}`,
      role: "event",
      eventCandidateId: stringValue(item.eventCandidateId) ?? null,
      headline: stringValue(item.title) ??
        stringValue(event?.title) ??
        `Pick ${index + 1}`,
      body: eventSlideBody(item, event),
      image: null,
    });
  });
  slides.push({
    id: "cta",
    role: "cta",
    headline: "Know a plan we should review?",
    body: "Send it through organizer intake. Catch only promotes sourced " +
      "events after human review.",
    image: null,
  });
  return slides;
}

/**
 * Builds feature-explainer carousel slides from app media captures.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @return {Record<string, unknown>[]} Slides.
 */
function buildFeatureDraftSlides(
  bridge: Record<string, unknown>
): Record<string, unknown>[] {
  const media = plainRecord(bridge.appFeatureMedia);
  const captures = recordArray(media?.captures)
    .filter((capture) => stringValue(capture.status) !== "paused")
    .slice(0, 4);
  const slides: Record<string, unknown>[] = [
    {
      id: "cover",
      role: "cover",
      headline: "Four things you won't find in a swipe app.",
      body: "A short tour of what makes Catch different, built from " +
        "approved app screenshots.",
      image: null,
    },
  ];
  captures.forEach((capture, index) => {
    slides.push({
      id: `feature-${index + 1}`,
      role: "feature",
      headline: stringValue(capture.walkthroughStep) ??
        stringValue(capture.surface) ??
        `Feature ${index + 1}`,
      body: stringValue(capture.caption) ??
        "Approved product screenshot for a feature explainer draft.",
      image: captureImage(capture),
    });
  });
  slides.push({
    id: "cta",
    role: "cta",
    headline: "Update Catch to try it.",
    body: "Feature explainers use approved product screenshots and reviewed " +
      "copy before export.",
    image: null,
  });
  return slides;
}

/**
 * Creates a feature slide image payload from a capture.
 * @param {Record<string, unknown>} capture App screenshot capture.
 * @return {Record<string, unknown>} Slide image.
 */
function captureImage(
  capture: Record<string, unknown>
): Record<string, unknown> {
  return {
    sourceType: "app_capture",
    url: stringValue(capture.webPath) ?? "",
    captureId: stringValue(capture.id) ?? null,
    sourcePath: stringValue(capture.sourcePath) ?? null,
    websitePath: stringValue(capture.websitePath) ?? null,
    webPath: stringValue(capture.webPath) ?? null,
    fileName: `${stringValue(capture.id) ?? "app-capture"}.png`,
    altText: stringValue(capture.alt) ?? "",
    credit: "Catch deterministic app screenshot pipeline",
    fit: "contain",
  };
}

/**
 * Builds event slide body copy.
 * @param {Record<string, unknown>} item Recommendation item.
 * @param {Record<string, unknown> | undefined} event Event candidate.
 * @return {string} Slide body.
 */
function eventSlideBody(
  item: Record<string, unknown>,
  event?: Record<string, unknown>
): string {
  const details = [
    stringValue(event?.venue),
    stringValue(event?.neighborhood),
    stringValue(event?.startDate),
    stringValue(event?.time),
    stringValue(event?.price),
  ].filter(Boolean).join(" / ");
  const reason = stringValue(item.inclusionReason) ??
    stringValue(event?.whySinglesFriendly) ??
    stringValue(event?.publicDescription) ??
    "Source-backed pick for this week.";
  return details ? `${details}\n${reason}` : reason;
}

/**
 * Builds event draft caption copy.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @param {Record<string, unknown> | null} set Recommendation set.
 * @return {string} Caption.
 */
function eventDraftCaption(
  bridge: Record<string, unknown>,
  set: Record<string, unknown> | null
): string {
  const city = stringFromPath(bridge, "city.label") ?? "Mumbai";
  const items = recordArray(set?.items)
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${stringValue(item.title)}`)
    .filter(Boolean);
  return [
    `${city} plans this week, checked before public use.`,
    ...items,
    "",
    "Catch is not the host for third-party events unless explicitly stated.",
  ].join("\n");
}

/**
 * Builds feature draft caption copy.
 * @return {string} Caption.
 */
function featureDraftCaption(): string {
  return [
    "A quick product tour from approved Catch screenshots.",
    "Review copy and screenshot rights before marking export ready.",
  ].join("\n");
}

/**
 * Returns whether a draft is export ready.
 * @param {Record<string, unknown>} draft Content draft.
 * @return {boolean} True when ready.
 */
function isExportReadyDraft(draft: Record<string, unknown>): boolean {
  const latest = plainRecord(draft.latestDecision);
  return stringValue(latest?.decision) === "export_ready" ||
    stringValue(draft.status) === "export_ready";
}

/**
 * Counts content drafts in a bridge.
 * @param {Record<string, unknown>} bridge Marketing bridge.
 * @return {number} Draft count.
 */
function draftCount(bridge: Record<string, unknown>): number {
  return recordArray(bridge.contentDrafts).length;
}

/**
 * Reads an array of records.
 * @param {unknown} value Raw value.
 * @return {Record<string, unknown>[]} Record array.
 */
function recordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

/**
 * Reads a string value.
 * @param {unknown} value Raw value.
 * @return {string | null} String value.
 */
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Reads a nested string from a simple dot path.
 * @param {Record<string, unknown>} value Source record.
 * @param {string} path Dot path.
 * @return {string | null} String value.
 */
function stringFromPath(
  value: Record<string, unknown>,
  path: string
): string | null {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return stringValue(current);
}

/**
 * Returns a string value trimmed.
 * @param {unknown} value Raw value.
 * @return {string} Trimmed string.
 */
function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns null or a trimmed string.
 * @param {unknown} value Raw value.
 * @return {string | null} Normalized nullable string.
 */
function nullableTrim(value: unknown): string | null {
  const next = trim(value);
  return next || null;
}

/**
 * Returns a plain object or undefined.
 * @param {unknown} value Raw value.
 * @return {Record<string, unknown> | undefined} Plain object.
 */
function plainRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/**
 * Builds an empty disabled dashboard for live projects without synced data.
 * @param {Date} now Stable timestamp for generated empty state.
 * @return {Record<string, unknown>} Empty bridge.
 */
function emptyMarketingOpsBridge(now: Date): Record<string, unknown> {
  const generatedAt = now.toISOString();
  return {
    schemaVersion: 1,
    program: "catch-event-guide-marketing-ops",
    generatedAt,
    city: {
      id: "mumbai",
      label: "Mumbai",
      timezone: "Asia/Kolkata",
      aliases: ["bombay"],
    },
    weekStart: generatedAt.slice(0, 10),
    weekEnd: generatedAt.slice(0, 10),
    timezone: "Asia/Kolkata",
    summary: {
      status: "not_synced",
      sourceProfiles: 0,
      queryTemplates: 0,
      sourceResults: 0,
      sourceResultsNeedingReview: 0,
      eventCandidates: 0,
      approvedCandidates: 0,
      candidatesNeedingReview: 0,
      recommendationSets: 0,
      contentDrafts: 0,
      exportReadyDrafts: 0,
    },
    guardrails: [
      "Sync a generated marketing ops bridge before live review.",
      "No publishing happens from this empty dashboard.",
    ],
    sourceProfiles: [],
    queryTemplates: [],
    runPlan: {
      id: "not-synced",
      cityId: "mumbai",
      weekStart: generatedAt.slice(0, 10),
      status: "not_synced",
      generatedAt,
      schedule: {cadence: "weekly", publishDay: "Monday", lookaheadDays: 7},
      budgets: {maxQueries: 0, maxSourceResults: 0, maxCandidatePool: 0},
      automationPolicy: {
        searchProvider: "not_configured",
        networkFetchesEnabled: false,
        instagramScrapingEnabled: false,
        requiresHumanApprovalBeforePublish: true,
      },
      queryIds: [],
      sourceProfileIds: [],
    },
    sourceResults: [],
    eventCandidates: [],
    recommendationSets: [],
    contentDrafts: [],
    auditTrail: [],
    commands: {},
  };
}

export const adminGetMarketingOpsDashboard = onCall(
  appCheckCallableOptions,
  (request) => adminGetMarketingOpsDashboardHandler(request)
);

export const adminRecordMarketingReviewDecision = onCall(
  appCheckCallableOptions,
  (request) => adminRecordMarketingReviewDecisionHandler(request)
);

export const adminCreateMarketingContentDraft = onCall(
  appCheckCallableOptions,
  (request) => adminCreateMarketingContentDraftHandler(request)
);
