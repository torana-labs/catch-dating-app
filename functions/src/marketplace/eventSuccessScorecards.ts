import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import type {
  BlockDocument,
  EventDocument,
  EventInviteLinkDocument,
  EventParticipationDocument,
  EventSuccessConversationGraphDocument,
  EventWaitlistOfferDocument,
  MatchDocument,
  PaymentDocument,
  SwipeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  schemaProfileDecisionCollectionPath,
  schemaProfileDecisionOutgoingSubcollectionPath,
} from "../shared/generated/schemaPaths";
import {buildFeedbackSignalFact} from "./signalBuilders";
import {
  recordParticipantSignalFactsBestEffort,
} from "./participantSignals";

const eventSuccessFeedbackCollection = "eventSuccessFeedback";
const eventSuccessConversationGraphsCollection =
  "eventSuccessConversationGraphs";
const eventSuccessScorecardsCollection = "eventSuccessScorecards";
const eventSafetyReportsCollection = "eventSafetyReports";
const MIN_FEEDBACK_FOR_HOST_SAFETY_COUNT = 5;
const MAX_IN_FILTER_VALUES = 30;
const activeParticipationStatuses = new Set(["signedUp", "attended"]);

interface EventSuccessFeedbackDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  welcomeRating: number;
  structureRating: number;
  metNewPeopleCount: number;
  safetyConcern: boolean;
  privateNote?: string | null;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface EventSuccessScorecardDocument {
  eventId: string;
  organizerId: string;
  bookedCount: number;
  checkedInCount: number;
  feedbackCount: number;
  attendeesWhoMetTwoPlusPeople: number;
  catchSentCount: number;
  attendeesWhoCaughtSomeone: number;
  catchRecipientCount: number;
  catchRate: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  averageWelcomeRating: number;
  averageStructureRating: number;
  safetyIncidentCount: number;
  conversationGraph: EventSuccessConversationGraphAggregate;
  funnel: EventHostFunnelMetrics;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface EventSuccessConversationGraphAggregate {
  responseCount: number;
  skippedCount: number;
  conversationCount: number;
  attendeesWithTwoPlusConversations: number;
  excludedAttendeeCount: number;
  assignedConversationCount: number;
  assignedOpportunityCount: number;
}

export interface EventSuccessCatchAggregates {
  catchSentCount: number;
  attendeesWhoCaughtSomeone: number;
  catchRecipientCount: number;
  catcherUids?: string[];
}

export interface EventHostFunnelMetrics {
  inviteLinkCount: number;
  inviteOpenCount: number;
  totalDemandCount: number;
  requestCount: number;
  pendingRequestCount: number;
  approvedRequestCount: number;
  declinedRequestCount: number;
  directSignupCount: number;
  waitlistJoinCount: number;
  waitlistOfferCount: number;
  waitlistOfferActiveCount: number;
  waitlistOfferAcceptedCount: number;
  waitlistOfferDeclinedCount: number;
  waitlistOfferExpiredCount: number;
  checkoutStartedCount: number;
  paymentPendingCount: number;
  paymentCompletedCount: number;
  paymentFailedCount: number;
  paymentRefundedCount: number;
  bookedCount: number;
  checkedInCount: number;
  noShowCount: number;
  catchSentCount: number;
  attendeesWhoCaughtSomeone: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  repeatAttendeeCount: number;
}

interface EventSuccessScorecardDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

const defaultDeps: EventSuccessScorecardDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
};

