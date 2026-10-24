import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {organizerFixture} from "./organizerFixture.mjs";
import {projectPublicOrganizer} from "../../src/server/publicOrganizerProjection.ts";
import * as narrow from "./publicValidators.mjs";
import * as repository from "../../../tool/contracts/generated/schema_contract_validators.mjs";
const markets = new Set(["indore", "mumbai"]);
test("request DTO excludes contact, ownership identities and arbitrary nested data", () => {
  const data = organizerFixture();
  data.ownerUserId = "private-owner-marker";
  const listing = projectPublicOrganizer("next-proof", data, markets);
  assert(listing);
  const serialized = JSON.stringify(listing);
  for (const secret of [data.email, data.phoneNumber, "private-owner-marker"]) {
    if (secret) assert(!serialized.includes(secret));
  }
  data.publicProfile = {headline: "Public", facts: [{label: "Label", value: "Value", privateToken: "secret"}]};
  assert.equal(projectPublicOrganizer("next-proof", data, markets), null);
});
test("public publication and live market gates run on every projection", () => {
  const data = organizerFixture();
  assert(projectPublicOrganizer("next-proof", data, markets));
  for (const state of ["draft", "qa", "suppressed", "removed"]) {
    data.publicPage.publishStatus = state;
    assert.equal(projectPublicOrganizer("next-proof", data, markets), null);
  }
  data.publicPage.publishStatus = "published";
  data.publicPage.indexStatus = "noindex";
  data.publicPage.robots = "noindex, follow";
  assert(projectPublicOrganizer("next-proof", data, markets));
  assert.equal(projectPublicOrganizer("next-proof", data, new Set(["mumbai"])), null);
});
test("imported listings stay out of search and never render intake prose", () => {
  const data = organizerFixture();
  data.description = "Discovered through a public event page; stays out of search until reviewed.";
  data.publicProfile = {
    headline: "Next proof organizer in Indore",
    summary: "Operator summary for owner review.",
    sourceSummary: "A public page confirms the organizer.",
    facts: [{label: "Location", value: "Indore"}, {label: "Claim state", value: "Unclaimed seed listing"},
      {label: "Indexing", value: "Noindex until verified"}],
  };
  data.publicSources = [
    {type: "user_supplied", label: "User seed input", detail: "Operator asked for this listing.", confidence: "medium",
      href: null, lastCheckedAt: null},
    {type: "public_event_page", label: "Event page", detail: "Public event page.", confidence: "high",
      href: "https://example.com/event", lastCheckedAt: null},
  ];
  const listing = projectPublicOrganizer("next-proof", data, markets);
  assert(listing);
  assert.equal(listing.indexing, "noindex, follow");
  assert.equal(listing.authority.indexStatus, "indexReady", "reviews still follow the stored index status");
  const serialized = JSON.stringify(listing);
  for (const operatorText of ["Operator summary", "stays out of search", "A public page confirms",
    "Unclaimed seed listing", "Noindex until verified", "Operator asked"]) {
    assert(!serialized.includes(operatorText), operatorText);
  }
  assert.match(listing.description, /^Next proof organizer is an event producer in /u);
  assert.equal(listing.sourceSummary, listing.description);
  assert.deepEqual(listing.facts, [{label: "Location", value: "Indore"}]);
  assert.deepEqual(listing.sources.map(source => source.label), ["Event page"]);

  data.ownership.state = "claimed";
  data.claim.state = "claimed";
  const claimed = projectPublicOrganizer("next-proof", data, markets);
  assert(claimed);
  assert.equal(claimed.indexing, "index, follow");
  assert.equal(claimed.description, "Operator summary for owner review.");
  assert.deepEqual(claimed.fitNotes, []);
});
test("runtime validator adapter agrees with repository generated validators", () => {
  const valid = organizerFixture();
  for (const data of [valid, {...valid, name: 17}, {...valid, ownership: {state: "unknown"}}, null]) {
    assert.equal(narrow.validateOrganizerDocument(data), repository.validateOrganizerDocument(data));
  }
  const listing = projectPublicOrganizer("next-proof", valid, markets);
  for (const value of [listing, {...listing, privateToken: "no"}, {...listing, name: 123}, null]) {
    assert.equal(narrow.validateWebsiteHostListingProjection(value), repository.validateWebsiteHostListingProjection(value));
  }
});
test("webpack's runtime validator replacement retains external-event validation", () => {
  assert.deepEqual(Object.keys(narrow).sort(), [
    "validateExternalEventDocument", "validateOrganizerDocument", "validateWebsiteHostListingProjection",
  ]);
  const valid = JSON.parse(readFileSync(new URL("../../../contracts/fixtures/valid/external_event_doc.json", import.meta.url), "utf8"));
  for (const value of [valid, {...valid, eventId: 17}, {...valid, booking: {}}, null]) {
    assert.equal(narrow.validateExternalEventDocument(value), repository.validateExternalEventDocument(value));
  }
  assert.equal(narrow.validateExternalEventDocument(valid), true);
  assert.equal(narrow.validateExternalEventDocument({...valid, booking: {}}), false);
});
