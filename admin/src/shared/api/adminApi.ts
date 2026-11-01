import {httpsCallable as firebaseHttpsCallable} from "firebase/functions";
import type {AdminListSupportConversationsCallablePayload} from
  "../../generated/contracts/adminListSupportConversationsCallablePayload";
import type {AdminListSupportConversationsCallableResponse} from
  "../../generated/contracts/adminListSupportConversationsCallableResponse";
import type {AdminGetSupportConversationCallablePayload} from
  "../../generated/contracts/adminGetSupportConversationCallablePayload";
import type {AdminGetSupportConversationCallableResponse} from
  "../../generated/contracts/adminGetSupportConversationCallableResponse";
import type {AdminUpdateSupportConversationCallablePayload} from
  "../../generated/contracts/adminUpdateSupportConversationCallablePayload";
import type {AdminUpdateSupportConversationCallableResponse} from
  "../../generated/contracts/adminUpdateSupportConversationCallableResponse";
import type {AdminRecordSupportMessageCallablePayload} from
  "../../generated/contracts/adminRecordSupportMessageCallablePayload";
import type {AdminRecordSupportMessageCallableResponse} from
  "../../generated/contracts/adminRecordSupportMessageCallableResponse";
import type {AdminListSupportSavedRepliesCallablePayload} from
  "../../generated/contracts/adminListSupportSavedRepliesCallablePayload";
import type {AdminListSupportSavedRepliesCallableResponse} from
  "../../generated/contracts/adminListSupportSavedRepliesCallableResponse";
import type {AdminUpsertSupportSavedReplyCallablePayload} from
  "../../generated/contracts/adminUpsertSupportSavedReplyCallablePayload";
import type {AdminUpsertSupportSavedReplyCallableResponse} from
  "../../generated/contracts/adminUpsertSupportSavedReplyCallableResponse";
import {functions} from "./firebaseFunctions";
import {dataMode} from "./dataMode";
import type {AdminListCrossPathsShowcaseCandidatesCallablePayload} from
  "../../generated/contracts/adminListCrossPathsShowcaseCandidatesCallablePayload";
import type {AdminListCrossPathsShowcaseCandidatesCallableResponse} from
  "../../generated/contracts/adminListCrossPathsShowcaseCandidatesCallableResponse";
import type {AdminSetCrossPathsShowcaseEligibilityCallablePayload} from
  "../../generated/contracts/adminSetCrossPathsShowcaseEligibilityCallablePayload";
import type {AdminSetCrossPathsShowcaseEligibilityCallableResponse} from
  "../../generated/contracts/adminSetCrossPathsShowcaseEligibilityCallableResponse";
import type {AdminReviewEventMessagingBudgetCallablePayload} from
  "../../generated/contracts/adminReviewEventMessagingBudgetCallablePayload";
import type {AdminReviewEventMessagingBudgetCallableResponse} from
  "../../generated/contracts/adminReviewEventMessagingBudgetCallableResponse";
import type {AdminDecideEventMessagingBudgetCallablePayload} from
  "../../generated/contracts/adminDecideEventMessagingBudgetCallablePayload";
import type {AdminDecideEventMessagingBudgetCallableResponse} from
  "../../generated/contracts/adminDecideEventMessagingBudgetCallableResponse";
import type {AdminApplyEventMessagingBudgetCallablePayload} from
  "../../generated/contracts/adminApplyEventMessagingBudgetCallablePayload";
import type {AdminApplyEventMessagingBudgetCallableResponse} from
  "../../generated/contracts/adminApplyEventMessagingBudgetCallableResponse";
import type {AdminGrantOrganizerEntitlementCallablePayload} from
  "../../generated/contracts/adminGrantOrganizerEntitlementCallablePayload";
import type {AdminRevokeOrganizerEntitlementGrantCallablePayload} from
  "../../generated/contracts/adminRevokeOrganizerEntitlementGrantCallablePayload";
import type {AdminGetOrganizerOverviewCallablePayload} from
  "../../generated/contracts/adminGetOrganizerOverviewCallablePayload";
import type {AdminGetOrganizerOverviewCallableResponse} from
  "../../generated/contracts/adminGetOrganizerOverviewCallableResponse";
import type {AdminListEventDirectoryCallablePayload} from
  "../../generated/contracts/adminListEventDirectoryCallablePayload";
import type {AdminListEventDirectoryCallableResponse} from
  "../../generated/contracts/adminListEventDirectoryCallableResponse";
import type {AdminListOrganizerDirectoryCallablePayload} from
  "../../generated/contracts/adminListOrganizerDirectoryCallablePayload";
import type {AdminListOrganizerDirectoryCallableResponse} from
  "../../generated/contracts/adminListOrganizerDirectoryCallableResponse";
import type {AdminListCommercialTermsCallablePayload} from
  "../../generated/contracts/adminListCommercialTermsCallablePayload";
import type {AdminListCommercialTermsCallableResponse} from
  "../../generated/contracts/adminListCommercialTermsCallableResponse";
import type {ManageCommercialTermsCallablePayload} from
  "../../generated/contracts/manageCommercialTermsCallablePayload";
import type {ManageCommercialTermsCallableResponse} from
  "../../generated/contracts/manageCommercialTermsCallableResponse";
import type {ManagePaymentRoutingPolicyCallablePayload} from
  "../../generated/contracts/managePaymentRoutingPolicyCallablePayload";
import type {ManagePaymentRoutingPolicyCallableResponse} from
  "../../generated/contracts/managePaymentRoutingPolicyCallableResponse";
import {
  sampleListCommercialTerms,
  sampleManageCommercialTerms,
  sampleManagePaymentRoutingPolicy,
} from "./sampleCommercialTerms";
import {
  sampleGetOrganizerOverview,
  sampleListEventDirectory,
  sampleListOrganizerDirectory,
} from "./sampleRecords";
import type {GetOrganizerEntitlementCallablePayload} from
  "../../generated/contracts/getOrganizerEntitlementCallablePayload";
import type {OrganizerEntitlementCallableResponse} from
  "../../generated/contracts/organizerEntitlementCallableResponse";
import type {OrganizerEntitlementMutationCallableResponse} from
  "../../generated/contracts/organizerEntitlementMutationCallableResponse";
import {
  sampleOrganizerDetails,
  sampleEventDetails,
  sampleExternalEventRows,
  sampleHostAnalytics,
  sampleOverview,
  sampleUserAnalyticsReport,
} from "./sampleData";
import {
  sampleEventIntakeBridge,
  sampleMarketingOpsBridge,
} from "./sampleOperationalData";
import {sampleIntakeOperations} from
  "../operations/sampleIntakeOperations";
import type {
  AdminListIntakeOperationsPayload,
  AdminListIntakeOperationsResponse,
} from "../operations/operationsTypes";
import {
  AdminAssignSafetyTriageItemPayload,
  AdminAssignSafetyTriageItemResponse,
  AdminListActionExecutionsPayload,
  AdminListActionExecutionsResponse,
  AdminCreateMarketingContentDraftPayload,
  AdminCreateMarketingContentDraftResponse,
  AdminGetAdminUserRolesPayload,
  AdminGetAdminUserRolesResponse,
  AdminListAdminRoleAssignmentsPayload,
  AdminListAdminRoleAssignmentsResponse,
  AdminEventListRow,
  AdminDecideSafetyTriageItemPayload,
  AdminDecideSafetyTriageItemResponse,
  AdminGetEventDetailsPayload,
  AdminGetEventDetailsResponse,
  AdminGetMarketingOpsDashboardResponse,
  AdminGetSafetyTriageDetailsPayload,
  AdminGetSafetyTriageDetailsResponse,
  AdminSafetyTriageDetails,
  AdminSafetyTriageEvidence,
  AdminSafetyTriageSeverity,
  AdminSafetyTriageSla,
  AdminDecideAccessApplicationPayload,
  AdminDecideAccessApplicationResponse,
  AdminGetAccessApplicationDetailsPayload,
  AdminGetAccessApplicationDetailsResponse,
  AdminDecideOrganizerClaimPayload,
  AdminDecideOrganizerClaimResponse,
  AdminGetOrganizerClaimRequestDetailsPayload,
  AdminGetOrganizerClaimRequestDetailsResponse,
  AdminListOrganizerClaimRequestsResponse,
  AdminDecideOrganizerIntakePayload,
  AdminDecideOrganizerIntakeResponse,
  AdminDecideOrganizerPolicyGapPayload,
  AdminDecideOrganizerPolicyGapResponse,
  AdminRecordOrganizerCurationPayload,
  AdminRecordOrganizerCurationResponse,
  AdminCreateOrganizerDraftFromCandidatePayload,
  AdminCreateOrganizerDraftFromCandidateResponse,
  AdminRecordEventIntakeReviewDecisionPayload,
  AdminRecordEventIntakeReviewDecisionResponse,
  AdminTakedownExternalEventPayload,
  AdminTakedownExternalEventResponse,
  AdminRecordMarketingReviewDecisionPayload,
  AdminRecordMarketingReviewDecisionResponse,
  AdminGetEventIntakeDashboardResponse,
  AdminRoleClaim,
  AdminRoleAssignmentRow,
  AdminSetAdminUserRolesPayload,
  AdminSetAdminUserRolesResponse,
  AdminUserRoleRecord,
  AdminOrganizerListRow,
  AdminGetOrganizerDetailsPayload,
  AdminGetOrganizerDetailsResponse,
  AdminListEventDetailsPayload,
  AdminListEventDetailsResponse,
  AdminListExternalEventDetailsPayload,
  AdminListExternalEventDetailsResponse,
  AdminListOrganizerDetailsPayload,
  AdminListOrganizerDetailsResponse,
  AdminOverviewResponse,
  AdminSetOrganizerIndexStatusPayload,
  AdminSetOrganizerIndexStatusResponse,
  AdminUpdateEventDetailsPayload,
  AdminUpdateEventDetailsResponse,
  AdminUpdateOrganizerDetailsPayload,
  AdminUpdateOrganizerDetailsResponse,
  HostAnalyticsQueryPayload,
  HostAnalyticsResponse,
  MarketingOpsBridge,
  EventIntakeBridge,
  MarketingContentDraft,
  UserAnalyticsQueryPayload,
  UserAnalyticsResponse,
} from "../types/adminTypes";