/**
 * Recomputes an event scorecard from canonical event, feedback, and match docs.
 * This is intentionally idempotent so duplicate Firestore trigger deliveries
 * cannot inflate metrics.
 * @param {string} eventId Event id to refresh.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function refreshEventSuccessScorecard(
  eventId: string,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  const db = deps.firestore();
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) return;

  const event = eventSnap.data() as EventDocument;
  const [
    feedbackSnap,
    conversationGraphsSnap,
    matchesSnap,
    participationsSnap,
    waitlistOffersSnap,
    paymentsSnap,
    inviteLinksSnap,
  ] = await Promise.all([
    db
      .collection(eventSuccessFeedbackCollection)
      .where("eventId", "==", eventId)
      .get(),
    db
      .collection(eventSuccessConversationGraphsCollection)
      .where("eventId", "==", eventId)
      .get(),
    db.collection("matches").where("eventIds", "array-contains", eventId).get(),
    db
      .collection("eventParticipations")
      .where("eventId", "==", eventId)
      .get(),
    db
      .collection("eventWaitlistOffers")
      .where("eventId", "==", eventId)
      .get(),
    db.collection("payments").where("eventId", "==", eventId).get(),
    db.collection("eventInviteLinks").where("eventId", "==", eventId).get(),
  ]);

  const feedback = feedbackSnap.docs.map(
    (doc) => doc.data() as EventSuccessFeedbackDocument
  );
  const conversationGraphs = conversationGraphsSnap.docs.map(
    (doc) => doc.data() as EventSuccessConversationGraphDocument
  );
  // Host inquiries may carry event provenance, but they are support threads,
  // not attendee-to-attendee connections. Keep legacy dating matches whose
  // conversationType predates the discriminator while excluding every
  // organizerHostInquiry before the shared scorecard, funnel, and
  // invite-link paths.
  const matches = matchesSnap.docs
    .map((doc) => doc.data() as MatchDocument)
    .filter(isDatingMatch);
  const participations = participationsSnap.docs.map(
    (doc) => doc.data() as EventParticipationDocument
  );
  const waitlistOffers = waitlistOffersSnap.docs.map(
    (doc) => doc.data() as EventWaitlistOfferDocument
  );
  const payments = paymentsSnap.docs.map(
    (doc) => doc.data() as PaymentDocument
  );
  const inviteLinks = inviteLinksSnap.docs.map(
    (doc) => doc.data() as EventInviteLinkDocument
  );
  const attendedUids = new Set(
    participations
      .filter((participation) => participation.status === "attended")
      .map((participation) => participation.uid)
      .filter((uid) => typeof uid === "string" && uid.length > 0)
  );
  const catchAggregates = await loadCatchAggregates({
    db,
    eventId,
    attendedUids,
  });
  const repeatAttendeeCount = await loadRepeatAttendeeCount({
    db,
    event,
    eventId,
    participations,
  });
  const funnel = buildEventHostFunnelMetrics({
    event,
    participations,
    waitlistOffers,
    payments,
    inviteLinks,
    matches,
    catchAggregates,
    repeatAttendeeCount,
  });
  const scorecard = buildEventSuccessScorecard({
    eventId,
    event,
    feedback,
    conversationGraph: buildEventSuccessConversationGraphAggregate(
      conversationGraphs
    ),
    matches,
    catchAggregates,
    funnel,
    updatedAt: deps.serverTimestamp(),
  });

  await db
    .collection(eventSuccessScorecardsCollection)
    .doc(eventId)
    .set(scorecard, {merge: true});
  await updateInviteLinkConnectionCounters({
    db,
    eventId,
    participations,
    matches,
    catchAggregates,
    updatedAt: deps.serverTimestamp(),
  });
}

/**
 * Builds an event-success scorecard document from loaded source data.
 * @param {object} params Source event, feedback, and match data.
 * @return {EventSuccessScorecardDocument} Scorecard payload.
 */
export function buildEventSuccessScorecard(params: {
  eventId: string;
  event: EventDocument;
  feedback: EventSuccessFeedbackDocument[];
  conversationGraph?: EventSuccessConversationGraphAggregate;
  matches: MatchDocument[];
  catchAggregates?: EventSuccessCatchAggregates;
  funnel?: EventHostFunnelMetrics;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}): EventSuccessScorecardDocument {
  const {eventId, event, feedback, matches, updatedAt} = params;
  const feedbackCount = feedback.length;
  const safetyIncidentCount = feedback.filter((item) => item.safetyConcern)
    .length;
  const checkedInCount = event.checkedInCount ?? 0;
  const catchAggregates = params.catchAggregates ?? emptyCatchAggregates();
  const conversationGraph = params.conversationGraph ??
    buildEventSuccessConversationGraphAggregate([]);
  const activeMatches = matches.filter(
    (match) => isDatingMatch(match) && match.status === "active"
  );
  const funnel = params.funnel ?? emptyFunnelMetrics({
    bookedCount: event.bookedCount ?? 0,
    checkedInCount,
    catchAggregates,
    mutualMatchCount: activeMatches.length,
    chatStartedCount: activeMatches
      .filter((match) => match.lastMessageAt != null)
      .length,
  });
  return {
    eventId,
    organizerId: event.organizerId,
    bookedCount: event.bookedCount ?? 0,
    checkedInCount,
    feedbackCount,
    attendeesWhoMetTwoPlusPeople: feedback.filter(
      (item) => item.metNewPeopleCount >= 2
    ).length,
    catchSentCount: catchAggregates.catchSentCount,
    attendeesWhoCaughtSomeone: catchAggregates.attendeesWhoCaughtSomeone,
    catchRecipientCount: catchAggregates.catchRecipientCount,
    catchRate: checkedInCount > 0 ?
      Math.min(1, catchAggregates.attendeesWhoCaughtSomeone / checkedInCount) :
      0,
    mutualMatchCount: activeMatches.length,
    chatStartedCount: activeMatches
      .filter((match) => match.lastMessageAt != null)
      .length,
    averageWelcomeRating: average(feedback.map((item) => item.welcomeRating)),
    averageStructureRating: average(
      feedback.map((item) => item.structureRating)
    ),
    safetyIncidentCount: feedbackCount >= MIN_FEEDBACK_FOR_HOST_SAFETY_COUNT ?
      safetyIncidentCount :
      0,
    conversationGraph,
    funnel,
    updatedAt,
  };
}

