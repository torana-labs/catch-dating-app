export interface AdminQueueItem {
  id: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string | null;
  targetPath: string;
}

export type AdminOverviewResponse = AdminGetOverviewCallableResponse;

export type AdminSafetyTriageKind =
  | "report"
  | "moderationFlag"
  | "eventSafetyReport"
  | "eventAssistanceCase";

export interface AdminGetSafetyTriageDetailsPayload {
  targetPath: string;
}

export interface AdminSafetyTriageField {
  label: string;
  value: string;
}

export type AdminSafetyTriageSeverity = "high" | "medium" | "watch";
export type AdminSafetyTriageSlaState =
  | "ok"
  | "due_soon"
  | "overdue"
  | "unknown";

export interface AdminSafetyTriageAssignment {
  ownerTeam: string;
  assigneeUid: string | null;
  queue: string;
  severity: AdminSafetyTriageSeverity;
}

export interface AdminSafetyTriageSla {
  dueAt: string | null;
  state: AdminSafetyTriageSlaState;
  policy: string;
}

export interface AdminSafetyTriageEvidence {
  label: string;
  value: string;
  sourcePath: string | null;
  sensitive: boolean;
}

export interface AdminSafetyTriagePriorHistory {
  id: string;
  label: string;
  count: number;
  sampleTargetPaths: string[];
}

export interface AdminSafetyTriageOutcomeGuidance {
  id: string;
  label: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  actionStatus: "available" | "manual" | "needs_contract";
}

export interface AdminSafetyTriageDetails {
  targetPath: string;
  kind: AdminSafetyTriageKind;
  title: string;
  summary: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  primaryUserId: string | null;
  secondaryUserId: string | null;
  eventId: string | null;
  clubId: string | null;
  source: string | null;
  contextId: string | null;
  assignment: AdminSafetyTriageAssignment;
  sla: AdminSafetyTriageSla;
  evidence: AdminSafetyTriageEvidence[];
  fields: AdminSafetyTriageField[];
  priorHistory: AdminSafetyTriagePriorHistory[];
  outcomeGuidance: AdminSafetyTriageOutcomeGuidance[];
  nextActions: string[];
}

export interface AdminGetSafetyTriageDetailsResponse {
  item: AdminSafetyTriageDetails;
}

export type AdminSafetyTriageDecision = "review" | "dismiss";

export type AdminDecideSafetyTriageItemPayload =
  AdminDecideSafetyTriageItemCallablePayload;

export type AdminDecideSafetyTriageItemResponse =
  AdminDecideSafetyTriageItemCallableResponse;

export type AdminAssignSafetyTriageItemPayload =
  AdminAssignSafetyTriageItemCallablePayload;

export type AdminAssignSafetyTriageItemResponse =
  AdminAssignSafetyTriageItemCallableResponse;

export interface HostAnalyticsQueryPayload {
  organizerId?: string | null;
  /** @deprecated Use organizerId. */
  clubId?: string | null;
  eventId?: string | null;
  rangePreset?: "7d" | "30d" | "90d" | "month" | "custom";
  startDate?: string | null;
  endDate?: string | null;
  granularity?: "day" | "week" | "month";
}

export interface HostAnalyticsMetricCard {
  id: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "money_minor" | "rating";
  status: "ready" | "partial" | "missing";
  caption?: string | null;
}

export interface HostAnalyticsTrendPoint {
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, number>;
}

export interface HostAnalyticsEventRow {
  eventId: string;
  organizerId?: string;
  /** @deprecated Use organizerId. */
  clubId: string;
  title: string;
  startTime: string;
  status: string;
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  fillRate: number;
  checkInRate: number;
  grossRevenueMinor: number;
  currency: string;
  checkoutStartedCount: number;
  checkoutDropoffCount: number;
  paymentCompletedCount: number;
  paymentFailedCount: number;
  paymentRefundedCount: number;
  reviewCount: number;
  averageRating: number;
  demandCount: number;
  inviteOpenCount: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  repeatAttendeeCount: number;
}

export interface HostAnalyticsResponse {
  generatedAt: string;
  timezone: string;
  range: {
    startDate: string;
    endDate: string;
    granularity: "day" | "week" | "month";
    preset?: string | null;
  };
  scope: {
    organizerIds: string[];
    /** @deprecated Use organizerIds. */
    clubIds: string[];
    eventIds: string[];
    organizerName?: string | null;
    /** @deprecated Use organizerName. */
    clubName?: string | null;
    eventTitle?: string | null;
  };
  summaryCards: HostAnalyticsMetricCard[];
  trend: HostAnalyticsTrendPoint[];
  topEvents: HostAnalyticsEventRow[];
  reviewSummary: {
    newReviews: number;
    publishedReviews: number;
    verifiedReviews: number;
    publicReviews: number;
    ownerResponseCount: number;
    averageRating: number;
  };
  discoverySummary: {
    listingViews: number;
    searchAppearances: number;
    eventViews: number;
    organizerSaves: number;
    eventSaves: number;
    contactClicks: number;
    claimClicks: number;
    outboundClicks: number;
  };
  dataQuality: Array<{
    id: string;
    state: "ok" | "partial" | "missing";
    detail: string;
    owner: string;
    runbook: string;
    nextAction: string;
  }>;
}

export type UserAnalyticsRangePreset = "7d" | "30d" | "90d" | "month" | "custom";
export type UserAnalyticsGranularity = "day" | "week" | "month";
export type UserAnalyticsMetricUnit = "count" | "percent" | "duration_seconds";
export type UserAnalyticsMetricStatus = "ready" | "partial" | "missing";
export type UserAnalyticsDataQualityState = "ok" | "partial" | "missing";

export interface UserAnalyticsQueryPayload {
  userId?: string | null;
  rangePreset?: UserAnalyticsRangePreset;
  startDate?: string | null;
  endDate?: string | null;
  granularity?: UserAnalyticsGranularity;
}

export interface UserAnalyticsMetricCard {
  id: string;
  label: string;
  value: number;
  unit: UserAnalyticsMetricUnit;
  status: UserAnalyticsMetricStatus;
  caption?: string | null;
}

export interface UserAnalyticsTrendPoint {
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, number>;
}

export interface UserAnalyticsConnectionSummary {
  outgoingLikes: number;
  incomingLikes: number;
  privateInterestReceived: number;
  mutualCatches: number;
  chatsStarted: number;
  chatMessagesSent: number;
  followThroughRate: number;
  eventsAttended: number;
}

