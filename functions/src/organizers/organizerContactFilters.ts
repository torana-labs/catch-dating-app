import {createHash} from "crypto";
import type {OrganizerContactTraitDocument} from
  "../shared/generated/firestoreAdminTypes";
import {organizerContactTraitMatchesSegment} from "./organizerAudienceModel";

type Segment = OrganizerContactTraitDocument["segmentIds"][number];
export interface ContactFilterSelection {
  segmentIds: Segment[];
  manualTagIds: string[];
}

/** Fixed product facets: OR within a facet, AND across nonempty facets. */
export const organizerContactFilterGroups: readonly (readonly Segment[])[] = [
  ["new_to_organizer", "past_attendee", "first_time_attendee",
    "repeat_attendee", "regular", "lapsed_regular"],
  ["reliable_attendee", "needs_confirmation"],
  ["advocate", "high_impact_advocate"],
  ["whatsapp_reachable", "sms_reachable"],
  ["active_member", "lapsed_member", "member_no_recent_attendance",
    "frequent_non_member"],
];

export function contactFilterSelection(input: {
  segmentId?: Segment | null;
  segmentIds?: Segment[];
  manualTagId?: string | null;
  manualTagIds?: string[];
}): ContactFilterSelection {
  return {
    segmentIds: [...new Set([
      ...(input.segmentIds ?? []),
      ...(input.segmentId ? [input.segmentId] : []),
    ])].sort(),
    manualTagIds: [...new Set([
      ...(input.manualTagIds ?? []),
      ...(input.manualTagId ? [input.manualTagId] : []),
    ])].sort(),
  };
}

export function selectedContactFilterGroups(
  selection: ContactFilterSelection
): Segment[][] {
  return organizerContactFilterGroups.map((group) =>
    group.filter((segment) => selection.segmentIds.includes(segment)))
    .filter((group) => group.length > 0);
}

export function contactMatchesFilters(
  selection: ContactFilterSelection,
  manualTagIds: readonly string[],
  trait: OrganizerContactTraitDocument | undefined
): boolean {
  return (selection.manualTagIds.length === 0 ||
    selection.manualTagIds.some((tag) => manualTagIds.includes(tag))) &&
    selectedContactFilterGroups(selection).every((group) =>
      trait !== undefined && group.some((segment) =>
        organizerContactTraitMatchesSegment(trait, segment)));
}

export function contactFilterKey(selection: ContactFilterSelection): string {
  return createHash("sha256").update(JSON.stringify(
    contactFilterSelection(selection)
  )).digest("hex");
}
