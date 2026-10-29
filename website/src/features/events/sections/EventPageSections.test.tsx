import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {
  bareEventPage,
  eventPageFixtureNow,
  fullEventPage,
  importedEventPage,
} from "../../../stories/fixtures/eventPages";
import {hostListings} from "../../organizers/data";
import {EventDetailPage} from "../EventDetailPage";
import {buildEventPageView, type EventPageData} from "../eventPageModel";
import {EventBookingCard, EventPageHeader, EventPageMain} from "./EventPageSections";

const observeOrganizerPageView = vi.hoisted(() => vi.fn(() => vi.fn()));
const trackOrganizerAnalytics = vi.hoisted(() => vi.fn());
const observeOrganizerProviders = vi.hoisted(() => vi.fn(() => vi.fn()));
const trackOrganizerProviderOutboundClick = vi.hoisted(() => vi.fn());
vi.mock("../../organizers/observeOrganizerProviders", () => ({observeOrganizerProviders, trackOrganizerProviderOutboundClick}));
vi.mock("../../organizers/analytics", () => ({trackOrganizerAnalytics, observeOrganizerPageView}));
vi.mock("../GuestEventEntry", () => ({GuestEventEntry: ({eventId}: {eventId: string}) => <p>{`Guest entry for ${eventId}`}</p>}));
afterEach(() => {cleanup(); vi.clearAllMocks();});
// jsdom runs no container queries, so the sticky aside's probe never measures a phone.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const listing = hostListings[0];
const view = (page: EventPageData, now = eventPageFixtureNow) => buildEventPageView(page, now);

function main(page: EventPageData) {
  return render(<EventPageMain view={view(page)} />);
}