/**
 * Builds the host projection without carrying attendee-to-attendee edges.
 */
export function buildEventSuccessConversationGraphAggregate(
  graphs: Array<Pick<
    EventSuccessConversationGraphDocument,
    | "status"
    | "selectedUids"
    | "assignedSelectedCount"
    | "assignedCandidateCount"
  >>
): EventSuccessConversationGraphAggregate {
  const submitted = graphs.filter((graph) => graph.status === "submitted");
  return {
    responseCount: graphs.length,
    skippedCount: graphs.filter((graph) => graph.status === "skipped").length,
    conversationCount: submitted.reduce(
      (sum, graph) => sum + graph.selectedUids.length,
      0
    ),
    attendeesWithTwoPlusConversations: submitted.filter(
      (graph) => graph.selectedUids.length >= 2
    ).length,
    excludedAttendeeCount: submitted.filter(
      (graph) => graph.selectedUids.length === 0
    ).length,
    assignedConversationCount: submitted.reduce(
      (sum, graph) => sum + graph.assignedSelectedCount,
      0
    ),
    assignedOpportunityCount: submitted.reduce(
      (sum, graph) => sum + graph.assignedCandidateCount,
      0
    ),
  };
}

/**
 * Builds the host-visible operating funnel from canonical event documents.
 * @param {object} params Source documents and aggregate connection data.
 * @return {EventHostFunnelMetrics} Privacy-safe host funnel metrics.
 */
export function buildEventHostFunnelMetrics(params: {
  event: EventDocument;
  participations: EventParticipationDocument[];
  waitlistOffers: EventWaitlistOfferDocument[];
  payments: PaymentDocument[];
  inviteLinks: EventInviteLinkDocument[];
  matches: MatchDocument[];
  catchAggregates: EventSuccessCatchAggregates;
  repeatAttendeeCount?: number;
}): EventHostFunnelMetrics {
  const activeMatches = params.matches.filter(
    (match) => isDatingMatch(match) && match.status === "active"
  );
  const chatStartedCount = activeMatches.filter((match) =>
    match.lastMessageAt != null
  ).length;
  const requestCount = params.participations.filter((participation) =>
    participation.hostApprovalStatus != null
  ).length;
  const pendingRequestCount = params.participations.filter(
    (participation) => participation.hostApprovalStatus === "pending"
  ).length;
  const approvedRequestCount = params.participations.filter(
    (participation) => participation.hostApprovalStatus === "approved"
  ).length;
  const declinedRequestCount = params.participations.filter(
    (participation) => participation.hostApprovalStatus === "declined"
  ).length;
  const waitlistJoinCount = params.participations.filter(
    (participation) =>
      participation.status === "waitlisted" ||
      participation.waitlistedAt != null
  ).length;
  const directSignupCount = params.participations.filter((participation) =>
    participation.signedUpAt != null &&
    participation.waitlistedAt == null &&
    participation.hostApprovalStatus == null
  ).length;
  const paymentCounts = countPaymentsByStatus(params.payments);
  const bookedCount = params.event.bookedCount ?? countParticipations(
    params.participations,
    ["signedUp", "attended"]
  );
  const checkedInCount = params.event.checkedInCount ?? countParticipations(
    params.participations,
    ["attended"]
  );

  return {
    inviteLinkCount: params.inviteLinks.length,
    inviteOpenCount: sumInviteCounter(params.inviteLinks, "openCount"),
    totalDemandCount: new Set(
      params.participations
        .filter((participation) => participation.status !== "deleted")
        .map((participation) => participation.uid)
        .filter((uid) => typeof uid === "string" && uid.length > 0)
    ).size,
    requestCount,
    pendingRequestCount,
    approvedRequestCount,
    declinedRequestCount,
    directSignupCount,
    waitlistJoinCount,
    waitlistOfferCount: params.waitlistOffers.length,
    waitlistOfferActiveCount: countOffersByStatus(
      params.waitlistOffers,
      "active"
    ),
    waitlistOfferAcceptedCount: countOffersByStatus(
      params.waitlistOffers,
      "accepted"
    ),
    waitlistOfferDeclinedCount: countOffersByStatus(
      params.waitlistOffers,
      "declined"
    ),
    waitlistOfferExpiredCount: countOffersByStatus(
      params.waitlistOffers,
      "expired"
    ),
    checkoutStartedCount: params.payments.length,
    paymentPendingCount: paymentCounts.pending,
    paymentCompletedCount: paymentCounts.completed,
    paymentFailedCount: paymentCounts.failed,
    paymentRefundedCount: paymentCounts.refunded,
    bookedCount,
    checkedInCount,
    noShowCount: countParticipations(params.participations, ["signedUp"]),
    catchSentCount: params.catchAggregates.catchSentCount,
    attendeesWhoCaughtSomeone: params.catchAggregates.attendeesWhoCaughtSomeone,
    mutualMatchCount: activeMatches.length,
    chatStartedCount,
    repeatAttendeeCount: Math.max(0, params.repeatAttendeeCount ?? 0),
  };
}

