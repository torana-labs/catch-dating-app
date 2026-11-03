import {createHash} from "crypto";
import {eventPolicyFromEvent} from "../events/eventPolicy";
import {isEventPolicyTerms, isEventTimeRange, TimedEventDocument} from
  "../events/configuredEvent";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import type {EventAssistanceDeliveryWork} from
  "../shared/generated/eventAssistanceDeliveryWork";
import type {
  EventDocument,
  EventParticipationDocument,
  HostPaymentAccountDocument,
  OrganizerApplicationDocument,
  OrganizerAttentionItemDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
  ProviderSyncRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  hostAttentionPolicyCatalog,
} from "../shared/generated/catalogs/hostAttentionPolicyCatalog";

export type HostPaymentProvider = "razorpay" | "stripe";

/** One open attention item as the derivation produces it, with millisecond
 *  times. The evaluator turns it into an `organizerAttentionItems` row. */
export interface DesiredHostAttentionItem {
  attentionId: string;
  kind: OrganizerAttentionItemDocument["kind"];
  scope: OrganizerAttentionItemDocument["scope"];
  sourceOwner: OrganizerAttentionItemDocument["sourceOwner"];
  sourceId: string;
  sourceRevision: string;
  eventId: string | null;
  status: "open";
  consequence: OrganizerAttentionItemDocument["consequence"];
  blocking: boolean;
  urgency: OrganizerAttentionItemDocument["urgency"];
  destination: OrganizerAttentionItemDocument["destination"];
  context: OrganizerAttentionItemDocument["context"];
  dedupeKey: string;
  policyVersion: number;
  resolutionVersion: number;
  assignedHostUid: string | null;
  openedAtMillis: number;
  dueAtMillis: number;
  expiresAtMillis: number | null;
  sourceUpdatedAtMillis: number;
}

export interface AttentionSourceRow<T> {
  id: string;
  data: T;
  sourceUpdatedAtMillis: number;
}

export interface DeliveryReviewAttentionSource {
  workItemId: string;
  revision: number;
  candidateHash: string;
  reviewDueAtMillis: number;
  payload: EventAssistanceDeliveryWork & {
    checkpoint: Extract<
      EventAssistanceDeliveryWork["checkpoint"],
      {phase: "review"}
    >;
  };
}

/** Facts a fired staffAttention moment send contributes to the Today
 *  projection, reduced from the organizerMomentSends journal row. */
export interface MomentAttentionSendSource {
  runId: string;
  momentId: string;
  scopeKind: "event" | "program";
  scopeId: string;
  duty: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  createdAtMillis: number;
}

/** Facts an offered organizer event offer contributes to the unpaid-payment
 *  follow-up item, reduced from the organizerEventOffers document. */
export interface OfferAttentionSource {
  offerId: string;
  eventId: string;
  status: string;
  generation: number;
  revision: number;
  expiresAtMillis: number;
  offeredAtMillis: number;
  expectedAmountMinor: number;
  currency: string | null;
  manualPaymentStatus: string;
  updatedAtMillis: number;
}

export interface OrganizerAttentionSources {
  organizer: AttentionSourceRow<OrganizerDocument>;
  events: Array<AttentionSourceRow<EventDocument>>;
  eventAssistanceCases: Array<
    AttentionSourceRow<EventAssistanceCaseDocument>
  >;
  deliveryReviewWorkItems: Array<
    AttentionSourceRow<DeliveryReviewAttentionSource>
  >;
  eventParticipations: Array<AttentionSourceRow<EventParticipationDocument>>;
  applications: Array<AttentionSourceRow<OrganizerApplicationDocument>>;
  providerSyncRuns: Array<AttentionSourceRow<ProviderSyncRunDocument>>;
  automationRules: Array<
    AttentionSourceRow<OrganizerFormAutomationRuleDocument>
  >;
  automationRuns: Array<
    AttentionSourceRow<OrganizerFormAutomationRunDocument>
  >;
  paymentAccounts: Partial<Record<
    HostPaymentProvider,
    AttentionSourceRow<HostPaymentAccountDocument>
  >>;
  momentAttentionSends: Array<
    AttentionSourceRow<MomentAttentionSendSource>
  >;
  eventOffers: Array<AttentionSourceRow<OfferAttentionSource>>;
}

