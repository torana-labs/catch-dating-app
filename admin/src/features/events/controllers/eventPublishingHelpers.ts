import type {
  AdminEventActivityKind,
  AdminEventDetails,
  AdminEventInteractionModel,
  AdminEventPace,
  AdminExternalEventListRow,
  AdminUpdateEventDetailsPayload,
} from "../../../shared/types/adminTypes";

export interface EventPublishingFormState {
  eventId: string;
  description: string;
  photoUrl: string;
  activityKind: AdminEventActivityKind;
  interactionModel: AdminEventInteractionModel;
  customActivityLabel: string;
  distanceKm: string;
  pace: AdminEventPace;
  crossPathsDiscoveryEnabled: boolean;
  hostPilotRealEvent: boolean;
  reviewNote: string;
}

export interface EventValidationIssue {
  id: string;
  label: string;
  detail: string;
  severity: "blocker" | "warning";
}

export interface EventValidationOptions {
  requireReviewNote?: boolean;
}

export interface EventDiffRow {
  field: string;
  before: string;
  after: string;
}

export const eventActivityKindOptions: AdminEventActivityKind[] = [
  "socialRun",
  "running",
  "walking",
  "pickleball",
  "padel",
  "tennis",
  "badminton",
  "cycling",
  "spinClass",
  "yoga",
  "strengthTraining",
  "pubQuiz",
  "barCrawl",
  "dinner",
  "singlesMixer",
  "openActivity",
];

export const eventInteractionModelOptions: AdminEventInteractionModel[] = [
  "pacePods",
  "pairedRotations",
  "teamRotations",
  "seatedTable",
  "freeFormMixer",
  "hostLedProgram",
  "openFormat",
];

export const eventPaceOptions: AdminEventPace[] = [
  "easy",
  "moderate",
  "fast",
  "competitive",
];

export function formFromEventProfile(
  event: AdminEventDetails
): EventPublishingFormState {
  return {
    eventId: event.eventId,
    description: event.description,
    photoUrl: event.photoUrl ?? "",
    activityKind: event.eventFormat.activityKind,
    interactionModel: event.eventFormat.interactionModel,
    customActivityLabel: event.eventFormat.customActivityLabel ?? "",
    distanceKm: String(event.distanceKm),
    pace: event.pace,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled,
    hostPilotRealEvent: event.hostPilotReview?.realEvent === true,
    reviewNote: "",
  };
}

export function diffEventProfile(
  event: AdminEventDetails | null,
  form: EventPublishingFormState | null
): EventDiffRow[] {
  if (!event || !form) return [];
  const original = formFromEventProfile(event);
  const rows: EventDiffRow[] = [];
  for (const key of Object.keys(original) as Array<keyof EventPublishingFormState>) {
    if (key === "reviewNote") continue;
    const before = normalizeComparable(original[key]);
    const after = normalizeComparable(form[key]);
    if (before !== after) {
      rows.push({
        field: labelFromKey(key),
        before: before || "empty",
        after: after || "empty",
      });
    }
  }
  return rows;
}

export function buildEventSavePayload(
  event: AdminEventDetails,
  form: EventPublishingFormState
): AdminUpdateEventDetailsPayload {
  const original = formFromEventProfile(event);
  const fields: AdminUpdateEventDetailsPayload["fields"] = {};
  addChanged(fields, "description", original.description, form.description.trim());
  addChanged(fields, "photoUrl", original.photoUrl, nullableText(form.photoUrl));
  addChanged(
    fields,
    "distanceKm",
    normalizeDistance(original.distanceKm),
    normalizeDistance(form.distanceKm)
  );
  addChanged(fields, "pace", original.pace, form.pace);
  addChanged(
    fields,
    "crossPathsDiscoveryEnabled",
    original.crossPathsDiscoveryEnabled,
    form.crossPathsDiscoveryEnabled
  );

  if (original.hostPilotRealEvent !== form.hostPilotRealEvent) {
    fields.hostPilotReview = {realEvent: form.hostPilotRealEvent,
      expectedRevision: event.hostPilotReview?.revision ?? 0};
  }

  const eventFormatChanged =
    original.activityKind !== form.activityKind ||
    original.interactionModel !== form.interactionModel ||
    normalizeComparable(original.customActivityLabel) !==
      normalizeComparable(form.customActivityLabel);
  if (eventFormatChanged) {
    const customActivityLabel = nullableText(form.customActivityLabel);
    fields.eventFormat = {
      version: 1,
      activityKind: form.activityKind,
      interactionModel: form.interactionModel,
      ...(customActivityLabel ? {customActivityLabel} : {}),
    };
  }

  return {
    eventId: form.eventId.trim(),
    fields,
    reviewNote: nullableText(form.reviewNote),
  };
}

export function validateEventPublishingForm(
  form: EventPublishingFormState | null,
  options: EventValidationOptions = {}
): EventValidationIssue[] {
  if (!form) {
    return [{
      id: "no-form",
      label: "No event loaded",
      detail: "Load a canonical events/{id} document before saving.",
      severity: "blocker",
    }];
  }
  const issues: EventValidationIssue[] = [];
  requireText(issues, "event-id", "Event id", form.eventId);
  requireText(issues, "description", "Description", form.description);
  const distance = normalizeDistance(form.distanceKm);
  if (!Number.isFinite(distance) || distance <= 0 || distance > 100) {
    issues.push({
      id: "distance",
      label: "Distance",
      detail: "Distance must be a number between 0 and 100 km.",
      severity: "blocker",
    });
  }
  if (options.requireReviewNote && !form.reviewNote.trim()) {
    issues.push({
      id: "review-note",
      label: "Review note",
      detail: "Add a review note so the audited event save has context.",
      severity: "blocker",
    });
  }
  return issues;
}

export function hasBlockingEventIssues(
  issues: EventValidationIssue[]
): boolean {
  return issues.some((issue) => issue.severity === "blocker");
}

export function countBlockingEventIssues(
  issues: EventValidationIssue[]
): number {
  return issues.filter((issue) => issue.severity === "blocker").length;
}

export function countEventDiffRows(rows: EventDiffRow[]): number {
  return rows.length;
}

export function eventNeedsSearchBackfill(row: {
  searchIndexStatus: "missing" | "indexed";
}): boolean {
  return row.searchIndexStatus !== "indexed";
}

export function eventIsFull(row: {
  bookedCount: number;
  capacityLimit: number;
}): boolean {
  return row.bookedCount >= row.capacityLimit;
}

export function externalEventNeedsReview(
  row: Pick<
    AdminExternalEventListRow,
    "importPolicyAcknowledged" | "ownerSafeCopyReviewed" | "publicationStatus"
  >
): boolean {
  return row.publicationStatus !== "public" ||
    !row.importPolicyAcknowledged ||
    !row.ownerSafeCopyReviewed;
}

export function formatEventLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function requireText(
  issues: EventValidationIssue[],
  id: string,
  label: string,
  value: string
) {
  if (value.trim()) return;
  issues.push({
    id,
    label,
    detail: `${label} is required for a canonical event listing.`,
    severity: "blocker",
  });
}

function addChanged<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  before: unknown,
  after: T[K]
) {
  if (normalizeComparable(before) !== normalizeComparable(after)) {
    target[key] = after;
  }
}

function normalizeComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeDistance(value: string): number {
  return Number(value.trim());
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