/**
 * Counts current attendees who had prior active participation with the club.
 * @param {object} params Source event and participation data.
 * @return {Promise<number>} Repeat attendee count.
 */
async function loadRepeatAttendeeCount(params: {
  db: FirebaseFirestore.Firestore;
  event: EventDocument;
  eventId: string;
  participations: EventParticipationDocument[];
}): Promise<number> {
  const activeUids = Array.from(new Set(
    params.participations
      .filter((participation) => activeParticipationStatuses.has(
        participation.status
      ))
      .map((participation) => participation.uid)
      .filter((uid) => typeof uid === "string" && uid.length > 0)
  ));
  if (activeUids.length === 0) return 0;

  const {organizerId} = params.event;
  if (typeof organizerId !== "string" || organizerId.length === 0) return 0;
  const statuses = Array.from(activeParticipationStatuses);

  // Ask, per current attendee, whether they have any other active
  // participation at this club. Each query is bounded by a single user's own
  // active history (reusing the uid+status index), so the cost no longer grows
  // with the club's lifetime participation volume the way a club-wide scan did.
  const repeatFlags = await Promise.all(
    activeUids.map(async (uid) => {
      const snap = await params.db
        .collection("eventParticipations")
        .where("uid", "==", uid)
        .where("status", "in", statuses)
        .get();
      return snap.docs.some((doc) => {
        const participation = doc.data() as Partial<EventParticipationDocument>;
        return participation.organizerId === organizerId &&
          participation.eventId !== params.eventId;
      });
    })
  );
  return repeatFlags.filter(Boolean).length;
}

/**
 * Handles feedback writes by refreshing the scorecard and recording one
 * participant feedback fact for future participant-momentum analysis.
 * @param {string} feedbackId Feedback document id.
 * @param {EventSuccessFeedbackDocument | undefined} before Previous feedback
 * doc.
 * @param {EventSuccessFeedbackDocument | undefined} after New feedback doc.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function onEventSuccessFeedbackWrittenHandler(
  feedbackId: string,
  before: EventSuccessFeedbackDocument | undefined,
  after: EventSuccessFeedbackDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  const eventIds = new Set<string>();
  if (before?.eventId) eventIds.add(before.eventId);
  if (after?.eventId) eventIds.add(after.eventId);

  await Promise.all(
    Array.from(eventIds).map((eventId) =>
      refreshEventSuccessScorecard(eventId, deps)
    )
  );

  if (after) {
    await Promise.all([
      recordParticipantSignalFactsBestEffort(deps.firestore(), [
        buildFeedbackSignalFact(feedbackId, after),
      ]),
      writeEventSafetyReportIfNeeded(feedbackId, after, deps),
    ]);
  }
}

export const onEventSuccessFeedbackWritten = onDocumentWritten(
  "eventSuccessFeedback/{feedbackId}",
  async (event) => {
    const feedbackId = event.params.feedbackId;
    const before = event.data?.before.data() as
      | EventSuccessFeedbackDocument
      | undefined;
    const after = event.data?.after.data() as
      | EventSuccessFeedbackDocument
      | undefined;
    await onEventSuccessFeedbackWrittenHandler(feedbackId, before, after);
  }
);

/** Refreshes the aggregate-only host scorecard after a private graph write. */
export async function onEventSuccessConversationGraphWrittenHandler(
  before: EventSuccessConversationGraphDocument | undefined,
  after: EventSuccessConversationGraphDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  await refreshScorecardsForEventIds(eventIdsFromDocs(before, after), deps);
}

