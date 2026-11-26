import assert from "node:assert/strict";
import test from "node:test";
import {contractFixture} from "../shared/contractFixtures";
import {buildOrganizerScope} from "./pageModel";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizer";
import {
  organizerPath,
  publicDocumentId,
  publicEventAuthorized,
  publicHttpsUrl,
  publicOrganizerAuthorized,
} from "./publicReadPolicy";
import {projectPublicReview} from "./publicReview";

/**
 * The public projections' own rules. The website reader these mirrored no
 * longer reads source documents (it reads the page read models), so these
 * cases, carried over from its tests, now hold the projections here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const markets = new Set(["indore", "mumbai"]);

/** An imported (programmatic) organizer published in Indore. */
function organizerFixture(): Raw {
  const data = contractFixture<Raw>("organizer_doc");
  delete data.memberCount;
  return Object.assign(data, {
    name: "Next proof organizer", organizerType: "eventProducer",
    organizerPhotos: [], followerCount: 0, hostUserId: null,
    ownerUserId: null, hostName: null, hostAvatarUrl: null, hostUserIds: [],
    hostProfiles: [],
    ownership: {state: "programmatic", ownerUserId: null,
      primaryHostUserId: null, hostUserIds: [], claimedAt: null,
      claimedByUid: null},
    claim: {state: "unclaimed", claimHref: "/organizers/next-proof/#claim",
      lastClaimRequestId: null},
    publicPage: {slug: "next-proof", citySlug: "indore",
      canonicalPath: "/organizers/next-proof/", publishStatus: "published",
      indexStatus: "indexReady", robots: "index, follow", seoTitle: null,
      seoDescription: null, lastRenderedAt: null},
  });
}

const policyOrganizer = (): Raw => ({
  publicPage: {publishStatus: "published", canonicalPath: "/organizers/club/",
    citySlug: "mumbai", indexStatus: "noindex", robots: "noindex, follow"},
  ownership: {state: "programmatic"}, claim: {state: "unclaimed"},
  appVisibility: "hidden",
});
const policyEvent = (): Raw =>
  ({publicationState: "published", status: "active", organizerId: "org_1"});

test("a published noindex organizer stays public whatever its app visibility",
  () => {
    assert.equal(publicOrganizerAuthorized(policyOrganizer(), markets), true);
  });

test("publication withdrawal and unknown authority deny the next build",
  () => {
    for (const state of [undefined, "draft", "qa", "suppressed", "removed",
      "unknown"]) {
      const doc = policyOrganizer();
      doc.publicPage.publishStatus = state;
      assert.equal(publicOrganizerAuthorized(doc, markets), false);
    }
    for (const mutation of [
      (doc: Raw) => {
        doc.claim.state = "suppressed";
      },
      (doc: Raw) => {
        doc.claim.state = "unknown";
      },
      (doc: Raw) => {
        delete doc.ownership;
      },
      (doc: Raw) => {
        doc.archived = true;
      },
      (doc: Raw) => {
        doc.status = "archived";
      },
      (doc: Raw) => {
        doc.publicPage.citySlug = "delhi";
      },
      (doc: Raw) => {
        doc.publicPage.canonicalPath = "https://evil.test/";
      },
    ]) {
      const doc = policyOrganizer();
      mutation(doc);
      assert.equal(publicOrganizerAuthorized(doc, markets), false);
    }
  });

test("demo and synthetic records never reach a public page", () => {
  for (const extra of [{synthetic: true}, {dataOrigin: "catchDemo"},
    {seedPrefix: "test"}, {scenario: "demo"}, {demoOpsId: "x"},
    {demoOpsCommand: "seed"}, {demoOps: {}}]) {
    assert.equal(publicOrganizerAuthorized(
      {...policyOrganizer(), ...extra}, markets), false);
    assert.equal(publicEventAuthorized("event_1",
      {...policyEvent(), ...extra}), false);
  }
});

test("private, cancelled, malformed and implicitly public events are denied",
  () => {
    assert.equal(publicEventAuthorized("event_1", policyEvent()), true);
    for (const publicationState of [undefined, "private", "draft",
      "cancelled"]) {
      assert.equal(publicEventAuthorized("event_1",
        {...policyEvent(), publicationState}), false);
    }
    assert.equal(publicEventAuthorized("event_1",
      {...policyEvent(), status: "cancelled"}), false);
    assert.equal(publicEventAuthorized("event_1",
      {...policyEvent(), organizerId: "../private"}), false);
  });

