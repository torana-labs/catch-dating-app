import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {HomePage} from "./HomePage";
import {publicEventListingsContext} from "../organizers/usePublicEventListingsController";
import {hostListings} from "../organizers/data";
import type {HostListing} from "../organizers/types";
const now = Date.parse("2030-01-01");
const listing: HostListing = {...hostListings[0], id: "home-club", name: "Preview Club", city: "Mumbai", citySlug: "mumbai", path: "/organizers/preview-club/", authority: {...hostListings[0].authority, publishStatus: "published", claimState: "claimed"}, catchEvents: [
  {id: "run", role: "Hosted event", title: "Preview social run", summary: "", activityKind: "socialRun", timeline: "upcoming", startTime: "2030-01-02", endTime: "2030-01-03", date: "Tomorrow", location: "Park", capacityLimit: 20, bookedCount: 1, checkedInCount: 0, waitlistedCount: 0, priceLabel: "Free", publicRegistrationEnabled: true},
]};
function show(phase: "ready" | "loading" | "unavailable" = "ready") {
 return render(<publicEventListingsContext.Provider value={{listings: [listing], phase, readAt: now}}><HomePage captures={{}} /></publicEventListingsContext.Provider>);
}
afterEach(cleanup);
describe("consumer homepage", () => {
 it("previews eligible events, canonical destinations and the inclusive Host handoff", () => {
  show();
  const main = within(screen.getByRole("main"));
  expect(main.getByRole("heading", {level: 1}).textContent).toBe("Find something worth showing up for.");
  expect(main.getByRole("link", {name: /Preview social run/}).getAttribute("href")).toBe("/events/run/");
  expect(main.getByRole("link", {name: "Explore Catch Host"}).getAttribute("href")).toBe("/host/");
  expect(main.getByText(/independent hosts, growing clubs, community organisers/i)).toBeTruthy();
  // Without photos the event and organiser cards draw the activity covers, never a stand-in photo.
  expect(main.queryByText("Illustrative image")).toBeNull();
  expect(main.getByRole("link", {name: /Preview social run/}).querySelector("img")).toBeNull();
  expect(main.getByRole("link", {name: /Preview social run/}).querySelector("[data-activity-kind=socialRun]")).not.toBeNull();
  const organiser = main.getAllByRole("link").find(link => link.getAttribute("href") === "/organizers/preview-club/" && link.querySelector("h3"));
  expect(organiser?.querySelector("img")).toBeNull();
  expect(organiser?.querySelector("[data-activity-kind=socialRun]")).not.toBeNull();
 });
 it("distinguishes a format with no matches from a city with no events", () => {
  show();
  fireEvent.click(screen.getByRole("button", {name: "Sport"}));
  expect(screen.getByText("No events match this format in Mumbai.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Clear filters"}));
  expect(screen.getByRole("link", {name: /Preview social run/})).toBeTruthy();
  fireEvent.change(screen.getAllByRole("combobox", {name: "Choose your city"})[0], {target: {value: "indore"}});
  expect(screen.getByText("We don’t have upcoming events listed in Indore yet.")).toBeTruthy();
  expect(screen.getByRole("heading", {name: "Discover organisers across Catch."})).toBeTruthy();
  expect(screen.queryByRole("link", {name: /Preview social run/})).toBeNull();
  expect(screen.getAllByRole("link", {name: "Find events"}).some(link => link.getAttribute("href") === "/explore/?city=indore#events")).toBe(true);
 });
 it.each(["loading", "unavailable"] as const)("withholds stale cards when %s without claiming an empty city", phase => {
  show(phase);
  expect(screen.queryByRole("link", {name: /Preview social run/})).toBeNull();
  expect(screen.queryByText(/We don’t have upcoming events/)).toBeNull();
  expect(screen.getByRole("heading", {name: phase === "loading" ? "Finding upcoming events…" : "We couldn’t load events right now."})).toBeTruthy();
 });
 it("opens participation guidance, FAQ answers and the mobile navigation", () => {
  show();
  const explanation = screen.getByRole("button", {name: "How it works"});
  fireEvent.click(explanation); expect(explanation.getAttribute("aria-expanded")).toBe("true");
  const question = screen.getByRole("button", {name: "Is Catch only for dating?"});
  fireEvent.click(question); expect(question.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText(/No. Catch is for discovering events/)).toBeTruthy();
  const menu = screen.getByRole("button", {name: /menu/i});
  fireEvent.click(menu); expect(menu.getAttribute("aria-expanded")).toBe("true");
 });
});