export interface UserAnalyticsProfileSummary {
  profileViews: number;
  uniqueViewers: number;
  profileDwellSeconds: number;
  photoImpressions: number;
  topPhotoId: string | null;
  activeMinutes: number;
}

export interface UserAnalyticsCoachingTipRef {
  id: string;
  copyKey: string;
  priority: number;
  metricIds: string[];
}

export interface UserAnalyticsDataQuality {
  id: string;
  state: UserAnalyticsDataQualityState;
  detail: string;
}

export interface UserAnalyticsResponse {
  generatedAt: string;
  timezone: string;
  range: {
    startDate: string;
    endDate: string;
    granularity: UserAnalyticsGranularity;
    preset?: string | null;
  };
  scope: {
    userId: string;
  };
  summaryCards: UserAnalyticsMetricCard[];
  trend: UserAnalyticsTrendPoint[];
  connectionSummary: UserAnalyticsConnectionSummary;
  profileSummary: UserAnalyticsProfileSummary;
  coachingTipRefs: UserAnalyticsCoachingTipRef[];
  dataQuality: UserAnalyticsDataQuality[];
}

export type DataMode = "sample" | "live";

export const adminRoleClaimKeys = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
  "finance",
  "analyticsViewer",
  "salesStaff",
] as const;

export type AdminRoleClaim = typeof adminRoleClaimKeys[number];

export type AdminActionExecutionStatus =
  | "started"
  | "succeeded"
  | "failed"
  | "indeterminate";

export interface AdminActionExecutionRecord {
  schemaVersion: 1;
  executionId: string;
  actionId: string;
  callable: string;
  actorUid: string;
  actorRoles: AdminRoleClaim[];
  status: AdminActionExecutionStatus;
  requestHash: string;
  responseHash: string | null;
  target: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  cliVersion: string | null;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
}

export interface AdminListActionExecutionsPayload {
  limit?: number;
  cursor?: string | null;
}

export interface AdminListActionExecutionsResponse {
  schemaVersion: 1;
  generatedAt: string;
  rows: AdminActionExecutionRecord[];
  nextCursor: string | null;
}

export interface AdminUserRoleRecord {
  targetUid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  roles: AdminRoleClaim[];
  assignmentPath: string;
}

export interface AdminRoleAssignmentRow extends AdminUserRoleRecord {
  status: "active" | "revoked";
  updatedAt: string | null;
  updatedByUid: string | null;
}

export interface AdminGetAdminUserRolesPayload {
  targetUid: string;
}

export interface AdminGetAdminUserRolesResponse {
  user: AdminUserRoleRecord;
}

export interface AdminListAdminRoleAssignmentsPayload {
  status?: "active" | "revoked" | "all" | null;
  limit?: number | null;
}

export interface AdminListAdminRoleAssignmentsResponse {
  generatedAt: string;
  rows: AdminRoleAssignmentRow[];
  source: "adminRoleAssignments";
}

export type AdminSetAdminUserRolesPayload =
  AdminSetAdminUserRolesCallablePayload;

export type AdminSetAdminUserRolesResponse =
  AdminSetAdminUserRolesCallableResponse;

export type AccessApplicationDecision = "approve" | "deny";
export type ClubClaimDecision = "approve" | "reject";
export type ClubIndexDecision = "indexReady" | "noindex";
export type OrganizerIntakeDecision = "approve_public" | "hold" | "suppress";
export type OrganizerEventCandidateDecision =
  | "approve_for_import"
  | "hold"
  | "reject";
export type OrganizerEventImportBlockerCode =
  | "missing_exact_coordinates"
  | "missing_end_time"
  | "missing_location_detail"
  | "requires_event_defaults_policy"
  | "requires_owner_safe_copy_review"
  | "duplicate_normalized_event_key";
export interface OrganizerEventBlockerResolution {
  blockerCode: OrganizerEventImportBlockerCode;
  outcome: "resolved" | "waived";
  policyGapDecisionId: string | null;
  note: string;
}
export type OrganizerPolicyGapDecision = "accept" | "hold" | "reject";
export type OrganizerEntityKind =
  | "club"
  | "venue"
  | "eventOrganizer"
  | "creatorCommunity"
  | "brand";
export type OrganizerType =
  | "club"
  | "community"
  | "individual"
  | "eventProducer"
  | "venue"
  | "brand";
export type OrganizerAppVisibility = "discoverable" | "hidden";
export type OrganizerIntakePublishStatus =
  | "draft"
  | "published"
  | "suppressed";
export type OrganizerIntakeIndexStatus = "noindex" | "indexed";
export type OrganizerPublishStatus =
  | "draft"
  | "qa"
  | "published"
  | "suppressed"
  | "removed";
export type OrganizerSourceConfidence =
  | "seedOnly"
  | "low"
  | "medium"
  | "high"
  | "ownerVerified";
export type OrganizerVerificationStatus =
  | "unverified"
  | "sourceBacked"
  | "ownerVerified";
export type OrganizerCurationOperation =
  | "attach_surface"
  | "merge_entity"
  | "split_surface"
  | "suppress_entity"
  | "surface_decision";
export type OrganizerSurfaceDecision =
  | "accept_primary"
  | "accept_secondary"
  | "reject_wrong_entity"
  | "mark_ambiguous"
  | "mark_historical";

export interface OrganizerCurationSurface {
  surfaceId: string;
  platform:
    | "bookMyShow"
    | "district"
    | "instagram"
    | "linkedin"
    | "luma"
    | "news"
    | "officialWebsite"
    | "partiful"
    | "sortMyScene"
    | "userReport"
    | "other";
  surfaceKind:
    | "eventListing"
    | "eventCalendar"
    | "organizerProfile"
    | "personProfile"
    | "press"
    | "socialProfile"
    | "website"
    | "wrongEntity";
  url: string | null;
  normalizedKey: string | null;
  role: "primary" | "secondary" | "backup" | "historical" | "ambiguous" | "rejected";
  status: "active" | "candidate" | "ambiguous" | "historical" | "rejected";
  confidence: {
    city: "low" | "medium" | "high";
    entityMatch: "low" | "medium" | "high";
    ownership: "low" | "medium" | "high";
  };
  crawl: {
    eventDiscoveryStatus: "disabled" | "candidate" | "approved" | "paused";
    policy: "manualOnly" | "blocked" | "apiPreferred";
    supportsEventExtraction: boolean;
  };
  evidenceRefs: Array<{
    type: "hostDiscoveryRun" | "seedClub" | "userReportedSearchResult" | "manualNote";
    ref: string | null;
    description: string;
  }>;
  notes: string;
}

