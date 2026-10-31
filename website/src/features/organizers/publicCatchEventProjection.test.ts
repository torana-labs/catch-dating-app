import {expect, it, vi} from "vitest";
import {projectLivePublicCatchEvent as project, projectPublicCatchEventSnapshot as snapshot} from "./publicCatchEventProjection";
const itineraryTitle = "Fixture stop";
const base = () => ({organizerId: "host", publicationState: "published", status: "active",
  startTime: {toMillis: () => 9e12}, endTime: {toMillis: () => 9e12 + 3600000},
  meetingLocation: {name: "Park"}, eventFormat: {activityKind: "socialRun"},
  capacityLimit: 20, bookedCount: 2, priceInPaise: 0, currency: "INR",
  publicRegistrationEnabled: true, publicRegistrationMode: "free"});
it("requires explicit public active state before decoding rich fields", () => {
  const read = vi.fn(() => {throw Error();});
  for (const publicationState of [undefined, "private", "archived"]) {
    expect(project("event", {publicationState, get startTime() {return read();}})).toBeNull();
  }
  expect(read).not.toHaveBeenCalled();
  expect(project("event", {...base(), status: "cancelled"})).toBeNull();
});
it("keeps free international events but rejects unsupported paid currency", () => {
  expect(project("event", {...base(), currency: "USD"})?.event)
    .toMatchObject({currency: "USD", registrationMode: "free", priceLabel: "Free"});
  expect(project("event", {...base(), priceInPaise: 100, currency: "USD", publicRegistrationMode: "paid"})).toBeNull();
});
it("withholds malformed identities, dates, prices, and timezones", () => {
  for (const change of [{organizerId: "other"}, {capacityLimit: 0}, {bookedCount: -1},
    {priceInPaise: -1}, {startTime: {toMillis: () => {throw Error();}}},
    {endTime: {toMillis: () => 1}}, {eventTimezone: "invalid"}]) {
    expect(project("event", {...base(), ...change})).toBeNull();
  }
  expect(project("bad/id", base())).toBeNull();
});
it("displays restricted events without an open checkout CTA", () => {
  const admission = {format: "open", privateAccessPolicy: {mode: "none"}};
  const policy = {admission, pricing: {basePriceInPaise: 0}};
  expect(project("event", {...base(), eventPolicy: policy})?.event.registrationMode).toBe("free");
  for (const change of [{inviteRequired: true}, {membershipRequired: true},
    {manualApprovalRequired: true}, {privateAccessPolicy: {mode: "inviteCode"}},
    {cohortCapacityLimits: {men: 2}}, {balancedRatioPolicy: {}},
    {crossPathsPairInventory: {enabled: true}}]) {
    expect(project("event", {...base(), eventPolicy: {...policy, admission: {...admission, ...change}}})?.event)
      .toMatchObject({registrationMode: "closed", publicRegistrationEnabled: false});
  }
  for (const change of [{constraints: {maxMen: 3}}, {crossPathsPairHeldCount: 1},
    {crossPathsPairConfirmedCount: 1}, {crossPathsPairHeldCohortCounts: {men: 1}},
    {eventPolicy: {...policy, pricing: {basePriceInPaise: 0, demandPricingRules: [{}]}}}]) {
    expect(project("event", {...base(), ...change})?.event.registrationMode).toBe("closed");
  }
});
it("rejects cached, pending and oversized snapshots before decoding and handles removal", () => {
  const data = vi.fn(() => base());
  const source = {metadata: {fromCache: false, hasPendingWrites: false}, size: 1, docs: [{id: "event", data}]};
  for (const change of [{metadata: {fromCache: true, hasPendingWrites: false}},
    {metadata: {fromCache: false, hasPendingWrites: true}}, {size: 401}]) {
    expect(snapshot({...source, ...change})).toBeNull();
  }
  expect(data).not.toHaveBeenCalled();
  expect(snapshot(source)).toHaveLength(1);
  expect(snapshot({...source, size: 0, docs: []})).toEqual([]);
});
it("projects canonical optional media, venues and itinerary without private metadata", () => {
  const venue = {name: "Park", latitude: 0, longitude: 0, notes: null};
  const itinerary = [{id: "stop1", kind: "stop", offsetMinutes: 0, title: itineraryTitle, location: venue, description: null}];
  const event = project("event", {...base(), meetingLocation: venue, itinerary,
    photoUrl: "https://example.com/legacy.jpg", eventPhotos: [
      {url: "https://example.com/later.jpg", position: 2},
      {url: "https://example.com/rejected.jpg", position: 0, moderation: {status: "rejected"}},
      {url: "https://example.com/first.jpg", position: 1, storagePath: "private/path"},
    ]})?.event;
  expect(event).toMatchObject({photoUrl: "https://example.com/first.jpg", meetingLocation: venue, itinerary});
  expect(JSON.stringify(event)).not.toContain("private/path");
});
it("omits malformed optional values using the shared constraints", () => {
  for (const change of [
    {itinerary: [{id: "stop", kind: "stop", title: itineraryTitle, offsetMinutes: -1}]},
    {itinerary: [{id: "bad/id", kind: "stop", title: itineraryTitle, offsetMinutes: 0}]},
    {itinerary: [{id: "stop", kind: "stop", title: itineraryTitle, offsetMinutes: 0, location: {name: "Venue", latitude: 91, longitude: 0}}]},
    {itinerary: null},
  ]) expect(project("event", {...base(), ...change})?.event.itinerary).toBeUndefined();
  for (const photoUrl of [null, "javascript:alert(1)", "http://example.com/a.jpg", "bad", "https://user:pass@example.com/a.jpg"]) {
    expect(project("event", {...base(), photoUrl})?.event.photoUrl).toBeNull();
  }
});
it("keeps a published event with no optional end time", () => {
  const event = project("event", {...base(), endTime: undefined})?.event;
  expect(event?.endTime).toBeNull();
  expect(event?.date).not.toContain(" – ");
});

