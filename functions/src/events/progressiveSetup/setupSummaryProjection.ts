import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export type PrivateEventSetupScope = "upcoming" | "past" | "cancelled";

export interface PrivateEventSetupSummary {
  eventId: string;
  name: string;
  city: {cityId: string; marketId: string};
  localDate: string;
  localStartTime: string;
  timezone: string;
  startTimeMillis: number;
  setupRevision: number;
  status: "active" | "cancelled";
  detailsConfigured: boolean;
}

function millis(value: unknown): number | null {
  if (!value || typeof value !== "object" ||
      typeof (value as {toMillis?: unknown}).toMillis !== "function") {
    return null;
  }
  const result = (value as FirebaseFirestore.Timestamp).toMillis();
  return Number.isSafeInteger(result) ? result : null;
}

/**
 * One private event's restricted Host list row, as the hostEventSummaries read
 * model stores it. Raw Event fields never become a Host list DTO.
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc The event document.
 * @param {string} organizerId The organizer the event must belong to.
 * @param {number} asOfMillis The cutoff the scope compares start times with.
 * @param {PrivateEventSetupScope} scope Which inventory the row belongs to.
 * @return {PrivateEventSetupSummary} The row, or a failed-precondition throw.
 */
export function projectPrivateEventSetupSummary(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  organizerId: string, asOfMillis: number,
  scope: PrivateEventSetupScope): PrivateEventSetupSummary {
  const event: Record<string, unknown> = doc.data();
  const startTimeMillis = millis(event.startTime);
  const name = event.name;
  const cityId = event.eventCityId;
  const marketId = event.eventMarketId;
  const localDate = event.eventLocalDate;
  const localStartTime = event.eventLocalStartTime;
  const timezone = event.eventTimezone;
  const setupRevision = event.setupRevision;
  if (!validateEventDocument(event) ||
      event.organizerId !== organizerId ||
      event.publicationState !== "private" ||
      event.status !== (scope === "cancelled" ? "cancelled" : "active") ||
      !ID.test(doc.id) || !Number.isSafeInteger(setupRevision) ||
      typeof name !== "string" || !name.trim() ||
      typeof cityId !== "string" || typeof marketId !== "string" ||
      typeof localDate !== "string" ||
      typeof localStartTime !== "string" ||
      typeof timezone !== "string" ||
      startTimeMillis === null ||
      (scope === "upcoming" && startTimeMillis < asOfMillis) ||
      (scope === "past" && startTimeMillis >= asOfMillis)) {
    throw new HttpsError("failed-precondition",
      "A private event setup needs review.");
  }
  return {
    eventId: doc.id,
    name,
    city: {cityId, marketId},
    localDate,
    localStartTime,
    timezone,
    startTimeMillis,
    setupRevision: setupRevision as number,
    status: scope === "cancelled" ? "cancelled" : "active",
    detailsConfigured: event.endTime !== undefined ||
      event.meetingPoint !== undefined ||
      event.meetingLocation !== undefined ||
      event.eventFormat !== undefined ||
      event.eventSuccessPlanId !== undefined,
  };
}
