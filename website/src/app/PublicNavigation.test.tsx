import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {HomePage} from "../features/home/HomePage";
import {ExplorePage} from "../features/home/ExplorePage";
import {MemoryRouter} from "react-router";
import {ClaimPage} from "../features/claims/ClaimPage";
import {mumbaiLiveCatalog} from "../stories/fixtures/homeCatalogs";
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
    renderPage(<HomePage catalog={mumbaiLiveCatalog} />);
    const nav = screen.getByRole("navigation", {name: "Main"});
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href")))
      .toEqual(["/mumbai/", "/explore/?show=organisers", "/host/", "#app"]);
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
  });

  it("uses the same city navigation for Explore", () => {
    renderPage(<MemoryRouter initialEntries={["/mumbai/"]}><ExplorePage catalog={mumbaiLiveCatalog} /></MemoryRouter>);
    const nav = screen.getByRole("navigation", {name: "Main"});
    expect(within(nav).getAllByRole("link").map(link => link.getAttribute("href")))
      .toEqual(["/mumbai/", "/explore/?show=organisers", "/host/", "/#app"]);
    expect(screen.getByRole("heading", {level: 1, name: "What’s on in Mumbai"})).toBeTruthy();
  });

  it("gives the claim page the same header and footer as every public route", () => {
    renderPage(<ClaimPage routeState={emptyClaimRouteState} />);
    const nav = screen.getByRole("navigation", {name: "Primary"});
    expect(within(nav).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/explore/", "/organizers/", "/host/"]);
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
    const footer = screen.getByRole("navigation", {name: "Footer"});
    expect(within(footer).getByRole("link", {name: "Help"}).getAttribute("href")).toBe("/help/");
    expect(within(footer).getByRole("link", {name: "Refunds"}).getAttribute("href")).toBe("/refunds/");
    expect(within(footer).getByRole("link", {name: "Contact"}).getAttribute("href")).toBe("/contact/");
    expect(within(footer).getByRole("link", {name: "Find events"}).getAttribute("href")).toBe("/explore/");
  });
});
