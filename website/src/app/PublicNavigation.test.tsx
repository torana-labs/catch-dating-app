import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {HomePage, VisitorDiscoveryPage} from "../features/home/HomePage";
import {ClaimPage} from "../features/claims/ClaimPage";
import {emptyClaimRouteState} from "../features/claims/claimRouting";

vi.mock("../analytics", () => ({trackMarketingEvent: vi.fn()}));
vi.mock("../firebaseConfig", () => ({claimFirebaseConfigured: false,
  publicReviewsFirebaseConfigured: false}));
vi.mock("../firebase", () => ({watchClaimAuthState: (callback: (user: null) => void) => {
  callback(null); return () => undefined;
}, requestOrganizerClaim: vi.fn(), signInForClaim: vi.fn(), signOutClaimUser: vi.fn()}));
afterEach(cleanup);

function renderPage(page: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions: {
    queries: {retry: false}, mutations: {retry: false},
  }})}>{page}</QueryClientProvider>);
}

describe("public route navigation targets", () => {
  it("shares canonical audience destinations without a duplicate root menu", () => {
    renderPage(<HomePage captures={{}} />);
    const nav = screen.getByRole("navigation", {name: "Primary"});
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href")))
      .toEqual(["/explore/", "/organizers/", "/host/"]);
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
  });

  it("uses the same primary navigation for event discovery", () => {
    renderPage(<VisitorDiscoveryPage captures={{}} />);
    const nav = screen.getByRole("navigation", {name: "Primary"});
    expect(within(nav).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/explore/", "/organizers/", "/host/"]);
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
    expect(screen.getByRole("heading", {name: "Find your next plan."})).toBeTruthy();
    expect(screen.getByRole("search")).toBeTruthy();
  });

  it("gives the claim page the same header and footer as every public route", () => {
    renderPage(<ClaimPage routeState={emptyClaimRouteState} />);
    const nav = screen.getByRole("navigation", {name: "Primary"});
    expect(within(nav).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/explore/", "/organizers/", "/host/"]);
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
    const footer = screen.getByRole("navigation", {name: "Footer"});
    expect(within(footer).getByRole("link", {name: "Help"}).getAttribute("href")).toBe("/help/");
    expect(within(footer).getByRole("link", {name: "Find events"}).getAttribute("href")).toBe("/explore/");
  });
});