const hourMillis = 60 * 60 * 1000;
const immediateMillis = hostAttentionPolicyCatalog.immediateHours * hourMillis;
const soonMillis = hostAttentionPolicyCatalog.soonHours * hourMillis;
export const hostAttentionHorizonMillis =
  hostAttentionPolicyCatalog.horizonHours * hourMillis;
export const momentAttentionWindowMillis = 24 * hourMillis;
export const minEvaluationDelayMillis = 60 * 1000;
export const maxEvaluationDelayMillis = 24 * hourMillis;

export interface OrganizerAttentionDerivation {
  items: DesiredHostAttentionItem[];
  /** Earliest instant after now at which the items could change with no
   *  source write, clamped to [now + 60 s, now + 24 h]; null when no input
   *  can change with time. */
  nextChangeAtMillis: number | null;
}

/**
 * Derives every source-backed server item from one complete bounded snapshot,
 * and when that snapshot next needs evaluating without a source write.
 */
export function deriveOrganizerAttention(params: {
  organizerId: string;
  nowMillis: number;
  sources: OrganizerAttentionSources;
}): OrganizerAttentionDerivation {
  const items = deriveOrganizerAttentionItems(params);
  return {
    items,
    nextChangeAtMillis: nextAttentionChangeAtMillis({
      nowMillis: params.nowMillis,
      sources: params.sources,
      items,
    }),
  };
}

/**
 * Lists every time at which the derivation's output can change by itself:
 * urgency boundaries, due and expiry times of produced items, event start,
 * end and horizon entry, offer expiry and follow-up, provider run expiry,
 * moment send windows and delivery review due times.
 */
export function nextAttentionChangeAtMillis(params: {
  nowMillis: number;
  sources: OrganizerAttentionSources;
  items: readonly DesiredHostAttentionItem[];
}): number | null {
  const {nowMillis, sources, items} = params;
  const candidates: number[] = [];
  for (const item of items) {
    candidates.push(item.dueAtMillis - soonMillis,
      item.dueAtMillis - immediateMillis, item.dueAtMillis);
    if (item.expiresAtMillis !== null) candidates.push(item.expiresAtMillis);
  }
  for (const row of sources.events) {
    if (!isEventTimeRange(row.data) || row.data.status !== "active") continue;
    const startMillis = row.data.startTime.toMillis();
    candidates.push(startMillis, row.data.endTime.toMillis());
    // Only an event still beyond the horizon has a future entry time.
    candidates.push(startMillis - hostAttentionHorizonMillis);
  }
  for (const row of sources.eventOffers) {
    candidates.push(row.data.expiresAtMillis,
      offerFollowUpDueAtMillis(row.data));
  }
  for (const row of sources.providerSyncRuns) {
    candidates.push(row.data.expiresAt.toMillis());
  }
  for (const row of sources.momentAttentionSends) {
    candidates.push(row.data.createdAtMillis + momentAttentionWindowMillis);
  }
  for (const row of sources.deliveryReviewWorkItems) {
    candidates.push(row.data.reviewDueAtMillis);
  }
  const hasInputs = items.length > 0 || sources.events.length > 0 ||
    sources.eventOffers.length > 0 || sources.providerSyncRuns.length > 0 ||
    sources.momentAttentionSends.length > 0 ||
    sources.deliveryReviewWorkItems.length > 0;
  if (!hasInputs) return null;
  const future = candidates.filter((value) =>
    Number.isFinite(value) && value > nowMillis);
  const earliest = future.length > 0 ?
    Math.min(...future) : Number.POSITIVE_INFINITY;
  return Math.min(
    Math.max(earliest, nowMillis + minEvaluationDelayMillis),
    nowMillis + maxEvaluationDelayMillis
  );
}

/**
 * Derives every source-backed server item from one complete bounded snapshot.
 */