test("ids and canonical paths cannot escape the collection and route", () => {
  for (const id of ["../secret", "a/b", "%2f", "", null, "a?token=x",
    "x".repeat(181)]) {
    assert.equal(publicDocumentId(id), false);
  }
  for (const path of ["//evil.test", "/organizers/../private/",
    "/organizers/a/?token=x", "/organizers/a/#secret", "/organizers/a/b/c/",
    "/organizers/%2f/"]) {
    assert.equal(organizerPath(path), false);
  }
});

test("public links deny active schemes and embedded credentials", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x",
    "http://example.com", "https://user:password@example.com",
    "//example.com", null]) {
    assert.equal(publicHttpsUrl(url), null);
  }
  assert.equal(publicHttpsUrl("https://example.com/event?utm_source=catch"),
    "https://example.com/event?utm_source=catch");
});

test("the listing leaves out contact, owner identities and unknown nested data",
  () => {
    const data = organizerFixture();
    data.ownerUserId = "private-owner-marker";
    const listing = projectPublicOrganizer("next-proof", data, markets);
    assert.ok(listing);
    const serialized = JSON.stringify(listing);
    for (const secret of [data.email, data.phoneNumber,
      "private-owner-marker"]) {
      if (secret) assert.ok(!serialized.includes(secret));
    }
    data.publicProfile = {headline: "Public",
      facts: [{label: "Label", value: "Value", privateToken: "secret"}]};
    assert.equal(projectPublicOrganizer("next-proof", data, markets), null);
  });

test("publication and live market gates run on every listing", () => {
  const data = organizerFixture();
  assert.ok(projectPublicOrganizer("next-proof", data, markets));
  for (const state of ["draft", "qa", "suppressed", "removed"]) {
    data.publicPage.publishStatus = state;
    assert.equal(projectPublicOrganizer("next-proof", data, markets), null);
  }
  data.publicPage.publishStatus = "published";
  data.publicPage.indexStatus = "noindex";
  data.publicPage.robots = "noindex, follow";
  assert.ok(projectPublicOrganizer("next-proof", data, markets));
  assert.equal(projectPublicOrganizer("next-proof", data,
    new Set(["mumbai"])), null);
});

test("imported listings stay out of search and never show intake prose",
  () => {
    const data = organizerFixture();
    data.description = "Discovered through a public event page; " +
      "stays out of search until reviewed.";
    data.publicProfile = {
      headline: "Next proof organizer in Indore",
      summary: "Operator summary for owner review.",
      sourceSummary: "A public page confirms the organizer.",
      facts: [{label: "Location", value: "Indore"},
        {label: "Claim state", value: "Unclaimed seed listing"},
        {label: "Indexing", value: "Noindex until verified"}],
    };
    data.publicSources = [
      {type: "user_supplied", label: "User seed input",
        detail: "Operator asked for this listing.", confidence: "medium",
        href: null, lastCheckedAt: null},
      {type: "public_event_page", label: "Event page",
        detail: "Public event page.", confidence: "high",
        href: "https://example.com/event", lastCheckedAt: null},
    ];
    const listing = projectPublicOrganizer("next-proof", data, markets);
    assert.ok(listing);
    assert.equal(listing.indexing, "noindex, follow");
    assert.equal(listing.authority.indexStatus, "indexReady",
      "reviews still follow the stored index status");
    const serialized = JSON.stringify(listing);
    for (const operatorText of ["Operator summary", "stays out of search",
      "A public page confirms", "Unclaimed seed listing",
      "Noindex until verified", "Operator asked"]) {
      assert.ok(!serialized.includes(operatorText), operatorText);
    }
    assert.match(listing.description,
      /^Next proof organizer is an event producer in /u);
    assert.equal(listing.sourceSummary, listing.description);
    assert.deepEqual(listing.facts, [{label: "Location", value: "Indore"}]);
    assert.deepEqual(listing.sources.map((source) => source.label),
      ["Event page"]);

    data.ownership.state = "claimed";
    data.claim.state = "claimed";
    const claimed = projectPublicOrganizer("next-proof", data, markets);
    assert.ok(claimed);
    assert.equal(claimed.indexing, "index, follow");
    assert.equal(claimed.description, "Operator summary for owner review.");
    assert.deepEqual(claimed.fitNotes, []);
  });

