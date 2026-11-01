import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import {listingFromFirestoreOrganizer} from "./generateOrganizerListings.mjs";
import {organizerListingReadiness, buildOrganizerListingReadinessReceipt} from
  "./organizerListingReadiness.mjs";
import {validateWebsiteHostListingProjection} from
  "../../tool/contracts/generated/schema_contract_validators.mjs";

function organizer() {
  const data = JSON.parse(fs.readFileSync(new URL(
    "../../contracts/fixtures/valid/organizer_doc.json", import.meta.url), "utf8"));
  delete data.memberCount;
  Object.assign(data, {organizerType: "eventProducer", organizerPhotos: [], followerCount: 0,
    hostUserId: null, ownerUserId: null, hostName: null, hostAvatarUrl: null,
    hostUserIds: [], hostProfiles: [], ownership: {state: "programmatic",
      ownerUserId: null, primaryHostUserId: null, hostUserIds: [], claimedAt: null, claimedByUid: null},
    claim: {state: "unclaimed", claimHref: "/organizers/synthetic-host/#claim", lastClaimRequestId: null},
    publicPage: {slug: "synthetic-host", citySlug: "indore", canonicalPath: "/organizers/synthetic-host/",
      publishStatus: "published", indexStatus: "indexReady", robots: "index, follow",
      seoTitle: null, seoDescription: null, lastRenderedAt: null}});
  return {id: "synthetic-auto-id", path: "organizers/synthetic-auto-id", data};
}

test("fresh canonical snapshot enables claim/read without a retired plan or receipt", () => {
  const document = organizer();
  const listing = listingFromFirestoreOrganizer(document);
  assert(listing);
  assert.equal(validateWebsiteHostListingProjection(listing), true);
  assert.equal(listing.id, "synthetic-auto-id");
  assert.equal(listing.path, "/organizers/synthetic-host/");
  assert.equal(listing.capabilities.claimRequest.state, "enabled");
  assert.equal(listing.capabilities.publicReviews.targetState, "enabled");
  assert.equal(listing.capabilities.publicReviews.readState, "enabled");
  assert.equal(listing.capabilities.publicReviews.writeState, "disabled",
    "unclaimed listing has no event-end proof");
  assert.equal(listing.capabilities.supply.bookable, false);
});

test("owner/pending readiness does not reopen claims or disable eligible review reads", () => {
  for (const change of [
    (data) => {data.claim.state = "claimPending";},
    (data) => {data.claim.state = "claimed"; data.ownership.state = "claimed"; data.ownerUserId = "owner";},
    (data) => {data.ownerUserId = "owner";},
    (data) => {data.hostUserIds = ["manager"];},
  ]) {
    const document = organizer();
    change(document.data);
    const listing = listingFromFirestoreOrganizer(document);
    assert(listing);
    assert.equal(listing.capabilities.claimRequest.state, "disabled");
    assert.equal(listing.capabilities.publicReviews.readState, "enabled");
  }
});

test("canonical eligibility fails closed for missing, legacy and contradictory snapshots", () => {
  for (const change of [
    (document) => {document.path = "clubs/synthetic-auto-id";},
    (document) => {document.path = "organizers/wrong-id";},
    (document) => {document.data = null;},
    (document) => {document.data.archived = true;},
    (document) => {document.data.claim.state = "suppressed";},
    (document) => {document.data.publicPage.publishStatus = "draft";},
    (document) => {document.data.publicPage.canonicalPath = "/wrong-route/";},
    (document) => {document.data.supplyCapabilities = {bookable: true};},
  ]) {
    const document = organizer();
    change(document);
    const readiness = organizerListingReadiness(document);
    assert.equal(readiness.publicApi.state, "disabled");
    assert.equal(readiness.publicReviewTarget.state, "disabled");
  }
});

test("an approved noindex listing can be claimed before it is indexed", () => {
  for (const change of [
    (data) => {data.publicPage.indexStatus = "noindex";},
    (data) => {data.publicPage.robots = "noindex, follow";},
  ]) {
    const document = organizer();
    change(document.data);
    const readiness = organizerListingReadiness(document);
    assert.equal(readiness.publicApi.state, "enabled");
    assert.equal(readiness.publicApi.claimTargetSyncStatus, "in_sync");
    assert.equal(readiness.publicReviewTarget.state, "disabled",
      "public reviews still wait for an index-ready page");
    assert.equal(listingFromFirestoreOrganizer(document).capabilities.claimRequest.state, "enabled");
  }
});

test("diagnostic receipt binds project, target and exact projection without copying contact data", () => {
  const document = organizer();
  const listings = [listingFromFirestoreOrganizer(document)];
  const receipt = buildOrganizerListingReadinessReceipt({
    projectId: "demo-catch", documents: [document], listings,
  });
  assert.equal(receipt.mode.remoteWrites, 0);
  assert.equal(receipt.projectId, "demo-catch");
  assert.equal(receipt.targets[0].path, document.path);
  assert.equal(receipt.targets[0].canonicalPath, document.data.publicPage.canonicalPath);
  assert.equal(receipt.projection.sha256, crypto.createHash("sha256")
    .update(`${JSON.stringify(listings, null, 2)}\n`).digest("hex"));
  assert.equal(JSON.stringify(receipt).includes(document.data.email), false);
  assert.equal(JSON.stringify(receipt).includes(document.data.phoneNumber), false);
  const changed = structuredClone(document);
  changed.data.claim.state = "claimPending";
  const next = buildOrganizerListingReadinessReceipt({projectId: "demo-catch",
    documents: [changed], listings: [listingFromFirestoreOrganizer(changed)]});
  assert.notEqual(next.projection.sha256, receipt.projection.sha256);
});
