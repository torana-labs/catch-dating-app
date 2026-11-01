import {httpsCallable} from "firebase/functions";
import type {AdminListListingEventImportsCallablePayload} from
  "../../../../generated/contracts/adminListListingEventImportsCallablePayload";
import type {AdminListListingEventImportsCallableResponse} from
  "../../../../generated/contracts/adminListListingEventImportsCallableResponse";
import type {AdminPublishListingEventsCallablePayload} from
  "../../../../generated/contracts/adminPublishListingEventsCallablePayload";
import type {AdminPublishListingEventsCallableResponse} from
  "../../../../generated/contracts/adminPublishListingEventsCallableResponse";
import type {AdminRefreshOrganizerEventsCallablePayload} from
  "../../../../generated/contracts/adminRefreshOrganizerEventsCallablePayload";
import type {AdminRefreshOrganizerEventsCallableResponse} from
  "../../../../generated/contracts/adminRefreshOrganizerEventsCallableResponse";
import {takedownExternalEvent} from "../../../../shared/api/adminApi";
import type {AdminTakedownExternalEventResponse} from "../../../../shared/types/adminTypes";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type ListingEventImportPage = AdminListListingEventImportsCallableResponse;
export type ListingEventImport = ListingEventImportPage["rows"][number];
export type ImportedEvent = ListingEventImport["events"][number];
export type ListingEventPublishInput = AdminPublishListingEventsCallablePayload;
export type ListingEventPublishResult = AdminPublishListingEventsCallableResponse;

// The validators are loaded on first call, not bundled into the intake chunk.
async function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}

const sampleEvent = (overrides: Partial<ImportedEvent>): ImportedEvent => ({
  eventWorkItemId: "supply-intake-sample-event", eventId: "ext-sample-afterfly-run", title: "Sunday social run",
  startAt: "2026-11-02T01:30:00.000Z", endAt: "2026-11-02T03:30:00.000Z", venue: "Carter Road Promenade",
  address: "Bandra West, Mumbai", platform: "luma", sourceUrl: "https://lu.ma/afterfly-run", priceLabel: "Free",
  state: "published", publishedBy: "policy", blockers: [], resolvableBlockers: [], automatedFindings: [],
  ...overrides,
});
const samplePage = (): ListingEventImportPage => ({
  policy: {mode: "auto_publish_approved_organizers", policyVersion: "supply-event-publication-v1"},
  rows: [{intakeRequestId: "nom-sample-afterfly", listingId: "listing-sample-afterfly",
    approvedAt: "2026-10-24T09:00:00.000Z",
    organizer: {organizerId: "sample-afterfly", name: "Afterfly", canonicalPath: "/organizers/afterfly/",
      appVisibility: "hidden", pagePublished: true},
    events: [
      sampleEvent({}),
      sampleEvent({eventWorkItemId: "supply-intake-sample-mixer", eventId: "ext-sample-afterfly-mixer",
        title: "Singles mixer night", startAt: "2026-11-07T14:00:00.000Z", endAt: "2026-11-07T17:00:00.000Z",
        venue: "Bonobo", address: "Bandra West, Mumbai", sourceUrl: "https://lu.ma/afterfly-mixer",
        priceLabel: "₹499", state: "ready", publishedBy: null,
        automatedFindings: [{check: "dating_framing", field: "title", match: "Singles"}]}),
      sampleEvent({eventWorkItemId: "supply-intake-sample-online", eventId: "ext-sample-afterfly-online",
        title: "Route planning call", startAt: "2026-11-04T14:00:00.000Z", endAt: null, venue: null, address: null,
        sourceUrl: "https://lu.ma/afterfly-call", priceLabel: null, state: "needs_resolution", publishedBy: null,
        blockers: ["missing_end_time", "missing_exact_coordinates", "missing_location_detail"],
        resolvableBlockers: ["missing_end_time", "missing_exact_coordinates", "missing_location_detail"]}),
    ]}],
  nextCursor: null,
  unavailableCount: 0,
});
let sample: ListingEventImportPage | null = null;

/** Approved listings with the events each imported, most recently approved first. */
export async function listListingEventImports(
  input: AdminListListingEventImportsCallablePayload
): Promise<ListingEventImportPage> {
  if (dataMode() !== "sample") return call("adminListListingEventImports", input);
  sample ??= samplePage();
  return structuredClone(sample);
}

/** Publishes chosen events of one approved listing; blocked ones are reported, not written. */
export async function publishListingEvents(input: ListingEventPublishInput): Promise<ListingEventPublishResult> {
  if (dataMode() !== "sample") return call("adminPublishListingEvents", input);
  sample ??= samplePage();
  const row = sample.rows.find((entry) => entry.intakeRequestId === input.intakeRequestId);
  const results = input.eventWorkItemIds.map((eventWorkItemId) => {
    const event = row?.events.find((entry) => entry.eventWorkItemId === eventWorkItemId);
    const blocked = !event || event.state === "blocked";
    if (event && !blocked && input.executionMode === "apply") {
      Object.assign(event, {state: "published", publishedBy: "staff", blockers: [], resolvableBlockers: [],
        automatedFindings: []});
    }
    return {eventWorkItemId, eventId: event?.eventId ?? null, blockers: blocked ? ["sample_blocked"] : [],
      outcome: blocked ? "blocked" as const : input.executionMode === "apply" ? "published" as const :
        "would_publish" as const, receiptPath: null, idempotent: false};
  });
  const count = (outcome: string) => results.filter((entry) => entry.outcome === outcome).length;
  return {intakeRequestId: input.intakeRequestId, organizerId: row?.organizer.organizerId ?? null,
    executionMode: input.executionMode, results, counts: {published: count("published"),
      wouldPublish: count("would_publish"), alreadyPublished: 0, withdrawn: 0, blocked: count("blocked")}};
}

/** Reads new events for a listed, unclaimed organizer from its page's calendar links. */
export async function refreshOrganizerEvents(input: AdminRefreshOrganizerEventsCallablePayload):
  Promise<AdminRefreshOrganizerEventsCallableResponse> {
  if (dataMode() !== "sample") return call("adminRefreshOrganizerEvents", input);
  return {requestId: `refresh-sample-${input.organizerId}`, created: true, status: "queued",
    urls: ["https://lu.ma/afterfly"]};
}

/** Takes one published event off the website and the app; its record and receipts stay. */
export async function withdrawImportedEvent(input: {eventId: string; idempotencyKey: string; reviewNote: string}):
  Promise<AdminTakedownExternalEventResponse> {
  const response = await takedownExternalEvent({eventId: input.eventId, executionMode: "apply",
    idempotencyKey: input.idempotencyKey, reviewNote: input.reviewNote,
    checklist: {sourceStatusReviewed: true, takedownAuthorityReviewed: true, downstreamVisibilityReviewed: true}});
  if (dataMode() === "sample" && sample) {
    for (const row of sample.rows) {
      for (const event of row.events) if (event.eventId === input.eventId) event.state = "withdrawn";
    }
  }
  return response;
}