test("an approved listing with no description still reaches the site " +
  "(#1354)", () => {
  // What approval writes for a nomination whose profile could not be read.
  const data = organizerFixture();
  data.description = "";
  data.publicProfile = {headline: null, summary: null, sourceSummary: null,
    formats: [], facts: [], eventEvidence: []};
  data.publicPage = {...data.publicPage, indexStatus: "noindex",
    robots: "noindex, follow"};
  const listing = projectPublicOrganizer("next-proof", data, markets);
  assert.ok(listing, "the sourced summary stands in before validation");
  assert.match(listing.description,
    /^Next proof organizer is an event producer in /u);
  assert.equal(listing.sourceSummary, listing.description);
  assert.equal(listing.capabilities.claimRequest.state, "enabled");

  // An owner's page shows its own copy, so an empty one stays off the site.
  data.ownership.state = "claimed";
  data.claim.state = "claimed";
  assert.equal(projectPublicOrganizer("next-proof", data, markets), null);
});

test("organiser credibility uses followers and verified-review counts", () => {
  const data = {...organizerFixture(), rating: 4.5, reviewCount: 10,
    verifiedReviewCount: 4, followerCount: 23};
  const indore = new Set(["indore"]);
  const listing = projectPublicOrganizer("host", data, indore);
  assert.deepEqual(listing?.metrics, {rating: 4.5, reviewCount: 10,
    verifiedReviewCount: 4, followerCount: 23});
  assert.equal(projectPublicOrganizer("host",
    {...data, verifiedReviewCount: 0}, indore)?.metrics?.rating, undefined);
});

const stamp = {toMillis: () => Date.parse("2026-10-01T10:00:00Z")};
const review = (): Raw => ({organizerId: "host", eventId: "past-event",
  reviewerName: "Guest", reviewerUserId: "SECRET", createdAt: stamp,
  rating: 5, comment: "Welcoming event.", moderationStatus: "published",
  verificationStatus: "verified", source: "catchEvent"});

test("public reviews keep scope and response but no identities", () => {
  const projected = projectPublicReview("review", {...review(),
    isAnonymous: true, reviewerName: "PRIVATE",
    ownerResponse: {hostName: "Host", hostUserId: "SECRET",
      message: "Thanks!", updatedAt: stamp,
      hostAvatarUrl: "javascript:bad()"}}, "host");
  assert.ok(projected);
  assert.equal(projected.reviewerName, "Anonymous guest");
  assert.equal(projected.eventId, "past-event");
  assert.equal(projected.ownerResponse?.message, "Thanks!");
  assert.equal(projected.ownerResponse?.hostAvatarUrl, null);
  assert.doesNotMatch(JSON.stringify(projected),
    /SECRET|PRIVATE|reviewerUserId|hostUserId/u);
});

test("moderated, foreign, synthetic and malformed reviews stay private",
  () => {
    for (const patch of [{moderationStatus: "pending"},
      {moderationStatus: "rejected"}, {organizerId: "other"},
      {synthetic: true}, {dataOrigin: "catchDemo"}, {createdAt: null},
      {rating: NaN}, {rating: 6}, {comment: "x".repeat(1001)}]) {
      assert.equal(projectPublicReview("review", {...review(), ...patch},
        "host"), null);
    }
    assert.equal(projectPublicReview("review",
      {...review(), source: "publicListing"}, "host")?.verificationStatus,
    "unverified");
    assert.equal(projectPublicReview("review",
      {...review(), verificationStatus: "unverified"}, "host")
      ?.verificationStatus, "unverified");
  });

test("an imported event keeps only its public outbound display", () => {
  const raw = contractFixture<Raw>("external_event_doc");
  const result = publicExternalEvent(raw.eventId, raw);
  assert.ok(result);
  assert.equal(result.organizerId, raw.canonicalHostId);
  assert.equal(result.event.sourceHref, raw.booking.externalLinks[0].url);
  assert.equal(result.event.availability, "read_only_external");
  assert.ok(!JSON.stringify(result).includes("primaryCandidateId"));
});

