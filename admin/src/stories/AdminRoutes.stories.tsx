import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {
  sampleAdminActionExecutionRows,
  sampleHostAnalytics,
  sampleOverview,
} from "../shared/api/sampleData";
import type {
  AccessReviewController,
  AccessReviewFormState,
} from "../features/safety/controllers/useAccessReviewController";
import {
  buildAdminRoleScopeContract,
  type AdminRoleAssignmentStatusFilter,
  type AdminRoleManagementController,
} from "../features/admin-roles/controllers/useAdminRoleManagementController";
import {AdminRoleManagementWorkspace} from "../features/admin-roles/ui/AdminRoleManagementScreen";
import {adminRolePolicyList} from "../features/admin-roles/controllers/adminRolePolicies";
import type {AdminActionExecutionsController} from
  "../features/operations/controllers/useAdminActionExecutionsController";
import {AdminActionExecutionsWorkspace} from
  "../features/operations/ui/AdminActionExecutionsScreen";
import type {
  DataQualityController,
  DataQualityRow,
  DataQualitySeverity,
} from "../features/data-quality/controllers/useDataQualityController";
import {DataQualityWorkspace} from "../features/data-quality/ui/DataQualityScreen";
import {
  sampleEventDetails,
  sampleExternalEventRows,
  sampleOrganizerDetails,
} from "../shared/api/sampleData";
import type {EventPublishingController} from "../features/events/controllers/useEventPublishingController";
import {formFromEventProfile} from "../features/events/controllers/eventPublishingHelpers";
import {EventPublishingWorkspace} from "../features/events/ui/EventPublishingScreen";
import {
  sampleEventIntakeBridge,
  sampleMarketingOpsBridge,
} from "../shared/api/sampleOperationalData";
import type {EventIntakeController} from "../features/intake/events/controllers/useEventIntakeController";
import {EventIntakePreviewWorkspace} from "../features/intake/events/ui/EventIntakeWorkspace";
import type {IntakeOperationsController} from "../features/intake/operations/controllers/useIntakeOperationsController";
import {IntakeOperationsPreviewWorkspace} from "../features/intake/operations/ui/IntakeOperationsWorkspace";
import {organizerWorkbenchFromOperations} from
  "../features/intake/organizer/controllers/loadOrganizerIntakeBridge";
import type {OrganizerIntakeController} from "../features/intake/organizer/controllers/useOrganizerIntakeController";
import {OrganizerIntakeWorkspace} from "../features/intake/organizer/ui/OrganizerIntakeScreen";
import {IntakeWorkspace} from "../features/intake/ui/IntakeWorkspaceScreen";
import {sampleIntakeOperations} from "../shared/operations/sampleIntakeOperations";
import {
  buildFinanceIssueReview,
  type FinanceIssueKind,
  type FinanceIssueRow,
  type FinanceOpsController,
} from "../features/finance/controllers/useFinanceOpsController";
import {FinanceOpsWorkspace} from "../features/finance/ui/FinanceOpsScreen";
import type {MarketingOpsController} from "../features/marketing/controllers/useMarketingOpsController";
import {MarketingOpsWorkspace} from "../features/marketing/ui/MarketingOpsScreen";
import {
  filterOrganizerRows,
  type OrganizerPublishingController,
} from "../features/organizers/controllers/useOrganizerPublishingController";
import {
  completePublishChecklist,
  diffOrganizerProfile,
  emptyPublishChecklist,
  formFromOrganizerProfile,
  validateOrganizerPublishingForm,
} from "../features/organizers/controllers/organizerPublishingHelpers";
import {OrganizerPublishingWorkspace} from "../features/organizers/ui/OrganizerPublishingScreen";
import type {
  GrowthKpiController,
  GrowthRangePreset,
  GrowthSignalRow,
  GrowthStage,
} from "../features/growth/controllers/useGrowthKpiController";
import {GrowthKpiWorkspace} from "../features/growth/ui/GrowthKpiScreen";
import {
  type MarketplaceAnalyticsGranularity,
  type MarketplaceAnalyticsRangePreset,
  MarketplaceScreen,
} from "../features/marketplace/ui/MarketplaceScreen";
import {buildNowModel} from "../features/now/controllers/useNowController";
import {NowScreen} from "../features/now/ui/NowScreen";
import {activityRow, healthRows} from "../features/system/controllers/useSystemController";
import {SystemScreen} from "../features/system/ui/SystemScreen";
import type {SafetyTriageController} from "../features/safety/controllers/useSafetyTriageController";
import {SafetyScreen} from "../features/safety/ui/SafetyScreen";
import {SafetyActionSheetWorkspace} from "../features/safety/ui/SafetyActionSheetWorkspace";
import type {AccountSafetyController} from "../features/safety/controllers/useAccountSafetyController";
import type {SafetyActionSheetController} from "../features/safety/controllers/useSafetyActionSheetController";
import {
  type AccessApplicationDecision,
  type AdminOrganizerDetails,
  type AdminOrganizerListRow,
  type AdminEventDetails,
  type AdminEventListRow,
  type AdminAccessApplicationDetails,
  type AdminQueueItem,
  type EventIntakeBridge,
  type EventIntakeCandidate,
  type EventIntakeSourceProfile,
  type EventIntakeSourceResult,
  type AdminRoleAssignmentRow,
  type AdminRoleClaim,
  type AdminUserRoleRecord,
  type HostAnalyticsTrendPoint,
} from "../shared/types/adminTypes";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";

const overview = sampleOverview;
const hostAnalytics = sampleHostAnalytics;
const actionExecutionRows = sampleAdminActionExecutionRows;
const actionExecutionsController: AdminActionExecutionsController = {
  actionFilter: "all",
  generatedAt: "2026-07-23T08:30:00.000Z",
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  query: "",
  rows: actionExecutionRows,
  statusFilter: "all",
  visibleRows: actionExecutionRows,
  loadMore: async () => false,
  refresh: async () => true,
  setActionFilter: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  setStatusFilter: (_value) => {
    noop();
  },
};
const eventRows: AdminEventListRow[] =
  Object.values(sampleEventDetails).map(eventListRowFromDetails);
const externalEventRows = sampleExternalEventRows;
const selectedExternalEvent = externalEventRows[1] ?? externalEventRows[0] ?? null;
const eventController: EventPublishingController = {
  backToList: () => {
    noop();
  },
  diffRows: [],
  event: sampleEventDetails["mumbai-padel-mixer-1"] ?? null,
  eventId: "mumbai-padel-mixer-1",
  externalFilter: "reviewOpen",
  externalListGeneratedAt: "2026-07-03T09:58:00.000Z",
  externalQuery: "",
  externalRows: externalEventRows,
  filter: "launchCities",
  filteredExternalRows: externalEventRows,
  filteredRows: eventRows,
  form: sampleEventDetails["mumbai-padel-mixer-1"] ?
    formFromEventProfile(sampleEventDetails["mumbai-padel-mixer-1"]) :
    null,
  isDetailLoading: false,
  isExternalDetailError: false,
  isExternalListLoading: false,
  isListLoading: false,
  isSaving: false,
  isTakingDownExternalEvent: false,
  listGeneratedAt: "2026-07-03T09:55:00.000Z",
  openExternalSupply: () => {
    noop();
  },
  query: "",
  refreshExternalList: async () => {
    noop();
    return true;
  },
  refreshList: async () => {
    noop();
    return true;
  },
  rows: eventRows,
  save: async () => {
    noop();
    return true;
  },
  selectEvent: (_eventId) => {
    noop();
  },
  selectExternalEvent: (_value) => {
    noop();
  },
  selectedExternalEvent,
  selectedExternalEventId: selectedExternalEvent?.eventId ?? null,
  setEventId: (_value) => {
    noop();
  },
  setExternalFilter: (_value) => {
    noop();
  },
  setExternalQuery: (_value) => {
    noop();
  },
  setFilter: (_value) => {
    noop();
  },
  setForm: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  takedownExternalEvent: async (_request) => {
    noop();
    return false;
  },
  validationIssues: [],
  view: "list",
};
const eventIntakeBridge =
  structuredClone(sampleEventIntakeBridge) as EventIntakeBridge;
