import type {SafetyTriageController} from "../features/safety/controllers/useSafetyTriageController";
import type {AccessApplicationDecision, AdminAccessApplicationDetails, AdminQueueItem} from "../shared/types/adminTypes";
import type {AccessReviewController, AccessReviewFormState} from "../features/safety/controllers/useAccessReviewController";
import type {SafetySettingsController} from "../features/safety/controllers/useSafetySettingsController";
import type {SafetyActionSheetController} from "../features/safety/controllers/useSafetyActionSheetController";
import type {AccountSafetyController} from "../features/safety/controllers/useAccountSafetyController";
import {SafetyScreen} from "../features/safety/ui/SafetyScreen";
import {SafetyActionSheetWorkspace} from "../features/safety/ui/SafetyActionSheetWorkspace";
import {SafetySettingsWorkspace} from "../features/safety/ui/SafetySettingsWorkspace";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {installReviewedQueueClock, noop, overview} from "./adminRouteStoryKit";

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

const storySafetySettings: SafetySettingsController = {
  snapshot: {
    settings: {
      reasons: [
        {code: "harassment", label: "Harassment", severe: false, takedown: false, active: true},
        {code: "intimate_images", label: "Sharing intimate images", severe: true, takedown: true, active: true},
        {code: "spam", label: "Spam", severe: false, takedown: false, active: false},
      ],
      restrictOnSevereReport: true, organizerBlockLists: true, organizerReports: true,
      updatedAtMillis: null, updatedByUid: null,
    },
    deadlines: {acknowledge: "immediately", firstLookHours: 24, resolveDays: 15, takedownHours: 24},
    stepRoles: {warn: "ops", restrict: "ops", suspend: "owner", ban: "owner"},
    retentionDaysAfterDeletion: 180,
  },
  loadState: "ready", isSaving: false, canEdit: true, save: async () => true,
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

export const SafetySettingsWorkspaceStory: Story = {
  name: "Settings · Safety",
  parameters: {
    catchComponent: {id: "workspace_safety_settings", states: ["owner-edits", "ops-reads"]},
  },
  render: () => <SafetySettingsWorkspace settings={storySafetySettings} />,
};