export type AdminDecideAccessApplicationPayload =
  AdminDecideAccessApplicationCallablePayload;

export type AdminDecideAccessApplicationResponse =
  AdminDecideAccessApplicationCallableResponse;

export interface AdminGetAccessApplicationDetailsPayload {
  applicationUid: string;
}

export interface AdminAccessApplicationDuplicateSignal {
  id: string;
  label: string;
  value: string;
  count: number;
  sampleTargetPaths: string[];
}

export interface AdminAccessApplicationDetails {
  uid: string;
  targetPath: string;
  status: string;
  city: string | null;
  role: string | null;
  eventTypes: string[];
  availabilityWindows: string[];
  wantsToHost: boolean;
  inviteCode: string | null;
  instagramHandle: string | null;
  referralSource: string | null;
  whyCatch: string | null;
  cohortId: string | null;
  hostUserId: string | null;
  reviewerUid: string | null;
  reviewNote: string | null;
  submissionCount: number;
  createdAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  duplicateSignals: AdminAccessApplicationDuplicateSignal[];
}

export interface AdminGetAccessApplicationDetailsResponse {
  application: AdminAccessApplicationDetails;
}

export interface AdminDecideClubClaimPayload {
  requestId: string;
  decision: ClubClaimDecision;
  decisionReason?: string | null;
}

export interface AdminDecideClubClaimResponse {
  requestId: string;
  clubId: string;
  decision: ClubClaimDecision;
  status: "approved" | "rejected";
}

export interface AdminClubClaimListRow {
  requestId: string;
  targetPath: string;
  clubId: string;
  requesterUid: string;
  requesterName: string;
  requesterRole: string;
  contact: string | null;
  proofCount: number;
  status: string;
  createdAt: string | null;
}

export interface AdminListClubClaimRequestsResponse {
  generatedAt: string;
  rows: AdminClubClaimListRow[];
}

export interface AdminGetClubClaimRequestDetailsPayload {
  requestId: string;
}

export interface AdminClubClaimRequestDetails extends AdminClubClaimListRow {
  businessEmail: string | null;
  businessPhone: string | null;
  proofUrls: string[];
  message: string | null;
  updatedAt: string | null;
  requesterProfile: {
    exists: boolean;
    profileComplete: boolean;
  };
  club: {
    exists: boolean;
    name: string | null;
    claimState: string | null;
    ownershipState: string | null;
    ownerUserId: string | null;
    canonicalPath: string | null;
  };
}

export interface AdminGetClubClaimRequestDetailsResponse {
  request: AdminClubClaimRequestDetails;
}

export interface AdminSetClubIndexStatusPayload {
  clubId: string;
  indexStatus: ClubIndexDecision;
  checklist: {
    sourceEvidenceVerified: boolean;
    mediaRightsVerified: boolean;
    cadenceVerified: boolean;
    ownerContactVerified: boolean;
  };
  reviewNote?: string | null;
}

export interface AdminSetClubIndexStatusResponse {
  clubId: string;
  indexStatus: ClubIndexDecision;
  publishStatus: "qa" | "published";
  robots: "noindex, follow" | "index, follow";
}

export interface AdminDecideOrganizerIntakePayload {
  entityId: string;
  decision: OrganizerIntakeDecision;
  publishStatus: OrganizerIntakePublishStatus;
  indexStatus: OrganizerIntakeIndexStatus;
  appVisibility: OrganizerAppVisibility;
  checklist: {
    identityReviewed: boolean;
    surfaceInventoryReviewed: boolean;
    ownerSafeCopyReviewed: boolean;
    marketScopeReviewed: boolean;
    mediaRightsReviewed: boolean;
    crawlDisabledReviewed: boolean;
    manualReportsReviewed?: boolean;
    claimTargetReviewed?: boolean;
    takedownPathReviewed?: boolean;
    impersonationReviewed?: boolean;
    operatingStatusReviewed?: boolean;
    eventAccuracyReviewed?: boolean;
    unclaimedAffordancesReviewed?: boolean;
  };
  note: string;
}

export interface AdminDecideOrganizerIntakeResponse {
  entityId: string;
  decision: OrganizerIntakeDecision;
  decisionStatus: "approved_public" | "held" | "suppressed";
  publishStatus: OrganizerIntakePublishStatus;
  indexStatus: OrganizerIntakeIndexStatus;
  appVisibility: OrganizerAppVisibility;
  decisionPath: string;
  projectionState: "pending_static_generation" | "not_projectable";
}

export interface AdminDecideOrganizerEventCandidatePayload {
  candidateId: string;
  decision: OrganizerEventCandidateDecision;
  checklist: {
    identityReviewed: boolean;
    sourceEventReviewed: boolean;
    timeReviewed: boolean;
    locationReviewed: boolean;
    dedupeReviewed: boolean;
    ownerSafeCopyReviewed: boolean;
    importPolicyAcknowledged: boolean;
  };
  blockerResolutions: OrganizerEventBlockerResolution[];
  note: string;
}

export interface AdminDecideOrganizerEventCandidateResponse {
  candidateId: string;
  decisionId: string;
  decision: OrganizerEventCandidateDecision;
  decisionStatus: "approved_for_import" | "held" | "rejected";
  decisionPath: string;
  importState: "blocked_by_policy" | "not_importable" | "pending_import";
}

export interface AdminDecideOrganizerPolicyGapPayload {
  gapId: string;
  decision: OrganizerPolicyGapDecision;
  requiredInputsReviewed: string[];
  checklist: {
    requiredInputsReviewed: boolean;
    costAndSafetyReviewed: boolean;
    implementationOwnerReviewed: boolean;
    behaviorStillDisabledAcknowledged: boolean;
  };
  note: string;
}

export interface AdminDecideOrganizerPolicyGapResponse {
  gapId: string;
  decisionId: string;
  decision: OrganizerPolicyGapDecision;
  decisionStatus: "accepted" | "held" | "rejected";
  decisionPath: string;
  operationalState: "blocked_until_policy_encoded" | "not_approved";
}

