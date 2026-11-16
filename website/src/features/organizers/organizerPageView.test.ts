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

  it("heads a claimed page with its verified seal, cover photo and three stats, the rating paired with its verified count", () => {
    const {header} = view(claimedOrganizerPage);
    expect(header).toMatchObject({verified: true, monogram: "LL", monogramGround: "coral", accent: "coral",
      coverUrl: "/assets/events/social-run-music-hero-960.jpg", meta: "Bandra West, Mumbai"});
    expect(header.tag).toBeUndefined();
    expect(header.labels).toEqual([]);
    expect(copy.stats.reviews(120)).toBe("★ · 120 verified reviews");
    expect(copy.stats.hosted(12)).toBe("nights hosted");
    expect(header.stats.map((stat) => [stat.value, stat.label])).toEqual([
      ["2,140", copy.stats.followers(2140)],
      ["4.8", copy.stats.reviews(120)],
      ["12", copy.stats.hosted(12)],
    ]);
  });

  it("heads a generated page with its tag, where it came from and who is waiting", () => {
    const {header} = view(generatedOrganizerPage);
    expect(header).toMatchObject({verified: false, tag: "Built from public pages · not claimed yet", monogramGround: "white",
      coverUrl: null, meta: "Colaba, Mumbai · summarised from Luma and Instagram"});
    // No verified review yet, so there is no rating: unverified reviews never make an average.
    expect(header.stats.map((stat) => [stat.value, stat.label])).toEqual([["38", copy.stats.waiting]]);
  });

  it("shows the women-led label only when the page is told it, until the read model carries the field", () => {
    expect(organizerPageView(claimedOrganizerPage, organizerPageReadAt, {womenLed: true}).header.labels).toEqual(["Women-led"]);
    expect(organizerPageView(claimedOrganizerPage, organizerPageReadAt, {womenLed: false}).header.labels).toEqual([]);
  });

  it("hides proof lines that have no data behind them", () => {
    const quiet = view({...claimedOrganizerPage, followerCount: 0, pastMoments: [],
      reviewSummary: {...claimedOrganizerPage.reviewSummary, rating: null, verifiedCount: 0}});
    expect(quiet.header.stats).toEqual([]);
    expect(quiet.moments.tiles.map((tile) => tile.key)).not.toContain("turnout");
  });

  it("counts down to the next event and describes it wherever it is sold", () => {
    const next = view(claimedOrganizerPage).nextUp!;
    expect([next.label, next.title, next.when, next.meta, next.nextAction, next.sourceLabel, next.href]).toEqual([
      copy.nextUp(copy.countdown(2)), "Sunday Social Run", "Sun 1 Nov, 6:30 AM · Lantern Lane jetty",
      "Free · 31 places left", copy.book, copy.onCatch, "/events/lantern-sun-1/",
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
      ["On Catch", "Free", "31 left", "Book", "coral"],
      ["On Catch", "Free", "18 left", "Book", "paper"],
      ["Luma", "₹799", "Tickets on Luma", "Tickets", "indigo"],
      ["On Catch", "₹299", "18 left", "Book", "paper"],
      ["On Catch", "Free", "", "Details", "paper"],
    ]);
    expect(rows[0].detail).toBe("6:30 AM · Lantern Lane jetty, Bandra West");
    expect(view(claimedOrganizerPage).events.note).toBe("From Catch and Luma, in one list");
    expect(rows.map((row) => [row.cardLabel, row.posterLabel, row.place, row.availability])).toEqual([
      ["Sun 1 Nov · 6:30 AM", "Sun 1 Nov", "Lantern Lane jetty, Bandra West", "31 left · On Catch"],
      ["Wed 4 Nov · 7:00 PM", "Wed 4 Nov", "Lantern Lane promenade", "18 left · On Catch"],
      ["Sat 14 Nov · 5:30 PM", "Sat 14 Nov", "Worli Sea Face, then a rooftop", "Tickets on Luma"],
      ["Sun 22 Nov · 6:00 AM", "Sun 22 Nov", "Bandstand to Worli and back", "18 left · On Catch"],
      ["Sun 29 Nov · 6:30 AM", "Sun 29 Nov", "Lantern Lane jetty", "On Catch"],
    ]);
    const catchOnly = view({...claimedOrganizerPage, upcomingEvents: claimedOrganizerPage.upcomingEvents.filter((item) => item.source === "catch")});
    expect(catchOnly.events.note).toBe("On Catch");
    expect(rows.map((row) => row.format)).toEqual(["run", "run", "run", "run", "run"]);
    expect(view(generatedOrganizerPage).events.rows.every((row) => row.ground === "paper")).toBe(true);
  });

  it("shows owner links pinned first and drops one past its date", () => {
    const links = view(claimedOrganizerPage).links;
    expect(links.map((link) => [link.title, link.pinned, link.icon, link.subtitle])).toEqual([
      ["Lantern Night · Sat 14 Nov", true, "event", "Pinned until 14 Nov"],
      ["Join the WhatsApp community", false, "chat", "chat.whatsapp.com/lantern-lane"],
      ["Strava club", false, "route", "Every run, logged"],
      ["Club tees and caps", false, "pricing", "Ships across India"],
    ]);
    expect(links[1].analytics).toEqual({eventName: "linkClick", source: "organizer_page", linkId: "whatsapp"});
    const expired = organizerPageView(claimedOrganizerPage, Date.parse("2026-11-20T00:00:00Z")).links;
    expect(expired.map((link) => link.title)).not.toContain("Lantern Night · Sat 14 Nov");
  });

  it("draws each owner link role with its icon", () => {
    const roles = ["community", "social", "tickets", "calendar", "shop", "partner", "video", "route", "website", "link"] as const;
    const page = {...claimedOrganizerPage, links: roles.map((icon) =>
      ({...claimedOrganizerPage.links[3], id: icon, url: `https://example.org/${icon}`, icon}))};
    expect(view(page).links.map((link) => link.icon)).toEqual(
      ["chat", "photo", "ticket", "event", "pricing", "partner", "play", "route", "web", "link"]);
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
    expect(view(noReviewsOrganizerPage).reviews).toMatchObject({readable: true, items: [], average: null, unrated: null});
  });

  it("averages verified reviews only, paired with their count, and gives no rating before one is verified", () => {
    expect(view(claimedOrganizerPage).reviews).toMatchObject({average: "4.8", countLabel: "from 120 verified reviews", unrated: null,
      policy: "Booked on Catch means the reviewer booked through Catch. Unverified reviews are shown, and labelled."});
    expect(view(generatedOrganizerPage).reviews).toMatchObject({average: null,
      unrated: "2 reviews, none from a Catch booking yet, so no rating."});
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
