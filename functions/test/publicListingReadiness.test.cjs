"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");
const {requestOrganizerClaimHandler, adminDecideOrganizerClaimHandler} =
  require("../lib/organizers/organizerClaims");
const {createPublicOrganizerReviewHandler, listPublicOrganizerReviewsHandler,
  createEventReviewHandler} = require("../lib/reviews/mutateReview");
const {enforceAppCheckForRuntime} = require("../lib/shared/callableOptions");

const root = path.resolve(__dirname, "../..");
async function project(data) {
  const {listingFromFirestoreOrganizer} = await import(pathToFileURL(
    path.join(root, "website/scripts/generateOrganizerListings.mjs")));
  return listingFromFirestoreOrganizer({id: "synthetic-auto-id",
    path: "organizers/synthetic-auto-id", data});
}
function organizer(managed = false) {
  const data = JSON.parse(fs.readFileSync(path.join(root,
    "contracts/fixtures/valid/organizer_doc.json"), "utf8"));
  delete data.memberCount;
  Object.assign(data, {organizerType: "eventProducer", organizerPhotos: [], followerCount: 0,
    hostUserId: managed ? "owner" : null, ownerUserId: managed ? "owner" : null,
    hostName: null, hostAvatarUrl: null, hostUserIds: managed ? ["owner"] : [], hostProfiles: [],
    ownership: {state: managed ? "claimed" : "programmatic", ownerUserId: managed ? "owner" : null,
      primaryHostUserId: managed ? "owner" : null, hostUserIds: managed ? ["owner"] : [],
      claimedAt: null, claimedByUid: null},
    claim: {state: managed ? "claimed" : "unclaimed",
      claimHref: "/organizers/synthetic-host/#claim", lastClaimRequestId: null},
    publicPage: {slug: "synthetic-host", citySlug: "indore", canonicalPath: "/organizers/synthetic-host/",
      publishStatus: "published", indexStatus: "indexReady", robots: "index, follow",
      seoTitle: null, seoDescription: null, lastRenderedAt: null}});
  return data;
}
function harness(data) {
  const docs = new Map([["organizers/synthetic-auto-id", data]]);
  let autoId = 0;
  const snapshot = (key) => ({exists: docs.has(key), data: () => docs.get(key)});
  const ref = (key) => ({path: key, id: key.split("/").pop(),
    get: async () => snapshot(key), collection: (name) => collection(`${key}/${name}`)});
  function collection(key) {
    return {doc: (id = `auto-${++autoId}`) => ref(`${key}/${id}`),
      where: (field, op, value) => {
        assert.equal(op, "==");
        const query = {orderBy: () => query, limit: () => query,
          get: async () => ({docs: [...docs].filter(([k, data]) =>
            k.startsWith(`${key}/`) && data[field] === value).map(([k, data]) =>
            ({id: k.split("/").pop(), data: () => data}))})};
        return query;
      }};
  }
  const db = {collection, runTransaction: async (run) => {
    const writes = [];
    const set = (target, value, options) => writes.push(() => docs.set(target.path,
      options?.merge ? {...docs.get(target.path), ...value} : value));
    const result = await run({get: async (target) => {
      assert.equal(writes.length, 0, "transaction reads precede writes");
      return snapshot(target.path);
    }, set, create: (target, value) => {
      assert.equal(docs.has(target.path), false); set(target, value);
    }, update: (target, value) => set(target, value, {merge: true})});
    writes.forEach((write) => write());
    return result;
  }};
  const rates = [];
  return {docs, rates, deps: {firestore: () => db,
    serverTimestamp: () => ({_seconds: 1788803200, _nanoseconds: 0}),
    checkRateLimit: async (_db, uid, action) => rates.push({uid, action}),
    checkIpRateLimit: () => true}};
}
function request(data, uid = "synthetic-user", token = {}) {
  return {data, auth: uid ? {uid, token} : undefined,
    rawRequest: {ip: "127.0.0.1", headers: {}}};
}