export interface OrganizerResolvedEventLocation {
  name: string;
  address?: string | null;
  placeId?: string | null;
  latitude: number | null;
  longitude: number | null;
  notes?: string | null;
}

export interface AdminResolveOrganizerEventLocationPayload {
  candidateId: string;
  location: OrganizerResolvedEventLocation;
  checklist: {
    sourceLocationReviewed: boolean;
    coordinatesReviewed: boolean;
    placeIdentityReviewed: boolean;
    importSafetyReviewed: boolean;
  };
  note: string;
}

export interface AdminResolveOrganizerEventLocationResponse {
  candidateId: string;
  resolutionId: string;
  resolutionStatus: "resolved";
  decisionPath: string;
  location: OrganizerResolvedEventLocation;
}

export interface AdminRecordOrganizerCurationPayload {
  operationId?: string;
  operationType: OrganizerCurationOperation;
  entityId?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  surfaceId?: string;
  newEntityId?: string;
  sourceCandidateId?: string;
  decision?: OrganizerSurfaceDecision;
  surface?: OrganizerCurationSurface;
  reason: string;
}

export interface AdminRecordOrganizerCurationResponse {
  operationId: string;
  operationType: OrganizerCurationOperation;
  operationStatus: "active" | "superseded";
  decisionPath: string;
}

export type AdminCreateOrganizerDraftFromCandidatePayload =
  AdminCreateOrganizerDraftFromCandidateCallablePayload;

export type AdminCreateOrganizerDraftFromCandidateResponse =
  AdminCreateOrganizerDraftFromCandidateCallableResponse;

