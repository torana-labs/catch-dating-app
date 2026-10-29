import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {OrganizerListingReviewController} from "../controllers/useOrganizerListingReviewController";
import {renderOrganizerListingReview} from "./organizerListingReviewPanels";

afterEach(cleanup);

const listing = (overrides: Record<string, unknown> = {}) => ({
  requestId: "nom-afterfly", listingWorkItemId: "listing-afterfly", kind: "nomination",
  submittedByRole: "associate", submittedAt: "2026-10-24T08:00:00.000Z", origin: "admin_nomination",
  market: {slug: "mumbai", marketId: "in-mh-mumbai", label: "Mumbai · Maharashtra", open: true},
  suggestedSlug: "afterfly",
  listing: {name: "Afterfly", description: "Weekly social nights.", categories: ["social"],
    links: [{platform: "luma", url: "https://lu.ma/afterfly"}], gaps: ["seed_page_unreadable"], eventCount: 3,
    researchNeeded: true, contentHash: "a".repeat(64), pageCount: 1, fetchedPageCount: 0},
  duplicateCheck: null,
  ...overrides,
});

function controller(overrides: Partial<OrganizerListingReviewController> = {}) {
  return {
    page: {isPending: false, error: null}, rows: [listing()], canApprove: true, unavailableCount: 0,
    hasPreviousPage: false, hasNextPage: false, nextPage: vi.fn(), previousPage: vi.fn(),
    approve: vi.fn(async () => true), isApproving: false, ...overrides,
  } as unknown as OrganizerListingReviewController;
}

describe("organizer listing review", () => {
  it("approves only once every check is ticked, with what the reviewer confirmed", async () => {
    const current = controller();
    render(<>{renderOrganizerListingReview(current)}</>);
    expect(screen.getByText(/3 events · 0 of 1 pages read · 1 gaps/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    const approve = screen.getByRole("button", {name: "Approve and publish unclaimed"});
    expect(approve).toHaveProperty("disabled", true);
    for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
    expect(approve).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Review note"), {target: {value: "Checked the Luma calendar."}});
    fireEvent.change(screen.getByLabelText("Public page slug"), {target: {value: " Afterfly-Club "}});
    fireEvent.click(approve);
    await waitFor(() => expect(current.approve).toHaveBeenCalledWith(expect.objectContaining({
      listingWorkItemId: "listing-afterfly", contentHash: "a".repeat(64), name: "Afterfly",
      publicSlug: "afterfly-club", marketId: "in-mh-mumbai", organizerType: "community",
      note: "Checked the Luma calendar.",
    })));
    await waitFor(() => expect(screen.queryByRole("button", {name: "Approve and publish unclaimed"})).toBeNull());
  });

  it("shows a likely duplicate with a link to the organizer Catch already lists", () => {
    const duplicate = listing({
      listing: {...listing().listing, gaps: ["possible_duplicate_organizer", "seed_page_unreadable"]},
      duplicateCheck: {verdict: "match", organizersCompared: 42, citySlug: "mumbai", truncated: false, candidates: [
        {organizerId: "org-afterfly", name: "Afterfly Socials", score: 0.94, band: "match",
          rationale: "likely the same organizer (0.94): matches exact_name, same_market"},
      ]},
    });
    render(<>{renderOrganizerListingReview(controller({rows: [duplicate] as never}))}</>);
    expect(screen.getByText(/· possible duplicate/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    expect(screen.getByText("Possible duplicate organizer")).toBeTruthy();
    expect(screen.getByText(/Catch may already list this organizer \(possible_duplicate_organizer\)/)).toBeTruthy();
    expect(screen.getByText(/Compared with 42 published organizers in mumbai/)).toBeTruthy();
    expect(screen.getByText("Likely the same · score 0.94")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Afterfly Socials"}).getAttribute("href")).toBe("/organizers/org-afterfly");
    expect(screen.getByText(/matches exact_name, same_market/)).toBeTruthy();
    // Advisory: the reviewer can still approve a different organizer.
    expect(screen.getByRole("button", {name: "Approve and publish unclaimed"})).toBeTruthy();
  });

  it("says when no listed organizer matched, and when the listing was never compared", () => {
    const clean = listing({duplicateCheck: {verdict: "none", organizersCompared: 1, citySlug: null, truncated: true,
      candidates: []}});
    const {unmount} = render(<>{renderOrganizerListingReview(controller({rows: [clean] as never}))}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    expect(screen.getByText(/Compared with 1 published organizer across every city: none looks like the same/))
      .toBeTruthy();
    expect(screen.getByText(/Only the first ones were compared/)).toBeTruthy();
    unmount();
    render(<>{renderOrganizerListingReview(controller())}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    expect(screen.getByText(/was not compared with the organizers Catch/)).toBeTruthy();
  });

  it("asks for an open market when the organizer's city is not one yet", () => {
    render(<>{renderOrganizerListingReview(controller({rows: [listing({market: {slug: "bengaluru",
      marketId: "in-ka-bengaluru", label: "Bengaluru · Karnataka", open: false}})] as never}))}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    expect(screen.getByText(/which Catch has not opened/)).toBeTruthy();
    expect((screen.getByLabelText("Launch market") as HTMLSelectElement).value).toBe("");
  });

  it("shows support the listing but not the approval form", () => {
    render(<>{renderOrganizerListingReview(controller({canApprove: false}))}</>);
    fireEvent.click(screen.getByRole("button", {name: "Review"}));
    expect(screen.getByText(/needs an admin or admin owner/)).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Approve and publish unclaimed"})).toBeNull();
  });

  it("says when nothing is waiting", () => {
    render(<>{renderOrganizerListingReview(controller({rows: [], unavailableCount: 2}))}</>);
    expect(screen.getByText("No listings are waiting for review.")).toBeTruthy();
    expect(screen.getByText(/2 finished requests on this page/)).toBeTruthy();
  });
});
