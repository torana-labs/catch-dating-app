import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {claimFlowCopy} from "@content/claimFlow";
import {claimGuidance} from "@content/claimGuidance";
import {hostListings} from "../../../stories/fixtures/hostListings";
import type {HostListing} from "../../organizers/types";
import type {ClaimFlowController} from "../useClaimFlowController";
import {ClaimGuidance} from "./ClaimParts";
import {ClaimHeroSection, ClaimSearchSection} from "./ClaimPageSections";

afterEach(cleanup);

const listings = (hostListings as HostListing[]).slice(0, 2);
const controller = (overrides: Partial<ClaimFlowController> = {}) => ({
  activeRequestId: null, claimLookup: null, claimUrlState: null, clearListing: vi.fn(), listing: null,
  listingFromLink: false, markClaimStarted: vi.fn(), query: "", searchResults: listings, selectListing: vi.fn(),
  setQuery: vi.fn(), ...overrides,
}) as ClaimFlowController;

describe("claim landing", () => {
  it("opens with one headline, a search box, pages as rows and one way in for the unlisted", () => {
    const flow = controller();
    render(<><ClaimHeroSection listing={null} /><ClaimSearchSection controller={flow} /></>);
    expect(screen.getAllByRole("heading", {level: 1}).map((heading) => heading.textContent)).toEqual([claimFlowCopy.landing.title]);
    fireEvent.change(screen.getByRole("searchbox", {name: claimFlowCopy.landing.search.label}), {target: {value: "run"}});
    expect(flow.setQuery).toHaveBeenCalledWith("run");
    expect(screen.getByRole("heading", {name: claimFlowCopy.landing.resultsTitle})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: new RegExp(listings[0].name)}));
    expect(flow.selectListing).toHaveBeenCalledWith(listings[0]);
    const trial = screen.getByRole("link", {name: claimFlowCopy.landing.notListed.action});
    expect(trial.getAttribute("href")).toBe("/host/#start");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says what to do when nothing matches", () => {
    render(<ClaimSearchSection controller={controller({query: "zzz", searchResults: []})} />);
    expect(screen.getByRole("heading", {name: "Matches for “zzz”"})).toBeTruthy();
    expect(screen.getByText("No page matches “zzz”.")).toBeTruthy();
    expect(screen.getByText(claimFlowCopy.landing.noMatchBody)).toBeTruthy();
  });

  it("explains claiming beside the search in three steps, then the questions", () => {
    render(<ClaimGuidance />);
    const section = within(screen.getByRole("region", {name: claimGuidance.title}));
    for (const step of claimGuidance.steps) expect(section.getByText(step.title)).toBeTruthy();
    for (const item of claimGuidance.items) expect(section.getByText(item.question)).toBeTruthy();
    expect(section.getByRole("link", {name: claimGuidance.help}).getAttribute("href")).toBe("/help/");
  });
});
