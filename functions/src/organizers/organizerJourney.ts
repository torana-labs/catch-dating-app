import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {journeyOf} from "../admin/organizerOverview";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isOrganizerManager} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  EventDocument,
  OrganizerClaimRequestDocument,
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
  SupplyIntakeRequestsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListMyOrganizerJourneysCallablePayload as Payload} from
  "../shared/generated/listMyOrganizerJourneysCallablePayload";
import type {ListMyOrganizerJourneysCallableResponse as Result} from
  "../shared/generated/listMyOrganizerJourneysCallableResponse";
import {validateListMyOrganizerJourneysCallablePayload} from
  "../shared/generated/validators/listMyOrganizerJourneysInput";
import {validateListMyOrganizerJourneysCallableResponse} from
  "../shared/generated/validators/listMyOrganizerJourneysOutput";

type Db = FirebaseFirestore.Firestore;
type Journey = Result["journeys"][number];
type Step = Journey["steps"][number];
type Claim = Partial<OrganizerClaimRequestDocument>;

const maxWaitingClaims = 5;

export interface OrganizerJourneyDeps {
  db: () => Db;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: OrganizerJourneyDeps = {
  db: () => admin.firestore(),
  checkRateLimit,
};

const visibleKinds: ReadonlySet<string> = new Set<Step["kind"]>(["nominated",
  "listed", "claimRequested", "claimRejected", "claimed", "firstEvent",
  "firstPaidBooking"]);

/**
 * Someone else's request or rejection stays with Catch's staff.
 * @param {Claim[]} claims The organizer's claim requests.
 * @param {string} uid The caller.
 * @return {Claim[]} The ones the caller may see.
 */
export function visibleClaims(claims: Claim[], uid: string): Claim[] {
  return claims.filter((claim) => claim.requesterUid === uid);
}

/**
 * The staff journey as the organizer sees it: no names, no reasons, and only
 * the steps that mean something to them.
 * @param {object} input The records the journey is read from.
 * @return {Journey} The organizer's journey.
 */
export function organizerJourneyView(input: {
  organizerId: string;
  organizer: Partial<OrganizerDocument>;
  nomination: Partial<SupplyIntakeRequestsDocument> | null;
  claims: Claim[];
  firstEvent: Partial<EventDocument> | undefined;
  firstPaidBookingAt: unknown;
  uid: string;
}): Journey {
  const claims = visibleClaims(input.claims, input.uid);
  const steps = journeyOf({...input, claims, names: new Map()})
    .filter((step) => visibleKinds.has(step.kind))
    .map((step): Step => ({
      kind: step.kind as Step["kind"],
      atMillis: step.at ? Date.parse(step.at) : null,
      detail: step.kind === "nominated" || step.kind === "firstEvent" ?
        step.detail : null,
    }));
  const waitingClaim = claims.some((claim) => claim.status === "pending");
  return {
    organizerId: input.organizerId,
    organizerName: input.organizer.name?.trim() ?? "",
    waitingClaim,
    steps,
    next: input.firstEvent ? null : waitingClaim ||
      !input.organizer.ownership?.claimedAt ? "runYourPage" : "firstEvent",
  };
}

async function readJourney(db: Db, organizerId: string,
  organizer: Partial<OrganizerDocument>, uid: string): Promise<Journey> {
  const [claims, intake, firstEvent, growth] = await Promise.all([
    db.collection("organizerClaimRequests")
      .where("organizerId", "==", organizerId).limit(20).get()
      .then((snap) => snap.docs.map((doc) => doc.data() as Claim)),
    db.collection("supplyIntakeRequests")
      .where("approval.organizerId", "==", organizerId).limit(10).get()
      .then((snap) => snap.docs.map((doc) =>
        doc.data() as Partial<SupplyIntakeRequestsDocument>)),
    db.collection("events").where("organizerId", "==", organizerId)
      .orderBy("startTime", "asc").limit(1).get()
      .then((snap) => snap.docs[0]?.data() as Partial<EventDocument> |
        undefined),
    db.collection("organizerGrowthFacts").doc(organizerId).get()
      .then((snap) => snap.data() as
        Partial<OrganizerGrowthFactsDocument> | undefined),
  ]);
  return organizerJourneyView({
    organizerId, organizer, claims, firstEvent, uid,
    nomination: intake.find((item) =>
      item.request?.kind !== "event_refresh") ?? null,
    firstPaidBookingAt: growth?.milestones?.firstPaidBookingAt ?? null,
  });
}

/**
 * How a page got here: one organizer's for its hosts, or, with no organizer,
 * each page the caller is waiting to claim.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerJourneyDeps} deps Dependencies.
 * @return {Promise<Result>} The journeys.
 */
export async function listMyOrganizerJourneysHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerJourneyDeps = defaultDeps): Promise<Result> {
  const uid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv<Payload>(request,
    validateListMyOrganizerJourneysCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "listMyOrganizerJourneys",
    {maxRequests: 60, windowMs: 60 * 1000});
  const organizers = db.collection("organizers");
  let journeys: Journey[];
  if (organizerId !== null) {
    const organizer = (await organizers.doc(organizerId).get()).data() as
      OrganizerDocument | undefined;
    if (!organizer || !isOrganizerManager(organizer, uid)) {
      throw new HttpsError("permission-denied",
        "Only this organizer's hosts can see how its page got here.");
    }
    journeys = [await readJourney(db, organizerId, organizer, uid)];
  } else {
    const waiting = await db.collection("organizerClaimRequests")
      .where("requesterUid", "==", uid).where("status", "==", "pending")
      .limit(maxWaitingClaims).get();
    const ids = [...new Set(waiting.docs.map((doc) =>
      (doc.data() as Claim).organizerId as string))];
    const read = await Promise.all(ids.map(async (id) => {
      const organizer = (await organizers.doc(id).get()).data() as
        OrganizerDocument | undefined;
      return organizer ? readJourney(db, id, organizer, uid) : null;
    }));
    journeys = read.filter((journey) => journey !== null);
  }
  const result: Result = {journeys};
  if (!validateListMyOrganizerJourneysCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid journey.");
  }
  return result;
}

export const listMyOrganizerJourneys = onCall(appCheckCallableOptions,
  (request) => listMyOrganizerJourneysHandler(request));