export function deriveOrganizerAttentionItems(params: {
  organizerId: string;
  nowMillis: number;
  sources: OrganizerAttentionSources;
}): DesiredHostAttentionItem[] {
  const horizonEndsAtMillis = params.nowMillis + hostAttentionHorizonMillis;
  const activeEvents = params.sources.events.filter((row): row is
    AttentionSourceRow<TimedEventDocument> =>
    isEventTimeRange(row.data) && row.data.status === "active" &&
    row.data.endTime.toMillis() > params.nowMillis &&
    row.data.startTime.toMillis() <= horizonEndsAtMillis
  );
  const items: DesiredHostAttentionItem[] = [];

  for (const row of activeEvents) {
    const event = row.data;
    const startMillis = event.startTime.toMillis();
    const endMillis = event.endTime.toMillis();
    const eventName = displayEventName(event);
    if (startMillis <= params.nowMillis && params.nowMillis < endMillis) {
      items.push(buildItem({
        kind: "eventLiveOperations",
        scope: "event",
        sourceOwner: "events",
        sourceId: row.id,
        sourceRevision: revisionOf({
          eventId: row.id,
          status: event.status,
          startMillis,
          endMillis,
        }),
        eventId: row.id,
        consequence: "blocksLiveOperation",
        blocking: true,
        dueAtMillis: startMillis,
        expiresAtMillis: endMillis,
        destination: destination({
          route: "hostEventManage",
          section: "live",
          eventId: row.id,
        }),
        context: context({eventName}),
        dedupeKey: `eventLiveOperations:${row.id}`,
        assignedHostUid: null,
        sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        nowMillis: params.nowMillis,
      }));
    }

    const policy = isEventPolicyTerms(event) ?
      eventPolicyFromEvent(event) : null;
    const waitlistedCount = event.waitlistedCount ?? 0;
    if (waitlistedCount > 0 &&
        policy && policy.admission.manualApprovalRequired !== true) {
      items.push(buildItem({
        kind: "eventWaitlistReview",
        scope: "event",
        sourceOwner: "events",
        sourceId: row.id,
        sourceRevision: revisionOf({
          eventId: row.id,
          waitlistedCount,
          capacityLimit: event.capacityLimit,
          admissionFormat: policy.admission.format,
          waitlistMode: policy.admission.waitlistPolicy?.mode ?? null,
          manualApprovalRequired: false,
          startMillis,
          endMillis,
        }),
        eventId: row.id,
        consequence: "risksGuestExperience",
        blocking: false,
        dueAtMillis:
          startMillis - hostAttentionPolicyCatalog.immediateHours * hourMillis,
        expiresAtMillis: endMillis,
        destination: destination({
          route: "hostEventManage",
          section: "guests",
          eventId: row.id,
        }),
        context: context({eventName, count: waitlistedCount}),
        dedupeKey: `eventWaitlistReview:${row.id}`,
        assignedHostUid: null,
        sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        nowMillis: params.nowMillis,
      }));
    }
  }

  const activeEventsById = new Map(activeEvents.map((row) => [row.id, row]));
  const openPracticalCasesByEvent = new Map<
    string,
    Array<AttentionSourceRow<EventAssistanceCaseDocument>>
  >();
  for (const row of params.sources.eventAssistanceCases) {
    const helpCase = row.data;
    if (helpCase.owner !== "eventLead" || helpCase.status !== "open" ||
        helpCase.context.organizerId !== params.organizerId ||
        !activeEventsById.has(helpCase.context.eventId)) continue;
    const cases = openPracticalCasesByEvent.get(helpCase.context.eventId) ?? [];
    cases.push(row);
    openPracticalCasesByEvent.set(helpCase.context.eventId, cases);
  }
  for (const [eventId, cases] of openPracticalCasesByEvent) {
    const event = activeEventsById.get(eventId)!;
    const ordered = [...cases].sort((left, right) =>
      left.data.receivedAt - right.data.receivedAt ||
      left.id.localeCompare(right.id));
    items.push(buildItem({
      kind: "eventAssistanceCaseReview",
      scope: "event",
      sourceOwner: "eventAssistanceCases",
      sourceId: eventId,
      sourceRevision: revisionOf({
        eventId,
        startMillis: event.data.startTime.toMillis(),
        endMillis: event.data.endTime.toMillis(),
        cases: ordered.map((row) => ({
          id: row.id,
          receivedAt: row.data.receivedAt,
          handling: "handling" in row.data ? {
            revision: row.data.handling.revision,
            assigneeUid: row.data.handling.assigneeUid,
            updatedAt: row.data.handling.updatedAt,
          } : null,
          sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        })),
      }),
      eventId,
      consequence: "risksGuestExperience",
      blocking: false,
      dueAtMillis: ordered[0].data.receivedAt,
      expiresAtMillis: event.data.endTime.toMillis(),
      destination: destination({
        route: "hostEventManage",
        section: "live",
        eventId,
      }),
      context: context({
        eventName: displayEventName(event.data),
        count: ordered.length,
      }),
      dedupeKey: `eventAssistanceCaseReview:${eventId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        event.sourceUpdatedAtMillis,
        ...ordered.map((row) => row.sourceUpdatedAtMillis)
      ),
      nowMillis: params.nowMillis,
    }));
  }

  const deliveryReviewsByEvent = new Map<
    string,
    Array<AttentionSourceRow<DeliveryReviewAttentionSource>>
  >();
  for (const row of params.sources.deliveryReviewWorkItems) {
    const review = row.data;
    const context = review.payload.scope.context;
    if (review.payload.checkpoint.phase !== "review" ||
        context.organizerId !== params.organizerId ||
        !activeEventsById.has(context.eventId)) continue;
    const reviews = deliveryReviewsByEvent.get(context.eventId) ?? [];
    reviews.push(row);
    deliveryReviewsByEvent.set(context.eventId, reviews);
  }
  for (const [eventId, reviews] of deliveryReviewsByEvent) {
    const event = activeEventsById.get(eventId)!;
    const ordered = [...reviews].sort((left, right) =>
      left.data.reviewDueAtMillis - right.data.reviewDueAtMillis ||
      left.id.localeCompare(right.id));
    const endMillis = event.data.endTime.toMillis();
    items.push(buildItem({
      kind: "eventAssistanceDeliveryReview",
      scope: "event",
      sourceOwner: "operationWorkItems",
      sourceId: eventId,
      sourceRevision: revisionOf({
        eventId,
        startMillis: event.data.startTime.toMillis(),
        endMillis,
        reviews: ordered.map((row) => ({
          workItemId: row.data.workItemId,
          revision: row.data.revision,
          candidateHash: row.data.candidateHash,
          reason: row.data.payload.checkpoint.reason,
          messageRevision: row.data.payload.checkpoint.messageRevision,
          messageHash: row.data.payload.checkpoint.messageHash,
          reviewDueAtMillis: row.data.reviewDueAtMillis,
          sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        })),
      }),
      eventId,
      consequence: "risksGuestExperience",
      blocking: false,
      dueAtMillis: Math.min(ordered[0].data.reviewDueAtMillis, endMillis),
      expiresAtMillis: endMillis,
      destination: destination({
        route: "hostEventManage",
        section: "live",
        eventId,
      }),
      context: context({
        eventName: displayEventName(event.data),
        count: ordered.length,
      }),
      dedupeKey: `eventAssistanceDeliveryReview:${eventId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        event.sourceUpdatedAtMillis,
        ...ordered.map((row) => row.sourceUpdatedAtMillis)
      ),
      nowMillis: params.nowMillis,
    }));
  }

  const pendingRequestsByEvent = new Map<
    string,
    Array<AttentionSourceRow<EventParticipationDocument>>
  >();
  for (const row of params.sources.eventParticipations) {
    if (row.data.status !== "waitlisted" ||
        row.data.hostApprovalStatus !== "pending") continue;
    const event = activeEventsById.get(row.data.eventId);
    if (!event || !isEventPolicyTerms(event.data) ||
        eventPolicyFromEvent(event.data).admission.manualApprovalRequired !==
          true) continue;
    const requests = pendingRequestsByEvent.get(row.data.eventId) ?? [];
    requests.push(row);
    pendingRequestsByEvent.set(row.data.eventId, requests);
  }
  for (const [eventId, requests] of pendingRequestsByEvent) {
    const event = activeEventsById.get(eventId)!;
    const ordered = [...requests].sort((left, right) =>
      requestOpenedAtMillis(left) - requestOpenedAtMillis(right) ||
      left.id.localeCompare(right.id));
    items.push(buildItem({
      kind: "eventJoinRequestReview",
      scope: "event",
      sourceOwner: "eventParticipations",
      sourceId: eventId,
      sourceRevision: revisionOf({
        eventId,
        startMillis: event.data.startTime.toMillis(),
        endMillis: event.data.endTime.toMillis(),
        requests: ordered.map((row) => ({
          id: row.id,
          requestOpenedAtMillis: requestOpenedAtMillis(row),
          sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        })),
      }),
      eventId,
      consequence: "delaysResponse",
      blocking: false,
      dueAtMillis: requestOpenedAtMillis(ordered[0]) + 24 * hourMillis,
      expiresAtMillis: event.data.endTime.toMillis(),
      destination: destination({
        route: "hostEventManage",
        section: "guests",
        eventId,
      }),
      context: context({
        eventName: displayEventName(event.data),
        count: ordered.length,
      }),
      dedupeKey: `eventJoinRequestReview:${eventId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        event.sourceUpdatedAtMillis,
        ...ordered.map((row) => row.sourceUpdatedAtMillis)
      ),
      nowMillis: params.nowMillis,
    }));
  }

  const unpaidOffersByEvent = new Map<
    string,
    Array<AttentionSourceRow<OfferAttentionSource>>
  >();
  for (const row of params.sources.eventOffers) {
    const offer = row.data;
    if (offer.status !== "offered" ||
        offer.expectedAmountMinor <= 0 ||
        offer.manualPaymentStatus === "hostAttestedReceived" ||
        offer.expiresAtMillis <= params.nowMillis) continue;
    const rows = unpaidOffersByEvent.get(offer.eventId) ?? [];
    rows.push(row);
    unpaidOffersByEvent.set(offer.eventId, rows);
  }
  for (const [eventId, offers] of unpaidOffersByEvent) {
    const ordered = [...offers].sort((left, right) =>
      offerFollowUpDueAtMillis(left.data) -
        offerFollowUpDueAtMillis(right.data) ||
      left.id.localeCompare(right.id));
    const event = activeEventsById.get(eventId);
    items.push(buildItem({
      kind: "eventOfferPaymentFollowUp",
      scope: "event",
      sourceOwner: "organizerEventOffers",
      sourceId: eventId,
      sourceRevision: revisionOf({
        eventId,
        startMillis: event?.data.startTime.toMillis() ?? null,
        endMillis: event?.data.endTime.toMillis() ?? null,
        offers: ordered.map((row) => ({
          id: row.id,
          generation: row.data.generation,
          revision: row.data.revision,
          manualPaymentStatus: row.data.manualPaymentStatus,
          offeredAtMillis: row.data.offeredAtMillis,
          expectedAmountMinor: row.data.expectedAmountMinor,
          currency: row.data.currency,
          expiresAtMillis: row.data.expiresAtMillis,
          sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
        })),
      }),
      eventId,
      consequence: "risksRevenue",
      blocking: false,
      dueAtMillis: offerFollowUpDueAtMillis(ordered[0].data),
      expiresAtMillis: Math.max(
        ...ordered.map((row) => row.data.expiresAtMillis)),
      destination: destination({
        route: "hostEventManage",
        section: "guests",
        eventId,
      }),
      context: context({
        eventName: event ? displayEventName(event.data) : null,
        count: ordered.length,
      }),
      dedupeKey: `eventOfferPaymentFollowUp:${eventId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        ...ordered.map((row) => row.sourceUpdatedAtMillis)),
      nowMillis: params.nowMillis,
    }));
  }

  for (const row of params.sources.applications) {
    const application = row.data;
    if (application.reviewStatus !== "submitted" &&
        application.reviewStatus !== "inReview") continue;
    const eventId = application.targetKind === "event" ?
      application.targetId : null;
    items.push(buildItem({
      kind: "applicationReview",
      scope: "application",
      sourceOwner: "organizerApplications",
      sourceId: row.id,
      sourceRevision: String(application.revision),
      eventId,
      consequence: "delaysResponse",
      blocking: false,
      dueAtMillis: application.submittedAt.toMillis() + 24 * hourMillis,
      expiresAtMillis: null,
      destination: destination({
        route: "hostApplications",
        applicationId: row.id,
        eventId,
      }),
      context: context({subjectLabel: application.applicantDisplayName}),
      dedupeKey: `applicationReview:${row.id}`,
      assignedHostUid: application.assignedReviewerUid,
      sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
      nowMillis: params.nowMillis,
    }));
  }

  const latestProviderRuns = latestRows(
    params.sources.providerSyncRuns.filter((row) =>
      row.data.status !== "running" &&
      row.data.expiresAt.toMillis() > params.nowMillis &&
      activeEventsById.has(row.data.eventId)
    ),
    (row) => row.data.eventId,
    providerRunTime
  );
  for (const row of latestProviderRuns.values()) {
    const run = row.data;
    if (run.status !== "partial" && run.status !== "failed") continue;
    const event = activeEvents.find((candidate) =>
      candidate.id === run.eventId);
    items.push(buildItem({
      kind: "providerSyncFailure",
      scope: "event",
      sourceOwner: "providerSyncRuns",
      sourceId: row.id,
      sourceRevision: revisionOf({
        runId: row.id,
        inputHash: run.inputHash,
        status: run.status,
        completedAtMillis: run.completedAt?.toMillis() ?? null,
      }),
      eventId: run.eventId,
      consequence: "requiresReconciliation",
      blocking: false,
      dueAtMillis: providerRunTime(row),
      expiresAtMillis: run.expiresAt.toMillis(),
      destination: destination({
        route: "hostEventManage",
        section: "guests",
        eventId: run.eventId,
      }),
      context: context({
        eventName: event ? displayEventName(event.data) : null,
        provider: run.provider,
        errorCode: run.errorCode,
      }),
      dedupeKey: `providerSyncFailure:${run.eventId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: row.sourceUpdatedAtMillis,
      nowMillis: params.nowMillis,
    }));
  }

  const enabledRules = new Map(params.sources.automationRules
    .filter((row) => row.data.enabled)
    .map((row) => [automationRuleKey(
      row.data.formId,
      row.id,
      row.data.revision
    ), row]));
  const latestAutomationRuns = latestRows(
    params.sources.automationRuns.filter((row) =>
      row.data.status !== "pending" && row.data.status !== "running" &&
      enabledRules.has(automationRuleKey(
        row.data.formId,
        row.data.ruleId,
        row.data.ruleRevision
      ))
    ),
    (row) => automationRuleKey(
      row.data.formId,
      row.data.ruleId,
      row.data.ruleRevision
    ),
    (row) => row.data.updatedAt.toMillis()
  );
  for (const [key, row] of latestAutomationRuns) {
    const run = row.data;
    if (run.status !== "partiallyFailed" && run.status !== "failed") {
      continue;
    }
    const rule = enabledRules.get(key);
    if (!rule) continue;
    items.push(buildItem({
      kind: "formAutomationFailure",
      scope: run.formId ? "form" : "organizer",
      sourceOwner: "organizerFormAutomationRuns",
      sourceId: row.id,
      sourceRevision: revisionOf({
        runId: row.id,
        ruleRevision: run.ruleRevision,
        status: run.status,
        updatedAtMillis: run.updatedAt.toMillis(),
      }),
      eventId: null,
      consequence: "degradesAutomation",
      blocking: false,
      dueAtMillis: run.updatedAt.toMillis(),
      expiresAtMillis: null,
      destination: destination({
        route: "hostAudienceForms",
        section: "automations",
        formId: run.formId,
      }),
      context: context({
        subjectLabel: rule.data.name,
        errorCode: run.errorCode,
      }),
      dedupeKey: `formAutomationFailure:${run.formId}:${run.ruleId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        row.sourceUpdatedAtMillis,
        rule.sourceUpdatedAtMillis
      ),
      nowMillis: params.nowMillis,
    }));
  }

  // Moment staffAttention sends: one item per fired run, sourced from the
  // engine's own send journal rather than a parallel collection.
  const sendsByRun = new Map<
    string, Array<AttentionSourceRow<MomentAttentionSendSource>>
  >();
  for (const row of params.sources.momentAttentionSends) {
    const group = sendsByRun.get(row.data.runId) ?? [];
    group.push(row);
    sendsByRun.set(row.data.runId, group);
  }
  for (const [runId, rows] of sendsByRun) {
    const send = rows.reduce((a, b) =>
      a.data.createdAtMillis >= b.data.createdAtMillis ? a : b).data;
    const eventScope = send.scopeKind === "event";
    const consequence: DesiredHostAttentionItem["consequence"] =
      send.severity === "urgent" ? "risksGuestExperience" :
        send.severity === "warning" ? "delaysResponse" : "informational";
    items.push(buildItem({
      kind: "momentStaffAttention",
      scope: eventScope ? "event" : "organizer",
      sourceOwner: "organizerMomentSends",
      sourceId: `${send.scopeId}:${runId}`,
      sourceRevision: revisionOf({
        runId,
        duty: send.duty,
        severity: send.severity,
        createdAtMillis: send.createdAtMillis,
      }),
      eventId: eventScope ? send.scopeId : null,
      consequence,
      blocking: send.severity === "urgent",
      dueAtMillis: send.createdAtMillis,
      expiresAtMillis:
        send.createdAtMillis + momentAttentionWindowMillis,
      destination: eventScope ?
        destination({
          route: "hostEventManage",
          section: "live",
          eventId: send.scopeId,
        }) :
        destination({route: "hostProgramWork", section: "moments"}),
      context: context({
        subjectLabel: send.title,
        count: rows.length,
      }),
      dedupeKey: `momentStaffAttention:${runId}`,
      assignedHostUid: null,
      sourceUpdatedAtMillis: Math.max(
        ...rows.map((row) => row.sourceUpdatedAtMillis)),
      nowMillis: params.nowMillis,
    }));
  }

  items.push(...derivePayoutItems({
    organizerId: params.organizerId,
    nowMillis: params.nowMillis,
    organizer: params.sources.organizer,
    activeEvents,
    paymentAccounts: params.sources.paymentAccounts,
  }));

  return items.sort(compareAttentionItems);
}