const eventIntakeController: EventIntakeController = {
  bridge: eventIntakeBridge,
  errorMessage: null,
  inFlight: {},
  isError: false,
  isLoading: false,
  isRefreshing: false,
  loadBridge: async () => {
    noop();
    return true;
  },
  localDecisions: {},
  notes: {},
  snapshotVersion: 0,
  setNote: (_key: string, _value: string) => {
    noop();
  },
  sourceResultById: new Map(
    eventIntakeBridge.sourceResults.map((result) => [result.id, result])
  ),
  targetDecision: async (_input) => {
    noop();
    return true;
  },
  updateCandidate: (
    _candidateId: string,
    _patch: Partial<EventIntakeCandidate>
  ) => {
    noop();
  },
  updateSource: (
    _sourceId: string,
    _patch: Partial<EventIntakeSourceProfile>
  ) => {
    noop();
  },
  updateSourceResult: (
    _resultId: string,
    _patch: Partial<EventIntakeSourceResult>
  ) => {
    noop();
  },
};
const intakeOperationsController: IntakeOperationsController = {
  data: sampleIntakeOperations(),
  errorMessage: null,
  isError: false,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  loadMore: async () => false,
  refresh: async () => true,
};
const organizerSampleOperations = sampleIntakeOperations({
  entityKind: "organizer",
});
const organizerPreviewWorkItems = Array.from({length: 30}, (_, index) => {
  const base = structuredClone(
    organizerSampleOperations.workItems[
      index % organizerSampleOperations.workItems.length
    ]
  );
  const candidateId = `preview-organizer-${index + 1}`;
  const intake = base.normalizedPayload.intake as Record<string, unknown>;
  const candidate = intake.candidate as Record<string, unknown>;
  candidate.candidateId = candidateId;
  candidate.resultId = candidateId;
  candidate.rank = index + 1;
  candidate.title = index === 9 ? "Courtside" :
    `Organizer candidate ${index + 1}`;
  candidate.canonicalUrl = `https://${candidateId}.example/`;
  candidate.url = candidate.canonicalUrl;
  candidate.normalizedKey = `domain:${candidateId}.example`;
  candidate.existingEntityMatches = [];
  candidate.reviewContext = {
    recordStatus: "reviewed",
    existingInventory: false,
    formats: ["Social events"],
    sources: ["officialWebsite"],
    eventSignal: "Recent public event signal captured.",
    reviewNotes: "Reviewed source-backed organizer candidate.",
    verifiedAt: "2026-07-24",
  };
  base.workItemId = `work-${candidateId}`;
  base.externalKey = candidateId;
  return base;
});
const organizerIntakeBridge = organizerWorkbenchFromOperations(
  organizerSampleOperations,
  organizerPreviewWorkItems
);
const organizerIntakeController: OrganizerIntakeController = {
  availability: {
    searchCandidates: true,
    publicationPackets: false,
    canonicalItems: false,
    discoveryCandidateCount: organizerPreviewWorkItems.length,
    runIds: organizerSampleOperations.runs.map((run) => run.runId),
  },
  bridge: organizerIntakeBridge,
  source: "sample",
  curationForms: {},
  curationInFlight: {},
  decisionInFlight: {},
  decisionNotes: {},
  handleAttachCandidate: async (_candidate) => {
    noop();
    return true;
  },
  handleCreateOrganizerDraft: async (_candidate) => {
    noop();
  },
  handleDecision: async (_item, _decision) => {
    noop();
    return true;
  },
  handleItemCuration: async (_item, _form) => {
    noop();
  },
  handleOpenOrganizerDraft: (_organizerId) => {
    noop();
  },
  handleRetrySalesLink: async (_candidate) => false,
  handlePendingInputDecision: async (_input, _decision) => {
    noop();
  },
  handlePolicyGapDecision: async (_gap, _decision) => {
    noop();
  },
  localCuration: {},
  localDecisions: {},
  localOrganizerDrafts: {},
  localSalesLinks: {},
  localPolicyDecisions: {},
  manualReportAcknowledgements: {},
  organizerDraftForms: {},
  organizerDraftInFlight: {},
  salesLinkInFlight: {},
  selectedMatchByCandidate: {},
  policyDecisionInFlight: {},
  policyDecisionNotes: {},
  publicationPacketByEntity: new Map(
    organizerIntakeBridge.publicationReviewPackets.packets.map((packet) => [
      packet.entityId,
      packet,
    ])
  ),
  surfaceChecklists: {},
  visibilityForms: {},
  setCurationForms: (_value) => {
    noop();
  },
  setDecisionNotes: (_value) => {
    noop();
  },
  setManualReportAcknowledgements: (_value) => {
    noop();
  },
  setOrganizerDraftForms: (_value) => {
    noop();
  },
  setSelectedMatchByCandidate: (_value) => {
    noop();
  },
  setPolicyDecisionNotes: (_value) => {
    noop();
  },
  setSurfaceChecklists: (_value) => {
    noop();
  },
  setVisibilityForms: (_value) => {
    noop();
  },
};
const organizerIntakePreviewNowMs = Date.parse("2026-07-27T12:00:00.000Z");
const marketingOpsBridge =
  structuredClone(sampleMarketingOpsBridge) as MarketingOpsController["bridge"];
const marketingOpsSelectedDraft =
  marketingOpsBridge?.contentDrafts[0] ?? null;
const marketingOpsController: MarketingOpsController = {
  activeTab: "posts",
  bridge: marketingOpsBridge,
  bridgeError: null,
  bridgeGeneratedAt: marketingOpsBridge?.generatedAt ?? null,
  bridgeIsStale: false,
  composerStep: 0,
  createDraft: async (_draftType) => {
    noop();
  },
  discardSelectedDraftEdits: () => {
    noop();
  },
  hasUnsavedChanges: false,
  inFlight: {},
  isLoading: false,
  loadBridge: async () => {
    noop();
    return true;
  },
  localDecisions: {},
  notes: {},
  reviewReceiptRecorded: false,
  rightsConfirmed: false,
  savedBridge: marketingOpsBridge,
  selectedDraft: marketingOpsSelectedDraft,
  selectedDraftDirty: false,
  selectedDraftId: marketingOpsSelectedDraft?.id ?? null,
  selectedDraftUnavailable: false,
  selectedEditSize: marketingOpsSelectedDraft ?
    JSON.stringify(marketingOpsSelectedDraft).length : 0,
  selectedEditTooLarge: false,
  setActiveTab: (_value) => {
    noop();
  },
  setComposerStep: (_value) => {
    noop();
  },
  setNote: (_key: string, _value: string) => {
    noop();
  },
  setRightsConfirmed: (_value: boolean) => {
    noop();
  },
  setTypeFilter: (_value) => {
    noop();
  },
  targetDecision: async (_input) => {
    noop();
  },
  typeFilter: "all",
  updateDraft: (_draftId, _patch) => {
    noop();
  },
  updateDraftSlide: (_draftId, _slideId, _patch) => {
    noop();
  },
  updateRecommendationItem: (_setId, _itemId, _patch) => {
    noop();
  },
  openDraft: (_draftId: string) => {
    noop();
  },
};
const organizerPublishingRows: AdminOrganizerListRow[] =
  Object.values(sampleOrganizerDetails).map(organizerListRowFromDetails);