const sampleGeneratedAt = "2026-06-25T08:30:00.000Z";
const sampleActionExecutions: AdminListActionExecutionsResponse = {
  schemaVersion: 1,
  generatedAt: sampleGeneratedAt,
  rows: [
    {
      schemaVersion: 1,
      executionId: "44ee2154-f136-4ff0-b903-7284732bb197",
      actionId: "events.list",
      callable: "adminListEventDetails",
      actorUid: "agent-release-audit",
      actorRoles: ["admin"],
      status: "succeeded",
      requestHash: "a".repeat(64),
      responseHash: "b".repeat(64),
      target: null,
      errorCode: null,
      errorMessage: null,
      cliVersion: "1.0.0",
      startedAt: "2026-06-25T08:29:42.000Z",
      finishedAt: "2026-06-25T08:29:43.000Z",
      updatedAt: "2026-06-25T08:29:43.000Z",
    },
    {
      schemaVersion: 1,
      executionId: "4e480261-b750-4519-89f5-e8c75976aad8",
      actionId: "organizers.update",
      callable: "adminUpdateOrganizerDetails",
      actorUid: "agent-organizer-review",
      actorRoles: ["support"],
      status: "started",
      requestHash: "c".repeat(64),
      responseHash: null,
      target: "afterfly",
      errorCode: null,
      errorMessage: null,
      cliVersion: "1.0.0",
      startedAt: "2026-06-25T08:27:10.000Z",
      finishedAt: null,
      updatedAt: "2026-06-25T08:27:10.000Z",
    },
    {
      schemaVersion: 1,
      executionId: "d84258b1-a59e-4a03-9001-ab1cfd94f189",
      actionId: "access.decide",
      callable: "adminDecideAccessApplication",
      actorUid: "agent-access-review",
      actorRoles: ["support"],
      status: "failed",
      requestHash: "d".repeat(64),
      responseHash: null,
      target: "sample-applicant",
      errorCode: "failed-precondition",
      errorMessage: "Application state changed after the review was prepared.",
      cliVersion: "1.0.0",
      startedAt: "2026-06-25T08:20:00.000Z",
      finishedAt: "2026-06-25T08:20:01.000Z",
      updatedAt: "2026-06-25T08:20:01.000Z",
    },
  ],
  nextCursor: null,
};

function shouldValidateAdminCallableResponses() {
  return import.meta.env.DEV ||
    import.meta.env.VITE_ADMIN_VALIDATE_RESPONSES === "true";
}

function httpsCallable<RequestData, ResponseData>(
  functionsInstance: typeof functions,
  name: string
) {
  const callable = firebaseHttpsCallable<RequestData, ResponseData>(
    functionsInstance,
    name
  );
  return async (payload: RequestData) => {
    const {validateAdminCallableRequest, validateAdminCallableResponse} =
      await import("../../generated/validators/adminCallableValidators");
    validateAdminCallableRequest(name, payload);
    const result = await callable(payload);
    if (shouldValidateAdminCallableResponses()) {
      validateAdminCallableResponse(name, result.data);
    }
    return result;
  };
}

const sampleAdminUsers = new Map<string, AdminUserRoleRecord>([
  ["admin-owner", {
    targetUid: "admin-owner",
    email: "owner@catch.local",
    displayName: "Catch Admin Owner",
    disabled: false,
    roles: ["adminOwner"],
    assignmentPath: "adminRoleAssignments/admin-owner",
  }],
  ["support-ops", {
    targetUid: "support-ops",
    email: "support@catch.local",
    displayName: "Support Ops",
    disabled: false,
    roles: ["support"],
    assignmentPath: "adminRoleAssignments/support-ops",
  }],
]);

const sampleMessagingBudgetDecisions = new Map<
  string,
  NonNullable<AdminReviewEventMessagingBudgetCallableResponse["decision"]>
>();
const sampleMessagingBudgetDecisionRoutes = new Map<
  string,
  AdminReviewEventMessagingBudgetCallablePayload["routeId"]
>();

type SampleOrganizerEntitlementGrant =
  OrganizerEntitlementCallableResponse["grants"][number];

const sampleOrganizerEntitlementSkuCatalog:
  OrganizerEntitlementCallableResponse["skuCatalog"] = {
    wedding_essentials: {
      label: "Wedding Essentials",
      unit: "program",
      priceMinor: 2499900,
      currency: "INR",
      limits: {
        guests: 150,
        functions: 5,
        staffAssignments: 10,
        momentsPerFunction: 3,
      },
      capabilitiesAllowed: ["forms", "messaging"],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: 2,
    },
    wedding_pro: {
      label: "Wedding Pro",
      unit: "program",
      priceMinor: 5999900,
      currency: "INR",
      limits: {
        guests: 400,
        functions: 10,
        staffAssignments: 30,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: [
        "arrivalsTransport",
        "accommodation",
        "forms",
        "messaging",
      ],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: 6,
    },
    wedding_signature: {
      label: "Wedding Signature",
      unit: "program",
      priceMinor: 14999900,
      currency: "INR",
      limits: {
        guests: 1000,
        functions: null,
        staffAssignments: 100,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: [
        "arrivalsTransport",
        "accommodation",
        "forms",
        "messaging",
      ],
      includedFlightDays: 300,
      includedWaConversations: 3000,
      stakeholderSeats: null,
    },
    wedding_transport_addon: {
      label: "Arrivals desk + dispatch add-on",
      unit: "program",
      priceMinor: 1499900,
      currency: "INR",
      limits: {
        guests: null,
        functions: null,
        staffAssignments: null,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: ["arrivalsTransport"],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: null,
    },
    planner_annual: {
      label: "Planner annual (quote)",
      unit: "organizerYear",
      priceMinor: null,
      currency: "INR",
      limits: {
        guests: null,
        functions: null,
        staffAssignments: null,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: [
        "arrivalsTransport",
        "accommodation",
        "forms",
        "messaging",
      ],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: null,
    },
  };

const sampleOrganizerEntitlements = new Map<string, {
  revision: number;
  grants: SampleOrganizerEntitlementGrant[];
}>();

function sampleAdminRoleAssignments(
  payload: AdminListAdminRoleAssignmentsPayload = {}
): AdminListAdminRoleAssignmentsResponse {
  const status = payload.status ?? "all";
  const limit = Math.max(1, Math.min(payload.limit ?? 50, 100));
  const rows: AdminRoleAssignmentRow[] = Array.from(sampleAdminUsers.values())
    .map((user) => {
      const assignmentStatus: AdminRoleAssignmentRow["status"] =
        user.roles.length > 0 ? "active" : "revoked";
      return {
        ...user,
        roles: [...user.roles],
        status: assignmentStatus,
        updatedAt: sampleGeneratedAt,
        updatedByUid: "admin-owner",
      };
    })
    .filter((row) => status === "all" || row.status === status)
    .sort((a, b) => a.targetUid.localeCompare(b.targetUid))
    .slice(0, limit);
  return {
    generatedAt: sampleGeneratedAt,
    rows,
    source: "adminRoleAssignments",
  };
}

function sampleAdminUser(targetUid: string): AdminUserRoleRecord {
  const normalizedUid = targetUid.trim();
  const existing = sampleAdminUsers.get(normalizedUid);
  if (existing) {
    return {
      ...existing,
      roles: [...existing.roles],
    };
  }
  const fallback: AdminUserRoleRecord = {
    targetUid: normalizedUid,
    email: `${normalizedUid}@example.local`,
    displayName: normalizedUid,
    disabled: false,
    roles: [] as AdminRoleClaim[],
    assignmentPath: `adminRoleAssignments/${normalizedUid}`,
  };
  sampleAdminUsers.set(normalizedUid, fallback);
  return {
    ...fallback,
    roles: [...fallback.roles],
  };
}

export async function loadOverview(): Promise<AdminOverviewResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleOverview;
  }

  const callable = httpsCallable<unknown, AdminOverviewResponse>(
    functions,
    "adminGetOverview"
  );
  const result = await callable({});
  return result.data;
}

export async function getAdminUserRoles(
  payload: AdminGetAdminUserRolesPayload
): Promise<AdminGetAdminUserRolesResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    return {user: sampleAdminUser(payload.targetUid)};
  }

  const callable = httpsCallable<
    AdminGetAdminUserRolesPayload,
    AdminGetAdminUserRolesResponse
  >(functions, "adminGetAdminUserRoles");
  const result = await callable(payload);
  return result.data;
}

export async function listAdminRoleAssignments(
  payload: AdminListAdminRoleAssignmentsPayload = {}
): Promise<AdminListAdminRoleAssignmentsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    return sampleAdminRoleAssignments(payload);
  }

  const callable = httpsCallable<
    AdminListAdminRoleAssignmentsPayload,
    AdminListAdminRoleAssignmentsResponse
  >(functions, "adminListAdminRoleAssignments");
  const result = await callable(payload);
  return result.data;
}

export async function setAdminUserRoles(
  payload: AdminSetAdminUserRolesPayload
): Promise<AdminSetAdminUserRolesResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const before = sampleAdminUser(payload.targetUid);
    if (!payload.note.trim()) {
      throw new Error("A review note is required for admin role changes.");
    }
    const after = {
      ...before,
      roles: [...payload.roles],
    };
    sampleAdminUsers.set(payload.targetUid, after);
    return {
      user: after,
      beforeRoles: before.roles,
      afterRoles: after.roles,
    };
  }

  const callable = httpsCallable<
    AdminSetAdminUserRolesPayload,
    AdminSetAdminUserRolesResponse
  >(functions, "adminSetAdminUserRoles");
  const result = await callable(payload);
  return result.data;
}

export async function loadSafetyTriageDetails(
  payload: AdminGetSafetyTriageDetailsPayload
): Promise<AdminGetSafetyTriageDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 160));
    return sampleSafetyTriageDetails(payload.targetPath);
  }

  const callable = httpsCallable<
    AdminGetSafetyTriageDetailsPayload,
    AdminGetSafetyTriageDetailsResponse
  >(functions, "adminGetSafetyTriageDetails");
  const result = await callable(payload);
  return result.data;
}

export async function decideSafetyTriageItem(
  payload: AdminDecideSafetyTriageItemPayload
): Promise<AdminDecideSafetyTriageItemResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const rows = [
      ...sampleOverview.queues.safetyReports,
      ...sampleOverview.queues.moderationFlags,
      ...sampleOverview.queues.eventSafetyReports,
    ];
    const row = rows.find((item) => item.targetPath === payload.targetPath);
    if (!row) {
      throw new Error(`Safety item ${payload.targetPath} was not found in local preview data.`);
    }
    const status = payload.decision === "review" ? "reviewed" : "dismissed";
    row.status = status;
    return {
      targetPath: payload.targetPath,
      decision: payload.decision,
      status,
    };
  }

  const callable = httpsCallable<
    AdminDecideSafetyTriageItemPayload,
    AdminDecideSafetyTriageItemResponse
  >(functions, "adminDecideSafetyTriageItem");
  const result = await callable(payload);
  return result.data;
}

