import * as admin from "firebase-admin";
import type {
  EventDocument,
  ExternalEventDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventTitleLabel} from "../shared/eventLabels";
import {marketForIdOrAlias} from "../locations/marketConfig";

/**
 * Shared reads for the Admin Organizers and Events records: the one-word
 * states each row shows, city labels, staff names and offset paging. The
 * directories read a bounded window of documents and count in memory, so
 * their totals are exact until a collection outgrows the window.
 */

/** Everyone who can open the Organizers and Events records. */
export const recordsReaderRoles =
  ["admin", "adminOwner", "support", "salesStaff"] as const;

export type OrganizerPageState = "live" | "hiddenFromSearch" | "hiddenInApp" |
  "draft" | "suppressed" | "removed";
export type OrganizerClaimState = NonNullable<OrganizerDocument["claim"]>[
  "state"];
export type DirectoryEventStatus = "live" | "full" | "draft" | "needsCheck" |
  "cancelled" | "removed";
export type ImportPlatform = ExternalEventDocument["externalSource"][
  "platform"];

export type StaffNames = (uids: string[]) => Promise<Map<string, string>>;

export interface Facet {
  value: string;
  label: string;
  count: number;
}

const organizerTypeLabels: Record<string, string> = {
  club: "Club",
  community: "Community",
  individual: "Individual host",
  eventProducer: "Event producer",
  venue: "Venue",
  brand: "Brand",
};

/** The public page and app listing as one state, as the directory shows it. */
export function organizerPageState(
  organizer: Partial<OrganizerDocument>
): OrganizerPageState {
  const publishStatus = organizer.publicPage?.publishStatus;
  if (publishStatus === "removed") return "removed";
  if (publishStatus === "suppressed") return "suppressed";
  if (publishStatus !== "published") return "draft";
  if (organizer.appVisibility === "hidden") return "hiddenInApp";
  if (organizer.publicPage?.indexStatus === "noindex") {
    return "hiddenFromSearch";
  }
  return "live";
}

/** Missing claim records predate the claim model; they are unclaimed. */
export function organizerClaimState(
  organizer: Partial<OrganizerDocument>
): OrganizerClaimState {
  return organizer.claim?.state ?? "unclaimed";
}

/** The name a claimed organizer's host goes by, when it has one. */
export function organizerClaimedByName(
  organizer: Partial<OrganizerDocument>
): string | null {
  const state = organizerClaimState(organizer);
  if (state !== "claimed" && state !== "verified") return null;
  return organizer.hostName?.trim() || null;
}

/** What kind of organizer it is, in the words its page uses. */
export function organizerKindLabel(
  organizer: Partial<OrganizerDocument>
): string | null {
  return organizer.publicCategoryLabel?.trim() ||
    organizer.displayCategory?.trim() ||
    (organizer.organizerType ?
      organizerTypeLabels[organizer.organizerType] ?? null :
      null);
}

/** A stable filter value for a kind label. */
export function kindKey(label: string): string {
  return label.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80) || "other";
}

/** The canonical market id and its label, for a market id or alias. */
export function cityOf(value: string | null | undefined): {
  slug: string | null; label: string | null;
} {
  if (!value) return {slug: null, label: null};
  const market = marketForIdOrAlias(value);
  return market ?
    {slug: market.marketId, label: market.label} :
    {slug: value, label: value};
}

/** A Catch event's state in the directory. */
export function catchEventStatus(
  event: Partial<EventDocument>
): DirectoryEventStatus {
  if (event.status === "cancelled") return "cancelled";
  if (event.publicationState === "private") return "draft";
  if (event.discoveryAvailability === "full") return "full";
  return "live";
}

/** An imported event's state in the directory. */
export function importedEventStatus(
  event: Partial<ExternalEventDocument>
): DirectoryEventStatus {
  if (event.status === "cancelled") return "cancelled";
  if (event.publicationStatus === "removed" ||
      event.publicationStatus === "archived") return "removed";
  if (event.publicationStatus === "draft") return "needsCheck";
  return "live";
}

/** A Catch event's title; partial reads fall back to its format. */
export function catchEventTitle(event: Partial<EventDocument>): string {
  return event.name?.trim() || (event.eventFormat ?
    eventTitleLabel(event as EventDocument) :
    "Event");
}

/** Serializes Firestore timestamps for admin UI transport. */
export function timestampIso(value: unknown): string | null {
  const millis = timestampMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

/** Milliseconds of a Firestore timestamp, Date or ISO string. */
export function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const timestamp = value as {
    toMillis?: () => number;
    _seconds?: number;
    _nanoseconds?: number;
  };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp._seconds === "number") {
    return timestamp._seconds * 1000 +
      Math.floor((timestamp._nanoseconds ?? 0) / 1e6);
  }
  return null;
}

/** Lowercased query text, trimmed. */
export function normalizeQueryText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Every query word appears somewhere in the row's text. */
export function matchesQueryText(
  query: string,
  values: Array<string | null | undefined>
): boolean {
  if (!query) return true;
  const haystack = values
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/u).filter(Boolean)
    .every((token) => haystack.includes(token));
}

/** One page of already sorted rows from an opaque offset cursor. */
export function pageOf<T>(
  rows: T[],
  cursor: string | null | undefined,
  limit: number
): {rows: T[]; nextCursor: string | null} {
  const offset = cursor ? Number(cursor.slice(2)) : 0;
  const page = rows.slice(offset, offset + limit);
  const next = offset + page.length;
  return {
    rows: page,
    nextCursor: next < rows.length && next <= 99999 ? `o:${next}` : null,
  };
}

/** Bounds a requested page size. */
export function clampPageLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

/** Counts values into facets, largest first, then by label. */
export function countFacets(
  entries: Array<{value: string; label: string}>,
  max = 60
): Facet[] {
  const counts = new Map<string, Facet>();
  for (const {value, label} of entries) {
    const facet = counts.get(value) ?? {value, label, count: 0};
    facet.count += 1;
    counts.set(value, facet);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, max);
}

/** Blank strings and missing values become null before validation. */
export function normalizeNullableString(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Display names of staff from Firebase Auth; unknown uids are left out. */
export const authStaffNames: StaffNames = async (uids) => {
  const names = new Map<string, string>();
  const unique = [...new Set(uids)];
  for (let i = 0; i < unique.length; i += 100) {
    const result = await admin.auth().getUsers(
      unique.slice(i, i + 100).map((uid) => ({uid}))
    );
    for (const user of result.users) {
      const name = user.displayName?.trim() || user.email?.split("@")[0];
      if (name) names.set(user.uid, name);
    }
  }
  return names;
};