const organizerPublishingOrganizer = sampleOrganizerDetails.afterfly ?? null;
const organizerPublishingForm = organizerPublishingOrganizer ?
  formFromOrganizerProfile(organizerPublishingOrganizer) :
  null;
const organizerPublishingDiffRows = diffOrganizerProfile(
  organizerPublishingOrganizer,
  organizerPublishingForm
);
const organizerPublishingController: OrganizerPublishingController = {
  backToList: () => {
    noop();
  },
  checklist: emptyPublishChecklist,
  organizer: organizerPublishingOrganizer,
  organizerId: organizerPublishingOrganizer?.organizerId ?? "",
  completeChecklist: false,
  diffRows: organizerPublishingDiffRows,
  filter: "launchCities",
  filteredRows: filterOrganizerRows(organizerPublishingRows, "launchCities"),
  form: organizerPublishingForm,
  isDetailLoading: false,
  isListLoading: false,
  isPublishing: false,
  isSaving: false,
  listGeneratedAt: "2026-07-03T10:08:00.000Z",
  publishingIssues: validateOrganizerPublishingForm(
    organizerPublishingForm,
    {publishing: true, requireReviewNote: true}
  ),
  query: "",
  refreshList: async () => {
    noop();
  },
  rows: organizerPublishingRows,
  save: async () => {
    noop();
    return true;
  },
  saveAndPublish: async () => {
    noop();
  },
  selectOrganizer: (_organizerId) => {
    noop();
  },
  setChecklist: (_value) => {
    noop();
  },
  setOrganizerId: (_value) => {
    noop();
  },
  setFilter: (_value) => {
    noop();
  },
  setForm: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  validationIssues: validateOrganizerPublishingForm(
    organizerPublishingForm,
    {requireReviewNote: organizerPublishingDiffRows.length > 0}
  ),
  view: "list",
};
const safetyRows: SafetyTriageController["rows"] = [
  ...overview.queues.safetyReports.map((row) => ({
    ...row,
    queueKind: "reports" as const,
    queueLabel: "User reports",
  })),
  ...overview.queues.moderationFlags.map((row) => ({
    ...row,
    queueKind: "moderation" as const,
    queueLabel: "Moderation flags",
  })),
  ...overview.queues.eventSafetyReports.map((row) => ({
    ...row,
    queueKind: "event" as const,
    queueLabel: "Event reports",
  })),
];
const safetySelected = safetyRows[0] ?? null;
const safetySelectedDetail: NonNullable<SafetyTriageController["selectedDetail"]> = {
  assignment: {
    assigneeUid: "safety-reviewer",
    ownerTeam: "Trust and safety",
    queue: "reports",
    severity: "high",
  },
  organizerId: null,
  contextId: "local-preview/context",
  createdAt: safetySelected?.createdAt ?? null,
  eventId: null,
  evidence: [
    {
      label: "Report detail",
      sensitive: true,
      sourcePath: safetySelected?.targetPath ?? null,
      value: safetySelected?.detail ?? "target user_829 - chat",
    },
    {
      label: "Channel",
      sensitive: false,
      sourcePath: "chats/chat-829",
      value: "chat",
    },
  ],
  fields: [
    {label: "Queue item", value: safetySelected?.title ?? "harassment"},
    {label: "Target path", value: safetySelected?.targetPath ?? "reports/report-1"},
    {label: "Status", value: safetySelected?.status ?? "open"},
  ],
  kind: "report",
  nextActions: [
    "Open the source document before resolving.",
    "Confirm reporter, subject, event, and channel context.",
    "Use audited safety mutations only after the policy outcome is explicit.",
  ],
  outcomeGuidance: [
    {
      actionStatus: "manual",
      detail: "Escalation and restriction actions are intentionally outside this workspace until their audited callables exist.",
      id: "manual-escalation",
      label: "Escalate after policy review",
      severity: "warning",
    },
  ],
  primaryUserId: "user_829",
  priorHistory: [
    {
      count: 2,
      id: "prior-chat-reports",
      label: "Prior chat reports",
      sampleTargetPaths: ["reports/report-archive-1", "reports/report-archive-2"],
    },
  ],
  secondaryUserId: null,
  sla: {
    dueAt: "2026-06-01T11:44:00.000Z",
    policy: "High severity reports require same-day review.",
    state: "due_soon",
  },
  source: "chat",
  status: safetySelected?.status ?? "open",
  summary: safetySelected?.detail ?? "target user_829 - chat",
  targetPath: safetySelected?.targetPath ?? "reports/report-1",
  title: safetySelected?.title ?? "harassment",
  updatedAt: null,
};
const safetyController: SafetyTriageController = {
  assignmentForm: {
    assigneeUid: "safety-reviewer",
    note: "Assigning same-day high-severity report review.",
  },
  assignmentInFlight: false,
  assignmentValidationIssue: null,
  decisionForm: {
    note: "Reviewed evidence preview and confirmed this requires manual policy follow-up.",
  },
  decisionInFlight: null,
  decisionValidationIssue: null,
  filteredRows: safetyRows,
  generatedAt: overview.generatedAt,
  isDetailLoading: false,
  isLoading: false,
  metrics: {
    eventReports: overview.metrics.find((metric) =>
      metric.id === "eventSafetyReports")?.value ?? 0,
    moderation: overview.metrics.find((metric) =>
      metric.id === "pendingModerationFlags")?.value ?? 0,
    reports: overview.metrics.find((metric) =>
      metric.id === "openReports")?.value ?? 0,
  },
  query: "",
  queueFilter: "all",
  rows: safetyRows,
  selected: safetySelected,
  selectedDetail: safetySelectedDetail,
  assign: async () => {
    noop();
    return true;
  },
  decide: async (_decision) => {
    noop();
    return true;
  },
  refresh: async () => {
    noop();
    return true;
  },
  select: (_row) => {
    noop();
  },
  setAssignmentForm: (_value) => {
    noop();
  },
  setDecisionForm: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  setQueueFilter: (_value) => {
    noop();
  },
};
const accessRows: AdminQueueItem[] = [
  {
    id: "access-priya",
    title: "Priya Sharma",
    detail: "Indore founder · supper club host · referral overlap",
    status: "pending",
    createdAt: "2026-07-03T07:30:00.000Z",
    targetPath: "accessApplications/access-priya",
  },
  {
    id: "access-rahul",
    title: "Rahul Jain",
    detail: "Mumbai member application · invite code pending",
    status: "pending",
    createdAt: "2026-07-03T06:10:00.000Z",
    targetPath: "accessApplications/access-rahul",
  },
];
const accessSelected = accessRows[0] ?? null;
const accessForm: AccessReviewFormState = {
  cohortId: "indore-founders",
  note: "Verified launch-city host fit and checked deterministic overlap signals.",
};
const accessSelectedDetails: AdminAccessApplicationDetails = {
  availabilityWindows: ["thursday_evening", "weekend"],
  city: "Indore",
  cohortId: null,
  createdAt: "2026-07-03T07:25:00.000Z",
  duplicateSignals: [
    {
      count: 2,
      id: "instagram-handle-overlap",
      label: "Instagram handle overlap",
      sampleTargetPaths: [
        "accessApplications/access-priya-old",
        "users/user-priya",
      ],
      value: "@priya_hosts",
    },
  ],
  eventTypes: ["supper_club", "singles_mixer"],
  hostUserId: null,
  instagramHandle: "@priya_hosts",
  inviteCode: "INDOREFOUNDERS",
  referralSource: "Founding organizer referral",
  reviewedAt: null,
  reviewerUid: null,
  reviewNote: null,
  role: "Host",
  status: "pending",
  submissionCount: 2,
  submittedAt: "2026-07-03T07:30:00.000Z",
  targetPath: "accessApplications/access-priya",
  uid: "access-priya",
  updatedAt: "2026-07-03T07:30:00.000Z",
  wantsToHost: true,
  whyCatch: "Wants to host smaller, curated dinners for verified singles.",
};
const accessController: AccessReviewController = {
  decisionInFlight: null,
  detailError: null,
  filteredRows: accessRows,
  form: accessForm,
  generatedAt: "2026-07-03T08:00:00.000Z",
  isDetailLoading: false,
  isLoading: false,
  pendingTotal: 41,
  query: "",
  rows: accessRows,
  selected: accessSelected,
  selectedApplicationUid: null,
  selectedDetails: accessSelectedDetails,
  selectedUnavailable: false,
  validationIssue: null,
  decide: async (_decision: AccessApplicationDecision) => {
    noop();
    return true;
  },
  refresh: async () => {
    noop();
  },
  refreshDetail: async () => {
    noop();
  },
  select: (_row: AdminQueueItem) => {
    noop();
  },
  setForm: (_form: AccessReviewFormState) => {
    noop();
  },
  setQuery: (_query: string) => {
    noop();
  },
};
const adminRoleSelectedUser: AdminUserRoleRecord = {
  assignmentPath: "adminRoleAssignments/admin-owner",
  disabled: false,
  displayName: "Catch Admin Owner",
  email: "owner@catch.local",
  roles: ["adminOwner"],
  targetUid: "admin-owner",
};
const adminRoleAssignmentRows: AdminRoleAssignmentRow[] = [
  {
    ...adminRoleSelectedUser,
    status: "active",
    updatedAt: "2026-07-03T09:50:00.000Z",
    updatedByUid: "admin-owner",
  },
  {
    assignmentPath: "adminRoleAssignments/support-ops",
    disabled: false,
    displayName: "Support Ops",
    email: "support@catch.local",
    roles: ["support", "salesStaff"],
    status: "active",
    targetUid: "support-ops",
    updatedAt: "2026-07-03T08:15:00.000Z",
    updatedByUid: "admin-owner",
  },
];
const adminRoleController: AdminRoleManagementController = {
  assignmentFilter: "active",
  assignmentGeneratedAt: "2026-07-03T09:55:00.000Z",
  assignmentRows: adminRoleAssignmentRows,
  assignmentVisibleRows: adminRoleAssignmentRows,
  assignmentQuery: "",
  assignmentCapped: false,
  highRiskConfirmed: false,
  hasHighRiskChange: false,
  isAssignmentListLoading: false,
  isLoading: false,
  isSaving: false,
  note: "",
  roleDiff: {added: [], removed: []},
  rolePolicies: adminRolePolicyList,
  saveReceipt: null,
  refreshAssignments: async () => {
    noop();
  },
  selectedRoles: ["adminOwner"],
  selectedTargetUid: "admin-owner",
  selectedUnavailable: false,
  selectedUser: adminRoleSelectedUser,
  scopeContract: buildAdminRoleScopeContract("admin-owner", "admin-owner"),
  targetUid: "admin-owner",
  validationIssue: "Change at least one admin role before saving.",
  load: async (_nextTargetUid?: string) => {
    noop();
    return true;
  },
  save: async () => {
    noop();
    return false;
  },
  selectAssignment: (_row: AdminRoleAssignmentRow) => {
    noop();
  },
  setAssignmentFilter: (_value: AdminRoleAssignmentStatusFilter) => {
    noop();
  },
  setAssignmentQuery: (_value: string) => {
    noop();
  },
  setHighRiskConfirmed: (_value: boolean) => {
    noop();
  },
  setNote: (_value: string) => {
    noop();
  },
  setTargetUid: (_value: string) => {
    noop();
  },
  toggleRole: (_role: AdminRoleClaim, _checked: boolean) => {
    noop();
  },
};
const dataQualityRows: DataQualityRow[] = [
  {
    id: "overview-club-claims",
    sourceId: "overview",
    source: "Overview",
    category: "Platform signal",
    label: "Organizer claim queue",
    state: "blocked",
    severity: "blocked",
    detail: "3 organizer claims need canonical owner validation before publication.",
    stateDefinition: "State is provided by the admin overview read model.",
    owner: "Admin ops",
    runbook: "admin > Organizers > Claim review",
    nextAction: "Resolve claim identity conflicts before enabling public claim CTAs.",
    updatedAt: "2026-07-03T08:30:00.000Z",
    freshness: "current",
    timestampLabel: "Current by 7-day heuristic",
    owningWorkflowPath: "/organizers/claims",
  },
  {
    id: "host-analytics-booking-window",
    sourceId: "host-analytics",
    source: "Host analytics",
    category: "Analytics signal",
    label: "Booking attribution",
    state: "warning",
    severity: "warning",
    detail: "Analytics range uses a generated local-preview bridge older than the current launch week.",
    stateDefinition: "State is provided by the fixed 30-day host analytics read.",
    owner: "Growth ops",
    runbook: "admin > Growth > Host analytics",
    nextAction: "Regenerate the host analytics bridge before launch reporting.",
    updatedAt: "2026-07-02T12:00:00.000Z",
    freshness: "stale",
    timestampLabel: "Stale heuristic (>7 days)",
    owningWorkflowPath: "/growth",
  },
  {
    id: "generated-marketing-bridge",
    sourceId: "marketing-bridge",
    source: "Marketing bridge",
    category: "Source freshness",
    label: "Marketing ops bridge",
    state: "ok",
    severity: "healthy",
    detail: "Generated today for Indore launch week content packaging.",
    stateDefinition: "Stale is a client heuristic when generatedAt is more than 7 days old.",
    owner: "Marketing ops",
    runbook: "marketingOpsDashboards/current",
    nextAction: "No action; generated bridge is fresh enough for the launch workspace.",
    updatedAt: "2026-07-03T09:15:00.000Z",
    freshness: "current",
    timestampLabel: "Current by 7-day heuristic",
    owningWorkflowPath: "/marketing",
  },
];
const dataQualityController: DataQualityController = {
  failedSources: [],
  filteredRows: dataQualityRows,
  isLoading: false,
  isPartial: false,
  isUnavailable: false,
  metrics: dataQualityMetrics(dataQualityRows),
  ownerFilter: "all",
  ownerOptions: ["Admin ops", "Growth ops", "Marketing ops"],
  query: "",
  rows: dataQualityRows,
  selected: null,
  selectedSignalId: null,
  selectedUnavailable: false,
  severityFilter: "all",
  sourceHealth: [
    "overview",
    "host-analytics",
    "marketing-bridge",
    "event-intake",
  ].map((sourceId) => ({
    sourceId: sourceId as DataQualityRow["sourceId"],
    label: sourceId.replaceAll("-", " "),
    loadState: "loaded" as const,
    freshness: "current" as const,
    configuration: sourceId.includes("bridge") || sourceId === "event-intake" ?
      "configured" as const : "not_applicable" as const,
    generatedAt: "2026-07-03T09:30:00.000Z",
    loadedAt: "2026-07-03T09:30:05.000Z",
    error: null,
    hasCachedData: true,
  })),
  refresh: async () => {
    noop();
    return true;
  },
  retrySource: async () => true,
  select: (_row: DataQualityRow) => {
    noop();
  },
  setOwnerFilter: (_value: string) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
  setSeverityFilter: (_value: DataQualitySeverity) => {
    noop();
  },
};
const growthRows: GrowthSignalRow[] = [
  {
    id: "signupsThisWeek",
    stage: "acquisition",
    label: "Signups this week",
    value: 142,
    unit: "count",
    status: "ready",
    source: "adminGetOverview",
    sourceGeneratedAt: "2026-07-03T09:30:00.000Z",
    metricBasis: "Current calendar-week overview total.",
    range: "Current / overview-defined",
    timezone: "UTC",
    detail: "Launch demand created this week across Indore and Mumbai.",
  },
  {
    id: "pendingOrganizerClaims",
    stage: "supply",
    label: "Pending club claims",
    value: 9,
    unit: "count",
    status: "partial",
    source: "adminGetOverview",
    sourceGeneratedAt: "2026-07-03T09:30:00.000Z",
    metricBasis: "Current organizer-claim stock.",
    range: "Current / overview-defined",
    timezone: "UTC",
    detail: "Organizer claim demand waiting for review before publication.",
  },
  {
    id: "bookings",
    stage: "conversion",
    label: "Bookings",
    value: 74,
    unit: "count",
    status: "ready",
    source: "adminGetHostAnalytics",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range host analytics summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Bookings confirmed by host analytics summary cards.",
  },
  {
    id: "checkoutConversionRate",
    stage: "conversion",
    label: "Checkout conversion rate",
    value: 38,
    unit: "percent",
    status: "partial",
    source: "adminGetHostAnalytics",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range host analytics summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Conversion is usable for launch review but not yet channel-attributed.",
  },
  {
    id: "claimClicks",
    stage: "marketplace",
    label: "Claim clicks",
    value: 21,
    unit: "count",
    status: "ready",
    source: "adminGetHostAnalytics.discoverySummary",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range discovery summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Organizer claim intent captured from public pages.",
  },
];
const growthTrend: HostAnalyticsTrendPoint[] = [
  {
    periodStart: "2026-06-20",
    periodEnd: "2026-06-26",
    metrics: {
      bookings: 25,
      checkedIn: 18,
      checkoutDropoff: 7,
      demand: 84,
      reviews: 12,
    },
  },
  {
    periodStart: "2026-06-27",
    periodEnd: "2026-07-03",
    metrics: {
      bookings: 49,
      checkedIn: 37,
      checkoutDropoff: 9,
      demand: 116,
      reviews: 19,
    },
  },
];
const growthController: GrowthKpiController = {
  filteredRows: growthRows,
  hostAnalyticsError: null,
  hostAnalyticsGeneratedAt: "2026-07-03T09:35:00.000Z",
  isHostAnalyticsLoading: false,
  isLoading: false,
  isOverviewLoading: false,
  loadedAt: "2026-07-03T09:40:00.000Z",
  metrics: growthMetrics(growthRows),
  overviewError: null,
  overviewGeneratedAt: "2026-07-03T09:30:00.000Z",
  query: "",
  rangePreset: "30d",
  rows: growthRows,
  selected: growthRows[1] ?? null,
  selectedSignalId: null,
  stageFilter: "all",
  trend: growthTrend,
  refresh: async () => {
    noop();
    return true;
  },
  refreshHostAnalytics: async () => {
    noop();
    return true;
  },
  refreshOverview: async () => {
    noop();
    return true;
  },
  select: (_row: GrowthSignalRow) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
  setRangePreset: (_value: GrowthRangePreset) => {
    noop();
  },
  setStageFilter: (_value: GrowthStage) => {
    noop();
  },
};
const financeRows: FinanceIssueRow[] = [
  {
    id: "payment-refundfailed-pune-1",
    kind: "payment",
    title: "Manual refund needed",
    detail: "Refund failed for a charged booking after event cancellation.",
    status: "refundFailed",
    targetPath: "payments/pay_manual_refund_1",
    createdAt: "2026-07-03T06:20:00.000Z",
    amountMinor: 250000,
    currency: "INR",
    severity: "high",
    nextAction: "Open the provider record before retry, refund, or manual follow-up.",
    sourceScope: "Current capped overview payment preview",
    amountEvidence: "inferred",
    providerEvidence: "inferred",
  },
  {
    id: "event-mumbai-padel-payments",
    kind: "event",
    title: "Mumbai padel mixer payments",
    detail: "2 failed, 1 refunded, 6 checkout drop-off.",
    status: "failed",
    targetPath: "events/mumbai-padel-mixer-1",
    createdAt: "2026-07-05T13:30:00.000Z",
    amountMinor: 1840000,
    currency: "INR",
    severity: "high",
    nextAction: "Use event and provider records to reconcile payment state before action.",
    sourceScope: "30-day host event analytics",
    amountEvidence: "source",
    providerEvidence: "unknown",
  },
  {
    id: "payout-restricted-hosts",
    kind: "payout",
    title: "Payout restricted hosts",
    detail: "3 host accounts need provider review.",
    status: "restricted",
    targetPath: "metrics/payoutRestrictedHosts",
    createdAt: "2026-07-03T09:45:00.000Z",
    amountMinor: null,
    currency: "INR",
    severity: "medium",
    nextAction: "Inspect provider authority before changing payout or settlement state.",
    sourceScope: "Current overview aggregate",
    amountEvidence: "unknown",
    providerEvidence: "unknown",
  },
];
const selectedFinanceRow = financeRows[0] ?? null;
const financeController: FinanceOpsController = {
  filteredRows: financeRows,
  isLoading: false,
  isPartial: false,
  isUnavailable: false,
  kindFilter: "all",
  malformedCount: 0,
  metrics: {
    paymentPreviewCount: 5,
    failedPayments: 6,
    payoutRestrictedHosts: 3,
    eventIssueCount30d: 1,
  },
  query: "",
  rows: financeRows,
  selected: selectedFinanceRow,
  selectedIssueId: selectedFinanceRow?.id ?? null,
  selectedReview: selectedFinanceRow ?
    buildFinanceIssueReview(selectedFinanceRow) :
    null,
  selectedUnavailable: false,
  sources: [
    {
      id: "overview",
      label: "Overview payment preview",
      scope: "Current capped overview preview and current payout restriction metrics",
      status: "ready",
      generatedAt: "2026-07-03T09:45:00.000Z",
      loadedAt: "2026-07-03T09:45:05.000Z",
      error: null,
    },
    {
      id: "hostAnalytics",
      label: "Event payment analytics",
      scope: "30-day host analytics, weekly granularity",
      status: "ready",
      generatedAt: "2026-07-03T09:44:00.000Z",
      loadedAt: "2026-07-03T09:45:05.000Z",
      error: null,
    },
  ],
  refresh: async () => {
    noop();
    return true;
  },
  retrySource: async () => true,
  select: (_row: FinanceIssueRow) => {
    noop();
  },
  setKindFilter: (_value: FinanceIssueKind) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
};
function profilePhotoFixture(index: number): string {
  const palette = ["#efd3c4", "#d7e6df", "#d8d5ec"];
  const background = palette[index % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400"><rect width="320" height="400" fill="${background}"/><circle cx="160" cy="145" r="72" fill="#5d4650"/><path d="M55 400c8-102 55-156 105-156s97 54 105 156" fill="#8c6777"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {
  // Storybook preview only; route-state mutation is covered by app/controller tests.
};

const setGranularity = (_value: MarketplaceAnalyticsGranularity) => {
  noop();
};

const setRangePreset = (_value: MarketplaceAnalyticsRangePreset) => {
  noop();
};

function dataQualityMetrics(rows: DataQualityRow[]) {
  return {
    openIssues: rows.filter((row) => row.severity !== "healthy").length,
    blocked: rows.filter((row) => row.severity === "blocked").length,
    warnings: rows.filter((row) => row.severity === "warning").length,
    owners: new Set(rows.map((row) => row.owner)).size,
  };
}

function growthMetrics(rows: GrowthSignalRow[]) {
  const value = (id: string) => rows.find((row) => row.id === id)?.value ?? 0;
  return {
    signupsThisWeek: value("signupsThisWeek"),
    completedProfiles: value("completedProfiles"),
    bookings: value("bookings"),
    attendanceRate: value("attendanceRate"),
  };
}

function eventListRowFromDetails(event: AdminEventDetails): AdminEventListRow {
  return {
    activityKind: event.eventFormat.activityKind,
    activityLabel: event.eventFormat.label,
    availability: event.discovery.availability,
    bookedCount: event.bookedCount,
    capacityLimit: event.capacityLimit,
    citySlug: event.discovery.citySlug,
    organizerId: event.organizerId,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled,
    currency: event.currency,
    eventId: event.eventId,
    meetingPoint: event.meetingPoint,
    organizerName: event.organizerName,
    priceInPaise: event.priceInPaise,
    searchIndexStatus: event.searchIndexStatus,
    startTime: event.startTime,
    status: event.status,
    title: event.title,
  };
}

function organizerListRowFromDetails(organizer: AdminOrganizerDetails): AdminOrganizerListRow {
  return {
    appVisibility: organizer.appVisibility,
    canonicalPath: organizer.publicPage.canonicalPath,
    cityName: organizer.cityName ?? organizer.area,
    citySlug: organizer.location ?? organizer.publicPage.citySlug,
    claimState: organizer.claimState,
    organizerId: organizer.organizerId,
    countryCode: organizer.countryCode,
    organizerType: organizer.organizerType,
    publicCategoryLabel: organizer.publicCategoryLabel,
    displayCategory: organizer.displayCategory,
    indexStatus: organizer.publicPage.indexStatus,
    name: organizer.name,
    ownershipState: organizer.ownershipState,
    publishStatus: organizer.publicPage.publishStatus,
    regionName: organizer.regionName,
    robots: organizer.publicPage.robots,
    routeReservationStatus: organizer.publicPage.canonicalPath ? "reserved" : "missing",
    routeStatus: organizer.publicPage.canonicalPath ? "valid" : "missing",
    searchIndexStatus: organizer.publicPage.indexStatus === "indexed" ?
      "indexed" :
      "missing",
    sourceConfidence: organizer.provenance.sourceConfidence,
    verificationStatus: organizer.provenance.verificationStatus,
  };
}

const renderDataQualityWorkspace = () => (
  <AdminWorkspace>
    <DataQualityWorkspace controller={dataQualityController} />
  </AdminWorkspace>
);

const renderAdminActionExecutionsWorkspace = () => (
  <AdminWorkspace>
    <AdminActionExecutionsWorkspace controller={actionExecutionsController} />
  </AdminWorkspace>
);

const renderEventPublishingWorkspace = () => (
  <AdminWorkspace>
    <EventPublishingWorkspace controller={eventController} />
  </AdminWorkspace>
);

const renderEventPublishingDetail = () => (
  <AdminWorkspace>
    <EventPublishingWorkspace
      controller={{...eventController, view: "detail"}}
    />
  </AdminWorkspace>
);

const renderEventIntakeWorkspace = () => (
  <AdminWorkspace>
    <EventIntakePreviewWorkspace controller={eventIntakeController} />
  </AdminWorkspace>
);

const renderOrganizerIntakeWorkspace = () => (
  <AdminWorkspace>
    <OrganizerIntakeWorkspace
      controller={organizerIntakeController}
      nowMs={organizerIntakePreviewNowMs}
    />
  </AdminWorkspace>
);

const renderIntakeOperationsWorkspace = () => (
  <AdminWorkspace>
    <IntakeOperationsPreviewWorkspace
      controller={intakeOperationsController}
    />
  </AdminWorkspace>
);

const renderMarketingOpsWorkspace = () => (
  <AdminWorkspace>
    <MarketingOpsWorkspace controller={marketingOpsController} />
  </AdminWorkspace>
);

const renderOrganizerPublishingWorkspace = () => (
  <AdminWorkspace>
    <OrganizerPublishingWorkspace controller={organizerPublishingController} />
  </AdminWorkspace>
);

function OrganizerPublishingBlockedDraftPreview() {
  const [form, setForm] = useState(organizerPublishingForm);
  const [checklist, setChecklist] = useState(emptyPublishChecklist);
  const diffRows = diffOrganizerProfile(organizerPublishingOrganizer, form);
  const controller: OrganizerPublishingController = {
    ...organizerPublishingController,
    checklist,
    completeChecklist: completePublishChecklist(checklist),
    diffRows,
    form,
    publishingIssues: validateOrganizerPublishingForm(
      form,
      {publishing: true, requireReviewNote: true}
    ),
    setChecklist,
    setForm,
    validationIssues: validateOrganizerPublishingForm(
      form,
      {requireReviewNote: diffRows.length > 0}
    ),
    view: "detail",
  };
  return (
    <AdminWorkspace>
      <OrganizerPublishingWorkspace controller={controller} />
    </AdminWorkspace>
  );
}

const renderIntakeWorkspace = () => (
  <AdminWorkspace>
    <IntakeWorkspace
      activeWorkspace="events"
      eventsContent={<EventIntakePreviewWorkspace controller={eventIntakeController} />}
      operationsContent={<IntakeOperationsPreviewWorkspace controller={intakeOperationsController} />}
      organizersContent={(
        <OrganizerIntakeWorkspace
          controller={organizerIntakeController}
          nowMs={organizerIntakePreviewNowMs}
        />
      )}
      onWorkspaceChange={noop}
    />
  </AdminWorkspace>
);

const renderGrowthWorkspace = () => (
  <AdminWorkspace>
    <GrowthKpiWorkspace controller={growthController} />
  </AdminWorkspace>
);

const renderFinanceWorkspace = () => (
  <AdminWorkspace>
    <FinanceOpsWorkspace controller={financeController} />
  </AdminWorkspace>
);

const renderAdminRoleWorkspace = () => (
  <AdminWorkspace>
    <AdminRoleManagementWorkspace controller={adminRoleController} />
  </AdminWorkspace>
);

// Shared preview clock keeps queue ages at their reviewed capture date.
const installReviewedQueueClock = () => {
  const realNow = Date.now;
  Date.now = () => Date.parse("2026-07-14T12:00:00.000Z");
  return () => {
    Date.now = realNow;
  };
};

// Intake ages and countdowns read both Date.now() and new Date(). Pin both to
// the reviewed baseline capture (13d oldest, 2099 sample in 26655d) so
// captures do not drift as real days pass.
const installIntakeBaselineClock = () => {
  const RealDate = globalThis.Date;
  const fixedMs = RealDate.parse("2026-07-27T12:00:00.000Z");
  class BaselineDate extends RealDate {
    constructor(...args: [] | [string | number | Date]) {
      if (args.length === 0) super(fixedMs);
      else super(args[0]);
    }

    static now() {
      return fixedMs;
    }
  }
  globalThis.Date = BaselineDate as DateConstructor;
  return () => {
    globalThis.Date = RealDate;
  };
};

const storySafetyReasons: SafetyActionSheetController["reasons"] = [
  {code: "harassment", label: "Harassment", severe: false, takedown: false,
    active: true},
  {code: "unwanted_contact", label: "Unwanted contact", severe: false,
    takedown: false, active: true},
  {code: "threats", label: "Threats of violence", severe: true,
    takedown: false, active: true},
];
const storyAccountActions: AccountSafetyController["items"] = [
  {actionId: "story-vikram", uid: "user_412", displayName: "Vikram S.",
    kind: "ban", reasonCode: "unwanted_contact",
    reasonLabel: "Unwanted contact",
    messageToUser: "You kept contacting people after they asked you to stop.",
    durationDays: null, startsAtMillis: Date.parse("2026-10-12T10:00:00Z"),
    endsAtMillis: null, status: "active", decidedByUid: "sample-owner",
    decidedByRole: "owner", automatic: false, appealable: true,
    caseTargetPaths: ["reports/report-1"],
    appeal: {status: "open", text: "I only messaged to return her jacket.",
      submittedAtMillis: Date.parse("2026-10-30T11:02:00Z"),
      reviewerUid: null, decidedAtMillis: null, decisionNote: null},
    bookings: {cancelled: 1, needsOrganizer: 1, failed: 0},
    blockedSignupAttempts: 1, canReviewAppeal: true},
  {actionId: "story-arjun", uid: "user_829", displayName: "Arjun M.",
    kind: "restrict", reasonCode: "harassment", reasonLabel: "Harassment",
    messageToUser: "Two messages you sent broke our rule on harassment.",
    durationDays: 7, startsAtMillis: Date.parse("2026-11-01T09:00:00Z"),
    endsAtMillis: Date.parse("2026-11-08T09:00:00Z"), status: "active",
    decidedByUid: "sample-ops", decidedByRole: "ops", automatic: false,
    appealable: true, caseTargetPaths: [], appeal: null,
    bookings: {cancelled: 0, needsOrganizer: 0, failed: 0},
    blockedSignupAttempts: 0, canReviewAppeal: false},
];
const storyAccountSafety: AccountSafetyController = {
  view: "active", kind: "all", items: storyAccountActions,
  counts: {all: 2, warn: 0, restrict: 1, suspend: 0, ban: 1},
  selected: storyAccountActions[0], loadState: "ready", isMutating: false,
  setView: noop, setKind: noop, select: noop,
  take: async () => true, lift: async () => true, decide: async () => true,
  refresh: noop,
};
const storySheet = (open: boolean): SafetyActionSheetController => ({
  target: open ? {uid: "user_829", displayName: "Arjun M.",
    caseTargetPath: "reports/report-1", caseTitle: "Harassment in chat",
    reasonCode: "harassment"} : null,
  draft: {kind: "restrict", durationDays: 7, reasonCode: "harassment",
    messageToUser: "Something you did broke our rule on harassment. You " +
      "can't send messages or post in group chats for 7 days.",
    notifyReporter: true, appealable: true,
    note: "Two harassing messages in the Padel mixer group."},
  reasons: storySafetyReasons, error: null,
  open: noop, close: noop, setKind: noop, setDuration: noop,
  setReason: noop, setMessage: noop, setNote: noop,
  setNotifyReporter: noop, setAppealable: noop, submit: async () => true,
});

export const SafetyRouteStory: Story = {
  name: "Safety",
  beforeEach: installReviewedQueueClock,
  parameters: {
    catchComponent: {
      id: "route_safety",
      states: ["open-cases", "case-detail", "launch-access",
        "account-actions", "appeal"],
    },
  },
  render: () => (
    <SafetyScreen
      access={accessController}
      actions={storyAccountSafety}
      caseKind="all"
      job="ops"
      nowMs={Date.parse("2026-07-14T12:00:00.000Z")}
      onCaseKind={noop}
      onSelectAction={noop}
      onSelectCase={noop}
      onViewChanged={noop}
      selectedCaseKey={safetySelected?.targetPath ?? null}
      sheet={storySheet(false)}
      triage={safetyController}
      view="open"
    />
  ),
};

export const SafetyActionSheetStory: Story = {
  name: "Safety action sheet",
  parameters: {
    catchComponent: {
      id: "workspace_safety_action_sheet",
      states: ["restrict", "owner-only-steps"],
    },
  },
  render: () => (
    <SafetyActionSheetWorkspace isSaving={false} job="ops" sheet={storySheet(true)} />
  ),
};

export const DataQualityRouteStory: Story = {
  name: "Data Quality",
  parameters: {
    catchComponent: {
      id: "route_data_quality",
      states: ["source-register"],
    },
  },
  render: renderDataQualityWorkspace,
};

export const DataQualityWorkspaceStory: Story = {
  name: "Data Quality Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_data_quality",
      states: ["source-register"],
    },
  },
  render: renderDataQualityWorkspace,
};

