import type {
  EventDocument,
  EventFormatSnapshot,
} from "./generated/firestoreAdminTypes";

const activityLabels: Record<EventFormatSnapshot["activityKind"], string> = {
  socialRun: "Social run",
  running: "Running",
  walking: "Walking",
  pickleball: "Pickleball",
  padel: "Padel",
  tennis: "Tennis",
  badminton: "Badminton",
  cycling: "Cycling",
  spinClass: "Spin class",
  yoga: "Yoga",
  strengthTraining: "Strength training",
  pubQuiz: "Pub quiz",
  barCrawl: "Bar crawl",
  dinner: "Dinner",
  singlesMixer: "Singles mixer",
  openActivity: "Open activity",
};

/** Returns the reader-facing event format label used by server projections. */
export function eventFormatLabel(format: EventFormatSnapshot): string {
  return format.customActivityLabel?.trim() ||
    activityLabels[format.activityKind] ||
    humanizeToken(format.activityKind);
}

/** Returns a compact title derived from canonical event format data. */
export function eventTitleLabel(event: EventDocument): string {
  const name = event.name?.trim();
  if (name) return name;
  return event.eventFormat ? eventFormatLabel(event.eventFormat) : "Event";
}

function humanizeToken(value: string): string {
  const words = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** Returns copy only for distance activities with a positive distance. */
export function eventDistanceLabel(event: EventDocument): string | null {
  const kind = event.eventFormat?.activityKind;
  const distance = event.distanceKm;
  if (kind && !["socialRun", "running", "walking", "cycling"].includes(kind) ||
      typeof distance !== "number" || !Number.isFinite(distance) ||
      distance <= 0) return null;
  return Number.isInteger(distance) ?
    `${distance} km` : `${distance.toFixed(1)} km`;
}

/** A Catch event's title; partial reads fall back to its format. */
export function catchEventTitle(event: Partial<EventDocument>): string {
  return event.name?.trim() || (event.eventFormat ?
    eventTitleLabel(event as EventDocument) :
    "Event");
}
