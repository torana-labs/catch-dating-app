import assert from "node:assert/strict";
import test from "node:test";
import {contractFixture} from "../shared/contractFixtures";
import {validateEventPublicPageDocument} from
  "../shared/generated/validators/eventPublicPageDocument";
import {validateOrganizerPublicPageDocument} from
  "../shared/generated/validators/organizerPublicPageDocument";
import {
  buildOrganizerScope,
  contentHash,
  type OrganizerScopeSources,
} from "./pageModel";
import {
  catchEventContribution,
  externalEventContribution,
  organizerContribution,
} from "./sourceProjections";

/**
 * The pages' advertising-tag projection (#2063), which replaced the
 * readPublicOrganizerTrackingSettings read: nothing for an organizer that may
 * not configure tags, organiser IDs never published under policy v1, and
 * Catch's own tags on the organiser page only when its published events
 * classify it eligible.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const now = Date.UTC(2026, 9, 22, 12);
const markets = new Set(["indore", "mumbai"]);
const at = (ms: number) => ({toMillis: () => ms});

/** A first-party organizer with an owner, published in Indore. */
function organizer(): Raw {
  const data = contractFixture<Raw>("organizer_doc");
  delete data.memberCount;
  return Object.assign(data, {
    name: "Lantern Lane Runners", organizerType: "eventProducer",
    organizerPhotos: [], followerCount: 0, hostUserId: "owner",
    ownerUserId: "owner", hostName: null, hostAvatarUrl: null,
    hostUserIds: ["owner"], hostProfiles: [], archived: false,
    status: "active",
    ownership: {state: "userCreated", ownerUserId: "owner",
      primaryHostUserId: "owner", hostUserIds: ["owner"], claimedAt: null,
      claimedByUid: null},
    claim: {state: "unclaimed", claimHref: "/organizers/lantern/#claim",
      lastClaimRequestId: null},
    publicPage: {slug: "lantern", citySlug: "indore",
      canonicalPath: "/organizers/lantern/", publishStatus: "published",
      indexStatus: "indexReady", robots: "index, follow", seoTitle: null,
      seoDescription: null, lastRenderedAt: null},
  });
}

function event(format: Raw): Raw {
  return {name: "Sunday run", organizerId: "lantern",
    publicationState: "published", status: "active", eventFormat: format,
    startTime: at(now + 86_400_000), endTime: at(now + 93_600_000),
    eventTimezone: "Asia/Kolkata", meetingLocation: {name: "Park"},
    currency: "INR", priceInPaise: 0, capacityLimit: 30, bookedCount: 6,
    publicRegistrationEnabled: true, publicRegistrationMode: "free"};
}

const running = {version: 1, activityKind: "running",
  interactionModel: "pacePods"};
const mixer = {version: 1, activityKind: "running",
  interactionModel: "freeFormMixer"};

function sources(data: Raw, events: Record<string, Raw>,
  external: Record<string, Raw> = {}): OrganizerScopeSources {
  return {
    organizerId: "lantern", organizer: {id: "lantern", data},
    pathConflict: false,
    catchEvents: Object.entries(events).map(([id, value]) =>
      ({id, data: value})),
    externalEvents: Object.entries(external).map(([id, value]) =>
      ({id, data: value})),
    ambiguousEventIds: new Set(), reviews: [],
    reviewCounts: {count: 0, verifiedCount: 0, verifiedAverage: null,
      distribution: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}},
    recommendationCandidates: [], liveMarkets: markets, now,
  };
}

test("an eligible organiser page lets Catch's tags run; IDs stay off",
  () => {
    const {organizerPage, eventPages} =
      buildOrganizerScope(sources(organizer(), {run: event(running)}));
    assert.deepEqual(organizerPage?.tracking, {enabled: false,
      metaPixelId: null, googleMeasurementId: null,
      policyReason: "policyReviewRequired", profileTagsEligible: true});
    assert.deepEqual(eventPages[0].tracking, {enabled: false,
      metaPixelId: null, googleMeasurementId: null,
      policyReason: "policyReviewRequired", profileTagsEligible: false});
    const stored = <T extends object>(page: T) => ({...page,
      builtAt: {_seconds: Math.floor(now / 1000), _nanoseconds: 0},
      contentHash: contentHash(page)});
    assert.equal(validateOrganizerPublicPageDocument(stored(organizerPage!)),
      true, JSON.stringify(validateOrganizerPublicPageDocument.errors));
    assert.equal(validateEventPublicPageDocument(stored(eventPages[0])), true,
      JSON.stringify(validateEventPublicPageDocument.errors));
  });

test("a sensitive or unclassified event closes the profile and says so",
  () => {
    const sensitive = buildOrganizerScope(sources(organizer(),
      {run: event(running), mixer: event(mixer)}));
    assert.equal(sensitive.organizerPage?.tracking?.profileTagsEligible,
      false);
    const reasons = Object.fromEntries(sensitive.eventPages.map((page) =>
      [page.eventId, page.tracking?.policyReason]));
    assert.deepEqual(reasons, {mixer: "sensitiveEvent",
      run: "policyReviewRequired"});
    const unknown = buildOrganizerScope(sources(organizer(),
      {run: event({activityKind: "running"})}));
    assert.equal(unknown.organizerPage?.tracking?.profileTagsEligible, false);
    assert.equal(unknown.eventPages[0].tracking?.policyReason,
      "eventClassificationUnavailable");
  });

test("an imported event reads as unclassified", () => {
  const external = contractFixture<Raw>("external_event_doc");
  Object.assign(external, {canonicalHostId: "lantern"});
  const {eventPages} = buildOrganizerScope(sources(organizer(),
    {run: event(running)}, {[external.eventId]: external}));
  const page = eventPages.find((item) => item.eventId === external.eventId);
  assert.equal(page?.tracking?.policyReason,
    "eventClassificationUnavailable");
  assert.equal(page?.tracking?.profileTagsEligible, false);
});

test("an organizer that may not configure tags carries no projection",
  () => {
    for (const change of [
      (data: Raw) => {
        data.ownerUserId = null;
      },
      (data: Raw) => {
        data.ownership = {...data.ownership, state: "programmatic"};
      },
    ]) {
      const data = organizer();
      change(data);
      const {organizerPage, eventPages} =
        buildOrganizerScope(sources(data, {run: event(running)}));
      assert.equal(organizerPage?.tracking, null);
      assert.equal(eventPages[0].tracking, null);
    }
  });

test("tag inputs rebuild pages; nothing else about them does", () => {
  const data = organizer();
  const before = organizerContribution("lantern", data, markets);
  assert.notEqual(organizerContribution("lantern",
    {...data, ownerUserId: null}, markets), before);
  const base = event(running);
  assert.notEqual(catchEventContribution("run", {...base,
    eventFormat: mixer}, now), catchEventContribution("run", base, now));
  const external = contractFixture<Raw>("external_event_doc");
  assert.notEqual(externalEventContribution(external.eventId,
    {...external, activity: {...external.activity, activityKind: "dinner"}}),
  externalEventContribution(external.eventId, external));
});
