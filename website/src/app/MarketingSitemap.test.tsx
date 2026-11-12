import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {HostPage} from "../features/host/HostPage";
import {HostApplicationPage} from "../features/host/HostApplicationPage";
import {hostLandingCopy} from "@content/hostLanding";
import {marketingCaptures} from "./marketingCaptures";
import {retiredMarketingDestination} from "./retiredMarketingRoutes";
import {getPageKey, pageMeta, pageMetaForHostPath, pageMetaForWeddingsPath} from "./pageMeta";
import {brand} from "@catch/brand";

const redirects = [
  ["overview", "/"], ["platform", "/host/#features"], ["workflows", "/host/#how-it-works"],
  ["planners", "/host/#use-cases"], ["mixers", "/host/#use-cases"], ["clubs", "/host/#use-cases"],
  ["stack", "/host/#existing-tools"], ["directory", "/organizers/"], ["claim", "/claim/"], ["preview", "/host/"],
];

afterEach(cleanup);
const renderPage = (page: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);

describe("consolidated public sitemap", () => {
  it("provides every replacement section and sends hosts to the self-serve start band", () => {
    const {container} = renderPage(<HostPage captures={marketingCaptures} />);
    for (const id of ["features", "how-it-works", "use-cases", "existing-tools", "pricing", "apply", "start"]) expect(container.querySelector(`#${id}`)).toBeTruthy();
    expect(container.querySelector("form")).toBeNull();
    const starts = screen.getAllByRole("link", {name: hostLandingCopy.header.start});
    expect(starts.length).toBeGreaterThan(0);
    for (const link of starts) expect(link.getAttribute("href")).toBe("#start");
  });
  it("mounts the existing application at the canonical apply page", () => {
    const {container} = renderPage(<HostApplicationPage />);
    expect(screen.getByRole("heading", {level: 1, name: "Apply for a Catch Host pilot"})).toBeTruthy();
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(screen.getByText(/submission does not book a call or grant access/)).toBeTruthy();
    expect(pageMetaForHostPath("/host/apply/")?.canonicalPath).toBe("/host/apply/");
  });
  it("routes Catch for weddings and its application under one page key; the landing is indexed, the application is not", () => {
    for (const pathname of ["/weddings", "/weddings/", "/weddings/apply", "/weddings/apply/"]) expect(getPageKey(pathname)).toBe("weddings");
    expect(pageMeta.weddings.canonicalPath).toBe("/weddings/");
    expect(pageMeta.weddings.robots).toBeUndefined();
    expect(pageMetaForWeddingsPath("/weddings/apply")?.canonicalPath).toBe("/weddings/apply/");
    expect(pageMetaForWeddingsPath("/weddings/apply/")?.robots).toBe("noindex, follow");
    expect(pageMetaForWeddingsPath("/weddings/")).toBeNull();
    expect(getPageKey("/weddings/unknown/")).toBe("not_found");
  });
  it("matches every Hosting retirement redirect and preserves attribution and claim lookup", () => {
    for (const [slug, destination] of redirects) {
      for (const suffix of ["", "/", "/old-section"]) {
        const result = retiredMarketingDestination({pathname: `/host/${slug}${suffix}`, search: "?listing=real-id&utm_source=partner", hash: "#obsolete"});
        const target = new URL(destination, brand.web.origin);
        expect(result).toBe(`${target.pathname}?listing=real-id&utm_source=partner${target.hash}`);
      }
    }
    expect(retiredMarketingDestination({pathname: "/host/", search: "?utm_source=old", hash: "#founding-hosts"})).toBe("/host/apply/?utm_source=old");
    expect(retiredMarketingDestination({pathname: "/host/", search: "", hash: "#features?utm_source=partner&listing=real-id"}))
      .toBe("/host/?utm_source=partner&listing=real-id#features");
    expect(retiredMarketingDestination({pathname: "/host/", search: "?utm_source=partner", hash: "#features"})).toBeNull();
    expect(getPageKey("/host/unknown/")).toBe("not_found");
  });
  it("routes the programme's token links under one noindex page key", () => {
    for (const pathname of ["/itinerary/t.s/", "/ids/t.s/", "/hotel/t.s/", "/trip/t.s/", "/runsheet/t.s/", "/hampers/t.s/", "/family/t.s/"]) {
      expect(getPageKey(pathname)).toBe("programme_link");
      expect(retiredMarketingDestination({pathname, search: "", hash: ""})).toBeNull();
    }
    expect(pageMeta.programme_link.robots).toBe("noindex, follow");
    expect(getPageKey("/hotels/")).toBe("not_found");
  });
  it("serves the signed-in account page under its own noindex page key", () => {
    expect(getPageKey("/account/")).toBe("account");
    expect(getPageKey("/account")).toBe("account");
    expect(retiredMarketingDestination({pathname: "/account/", search: "", hash: "#following"})).toBeNull();
    expect(pageMeta.account.robots).toBe("noindex, follow");
    expect(getPageKey("/accounts/")).toBe("not_found");
  });
  it("serves the host billing portal under its own private page key, not the host landing", () => {
    expect(getPageKey("/host/billing/")).toBe("host_billing");
    expect(getPageKey("/host/billing")).toBe("host_billing");
    expect(getPageKey("/host/")).toBe("host");
    expect(pageMeta.host_billing.robots).toBe("noindex, follow");
  });
  it("leaves credential-bearing transactional paths and canonical profiles untouched", () => {
    for (const pathname of ["/booking/event", "/offer", "/invite/token", "/f/form", "/rsvp/token", "/join/runtime", "/event-update/link", "/demo/invitation", "/rehearse/id", "/organizers/afterfly/", "/events/id", "/claim/real-id"]) {
      expect(retiredMarketingDestination({pathname, search: "?token=private", hash: "#credential"})).toBeNull();
    }
  });
});