export const EventPublishingRouteStory: Story = {
  name: "Events",
  parameters: {
    catchComponent: {
      id: "route_event_publishing",
      states: ["canonical-directory"],
    },
  },
  render: renderEventPublishingWorkspace,
};

export const EventPublishingWorkspaceStory: Story = {
  name: "Events Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_event_publishing",
      states: ["canonical-directory"],
    },
  },
  render: renderEventPublishingWorkspace,
};

export const EventPublishingDetailStory: Story = {
  name: "Event detail",
  parameters: {
    catchComponent: {
      id: "workspace_event_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderEventPublishingDetail,
};

export const IntakeWorkspaceRouteStory: Story = {
  name: "Intake",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "route_intake_workspace",
      states: ["event-review"],
    },
  },
  render: renderIntakeWorkspace,
};

export const IntakeWorkspaceStory: Story = {
  name: "Intake Workspace Shell",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_intake_workspace",
      states: ["event-review"],
    },
  },
  render: renderIntakeWorkspace,
};

export const EventIntakeWorkspaceStory: Story = {
  name: "Event Intake Workspace",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_event_intake",
      states: ["default", "run-plan", "source-review"],
    },
  },
  render: renderEventIntakeWorkspace,
};

export const OrganizerIntakeRouteStory: Story = {
  name: "Organizer Intake",
  parameters: {
    catchComponent: {
      id: "route_organizer_intake",
      states: [
        "default",
        "workflow-readiness",
        "publication-packets",
        "scrollable-candidate-queue",
        "organizer-draft-creation",
      ],
    },
  },
  render: renderOrganizerIntakeWorkspace,
};