export const onEventSuccessConversationGraphWritten = onDocumentWritten(
  "eventSuccessConversationGraphs/{graphId}",
  async (event) => {
    const before = event.data?.before.data() as
      | EventSuccessConversationGraphDocument
      | undefined;
    const after = event.data?.after.data() as
      | EventSuccessConversationGraphDocument
      | undefined;
    await onEventSuccessConversationGraphWrittenHandler(before, after);
  }
);

/**
 * Handles roster writes that change demand, attendance, or invite attribution.
 * @param {EventParticipationDocument | undefined} before Previous doc.
 * @param {EventParticipationDocument | undefined} after New doc.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function onEventParticipationWrittenHandler(
  before: EventParticipationDocument | undefined,
  after: EventParticipationDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  await refreshScorecardsForEventIds(eventIdsFromDocs(before, after), deps);
}

export const onEventParticipationWritten = onDocumentWritten(
  "eventParticipations/{participationId}",
  async (event) => {
    const before = event.data?.before.data() as
      | EventParticipationDocument
      | undefined;
    const after = event.data?.after.data() as
      | EventParticipationDocument
      | undefined;
    await onEventParticipationWrittenHandler(before, after);
  }
);

/**
 * Handles payment writes that change checkout and payment funnel counts.
 * @param {PaymentDocument | undefined} before Previous payment doc.
 * @param {PaymentDocument | undefined} after New payment doc.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function onPaymentWrittenHandler(
  before: PaymentDocument | undefined,
  after: PaymentDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  await refreshScorecardsForEventIds(eventIdsFromDocs(before, after), deps);
}

export const onPaymentWritten = onDocumentWritten(
  "payments/{paymentId}",
  async (event) => {
    const before = event.data?.before.data() as PaymentDocument | undefined;
    const after = event.data?.after.data() as PaymentDocument | undefined;
    await onPaymentWrittenHandler(before, after);
  }
);

/**
 * Handles waitlist offer writes that change host curation funnel counts.
 * @param {EventWaitlistOfferDocument | undefined} before Previous offer doc.
 * @param {EventWaitlistOfferDocument | undefined} after New offer doc.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function onEventWaitlistOfferWrittenHandler(
  before: EventWaitlistOfferDocument | undefined,
  after: EventWaitlistOfferDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  await refreshScorecardsForEventIds(eventIdsFromDocs(before, after), deps);
}

export const onEventWaitlistOfferWritten = onDocumentWritten(
  "eventWaitlistOffers/{offerId}",
  async (event) => {
    const before = event.data?.before.data() as
      | EventWaitlistOfferDocument
      | undefined;
    const after = event.data?.after.data() as
      | EventWaitlistOfferDocument
      | undefined;
    await onEventWaitlistOfferWrittenHandler(before, after);
  }
);

/**
 * Handles invite-link writes that change acquisition funnel counts.
 * @param {EventInviteLinkDocument | undefined} before Previous invite link.
 * @param {EventInviteLinkDocument | undefined} after New invite link.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function onEventInviteLinkWrittenHandler(
  before: EventInviteLinkDocument | undefined,
  after: EventInviteLinkDocument | undefined,
  deps: EventSuccessScorecardDeps = defaultDeps
): Promise<void> {
  if (!shouldRefreshForInviteLinkChange(before, after)) return;
  await refreshScorecardsForEventIds(eventIdsFromDocs(before, after), deps);
}

export const onEventInviteLinkWritten = onDocumentWritten(
  "eventInviteLinks/{inviteLinkId}",
  async (event) => {
    const before = event.data?.before.data() as
      | EventInviteLinkDocument
      | undefined;
    const after = event.data?.after.data() as
      | EventInviteLinkDocument
      | undefined;
    await onEventInviteLinkWrittenHandler(before, after);
  }
);

/**
 * Loads privacy-safe catch aggregates from canonical profile decisions.
 * @param {object} params Source data.
 * @param {FirebaseFirestore.Firestore} params.db Firestore instance.
 * @param {string} params.eventId Event id.
 * @param {Set<string>} params.attendedUids Attended attendee ids.
 * @return {Promise<EventSuccessCatchAggregates>} Aggregate catch metrics.
 */
