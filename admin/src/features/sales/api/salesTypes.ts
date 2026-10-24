export type SalesResearchStatus =
  | "new" | "needs_research" | "ready_for_review" | "qualified"
  | "benchmark_only" | "no_fit" | "archived";

export type SalesTaskStatus = "open" | "completed" | "cancelled";
export type SalesTaskKind = "research" | "reply" | "follow_up" | "demo" |
  "pilot" | "duplicate_review" | "opt_out" | "service_commitment";
export type SalesActivityType = "note" | "reply" | "call" | "demo" |
  "pilot" | "correction" | "outreach_sent_manual";

export interface SalesAccountSummary {
  organizerId: string;
  name: string;
  city?: string | null;
  market?: string | null;
  marketLabel?: string | null;
  eventTypes?: string[];
  researchStatus: SalesResearchStatus;
  fitLabel?: string | null;
  stage?: string | null;
  assignedOwnerUid?: string | null;
  nextAction?: string | null;
  suppressionStatus?: "clear" | "held" | "suppressed";
}

export interface SalesAccount {
  organizerId: string;
  revision: number;
  researchStatus: SalesResearchStatus;
  assignedOwnerUid?: string | null;
  summary?: string | null;
  nextAction?: string | null;
  suppressionStatus?: "clear" | "held" | "suppressed";
}

export interface SalesOrganizerSummary {
  name: string;
  city?: string | null;
  market?: string | null;
  marketLabel?: string | null;
  eventTypes?: string[];
  appVisibility?: string | null;
  claimStatus?: string | null;
}

export interface SalesActivity {
  activityId: string;
  type: SalesActivityType;
  occurredAt: string;
  note: string;
  channel?: "email" | "whatsapp" | "other" | null;
  outcome?: "actor_attested_sent" | null;
  providerConfirmed?: boolean;
}

export interface SalesTask {
  taskId: string;
  organizerId: string;
  kind: SalesTaskKind;
  title: string;
  dueAt: string | null;
  ownerUid: string;
  status: SalesTaskStatus;
  revision: number;
  contactId?: string | null;
  reason?: string | null;
}

export interface SalesOpportunity {
  opportunityId: string;
  organizerId: string;
  motion: string;
  stage: string;
  ownerUid: string;
  nextStep: string | null;
  nextStepAt: string | null;
  revision: number;
}

export interface SalesAccountDetail {
  account: SalesAccount;
  organizerSummary: SalesOrganizerSummary;
  activities: SalesActivity[];
  opportunities: SalesOpportunity[];
  tasks: SalesTask[];
  customValues?: SalesCustomFieldValue[];
}

export type SalesCustomFieldType = "string" | "number" | "boolean" | "date" | "enum";

export interface SalesContact {
  contactId: string;
  displayName: string;
  relationship: {
    revision: number;
    role: string;
    decisionInfluence: "unknown" | "decision_maker" | "influencer" | "operator";
    primary: boolean;
    contactabilityStatus: "unknown" | "draft_reviewed" | "held" | "suppressed";
    contactabilityReason?: string | null;
    draftReviewEvidenceId?: string | null;
    sendAuthority: false;
    endpoints?: Array<{kind: "email" | "phone"; value: string;
      verificationStatus: "unverified" | "verified"; evidenceId?: string | null}>;
  };
}

export interface SalesEvidence {
  evidenceId: string;
  organizerId: string;
  contactId: string | null;
  claimKey: "identity" | "recurrence" | "operation" | "stack" | "other";
  signalId: string | null;
  sourceType: "first_party" | "public_web" | "human_note" | "import_artifact";
  sourceRef: string;
  observedAt: string;
  validThrough: string | null;
  confidence: "high" | "medium" | "low";
  normalizedValue: string | null;
  excerpt: string | null;
}

export interface SalesContactInput {
  organizerId: string;
  requestId: string;
  contactId?: string;
  expectedRevision: number;
  linkExisting?: boolean;
  contact: {displayName: string};
  relationship: Pick<SalesContact["relationship"],
    "role" | "decisionInfluence" | "primary" | "endpoints">;
}

export interface SalesEvidenceInput {
  organizerId: string;
  contactId?: string | null;
  requestId: string;
  claimKey: SalesEvidence["claimKey"];
  signalId?: string;
  sourceType: SalesEvidence["sourceType"];
  sourceRef: string;
  observedAt: string;
  validThrough?: string | null;
  confidence: SalesEvidence["confidence"];
  normalizedValue?: string | null;
  excerpt?: string | null;
}

export interface SalesImportPacket {
  sourceId: string;
  contentHash: string;
  mappingVersion: string;
  rows: Array<{sourceRowId: string; organizerId: string | null;
    name: string; researchStatus: SalesResearchStatus; summary?: string | null;
    originalScore?: Record<string, string | number | boolean | null> | null;
    originalCells?: Array<{column: string; value: string}>}>;
}

export interface SalesImportPreview {
  previewHash: string;
  rows: Array<{sourceRowId: string; organizerId: string | null;
    disposition: "created" | "matched" | "duplicate" | "unresolved" | "rejected";
    reason: string; accountRevision: number | null}>;
  counts: Record<string, number>;
  effectsApplied: false;
}

