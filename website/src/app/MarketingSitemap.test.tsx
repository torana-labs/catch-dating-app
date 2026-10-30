import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {HostPage} from "../features/host/HostPage";
import {HostApplicationPage} from "../features/host/HostApplicationPage";
import {hostProductCopy} from "@content/hostProduct";
import {retiredMarketingDestination} from "./retiredMarketingRoutes";
import {getPageKey, pageMetaForHostPath} from "./pageMeta";
import {brand} from "@catch/brand";

const redirects = [
  ["overview", "/"], ["platform", "/host/#features"], ["workflows", "/host/#how-it-works"],
  ["planners", "/host/#use-cases"], ["mixers", "/host/#use-cases"], ["clubs", "/host/#use-cases"],
  ["stack", "/host/#existing-tools"], ["directory", "/organizers/"], ["claim", "/claim/"], ["preview", "/host/"],
];

afterEach(cleanup);
const renderPage = (page: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);

describe("consolidated public sitemap", () => {
  it("provides every replacement section and sends application CTAs to the single form", () => {
    const {container} = renderPage(<HostPage captures={{}} />);
    for (const id of ["features", "how-it-works", "use-cases", "existing-tools", "pricing"]) expect(container.querySelector(`#${id}`)).toBeTruthy();
    expect(container.querySelector("form")).toBeNull();
    const actions = screen.getAllByRole("link").filter((link) => /apply/i.test(link.textContent ?? ""));
    expect(actions.length).toBeGreaterThan(0);
    for (const link of actions) expect(link.getAttribute("href")).toBe("/host/apply/");
  });
  it("retains detailed persona and tool handoffs behind progressive disclosure", () => {
    const {container} = renderPage(<HostPage captures={{}} />);
    for (const item of [...hostProductCopy.useCases.items, ...hostProductCopy.tools.items]) {
      expect(screen.getByText(item.question)).toBeTruthy();
      const answer = screen.getByText(item.answer);
      expect(answer.closest("details")?.open).toBe(false);
    }
    expect(container.textContent).toContain("Application approval, membership, payment, and event admission are separate decisions.");
  });
  it("mounts the existing application at the canonical apply page", () => {
    const {container} = renderPage(<HostApplicationPage />);
    expect(screen.getByRole("heading", {level: 1, name: "Apply for a Catch Host pilot"})).toBeTruthy();
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(screen.getByText(/submission does not book a call or grant access/)).toBeTruthy();
    expect(pageMetaForHostPath("/host/apply/")?.canonicalPath).toBe("/host/apply/");
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
  it("leaves credential-bearing transactional paths and canonical profiles untouched", () => {
    for (const pathname of ["/booking/event", "/offer", "/invite/token", "/f/form", "/rsvp/token", "/join/runtime", "/event-update/link", "/demo/invitation", "/rehearse/id", "/organizers/afterfly/", "/events/id", "/claim/real-id"]) {
      expect(retiredMarketingDestination({pathname, search: "?token=private", hash: "#credential"})).toBeNull();
    }
  });
});
