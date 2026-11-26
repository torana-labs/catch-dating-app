import type {
  HostAnalyticsCallableResponse,
} from "../shared/generated/hostAnalyticsCallableResponse";

type Firestore = FirebaseFirestore.Firestore;

export type HostEventCoach = NonNullable<
  HostAnalyticsCallableResponse["eventCoach"]
>;

const scorecardCollection = "eventSuccessScorecards";

const countFields = [
  "bookedCount",
  "checkedInCount",
  "feedbackCount",
  "attendeesWhoMetTwoPlusPeople",
  "catchSentCount",
  "attendeesWhoCaughtSomeone",
  "catchRecipientCount",
  "mutualMatchCount",
  "chatStartedCount",
  "safetyIncidentCount",
] as const;

const conversationFields = [
  "responseCount",
  "skippedCount",
  "conversationCount",
  "attendeesWithTwoPlusConversations",
  "excludedAttendeeCount",
  "assignedConversationCount",
  "assignedOpportunityCount",
] as const;

const funnelFields = [
  "inviteLinkCount",
  "inviteOpenCount",
  "totalDemandCount",
  "requestCount",
  "pendingRequestCount",
  "approvedRequestCount",
  "declinedRequestCount",
  "directSignupCount",
  "waitlistJoinCount",
  "waitlistOfferCount",
  "waitlistOfferActiveCount",
  "waitlistOfferAcceptedCount",
  "waitlistOfferDeclinedCount",
  "waitlistOfferExpiredCount",
  "checkoutStartedCount",
  "paymentPendingCount",
  "paymentCompletedCount",
  "paymentFailedCount",
  "paymentRefundedCount",
  "bookedCount",
  "checkedInCount",
  "noShowCount",
  "catchSentCount",
  "attendeesWhoCaughtSomeone",
  "mutualMatchCount",
  "chatStartedCount",
  "repeatAttendeeCount",
] as const;

/**
 * A count read from a stored aggregate: a whole number of zero or more.
 * @param {unknown} value Stored value.
 * @return {number} The count, or 0 when it is not a usable number.
 */
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ?
    Math.floor(value) : 0;
}

/**
 * A stored value clamped to [min, max], or min when unusable.
 * @param {unknown} value Stored value.
 * @param {number} min Smallest value.
 * @param {number} max Largest value.
 * @return {number} The clamped value.
 */
function clamp(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Picks the aggregate counts named by [fields] from a stored map.
 * @param {unknown} value Stored map.
 * @param {readonly string[]} fields Field names to keep.
 * @return {Record<string, number>} Each field as a count.
 */
function counts(
  value: unknown,
  fields: readonly string[]
): Record<string, number> {
  const source = value !== null && typeof value === "object" ?
    value as Record<string, unknown> : {};
  return Object.fromEntries(
    fields.map((field) => [field, count(source[field])]));
}

/**
 * The post-event coach block for one event's report, from its stored
 * scorecard (`eventSuccessScorecards/{eventId}`). Pure.
 *
 * The scorecard carries catch, match and chat counts, so an organiser sees
 * it only when at least [floor] guests checked in (FIX-21, owner rule of
 * 23 Nov 2026); below that the block says it is withheld and carries no
 * figures. A floor of 0 (Admin) withholds nothing. Only aggregate counts,
 * rates and ratings leave the server; demo and seed markers do not.
 * @param {unknown} data Stored scorecard data, or undefined when absent.
 * @param {number} floor Group-size floor; 0 applies none.
 * @return {HostEventCoach | null} The block, or null with no scorecard.
 */
export function buildHostEventCoach(
  data: unknown,
  floor: number
): HostEventCoach | null {
  if (data === undefined || data === null || typeof data !== "object") {
    return null;
  }
  const stored = data as Record<string, unknown>;
  const checkedIn = count(stored.checkedInCount);
  if (floor > 0 && checkedIn < floor) {
    return {
      status: "withheld",
      groupSizeFloor: floor,
      caption: `The coach report shows once at least ${floor} guests ` +
        "checked in.",
      scorecard: null,
    };
  }
  return {
    status: "ready",
    groupSizeFloor: floor,
    caption: null,
    scorecard: {
      ...counts(stored, countFields),
      catchRate: clamp(stored.catchRate, 0, 1),
      averageWelcomeRating: clamp(stored.averageWelcomeRating, 0, 5),
      averageStructureRating: clamp(stored.averageStructureRating, 0, 5),
      conversationGraph: counts(stored.conversationGraph, conversationFields),
      funnel: counts(stored.funnel, funnelFields),
    } as NonNullable<HostEventCoach["scorecard"]>,
  };
}

/**
 * Reads one event's scorecard and builds its coach block.
 * @param {Firestore} db Firestore instance.
 * @param {string} eventId Event the report is for.
 * @param {number} floor Group-size floor; 0 applies none.
 * @return {Promise<HostEventCoach | null>} The block, or null.
 */
export async function loadHostEventCoach(
  db: Firestore,
  eventId: string,
  floor: number
): Promise<HostEventCoach | null> {
  const snapshot = await db.collection(scorecardCollection).doc(eventId).get();
  return buildHostEventCoach(
    snapshot.exists ? snapshot.data() : undefined, floor);
}