export const OrganizerIntakeWorkspaceStory: Story = {
  name: "Organizer Intake Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_intake",
      states: [
        "default",
        "workflow-readiness",
        "publication-packets",
        "scrollable-candidate-queue",
        "organizer-draft-creation",
      ],
    },
  },
  render: renderOrganizerIntakeWorkspace,
};

export const IntakeOperationsWorkspaceStory: Story = {
  name: "Supply Intake Automation Workspace",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_intake_operations",
      states: ["default", "human-review", "read-only-boundary"],
    },
  },
  render: renderIntakeOperationsWorkspace,
};

export const MarketingOpsRouteStory: Story = {
  name: "Marketing",
  parameters: {
    catchComponent: {
      id: "route_marketing_ops",
      states: ["post-board"],
    },
  },
  render: renderMarketingOpsWorkspace,
};

export const MarketingOpsWorkspaceStory: Story = {
  name: "Marketing workspace",
  parameters: {
    catchComponent: {
      id: "workspace_marketing_ops",
      states: ["post-board"],
    },
  },
  render: renderMarketingOpsWorkspace,
};

export const OrganizerPublishingRouteStory: Story = {
  name: "Organizers",
  parameters: {
    catchComponent: {
      id: "route_organizer_publishing",
      states: ["canonical-directory"],
    },
  },
  render: renderOrganizerPublishingWorkspace,
};