function derivePayoutItems(params: {
  organizerId: string;
  nowMillis: number;
  organizer: AttentionSourceRow<OrganizerDocument>;
  activeEvents: Array<AttentionSourceRow<TimedEventDocument>>;
  paymentAccounts: OrganizerAttentionSources["paymentAccounts"];
}): DesiredHostAttentionItem[] {
  const paidByProvider = new Map<
    HostPaymentProvider,
    Array<AttentionSourceRow<TimedEventDocument>>
  >();
  for (const row of params.activeEvents) {
    if (!isEventPolicyTerms(row.data) || row.data.priceInPaise <= 0) {
      continue;
    }
    const provider = paymentProviderForCurrency(row.data.currency);
    const rows = paidByProvider.get(provider) ?? [];
    rows.push(row);
    paidByProvider.set(provider, rows);
  }
  const organizer = params.organizer.data;
  const ownerUid = organizer.ownership?.ownerUserId ??
    organizer.ownerUserId ?? organizer.hostUserId ?? null;
  const items: DesiredHostAttentionItem[] = [];
  for (const [provider, events] of paidByProvider) {
    const account = params.paymentAccounts[provider];
    if (account && paymentAccountReady(account.data)) continue;
    const ordered = [...events].sort((left, right) =>
      left.data.startTime.toMillis() - right.data.startTime.toMillis());
    const earliest = ordered[0];
    const earliestStartMillis = earliest.data.startTime.toMillis();
    const affectedEndMillis = Math.max(...ordered.map((row) =>
      row.data.endTime.toMillis()));
    items.push(buildItem({
      kind: "payoutSetup",
      scope: "account",
      sourceOwner: "hostPaymentAccounts",
      sourceId: `${ownerUid ?? params.organizerId}:${provider}`,
      sourceRevision: revisionOf({
        ownerUid,
        provider,
        account: account ? {
          id: account.id,
          chargesEnabled: account.data.chargesEnabled,
          payoutsEnabled: account.data.payoutsEnabled,
          detailsSubmitted: account.data.detailsSubmitted,
          onboardingStatus: account.data.onboardingStatus,
          requirementsCurrentlyDue: account.data.requirementsCurrentlyDue,
          requirementsPastDue: account.data.requirementsPastDue,
          updatedAtMillis: account.data.updatedAt.toMillis(),
        } : null,
        events: ordered.map((row) => ({
          id: row.id,
          startMillis: row.data.startTime.toMillis(),
          endMillis: row.data.endTime.toMillis(),
          priceInPaise: row.data.priceInPaise,
          currency: row.data.currency ?? "INR",
        })),
      }),
      eventId: earliest.id,
      consequence: "risksRevenue",
      blocking: true,
      dueAtMillis:
        earliestStartMillis - hostAttentionPolicyCatalog.soonHours * hourMillis,
      expiresAtMillis: affectedEndMillis,
      destination: destination({route: "hostOrganizerPayments"}),
      context: context({
        eventName: displayEventName(earliest.data),
        count: ordered.length,
        provider,
      }),
      dedupeKey: `payoutSetup:${params.organizerId}:${provider}`,
      assignedHostUid: ownerUid,
      sourceUpdatedAtMillis: Math.max(
        params.organizer.sourceUpdatedAtMillis,
        account?.sourceUpdatedAtMillis ?? 0,
        ...ordered.map((row) => row.sourceUpdatedAtMillis)
      ),
      nowMillis: params.nowMillis,
    }));
  }
  return items;
}

