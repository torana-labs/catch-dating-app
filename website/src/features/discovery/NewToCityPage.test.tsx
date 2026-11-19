import {cleanup, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {mumbaiDiscoveryCatalog} from "./discoveryCatalogFixtures";
import {NewToCityPage} from "./NewToCityPage";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));
afterEach(cleanup);

const captures: CaptureSlots = Object.fromEntries(["guest-explore", "guest-checked-in"].map((id) => [id, {
  id, device: "generic-phone", webPath: `/captures/${id}.png`, width: 804, height: 1748, alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Find a plan", pages: [],
}]));

describe("New to the city page", {timeout: 20_000}, () => {
  it("leads with the board's hero, then this week's plans for newcomers and the capture", () => {
    render(<MemoryRouter initialEntries={["/new-to-mumbai/"]}><NewToCityPage catalog={mumbaiDiscoveryCatalog} /></MemoryRouter>);
    expect(screen.getByRole("heading", {level: 1, name: "Just moved? Your first friends here are at a table this week."})).toBeTruthy();
    expect(screen.getByRole("link", {name: "See this week’s plans"}).getAttribute("href")).toBe("#solo");
    expect(screen.getByRole("link", {name: "Get new plans on WhatsApp"}).getAttribute("href")).toBe("#notify");
    const plans = screen.getByRole("region", {name: "This week, for newcomers"});
    expect(within(plans).getByRole("link", {name: /Strangers’ Supper/u}).getAttribute("href")).toBe("/events/strangers-supper/");
    expect(within(plans).queryByRole("link", {name: /Pickleball Social/u})).toBeNull();
    expect(screen.getByRole("heading", {name: "Four plans, then you’re a regular."})).toBeTruthy();
    expect(screen.getByRole("heading", {name: "Get newcomer-friendly plans on WhatsApp."})).toBeTruthy();
    expect(screen.queryByText(/came alone/iu)).toBeNull();
  });

  it("shows a guest's phone after checking in beside the WhatsApp form, as the board does", () => {
    render(<MemoryRouter initialEntries={["/new-to-mumbai/"]}><NewToCityPage captures={captures} catalog={mumbaiDiscoveryCatalog} /></MemoryRouter>);
    const notify = screen.getByRole("region", {name: "Get newcomer-friendly plans on WhatsApp."});
    expect(within(notify).getByRole("img", {name: "Screen guest-checked-in"})).toBeTruthy();
  });
});