export const OrganizerPublishingWorkspaceStory: Story = {
  name: "Organizers workspace",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_publishing",
      states: ["canonical-directory"],
    },
  },
  render: renderOrganizerPublishingWorkspace,
};

export const OrganizerPublishingBlockedDraftStory: Story = {
  name: "Organizer blocked draft",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_publishing",
      states: ["blocked-draft"],
    },
  },
  render: () => <OrganizerPublishingBlockedDraftPreview />,
};

export const GrowthRouteStory: Story = {
  name: "Growth",
  parameters: {
    catchComponent: {
      id: "route_growth_kpi",
      states: ["signal-directory"],
    },
  },
  render: renderGrowthWorkspace,
};

export const GrowthWorkspaceStory: Story = {
  name: "Growth Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_growth_kpi",
      states: ["signal-directory"],
    },
  },
  render: renderGrowthWorkspace,
};

export const FinanceRouteStory: Story = {
  name: "Finance",
  parameters: {
    catchComponent: {
      id: "route_finance_ops",
      states: ["issue-detail"],
    },
  },
  render: renderFinanceWorkspace,
};

export const FinanceWorkspaceStory: Story = {
  name: "Finance Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_finance_ops",
      states: ["issue-detail"],
    },
  },
  render: renderFinanceWorkspace,
};

