import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAdmin} from "./adminAuth";
import type {AdminRoleClaim} from "./adminAuth";
import {writeAdminAuditLog} from "./adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {AdminGetOverviewCallableResponse} from
  "../shared/generated/adminGetOverviewCallableResponse";
import {
  validateAdminGetOverviewCallablePayload,
} from "../shared/generated/validators/adminGetOverviewInput";
import {validateCallableWithAjv} from "../shared/validation";

const authScanPageSize = 1000;
const restrictedEventAssistanceReadRoles: ReadonlySet<AdminRoleClaim> =
  new Set([
    "admin",
    "adminOwner",
    "safetyReviewer",
    "support",
  ]);

export interface AdminOverviewMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
}

export interface AdminQueueItem {
  id: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string | null;
  targetPath: string;
}

export type AdminOverviewResponse = AdminGetOverviewCallableResponse;

interface AuthUserLike {
  metadata: {
    creationTime?: string;
  };
}

interface AuthListResultLike {
  users: AuthUserLike[];
  pageToken?: string;
}

interface AuthListSource {
  listUsers(
    maxResults?: number,
    pageToken?: string
  ): Promise<AuthListResultLike>;
}

interface OverviewDeps {
  auth: () => AuthListSource;
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OverviewDeps = {
  auth: () => admin.auth(),
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Counts Auth users created at or after a cutoff. This is a bridge until
 * server-owned profile timestamps exist for reliable cohort analytics.
 * @param {AuthListSource} auth Firebase Auth list source.
 * @param {Date} since Inclusive creation-time cutoff.
 * @return {Promise<object>} Count and scan size.
 */
export async function countAuthUsersCreatedSince(
  auth: AuthListSource,
  since: Date
): Promise<{count: number; scanned: number}> {
  let pageToken: string | undefined;
  let count = 0;
  let scanned = 0;

  do {
    const page = await auth.listUsers(authScanPageSize, pageToken);
    scanned += page.users.length;
    for (const user of page.users) {
      const createdAt = Date.parse(user.metadata.creationTime ?? "");
      if (Number.isFinite(createdAt) && createdAt >= since.getTime()) {
        count += 1;
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return {count, scanned};
}

/**
 * Returns the start of the UTC day for a reference date.
 * @param {Date} reference Reference date.
 * @return {Date} Start of UTC day.
 */
export function startOfUtcDay(reference: Date): Date {
  return new Date(Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate()
  ));
}

/**
 * Returns the UTC cutoff for the last seven days, inclusive of today.
 * @param {Date} reference Reference date.
 * @return {Date} Seven-day UTC cutoff.
 */
export function startOfSevenDayWindow(reference: Date): Date {
  const start = startOfUtcDay(reference);
  start.setUTCDate(start.getUTCDate() - 6);
  return start;
}

/**
 * Callable handler for the admin overview dashboard.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OverviewDeps} deps Injectable dependencies.
 * @return {Promise<AdminOverviewResponse>} Overview payload.
 */
export async function adminGetOverviewHandler(
  request: CallableRequest<unknown>,
  deps: OverviewDeps = defaultDeps
): Promise<AdminOverviewResponse> {
  const adminContext = requireAdmin(request);
  validateCallableWithAjv(request, validateAdminGetOverviewCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetOverview", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const today = startOfUtcDay(now);
  const week = startOfSevenDayWindow(now);

  const [
    signupsToday,
    signupsThisWeek,
    completedProfiles,
    openReports,
    pendingModerationFlags,
    openEventSafetyReports,
    restrictedEventAssistance,
    pendingAccessApplications,
    pendingOrganizerClaimRequests,
    indexReviewPages,
    activeHosts,
    activeEvents,
    completedPayments,
    failedPayments,
    signupFailedPayments,
    payoutRestrictedHosts,
    safetyReports,
    moderationFlags,
    eventSafetyReports,
    accessApplications,
    organizerClaimRequests,
    organizerIndexReviews,
    paymentIssues,
  ] = await Promise.all([
    countAuthUsersCreatedSince(deps.auth(), today),
    countAuthUsersCreatedSince(deps.auth(), week),
    countCollection(
      db.collection("users").where("profileComplete", "==", true)
    ),
    countCollection(db.collection("reports").where("status", "==", "open")),
    countCollection(
      db.collection("moderationFlags").where("status", "==", "pending")
    ),
    countCollection(
      db.collection("eventSafetyReports").where("status", "==", "open")
    ),
    loadRestrictedEventAssistanceOverview(db, adminContext.roles),
    countCollection(
      db.collection("accessApplications").where("status", "==", "pending")
    ),
    countCollection(
      db.collection("organizerClaimRequests").where("status", "==", "pending")
    ),
    countCollection(
      db.collection("organizers")
        .where("publicPage.publishStatus", "==", "qa")
        .where("publicPage.indexStatus", "==", "noindex")
    ),
    countCollection(
      db.collection("organizerTeamMemberships")
        .where("status", "==", "active")
    ),
    countCollection(
      db.collection("events").where("status", "==", "active")
    ),
    countCollection(
      db.collection("payments").where("status", "==", "completed")
    ),
    countCollection(db.collection("payments").where("status", "==", "failed")),
    countCollection(
      db.collection("payments").where("signUpFailed", "==", true)
    ),
    countPayoutRestrictedHosts(db),
    listQueueItems(db, "reports", "status", "open", "safetyReport"),
    listQueueItems(
      db,
      "moderationFlags",
      "status",
      "pending",
      "moderationFlag"
    ),
    listQueueItems(
      db,
      "eventSafetyReports",
      "status",
      "open",
      "eventSafetyReport"
    ),
    listQueueItems(
      db,
      "accessApplications",
      "status",
      "pending",
      "accessApplication"
    ),
    listQueueItems(
      db,
      "organizerClaimRequests",
      "status",
      "pending",
      "organizerClaimRequest"
    ),
    listOrganizerIndexReviewItems(db),
    listPaymentIssueItems(db),
  ]);

  await writeAdminAuditLog(db, adminContext, {
    action: "adminGetOverview",
    targetPath: "admin/overview",
    request,
    serverTimestamp: deps.serverTimestamp,
  });

  return {
    generatedAt: now.toISOString(),
    timezone: "UTC",
    metrics: [
      metric("signupsToday", "Signups today", signupsToday.count),
      metric("signupsThisWeek", "Signups this week", signupsThisWeek.count),
      metric("completedProfiles", "Completed profiles", completedProfiles),
      metric("openReports", "Open reports", openReports),
      metric(
        "pendingModerationFlags",
        "Pending moderation",
        pendingModerationFlags
      ),
      metric(
        "eventSafetyReports",
        "Event safety cases",
        openEventSafetyReports + restrictedEventAssistance.count
      ),
      metric(
        "pendingApplications",
        "Pending applications",
        pendingAccessApplications
      ),
      metric(
        "pendingOrganizerClaims",
        "Pending organizer claims",
        pendingOrganizerClaimRequests
      ),
      metric("indexReviewPages", "Index review pages", indexReviewPages),
      metric("activeHosts", "Active organizer team seats", activeHosts),
      metric("activeEvents", "Active events", activeEvents),
      metric("completedPayments", "Completed payments", completedPayments),
      metric("failedPayments", "Failed payments", failedPayments),
      metric(
        "signupFailedPayments",
        "Signup-failed payments",
        signupFailedPayments
      ),
      metric("payoutRestrictedHosts", "Payout issues", payoutRestrictedHosts),
    ],
    queues: {
      safetyReports,
      moderationFlags,
      eventSafetyReports: [
        ...restrictedEventAssistance.items,
        ...eventSafetyReports,
      ].slice(0, 5),
      accessApplications,
      organizerClaimRequests,
      organizerIndexReviews,
      paymentIssues,
    },
    dataQuality: [
      {
        id: "signup-source",
        label: "Signup metric source",
        state: "warning",
        detail:
          "Using Firebase Auth creation metadata until users/profile " +
          "timestamps are added.",
        owner: "Growth analytics",
        runbook: "docs/data_contracts.md",
        nextAction:
          "Replace proxy metrics when server-owned profile timestamps land.",
      },
      {
        id: "auth-scan",
        label: "Auth users scanned",
        state: "ok",
        detail: `${signupsThisWeek.scanned} Auth users scanned.`,
        owner: "Admin platform",
        runbook: "functions/src/admin/overview.ts",
        nextAction:
          "No action; this is a bounded Auth bridge until profile " +
          "timestamps exist.",
      },
      {
        id: "finance-ledger",
        label: "Host settlement ledger",
        state: "blocked",
        detail:
          "Commission and host settlement records are not modeled yet.",
        owner: "Finance ops",
        runbook: "docs/data_contracts.md",
        nextAction:
          "Define the ledger/read-model contract before enabling " +
          "finance actions.",
      },
    ],
  };
}

/**
 * Loads restricted event requests only for roles authorized to read safety
 * details. Other overview roles do not query the restricted collection.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {readonly AdminRoleClaim[]} roles Caller role claims.
 * @return {Promise<object>} Authorized restricted count and queue rows.
 */
export async function loadRestrictedEventAssistanceOverview(
  db: FirebaseFirestore.Firestore,
  roles: readonly AdminRoleClaim[]
): Promise<{count: number; items: AdminQueueItem[]}> {
  if (!roles.some((role) => restrictedEventAssistanceReadRoles.has(role))) {
    return {count: 0, items: []};
  }

  const [count, items] = await Promise.all([
    countCollection(
      db.collection("eventAssistanceCases")
        .where("context.mode", "==", "live")
        .where("owner", "==", "authorizedSafetyOperator")
        .where("status", "==", "open")
    ),
    listRestrictedEventAssistanceCases(db),
  ]);
  return {count, items};
}

export const adminGetOverview = onCall(appCheckCallableOptions, (request) =>
  adminGetOverviewHandler(request)
);

/**
 * Runs a Firestore count aggregation.
 * @param {FirebaseFirestore.Query} query Firestore query.
 * @return {Promise<number>} Matching document count.
 */
async function countCollection(
  query: FirebaseFirestore.Query
): Promise<number> {
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

/**
 * Counts hosts whose payment account is not complete.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @return {Promise<number>} Restricted or incomplete host account count.
 */
async function countPayoutRestrictedHosts(
  db: FirebaseFirestore.Firestore
): Promise<number> {
  const statuses = ["notStarted", "pending", "restricted"];
  const counts = await Promise.all(
    statuses.map((status) =>
      countCollection(
        db.collection("hostPaymentAccounts")
          .where("onboardingStatus", "==", status)
      )
    )
  );
  return counts.reduce((sum, value) => sum + value, 0);
}

/**
 * Lists a small queue preview for one admin collection.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} collection Collection id.
 * @param {string} statusField Status field name.
 * @param {string} status Required status.
 * @param {string} kind Queue item kind.
 * @return {Promise<AdminQueueItem[]>} Queue preview rows.
 */
async function listQueueItems(
  db: FirebaseFirestore.Firestore,
  collection: string,
  statusField: string,
  status: string,
  kind: string
): Promise<AdminQueueItem[]> {
  const snapshot = await db.collection(collection)
    .where(statusField, "==", status)
    .limit(5)
    .get();
  return snapshot.docs.map((doc) =>
    normalizeQueueItem(kind, `${collection}/${doc.id}`, doc.data())
  );
}

/** Lists live restricted guest requests for the authorized safety queue. */
async function listRestrictedEventAssistanceCases(
  db: FirebaseFirestore.Firestore
): Promise<AdminQueueItem[]> {
  const snapshot = await db.collection("eventAssistanceCases")
    .where("context.mode", "==", "live")
    .where("owner", "==", "authorizedSafetyOperator")
    .where("status", "==", "open")
    .orderBy("receivedAt", "desc")
    .limit(5)
    .get();
  return snapshot.docs.map((doc) => normalizeQueueItem(
    "eventAssistanceCase",
    `eventAssistanceCases/${doc.id}`,
    doc.data()
  ));
}

/**
 * Lists organizer pages waiting for a human SEO indexing review.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @return {Promise<AdminQueueItem[]>} Index review rows.
 */
async function listOrganizerIndexReviewItems(
  db: FirebaseFirestore.Firestore
): Promise<AdminQueueItem[]> {
  const snapshot = await db.collection("organizers")
    .where("publicPage.publishStatus", "==", "qa")
    .where("publicPage.indexStatus", "==", "noindex")
    .limit(5)
    .get();
  return snapshot.docs.map((doc) =>
    normalizeQueueItem("organizerIndexReview", `organizers/${doc.id}`,
      doc.data())
  );
}

/**
 * Lists failed or risky payment rows for the overview queue.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @return {Promise<AdminQueueItem[]>} Payment issue rows.
 */
async function listPaymentIssueItems(
  db: FirebaseFirestore.Firestore
): Promise<AdminQueueItem[]> {
  const [failed, signupFailed] = await Promise.all([
    db.collection("payments").where("status", "==", "failed").limit(3).get(),
    db.collection("payments").where("signUpFailed", "==", true).limit(3).get(),
  ]);
  const seen = new Set<string>();
  return [...failed.docs, ...signupFailed.docs]
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    })
    .slice(0, 5)
    .map((doc) =>
      normalizeQueueItem("paymentIssue", `payments/${doc.id}`, doc.data())
    );
}

/**
 * Normalizes an arbitrary admin queue source document.
 * @param {string} kind Queue kind.
 * @param {string} targetPath Firestore target path.
 * @param {FirebaseFirestore.DocumentData} data Source document data.
 * @return {AdminQueueItem} Admin queue item.
 */
export function normalizeQueueItem(
  kind: string,
  targetPath: string,
  data: FirebaseFirestore.DocumentData
): AdminQueueItem {
  const status = stringValue(data.status) ?? "unknown";
  const createdAt = isoFromTimestamp(data.createdAt);
  if (kind === "safetyReport") {
    return {
      id: targetPath,
      title: stringValue(data.reasonCode) ?? "Safety report",
      detail: [
        `target ${stringValue(data.targetUserId) ?? "unknown"}`,
        stringValue(data.source),
      ].filter(Boolean).join(" - "),
      status,
      createdAt,
      targetPath,
    };
  }
  if (kind === "moderationFlag") {
    return {
      id: targetPath,
      title: stringValue(data.flagType) ?? "Moderation flag",
      detail: [
        `target ${stringValue(data.targetUserId) ?? "unknown"}`,
        stringValue(data.source),
      ].filter(Boolean).join(" - "),
      status,
      createdAt,
      targetPath,
    };
  }
  if (kind === "eventSafetyReport") {
    return {
      id: targetPath,
      title: `Event ${stringValue(data.eventId) ?? "unknown"}`,
      detail: [
        `organizer ${stringValue(data.organizerId) ??
          stringValue(data.organizerId) ?? "unknown"}`,
        `reporter ${stringValue(data.reporterUserId) ?? "unknown"}`,
      ].join(" - "),
      status,
      createdAt,
      targetPath,
    };
  }
  if (kind === "eventAssistanceCase") {
    const context = objectValue(data.context);
    return {
      id: targetPath,
      title: "Live event safety request",
      detail: [
        `event ${stringValue(context?.eventId) ?? "unknown"}`,
        `attendee ${stringValue(data.attendeeId) ?? "unknown"}`,
      ].join(" - "),
      status,
      createdAt: isoFromTimestamp(data.receivedAt),
      targetPath,
    };
  }
  if (kind === "accessApplication") {
    return {
      id: targetPath,
      title: stringValue(data.displayName) ??
        stringValue(data.fullName) ??
        stringValue(data.uid) ??
        "Access application",
      detail: [
        stringValue(data.city),
        stringValue(data.role),
        data.wantsToHost === true ? "wants to host" : null,
      ].filter(Boolean).join(" - "),
      status,
      createdAt: isoFromTimestamp(data.submittedAt) ?? createdAt,
      targetPath,
    };
  }
  if (kind === "organizerClaimRequest") {
    return {
      id: targetPath,
      title: stringValue(data.requesterName) ??
        stringValue(data.requesterUid) ??
        "Organizer claim",
      detail: [
        `club ${stringValue(data.organizerId) ?? "unknown"}`,
        stringValue(data.requesterRole),
        stringValue(data.businessEmail) ??
          stringValue(data.businessPhone) ??
          "no contact",
        `${arrayLength(data.proofUrls)} proof links`,
      ].filter(Boolean).join(" - "),
      status,
      createdAt,
      targetPath,
    };
  }
  if (kind === "organizerIndexReview") {
    const publicPage = objectValue(data.publicPage);
    const provenance = objectValue(data.provenance);
    return {
      id: targetPath,
      title: stringValue(data.name) ?? "Organizer page",
      detail: [
        stringValue(publicPage?.canonicalPath),
        stringValue(provenance?.sourceConfidence),
        stringValue(provenance?.verificationStatus),
      ].filter(Boolean).join(" - "),
      status: stringValue(publicPage?.indexStatus) ?? "noindex",
      createdAt: isoFromTimestamp(provenance?.lastVerifiedAt) ?? createdAt,
      targetPath,
    };
  }
  if (kind === "paymentIssue") {
    return {
      id: targetPath,
      title: [
        stringValue(data.currency) ?? "",
        numberValue(data.amount) ?? 0,
      ].join(" "),
      detail: [
        `event ${stringValue(data.eventId) ?? "unknown"}`,
        `user ${stringValue(data.userId) ?? "unknown"}`,
      ].join(" - "),
      status,
      createdAt,
      targetPath,
    };
  }
  return {
    id: targetPath,
    title: kind,
    detail: targetPath,
    status,
    createdAt,
    targetPath,
  };
}

/**
 * Creates a dashboard metric object.
 * @param {string} id Metric id.
 * @param {string} label Human label.
 * @param {number} value Numeric value.
 * @param {string=} unit Optional unit.
 * @return {AdminOverviewMetric} Metric DTO.
 */
function metric(
  id: string,
  label: string,
  value: number,
  unit?: string
): AdminOverviewMetric {
  return {id, label, value, ...(unit ? {unit} : {})};
}

/**
 * Converts Firestore-like timestamps to ISO strings.
 * @param {unknown} value Timestamp-like value.
 * @return {string | null} ISO string.
 */
function isoFromTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (Number.isSafeInteger(value) && (value as number) >= 0) {
    return new Date(value as number).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as {toDate?: unknown}).toDate === "function"
  ) {
    return (value as {toDate: () => Date}).toDate().toISOString();
  }
  return null;
}

/**
 * Returns a string only when the value is non-empty.
 * @param {unknown} value Candidate value.
 * @return {string | null} String value.
 */
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Returns a plain object candidate, excluding arrays and null.
 * @param {unknown} value Candidate value.
 * @return {Record<string, unknown> | null} Object value.
 */
function objectValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Returns a finite number value.
 * @param {unknown} value Candidate value.
 * @return {number | null} Number value.
 */
function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Returns the length of an array value.
 * @param {unknown} value Candidate array.
 * @return {number} Array length or zero.
 */
function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
