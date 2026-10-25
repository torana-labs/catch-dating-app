import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {validateEventPublicPageDocument} from
  "../shared/generated/validators/eventPublicPageDocument";
import {validateOrganizerPublicPageDocument} from
  "../shared/generated/validators/organizerPublicPageDocument";
import {
  buildOrganizerScope,
  contentHash,
  recommendationCard,
  type EventPage,
  type OrganizerPage,
  type OrganizerScopeSources,
} from "./pageModel";
import {contractValidPages} from "./rebuild";
import {
  FixtureTimestamp,
  parityCase,
  parityInputs,
  type ParityCase,
} from "./publicPageTestFixtures";

const inputs = parityInputs();
const everyVariant = "unclaimed organizer with every event and review variant";

function newestFirst(parity: ParityCase) {
  const millis = (doc: {data: Record<string, unknown>}) =>
    (doc.data.createdAt as FixtureTimestamp | undefined)?.toMillis() ?? 0;
  return [...parity.reviews].sort((a, b) => millis(b) - millis(a));
}

function sources(
  parity: ParityCase, overrides: Partial<OrganizerScopeSources> = {}
): OrganizerScopeSources {
  return {
    organizerId: parity.organizer.id,
    organizer: parity.organizer,
    pathConflict: false,
    catchEvents: parity.catchEvents,
    externalEvents: parity.externalEvents,
    ambiguousEventIds: new Set(),
    reviews: newestFirst(parity),
    reviewCounts: {count: 4, verifiedCount: 2, verifiedAverage: 4.5,
      distribution: {"1": 0, "2": 0, "3": 1, "4": 1, "5": 2}},
    recommendationCandidates: [],
    liveMarkets: new Set(inputs.liveMarkets),
    now: inputs.now,
    ...overrides,
  };
}

const stored = (page: OrganizerPage | EventPage) => ({...page,
  builtAt: {_seconds: Math.floor(inputs.now / 1000), _nanoseconds: 0},
  contentHash: contentHash(page)});

function built(overrides: Partial<OrganizerScopeSources> = {}) {
  const pages = buildOrganizerScope(sources(parityCase(everyVariant),
    overrides));
  assert(pages.organizerPage);
  return {organizerPage: pages.organizerPage, eventPages: pages.eventPages};
}

test("published pages validate and carry no private or dating fields",
  () => {
    const {organizerPage, eventPages} = built();
    assert.equal(validateOrganizerPublicPageDocument(stored(organizerPage)),
      true, JSON.stringify(validateOrganizerPublicPageDocument.errors));
    assert(eventPages.length > 0);
    for (const page of eventPages) {
      assert.equal(validateEventPublicPageDocument(stored(page)), true,
        `${page.eventId} ${
          JSON.stringify(validateEventPublicPageDocument.errors)}`);
    }
    const serialized = JSON.stringify([organizerPage, eventPages]);
    for (const secret of ["race.course@example.test", "+918800000001",
      "ownerUserId", "hostUserId", "reviewerUserId", "genderCounts",
      "cohortCounts", "balanced", "rotations", "singlesMixer",
      "Singles mixer", "mutualMatchCount", "scorecard"]) {
      assert(!serialized.includes(secret), secret);
    }
    const mixer = organizerPage.upcomingEvents
      .find((item) => item.eventId === "mixer-restricted");
    assert.equal(mixer?.event.activityKind, "openActivity");
    assert.equal(mixer?.event.title, "Hosted event");
    const open = organizerPage.upcomingEvents
      .find((item) => item.eventId === "open-upcoming");
    assert(open?.source === "catch");
    assert.deepEqual(open.event.catchExperienceActivities, ["introductions"]);
  });