export async function assignSafetyTriageItem(
  payload: AdminAssignSafetyTriageItemPayload
): Promise<AdminAssignSafetyTriageItemResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    if (!payload.note.trim()) {
      throw new Error("Add an assignment note before saving.");
    }
    const details = sampleSafetyTriageDetails(payload.targetPath).item;
    return {
      targetPath: payload.targetPath,
      assignment: {
        ...details.assignment,
        assigneeUid: payload.assigneeUid,
      },
    };
  }

  const callable = httpsCallable<
    AdminAssignSafetyTriageItemPayload,
    AdminAssignSafetyTriageItemResponse
  >(functions, "adminAssignSafetyTriageItem");
  const result = await callable(payload);
  return result.data;
}

function sampleSafetyTriageDetails(
  targetPath: string
): AdminGetSafetyTriageDetailsResponse {
  const rows = [
    ...sampleOverview.queues.safetyReports,
    ...sampleOverview.queues.moderationFlags,
    ...sampleOverview.queues.eventSafetyReports,
  ];
  const row = rows.find((item) => item.targetPath === targetPath);
  if (!row) {
    throw new Error(`Safety item ${targetPath} was not found in local preview data.`);
  }
  const [collection] = targetPath.split("/");
  const kind = collection === "reports" ? "report" :
    collection === "moderationFlags" ? "moderationFlag" :
      "eventSafetyReport";
  const detailParts = row.detail.split(" - ");
  const primaryUserId = extractDetailValue(detailParts, "target") ??
    extractDetailValue(detailParts, "reporter");
  const source = detailParts.find((part) =>
    !part.startsWith("target ") &&
    !part.startsWith("club ") &&
    !part.startsWith("reporter ")
  ) ?? null;
  const severity = sampleSafetySeverity(kind, row.title, row.detail);
  const item: AdminSafetyTriageDetails = {
    targetPath,
    kind,
    title: row.title,
    summary: row.detail,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: null,
    primaryUserId,
    secondaryUserId: kind === "report" ?
      extractDetailValue(detailParts, "reporter") :
      null,
    eventId: kind === "eventSafetyReport" ?
      row.title.replace(/^Event\s+/u, "") :
      null,
    organizerId: extractDetailValue(detailParts, "club"),
    source: kind === "eventSafetyReport" ? "event_success_feedback" : source,
    contextId: kind === "moderationFlag" ?
      "local-preview/moderation/context" :
      kind === "eventSafetyReport" ? "local-preview/feedback" : "local-preview/context",
    assignment: {
      ownerTeam: sampleSafetyOwnerTeam(kind, source),
      assigneeUid: null,
      queue: collection,
      severity,
    },
    sla: sampleSafetySla(row.createdAt, severity),
    evidence: sampleSafetyEvidence({
      organizerId: extractDetailValue(detailParts, "club"),
      contextId: kind === "moderationFlag" ?
        "local-preview/moderation/context" :
        kind === "eventSafetyReport" ? "local-preview/feedback" : "local-preview/context",
      detail: row.detail,
      eventId: kind === "eventSafetyReport" ?
        row.title.replace(/^Event\s+/u, "") :
        null,
      primaryUserId,
      secondaryUserId: kind === "report" ?
        extractDetailValue(detailParts, "reporter") :
        null,
      source: kind === "eventSafetyReport" ? "event_success_feedback" : source,
      title: row.title,
    }),
    fields: [
      {label: "Queue item", value: row.title},
      {label: "Detail", value: row.detail},
      {label: "Status", value: row.status},
      {label: "Target path", value: row.targetPath},
    ],
    priorHistory: sampleSafetyPriorHistory({
      eventId: kind === "eventSafetyReport" ?
        row.title.replace(/^Event\s+/u, "") :
        null,
      kind,
      primaryUserId,
      targetPath,
    }),
    outcomeGuidance: sampleSafetyOutcomeGuidance({
      hasContext: true,
      kind,
      severity,
      targetPath,
    }),
    nextActions: [
      "Open the source document before resolving.",
      "Confirm reporter, subject, event, and channel context.",
      "Use audited safety mutations only after the policy outcome is explicit.",
    ],
  };
  return {item};
}

function sampleSafetyPriorHistory({
  eventId,
  kind,
  primaryUserId,
  targetPath,
}: {
  eventId: string | null;
  kind: AdminSafetyTriageDetails["kind"];
  primaryUserId: string | null;
  targetPath: string;
}): AdminSafetyTriageDetails["priorHistory"] {
  const history: AdminSafetyTriageDetails["priorHistory"] = [];
  if (primaryUserId && kind !== "eventSafetyReport") {
    history.push({
      id: "reportsAboutPrimaryUser",
      label: "Reports about primary user",
      count: 1,
      sampleTargetPaths: [targetPath === "reports/report-2" ?
        "reports/report-1" :
        "reports/report-2"],
    });
  }
  if (kind === "moderationFlag" && primaryUserId) {
    history.push({
      id: "moderationForPrimaryUser",
      label: "Moderation flags for primary user",
      count: 1,
      sampleTargetPaths: ["moderationFlags/flag-2"],
    });
  }
  if (kind === "eventSafetyReport" && eventId) {
    history.push({
      id: "eventSafetyForEvent",
      label: "Event safety reports for event",
      count: 1,
      sampleTargetPaths: ["eventSafetyReports/event-2_user-7"],
    });
  }
  return history;
}

function sampleSafetyOutcomeGuidance({
  hasContext,
  kind,
  severity,
  targetPath,
}: {
  hasContext: boolean;
  kind: AdminSafetyTriageDetails["kind"];
  severity: AdminSafetyTriageSeverity;
  targetPath: string;
}): AdminSafetyTriageDetails["outcomeGuidance"] {
  const guidance: AdminSafetyTriageDetails["outcomeGuidance"] = [];
  if (severity === "high") {
    guidance.push({
      id: "escalate_safety_lead",
      label: "Escalate to safety lead",
      detail: "High-severity queue item. Keep a safety reviewer assigned before any account action.",
      severity: "critical",
      actionStatus: "manual",
    });
  }
  if (targetPath.includes("report") || kind === "moderationFlag") {
    guidance.push({
      id: "restriction_requires_contract",
      label: "Restriction requires separate account action",
      detail: "This tab does not restrict accounts. Use a dedicated account-safety callable before changing user state.",
      severity: "warning",
      actionStatus: "needs_contract",
    });
  }
  if (kind === "eventSafetyReport") {
    guidance.push({
      id: "route_event_owner",
      label: "Route event follow-up",
      detail: "Review event, host, attendance, and feedback context before resolving the event safety report.",
      severity: "warning",
      actionStatus: "manual",
    });
  }
  if (!hasContext) {
    guidance.push({
      id: "request_more_context",
      label: "Request more information",
      detail: "No source context id is present. Ask for supporting detail before closing the queue item.",
      severity: "info",
      actionStatus: "manual",
    });
  }
  guidance.push({
    id: "status_only_resolution",
    label: "Reviewed/dismissed is queue-only",
    detail: "The current mutation only updates the queue document status. Account, content, event, and payment changes require their owning workflow.",
    severity: "info",
    actionStatus: "available",
  });
  return guidance;
}

function extractDetailValue(
  parts: string[],
  label: string
): string | null {
  const prefix = `${label} `;
  const match = parts.find((part) => part.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function sampleAccessApplicationDetails(
  applicationUid: string
): AdminGetAccessApplicationDetailsResponse["application"] {
  const row = sampleOverview.queues.accessApplications.find((item) =>
    item.targetPath === `accessApplications/${applicationUid}`
  );
  if (!row) {
    throw new Error(
      `Access application ${applicationUid} was not found in local preview data.`
    );
  }
  const isMumbai = row.detail.toLowerCase().includes("mumbai");
  const wantsToHost = row.detail.toLowerCase().includes("wants to host") ||
    row.detail.toLowerCase().includes("host");
  const city = isMumbai ? "mumbai" : "delhi";
  const role = wantsToHost ? "host" : "attendee";
  const referralSource = isMumbai ? "organizer referral" : "founder waitlist";
  const inviteCode = isMumbai ? "mumbai-launch" : "delhi-founder";
  const instagramHandle = isMumbai ? "@rohanruns" : "@mayaruns";
  return {
    uid: applicationUid,
    targetPath: row.targetPath,
    status: row.status,
    city,
    role,
    eventTypes: wantsToHost ? ["running", "singlesMixer"] : ["running"],
    availabilityWindows: isMumbai ?
      ["weekdayEvening", "weekendMorning"] :
      ["weekendMorning"],
    wantsToHost,
    inviteCode,
    instagramHandle,
    referralSource,
    whyCatch: wantsToHost ?
      "I can help host launch events and bring a reliable first group." :
      "I want to meet people offline through curated active events.",
    cohortId: null,
    hostUserId: null,
    reviewerUid: null,
    reviewNote: null,
    submissionCount: isMumbai ? 1 : 2,
    createdAt: row.createdAt,
    submittedAt: row.createdAt,
    updatedAt: row.createdAt,
    reviewedAt: null,
    duplicateSignals: [
      {
        id: "inviteCode",
        label: "Invite code",
        value: inviteCode,
        count: 0,
        sampleTargetPaths: [],
      },
      {
        id: "instagramHandle",
        label: "Instagram",
        value: instagramHandle,
        count: 0,
        sampleTargetPaths: [],
      },
      {
        id: "referralSource",
        label: "Referral source",
        value: referralSource,
        count: isMumbai ? 0 : 1,
        sampleTargetPaths: isMumbai ?
          [] :
          ["accessApplications/application-2"],
      },
      {
        id: "cityRole",
        label: "City and role",
        value: `${city} / ${role}`,
        count: 0,
        sampleTargetPaths: [],
      },
    ],
  };
}

function sampleSafetySeverity(
  kind: AdminSafetyTriageDetails["kind"],
  title: string,
  detail: string
): AdminSafetyTriageSeverity {
  if (kind === "eventSafetyReport") return "high";
  const haystack = `${title} ${detail}`.toLowerCase();
  if (haystack.includes("harassment") || haystack.includes("explicit")) {
    return "high";
  }
  if (haystack.includes("fake") || haystack.includes("banned")) {
    return "medium";
  }
  return "watch";
}

function sampleSafetyOwnerTeam(
  kind: AdminSafetyTriageDetails["kind"],
  source: string | null
): string {
  if (kind === "eventSafetyReport") return "Event safety";
  if (kind === "moderationFlag") return "Moderation";
  return source?.includes("chat") ? "Trust and safety" : "Support review";
}

function sampleSafetySla(
  createdAt: string | null,
  severity: AdminSafetyTriageSeverity
): AdminSafetyTriageSla {
  const hours = severity === "high" ? 24 : severity === "medium" ? 48 : 72;
  const dueAt = createdAt ?
    new Date(Date.parse(createdAt) + hours * 3600000).toISOString() :
    null;
  return {
    dueAt,
    state: sampleSafetySlaState(dueAt),
    policy: `${severity} queue default response SLA: ${hours}h.`,
  };
}

function sampleSafetySlaState(
  dueAt: string | null
): AdminSafetyTriageSla["state"] {
  if (!dueAt) return "unknown";
  const diffMs = Date.parse(dueAt) - Date.parse(sampleGeneratedAt);
  if (Number.isNaN(diffMs)) return "unknown";
  if (diffMs < 0) return "overdue";
  if (diffMs <= 6 * 3600000) return "due_soon";
  return "ok";
}

function sampleSafetyEvidence({
  organizerId,
  contextId,
  detail,
  eventId,
  primaryUserId,
  secondaryUserId,
  source,
  title,
}: {
  organizerId: string | null;
  contextId: string | null;
  detail: string;
  eventId: string | null;
  primaryUserId: string | null;
  secondaryUserId: string | null;
  source: string | null;
  title: string;
}): AdminSafetyTriageEvidence[] {
  return [
    safetyEvidence("Primary user", primaryUserId, sampleUserPath(primaryUserId),
      false),
    safetyEvidence("Secondary user", secondaryUserId,
      sampleUserPath(secondaryUserId), false),
    safetyEvidence("Event", eventId, eventId ? `events/${eventId}` : null,
      false),
    safetyEvidence(
      "Organizer",
      organizerId,
      organizerId ? `organizers/${organizerId}` : null,
      false
    ),
    safetyEvidence("Source", source, null, false),
    safetyEvidence("Context", contextId, contextId, false),
    safetyEvidence("Queue detail", `${title} - ${detail}`, null, true),
  ].filter((item): item is AdminSafetyTriageEvidence => item !== null);
}

function safetyEvidence(
  label: string,
  value: string | null,
  sourcePath: string | null,
  sensitive: boolean
): AdminSafetyTriageEvidence | null {
  if (!value) return null;
  return {label, value, sourcePath, sensitive};
}

function sampleUserPath(userId: string | null): string | null {
  return userId ? `users/${userId}` : null;
}

export async function loadHostAnalytics(
  payload: HostAnalyticsQueryPayload = {}
): Promise<HostAnalyticsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleHostAnalytics;
  }

  const callable = httpsCallable<
    HostAnalyticsQueryPayload,
    HostAnalyticsResponse
  >(functions, "adminGetHostAnalytics");
  const result = await callable(payload);
  return result.data;
}