it("cannot restore moderated artwork through the legacy cover URL", () => {
  for (const status of ["pending", "rejected"]) {
    expect(project("event", {...base(), photoUrl: "https://example.com/cover.jpg", eventPhotos: [
      {url: "https://example.com/cover.jpg", position: 0, moderation: {status}},
    ]})?.event.photoUrl).toBeNull();
  }
});
it("publishes the badge only for explicit participation declarations", () => {
  // Rotations is a valid declaration but dating framing, so it is never public (CAT-247).
  expect(project("event", {...base(), catchExperienceActivities: ["introductions", "rotations"]})?.event.catchExperienceActivities).toEqual(["introductions"]);
  for (const value of [undefined, [], ["checkIn"], ["rotations"], ["rotations", "logistics"], ["rotations", "rotations"]]) {
    expect(project("event", {...base(), catchExperienceActivities:value, eventFormat:{activityKind:"singlesMixer",defaultModuleIds:["firstHello"]}})?.event.catchExperienceActivities).toBeUndefined();
  }
});

it("projects only explicitly public guest notes and canonical admission constraints", () => {
  const event = project("event", {...base(), constraints: {minAge: 21, maxAge: 35},
    eventFormat: {activityKind: "dinner", activityDetails: {privateNotes: "PRIVATE", publicDetails: {
      requirements: "Bring ID.", accessibility: "Step-free access.", included: "Dinner.", privateField: "PRIVATE",
    }}}, eventPolicy: {admission: {format: "manualApproval", manualApprovalRequired: true,
      privateAccessPolicy: {mode: "none", code: "SECRET"}, waitlistPolicy: {mode: "manualReview"}},
      pricing: {basePriceInPaise: 0}, cancellation: {policyId: "standard"}},
  })?.event;
  expect(event).toMatchObject({requirements: "Ages 21–35. Bring ID.", accessibility: "Step-free access.",
    included: "Dinner.", admissionLabels: ["approval"], registrationAccess: "restricted", waitlistAvailable: true, cancellationPolicy: "standard"});
  expect(JSON.stringify(event)).not.toMatch(/PRIVATE|SECRET/);
  expect(project("event", {...base(), constraints: {minAge: 40, maxAge: 20},
    eventFormat: {activityKind: "dinner", activityDetails: {publicDetails: {requirements: "x".repeat(2001), accessibility: {secret: true}}}},
  })?.event.requirements).toBeUndefined();
});

it("reflects edited and cleared host guest notes without stale fallbacks", () => {
  for (const publicDetails of [
    {accessibility: "Step-free entrance", included: "Dinner"},
    {accessibility: "Lift at the rear", included: "Water"},
    {},
  ]) {
    const record = project("event", {...base(), eventFormat: {
      activityKind: "dinner", activityDetails: {publicDetails, privateNotes: "Private marker"},
    }})?.event;
    expect(record?.accessibility).toBe(publicDetails.accessibility);
    expect(record?.included).toBe(publicDetails.included);
    expect(JSON.stringify(record)).not.toContain("Private marker");
  }
});