test("organizer pages list every source in time order with booking targets",
  () => {
    const {organizerPage} = built();
    assert.deepEqual(organizerPage.upcomingEvents.map((item) => item.eventId),
      ["legacy-club-only", "open-upcoming", "mixer-restricted"]);
    assert.deepEqual(organizerPage.pastMoments.map((item) => item.eventId),
      ["paid-past", "ext-public"]);
    const open = organizerPage.upcomingEvents[1];
    assert.deepEqual(open.booking, {kind: "catch",
      path: "/events/open-upcoming/", registrationAccess: "open",
      spotsLeft: 8});
    const external = organizerPage.pastMoments[1];
    assert.equal(external.source, "external");
    assert.equal(external.booking.kind, "external");
    assert.match(String(
      (external.booking as {url: string}).url), /^https:\/\//u);
    assert.deepEqual(organizerPage.links, []);
    assert.equal(organizerPage.followerCount, 7);
    assert.deepEqual(organizerPage.claim, {state: "unclaimed",
      claimable: true, href: "/organizers/next-proof/#claim",
      label: "Claim this listing"});
    assert.deepEqual(organizerPage.listing.catchEvents, []);
    assert.deepEqual(organizerPage.listing.reviews, []);
  });

test("reviews carry their verification state and a verified-only rating",
  () => {
    const {organizerPage} = built();
    assert.deepEqual(organizerPage.latestReviews.map((review) =>
      [review.id, review.verificationStatus]), [
      ["review-verified", "verified"],
      ["review-public", "unverified"],
      ["review-anonymous", "verified"],
    ]);
    assert.deepEqual(organizerPage.reviewSummary, {readState: "enabled",
      rating: 4.5, count: 4, verifiedCount: 2,
      distribution: {"1": 0, "2": 0, "3": 1, "4": 1, "5": 2}});
    const noRating = built({reviewCounts: {count: 1, verifiedCount: 0,
      verifiedAverage: null,
      distribution: {"1": 0, "2": 0, "3": 0, "4": 1, "5": 0}}});
    assert.equal(noRating.organizerPage.reviewSummary.rating, null);
  });

test("event pages hold capacity, two reviews and three more events", () => {
  const {eventPages} = built();
  const page = eventPages.find((item) => item.eventId === "open-upcoming");
  assert(page);
  assert.deepEqual(page.capacity, {state: "open", capacityLimit: 12,
    bookedCount: 4, waitlistedCount: 0, spotsLeft: 8,
    waitlistAvailable: true});
  assert.deepEqual(page.reviews.map((review) => review.id),
    ["review-verified", "review-public"]);
  assert.deepEqual(page.moreEvents.map((card) => card.eventId),
    ["legacy-club-only", "mixer-restricted"]);
  assert.equal(page.organizer.upcomingEventCount, 3);
  assert.equal(page.organizer.rating, 4.5);
  // Today's event page reads organizer-wide and event reviews.
  assert.deepEqual(page.listing.reviews.map((review) => review.id),
    ["review-verified", "review-public", "review-anonymous"]);
  const external = eventPages.find((item) => item.eventId === "ext-public");
  assert.deepEqual(external?.capacity, {state: "external",
    capacityLimit: null, bookedCount: null, waitlistedCount: null,
    spotsLeft: null, waitlistAvailable: false});
});

test("withheld organizers build no pages", () => {
  for (const name of ["suppressed claim", "draft page", "removed page",
    "market not live", "synthetic organizer", "archived organizer",
    "contract-invalid document"]) {
    const pages = buildOrganizerScope(sources(parityCase(name)));
    assert.equal(pages.organizerPage, null, name);
    assert.deepEqual(pages.eventPages, [], name);
  }
  const missing = buildOrganizerScope(sources(parityCase(everyVariant),
    {organizer: null}));
  assert.equal(missing.organizerPage, null);
  const shared = buildOrganizerScope(sources(parityCase(everyVariant),
    {pathConflict: true}));
  assert.equal(shared.organizerPage, null);
  assert.deepEqual(shared.eventPages, []);
});

test("withdrawn events leave both pages; ambiguous ids lose the event page",
  () => {
    const parity = parityCase(everyVariant);
    const withdrawn = parity.catchEvents.map((doc) =>
      doc.id === "open-upcoming" ?
        {...doc, data: {...doc.data, publicationState: "unpublished"}} : doc);
    const {organizerPage, eventPages} = built({catchEvents: withdrawn,
      ambiguousEventIds: new Set(["ext-public"])});
    const listed = [...organizerPage.upcomingEvents,
      ...organizerPage.pastMoments].map((item) => item.eventId);
    assert(!listed.includes("open-upcoming"));
    assert(listed.includes("ext-public"));
    const pages = eventPages.map((page) => page.eventId);
    assert(!pages.includes("open-upcoming"));
    assert(!pages.includes("ext-public"));
    assert(!pages.includes("draft-event"));
  });

test("pages whose reviews are not readable show none", () => {
  const pages = buildOrganizerScope(sources(
    parityCase("noindex page stays readable")));
  assert(pages.organizerPage);
  assert.deepEqual(pages.organizerPage.latestReviews, []);
  assert.equal(pages.organizerPage.reviewSummary.readState, "disabled");
  assert.equal(pages.organizerPage.reviewSummary.count, 0);
  assert.equal(pages.organizerPage.listing.reviewReadState, undefined);
});

test("the recommendation rail shows three other recommendable organizers",
  () => {
    const owner = buildOrganizerScope(sources(
      parityCase("owner-created organizer in another live market")));
    assert(owner.organizerPage);
    assert.equal(owner.organizerPage.recommendable, true);
    assert.equal(owner.organizerPage.identity.verified, true);
    const card = recommendationCard(owner.organizerPage);
    assert.equal(card.reviewReadState, undefined);
    const others = ["a", "b", "c"].map((id) => ({...card, id}));
    const {organizerPage} = built({
      recommendationCandidates: [others[0], {...card, id: "next-proof"},
        others[1], others[2]],
    });
    assert.deepEqual(organizerPage.recommendedOrganizers.map((item) =>
      item.id), ["a", "b", "c"]);
    assert.equal(organizerPage.recommendable, false);
  });

test("content hashes ignore key order and follow content", () => {
  assert.equal(contentHash({a: 1, b: [1, {c: 2, d: 3}]}),
    contentHash({b: [1, {d: 3, c: 2}], a: 1}));
  assert.notEqual(contentHash({a: 1}), contentHash({a: 2}));
});

test("pages that break their contract are withheld before writing", () => {
  const {organizerPage, eventPages} = built();
  const builtAt = Timestamp.fromMillis(inputs.now);
  const valid = contractValidPages({organizerPage, eventPages}, builtAt);
  assert.equal(valid.organizerPage, organizerPage);
  assert.equal(valid.eventPages.length, eventPages.length);
  const brokenEvent = {...eventPages[0], moreEvents: [
    ...eventPages[0].moreEvents, ...eventPages[0].moreEvents,
    ...eventPages[0].moreEvents]};
  assert.equal(contractValidPages({organizerPage,
    eventPages: [brokenEvent, ...eventPages.slice(1)]}, builtAt)
    .eventPages.length, eventPages.length - 1);
  const brokenOrganizer = {...organizerPage,
    identity: {...organizerPage.identity, name: ""}};
  assert.deepEqual(contractValidPages({organizerPage: brokenOrganizer,
    eventPages}, builtAt), {organizerPage: null, eventPages: []});
});
