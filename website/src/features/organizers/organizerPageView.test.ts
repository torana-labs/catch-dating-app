import {describe, expect, it} from "vitest";
import {organizerPageCopy as copy} from "../../content/organizerPage";
import {
  claimedOrganizerPage,
  emptyCalendarOrganizerPage,
  generatedOrganizerPage,
  noReviewsOrganizerPage,
  organizerPageReadAt,
} from "../../stories/fixtures/organizerPages";
import type {OrganizerPageRecord} from "./organizerPage";
import {organizerPageKind, organizerPageView} from "./organizerPageView";

const view = (page: OrganizerPageRecord) => organizerPageView(page, organizerPageReadAt);

describe("organizerPageView", () => {
  it("tells a claimed page from one generated from public pages", () => {
    expect(organizerPageKind(claimedOrganizerPage)).toBe("claimed");
    expect(organizerPageKind(generatedOrganizerPage)).toBe("generated");
    expect(organizerPageKind({...generatedOrganizerPage, claim: {...generatedOrganizerPage.claim, state: "claimPending"}})).toBe("generated");
    expect(organizerPageKind({...generatedOrganizerPage, claim: {...generatedOrganizerPage.claim, state: "claimed"}})).toBe("claimed");
  });

  it("heads a claimed page with its verified seal, cover photo and three stats", () => {
    const {header} = view(claimedOrganizerPage);
    expect(header).toMatchObject({verified: true, monogram: "LL", monogramGround: "coral", accent: "coral",
      coverUrl: "/assets/events/social-run-music-hero-960.jpg", meta: "Bandra West, Mumbai"});
    expect(header.tag).toBeUndefined();
    expect(header.stats.map((stat) => [stat.value, stat.label])).toEqual([
      ["2,140", copy.stats.followers(2140)],
      ["4.8", copy.stats.reviews(186)],
      ["12", copy.stats.hosted(12)],
    ]);
  });

  it("heads a generated page with its tag, where it came from and who is waiting", () => {
    const {header} = view(generatedOrganizerPage);
    expect(header).toMatchObject({verified: false, tag: "Built from public pages · not claimed yet", monogramGround: "white",
      coverUrl: null, meta: "Colaba, Mumbai · summarised from Luma and Instagram"});
    // No verified review yet, so the average covers the unverified ones the policy line labels.
    expect(header.stats.map((stat) => [stat.value, stat.label])).toEqual([["38", copy.stats.waiting], ["4.5", copy.stats.reviews(2)]]);
  });

  it("counts down to the next event and describes it wherever it is sold", () => {
    const next = view(claimedOrganizerPage).nextUp!;
    expect([next.label, next.title, next.when, next.meta, next.nextAction, next.sourceLabel, next.href]).toEqual([
      copy.nextUp(copy.countdown(2)), "Sunday Social Run", "Sun 1 Nov, 6:30 AM · Lantern Lane jetty",
      "Free · 31 spots left", copy.book, copy.onCatch, "/events/lantern-sun-1/",
    ]);
    expect(view(generatedOrganizerPage).nextUp).toMatchObject({
      sourceLabel: "Luma", meta: "Free · Register on Luma", nextAction: "Get tickets", href: "https://luma.com/lantern-harbour-sun-1",
    });
    expect(view(emptyCalendarOrganizerPage).nextUp).toBeNull();
  });

  it("lists Catch and Luma events in one calendar with booking state and source", () => {
    const rows = view(claimedOrganizerPage).events.rows;
    expect(rows.map((row) => [row.date.weekday, row.date.day, row.date.month, row.title])).toEqual([
      ["Sun", "1", "Nov", "Sunday Social Run"],
      ["Wed", "4", "Nov", "Wednesday Tempo 6K"],
      ["Sat", "14", "Nov", "Lantern Night: Sunset Edition"],
      ["Sun", "22", "Nov", "Half-marathon training: 15K"],
      ["Sun", "29", "Nov", "Sunday Social Run"],
    ]);
    expect(rows.map((row) => [row.sourceLabel, row.price, row.note, row.action, row.ground])).toEqual([
      ["On Catch", "Free", "31 spots left", "Book", "coral"],
      ["On Catch", "Free", "18 spots left", "Book", "paper"],
      ["Luma", "₹799", "Tickets on Luma", "Tickets", "indigo"],
      ["On Catch", "₹299", "18 spots left", "Book", "paper"],
      ["On Catch", "Free", "", "Details", "paper"],
    ]);
    expect(rows[0].detail).toBe("6:30 AM · Lantern Lane jetty, Bandra West");
    expect(view(claimedOrganizerPage).events.note).toBe("From Catch and Luma, in one list");
    expect(view(generatedOrganizerPage).events.rows.every((row) => row.ground === "paper")).toBe(true);
  });

  it("shows owner links pinned first and drops one past its date", () => {
    const links = view(claimedOrganizerPage).links;
    expect(links.map((link) => [link.title, link.pinned, link.icon])).toEqual([
      ["Lantern Night · Sat 14 Nov", true, "event"],
      ["Join the WhatsApp community", false, "chat"],
      ["Strava club", false, "route"],
      ["Club tees and caps", false, "link"],
    ]);
    expect(links[0].subtitle).toBe("Pinned until 14 Nov");
    const expired = organizerPageView(claimedOrganizerPage, Date.parse("2026-11-20T00:00:00Z")).links;
    expect(expired.map((link) => link.title)).not.toContain("Lantern Night · Sat 14 Nov");
  });

  it("falls back to the public pages a listing came from, never its seeding notes", () => {
    const links = view(generatedOrganizerPage).links;
    expect(links.map((link) => [link.title, link.subtitle, link.icon, link.analytics])).toEqual([
      ["Luma calendar", "luma.com/harbour-line", "event", {eventName: "outboundClick", source: "source_eventPlatform"}],
      ["Instagram", "instagram.com/harbourlineruns", "photo", {eventName: "contactClick", source: "source_socialProfile"}],
    ]);
  });

  it("alternates past photos with figures on a claimed page", () => {
    const {moments} = view(claimedOrganizerPage);
    expect(moments.title).toBe(copy.momentsTitle.claimed);
    expect(moments.tiles.map((tile) => [tile.figure ?? null, tile.title, tile.caption, tile.ground, Boolean(tile.imageUrl)])).toEqual([
      [null, copy.moments.photoTitle("Lantern Night", "October"), copy.moments.went(212), "ink", true],
      ["12", copy.moments.events, copy.moments.since("January 2024"), "yellow", false],
      [null, copy.moments.photoTitle("Night 5K", "September"), copy.moments.went(64), "ink", true],
      ["59", copy.moments.average, copy.moments.averageNote, "mint", false],
    ]);
  });

  it("summarises what a generated page found and leaves a slot for photos", () => {
    const {moments} = view(generatedOrganizerPage);
    expect(moments.title).toBe(copy.momentsTitle.generated);
    expect(moments.tiles.map((tile) => [tile.figure ?? null, tile.title, tile.caption, tile.placeholder ?? false])).toEqual([
      ["6", copy.moments.eventsOn("Luma"), copy.moments.since("March 2025"), false],
      ["Sun", copy.moments.usualDay, copy.moments.starts("6:30 AM"), false],
      ["₹0–799", copy.moments.usualPrice, copy.moments.mostlyFree, false],
      [null, copy.moments.photosTitle, copy.moments.photosCaption, true],
    ]);
  });

  it("marks reviews verified or unverified, with replies or a note that an unclaimed page cannot reply", () => {
    const claimed = view(claimedOrganizerPage).reviews;
    expect(claimed.items.map((item) => [item.name, item.verified, item.meta, item.reply?.author ?? null])).toEqual([
      ["Riya S.", true, "Sunday Social Run · 2 weeks ago", "Kabir"],
      ["Arjun M.", false, "Lantern Night · 1 month ago", null],
      ["Neha K.", true, "Sunday Social Run · 1 month ago", "Meera"],
    ]);
    expect(claimed.distribution[0]).toEqual({stars: 5, count: 142, label: copy.starsRow(5, 142)});
    const generated = view(generatedOrganizerPage).reviews;
    expect(generated.items.every((item) => item.note === "Harbour Line Run Club hasn’t claimed this page, so they can’t reply yet.")).toBe(true);
    expect(generated.policy).toBe("Anyone can review this page. Reviews stay unverified until guests book through Catch.");
    expect(view(noReviewsOrganizerPage).reviews).toMatchObject({readable: true, items: [], average: "–"});
  });

  it("keeps intake review notes out of the about facts", () => {
    expect(view(generatedOrganizerPage).about.facts.map((fact) => fact.label)).toEqual(["Location", "Usual meeting point", "Instagram"]);
    expect(view(claimedOrganizerPage).about).toMatchObject({formats: "Social runs · Tempo runs · Lantern Night · Half-marathon training",
      host: {name: "Kabir Rao", role: "Founder · pace lead", initials: "KR"}});
  });

  it("pitches the claim on a generated page only, with the people already waiting", () => {
    expect(view(claimedOrganizerPage).claim).toBeNull();
    expect(view(generatedOrganizerPage).claim).toEqual({
      href: "/claim/harbour-line-run-club/", pending: false, followers: "38 people", reviewers: "2 people", reviewVerb: "left reviews",
      built: "We built this page from your public Luma and Instagram pages. Claim it free and make it yours.",
    });
    const anchored = view({...generatedOrganizerPage, claim: {...generatedOrganizerPage.claim, href: "/organizers/harbour-line-run-club/#claim"}});
    expect(anchored.claim?.href).toBe("/claim/?listing=harbour-line-run-club");
    const pending = view({...generatedOrganizerPage, claim: {...generatedOrganizerPage.claim, state: "claimPending"}}).claim;
    expect(pending).toMatchObject({href: null, pending: true});
  });

  it("signs a claimed page off as made with Catch and a generated one with where it came from", () => {
    expect(view(claimedOrganizerPage).footer).toEqual({line: "Made with Catch", link: "Make a page like this", href: "/host/"});
    expect(view(generatedOrganizerPage).footer).toEqual({line: "Built by Catch from public Luma and Instagram pages.",
      link: "Something wrong? Tell us", href: "/help/"});
  });
});
