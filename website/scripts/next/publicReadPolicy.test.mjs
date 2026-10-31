import assert from "node:assert/strict";
import {test} from "node:test";
import {publicOrganizerAuthorized, publicEventAuthorized, publicDocumentId,
  organizerPath, publicJsonLd, publicHttpsUrl} from "../../src/server/publicReadPolicy.ts";

const markets = new Set(["mumbai", "indore"]);
const organizer = () => ({
  publicPage: {publishStatus: "published", canonicalPath: "/organizers/club/",
    citySlug: "mumbai", indexStatus: "noindex", robots: "noindex, follow"},
  ownership: {state: "programmatic"}, claim: {state: "unclaimed"},
  appVisibility: "hidden",
});
const event = () => ({publicationState: "published", status: "active", organizerId: "org_1"});

test("published noindex organizer remains public independently of native app visibility", () => {
  assert.equal(publicOrganizerAuthorized(organizer(), markets), true);
});

test("publication withdrawal and unknown authority deny reads on the next evaluation", () => {
  for (const state of [undefined, "draft", "qa", "suppressed", "removed", "unknown"]) {
    const doc = organizer(); doc.publicPage.publishStatus = state;
    assert.equal(publicOrganizerAuthorized(doc, markets), false);
  }
  for (const mutation of [d => d.claim.state = "suppressed", d => d.claim.state = "unknown",
    d => delete d.ownership, d => d.archived = true, d => d.status = "archived",
    d => d.publicPage.citySlug = "delhi", d => d.publicPage.canonicalPath = "https://evil.test/"]) {
    const doc = organizer(); mutation(doc);
    assert.equal(publicOrganizerAuthorized(doc, markets), false);
  }
});

test("demo and synthetic records never enter production public reads", () => {
  for (const extra of [{synthetic: true}, {dataOrigin: "catchDemo"}, {seedPrefix: "test"},
    {scenario: "demo"}, {demoOpsId: "x"}, {demoOpsCommand: "seed"}, {demoOps: {}}]) {
    assert.equal(publicOrganizerAuthorized({...organizer(), ...extra}, markets), false);
    assert.equal(publicEventAuthorized("event_1", {...event(), ...extra}), false);
  }
});

test("private, cancelled, malformed and legacy implicit-public events are denied", () => {
  assert.equal(publicEventAuthorized("event_1", event()), true);
  for (const publicationState of [undefined, "private", "draft", "cancelled"]) {
    assert.equal(publicEventAuthorized("event_1", {...event(), publicationState}), false);
  }
  assert.equal(publicEventAuthorized("event_1", {...event(), status: "cancelled"}), false);
  assert.equal(publicEventAuthorized("event_1", {...event(), organizerId: "../private"}), false);
});

test("IDs and canonical paths cannot escape the bounded collection and route", () => {
  for (const id of ["../secret", "a/b", "%2f", "", null, "a?token=x", "x".repeat(181)]) {
    assert.equal(publicDocumentId(id), false);
  }
  for (const path of ["//evil.test", "/organizers/../private/", "/organizers/a/?token=x",
    "/organizers/a/#secret", "/organizers/a/b/c/", "/organizers/%2f/"]) {
    assert.equal(organizerPath(path), false);
  }
});

test("structured metadata cannot close its script tag", () => {
  const value = {name: "</script><script>alert(1)</script>&\u2028"};
  const json = publicJsonLd(value);
  assert.equal(json.includes("<"), false);
  assert.deepEqual(JSON.parse(json), value);
});

test("public URL policy denies active schemes and embedded credentials", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "http://example.com",
    "https://user:password@example.com", "//example.com", null]) assert.equal(publicHttpsUrl(url), null);
  assert.equal(publicHttpsUrl("https://example.com/event?utm_source=catch"),
    "https://example.com/event?utm_source=catch");
});