async function loadCatchAggregates(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  attendedUids: Set<string>;
}): Promise<EventSuccessCatchAggregates> {
  if (params.attendedUids.size === 0) {
    return emptyCatchAggregates();
  }

  const [swipeSnaps, blockedPairs] = await Promise.all([
    Promise.all([...params.attendedUids].map((uid) =>
      params.db
        .collection(schemaProfileDecisionCollectionPath)
        .doc(uid)
        .collection(schemaProfileDecisionOutgoingSubcollectionPath)
        .where("eventId", "==", params.eventId)
        .where("direction", "==", "like")
        .get()
    )),
    fetchBlockedPairs(params.db, params.attendedUids),
  ]);

  const decisionKeys = new Set<string>();
  const senderUids = new Set<string>();
  const recipientUids = new Set<string>();
  for (const snap of swipeSnaps) {
    for (const doc of snap.docs) {
      const swipe = doc.data() as Partial<SwipeDocument>;
      if (swipe.direction !== "like" || swipe.eventId !== params.eventId) {
        continue;
      }
      if (
        typeof swipe.swiperId !== "string" ||
        typeof swipe.targetId !== "string" ||
        !params.attendedUids.has(swipe.swiperId) ||
        !params.attendedUids.has(swipe.targetId)
      ) {
        continue;
      }
      const pairKey = undirectedPairKey(swipe.swiperId, swipe.targetId);
      if (blockedPairs.has(pairKey)) continue;
      const decisionKey = `${swipe.swiperId}__${swipe.targetId}`;
      if (!decisionKeys.add(decisionKey)) continue;
      senderUids.add(swipe.swiperId);
      recipientUids.add(swipe.targetId);
    }
  }

  return {
    catchSentCount: decisionKeys.size,
    attendeesWhoCaughtSomeone: senderUids.size,
    catchRecipientCount: recipientUids.size,
    catcherUids: [...senderUids],
  };
}

/**
 * Refreshes per-link connection counters from canonical match and swipe data.
 * @param {object} params Event data needed for invite-link counter updates.
 * @return {Promise<void>} Resolves once link documents have been updated.
 */
async function updateInviteLinkConnectionCounters(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  participations: EventParticipationDocument[];
  matches: MatchDocument[];
  catchAggregates: EventSuccessCatchAggregates;
  updatedAt: FirebaseFirestore.FieldValue;
}): Promise<void> {
  const linksSnap = await params.db
    .collection("eventInviteLinks")
    .where("eventId", "==", params.eventId)
    .get();
  if (linksSnap.empty) return;

  const inviteLinkByUid = new Map<string, string>();
  for (const participation of params.participations) {
    if (
      participation.status !== "attended" ||
      typeof participation.uid !== "string" ||
      typeof participation.inviteLinkId !== "string" ||
      participation.inviteLinkId.length === 0
    ) {
      continue;
    }
    inviteLinkByUid.set(participation.uid, participation.inviteLinkId);
  }

  const aggregates = new Map<string, {
    catcherUids: Set<string>;
    matchIds: Set<string>;
    chatStartedMatchIds: Set<string>;
  }>();
  const aggregateFor = (inviteLinkId: string) => {
    let aggregate = aggregates.get(inviteLinkId);
    if (!aggregate) {
      aggregate = {
        catcherUids: new Set<string>(),
        matchIds: new Set<string>(),
        chatStartedMatchIds: new Set<string>(),
      };
      aggregates.set(inviteLinkId, aggregate);
    }
    return aggregate;
  };

  for (const uid of params.catchAggregates.catcherUids ?? []) {
    const inviteLinkId = inviteLinkByUid.get(uid);
    if (!inviteLinkId) continue;
    aggregateFor(inviteLinkId).catcherUids.add(uid);
  }

  params.matches
    .filter((match) => isDatingMatch(match) && match.status === "active")
    .forEach((match, index) => {
      const matchKey = inviteMetricMatchKey(match, index);
      const participantIds = participantIdsForMatch(match);
      for (const uid of participantIds) {
        const inviteLinkId = inviteLinkByUid.get(uid);
        if (!inviteLinkId) continue;
        const aggregate = aggregateFor(inviteLinkId);
        aggregate.matchIds.add(matchKey);
        if (match.lastMessageAt != null) {
          aggregate.chatStartedMatchIds.add(matchKey);
        }
      }
    });

  const batch = params.db.batch();
  for (const doc of linksSnap.docs) {
    const aggregate = aggregates.get(doc.id);
    batch.set(doc.ref, {
      catcherCount: aggregate?.catcherUids.size ?? 0,
      matchCount: aggregate?.matchIds.size ?? 0,
      chatStartedCount: aggregate?.chatStartedMatchIds.size ?? 0,
      updatedAt: params.updatedAt,
    }, {merge: true});
  }
  await batch.commit();
}

/**
 * Treats pre-discriminator match documents as dating matches for backwards
 * compatibility while excluding event-scoped organizer support threads.
 * @param {MatchDocument} match Candidate connection document.
 * @return {boolean} Whether the document belongs in dating/event-success data.
 */
function isDatingMatch(match: MatchDocument): boolean {
  return match.conversationType == null || match.conversationType === "match";
}

