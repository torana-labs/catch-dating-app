import type {EventDirectoryRow} from "../api/eventDirectoryRepository";

export type RecordTone = "success" | "warning" | "danger" | "info" |
  "neutral";

export interface ToneText {
  text: string;
  tone: RecordTone | null;
}

const platformLabels: Record<NonNullable<EventDirectoryRow["platform"]>,
  string> = {
  bookMyShow: "BookMyShow",
  district: "District",
  luma: "Luma",
  partiful: "Partiful",
  sortMyScene: "SortMyScene",
};

/** "Catch" for events made in Catch, else the platform it came from. */
export function eventSourceLabel(
  row: Pick<EventDirectoryRow, "source" | "platform">
): {label: string; tone: RecordTone} {
  if (row.source === "catch") return {label: "Catch", tone: "info"};
  return {
    label: row.platform ? platformLabels[row.platform] : "Imported",
    tone: "neutral",
  };
}

/** "Made in Catch" or "From Luma", for an event's facts. */
export function eventOriginLabel(
  row: Pick<EventDirectoryRow, "source" | "platform">
): string {
  return row.source === "catch" ? "Made in Catch" :
    `From ${eventSourceLabel(row).label}`;
}

export function eventStatusLabel(
  status: EventDirectoryRow["status"]
): ToneText {
  switch (status) {
  case "live": return {text: "Live", tone: "success"};
  case "full": return {text: "Full", tone: "neutral"};
  case "draft": return {text: "Draft", tone: null};
  case "needsCheck": return {text: "Needs a check", tone: "warning"};
  case "cancelled": return {text: "Cancelled", tone: "danger"};
  case "removed": return {text: "Taken down", tone: null};
  }
}

/** "26 of 32" for a Catch event; imported events don't report bookings. */
export function eventBookedLabel(
  row: Pick<EventDirectoryRow, "bookedCount" | "capacityLimit">
): string {
  if (row.bookedCount === null) return "—";
  return row.capacityLimit ? `${row.bookedCount} of ${row.capacityLimit}` :
    String(row.bookedCount);
}
