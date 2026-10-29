import {describe, expect, it} from "vitest";
import {
  bareEventPage,
  eventPageFixtureNow,
  eventPageWithout,
  fullEventPage,
  importedEventPage,
  optionalEventFields,
} from "../../stories/fixtures/eventPages";
import {buildEventPageView, type EventPageData} from "./eventPageModel";

const view = (page: EventPageData) => buildEventPageView(page, eventPageFixtureNow);

describe("buildEventPageView", () => {
  it("shows every section for a Catch event with all ten optional fields", () => {
    const full = view(fullEventPage);
    expect(full.media).toEqual({kind: "photo", url: "/assets/events/social-run-music-hero-960.jpg", alt: "Photo for Half-marathon training: 15K"});
    expect(full.accent).toBe("coral");
    expect(full.kindLabel).toBe("Running");
    expect(full.host).toEqual({name: "Salt Air Run Club", path: "/organizers/mumbai/salt-air-run-club/", verified: true,
      rating: "4.8 ★ from 186 reviews"});
    expect(full.facts).toEqual({
      when: {label: "When", value: "Sun 22 Nov", note: "5:45 to 8:30 AM"},
      where: {label: "Where", value: "Seaface Steps", note: "Bandra West, Mumbai"},
      price: {label: "Price", value: "₹299", note: "Per person"},
    });
    expect(full.moments?.map((moment) => moment.title)).toEqual(["A first hello", "Something to do together"]);
    expect(full.plan).toEqual({title: "The plan for the morning", steps: [
      {title: "Meet at the steps", body: "Bag drop opens. Find your pace group’s flag.", marker: "5:45"},
      {title: "Warm-up", body: "Ten minutes, led by Pooja.", marker: "6:00"},
      {title: "15K in three pace groups", body: "6:00, 6:45 and 7:30 per km, along the promenade and back twice.", marker: "6:10", tag: "15 km"},
      {title: "Stretch and breakfast", body: "Poha and coffee by the steps, included.", marker: "7:50"},
    ]});
    expect(full.where).toEqual({
      place: "Seaface Steps, Bandra West",
      note: "Meet by the orange club flag at the north end of the promenade. Bag drop opens at 5:45.",
      mapsHref: "https://www.google.com/maps/search/?api=1&query=19.0668%2C72.8231",
      map: {latitude: 19.0668, longitude: 72.8231, alt: "Map of Seaface Steps, Bandra West"},
    });
    expect(full.goodToKnow.map((item) => [item.key, item.accent])).toEqual([
      ["included", "coral"], ["bring", undefined], ["accessibility", "mint"], ["cancellation", "indigo"],
    ]);
    expect(full.goodToKnow[3].body).toBe("Full refund if you cancel at least 24 hours before the start.");
    expect(full.going).toEqual({title: "27 going · 13 spots left", note: "Guest names stay private.", going: 27});
    expect(full.organizer).toEqual({name: "Salt Air Run Club", path: "/organizers/mumbai/salt-air-run-club/", initials: "SA",
      summary: "Run club in Mumbai · 2,140 followers · 4 upcoming events"});
    expect(full.reviews?.items.map((review) => [review.name, review.meta, review.verified])).toEqual([
      ["Ananya K.", "Nov 2026", true], ["Nikhil J.", "Oct 2026", true],
    ]);
    expect(full.more?.cards.map((card) => [card.label, card.meta, card.ground])).toEqual([
      ["Sun 29 Nov · 6:30 AM", "Free · On Catch", "paper"],
      ["Sat 5 Dec · 5:30 PM", "₹799 · Luma", "indigo"],
      ["Wed 9 Dec · 7:00 PM", "Free · On Catch", "mint"],
    ]);
    expect(full.booking).toEqual({kind: "catch", eventId: "salt-air-15k-training", open: true});
  });

  it("closes every optional section when each field is absent", () => {
    const bare = view(bareEventPage);
    expect(bare.media).toEqual({kind: "poster", kicker: "Salt Air Run Club", date: "Sun 22 Nov",
      title: "Half-marathon training: 15K", place: "Bandra West, Mumbai"});
    expect(bare.moments).toBeNull();
    expect(bare.plan).toBeNull();
    expect(bare.where).toEqual({place: "Bandra West, Mumbai", note: null,
      mapsHref: "https://www.google.com/maps/search/?api=1&query=Bandra+West%2C+Mumbai", map: null});
    expect(bare.facts.where).toEqual({label: "Where", value: "Bandra West", note: "Mumbai"});
    expect(bare.goodToKnow).toEqual([]);
    expect(bare.going).toBeNull();
    expect(bare.reviews).toBeNull();
    // Title, time, place, price, description, the organiser and more events always stay.
    expect(bare.title).toBe("Half-marathon training: 15K");
    expect(bare.description).not.toBeNull();
    expect(bare.more?.cards).toHaveLength(3);
  });

  it.each(optionalEventFields)("drops only its own section when %s is absent", (field) => {
    const full = view(fullEventPage);
    const without = view(eventPageWithout([field]));
    const changed = (Object.keys(full) as (keyof typeof full)[])
      .filter((key) => JSON.stringify(full[key]) !== JSON.stringify(without[key]));
    const expected: Record<typeof field, string[]> = {
      photo: ["media"], moments: ["moments"], itinerary: ["plan"], map: ["facts", "where"], included: ["goodToKnow"],
      bring: ["goodToKnow"], accessibility: ["goodToKnow"], cancellation: ["goodToKnow"], capacity: ["going"],
      reviews: ["reviews"],
    };
    expect(changed).toEqual(expected[field]);
  });

  it("completes an imported event from its five fields", () => {
    const imported = view(importedEventPage);
    expect(imported.kindLabel).toBe("Social run · imported from Luma");
    expect(imported.media).toMatchObject({kind: "poster", date: "Sat 5 Dec", place: "Worli Sea Face, Mumbai"});
    expect(imported.facts).toEqual({
      when: {label: "When", value: "Sat 5 Dec", note: "5:30 PM"},
      where: {label: "Where", value: "Worli Sea Face", note: "Mumbai"},
      price: {label: "Price", value: "₹799", note: "Tickets on Luma"},
    });
    expect(imported.where.note).toBe("The exact meeting point is on the Luma page.");
    expect([imported.moments, imported.plan, imported.going]).toEqual([null, null, null]);
    expect(imported.goodToKnow).toEqual([]);
    expect(imported.reviews?.items.every((review) => !review.verified)).toBe(true);
    expect(imported.booking).toEqual({kind: "external", url: "https://lu.ma/salt-air-sunset-run-social", label: "Luma", open: true});
  });

  it("falls back to the published date when the event has no usable time zone", () => {
    const page = eventPageWithout(["photo"]);
    const event = {...page.item.event, timezone: "Not/AZone"};
    const unzoned = view({...page, item: {...page.item, event} as EventPageData["item"]});
    expect(unzoned.facts.when).toEqual({label: "When", value: "Sun, 22 Nov 2026, 5:45 AM-8:30 AM"});
    expect(unzoned.plan?.title).toBe("The plan");
    expect(unzoned.plan?.steps.map((step) => step.marker)).toEqual(["Start", "+15 min", "+25 min", "+125 min"]);
    expect(unzoned.media).toMatchObject({kind: "poster", date: "Sun, 22 Nov 2026, 5:45 AM-8:30 AM"});
  });

  it("states a full event, its waitlist, an overnight end and a closed booking", () => {
    const event = {...fullEventPage.item.event, endTime: "2026-11-22T19:30:00.000Z"};
    const full = view({...fullEventPage, item: {...fullEventPage.item, event} as EventPageData["item"],
      capacity: {...fullEventPage.capacity, state: "full", spotsLeft: 0, bookedCount: 40, waitlistAvailable: true}});
    expect(full.going).toEqual({title: "40 going · full",
      note: "Guest names stay private. You can join the waitlist when you book.", going: 40});
    expect(full.facts.when.note).toBe("5:45 AM to Mon 23 Nov, 1:00 AM");
    expect(buildEventPageView(fullEventPage, Date.parse("2026-11-23T00:00:00.000Z")).booking.open).toBe(false);
  });

  it("says how to join an event with admission requirements", () => {
    const event = {...fullEventPage.item.event, admissionLabels: ["approval", "membership"]} as const;
    const page = view({...fullEventPage, item: {...fullEventPage.item, event} as EventPageData["item"]});
    expect(page.goodToKnow.at(-1)).toEqual({key: "joining", label: "How to join", accent: "magenta",
      body: "The organiser reviews requests before confirming places. This event is for the organiser’s members."});
  });

  it("shows no moments without a participation declaration, and no free event's cancellation terms", () => {
    const event = {...fullEventPage.item.event, cancellationPolicy: "notApplicable",
      catchExperienceActivities: undefined} as const;
    const page = view({...fullEventPage, item: {...fullEventPage.item, event} as EventPageData["item"]});
    expect(page.moments).toBeNull();
    expect(page.goodToKnow.map((item) => item.key)).not.toContain("cancellation");
  });
});