export async function loadUserAnalytics(
  payload: UserAnalyticsQueryPayload
): Promise<UserAnalyticsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleUserAnalyticsReport(payload);
  }

  const callable = httpsCallable<
    UserAnalyticsQueryPayload,
    UserAnalyticsResponse
  >(functions, "adminGetUserAnalytics");
  const result = await callable(payload);
  return result.data;
}

export async function loadCrossPathsShowcaseCandidates(
  payload: AdminListCrossPathsShowcaseCandidatesCallablePayload = {}
): Promise<AdminListCrossPathsShowcaseCandidatesCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleCrossPathsShowcaseCandidates(payload);
  }
  const callable = httpsCallable<
    AdminListCrossPathsShowcaseCandidatesCallablePayload,
    AdminListCrossPathsShowcaseCandidatesCallableResponse
  >(functions, "adminListCrossPathsShowcaseCandidates");
  return (await callable(payload)).data;
}

export async function setCrossPathsShowcaseEligibility(
  payload: AdminSetCrossPathsShowcaseEligibilityCallablePayload
): Promise<AdminSetCrossPathsShowcaseEligibilityCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleSetCrossPathsShowcaseEligibility(payload);
  }
  const callable = httpsCallable<
    AdminSetCrossPathsShowcaseEligibilityCallablePayload,
    AdminSetCrossPathsShowcaseEligibilityCallableResponse
  >(functions, "adminSetCrossPathsShowcaseEligibility");
  return (await callable(payload)).data;
}

const sampleCrossPathsGeneratedAt = "2026-08-05T10:00:00.000Z";
const sampleCrossPathsFingerprint = "a".repeat(64);
const sampleCrossPathsCandidates:
  AdminListCrossPathsShowcaseCandidatesCallableResponse["candidates"] = [
    {
      uid: "user-rhea",
      name: "Rhea",
      age: 28,
      gender: "woman",
      city: "in-mh-mumbai",
      photoUrls: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      ],
      promptAnswers: [
        {prompt: "Ideal Sunday", answer: "A long walk and dosa."},
        {prompt: "Together we could", answer: "Try every quiz night."},
        {prompt: "I am known for", answer: "Making the plan happen."},
      ],
      relationshipGoal: "longTermRelationship",
      automaticStatus: "ready",
      automaticReasonCodes: [],
      storedStatus: null,
      effectiveStatus: "needsReview",
      effectiveReasonCodes: [],
      profileFingerprint: sampleCrossPathsFingerprint,
      reviewedByUid: null,
      reviewedAt: null,
      reviewNote: null,
    },
  ];

function sampleCrossPathsShowcaseCandidates(
  payload: AdminListCrossPathsShowcaseCandidatesCallablePayload
): AdminListCrossPathsShowcaseCandidatesCallableResponse {
  const status = payload.status ?? "all";
  return {
    schemaVersion: 1,
    generatedAt: sampleCrossPathsGeneratedAt,
    candidates: sampleCrossPathsCandidates.filter((candidate) =>
      (!payload.uid || candidate.uid === payload.uid) &&
      (!payload.marketId || candidate.city === payload.marketId) &&
      (status === "all" || candidate.effectiveStatus === status)
    ),
    nextCursor: null,
  };
}

function sampleSetCrossPathsShowcaseEligibility(
  payload: AdminSetCrossPathsShowcaseEligibilityCallablePayload
): AdminSetCrossPathsShowcaseEligibilityCallableResponse {
  const candidate = sampleCrossPathsCandidates.find(
    (row) => row.uid === payload.uid
  );
  if (candidate) {
    candidate.storedStatus = payload.status;
    candidate.effectiveStatus = payload.status;
    candidate.effectiveReasonCodes = payload.status === "paused" ?
      ["manual_pause"] : payload.status === "needsReview" ?
        ["reviewer_hold"] : [];
    candidate.reviewedByUid = "sample-reviewer";
    candidate.reviewedAt = sampleCrossPathsGeneratedAt;
    candidate.reviewNote = payload.reviewNote;
  }
  return {
    uid: payload.uid,
    status: payload.status,
    reasonCodes: candidate?.effectiveReasonCodes ?? [],
    profileFingerprint: candidate?.profileFingerprint ??
      sampleCrossPathsFingerprint,
    ruleVersion: 1,
    reviewVersion: 1,
    reviewedAt: sampleCrossPathsGeneratedAt,
  };
}

let sampleMarketingOpsBridgeState: MarketingOpsBridge | null = null;

export async function loadMarketingOpsBridge():
  Promise<AdminGetMarketingOpsDashboardResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return {bridge: await loadSampleMarketingOpsBridge()};
  }

  const callable = httpsCallable<unknown, AdminGetMarketingOpsDashboardResponse>(
    functions,
    "adminGetMarketingOpsDashboard"
  );
  const result = await callable({});
  return result.data;
}

export async function loadEventIntakeDashboard():
  Promise<AdminGetEventIntakeDashboardResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return {bridge: structuredClone(sampleEventIntakeBridge)};
  }

  const callable = httpsCallable<unknown, AdminGetEventIntakeDashboardResponse>(
    functions,
    "adminGetEventIntakeDashboard"
  );
  const result = await callable({});
  return result.data;
}

export async function listIntakeOperations(
  payload: AdminListIntakeOperationsPayload = {}
): Promise<AdminListIntakeOperationsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return sampleIntakeOperations(payload);
  }

  const callable = httpsCallable<
    AdminListIntakeOperationsPayload,
    AdminListIntakeOperationsResponse
  >(functions, "adminListIntakeOperations");
  const result = await callable(payload);
  return result.data;
}

export async function listActionExecutions(
  payload: AdminListActionExecutionsPayload = {}
): Promise<AdminListActionExecutionsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    return {
      ...sampleActionExecutions,
      rows: sampleActionExecutions.rows.slice(0, payload.limit ?? 50),
    };
  }

  const callable = httpsCallable<
    AdminListActionExecutionsPayload,
    AdminListActionExecutionsResponse
  >(functions, "adminListActionExecutions");
  const result = await callable(payload);
  return result.data;
}

export async function createMarketingContentDraft(
  payload: AdminCreateMarketingContentDraftPayload
): Promise<AdminCreateMarketingContentDraftResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const sampleBridge = await loadSampleMarketingOpsBridge();
    const draft = buildSampleMarketingDraft(
      payload,
      sampleBridge
    );
    const bridge = appendSampleMarketingDraft(
      sampleBridge,
      draft
    );
    sampleMarketingOpsBridgeState = bridge;
    return {
      draft,
      bridge,
      dashboardPath: "local-preview/marketingOpsDashboards/current",
    };
  }

  const callable = httpsCallable<
    AdminCreateMarketingContentDraftPayload,
    AdminCreateMarketingContentDraftResponse
  >(functions, "adminCreateMarketingContentDraft");
  const result = await callable(payload);
  return result.data;
}

async function loadSampleMarketingOpsBridge(): Promise<MarketingOpsBridge> {
  if (sampleMarketingOpsBridgeState) return sampleMarketingOpsBridgeState;
  sampleMarketingOpsBridgeState = structuredClone(sampleMarketingOpsBridge);
  return sampleMarketingOpsBridgeState;
}