function buildItem(params: Omit<
  DesiredHostAttentionItem,
  | "attentionId"
  | "status"
  | "urgency"
  | "policyVersion"
  | "resolutionVersion"
  | "openedAtMillis"
> & {nowMillis: number}): DesiredHostAttentionItem {
  return {
    attentionId: attentionId(params.dedupeKey),
    kind: params.kind,
    scope: params.scope,
    sourceOwner: params.sourceOwner,
    sourceId: params.sourceId,
    sourceRevision: params.sourceRevision,
    eventId: params.eventId,
    status: "open",
    consequence: params.consequence,
    blocking: params.blocking,
    urgency: urgencyFor(params.dueAtMillis, params.nowMillis),
    destination: params.destination,
    context: params.context,
    dedupeKey: params.dedupeKey,
    policyVersion: hostAttentionPolicyCatalog.policyVersion,
    resolutionVersion: 1,
    assignedHostUid: params.assignedHostUid,
    openedAtMillis: params.nowMillis,
    dueAtMillis: params.dueAtMillis,
    expiresAtMillis: params.expiresAtMillis,
    sourceUpdatedAtMillis: params.sourceUpdatedAtMillis,
  };
}

type AttentionDestination = DesiredHostAttentionItem["destination"];
type AttentionContext = DesiredHostAttentionItem["context"];