test("canonical projection -> authenticated claim -> pending review, with approval guards intact", async () => {
  const data = organizer();
  const h = harness(data);
  const listing = await project(data);
  assert.equal(listing.capabilities.claimRequest.state, "enabled");
  const payload = {organizerId: listing.id, requesterName: "Synthetic Owner", requesterRole: "owner",
    businessEmail: "owner@example.test", businessPhone: null,
    proofUrls: ["https://example.test/ownership-proof"], message: "Synthetic review proof"};
  await assert.rejects(requestOrganizerClaimHandler(request(payload, null), h.deps),
    {code: "unauthenticated"});
  const result = await requestOrganizerClaimHandler(request(payload), h.deps);
  assert.equal(result.status, "pending");
  const claim = h.docs.get(`organizerClaimRequests/${result.requestId}`);
  assert.equal(claim.organizerId, listing.id);
  assert.deepEqual(claim.proofUrls, payload.proofUrls);
  assert.equal(h.docs.get(`organizers/${listing.id}`).ownerUserId, null);
  assert.equal((await project(h.docs.get(`organizers/${listing.id}`)))
    .capabilities.claimRequest.state, "disabled");
  assert.deepEqual(await requestOrganizerClaimHandler(request(payload), h.deps), result);
  const decision = {requestId: result.requestId, decision: "approve"};
  await assert.rejects(adminDecideOrganizerClaimHandler(request(decision), h.deps),
    {code: "permission-denied"});
  h.docs.set("users/synthetic-user", {name: "Synthetic Owner", profileComplete: false});
  await assert.rejects(adminDecideOrganizerClaimHandler(
    request(decision, "reviewer", {admin: true}), h.deps), {code: "failed-precondition"});
  assert.equal(h.docs.get(`organizers/${listing.id}`).ownerUserId, null);
  assert.equal(h.rates.some(({action}) => action === "requestOrganizerClaim"), true);
});

test("enabled canonical review target -> moderated submission -> public list, without attendance verification", async () => {
  const data = organizer(true);
  const h = harness(data);
  const listing = await project(data);
  assert.equal(listing.capabilities.claimRequest.state, "disabled");
  assert.equal(listing.capabilities.publicReviews.readState, "enabled");
  assert.equal(listing.capabilities.publicReviews.writeState, "enabled");
  const payload = {organizerId: listing.id, rating: 4, reviewerName: "Synthetic reviewer",
    isAnonymous: false, comment: "A friendly synthetic event.", submittedFromPath: listing.path};
  const published = await createPublicOrganizerReviewHandler(request(payload), h.deps);
  assert.equal(published.review.verificationStatus, "unverified");
  assert.equal(published.review.source, "publicListing");
  const held = await createPublicOrganizerReviewHandler(request({...payload,
    comment: "just kill yourself please"}), h.deps);
  assert.equal(held.review.moderationStatus, "pending");
  const listed = await listPublicOrganizerReviewsHandler(request({organizerId: listing.id}), h.deps);
  assert.deepEqual(listed.reviews.map(({id}) => id), [published.reviewId]);
  await assert.rejects(createPublicOrganizerReviewHandler(request({...payload,
    submittedFromPath: "/organizers/other-host/"}), h.deps), {code: "invalid-argument"});
  h.docs.set("users/synthetic-user", {name: "Synthetic User"});
  h.docs.set("events/synthetic-event", {organizerId: listing.id});
  await assert.rejects(createEventReviewHandler(request({organizerId: listing.id,
    eventId: "synthetic-event", rating: 5, comment: "Identity is not attendance."}), h.deps),
  {code: "failed-precondition"});
});

test("legacy clubs-only document cannot satisfy current canonical callables", async () => {
  const h = harness(organizer());
  h.docs.set("clubs/synthetic-auto-id", h.docs.get("organizers/synthetic-auto-id"));
  h.docs.delete("organizers/synthetic-auto-id");
  await assert.rejects(requestOrganizerClaimHandler(request({organizerId: "synthetic-auto-id",
    requesterName: "Synthetic Owner", requesterRole: "owner"}), h.deps), {code: "not-found"});
  await assert.rejects(listPublicOrganizerReviewsHandler(request({organizerId: "synthetic-auto-id"}),
    h.deps), {code: "not-found"});
});

test("source changes do not relax live App Check enforcement", () => {
  assert.equal(enforceAppCheckForRuntime({GCLOUD_PROJECT: "catchdates-staging"}), true);
  assert.equal(enforceAppCheckForRuntime({FUNCTIONS_EMULATOR: "true",
    GCLOUD_PROJECT: "catchdates-staging"}), true);
});