export const AdminRoleManagementRouteStory: Story = {
  name: "Admin Roles",
  parameters: {
    catchComponent: {
      id: "route_admin_role_management",
      states: ["role-assignment-detail"],
    },
  },
  render: renderAdminRoleWorkspace,
};

export const AdminRoleManagementWorkspaceStory: Story = {
  name: "Admin Roles Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_admin_role_management",
      states: ["role-assignment-detail"],
    },
  },
  render: renderAdminRoleWorkspace,
};

export const AdminActionExecutionsRouteStory: Story = {
  name: "Agent Activity",
  parameters: {
    catchComponent: {
      id: "route_admin_action_executions",
      states: ["bounded-receipt-register"],
    },
  },
  render: renderAdminActionExecutionsWorkspace,
};

export const AdminActionExecutionsWorkspaceStory: Story = {
  name: "Agent Activity Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_admin_action_executions",
      states: ["bounded-receipt-register"],
    },
  },
  render: renderAdminActionExecutionsWorkspace,
};

export const NowRouteStory: Story = {
  name: "Needs you",
  beforeEach: installReviewedQueueClock,
  parameters: {
    catchComponent: {
      id: "route_now",
      states: ["oldest-first", "by-kind", "data-sources", "stats"],
    },
  },
  render: () => (
    <NowScreen
      canOpen={() => true}
      dateLabel="Saturday, 3 July"
      error={null}
      isLoading={false}
      model={buildNowModel(overview, Date.parse("2026-07-03T09:30:00.000Z"))}
      onOpenItem={noop}
      onOpenKind={noop}
      onRefresh={noop}
    />
  ),
};