function destination(values: Partial<AttentionDestination> & {
  route: AttentionDestination["route"];
}): AttentionDestination {
  return {
    route: values.route,
    section: values.section ?? null,
    eventId: values.eventId ?? null,
    applicationId: values.applicationId ?? null,
    formId: values.formId ?? null,
    threadId: values.threadId ?? null,
  };
}

function context(
  values: Partial<AttentionContext>
): AttentionContext {
  return {
    eventName: values.eventName ?? null,
    subjectLabel: values.subjectLabel ?? null,
    count: values.count ?? null,
    provider: values.provider ?? null,
    errorCode: values.errorCode ?? null,
  };
}

function latestRows<T>(
  rows: Array<AttentionSourceRow<T>>,
  keyOf: (row: AttentionSourceRow<T>) => string,
  timeOf: (row: AttentionSourceRow<T>) => number
): Map<string, AttentionSourceRow<T>> {
  const latest = new Map<string, AttentionSourceRow<T>>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = latest.get(key);
    if (!existing || timeOf(row) > timeOf(existing) ||
        timeOf(row) === timeOf(existing) && row.id > existing.id) {
      latest.set(key, row);
    }
  }
  return latest;
}

function providerRunTime(
  row: AttentionSourceRow<ProviderSyncRunDocument>
): number {
  return row.data.completedAt?.toMillis() ?? row.data.startedAt.toMillis();
}

