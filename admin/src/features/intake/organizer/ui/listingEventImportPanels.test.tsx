import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {ListingEventImportsController} from "../controllers/useListingEventImportsController";
import {renderListingEventImports} from "./listingEventImportPanels";

afterEach(cleanup);

const event = (overrides: Record<string, unknown>) => ({
  eventWorkItemId: "event-run", eventId: "ext-run", title: "Sunday social run", startAt: "2026-11-02T01:30:00.000Z",
  endAt: "2026-11-02T03:30:00.000Z", venue: "Carter Road", address: "Bandra West", platform: "luma",
  sourceUrl: "https://lu.ma/run", priceLabel: "Free", state: "published", publishedBy: "policy", blockers: [],
  resolvableBlockers: [], automatedFindings: [], ...overrides,
});

const listing = {intakeRequestId: "nom-afterfly", listingId: "listing-afterfly", approvedAt: "2026-10-24T09:00:00.000Z",
  organizer: {organizerId: "afterfly", name: "Afterfly", canonicalPath: "/organizers/afterfly/",
    appVisibility: "hidden", pagePublished: true},
  events: [
    event({}),
    event({eventWorkItemId: "event-mixer", eventId: "ext-mixer", title: "Singles mixer night", state: "ready",
      publishedBy: null, automatedFindings: [{check: "dating_framing", field: "title", match: "Singles"}]}),
    event({eventWorkItemId: "event-call", eventId: "ext-call", title: "Route planning call", state: "needs_resolution",
      publishedBy: null, venue: null, endAt: null, blockers: ["missing_end_time"],
      resolvableBlockers: ["missing_end_time"]}),
    event({eventWorkItemId: "event-old", eventId: "ext-old", title: "Last month's run", state: "blocked",
      publishedBy: null, blockers: ["event_already_ended"]}),
  ]};

function controller(overrides: Partial<ListingEventImportsController> = {}) {
  return {
    page: {isPending: false, error: null}, rows: [listing],
    policy: {mode: "auto_publish_approved_organizers", policyVersion: "supply-event-publication-v1"},
    unavailableCount: 0, hasPreviousPage: false, hasNextPage: false, nextPage: vi.fn(), previousPage: vi.fn(),
    publish: vi.fn(async () => true), withdraw: vi.fn(async () => true), refresh: vi.fn(async () => true),
    isPublishing: false, isWithdrawing: false, isRefreshing: false,
    ...overrides,
  } as unknown as ListingEventImportsController;
}

describe("imported events", () => {
  it("summarises each approved listing and explains what the policy left for a person", () => {
    render(<>{renderListingEventImports(controller())}</>);
    expect(screen.getByText(/publish on the organizer's page by themselves/)).toBeTruthy();
    expect(screen.getByText(/1 published · 1 ready · 1 needs a check · 1 blocked/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Review events"}));
    expect(screen.getByText("Published by policy")).toBeTruthy();
    expect(screen.getByText(/Left for a person: its title says "Singles"/)).toBeTruthy();
    expect(screen.getByText("Cannot publish: already ended.")).toBeTruthy();
    expect(screen.queryByRole("checkbox", {name: "Publish Last month's run"})).toBeNull();
  });

  it("publishes chosen events only once the checklist, note and each needed check are given", async () => {
    const current = controller();
    render(<>{renderListingEventImports(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review events"}));
    fireEvent.click(screen.getByRole("checkbox", {name: "Publish Singles mixer night"}));
    fireEvent.click(screen.getByRole("checkbox", {name: "Publish Route planning call"}));
    const publish = screen.getByRole("button", {name: "Publish 2 events"});
    for (const label of [/opens the organizer's own page/, /Catch takes no booking/, /fit to show on Catch/]) {
      fireEvent.click(screen.getByRole("checkbox", {name: label}));
    }
    fireEvent.change(screen.getByLabelText("Review note"), {target: {value: "Checked both on Luma."}});
    expect(publish).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("What you checked for Route planning call"),
      {target: {value: "Online call, an hour long."}});
    fireEvent.click(publish);
    await waitFor(() => expect(current.publish).toHaveBeenCalledWith({intakeRequestId: "nom-afterfly",
      eventWorkItemIds: ["event-mixer", "event-call"], reviewNote: "Checked both on Luma.",
      checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: true},
      blockerResolutions: [{eventWorkItemId: "event-call", blockerCode: "missing_end_time", outcome: "resolved",
        policyGapDecisionId: null, note: "Online call, an hour long."}]}));
  });

  it("withdraws a published event with a reason", async () => {
    const current = controller();
    render(<>{renderListingEventImports(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review events"}));
    fireEvent.click(screen.getByRole("button", {name: "Withdraw"}));
    fireEvent.change(screen.getByLabelText("Why it comes down"), {target: {value: "The organizer cancelled it."}});
    fireEvent.click(screen.getByRole("button", {name: "Withdraw event"}));
    await waitFor(() => expect(current.withdraw).toHaveBeenCalledWith({eventId: "ext-run",
      reviewNote: "The organizer cancelled it."}));
  });

  it("checks a listed organizer's calendar for new events", async () => {
    const current = controller();
    render(<>{renderListingEventImports(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review events"}));
    fireEvent.click(screen.getByRole("button", {name: "Check for new events"}));
    await waitFor(() => expect(current.refresh).toHaveBeenCalledWith("afterfly"));
  });

  it("says when nothing has been imported and when the policy is staff review", () => {
    render(<>{renderListingEventImports(controller({rows: [], unavailableCount: 1,
      policy: {mode: "staff_review", policyVersion: "v"}}))}</>);
    expect(screen.getByText("No approved listing has imported events yet.")).toBeTruthy();
    expect(screen.getByText(/waits here until you publish it/)).toBeTruthy();
    expect(screen.getByText(/1 approved listing on this page/)).toBeTruthy();
  });
});