export const SystemRouteStory: Story = {
  name: "System",
  parameters: {
    catchComponent: {
      id: "route_system",
      states: ["activity", "filters", "health"],
    },
  },
  render: () => {
    const rows = actionExecutionRows.map(activityRow);
    return (
      <SystemScreen
        activityError={null}
        counts={{
          everyone: rows.length,
          people: rows.filter((row) => !row.automatic).length,
          automatic: rows.filter((row) => row.automatic).length,
          problems: rows.filter((row) => row.problem).length,
        }}
        filter="everyone"
        health={healthRows(overview)}
        healthError={null}
        isActivityLoading={false}
        onFilterChanged={noop}
        onQueryChanged={noop}
        onRefresh={noop}
        query=""
        rows={rows}
      />
    );
  },
};

export const MarketplaceRouteStory: Story = {
  name: "Marketplace",
  beforeEach: installReviewedQueueClock,
  parameters: {
    catchComponent: {
      id: "route_marketplace",
      states: ["default", "analytics-controls", "scoped-analytics"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <MarketplaceScreen
        analyticsOrganizerId=""
        analyticsEndDate="2026-07-03"
        analyticsEventId=""
        analyticsGranularity="day"
        analyticsRangePreset="30d"
        analyticsStartDate="2026-06-04"
        hostAnalytics={hostAnalytics}
        isLoading={false}
        onAnalyticsOrganizerIdChange={noop}
        onAnalyticsEndDateChange={noop}
        onAnalyticsEventIdChange={noop}
        onAnalyticsGranularityChange={setGranularity}
        onAnalyticsRangePresetChange={setRangePreset}
        onAnalyticsStartDateChange={noop}
        onClearAnalyticsScope={noop}
        onRefresh={noop}
      />
    </AdminWorkspace>
  ),
};