function buildSampleMarketingDraft(
  payload: AdminCreateMarketingContentDraftPayload,
  bridge: MarketingOpsBridge
): MarketingContentDraft {
  const createdAt = new Date().toISOString();
  const cityId = payload.cityId ?? bridge.city.id;
  const weekStart = payload.weekStart ?? bridge.weekStart;
  const draftId = [
    cityId,
    weekStart,
    payload.draftType.replace("_", "-"),
    String(Date.now()).slice(-6),
  ].join("-");
  const base: Omit<
    MarketingContentDraft,
    "recommendationSetId" | "caption" | "slides"
  > = {
    id: draftId,
    cityId,
    weekStart,
    format: "instagram_carousel",
    tone: payload.draftType,
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
    latestDecision: {
      decision: "new",
      note: `Draft created in local preview at ${createdAt}.`,
      reviewer: "local-preview-admin",
      reviewedAt: createdAt,
    },
  };
  if (payload.draftType === "feature_explainer") {
    const captures = (bridge.appFeatureMedia?.captures ?? [])
      .filter((capture) => capture.status !== "paused")
      .slice(0, 4);
    return {
      ...base,
      recommendationSetId: "app-feature-media",
      caption: [
        "A quick product tour from approved Catch screenshots.",
        "Review copy and screenshot rights before marking export ready.",
      ].join("\n"),
      slides: [
        {
          id: "cover",
          role: "cover",
          headline: payload.title || "Four things you won't find in a swipe app.",
          body: "A short tour of what makes Catch different.",
          image: null,
        },
        ...captures.map((capture, index) => ({
          id: `feature-${index + 1}`,
          role: "feature",
          headline: capture.walkthroughStep || capture.surface,
          body: capture.caption,
          image: {
            sourceType: "app_capture" as const,
            url: capture.webPath ?? "",
            captureId: capture.id,
            sourcePath: capture.sourcePath,
            websitePath: capture.websitePath,
            webPath: capture.webPath,
            fileName: `${capture.id}.png`,
            altText: capture.alt,
            credit: "Catch deterministic app screenshot pipeline",
            fit: "contain" as const,
          },
        })),
        {
          id: "cta",
          role: "cta",
          headline: "Update Catch to try it.",
          body: "Feature explainers use approved product screenshots and reviewed copy before export.",
          image: null,
        },
      ],
    };
  }

  const set = bridge.recommendationSets.find((item) =>
    item.id === payload.sourceRecommendationSetId
  ) ?? bridge.recommendationSets.find((item) => item.items.length > 0) ??
    bridge.recommendationSets[0] ??
    null;
  const eventById = new Map(bridge.eventCandidates.map((event) => [
    event.id,
    event,
  ]));
  const picks = (set?.items ?? []).slice(0, 3);
  return {
    ...base,
    recommendationSetId: set?.id ?? "manual",
    caption: [
      `${bridge.city.label} plans this week, checked before public use.`,
      ...picks.map((item, index) => `${index + 1}. ${item.title}`),
      "",
      "Catch is not the host for third-party events unless explicitly stated.",
    ].join("\n"),
    slides: [
      {
        id: "cover",
        role: "cover",
        headline: payload.title || set?.title || "Plans worth leaving the app for.",
        body: "Source-backed events for the week, checked for public use before export.",
        image: null,
      },
      ...picks.map((item, index) => {
        const event = eventById.get(item.eventCandidateId);
        const details = [
          event?.venue,
          event?.neighborhood,
          event?.startDate,
          event?.time,
          event?.price,
        ].filter(Boolean).join(" / ");
        return {
          id: `event-${index + 1}`,
          role: "event",
          eventCandidateId: item.eventCandidateId,
          headline: item.title,
          body: details ?
            `${details}\n${item.inclusionReason}` :
            item.inclusionReason,
          image: null,
        };
      }),
      {
        id: "cta",
        role: "cta",
        headline: "Know a plan we should review?",
        body: "Send it through organizer intake. Catch only promotes sourced events after human review.",
        image: null,
      },
    ],
  };
}

function appendSampleMarketingDraft(
  bridge: MarketingOpsBridge,
  draft: MarketingContentDraft
): MarketingOpsBridge {
  const contentDrafts = [...bridge.contentDrafts, draft];
  return {
    ...bridge,
    summary: {
      ...bridge.summary,
      contentDrafts: contentDrafts.length,
      exportReadyDrafts: contentDrafts.filter((item) =>
        item.latestDecision?.decision === "export_ready" ||
        item.status === "export_ready"
      ).length,
    },
    contentDrafts,
    auditTrail: [
      ...bridge.auditTrail,
      {
        targetType: "content_draft",
        targetId: draft.id,
        decision: "new",
        note: `Created ${draft.tone.replace("_", " ")} draft.`,
        reviewer: "local-preview-admin",
        reviewedAt: draft.latestDecision?.reviewedAt ?? null,
        edits: {draftType: draft.tone},
      },
    ],
  };
}

export async function decideAccessApplication(
  payload: AdminDecideAccessApplicationPayload
): Promise<AdminDecideAccessApplicationResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    return {
      applicationUid: payload.applicationUid,
      decision: payload.decision,
      status: payload.decision === "approve" ?
        "approvedForProfile" :
        "notSelectedYet",
    };
  }

  const callable = httpsCallable<
    AdminDecideAccessApplicationPayload,
    AdminDecideAccessApplicationResponse
  >(functions, "adminDecideAccessApplication");
  const result = await callable(payload);
  return result.data;
}

export async function getAccessApplicationDetails(
  payload: AdminGetAccessApplicationDetailsPayload
): Promise<AdminGetAccessApplicationDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 160));
    return {
      application: sampleAccessApplicationDetails(payload.applicationUid),
    };
  }

  const callable = httpsCallable<
    AdminGetAccessApplicationDetailsPayload,
    AdminGetAccessApplicationDetailsResponse
  >(functions, "adminGetAccessApplicationDetails");
  const result = await callable(payload);
  return result.data;
}

export async function decideOrganizerClaim(
  payload: AdminDecideOrganizerClaimPayload
): Promise<AdminDecideOrganizerClaimResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    return {
      requestId: payload.requestId,
      organizerId: "local-preview-club",
      decision: payload.decision,
      status: payload.decision === "approve" ? "approved" : "rejected",
    };
  }

  const callable = httpsCallable<
    AdminDecideOrganizerClaimPayload,
    AdminDecideOrganizerClaimResponse
  >(functions, "adminDecideOrganizerClaim");
  const result = await callable(payload);
  return result.data;
}

export async function listOrganizerClaimRequests():
Promise<AdminListOrganizerClaimRequestsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return {
      generatedAt: sampleOverview.generatedAt,
      rows: sampleOverview.queues.organizerClaimRequests.map((row, index) => ({
        requestId: row.targetPath.split("/").at(-1) ?? row.id,
        targetPath: row.targetPath,
        organizerId: index === 0 ? "afterfly" : "bhag",
        requesterUid: index === 0 ? "local-preview-afterfly-owner" : "local-preview-bhag-manager",
        requesterName: row.title,
        requesterRole: index === 0 ? "founder" : "manager",
        contact: index === 0 ? "hello@afterfly.in" : null,
        proofCount: index === 0 ? 2 : 1,
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  }

  const callable = httpsCallable<unknown, AdminListOrganizerClaimRequestsResponse>(
    functions,
    "adminListOrganizerClaimRequests"
  );
  const result = await callable({});
  return result.data;
}

export async function getOrganizerClaimRequestDetails(
  payload: AdminGetOrganizerClaimRequestDetailsPayload
): Promise<AdminGetOrganizerClaimRequestDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    const list = await listOrganizerClaimRequests();
    const row = list.rows.find((item) => item.requestId === payload.requestId);
    if (!row) throw new Error("Organizer claim request not found.");
    return {
      request: {
        ...row,
        businessEmail: row.contact?.includes("@") ? row.contact : null,
        businessPhone: row.contact && !row.contact.includes("@") ? row.contact : null,
        proofUrls: row.organizerId === "afterfly" ? [
          "https://www.instagram.com/afterfly.in/",
          "https://luma.com/pxgmph3b",
        ] : ["https://thebhag.in/"],
        message: "Please verify this claim against the listed public sources.",
        updatedAt: row.createdAt,
        requesterProfile: {exists: true, profileComplete: row.organizerId === "afterfly"},
        organizer: {
          exists: true,
          name: row.organizerId === "afterfly" ? "AFTER FLY" : "Bhag Club",
          claimState: "claimPending",
          ownershipState: "programmatic",
          ownerUserId: null,
          canonicalPath: `/organizers/${row.organizerId}/`,
        },
      },
    };
  }

  const callable = httpsCallable<
    AdminGetOrganizerClaimRequestDetailsPayload,
    AdminGetOrganizerClaimRequestDetailsResponse
  >(functions, "adminGetOrganizerClaimRequestDetails");
  const result = await callable(payload);
  return result.data;
}

export async function setOrganizerIndexStatus(
  payload: AdminSetOrganizerIndexStatusPayload
): Promise<AdminSetOrganizerIndexStatusResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const organizer = sampleOrganizerDetails[payload.organizerId];
    if (organizer) {
      organizer.publicPage.indexStatus = payload.indexStatus;
      organizer.publicPage.publishStatus =
        payload.indexStatus === "noindex" ? "qa" : "published";
      organizer.publicPage.robots = payload.indexStatus === "noindex" ?
        "noindex, follow" :
        "index, follow";
    }
    return {
      organizerId: payload.organizerId,
      indexStatus: payload.indexStatus,
      publishStatus: payload.indexStatus === "noindex" ? "qa" : "published",
      robots: payload.indexStatus === "noindex" ?
        "noindex, follow" :
        "index, follow",
    };
  }

  const callable = httpsCallable<
    AdminSetOrganizerIndexStatusPayload,
    AdminSetOrganizerIndexStatusResponse
  >(functions, "adminSetOrganizerIndexStatus");
  const result = await callable(payload);
  return result.data;
}

export async function decideOrganizerIntake(
  payload: AdminDecideOrganizerIntakePayload
): Promise<AdminDecideOrganizerIntakeResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    return {
      entityId: payload.entityId,
      decision: payload.decision,
      decisionStatus: payload.decision === "approve_public" ?
        "approved_public" :
        payload.decision === "hold" ? "held" : "suppressed",
      publishStatus: payload.publishStatus,
      indexStatus: payload.indexStatus,
      appVisibility: payload.appVisibility,
      decisionPath: `organizerIntakeReviewDecisions/${payload.entityId}`,
      projectionState: payload.decision === "approve_public" ?
        "pending_static_generation" :
        "not_projectable",
    };
  }

  const callable = httpsCallable<
    AdminDecideOrganizerIntakePayload,
    AdminDecideOrganizerIntakeResponse
  >(functions, "adminDecideOrganizerIntake");
  const result = await callable(payload);
  return result.data;
}

export async function createOrganizerDraftFromCandidate(
  payload: AdminCreateOrganizerDraftFromCandidatePayload
): Promise<AdminCreateOrganizerDraftFromCandidateResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const organizerId = "sampleOrg00000000001";
    return {
      organizerId,
      organizerPath: `organizers/${organizerId}`,
      curationPath:
        `organizerIntakeCurationDecisions/sample-${payload.candidateId}`,
      created: true,
      appVisibility: "hidden",
      ownershipState: "programmatic",
      claimState: "unclaimed",
      publishStatus: "draft",
      indexStatus: "noindex",
      crawlStatus: "disabled",
    };
  }

  const callable = httpsCallable<
    AdminCreateOrganizerDraftFromCandidatePayload,
    AdminCreateOrganizerDraftFromCandidateResponse
  >(functions, "adminCreateOrganizerDraftFromCandidate");
  const result = await callable(payload);
  return result.data;
}