test("withdrawn, conflicting, synthetic and active-scheme imports stay off",
  () => {
    for (const alter of [
      (data: Raw) => {
        data.publicationStatus = "private";
      },
      (data: Raw) => {
        data.status = "cancelled";
      },
      (data: Raw) => {
        data.eventId = "different";
      },
      (data: Raw) => {
        data.synthetic = true;
      },
      (data: Raw) => {
        data.booking.catchPaymentsEnabled = true;
      },
      (data: Raw) => {
        data.booking.externalLinks[0].url = "javascript:alert(1)";
      },
    ]) {
      const raw = contractFixture<Raw>("external_event_doc");
      const id = raw.eventId;
      alter(raw);
      assert.equal(publicExternalEvent(id, raw), null);
    }
  });

test("no dating framing reaches a page built from a mixer's sources " +
  "(CAT-247)", () => {
  const now = Date.UTC(2026, 9, 22, 12);
  const at = (ms: number) => ({toMillis: () => ms});
  const organizer = Object.assign(organizerFixture(), {
    name: "Harbour Lights Social",
    claim: {state: "unclaimed", claimHref: "/organizers/harbour/#claim",
      lastClaimRequestId: null},
  });
  Object.assign(organizer.publicPage,
    {slug: "harbour", canonicalPath: "/organizers/harbour/"});
  const mixer = (patch: Raw): Raw => ({name: "", organizerId: "harbour",
    publicationState: "published", status: "active",
    eventFormat: {activityKind: "singlesMixer"},
    startTime: at(now + 86_400_000), endTime: at(now + 93_600_000),
    eventTimezone: "Asia/Kolkata", meetingLocation: {name: "Harbour Steps"},
    currency: "INR", priceInPaise: 0, capacityLimit: 30, bookedCount: 6,
    publicRegistrationEnabled: true, publicRegistrationMode: "free",
    scorecard: {mutualMatchCount: 9}, ...patch});
  const external = contractFixture<Raw>("external_event_doc");
  Object.assign(external, {eventId: "ext-harbour-mixer",
    canonicalHostId: "harbour",
    activity: {...external.activity, activityKind: "singlesMixer"}});
  const {organizerPage, eventPages} = buildOrganizerScope({
    organizerId: "harbour",
    organizer: {id: "harbour", data: organizer},
    pathConflict: false,
    catchEvents: [
      {id: "harbour-mixer", data: mixer({catchExperienceActivities:
        ["introductions", "rotations"], constraints: {maxMen: 15,
        maxWomen: 15}})},
      {id: "harbour-walk", data: mixer({name: "Lantern walk",
        eventFormat: {activityKind: "walking"},
        catchExperienceActivities: ["rotations"]})},
    ],
    externalEvents: [{id: "ext-harbour-mixer", data: external}],
    ambiguousEventIds: new Set(),
    reviews: [],
    reviewCounts: {count: 0, verifiedCount: 0, verifiedAverage: null,
      distribution: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}},
    recommendationCandidates: [],
    liveMarkets: markets,
    now,
  });
  assert.ok(organizerPage);
  assert.equal(eventPages.length, 3);
  assert.doesNotMatch(JSON.stringify([organizerPage, eventPages]),
    /singlesMixer|Singles mixer|balanced|rotations|mutualMatch|scorecard/u);
  const events = new Map([...organizerPage.upcomingEvents,
    ...organizerPage.pastMoments].map((item) => [item.eventId,
    item.event as Raw]));
  assert.equal(events.get("harbour-mixer")?.activityKind, "openActivity");
  // An unnamed mixer takes the open activity's generated title.
  assert.equal(events.get("harbour-mixer")?.title, "Hosted event");
  assert.deepEqual(events.get("harbour-mixer")?.catchExperienceActivities,
    ["introductions"]);
  assert.ok(!("admissionLabels" in (events.get("harbour-mixer") ?? {})));
  assert.equal(events.get("harbour-walk")?.activityKind, "walking");
  assert.equal(events.get("harbour-walk")?.title, "Lantern walk");
  assert.ok(!("catchExperienceActivities" in
    (events.get("harbour-walk") ?? {})));
  assert.equal(events.get("ext-harbour-mixer")?.activityKind,
    "openActivity");
});
