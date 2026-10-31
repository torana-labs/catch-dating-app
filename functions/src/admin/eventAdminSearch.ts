import type {
  OrganizerDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
export {eventFormatLabel, eventTitleLabel} from "../shared/eventLabels";
import {eventFormatLabel, eventTitleLabel} from "../shared/eventLabels";

const maxAdminSearchTokens = 120;
const maxQueryTokens = 30;
const maxPrefixLength = 12;
const stopWords = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export type EventAdminSearchSource =
  "adminUpdateEventDetails" | "adminEventSearchBackfill";

export interface EventAdminSearchProjection {
  tokens: string[];
  sortKey: string;
  updatedAt: FirebaseFirestore.FieldValue;
  updatedBySource: EventAdminSearchSource;
}

/**
 * Builds a deterministic admin search projection for a canonical event.
 * @param {string} eventId Firestore event document id.
 * @param {EventDocument} event Canonical event document.
 * @param {OrganizerDocument | null} club Optional organizer document.
 * @param {FirebaseFirestore.FieldValue} updatedAt Server timestamp marker.
 * @param {EventAdminSearchSource} updatedBySource Projection source.
 * @return {EventAdminSearchProjection} Rebuildable search projection.
 */
export function buildEventAdminSearchProjection(
  eventId: string,
  event: EventDocument,
  organizer: OrganizerDocument | null,
  updatedAt: FirebaseFirestore.FieldValue,
  updatedBySource: EventAdminSearchSource
): EventAdminSearchProjection {
  const sourceText = eventSearchSourceText(eventId, event, organizer);
  return {
    tokens: buildSearchTokens(sourceText, true, maxAdminSearchTokens),
    sortKey: firstSearchToken(event.name?.trim()) ??
      firstSearchToken(event.eventFormat ?
        eventTitleLabel(event) : null) ??
      firstSearchToken(eventId) ??
      eventId,
    updatedAt,
    updatedBySource,
  };
}

/**
 * Builds Firestore query tokens for admin event search.
 * @param {string} query Raw operator query.
 * @return {string[]} Bounded query tokens for array-contains-any.
 */
export function eventAdminSearchQueryTokens(query: string): string[] {
  return buildSearchTokens([query], false, maxQueryTokens);
}

/**
 * Returns a lightweight next-event view after editable admin fields are
 * applied.
 * @param {EventDocument} before Current event.
 * @param {Record<string, unknown>} fields Admin update fields.
 * @return {EventDocument} Event view for derived projections.
 */
export function eventWithAdminFieldsForSearch(
  before: EventDocument,
  fields: Record<string, unknown>
): EventDocument {
  return {
    ...before,
    ...fields,
  };
}

/**
 * Collects high-signal event and organizer fields for search.
 * @param {string} eventId Firestore event document id.
 * @param {EventDocument} event Canonical event document.
 * @param {OrganizerDocument | null} club Optional organizer document.
 * @return {string[]} Search source strings in priority order.
 */
function eventSearchSourceText(
  eventId: string,
  event: EventDocument,
  organizer: OrganizerDocument | null
): string[] {
  return compactStrings([
    eventId,
    event.organizerId,
    organizer?.name,
    organizer?.cityName,
    organizer?.location,
    organizer?.locationMarketId,
    event.eventFormat ? eventFormatLabel(event.eventFormat) : null,
    event.eventFormat?.activityKind,
    event.eventFormat?.interactionModel,
    event.meetingPoint,
    event.meetingLocation?.name,
    event.meetingLocation?.address,
    event.locationDetails,
    event.discoveryMarketId,
    event.discoveryCityName,
    event.discoveryActivityKind,
    event.discoveryAvailability,
    event.status,
    event.pace,
    event.description,
  ]);
}

/**
 * Builds normalized search tokens from source strings.
 * @param {string[]} source Source strings.
 * @param {boolean} includePrefixes Whether to include prefix tokens.
 * @param {number} limit Maximum tokens.
 * @return {string[]} Unique tokens.
 */
function buildSearchTokens(
  source: string[],
  includePrefixes: boolean,
  limit: number
): string[] {
  const tokens = new Set<string>();
  for (const item of source) {
    for (const token of splitSearchText(item)) {
      if (stopWords.has(token)) continue;
      tokens.add(token);
      if (includePrefixes) {
        for (
          let length = 2;
          length <= Math.min(maxPrefixLength, token.length - 1);
          length += 1
        ) {
          tokens.add(token.slice(0, length));
        }
      }
      if (tokens.size >= limit) return Array.from(tokens).slice(0, limit);
    }
  }
  return Array.from(tokens).slice(0, limit);
}

/**
 * Splits text into normalized lowercase alphanumeric tokens.
 * @param {string} value Raw text.
 * @return {string[]} Tokens.
 */
function splitSearchText(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/**
 * Returns the first normalized token for stable sorting.
 * @param {string | null | undefined} value Raw text.
 * @return {string | null} First token.
 */
function firstSearchToken(value: string | null | undefined): string | null {
  if (!value) return null;
  return splitSearchText(value).find((token) => !stopWords.has(token)) ?? null;
}

/**
 * Returns only non-empty string values.
 * @param {Array<unknown>} values Raw values.
 * @return {string[]} Strings.
 */
function compactStrings(values: Array<unknown>): string[] {
  return values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  );
}
