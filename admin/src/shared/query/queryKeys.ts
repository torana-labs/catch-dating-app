// Resource keys are local to the principal + authorization epoch owned by
// AdminQueryProvider. Never reuse its QueryClient across session boundaries.
export const adminQueryKeys = {
  all: ["admin"] as const,
  adminRoles: {
    assignments: (status: string) =>
      [...adminQueryKeys.all, "admin-roles", "assignments", status] as const,
    user: (targetUid: string) =>
      [...adminQueryKeys.all, "admin-roles", "user", targetUid] as const,
  },
  access: {
    applications: () =>
      [...adminQueryKeys.all, "access", "applications"] as const,
    detail: (applicationUid: string) =>
      [...adminQueryKeys.all, "access", "detail", applicationUid] as const,
  },
  dataQuality: {
    source: (sourceId: string) =>
      [...adminQueryKeys.all, "data-quality", "source", sourceId] as const,
  },
  events: {
    list: (payloadKey: string) =>
      [...adminQueryKeys.all, "events", "list", payloadKey] as const,
    externalList: (payloadKey: string) =>
      [...adminQueryKeys.all, "events", "external-list", payloadKey] as const,
    detail: (eventId: string) =>
      [...adminQueryKeys.all, "events", "detail", eventId] as const,
    directory: (payloadKey: string) =>
      [...adminQueryKeys.all, "events", "directory", payloadKey] as const,
    page: (source: string, eventId: string) =>
      [...adminQueryKeys.all, "events", "page", source, eventId] as const,
  },
  eventIntake: {
    dashboardBridge: () =>
      [...adminQueryKeys.all, "event-intake", "dashboard-bridge"] as const,
    decision: () => [...adminQueryKeys.all, "event-intake", "decision"] as const,
  },
  intakeOperations: {
    list: (payloadKey: string) =>
      [...adminQueryKeys.all, "intake-operations", "list", payloadKey] as const,
  },
  finance: {
    overview: () => [...adminQueryKeys.all, "finance", "overview"] as const,
    hostAnalytics: () =>
      [...adminQueryKeys.all, "finance", "host-analytics", "30d", "week"] as const,
    messagingBudgetReview: () =>
      [...adminQueryKeys.all, "finance", "messaging-budget-review"] as const,
    messagingBudgetDecision: () =>
      [...adminQueryKeys.all, "finance", "messaging-budget-decision"] as const,
    messagingBudgetStage: () =>
      [...adminQueryKeys.all, "finance", "messaging-budget-stage"] as const,
    commercialTerms: (scope: string) =>
      [...adminQueryKeys.all, "finance", "commercial-terms", scope] as const,
    commercialTermsSearch: (query: string) =>
      [...adminQueryKeys.all, "finance", "commercial-terms-search", query] as const,
    commercialTermsReplace: () =>
      [...adminQueryKeys.all, "finance", "commercial-terms-replace"] as const,
    paymentRouting: () =>
      [...adminQueryKeys.all, "finance", "payment-routing"] as const,
    paymentRoutingReplace: () =>
      [...adminQueryKeys.all, "finance", "payment-routing-replace"] as const,
  },
  marketing: {
    opsBridge: () => [...adminQueryKeys.all, "marketing", "ops-bridge"] as const,
    createDraft: () => [...adminQueryKeys.all, "marketing", "create-draft"] as const,
    decision: () => [...adminQueryKeys.all, "marketing", "decision"] as const,
  },
  organizerIntake: {
    bridge: () => [...adminQueryKeys.all, "organizer-intake", "bridge"] as const,
    createDraft: () =>
      [...adminQueryKeys.all, "organizer-intake", "create-draft"] as const,
    curation: () => [...adminQueryKeys.all, "organizer-intake", "curation"] as const,
    decision: () => [...adminQueryKeys.all, "organizer-intake", "decision"] as const,
    policyDecision: () =>
      [...adminQueryKeys.all, "organizer-intake", "policy-decision"] as const,
  },
  operations: {
    executions: () =>
      [...adminQueryKeys.all, "operations", "executions"] as const,
  },
  organizers: {
    list: (query: string) => [...adminQueryKeys.all, "organizers", "list", query] as const,
    detail: (organizerId: string) =>
      [...adminQueryKeys.all, "organizers", "detail", organizerId] as const,
    claims: () => [...adminQueryKeys.all, "organizers", "claims"] as const,
    claimDetail: (requestId: string) =>
      [...adminQueryKeys.all, "organizers", "claims", requestId] as const,
    directory: (payloadKey: string) =>
      [...adminQueryKeys.all, "organizers", "directory", payloadKey] as const,
    overview: (organizerId: string) =>
      [...adminQueryKeys.all, "organizers", "overview", organizerId] as const,
  },
  overview: {
    snapshot: (mode: string) =>
      [...adminQueryKeys.all, "overview", "snapshot", mode] as const,
    analytics: (payloadKey: string, mode: string, access: string) =>
      [...adminQueryKeys.all, "overview", "analytics", mode, access, payloadKey] as const,
  },
  safety: {
    queue: () => [...adminQueryKeys.all, "safety", "queue"] as const,
    detail: (targetPath: string) =>
      [...adminQueryKeys.all, "safety", "detail", targetPath] as const,
    actions: (view: string, uid: string | null) =>
      [...adminQueryKeys.all, "safety", "actions", view, uid] as const,
    settings: () => [...adminQueryKeys.all, "safety", "settings"] as const,
  },
  people: {
    search: (query: string) =>
      [...adminQueryKeys.all, "people", "search", query] as const,
  },
  support: {
    conversations: (view: string, audience: string | null) =>
      [...adminQueryKeys.all, "support", "conversations", view,
        audience] as const,
    conversation: (conversationId: string) =>
      [...adminQueryKeys.all, "support", "conversation",
        conversationId] as const,
    savedReplies: () =>
      [...adminQueryKeys.all, "support", "saved-replies"] as const,
  },
  users: {
    analytics: (payloadKey: string) =>
      [...adminQueryKeys.all, "users", "analytics", payloadKey] as const,
  },
  crossPaths: {
    showcase: (status: string, cursor: string | null) =>
      [...adminQueryKeys.all, "cross-paths", "showcase", status, cursor] as const,
  },
};