export interface AdminClubDetails {
  clubId: string;
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
  organizerType: OrganizerType;
  publicCategoryLabel: string | null;
  entityKind: OrganizerEntityKind | null;
  entitySubtypes: string[];
  displayCategory: string | null;
  cityName: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  appVisibility: OrganizerAppVisibility | null;
  ownershipState: string | null;
  claimState: string | null;
  publicPage: {
    slug: string | null;
    citySlug: string | null;
    canonicalPath: string | null;
    publishStatus: OrganizerPublishStatus | null;
    indexStatus: string | null;
    robots: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  provenance: {
    origin: string | null;
    sourceConfidence: OrganizerSourceConfidence | null;
    verificationStatus: OrganizerVerificationStatus | null;
  };
  publicProfile: {
    headline: string | null;
    summary: string | null;
    sourceSummary: string | null;
    formats: string[];
  };
  /** Organizer page links in display order, expired ones included. */
  ownerLinks: AdminOrganizerOwnerLink[];
}

/** contracts/shared/public_page_common.schema.json ownerLinkIcon. */
export type OrganizerOwnerLinkIcon =
  | "link"
  | "website"
  | "community"
  | "social"
  | "tickets"
  | "calendar"
  | "shop"
  | "partner"
  | "video"
  | "route";

/** contracts/shared/public_page_common.schema.json ownerLinkInput. */
export interface AdminOrganizerOwnerLink {
  id: string;
  label: string;
  subtitle: string | null;
  url: string;
  /** Null lets the page infer an icon from the URL. */
  icon: OrganizerOwnerLinkIcon | null;
  pinned: boolean;
  /** ISO time after which the page hides the link. */
  showUntil: string | null;
}

export interface AdminGetClubDetailsPayload {
  clubId: string;
}

export interface AdminGetClubDetailsResponse {
  club: AdminClubDetails;
}

export interface AdminClubListRow {
  clubId: string;
  name: string;
  organizerType: OrganizerType;
  publicCategoryLabel: string | null;
  displayCategory: string | null;
  cityName: string | null;
  citySlug: string | null;
  regionName: string | null;
  countryCode: string | null;
  appVisibility: OrganizerAppVisibility | null;
  claimState: string | null;
  ownershipState: string | null;
  canonicalPath: string | null;
  publishStatus: OrganizerPublishStatus | null;
  indexStatus: string | null;
  robots: string | null;
  sourceConfidence: OrganizerSourceConfidence | null;
  verificationStatus: OrganizerVerificationStatus | null;
  routeStatus: "missing" | "valid" | "invalid";
  routeReservationStatus: "missing" | "reserved" | "conflict";
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminListClubDetailsPayload {
  query?: string | null;
  citySlug?: string | null;
  citySlugs?: string[] | null;
  publishStatus?: OrganizerPublishStatus | null;
  appVisibility?: OrganizerAppVisibility | null;
  limit?: number;
}

export interface AdminListClubDetailsResponse {
  generatedAt: string;
  rows: AdminClubListRow[];
}

export interface AdminUpdateClubDetailsPayload {
  clubId: string;
  fields: {
    name?: string;
    description?: string;
    location?: string | null;
    area?: string;
    tags?: string[];
    instagramHandle?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    profileImageUrl?: string | null;
    organizerType?: OrganizerType;
    publicCategoryLabel?: string | null;
    entityKind?: OrganizerEntityKind;
    entitySubtypes?: string[];
    displayCategory?: string | null;
    cityName?: string | null;
    regionName?: string | null;
    countryCode?: string | null;
    countryName?: string | null;
    appVisibility?: OrganizerAppVisibility;
    publicPage?: {
      slug?: string;
      citySlug?: string | null;
      canonicalPath?: string;
      publishStatus?: OrganizerPublishStatus;
      seoTitle?: string | null;
      seoDescription?: string | null;
    };
    provenance?: {
      sourceConfidence?: OrganizerSourceConfidence;
      verificationStatus?: OrganizerVerificationStatus;
    };
    publicProfile?: {
      headline?: string | null;
      summary?: string | null;
      sourceSummary?: string | null;
      formats?: string[];
    };
    /** Replaces every organizer page link; an empty list removes them. */
    ownerLinks?: AdminOrganizerOwnerLink[];
  };
  reviewNote?: string | null;
}

export interface AdminUpdateClubDetailsResponse {
  clubId: string;
  updatedFieldCount: number;
}

export type AdminEventActivityKind =
  | "socialRun"
  | "running"
  | "walking"
  | "pickleball"
  | "padel"
  | "tennis"
  | "badminton"
  | "cycling"
  | "spinClass"
  | "yoga"
  | "strengthTraining"
  | "pubQuiz"
  | "barCrawl"
  | "dinner"
  | "singlesMixer"
  | "openActivity";

export type AdminEventInteractionModel =
  | "pacePods"
  | "pairedRotations"
  | "teamRotations"
  | "seatedTable"
  | "freeFormMixer"
  | "hostLedProgram"
  | "openFormat";

export type AdminEventPace =
  | "easy"
  | "moderate"
  | "fast"
  | "competitive";

export type AdminEventStatus = "active" | "cancelled";

export interface AdminEventFormat {
  version: 1;
  activityKind: AdminEventActivityKind;
  interactionModel: AdminEventInteractionModel;
  customActivityLabel: string | null;
  label: string;
}

export interface AdminEventDetails {
  hostActivation?: {activatedAt: number; eventId: string} | null;
  hostPilotReview?: {realEvent: boolean; revision: number; reviewedAt: number} | null;
  eventId: string;
  clubId: string;
  organizerName: string | null;
  title: string;
  startTime: string | null;
  endTime: string | null;
  meetingPoint: string;
  locationDetails: string | null;
  description: string;
  photoUrl: string | null;
  eventFormat: AdminEventFormat;
  distanceKm: number;
  pace: AdminEventPace;
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  crossPathsDiscoveryEnabled: boolean;
  priceInPaise: number;
  currency: string;
  status: AdminEventStatus;
  cancellationReason: string | null;
  discovery: {
    citySlug: string | null;
    activityKind: string | null;
    availability: string | null;
    hasOpenSpots: boolean | null;
    inviteRequired: boolean | null;
    membershipRequired: boolean | null;
    manualApprovalRequired: boolean | null;
    minAge: number | null;
    maxAge: number | null;
  };
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminGetEventDetailsPayload {
  eventId: string;
}

export interface AdminGetEventDetailsResponse {
  event: AdminEventDetails;
}

export interface AdminEventListRow {
  eventId: string;
  clubId: string;
  organizerName: string | null;
  title: string;
  activityKind: AdminEventActivityKind;
  activityLabel: string;
  startTime: string | null;
  citySlug: string | null;
  meetingPoint: string;
  status: AdminEventStatus;
  availability: string | null;
  crossPathsDiscoveryEnabled: boolean;
  bookedCount: number;
  capacityLimit: number;
  priceInPaise: number;
  currency: string;
  searchIndexStatus: "missing" | "indexed";
}

export interface AdminExternalEventListRow {
  eventId: string;
  targetPath: string;
  canonicalHostId: string;
  compatibilityClubId: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  meetingPoint: string;
  citySlug: string | null;
  countryCode: string | null;
  activityKind: AdminEventActivityKind;
  interactionModel: AdminEventInteractionModel;
  activitySource: "heuristic" | "admin" | "source";
  priceDisplayText: string | null;
  parsedPriceInPaise: number | null;
  currency: string;
  status: AdminEventStatus;
  publicationStatus: "draft" | "public" | "archived" | "removed";
  availability: "read_only_external";
  platform: "bookMyShow" | "district" | "luma" | "partiful" | "sortMyScene";
  sourceEventKey: string;
  candidateId: string;
  eventUrl: string | null;
  sourceUrl: string | null;
  externalLinkCount: number;
  primaryExternalUrl: string | null;
  normalizedEventKey: string;
  primaryCandidateId: string;
  duplicateCandidateCount: number;
  importPolicyAcknowledged: boolean;
  ownerSafeCopyReviewed: boolean;
  reviewBatchId: string | null;
  reviewer: string | null;
  decidedAt: string | null;
}

export interface ExternalEventImportPlan {
  summary: {
    candidates: number;
    proposedReadOnlyEvents?: number;
    proposedCreates: number;
    mergedSourceLinks?: number;
    writeReady: number;
    blocked: number;
    waitingReview: number;
    rejected: number;
    duplicateEventKeys: number;
    actionsByStatus: Record<string, number>;
    actionsByPlatform: Record<string, number>;
  };
  policy: {
    status: string;
    writeEnabled: boolean;
    reason: string;
  };
  generatedFrom: {
    externalEventCandidateQueue: string;
    batches: string[];
    reviewDecisionBatches: string[];
    locationResolutionBatches?: string[];
  };
  guardrails: string[];
  actions: ExternalEventImportAction[];
  commands: Record<string, string>;
}

export interface ExternalEventImportAction {
  actionId: string;
  action:
    | "publish_read_only_external_event"
    | "merge_duplicate_source_link"
    | "create_event"
    | "skip";
  status:
    | "blocked"
    | "merged_duplicate"
    | "waiting_review"
    | "rejected"
    | "write_ready";
  candidateId: string;
  entityId: string;
  platform: string;
  sourceEventKey: string;
  normalizedEventKey: string;
  targetPath: string;
  reviewStatus: string;
  importState: string;
  blockers: string[];
  duplicateRole?: string;
  canonicalCandidateId?: string;
  duplicateCandidateIds: string[];
  source: {
    eventUrl: string | null;
    sourceUrl: string | null;
    sourceStatus: string;
    batchId: string;
    surfaceId: string;
  };
  proposedReadOnlyEventDraft: {
    eventId: string;
    canonicalHostId: string;
    compatibilityClubId?: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string | null;
    timezone?: string | null;
    meetingPoint: string;
    meetingLocation?: {
      name: string;
      latitude: number | null;
      longitude: number | null;
      placeId: string | null;
      address: string | null;
      notes: string | null;
    };
    startingPointLat?: number | null;
    startingPointLng?: number | null;
    locationDetails: string | null;
    photoUrl: string | null;
    activity: {
      version: number;
      activityKind: string;
      interactionModel: string;
      source?: string;
    };
    price: {
      displayText: string | null;
      parsedPriceInPaise: number | null;
      currency: string;
    };
    booking: {
      mode: string;
      catchBookingEnabled: boolean;
      catchPaymentsEnabled: boolean;
      catchReservationsEnabled: boolean;
      catchWaitlistEnabled: boolean;
      externalLinks: Array<{
        platform: string;
        url: string;
        linkType: string;
        sourceEventKey: string;
        candidateId: string;
        primary: boolean;
      }>;
    };
  };
}

export interface ExternalEventImportExecutionPlan {
  summary: {
    importActions: number;
    createActions: number;
    readOnlyActions?: number;
    skipped: number;
    blocked: number;
    projectionInvalid?: number;
    schemaInvalid: number;
    wouldPublishReadOnly?: number;
    wouldCreate: number;
    projectionValid?: number;
    projectionInvalidCount?: number;
    payloadValid: number;
    payloadInvalid: number;
    actionsByStatus: Record<string, number>;
  };
  policy: {
    status: string;
    writeEnabled: boolean;
    authorityModel: string;
    reason: string;
  };
  generatedFrom: {
    externalEventImportPlan: string;
    importPlanGeneratedFrom: Record<string, unknown>;
  };
  guardrails: string[];
  actions: ExternalEventImportExecutionAction[];
  commands: Record<string, string>;
}

export interface ExternalEventImportExecutionAction {
  actionId: string;
  sourceActionId: string;
  sourceAction: string;
  status:
    | "blocked"
    | "projection_invalid"
    | "schema_invalid"
    | "skipped"
    | "would_create"
    | "would_publish_read_only";
  candidateId: string;
  entityId: string;
  targetCallable: string | null;
  targetWriter?: string;
  targetPath: string;
  sourceStatus: string;
  sourceReviewStatus: string;
  blockers: string[];
  payloadValidation: {
    valid: boolean;
    errors: Array<{
      path: string;
      message: string;
      keyword: string;
    }>;
  };
  projectionValidation?: {
    valid: boolean;
    errors: Array<{
      path: string;
      message: string;
      keyword: string;
    }>;
  };
  readOnlyEventProjection?: ExternalEventImportAction["proposedReadOnlyEventDraft"];
  createEventPayload?: {
    eventId?: string;
    clubId?: string;
    startTimeMillis?: number | null;
    endTimeMillis?: number | null;
    meetingPoint?: string;
    capacityLimit?: number | null;
    pace?: string | null;
    distanceKm?: number | null;
    [key: string]: unknown;
  };
}

export interface AdminGetEventSupplyReadinessResponse {
  generatedAt: string | null;
  source: "event_supply_readiness" | "empty" | "sample";
  importPlan: ExternalEventImportPlan;
  executionPlan: ExternalEventImportExecutionPlan;
}

export interface AdminPublishExternalEventPayload {
  sourceActionId: string;
  targetPath: string;
  executionMode: "dry_run" | "apply";
  idempotencyKey: string;
  reviewNote: string;
  checklist: {
    preflightActionReviewed: boolean;
    outboundLinksReviewed: boolean;
    noCatchBookingPaymentsWaitlist: boolean;
    ownerSafeCopyReviewed: boolean;
  };
}

export interface AdminPublishExternalEventResponse {
  eventId: string;
  targetPath: string;
  sourceActionId: string;
  publicationStatus: "public";
  externalLinkCount: number;
  executionMode: "dry_run" | "apply";
  outcome: "would_publish" | "published";
  receiptPath: string;
  writeApplied: boolean;
  idempotent: boolean;
  publishedAt: string;
}

export interface AdminTakedownExternalEventPayload {
  eventId: string;
  executionMode: "dry_run" | "apply";
  idempotencyKey: string;
  reviewNote: string;
  checklist: {
    sourceStatusReviewed: boolean;
    takedownAuthorityReviewed: boolean;
    downstreamVisibilityReviewed: boolean;
  };
}

export interface AdminTakedownExternalEventResponse {
  eventId: string;
  targetPath: string;
  executionMode: "dry_run" | "apply";
  outcome: "would_remove" | "removed";
  receiptPath: string;
  writeApplied: boolean;
  idempotent: boolean;
  completedAt: string;
}

export interface AdminListEventDetailsPayload {
  query?: string | null;
  clubId?: string | null;
  citySlug?: string | null;
  citySlugs?: string[] | null;
  activityKind?: AdminEventActivityKind | null;
  status?: AdminEventStatus | null;
  timeWindow?: "upcoming" | "past" | "all" | null;
  limit?: number;
}

export interface AdminListEventDetailsResponse {
  generatedAt: string;
  rows: AdminEventListRow[];
}

export interface AdminListExternalEventDetailsPayload {
  query?: string | null;
  citySlug?: string | null;
  citySlugs?: string[] | null;
  publicationStatus?: "draft" | "public" | "archived" | "removed" | null;
  status?: AdminEventStatus | null;
  timeWindow?: "upcoming" | "past" | "all" | null;
  limit?: number;
}

export interface AdminListExternalEventDetailsResponse {
  generatedAt: string;
  rows: AdminExternalEventListRow[];
}

export interface AdminUpdateEventDetailsPayload {
  eventId: string;
  fields: {
    hostPilotReview?: {realEvent: boolean; expectedRevision: number};
    description?: string;
    photoUrl?: string | null;
    distanceKm?: number;
    pace?: AdminEventPace;
    crossPathsDiscoveryEnabled?: boolean;
    eventFormat?: {
      version: 1;
      activityKind: AdminEventActivityKind;
      interactionModel: AdminEventInteractionModel;
      customActivityLabel?: string;
    };
  };
  reviewNote?: string | null;
}

export interface AdminUpdateEventDetailsResponse {
  eventId: string;
  updatedFieldCount: number;
}

export type MarketingOpsReviewState =
  | "new"
  | "needs_review"
  | "needs_changes"
  | "approved"
  | "held"
  | "rejected";

export type MarketingOpsDecision =
  | "approve"
  | "needs_changes"
  | "hold"
  | "reject"
  | "export_ready";

export type MarketingContentDraftType =
  | "event_highlights"
  | "feature_explainer";

export type MarketingOpsTargetType =
  | "source_profile"
  | "query_template"
  | "run_plan"
  | "source_result"
  | "event_candidate"
  | "recommendation_item"
  | "recommendation_set"
  | "content_draft";

export interface MarketingOpsBridge {
  schemaVersion: 1;
  program: string;
  generatedAt: string;
  city: {
    id: string;
    label: string;
    timezone: string;
    aliases?: string[];
  };
  weekStart: string;
  weekEnd: string;
  timezone: string;
  summary: {
    status: string;
    sourceProfiles: number;
    queryTemplates: number;
    sourceResults: number;
    sourceResultsNeedingReview: number;
    eventCandidates: number;
    reviewableCandidates?: number;
    sourceMissingCandidates?: number;
    approvedCandidates: number;
    candidatesNeedingReview: number;
    orphanCandidates?: number;
    duplicateGroups?: number;
    recommendationSets: number;
    contentDrafts: number;
    exportReadyDrafts: number;
    deliverable?: string;
  };
  guardrails: string[];
  sourceProfiles: MarketingSourceProfile[];
  queryTemplates: MarketingQueryTemplate[];
  runPlan: MarketingRunPlan;
  sourceResults: MarketingSourceResult[];
  eventCandidates: MarketingEventCandidate[];
  dedupeGroups?: MarketingDedupeGroup[];
  recommendationSets: MarketingRecommendationSet[];
  contentDrafts: MarketingContentDraft[];
  appFeatureMedia?: MarketingAppFeatureMedia;
  auditTrail: MarketingAuditTrailItem[];
  commands: Record<string, string>;
}

export interface MarketingAppFeatureMedia {
  schemaVersion: 1;
  status: "ready" | "partial" | "missing_manifest";
  generatedAt: string;
  sourceDocs: {
    pipelineDoc: string;
    captureManifest: string;
    designContext: string;
    websiteManifest: string;
  };
  summary: {
    totalCaptures: number;
    activeCaptures: number;
    memberCaptures: number;
    hostCaptures: number;
    pendingCaptures: number;
    pausedCaptures: number;
  };
  commands: {
    listCaptures: string;
    updateScreenshots: string;
    checkScreenshots: string;
    updateDesignContext: string;
    checkDesignContext: string;
    syncWebsiteMedia: string;
    checkWebsiteMedia: string;
  };
  captures: MarketingAppScreenshotCapture[];
}

export interface MarketingAppScreenshotCapture {
  id: string;
  audience: string;
  surface: string;
  status: "active" | "pending-fixture" | "paused" | string;
  assetState: "website_synced" | "source_only" | "placeholder" | "missing";
  device: string;
  fixtureKey: string;
  captureId: string | null;
  routeIds: string[];
  sourcePath: string;
  websitePath: string;
  placeholderPath: string;
  webPath: string | null;
  alt: string;
  caption: string;
  walkthroughStep: string;
}

export interface MarketingSourceProfile {
  id: string;
  label: string;
  type: string;
  status: string;
  cadence: string;
  riskLevel: "low" | "medium" | "high";
  allowedUse: string;
  items?: Array<{
    label: string;
    url: string;
  }>;
}

export interface MarketingQueryTemplate {
  id: string;
  template: string;
  query: string;
  cityLabel: string;
  intent: string;
  priority: number;
  status: string;
}

export interface MarketingRunPlan {
  id: string;
  cityId: string;
  weekStart: string;
  status: string;
  generatedAt: string;
  schedule: {
    cadence: string;
    publishDay: string;
    lookaheadDays: number;
  };
  budgets: {
    maxQueries: number;
    maxSourceResults: number;
    maxCandidatePool: number;
  };
  automationPolicy: {
    searchProvider: string;
    networkFetchesEnabled: boolean;
    instagramScrapingEnabled: boolean;
    requiresHumanApprovalBeforePublish: boolean;
  };
  queryIds: string[];
  sourceProfileIds: string[];
}

export interface MarketingSourceResult {
  id: string;
  sourceProfileId: string;
  sourceLabel: string;
  queryTemplateId: string;
  resultType: string;
  title: string;
  url: string;
  snippet: string;
  observedAt: string;
  status: MarketingOpsReviewState;
  riskFlags: string[];
  operatorNotes: string;
  latestDecision?: MarketingLatestDecision | null;
}

export interface MarketingEventCandidate {
  id: string;
  normalizedEventKey?: string;
  title: string;
  category: string;
  neighborhood: string;
  venue: string;
  startDate: string;
  endDate: string | null;
  time: string;
  price: string;
  sourceResultIds: string[];
  sourceUrl: string | null;
  sourceLabel: string;
  reviewState: MarketingOpsReviewState;
  requiresVerification: boolean;
  explicitSinglesEvent: boolean;
  whySinglesFriendly: string;
  publicDescription: string;
  scores: Record<string, number>;
  sourceCoverage: {
    sourceResultIds: string[];
    matchedSourceResults: number;
    hasSourceUrl: boolean;
    hasManualInstagramReference: boolean;
  };
  sourceStatus?:
    | "missing_source_url"
    | "manual_reference_needs_official_verification"
    | "source_backed";
  publishability?:
    | "lead_needs_source"
    | "reviewable_needs_verification"
    | "publishable_after_approval";
  dedupe?: {
    normalizedEventKey: string;
    canonicalCandidateId: string;
    duplicateCandidateIds: string[];
  };
  score: number;
  warnings: string[];
  blockerCodes?: string[];
  expiresAt?: string | null;
  observedAt?: string | null;
  operationRunId?: string;
  publicationEligibility?: "blocked_orphan" | "review_gated";
  attribution?: {
    state: "orphan" | "attributed";
    organizerEvidence: {
      name: string | null;
      url: string | null;
    };
    match: {
      decision: string;
      policyId: string;
      threshold: number;
      rationale: string;
      matchedEntityId: string | null;
      score: number;
      matchingSignals: string[];
      blockingKeys: string[];
    };
  };
  organizerCeiling?: {
    organizerId: string | null;
    appVisibility: "discoverable" | "hidden" | null;
    canAppDiscover: boolean;
    reason: string;
  };
  latestDecision?: MarketingLatestDecision | null;
}

export interface MarketingRecommendationSet {
  id: string;
  cityId: string;
  weekStart: string;
  weekEnd: string;
  tone: "singles-friendly" | "singles-social" | string;
  title: string;
  status: string;
  reviewState: MarketingOpsReviewState;
  explanation?: string;
  items: MarketingRecommendationItem[];
}

export interface MarketingRecommendationItem {
  id: string;
  eventCandidateId: string;
  rank: number;
  title: string;
  category: string;
  neighborhood: string;
  score: number;
  inclusionReason: string;
  warnings: string[];
  reviewState: MarketingOpsReviewState;
  sourceStatus?: MarketingEventCandidate["sourceStatus"];
  publishability?: MarketingEventCandidate["publishability"];
}

export interface MarketingContentDraft {
  id: string;
  recommendationSetId: string;
  cityId: string;
  weekStart: string;
  format: string;
  tone: string;
  status: string;
  reviewState: MarketingOpsReviewState;
  aspectRatio: string;
  delivery?: {
    posting: string;
    currentExport: string;
    finalImageExport: string;
    autoPosting: boolean;
  };
  brandContract: {
    logo: string;
    headlineFont: string;
    labelFont: string;
    bodyFont: string;
    primitives: string[];
    rendererStatus: string;
  };
  slides: MarketingContentDraftSlide[];
  caption: string;
  ctas: Array<{
    id: string;
    label: string;
    destination: string;
    purpose: string;
  }>;
  latestDecision?: MarketingLatestDecision | null;
}

export interface MarketingContentDraftSlide {
  id: string;
  role: string;
  eventCandidateId?: string;
  headline: string;
  body: string;
  image?: MarketingContentDraftSlideImage | null;
}

export interface MarketingContentDraftSlideImage {
  sourceType: "app_capture" | "url" | "upload";
  url: string;
  captureId?: string | null;
  sourcePath?: string | null;
  websitePath?: string | null;
  webPath?: string | null;
  fileName?: string | null;
  altText?: string | null;
  credit?: string | null;
  fit?: "cover" | "contain";
}

export interface MarketingDedupeGroup {
  normalizedEventKey: string;
  candidateIds: string[];
  canonicalCandidateId: string;
  duplicateCandidateIds: string[];
}

export interface MarketingLatestDecision {
  decision: MarketingOpsDecision | MarketingOpsReviewState;
  note: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
}

export interface MarketingAuditTrailItem {
  targetType: MarketingOpsTargetType;
  targetId: string;
  decision: MarketingOpsDecision | MarketingOpsReviewState;
  note?: string | null;
  reviewer?: string | null;
  reviewedAt?: string | null;
  edits?: Record<string, unknown>;
}

export interface AdminGetMarketingOpsDashboardResponse {
  bridge: MarketingOpsBridge;
}

export type EventIntakeSourceProfile = MarketingSourceProfile;
export type EventIntakeSourceResult = MarketingSourceResult;
export type EventIntakeCandidate = MarketingEventCandidate;

export type EventIntakeBridge = Pick<
  MarketingOpsBridge,
  | "schemaVersion"
  | "generatedAt"
  | "city"
  | "weekStart"
  | "summary"
  | "sourceProfiles"
  | "queryTemplates"
  | "runPlan"
  | "sourceResults"
  | "eventCandidates"
  | "dedupeGroups"
  | "auditTrail"
  | "commands"
> & {
  program: "catch-event-intake";
  bridgeSource?:
    | "event_intake"
    | "native_generated"
    | "operations"
    | "sample"
    | "empty";
};

export interface AdminGetEventIntakeDashboardResponse {
  bridge: EventIntakeBridge;
}

export type AdminCreateMarketingContentDraftPayload =
  AdminCreateMarketingContentDraftCallablePayload;

export interface AdminCreateMarketingContentDraftResponse {
  draft: MarketingContentDraft;
  bridge: MarketingOpsBridge;
  dashboardPath: string;
}

export type EventIntakeTargetType =
  | "source_profile"
  | "query_template"
  | "run_plan"
  | "source_result"
  | "event_candidate";

export type EventIntakeDecision =
  | "approve"
  | "needs_changes"
  | "hold"
  | "reject";

export interface AdminRecordEventIntakeReviewDecisionPayload {
  targetType: EventIntakeTargetType;
  targetId: string;
  decision: EventIntakeDecision;
  runId?: string | null;
  note: string;
  edits?: Record<string, unknown>;
  checklist: {
    sourceReviewed: boolean;
    dateReviewed: boolean;
    venueReviewed: boolean;
    copyReviewed: boolean;
    rightsReviewed: boolean;
    noCatchHostingImplied: boolean;
  };
}

export interface AdminRecordEventIntakeReviewDecisionResponse {
  decisionId: string;
  targetType: EventIntakeTargetType;
  targetId: string;
  decision: EventIntakeDecision;
  decisionStatus: "approved" | "needs_changes" | "held" | "rejected";
  decisionPath: string;
}

export type AdminRecordMarketingReviewDecisionPayload =
  AdminRecordMarketingReviewDecisionCallablePayload;

export type AdminRecordMarketingReviewDecisionResponse =
  AdminRecordMarketingReviewDecisionCallableResponse;
import type {AdminGetOverviewCallableResponse} from
  "../../generated/contracts/adminGetOverviewCallableResponse";
import type {AdminDecideAccessApplicationCallablePayload} from
  "../../generated/contracts/adminDecideAccessApplicationCallablePayload";
import type {AdminDecideAccessApplicationCallableResponse} from
  "../../generated/contracts/adminDecideAccessApplicationCallableResponse";
import type {AdminSetAdminUserRolesCallablePayload} from
  "../../generated/contracts/adminSetAdminUserRolesCallablePayload";
import type {AdminSetAdminUserRolesCallableResponse} from
  "../../generated/contracts/adminSetAdminUserRolesCallableResponse";
import type {AdminDecideSafetyTriageItemCallablePayload} from
  "../../generated/contracts/adminDecideSafetyTriageItemCallablePayload";
import type {AdminDecideSafetyTriageItemCallableResponse} from
  "../../generated/contracts/adminDecideSafetyTriageItemCallableResponse";
import type {AdminAssignSafetyTriageItemCallablePayload} from
  "../../generated/contracts/adminAssignSafetyTriageItemCallablePayload";
import type {AdminAssignSafetyTriageItemCallableResponse} from
  "../../generated/contracts/adminAssignSafetyTriageItemCallableResponse";
import type {AdminCreateMarketingContentDraftCallablePayload} from
  "../../generated/contracts/adminCreateMarketingContentDraftCallablePayload";
import type {AdminCreateOrganizerDraftFromCandidateCallablePayload} from
  "../../generated/contracts/adminCreateOrganizerDraftFromCandidateCallablePayload";
import type {AdminCreateOrganizerDraftFromCandidateCallableResponse} from
  "../../generated/contracts/adminCreateOrganizerDraftFromCandidateCallableResponse";
import type {AdminRecordMarketingReviewDecisionCallablePayload} from
  "../../generated/contracts/adminRecordMarketingReviewDecisionCallablePayload";
import type {AdminRecordMarketingReviewDecisionCallableResponse} from
  "../../generated/contracts/adminRecordMarketingReviewDecisionCallableResponse";