/**
 * Loads block edges among attended users as undirected pair keys.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {Set<string>} attendedUids Attended attendee ids.
 * @return {Promise<Set<string>>} Blocked undirected pairs.
 */
async function fetchBlockedPairs(
  db: FirebaseFirestore.Firestore,
  attendedUids: Set<string>
): Promise<Set<string>> {
  const chunks = chunk([...attendedUids], MAX_IN_FILTER_VALUES);
  const snaps = await Promise.all(
    chunks.map((ids) =>
      db.collection("blocks").where("blockerUserId", "in", ids).get()
    )
  );
  const blockedPairs = new Set<string>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const block = doc.data() as Partial<BlockDocument>;
      if (
        typeof block.blockerUserId !== "string" ||
        typeof block.blockedUserId !== "string" ||
        !attendedUids.has(block.blockerUserId) ||
        !attendedUids.has(block.blockedUserId)
      ) {
        continue;
      }
      blockedPairs.add(undirectedPairKey(
        block.blockerUserId,
        block.blockedUserId
      ));
    }
  }
  return blockedPairs;
}

/**
 * Returns an empty aggregate catch object.
 * @return {EventSuccessCatchAggregates} Zero catch metrics.
 */
function emptyCatchAggregates(): EventSuccessCatchAggregates {
  return {
    catchSentCount: 0,
    attendeesWhoCaughtSomeone: 0,
    catchRecipientCount: 0,
    catcherUids: [],
  };
}

/**
 * Builds an empty funnel object with known attendance and connection metrics.
 * @param {object} params Known scorecard-level counts.
 * @return {EventHostFunnelMetrics} Zero-filled funnel metrics.
 */
function emptyFunnelMetrics(params: {
  bookedCount: number;
  checkedInCount: number;
  catchAggregates: EventSuccessCatchAggregates;
  mutualMatchCount: number;
  chatStartedCount: number;
}): EventHostFunnelMetrics {
  return {
    inviteLinkCount: 0,
    inviteOpenCount: 0,
    totalDemandCount: 0,
    requestCount: 0,
    pendingRequestCount: 0,
    approvedRequestCount: 0,
    declinedRequestCount: 0,
    directSignupCount: 0,
    waitlistJoinCount: 0,
    waitlistOfferCount: 0,
    waitlistOfferActiveCount: 0,
    waitlistOfferAcceptedCount: 0,
    waitlistOfferDeclinedCount: 0,
    waitlistOfferExpiredCount: 0,
    checkoutStartedCount: 0,
    paymentPendingCount: 0,
    paymentCompletedCount: 0,
    paymentFailedCount: 0,
    paymentRefundedCount: 0,
    bookedCount: params.bookedCount,
    checkedInCount: params.checkedInCount,
    noShowCount: 0,
    catchSentCount: params.catchAggregates.catchSentCount,
    attendeesWhoCaughtSomeone: params.catchAggregates.attendeesWhoCaughtSomeone,
    mutualMatchCount: params.mutualMatchCount,
    chatStartedCount: params.chatStartedCount,
    repeatAttendeeCount: 0,
  };
}

/**
 * Counts participation docs by status.
 * @param {EventParticipationDocument[]} participations Participation docs.
 * @param {string[]} statuses Statuses to count.
 * @return {number} Count for the supplied statuses.
 */
function countParticipations(
  participations: EventParticipationDocument[],
  statuses: string[]
): number {
  const statusSet = new Set(statuses);
  return participations.filter((participation) =>
    statusSet.has(participation.status)
  ).length;
}

/**
 * Counts waitlist offers by status.
 * @param {EventWaitlistOfferDocument[]} offers Waitlist offer docs.
 * @param {string} status Offer status to count.
 * @return {number} Count for the supplied status.
 */
function countOffersByStatus(
  offers: EventWaitlistOfferDocument[],
  status: string
): number {
  return offers.filter((offer) => offer.status === status).length;
}

/**
 * Counts payments by status.
 * @param {PaymentDocument[]} payments Payment documents.
 * @return {Record<string, number>} Counts keyed by payment status.
 */
function countPaymentsByStatus(payments: PaymentDocument[]): {
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
} {
  return {
    pending: payments.filter((payment) => payment.status === "pending").length,
    completed: payments.filter((payment) => payment.status === "completed")
      .length,
    failed: payments.filter((payment) => payment.status === "failed").length,
    refunded: payments.filter((payment) => payment.status === "refunded")
      .length,
  };
}

/**
 * Sums an event invite link counter.
 * @param {EventInviteLinkDocument[]} links Invite link documents.
 * @param {string} field Counter field.
 * @return {number} Non-negative counter sum.
 */