export async function decideOrganizerPolicyGap(
  payload: AdminDecideOrganizerPolicyGapPayload
): Promise<AdminDecideOrganizerPolicyGapResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const decisionId = `policy-${payload.gapId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
    return {
      gapId: payload.gapId,
      decisionId,
      decision: payload.decision,
      decisionStatus: payload.decision === "accept" ?
        "accepted" :
        payload.decision === "hold" ? "held" : "rejected",
      decisionPath: `organizerPolicyGapReviewDecisions/${decisionId}`,
      operationalState: payload.decision === "reject" ?
        "not_approved" :
        "blocked_until_policy_encoded",
    };
  }

  const callable = httpsCallable<
    AdminDecideOrganizerPolicyGapPayload,
    AdminDecideOrganizerPolicyGapResponse
  >(functions, "adminDecideOrganizerPolicyGap");
  const result = await callable(payload);
  return result.data;
}

export async function recordOrganizerCuration(
  payload: AdminRecordOrganizerCurationPayload
): Promise<AdminRecordOrganizerCurationResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    return {
      operationId: payload.operationId ??
        `${payload.operationType}-${payload.entityId ?? payload.sourceEntityId ?? "operation"}`,
      operationType: payload.operationType,
      operationStatus: "active",
      decisionPath: "organizerIntakeCurationDecisions/sample-operation",
    };
  }

  const callable = httpsCallable<
    AdminRecordOrganizerCurationPayload,
    AdminRecordOrganizerCurationResponse
  >(functions, "adminRecordOrganizerCuration");
  const result = await callable(payload);
  return result.data;
}

export async function recordMarketingReviewDecision(
  payload: AdminRecordMarketingReviewDecisionPayload
): Promise<AdminRecordMarketingReviewDecisionResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const decisionId = `marketing-${payload.targetType}-${payload.targetId}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return {
      decisionId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      decision: payload.decision,
      decisionStatus: marketingDecisionStatus(payload.decision),
      decisionPath: `marketingReviewDecisions/${decisionId}`,
    };
  }

  const callable = httpsCallable<
    AdminRecordMarketingReviewDecisionPayload,
    AdminRecordMarketingReviewDecisionResponse
  >(functions, "adminRecordMarketingReviewDecision");
  const result = await callable(payload);
  return result.data;
}