function requestOpenedAtMillis(
  row: AttentionSourceRow<EventParticipationDocument>
): number {
  return row.data.waitlistedAt?.toMillis() ?? row.data.createdAt.toMillis();
}

/** One payment-collection reminder due time per unpaid offer: a grace day
 *  after issuance, never past the offer's own expiry. */
function offerFollowUpDueAtMillis(offer: OfferAttentionSource): number {
  return Math.min(
    offer.offeredAtMillis + immediateMillis,
    offer.expiresAtMillis
  );
}

function automationRuleKey(
  formId: string | null,
  ruleId: string,
  revision: number
): string {
  return `${formId}:${ruleId}:${revision}`;
}

function paymentProviderForCurrency(
  currency: string | undefined
): HostPaymentProvider {
  return (currency ?? "INR").toUpperCase() === "INR" ?
    "razorpay" : "stripe";
}

function paymentAccountReady(account: HostPaymentAccountDocument): boolean {
  return account.chargesEnabled && account.payoutsEnabled &&
    account.detailsSubmitted && account.onboardingStatus === "complete" &&
    account.requirementsCurrentlyDue.length === 0 &&
    account.requirementsPastDue.length === 0;
}

function displayEventName(event: EventDocument): string {
  return event.name?.trim() || event.meetingPoint?.trim() || "Event";
}

function urgencyFor(
  dueAtMillis: number,
  nowMillis: number
): DesiredHostAttentionItem["urgency"] {
  const remaining = dueAtMillis - nowMillis;
  if (remaining <= immediateMillis) return "immediate";
  if (remaining <= soonMillis) return "soon";
  return "upcoming";
}

function compareAttentionItems(
  left: DesiredHostAttentionItem,
  right: DesiredHostAttentionItem
): number {
  const rank = {immediate: 0, soon: 1, upcoming: 2} as const;
  return rank[left.urgency] - rank[right.urgency] ||
    Number(right.blocking) - Number(left.blocking) ||
    left.dueAtMillis - right.dueAtMillis ||
    left.attentionId.localeCompare(right.attentionId);
}

function attentionId(dedupeKey: string): string {
  return `attention_${createHash("sha256").update(dedupeKey)
    .digest("hex").slice(0, 40)}`;
}

function revisionOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value))
    .digest("hex");
}