function sumInviteCounter(
  links: EventInviteLinkDocument[],
  field: keyof Pick<EventInviteLinkDocument, "openCount">
): number {
  return links.reduce((sum, link) => {
    const value = link[field];
    return sum + (typeof value === "number" && value > 0 ? value : 0);
  }, 0);
}

/**
 * Extracts stable event ids from before/after trigger documents.
 * @param {object | undefined} before Previous document.
 * @param {object | undefined} after New document.
 * @return {string[]} Unique event ids.
 */
function eventIdsFromDocs(
  before: {eventId?: string} | undefined,
  after: {eventId?: string} | undefined
): string[] {
  return [...new Set([before?.eventId, after?.eventId].filter(
    (eventId): eventId is string =>
      typeof eventId === "string" && eventId.length > 0
  ))];
}

/**
 * Refreshes scorecards for a deduped set of event ids.
 * @param {string[]} eventIds Event ids to refresh.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>} Resolves once all refreshes finish.
 */
async function refreshScorecardsForEventIds(
  eventIds: string[],
  deps: EventSuccessScorecardDeps
): Promise<void> {
  await Promise.all(eventIds.map((eventId) =>
    refreshEventSuccessScorecard(eventId, deps)
  ));
}

/**
 * Returns true when an invite-link write changes acquisition funnel fields.
 * @param {EventInviteLinkDocument | undefined} before Previous invite link.
 * @param {EventInviteLinkDocument | undefined} after New invite link.
 * @return {boolean} Whether the scorecard should refresh.
 */
function shouldRefreshForInviteLinkChange(
  before: EventInviteLinkDocument | undefined,
  after: EventInviteLinkDocument | undefined
): boolean {
  if (!before || !after) return true;
  return [
    "eventId",
    "openCount",
    "requestCount",
    "confirmedCount",
    "paidCount",
    "checkedInCount",
  ].some((field) =>
    before[field as keyof EventInviteLinkDocument] !==
    after[field as keyof EventInviteLinkDocument]
  );
}

/**
 * Returns the unique participant ids represented by a match document.
 * @param {MatchDocument} match Match document payload.
 * @return {string[]} Unique participant ids.
 */
function participantIdsForMatch(match: MatchDocument): string[] {
  const participantIds = Array.isArray(match.participantIds) ?
    match.participantIds.filter((uid): uid is string =>
      typeof uid === "string" && uid.length > 0
    ) :
    [];
  if (participantIds.length > 0) return [...new Set(participantIds)];
  return [...new Set([match.user1Id, match.user2Id].filter(
    (uid): uid is string => typeof uid === "string" && uid.length > 0
  ))];
}

/**
 * Builds a stable dedupe key for per-invite match attribution.
 * @param {MatchDocument} match Match document payload.
 * @param {number} index Match index used as a fallback key.
 * @return {string} Stable match metric key.
 */
function inviteMetricMatchKey(match: MatchDocument, index: number): string {
  const pairKey = participantIdsForMatch(match).sort().join("__");
  return pairKey.length > 0 ? pairKey : `match_${index}`;
}

/**
 * Splits an array into Firestore `in` query sized chunks.
 * @template T
 * @param {Array<T>} values Input values.
 * @param {number} size Chunk size.
 * @return {Array<Array<T>>} Chunks.
 */
function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

/**
 * Builds a stable undirected pair key.
 * @param {string} uidA First user id.
 * @param {string} uidB Second user id.
 * @return {string} Pair key.
 */
function undirectedPairKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("__");
}

/**
 * Computes the average of positive finite ratings.
 * @param {number[]} values Raw rating values.
 * @return {number} Average rating, or zero when no rating exists.
 */
function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

/**
 * Materializes a Catch-private safety review item for event feedback concerns.
 * @param {string} feedbackId Feedback document id.
 * @param {EventSuccessFeedbackDocument} feedback Feedback document.
 * @param {EventSuccessScorecardDeps} deps Injectable Firebase dependencies.
 */
export async function writeEventSafetyReportIfNeeded(
  feedbackId: string,
  feedback: EventSuccessFeedbackDocument,
  deps: EventSuccessScorecardDeps
): Promise<void> {
  if (feedback.safetyConcern !== true) return;

  const note = feedback.privateNote?.trim();
  await deps.firestore()
    .collection(eventSafetyReportsCollection)
    .doc(feedbackId)
    .set({
      eventId: feedback.eventId,
      organizerId: feedback.organizerId,
      reporterUserId: feedback.uid,
      feedbackId,
      source: "event_success_feedback",
      status: "open",
      createdAt: feedback.createdAt ?? deps.serverTimestamp(),
      updatedAt: deps.serverTimestamp(),
      ...(note && {note}),
    }, {merge: true});
}
