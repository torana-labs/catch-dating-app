import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  EventDocument,
  ExternalEventDocument,
  OrganizerClaimRequestDocument,
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
  OrganizerPaymentConnectionDocument,
  OrganizerSalesAccountDocument,
  SalesTaskDocument,
  SupplyIntakeRequestsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetOrganizerOverviewCallablePayload} from
  "../shared/generated/adminGetOrganizerOverviewCallablePayload";
import type {AdminGetOrganizerOverviewCallableResponse} from
  "../shared/generated/adminGetOrganizerOverviewCallableResponse";
import {
  validateAdminGetOrganizerOverviewCallablePayload,
} from "../shared/generated/validators/adminGetOrganizerOverviewInput";
import {validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  CommercialTermsUnavailableError,
  effectiveCommercialTerms,
  readCommercialTerms,
} from "../commercialTerms/resolver";
import {
  authStaffNames,
  catchEventStatus,
  catchEventTitle,
  cityOf,
  importedEventStatus,
  organizerClaimedByName,
  organizerClaimState,
  organizerKindLabel,
  organizerPageState,
  recordsReaderRoles,
  timestampIso,
  timestampMillis,
  type StaffNames,
} from "./recordsDirectory";

type Response = AdminGetOrganizerOverviewCallableResponse;
type JourneyStep = Response["journey"][number];
type UpcomingEvent = Response["upcomingEvents"][number];

const upcomingShown = 10;

interface OrganizerOverviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  staffNames: StaffNames;
  /** Exact count of a query; tests count the fake's documents. */
  count: (query: FirebaseFirestore.Query) => Promise<number>;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerOverviewDeps = {
  firestore: () => admin.firestore(),
  staffNames: authStaffNames,
  count: async (query) => (await query.count().get()).data().count,
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Loads the Overview tab of an Admin organizer page. The journey is read
 * from the records each step already leaves, so it needs no event log.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerOverviewDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetOrganizerOverviewCallableResponse>} Overview.
 */
export async function adminGetOrganizerOverviewHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerOverviewDeps = defaultDeps
): Promise<Response> {
  const adminContext = requireAdminRole(request, recordsReaderRoles);
  const {organizerId} =
    validateCallableWithAjv<AdminGetOrganizerOverviewCallablePayload>(
      request,
      validateAdminGetOrganizerOverviewCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid,
    "adminGetOrganizerOverview", {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now?.() ?? new Date();

  const organizerSnap = await db.collection("organizers").doc(organizerId)
    .get();
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = organizerSnap.data() as Partial<OrganizerDocument>;
  const events = db.collection("events");
  const at = Timestamp.fromDate(now);

  const [account, tasks, terms, connections, claims, intake, firstEvent,
    upcomingCatch, upcomingCatchCount, imported, growth] = await Promise.all([
    db.collection("organizerSalesAccounts").doc(organizerId).get()
      .then((snap) => snap.data() as
        Partial<OrganizerSalesAccountDocument> | undefined),
    db.collection("salesTasks").where("organizerId", "==", organizerId)
      .orderBy("dueAt", "asc").limit(20).get()
      .then((snap) => snap.docs.map((doc) => doc.data() as SalesTaskDocument)),
    readTermsSummary(db, organizerId),
    db.collection("organizerPaymentConnections")
      .where("organizerId", "==", organizerId).limit(10).get()
      .then((snap) => snap.docs.map((doc) =>
        doc.data() as Partial<OrganizerPaymentConnectionDocument>)),
    db.collection("organizerClaimRequests")
      .where("organizerId", "==", organizerId).limit(20).get()
      .then((snap) => snap.docs.map((doc) => ({id: doc.id,
        claim: doc.data() as Partial<OrganizerClaimRequestDocument>}))),
    db.collection("supplyIntakeRequests")
      .where("approval.organizerId", "==", organizerId).limit(10).get()
      .then((snap) => snap.docs.map((doc) =>
        doc.data() as Partial<SupplyIntakeRequestsDocument>)),
    events.where("organizerId", "==", organizerId)
      .orderBy("startTime", "asc").limit(1).get()
      .then((snap) => snap.docs[0]?.data() as Partial<EventDocument> |
        undefined),
    events.where("organizerId", "==", organizerId)
      .where("startTime", ">=", at).orderBy("startTime", "asc")
      .limit(upcomingShown).get()
      .then((snap) => snap.docs.map((doc) => ({id: doc.id,
        event: doc.data() as Partial<EventDocument>}))),
    deps.count(events.where("organizerId", "==", organizerId)
      .where("startTime", ">=", at)),
    // An organizer has few imported events; read them and keep the upcoming.
    db.collection("externalEvents")
      .where("canonicalHostId", "==", organizerId).limit(200).get()
      .then((snap) => snap.docs.map((doc) => ({id: doc.id,
        event: doc.data() as Partial<ExternalEventDocument>}))),
    db.collection("organizerGrowthFacts").doc(organizerId).get()
      .then((snap) => snap.data() as
        Partial<OrganizerGrowthFactsDocument> | undefined),
  ]);

  const nomination = intake.find((item) => item.request?.kind !==
    "event_refresh") ?? null;
  const openTask = tasks.find((task) => task.status === "open") ?? null;
  const ownerUid = account?.assignedOwnerUid ?? null;
  const names = await deps.staffNames([ownerUid, openTask?.ownerUid,
    nomination?.request?.submittedBy?.uid, nomination?.approval?.approvedByUid,
    growth?.nominator?.uid]
    .filter((uid): uid is string => typeof uid === "string" && uid.length > 0));

  const claimState = organizerClaimState(organizer);
  const pending = claims
    .filter(({claim}) => claim.status === "pending")
    .sort((a, b) => (timestampMillis(b.claim.createdAt) ?? 0) -
      (timestampMillis(a.claim.createdAt) ?? 0))[0] ?? null;

  const nowMillis = now.getTime();
  const upcomingImported = imported
    .filter(({event}) => (timestampMillis(event.startTime) ?? 0) >= nowMillis)
    .map(({id, event}): UpcomingEvent => ({
      key: `imported:${event.eventId || id}`,
      eventId: event.eventId || id,
      source: "imported",
      platform: event.externalSource?.platform ?? null,
      title: event.title?.trim() || "Event",
      startTime: timestampIso(event.startTime),
      status: importedEventStatus(event),
    }))
    .filter((event) => event.status !== "cancelled" &&
      event.status !== "removed");
  const upcomingFromCatch = upcomingCatch
    .map(({id, event}): UpcomingEvent => ({
      key: `catch:${id}`,
      eventId: id,
      source: "catch",
      platform: null,
      title: catchEventTitle(event),
      startTime: timestampIso(event.startTime),
      status: catchEventStatus(event),
    }));
  const cancelledCatch = upcomingFromCatch
    .filter((event) => event.status === "cancelled").length;
  const upcomingEvents = [...upcomingFromCatch, ...upcomingImported]
    .filter((event) => event.status !== "cancelled")
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    .slice(0, upcomingShown);

  const city = cityOf(organizer.locationMarketId ?? organizer.cityName);
  const hasRun = firstEvent !== undefined &&
    (timestampMillis(firstEvent.startTime) ?? Infinity) < nowMillis;
  return {
    generatedAt: now.toISOString(),
    organizer: {
      organizerId,
      name: organizer.name?.trim() || organizerId,
      kindLabel: organizerKindLabel(organizer),
      citySlug: city.slug,
      cityLabel: city.label,
      area: organizer.area?.trim() || null,
      pageState: organizerPageState(organizer),
      publishStatus: organizer.publicPage?.publishStatus ?? null,
      indexStatus: organizer.publicPage?.indexStatus ?? null,
      canonicalPath: organizer.publicPage?.canonicalPath ?? null,
      appVisibility: organizer.appVisibility ?? null,
      claimState,
      claimedByName: organizerClaimedByName(organizer),
      listedAt: timestampIso(organizer.createdAt),
      hasImage: Boolean(organizer.imageUrl || organizer.profileImageUrl),
      origin: organizer.provenance?.origin ?? null,
    },
    salesOwner: ownerUid ? {uid: ownerUid, name: names.get(ownerUid) ?? null} :
      null,
    nextAction: account?.nextAction?.trim() || null,
    nextTask: openTask ? {
      taskId: openTask.taskId,
      title: openTask.title,
      dueAt: timestampIso(openTask.dueAt),
      ownerName: names.get(openTask.ownerUid) ?? null,
    } : null,
    terms,
    payments: paymentsSummary(connections),
    pendingClaim: pending ? {
      requestId: pending.id,
      requesterName: pending.claim.requesterName?.trim() || null,
      requesterRole: pending.claim.requesterRole ?? null,
      createdAt: timestampIso(pending.claim.createdAt),
    } : null,
    growth: growth?.channel ? {
      channel: growth.channel,
      nominator: growth.nominator ? {uid: growth.nominator.uid,
        name: names.get(growth.nominator.uid) ?? null,
        role: growth.nominator.role} : null,
      firstPaidBookingAt: timestampIso(growth.milestones?.firstPaidBookingAt),
    } : null,
    journey: journeyOf({organizer, nomination, claims: claims.map((c) =>
      c.claim), firstEvent, firstPaidBookingAt:
      growth?.milestones?.firstPaidBookingAt ?? null, names}),
    nextStep: claimState === "claimPending" || pending ? "decideClaim" :
      claimState === "unclaimed" ? "claim" :
        hasRun ? null : "firstEvent",
    upcomingEvents,
    upcomingEventCount: upcomingCatchCount - cancelledCatch +
      upcomingImported.length,
  };
}

/**
 * The organizer's steps, oldest first. A step without its own time keeps
 * its place after the step before it.
 * @param {object} input Records the steps are read from.
 * @return {JourneyStep[]} Journey.
 */
function journeyOf(input: {
  organizer: Partial<OrganizerDocument>;
  nomination: Partial<SupplyIntakeRequestsDocument> | null;
  claims: Array<Partial<OrganizerClaimRequestDocument>>;
  firstEvent: Partial<EventDocument> | undefined;
  firstPaidBookingAt: unknown;
  names: Map<string, string>;
}): JourneyStep[] {
  const {organizer, nomination, claims, firstEvent, firstPaidBookingAt,
    names} = input;
  const steps: JourneyStep[] = [];
  const step = (kind: JourneyStep["kind"], at: unknown,
    actorName: string | null = null, detail: string | null = null) =>
    steps.push({kind, at: timestampIso(at), actorName, detail});

  if (nomination?.request) {
    const submitter = nomination.request.submittedBy;
    step("nominated", nomination.request.submittedAt,
      submitter?.uid ? names.get(submitter.uid) ?? null : null,
      (nomination.request.seed?.urls as string[] | undefined)?.[0] ?? null);
    if (nomination.result) {
      step("listingBuilt", null, null, String(nomination.result.eventCount));
    }
    if (nomination.approval) {
      step("approved", nomination.approval.approvedAt,
        names.get(nomination.approval.approvedByUid) ?? null);
    }
  }
  step("listed", organizer.createdAt);
  const byCreation = [...claims].sort((a, b) =>
    (timestampMillis(a.createdAt) ?? 0) - (timestampMillis(b.createdAt) ?? 0));
  for (const claim of byCreation) {
    const requester = claim.requesterName?.trim() || null;
    step("claimRequested", claim.createdAt, requester,
      claim.requesterRole ?? null);
    if (claim.status === "approved" || claim.status === "rejected") {
      step(claim.status === "approved" ? "claimApproved" : "claimRejected",
        claim.decidedAt, null, claim.decisionReason?.trim() || null);
    }
  }
  if (organizer.ownership?.claimedAt) {
    step("claimed", organizer.ownership.claimedAt,
      organizer.hostName?.trim() || null);
  }
  if (firstEvent) {
    step("firstEvent", firstEvent.startTime, null, catchEventTitle(firstEvent));
  }
  if (firstPaidBookingAt) step("firstPaidBooking", firstPaidBookingAt);

  let previous = -Infinity;
  return steps
    .map((item, index) => {
      const millis = item.at ? Date.parse(item.at) : null;
      previous = millis ?? previous;
      return {item, order: millis ?? previous, index};
    })
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({item}) => item);
}

/**
 * The organizer's commission in brief: whose terms apply, the rate and cap.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId Organizer id.
 * @return {Promise<Response["terms"]>} Terms summary.
 */
async function readTermsSummary(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): Promise<Response["terms"]> {
  try {
    const stored = await readCommercialTerms({db, organizerId});
    const terms = effectiveCommercialTerms(stored);
    if (!terms) return {source: "unset", rateBasisPoints: null, capMinor: null};
    return {
      source: stored.organizer ? "organizer" : "platform",
      rateBasisPoints: terms.commission.rateBasisPoints,
      capMinor: terms.commission.capMinor,
    };
  } catch (error) {
    if (error instanceof CommercialTermsUnavailableError) {
      return {source: "unset", rateBasisPoints: null, capMinor: null};
    }
    throw error;
  }
}

/**
 * Whether guests can pay the organizer: a live connection is preferred to a
 * test one, and an errored or expiring connection needs attention.
 * @param {Array<Partial<OrganizerPaymentConnectionDocument>>} connections
 *   The organizer's payment connections.
 * @return {Response["payments"]} Payments summary.
 */
function paymentsSummary(
  connections: Array<Partial<OrganizerPaymentConnectionDocument>>
): Response["payments"] {
  const active = connections
    .filter((connection) => connection.status !== "disconnected")
    .sort((a, b) => (a.mode === "live" ? 0 : 1) - (b.mode === "live" ? 0 : 1));
  const connection = active[0];
  if (!connection) return {state: "notConnected", webhookVerified: false};
  const healthy = connection.status === "ready" && !connection.lastErrorCode;
  return {
    state: healthy ? "connected" : "needsAttention",
    webhookVerified: Boolean(connection.webhookVerifiedAt),
  };
}

export const adminGetOrganizerOverview = onCall(
  appCheckCallableOptions,
  (request) => adminGetOrganizerOverviewHandler(request)
);