export async function recordEventIntakeReviewDecision(
  payload: AdminRecordEventIntakeReviewDecisionPayload
): Promise<AdminRecordEventIntakeReviewDecisionResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const decisionId = `event-intake-${payload.targetType}-${payload.targetId}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return {
      decisionId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      decision: payload.decision,
      decisionStatus: eventIntakeDecisionStatus(payload.decision),
      decisionPath: `eventIntakeReviewDecisions/${decisionId}`,
    };
  }

  const callable = httpsCallable<
    AdminRecordEventIntakeReviewDecisionPayload,
    AdminRecordEventIntakeReviewDecisionResponse
  >(functions, "adminRecordEventIntakeReviewDecision");
  const result = await callable(payload);
  return result.data;
}

function marketingDecisionStatus(
  decision: AdminRecordMarketingReviewDecisionPayload["decision"]
): AdminRecordMarketingReviewDecisionResponse["decisionStatus"] {
  if (decision === "approve") return "approved";
  if (decision === "hold") return "held";
  if (decision === "reject") return "rejected";
  if (decision === "export_ready") return "export_ready";
  return "needs_changes";
}

function eventIntakeDecisionStatus(
  decision: AdminRecordEventIntakeReviewDecisionPayload["decision"]
): AdminRecordEventIntakeReviewDecisionResponse["decisionStatus"] {
  if (decision === "approve") return "approved";
  if (decision === "hold") return "held";
  if (decision === "reject") return "rejected";
  return "needs_changes";
}

export async function loadOrganizerDetails(
  payload: AdminGetOrganizerDetailsPayload
): Promise<AdminGetOrganizerDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const organizer = sampleOrganizerDetails[payload.organizerId];
    if (!organizer) {
      throw new Error(
        `Organizer ${payload.organizerId} was not found in local preview data.`
      );
    }
    return {organizer};
  }

  const callable = httpsCallable<
    {organizerId: string},
    {organizer: Omit<AdminGetOrganizerDetailsResponse["organizer"], "organizerId"> & {
      organizerId: string;
    }}
  >(functions, "adminGetOrganizerDetails");
  const result = await callable({organizerId: payload.organizerId});
  const {organizerId, ...organizer} = result.data.organizer;
  return {organizer: {...organizer, organizerId: organizerId}};
}

export async function listOrganizerDetails(
  payload: AdminListOrganizerDetailsPayload = {}
): Promise<AdminListOrganizerDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const rows = Object.values(sampleOrganizerDetails)
      .map(sampleOrganizerListRow)
      .filter((row) => sampleOrganizerListRowMatches(row, payload))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, payload.limit ?? 50);
    return {
      generatedAt: sampleGeneratedAt,
      rows,
    };
  }

  const callable = httpsCallable<
    AdminListOrganizerDetailsPayload,
    {
      generatedAt: string;
      rows: Array<Omit<AdminOrganizerListRow, "organizerId"> & {organizerId: string}>;
    }
  >(functions, "adminListOrganizerDetails");
  const result = await callable(payload);
  return {
    generatedAt: result.data.generatedAt,
    rows: result.data.rows.map(({organizerId, ...row}) => ({
      ...row,
      organizerId: organizerId,
    })),
  };
}

export async function saveOrganizerDetails(
  payload: AdminUpdateOrganizerDetailsPayload
): Promise<AdminUpdateOrganizerDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const organizer = sampleOrganizerDetails[payload.organizerId];
    if (organizer) applySampleOrganizerDetailsPatch(organizer, payload.fields);
    return {
      organizerId: payload.organizerId,
      updatedFieldCount: Object.keys(payload.fields).length,
    };
  }

  const callable = httpsCallable<
    Omit<AdminUpdateOrganizerDetailsPayload, "organizerId"> & {organizerId: string},
    {organizerId: string; updatedFieldCount: number}
  >(functions, "adminUpdateOrganizerDetails");
  const {organizerId, ...fields} = payload;
  const result = await callable({...fields, organizerId: organizerId});
  return {
    organizerId: result.data.organizerId,
    updatedFieldCount: result.data.updatedFieldCount,
  };
}

export async function loadEventDetails(
  payload: AdminGetEventDetailsPayload
): Promise<AdminGetEventDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const event = sampleEventDetails[payload.eventId];
    if (!event) {
      throw new Error(
        `Event ${payload.eventId} was not found in local preview data.`
      );
    }
    return {event};
  }

  const callable = httpsCallable<
    AdminGetEventDetailsPayload,
    AdminGetEventDetailsResponse
  >(functions, "adminGetEventDetails");
  const result = await callable(payload);
  return result.data;
}

export async function listEventDetails(
  payload: AdminListEventDetailsPayload = {}
): Promise<AdminListEventDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const rows = Object.values(sampleEventDetails)
      .map(sampleEventListRow)
      .filter((row) => sampleEventListRowMatches(row, payload))
      .sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.title.localeCompare(b.title)
      )
      .slice(0, payload.limit ?? 50);
    return {
      generatedAt: sampleGeneratedAt,
      rows,
    };
  }

  const callable = httpsCallable<
    AdminListEventDetailsPayload,
    AdminListEventDetailsResponse
  >(functions, "adminListEventDetails");
  const result = await callable(payload);
  return result.data;
}

export async function listExternalEventDetails(
  payload: AdminListExternalEventDetailsPayload = {}
): Promise<AdminListExternalEventDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const rows = sampleExternalEventRows
      .filter((row) => sampleExternalEventListRowMatches(row, payload))
      .sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.title.localeCompare(b.title)
      )
      .slice(0, payload.limit ?? 50);
    return {
      generatedAt: sampleGeneratedAt,
      rows,
    };
  }

  const callable = httpsCallable<
    AdminListExternalEventDetailsPayload,
    AdminListExternalEventDetailsResponse
  >(functions, "adminListExternalEventDetails");
  const result = await callable(payload);
  return result.data;
}

export async function takedownExternalEvent(
  payload: AdminTakedownExternalEventPayload
): Promise<AdminTakedownExternalEventResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    if (!payload.reviewNote.trim()) {
      throw new Error("A review note is required to remove external supply.");
    }
    return {
      eventId: payload.eventId,
      targetPath: `externalEvents/${payload.eventId}`,
      executionMode: payload.executionMode,
      outcome: payload.executionMode === "apply" ?
        "removed" :
        "would_remove",
      receiptPath:
        `externalEventPublicationReceipts/sample-takedown-${payload.eventId}`,
      writeApplied: payload.executionMode === "apply",
      idempotent: false,
      completedAt: sampleGeneratedAt,
    };
  }

  const callable = httpsCallable<
    AdminTakedownExternalEventPayload,
    AdminTakedownExternalEventResponse
  >(functions, "adminTakedownExternalEvent");
  const result = await callable(payload);
  return result.data;
}

export async function saveEventDetails(
  payload: AdminUpdateEventDetailsPayload
): Promise<AdminUpdateEventDetailsResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const event = sampleEventDetails[payload.eventId];
    if (!event) {
      throw new Error(
        `Event ${payload.eventId} was not found in local preview data.`
      );
    }
    if (event.status === "cancelled") {
      throw new Error("Cancelled events cannot be updated from Events.");
    }
    applySampleEventDetailsPatch(event, payload.fields);
    return {
      eventId: payload.eventId,
      updatedFieldCount: Object.keys(payload.fields).length,
    };
  }

  const callable = httpsCallable<
    AdminUpdateEventDetailsPayload,
    AdminUpdateEventDetailsResponse
  >(functions, "adminUpdateEventDetails");
  const result = await callable(payload);
  return result.data;
}

function sampleOrganizerListRow(organizer: AdminGetOrganizerDetailsResponse["organizer"]):
  AdminOrganizerListRow {
  return {
    organizerId: organizer.organizerId,
    name: organizer.name,
    organizerType: organizer.organizerType,
    publicCategoryLabel: organizer.publicCategoryLabel,
    displayCategory: organizer.displayCategory,
    cityName: organizer.cityName ?? organizer.area,
    citySlug: organizer.location ?? organizer.publicPage.citySlug,
    regionName: organizer.regionName,
    countryCode: organizer.countryCode,
    appVisibility: organizer.appVisibility,
    claimState: organizer.claimState,
    ownershipState: organizer.ownershipState,
    canonicalPath: organizer.publicPage.canonicalPath,
    publishStatus: organizer.publicPage.publishStatus,
    indexStatus: organizer.publicPage.indexStatus,
    robots: organizer.publicPage.robots,
    sourceConfidence: organizer.provenance.sourceConfidence,
    verificationStatus: organizer.provenance.verificationStatus,
    routeStatus: organizer.publicPage.canonicalPath ? "valid" : "missing",
    routeReservationStatus:
      organizer.publicPage.canonicalPath ? "reserved" : "missing",
    searchIndexStatus: "indexed",
  };
}

function sampleEventListRow(event: AdminGetEventDetailsResponse["event"]):
  AdminEventListRow {
  return {
    eventId: event.eventId,
    organizerId: event.organizerId,
    organizerName: event.organizerName,
    title: event.title,
    activityKind: event.eventFormat.activityKind,
    activityLabel: event.eventFormat.label,
    startTime: event.startTime,
    citySlug: event.discovery.citySlug,
    meetingPoint: event.meetingPoint,
    status: event.status,
    availability: event.discovery.availability,
    bookedCount: event.bookedCount,
    capacityLimit: event.capacityLimit,
    priceInPaise: event.priceInPaise,
    currency: event.currency,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled,
    searchIndexStatus: event.searchIndexStatus,
  };
}

function sampleOrganizerListRowMatches(
  row: AdminOrganizerListRow,
  payload: AdminListOrganizerDetailsPayload
): boolean {
  if (payload.citySlug && row.citySlug !== payload.citySlug) return false;
  if (
    payload.citySlugs &&
    payload.citySlugs.length > 0 &&
    !payload.citySlugs.includes(row.citySlug ?? "")
  ) {
    return false;
  }
  if (payload.publishStatus && row.publishStatus !== payload.publishStatus) {
    return false;
  }
  if (payload.appVisibility && row.appVisibility !== payload.appVisibility) {
    return false;
  }
  const query = (payload.query ?? "").trim().toLowerCase();
  if (!query) return true;
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
  return query
    .split(/\s+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function sampleEventListRowMatches(
  row: AdminEventListRow,
  payload: AdminListEventDetailsPayload
): boolean {
  if (payload.organizerId && row.organizerId !== payload.organizerId) return false;
  if (payload.citySlug && row.citySlug !== payload.citySlug) return false;
  if (
    payload.citySlugs &&
    payload.citySlugs.length > 0 &&
    !payload.citySlugs.includes(row.citySlug ?? "")
  ) {
    return false;
  }
  if (payload.activityKind && row.activityKind !== payload.activityKind) {
    return false;
  }
  if (payload.status && row.status !== payload.status) return false;
  if (!sampleEventMatchesTimeWindow(row, payload.timeWindow)) return false;
  const query = (payload.query ?? "").trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    row.eventId,
    row.organizerId,
    row.organizerName,
    row.title,
    row.activityKind,
    row.activityLabel,
    row.citySlug,
    row.meetingPoint,
    row.status,
    row.availability,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  return query
    .split(/\s+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function sampleExternalEventListRowMatches(
  row: AdminListExternalEventDetailsResponse["rows"][number],
  payload: AdminListExternalEventDetailsPayload
): boolean {
  if (payload.citySlug && row.citySlug !== payload.citySlug) return false;
  if (
    payload.citySlugs &&
    payload.citySlugs.length > 0 &&
    !payload.citySlugs.includes(row.citySlug ?? "")
  ) {
    return false;
  }
  if (
    payload.publicationStatus &&
    row.publicationStatus !== payload.publicationStatus
  ) {
    return false;
  }
  if (payload.status && row.status !== payload.status) return false;
  if (!sampleExternalEventMatchesTimeWindow(row, payload.timeWindow)) {
    return false;
  }
  const query = (payload.query ?? "").trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    row.eventId,
    row.targetPath,
    row.canonicalHostId,
    row.canonicalHostId,
    row.title,
    row.citySlug,
    row.countryCode,
    row.meetingPoint,
    row.activityKind,
    row.interactionModel,
    row.publicationStatus,
    row.status,
    row.platform,
    row.sourceEventKey,
    row.candidateId,
    row.normalizedEventKey,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  return query
    .split(/\s+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function sampleEventMatchesTimeWindow(
  row: AdminEventListRow,
  timeWindow: AdminListEventDetailsPayload["timeWindow"]
): boolean {
  if (!timeWindow || timeWindow === "all") return true;
  if (!row.startTime) return false;
  const startMillis = Date.parse(row.startTime);
  if (!Number.isFinite(startMillis)) return false;
  const now = Date.parse(sampleGeneratedAt);
  return timeWindow === "upcoming" ?
    startMillis >= now :
    startMillis < now;
}

function sampleExternalEventMatchesTimeWindow(
  row: AdminListExternalEventDetailsResponse["rows"][number],
  timeWindow: AdminListExternalEventDetailsPayload["timeWindow"]
): boolean {
  if (!timeWindow || timeWindow === "all") return true;
  if (!row.startTime) return false;
  const startMillis = Date.parse(row.startTime);
  if (!Number.isFinite(startMillis)) return false;
  const now = Date.parse(sampleGeneratedAt);
  return timeWindow === "upcoming" ?
    startMillis >= now :
    startMillis < now;
}

function applySampleOrganizerDetailsPatch(
  organizer: AdminGetOrganizerDetailsResponse["organizer"],
  fields: AdminUpdateOrganizerDetailsPayload["fields"]
) {
  Object.assign(organizer, {
    ...copyDefined(fields, [
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
      "entityKind",
      "entitySubtypes",
      "displayCategory",
      "cityName",
      "regionName",
      "countryCode",
      "countryName",
      "appVisibility",
    ]),
  });
  if (fields.publicPage) {
    Object.assign(organizer.publicPage, fields.publicPage);
  }
  if (fields.provenance) {
    Object.assign(organizer.provenance, fields.provenance);
  }
  if (fields.publicProfile) {
    Object.assign(organizer.publicProfile, fields.publicProfile);
  }
  if (fields.ownerLinks) {
    organizer.ownerLinks = fields.ownerLinks.map((link) => ({...link}));
  }
}

function applySampleEventDetailsPatch(
  event: AdminGetEventDetailsResponse["event"],
  fields: AdminUpdateEventDetailsPayload["fields"]
) {
  Object.assign(event, copyDefined(fields, [
    "description",
    "photoUrl",
    "distanceKm",
    "pace",
    "crossPathsDiscoveryEnabled",
  ]));
  if (fields.eventFormat) {
    event.eventFormat = {
      ...event.eventFormat,
      ...fields.eventFormat,
      customActivityLabel: fields.eventFormat.customActivityLabel ?? null,
      label: fields.eventFormat.customActivityLabel ??
        titleFromCamel(fields.eventFormat.activityKind),
    };
    event.title = event.eventFormat.label;
    event.discovery.activityKind = event.eventFormat.activityKind;
  }
  event.searchIndexStatus = "indexed";
}

function copyDefined<T extends Record<string, unknown>>(
  source: T,
  keys: Array<keyof T>
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

function titleFromCamel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function reviewEventMessagingBudget(
  payload: AdminReviewEventMessagingBudgetCallablePayload
): Promise<AdminReviewEventMessagingBudgetCallableResponse> {
  if (dataMode() === "sample") {
    const now = Date.parse(sampleGeneratedAt);
    const context = {
      mode: "live" as const,
      eventId: payload.eventId,
      organizerId: payload.organizerId,
    };
    return {
      schemaVersion: 1,
      review: {
        schemaVersion: 1,
        kind: "recordedSetupReview",
        context,
        routeId: payload.routeId,
        senderId: payload.senderId,
        purpose: payload.purpose,
        observedAt: now,
        completedAt: now,
        grantsDispatchAuthority: false,
        runtime: {
          appliesToPurpose: true,
          status: "configured",
          revision: 3,
          selected: true,
          sourceHash: "a".repeat(64),
          eventEnd: Date.parse("2099-07-19T00:00:00.000Z"),
        },
        sender: {
          routeId: payload.routeId,
          senderId: payload.senderId,
          displayName: "Sample approved sender",
          displayAddress: payload.routeId === "organizerEventWhatsapp" ?
            "+919999999999" : "CATCH",
          availability: "eligible",
          reviewHash: "b".repeat(64),
        },
        budgets: {
          kind: "reviewed",
          currency: "INR",
          sourceHash: "c".repeat(64),
          event: {
            budgetId: "sample-event-budget",
            scope: {kind: "event", context},
            kind: "unavailable",
            reason: "missing",
          },
          senderDay: {
            budgetId: "sample-sender-day-budget",
            scope: {kind: "senderDay", day: "2099-07-18"},
            kind: "unavailable",
            reason: "missing",
          },
        },
      },
      decision: sampleMessagingBudgetDecisions.get(
        sampleMessagingBudgetScopeKey(payload)
      ) ?? null,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
    };
  }
  const callable = httpsCallable<
    AdminReviewEventMessagingBudgetCallablePayload,
    AdminReviewEventMessagingBudgetCallableResponse
  >(functions, "adminReviewEventMessagingBudget");
  return (await callable(payload)).data;
}

export async function decideEventMessagingBudget(
  payload: AdminDecideEventMessagingBudgetCallablePayload
): Promise<AdminDecideEventMessagingBudgetCallableResponse> {
  if (dataMode() === "sample") {
    const decisionStatus: "approved" | "held" | "rejected" =
      payload.decision.kind === "approve" ?
      "approved" : payload.decision.kind === "hold" ? "held" : "rejected";
    const decision = {
      decisionId: payload.requestId,
      revision: payload.expectedRevision + 1,
      decisionStatus,
      decisionKind: payload.decision.kind,
      reviewedByUid: "sample-finance-reviewer",
      note: payload.note,
      effect: "decision_only_no_spending_authority" as const,
      grantsSpendingAuthority: false as const,
    };
    const scopeKey = sampleMessagingBudgetScopeKey(payload);
    sampleMessagingBudgetDecisions.set(scopeKey, decision);
    sampleMessagingBudgetDecisionRoutes.set(decision.decisionId, payload.routeId);
    return {
      schemaVersion: 1,
      applied: true,
      replayed: false,
      decisionId: decision.decisionId,
      revision: decision.revision,
      decisionStatus,
      decisionPath: `eventMessagingBudgetDecisions/${decision.decisionId}`,
      effect: "decision_only_no_spending_authority",
      grantsSpendingAuthority: false,
    };
  }
  const callable = httpsCallable<
    AdminDecideEventMessagingBudgetCallablePayload,
    AdminDecideEventMessagingBudgetCallableResponse
  >(functions, "adminDecideEventMessagingBudget");
  return (await callable(payload)).data;
}

export async function stageEventMessagingBudget(
  payload: AdminApplyEventMessagingBudgetCallablePayload
): Promise<AdminApplyEventMessagingBudgetCallableResponse> {
  if (dataMode() === "sample") {
    const routeId = sampleMessagingBudgetDecisionRoutes.get(payload.decisionId);
    if (!routeId) throw new Error("Review and approve the sample scope first.");
    return {
      schemaVersion: 1,
      applied: true,
      replayed: false,
      decisionId: payload.decisionId,
      decisionRevision: payload.expectedDecisionRevision,
      receiptId: payload.requestId,
      receiptPath: `eventMessagingBudgetApplications/${payload.requestId}`,
      routeId,
      eventBudget: {
        budgetId: "sample-event-budget",
        revision: 1,
        path: "eventMessagingBudgets/sample-event-budget",
        status: "paused",
      },
      senderDayBudget: {
        budgetId: "sample-sender-day-budget",
        revision: 1,
        path: "senderDayMessagingBudgets/sample-sender-day-budget",
        status: "paused",
      },
      effect: "budgets_staged_paused_no_spending_or_dispatch_authority",
      stagesSpendingCeilings: true,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
      providerContacted: false,
      workerActivated: false,
    };
  }
  const callable = httpsCallable<
    AdminApplyEventMessagingBudgetCallablePayload,
    AdminApplyEventMessagingBudgetCallableResponse
  >(functions, "adminApplyEventMessagingBudget");
  return (await callable(payload)).data;
}

export async function getOrganizerEntitlement(
  payload: GetOrganizerEntitlementCallablePayload
): Promise<OrganizerEntitlementCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const organizerId = payload.organizerId.trim();
    const record = sampleOrganizerEntitlements.get(organizerId);
    return {
      schemaVersion: 1,
      organizerId,
      catalogVersion: 1,
      revision: record?.revision ?? 0,
      grants: (record?.grants ?? []).map((grant) => ({...grant})),
      meters: {flightDaysUsed: 0, waConversationsUsed: 0},
      skuCatalog: sampleOrganizerEntitlementSkuCatalog,
    };
  }
  // This callable is scoped to organizer managers rather than admin roles, so
  // it stays outside the generated admin validator registry and uses the bare
  // Firebase callable.
  const callable = firebaseHttpsCallable<
    GetOrganizerEntitlementCallablePayload,
    OrganizerEntitlementCallableResponse
  >(functions, "getOrganizerEntitlement");
  return (await callable(payload)).data;
}

export async function grantOrganizerEntitlement(
  payload: AdminGrantOrganizerEntitlementCallablePayload
): Promise<OrganizerEntitlementMutationCallableResponse> {
  if (dataMode() === "sample") {
    const organizerId = payload.organizerId.trim();
    const record = sampleOrganizerEntitlements.get(organizerId) ?? {
      revision: 0,
      grants: [] as SampleOrganizerEntitlementGrant[],
    };
    const grantId = `grant_${payload.operationId}`;
    if (record.grants.some((grant) => grant.grantId === grantId)) {
      return {
        schemaVersion: 1,
        organizerId,
        revision: record.revision,
        grantId,
        replayed: true,
      };
    }
    const catalogEntry = sampleOrganizerEntitlementSkuCatalog[payload.sku];
    const now = Date.now();
    const validFromMillis = payload.validFromMillis ?? now;
    const validUntilMillis = payload.validUntilMillis ?? null;
    const grant: SampleOrganizerEntitlementGrant = {
      grantId,
      sku: payload.sku,
      skuLabel: catalogEntry?.label ?? payload.sku,
      unit: payload.unit,
      quantityTotal: payload.quantityTotal,
      quantityConsumed: 0,
      quantityRemaining: payload.quantityTotal,
      validFromMillis,
      validUntilMillis,
      source: payload.source,
      active: validFromMillis <= now &&
        (validUntilMillis === null || validUntilMillis > now),
      revoked: false,
    };
    record.grants = [...record.grants, grant];
    record.revision += 1;
    sampleOrganizerEntitlements.set(organizerId, record);
    return {
      schemaVersion: 1,
      organizerId,
      revision: record.revision,
      grantId,
      replayed: false,
    };
  }
  const callable = httpsCallable<
    AdminGrantOrganizerEntitlementCallablePayload,
    OrganizerEntitlementMutationCallableResponse
  >(functions, "adminGrantOrganizerEntitlement");
  return (await callable(payload)).data;
}

export async function revokeOrganizerEntitlementGrant(
  payload: AdminRevokeOrganizerEntitlementGrantCallablePayload
): Promise<OrganizerEntitlementMutationCallableResponse> {
  if (dataMode() === "sample") {
    const organizerId = payload.organizerId.trim();
    const record = sampleOrganizerEntitlements.get(organizerId);
    const grant = record?.grants.find((entry) =>
      entry.grantId === payload.grantId);
    if (!record || !grant) {
      throw new Error("Unknown entitlement grant for this organizer.");
    }
    if (grant.revoked) {
      throw new Error("This entitlement grant is already revoked.");
    }
    record.grants = record.grants.map((entry) => entry.grantId === grant.grantId ?
      {...entry, active: false, revoked: true} : entry);
    record.revision += 1;
    return {
      schemaVersion: 1,
      organizerId,
      revision: record.revision,
      grantId: grant.grantId,
      replayed: false,
    };
  }
  const callable = httpsCallable<
    AdminRevokeOrganizerEntitlementGrantCallablePayload,
    OrganizerEntitlementMutationCallableResponse
  >(functions, "adminRevokeOrganizerEntitlementGrant");
  return (await callable(payload)).data;
}

function sampleMessagingBudgetScopeKey(payload: {
  organizerId: string;
  eventId: string;
  routeId: string;
  senderId: string;
  purpose: string;
}): string {
  return [
    payload.organizerId,
    payload.eventId,
    payload.routeId,
    payload.senderId,
    payload.purpose,
  ].join("|");
}

/**
 * Some Finance callables predate the admin name prefix. They still cross the
 * same validated boundary, and the catalog parity check discovers them
 * through this wrapper.
 */
function invokeAdminCallable<RequestData, ResponseData>(
  name: string,
  payload: RequestData
) {
  return httpsCallable<RequestData, ResponseData>(functions, name)(payload);
}

export async function listCommercialTerms(
  payload: AdminListCommercialTermsCallablePayload
): Promise<AdminListCommercialTermsCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleListCommercialTerms(payload);
  }
  const callable = httpsCallable<
    AdminListCommercialTermsCallablePayload,
    AdminListCommercialTermsCallableResponse
  >(functions, "adminListCommercialTerms");
  return (await callable(payload)).data;
}

export async function manageCommercialTerms(
  payload: ManageCommercialTermsCallablePayload
): Promise<ManageCommercialTermsCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleManageCommercialTerms(payload);
  }
  return (await invokeAdminCallable<
    ManageCommercialTermsCallablePayload,
    ManageCommercialTermsCallableResponse
  >("manageCommercialTerms", payload)).data;
}

export async function managePaymentRoutingPolicy(
  payload: ManagePaymentRoutingPolicyCallablePayload
): Promise<ManagePaymentRoutingPolicyCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleManagePaymentRoutingPolicy(payload);
  }
  return (await invokeAdminCallable<
    ManagePaymentRoutingPolicyCallablePayload,
    ManagePaymentRoutingPolicyCallableResponse
  >("managePaymentRoutingPolicy", payload)).data;
}

export async function listOrganizerDirectory(
  payload: AdminListOrganizerDirectoryCallablePayload
): Promise<AdminListOrganizerDirectoryCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleListOrganizerDirectory(payload);
  }
  const callable = httpsCallable<
    AdminListOrganizerDirectoryCallablePayload,
    AdminListOrganizerDirectoryCallableResponse
  >(functions, "adminListOrganizerDirectory");
  return (await callable(payload)).data;
}

export async function listEventDirectory(
  payload: AdminListEventDirectoryCallablePayload
): Promise<AdminListEventDirectoryCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleListEventDirectory(payload);
  }
  const callable = httpsCallable<
    AdminListEventDirectoryCallablePayload,
    AdminListEventDirectoryCallableResponse
  >(functions, "adminListEventDirectory");
  return (await callable(payload)).data;
}

export async function getOrganizerOverview(
  payload: AdminGetOrganizerOverviewCallablePayload
): Promise<AdminGetOrganizerOverviewCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleGetOrganizerOverview(payload);
  }
  const callable = httpsCallable<
    AdminGetOrganizerOverviewCallablePayload,
    AdminGetOrganizerOverviewCallableResponse
  >(functions, "adminGetOrganizerOverview");
  return (await callable(payload)).data;
}

// Support inbox: conversations, replies and saved replies.

export async function listSupportConversations(
  payload: AdminListSupportConversationsCallablePayload
): Promise<AdminListSupportConversationsCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleListSupportConversations(payload);
  }
  const callable = httpsCallable<
    AdminListSupportConversationsCallablePayload,
    AdminListSupportConversationsCallableResponse
  >(functions, "adminListSupportConversations");
  return (await callable(payload)).data;
}

export async function getSupportConversation(
  payload: AdminGetSupportConversationCallablePayload
): Promise<AdminGetSupportConversationCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleGetSupportConversation(payload);
  }
  const callable = httpsCallable<
    AdminGetSupportConversationCallablePayload,
    AdminGetSupportConversationCallableResponse
  >(functions, "adminGetSupportConversation");
  return (await callable(payload)).data;
}

export async function updateSupportConversation(
  payload: AdminUpdateSupportConversationCallablePayload
): Promise<AdminUpdateSupportConversationCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleUpdateSupportConversation(payload);
  }
  const callable = httpsCallable<
    AdminUpdateSupportConversationCallablePayload,
    AdminUpdateSupportConversationCallableResponse
  >(functions, "adminUpdateSupportConversation");
  return (await callable(payload)).data;
}

export async function recordSupportMessage(
  payload: AdminRecordSupportMessageCallablePayload
): Promise<AdminRecordSupportMessageCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleRecordSupportMessage(payload);
  }
  const callable = httpsCallable<
    AdminRecordSupportMessageCallablePayload,
    AdminRecordSupportMessageCallableResponse
  >(functions, "adminRecordSupportMessage");
  return (await callable(payload)).data;
}

export async function listSupportSavedReplies():
  Promise<AdminListSupportSavedRepliesCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleListSupportSavedReplies();
  }
  const callable = httpsCallable<
    AdminListSupportSavedRepliesCallablePayload,
    AdminListSupportSavedRepliesCallableResponse
  >(functions, "adminListSupportSavedReplies");
  return (await callable({})).data;
}

export async function upsertSupportSavedReply(
  payload: AdminUpsertSupportSavedReplyCallablePayload
): Promise<AdminUpsertSupportSavedReplyCallableResponse> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return (await import("./sampleSupport")).sampleUpsertSupportSavedReply(payload);
  }
  const callable = httpsCallable<
    AdminUpsertSupportSavedReplyCallablePayload,
    AdminUpsertSupportSavedReplyCallableResponse
  >(functions, "adminUpsertSupportSavedReply");
  return (await callable(payload)).data;
}