describe("Event page sections", () => {
  it("shows every section of a fully described Catch event", () => {
    main(fullEventPage);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Half-marathon training: 15K");
    expect(screen.getByRole("img", {name: "Photo for Half-marathon training: 15K"})).toBeTruthy();
    for (const name of ["You won’t be standing around.", "The plan for the morning", "Where", "Good to know",
      "27 going · 13 spots left", "Salt Air Run Club", "What people say", "More from Salt Air Run Club"]) {
      expect(screen.getByRole("heading", {name})).toBeTruthy();
    }
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByText("Booked on Catch")).toHaveLength(2);
    expect(screen.getByText("Nov 2026")).toBeTruthy();
    expect(screen.getByText("We've added a 7:00 per km group from this Sunday.", {exact: false})).toBeTruthy();
    expect(screen.getByRole("link", {name: "See their page"}).getAttribute("href")).toBe("/organizers/mumbai/salt-air-run-club/");
    expect(screen.getByRole("link", {name: /Sunset Run & Social/}).getAttribute("href")).toBe("/events/salt-air-sunset-run-social/");
  });

  it("closes every optional section and keeps the page complete without them", () => {
    main(bareEventPage);
    for (const name of ["You won’t be standing around.", "The plan for the morning", "Good to know", "What people say"]) {
      expect(screen.queryByRole("heading", {name})).toBeNull();
    }
    expect(screen.queryByText(/going/)).toBeNull();
    // The poster repeats the page's own words, so only the title heading names the event.
    expect(screen.queryByRole("img", {name: "Photo for Half-marathon training: 15K"})).toBeNull();
    expect(screen.getByRole("img", {name: "Verified organiser"})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Half-marathon training: 15K");
    // The poster and the When fact both carry the date.
    expect(screen.getAllByText("Sun 22 Nov")).toHaveLength(2);
    const maps = screen.getByRole("link", {name: /Open in Google Maps/});
    expect(maps.getAttribute("href")).toBe("https://www.google.com/maps/search/?api=1&query=Bandra+West%2C+Mumbai");
    expect(maps.getAttribute("target")).toBe("_blank");
    expect(maps.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("draws the map only when the page has a static map of the meeting point", () => {
    const {rerender} = render(<EventPageMain view={view(fullEventPage)} />);
    expect(screen.queryByRole("img", {name: "Map of Seaface Steps, Bandra West"})).toBeNull();
    rerender(<EventPageMain mapImageUrl="/maps/seaface.png" view={view(fullEventPage)} />);
    expect(screen.getByRole("img", {name: "Map of Seaface Steps, Bandra West"}).getAttribute("src")).toBe("/maps/seaface.png");
  });

  it("completes an imported event with organiser reviews labelled as such", () => {
    main(importedEventPage);
    expect(screen.getByText("Social run · imported from Luma")).toBeTruthy();
    expect(screen.getByText("The exact meeting point is on the Luma page.")).toBeTruthy();
    expect(screen.getByText("About Salt Air Run Club, from their page")).toBeTruthy();
    expect(screen.getAllByText("Unverified")).toHaveLength(2);
    expect(screen.queryByText(/Booked on Catch/)).toBeNull();
    expect(screen.queryByRole("link", {name: /claim/iu})).toBeNull();
  });

  it("links back to the organiser and shares from the header", () => {
    const onShare = vi.fn();
    render(<EventPageHeader onShare={onShare} view={view(fullEventPage)} />);
    expect(screen.getByRole("link", {name: "Back to Salt Air Run Club"}).getAttribute("href"))
      .toBe("/organizers/mumbai/salt-air-run-club/");
    fireEvent.click(screen.getByRole("button", {name: "Share"}));
    expect(onShare).toHaveBeenCalledOnce();
  });
});

describe("Event booking card", () => {
  const card = (page: EventPageData, now?: number) => {
    const onExternalClick = vi.fn();
    render(<EventBookingCard catchEntry={<p>Guest entry</p>} onExternalClick={onExternalClick} view={view(page, now)} />);
    return onExternalClick;
  };

  it("hands a Catch event to the guest entry", () => {
    card(fullEventPage);
    expect(screen.getByRole("heading", {name: "₹299"})).toBeTruthy();
    expect(screen.getByText("Per person")).toBeTruthy();
    expect(screen.getByText("Sun 22 Nov · 5:45 to 8:30 AM")).toBeTruthy();
    expect(screen.getByText("Guest entry")).toBeTruthy();
  });

  it("keeps the guest entry out of a finished event", () => {
    card(fullEventPage, Date.parse("2026-11-23T00:00:00.000Z"));
    expect(screen.getByText("Booking is closed for this event.")).toBeTruthy();
    expect(screen.queryByText("Guest entry")).toBeNull();
  });

  it("sends an imported event to its source as a booking click", () => {
    const onExternalClick = card(importedEventPage);
    const link = screen.getByRole("link", {name: /Get tickets on Luma/});
    expect(link.getAttribute("href")).toBe("https://lu.ma/salt-air-sunset-run-social");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("Tickets for this event are sold on Luma. You’ll finish booking there.")).toBeTruthy();
    expect(screen.queryByText("Guest entry")).toBeNull();
    fireEvent.click(link);
    expect(onExternalClick).toHaveBeenCalledOnce();
  });
});

describe("EventDetailPage", () => {
  it("observes the organiser's analytics for the event and cleans up", () => {
    const {unmount} = render(<EventDetailPage listing={listing} page={importedEventPage} />);
    expect(observeOrganizerPageView).toHaveBeenCalledWith(listing, "eventView", "event_detail", importedEventPage.eventId);
    expect(observeOrganizerProviders).toHaveBeenCalledWith(listing, importedEventPage.eventId);
    const stopView = observeOrganizerPageView.mock.results[0].value;
    const stopProviders = observeOrganizerProviders.mock.results[0].value;
    unmount();
    expect(stopView).toHaveBeenCalledOnce();
    expect(stopProviders).toHaveBeenCalledOnce();
  });

  it("records the source link as the organiser's booking click", () => {
    render(<EventDetailPage listing={listing} page={importedEventPage} />);
    fireEvent.click(screen.getAllByRole("link", {name: /Get tickets on Luma/})[0]);
    expect(trackOrganizerAnalytics).toHaveBeenCalledWith(listing, "outboundClick", "external_event_booking", importedEventPage.eventId);
    expect(trackOrganizerProviderOutboundClick).toHaveBeenCalledWith(listing.id, importedEventPage.eventId);
  });

  it("puts the guest entry in a Catch event's booking card", () => {
    render(<EventDetailPage listing={listing} page={{...fullEventPage, item: {...fullEventPage.item,
      event: {...fullEventPage.item.event, startTime: "2099-11-22T00:15:00.000Z", endTime: "2099-11-22T03:00:00.000Z"}},
    } as EventPageData} />);
    const booking = screen.getByRole("complementary", {name: "Booking"});
    expect(within(booking).getByText("Guest entry for salt-air-15k-training")).toBeTruthy();
  });

  it("draws the server's map of the meeting point when maps are on", () => {
    const {rerender} = render(<EventDetailPage listing={listing} page={fullEventPage} />);
    expect(screen.queryByRole("img", {name: "Map of Seaface Steps, Bandra West"})).toBeNull();
    rerender(<EventDetailPage listing={listing} mapImageUrl="/maps/events/salt-air-15k-training/map.png?v=abc" page={fullEventPage} />);
    expect(screen.getByRole("img", {name: "Map of Seaface Steps, Bandra West"}).getAttribute("src"))
      .toBe("/maps/events/salt-air-15k-training/map.png?v=abc");
    expect(screen.getByRole("link", {name: /Open in Google Maps/})).toBeTruthy();
  });

  it("copies the link and says so when the browser cannot share", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {configurable: true, value: {writeText}});
    render(<EventDetailPage listing={listing} page={importedEventPage} />);
    fireEvent.click(screen.getByRole("button", {name: "Share"}));
    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/events/salt-air-sunset-run-social/`);
  });
});