export interface SalesImportCompensationInput {
  importId: string;
  organizerId: string;
}

export interface SalesImportCompensationPreview extends
  SalesImportCompensationInput {
  mode: "archive_companion" | "remove_cohorts" | "blocked";
  blockers: string[];
  accountRevision: number | null;
  cohortIdsRemoved: string[];
  previewHash: string;
  alreadyCompensated: boolean;
}

export interface SalesImportCompensationResult extends
  SalesImportCompensationInput {
  status: "compensated" | "already_compensated";
  mode?: "archive_companion" | "remove_cohorts";
  cohortIdsRemoved?: string[];
  accountRevision?: number;
  receipt: {requestId: string; revision: number | null};
}

export interface SalesCustomFieldDefinition {
  fieldId: string;
  label: string;
  type: SalesCustomFieldType;
  recordType: "account";
  helpText?: string | null;
  enumOptions?: string[];
  revision: number;
}

export interface SalesCustomFieldValue {
  fieldId: string;
  value: string | number | boolean | null;
  revision: number;
}

export interface SalesCreateCustomFieldInput {
  requestId: string;
  field: Pick<SalesCustomFieldDefinition,
    "fieldId" | "label" | "type" | "recordType" | "helpText" | "enumOptions">;
}

export interface SalesSetCustomFieldValueInput {
  organizerId: string;
  requestId: string;
  expectedRevision: number;
  fieldId: string;
  value: string | number | boolean;
}

export interface SalesPage<T> {
  rows: T[];
  nextCursor: string | null;
}

export interface SalesListAccountsInput {
  limit?: 25 | 50;
  cursor?: string;
  query?: string;
  ownerUid?: string;
  researchStatus?: SalesResearchStatus;
}

export interface SalesListTasksInput {
  limit?: 25 | 50;
  cursor?: string;
  status?: SalesTaskStatus;
  ownerUid?: string;
}

export interface SalesListOpportunitiesInput {
  limit?: number;
  cursor?: string;
  stage?: string;
  ownerUid?: string;
}

export type SalesInboundStatus = "needs_identity_review" | "linked" | "dismissed";

export interface SalesInboundIntent {
  source?: "website" | "partner";
  intentId: string;
  revision: number;
  status: SalesInboundStatus;
  fullName: string;
  city: string | null;
  createdAt: string;
  organizerId: string | null;
  evidenceStatus: "self_reported";
  hostApplication: Record<string, unknown> | null;
}

export interface SalesListInboundIntentsInput {
  limit?: number;
  cursor?: string;
  status?: SalesInboundStatus;
}

export interface SalesLinkInboundIntentInput {
  intentId: string;
  organizerId: string;
  requestId: string;
  expectedRevision: number;
}

export interface SalesUpdateAccountInput {
  organizerId: string;
  requestId: string;
  expectedRevision: number;
  patch: Partial<Pick<SalesAccount,
    "researchStatus" | "assignedOwnerUid" | "summary" | "nextAction">>;
}

export interface SalesUpsertTaskInput {
  organizerId: string;
  taskId?: string;
  requestId: string;
  expectedRevision: number;
  task: Pick<SalesTask, "kind" | "title" | "dueAt" | "ownerUid" | "status"> &
    {contactId?: string | null};
}

export interface SalesUpsertOpportunityInput {
  financeAttestationId?: string;
  transitionReason?: string;
  organizerId: string;
  opportunityId?: string;
  requestId: string;
  expectedRevision: number;
  fields: Pick<SalesOpportunity,
    "motion" | "stage" | "ownerUid" | "nextStep" | "nextStepAt">;
}

export interface SalesRecordActivityInput {
  organizerId: string;
  requestId: string;
  type: SalesActivityType;
  occurredAt: string;
  note: string;
  opportunityId?: string;
  channel?: "email" | "whatsapp" | "other";
  attestation?: "sent_elsewhere_by_actor";
}

export interface SalesCreateAccountInput {
  organizerId: string;
  requestId: string;
}

/** A new organizer for Supply Intake; a name, a link, or both. */
export interface SalesNominateOrganizerInput {
  requestId: string;
  name: string | null;
  market: string;
  urls: string[];
  notes: string | null;
  categories: string[];
}

export interface SalesNomination {
  requestId: string;
  created: boolean;
  status: "queued";
}

export interface SalesSetAccountSuppressionInput {
  organizerId: string;
  requestId: string;
  expectedRevision: number;
  status: "clear" | "held" | "suppressed";
  reason: string;
}

export interface SalesSetContactabilityInput {
  organizerId: string;
  contactId: string;
  requestId: string;
  expectedRevision: number;
  status: SalesContact["relationship"]["contactabilityStatus"];
  reason: string;
  evidenceId?: string;
}

export interface SalesEvidenceProposal {
  proposalId: string;
  organizerId: string;
  revision: number;
  status: "pending" | "accepted" | "rejected";
  evidence: Omit<SalesEvidenceInput, "requestId">;
  createdAt: string;
  clientId: string | null;
  reviewReason: string | null;
}
export interface SalesReviewEvidenceProposalInput {
  organizerId: string;
  proposalId: string;
  requestId: string;
  expectedRevision: number;
  decision: "accept" | "reject";
  reason: string;
}
