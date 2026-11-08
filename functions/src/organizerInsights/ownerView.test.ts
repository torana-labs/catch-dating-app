import test from "node:test";
import assert from "node:assert/strict";
import {getOrganizerOwnerViewHandler, insightsWindow} from "./ownerView";
import {
  ownerViewOrganizer,
  ownerViewRequest,
  ownerViewTestStore,
} from "./ownerViewTestStore";

const now = new Date("2026-11-08T06:00:00Z");

function store() {
  return ownerViewTestStore({
    "organizers/org-1": ownerViewOrganizer(),
    "organizerInsights/org-1_20261107": {organizerId: "org-1",
      date: "2026-11-07", visits: 12, linkClicks: 4, bookingClicks: 2,
      newFollowers: 1, sources: [{source: "instagram", clicks: 4}],
      links: [{linkId: "tickets", clicks: 4}], computedAtMillis: 1},
    "organizerInsights/org-1_20261101": {organizerId: "org-1",
      date: "2026-11-01", visits: 3, linkClicks: 1, bookingClicks: 0,
      newFollowers: 0, sources: [{source: "qr", clicks: 1}],
      links: [{linkId: "tickets", clicks: 1}], computedAtMillis: 1},
    // Another organiser's document under a forged id is never counted.
    "organizerInsights/org-1_20261106": {organizerId: "org-2",
      date: "2026-11-06", visits: 900, linkClicks: 0, bookingClicks: 0,
      newFollowers: 0, sources: [], links: [], computedAtMillis: 1},
    "organizerFollowerMessageQuotas/org-1_202611": {organizerId: "org-1",
      month: "2026-11", requestIds: ["r1"], updatedAtMillis: 1},
  });
}

test("the window is 30 whole days ending yesterday, missing days zero", () => {
  const window = insightsWindow(now, []);
  assert.equal(window.days.length, 30);
  assert.equal(window.startDate, "2026-10-09");
  assert.equal(window.endDate, "2026-11-07");
  assert.equal(window.updatedThrough, null);
  assert.deepEqual(window.totals, {visits: 0, linkClicks: 0,
    bookingClicks: 0, newFollowers: 0});
});

test("the owner reads insights, links, about and every capability",
  async () => {
    const {db} = store();
    const view = await getOrganizerOwnerViewHandler(ownerViewRequest(
      {organizerId: "org-1"}), {firestore: () => db, now: () => now});
    assert.equal(view.role, "owner");
    assert.deepEqual(view.capabilities, ["insights", "links", "about",
      "photos", "reviews", "messageFollowers", "settings", "openInHost"]);
    assert.deepEqual(view.insights.totals, {visits: 15, linkClicks: 5,
      bookingClicks: 2, newFollowers: 1});
    assert.equal(view.insights.updatedThrough, "2026-11-07");
    assert.deepEqual(view.insights.sources, [{source: "instagram",
      clicks: 4}, {source: "qr", clicks: 1}]);
    assert.deepEqual(view.insights.links, [{linkId: "tickets", clicks: 5}]);
    assert.deepEqual(view.links.map((link) => link.id),
      ["tickets", "community"]);
    assert.equal(view.about, "Trivia on Tuesdays.");
    assert.deepEqual(view.followerMessages,
      {month: "2026-11", limit: 2, used: 1, whatsappAvailable: false});
  });

test("a manager is an editor without about or settings", async () => {
  const {db} = store();
  const view = await getOrganizerOwnerViewHandler(ownerViewRequest(
    {organizerId: "org-1"}, "manager"), {firestore: () => db, now: () => now});
  assert.equal(view.role, "editor");
  assert.equal(view.capabilities.includes("about"), false);
  assert.equal(view.capabilities.includes("settings"), false);
  assert.equal(view.capabilities.includes("links"), true);
});

test("visitors and the signed-out are refused", async () => {
  const {db} = store();
  const deps = {firestore: () => db, now: () => now};
  await assert.rejects(getOrganizerOwnerViewHandler(ownerViewRequest(
    {organizerId: "org-1"}, "visitor"), deps), {code: "permission-denied"});
  await assert.rejects(getOrganizerOwnerViewHandler(ownerViewRequest(
    {organizerId: "org-1"}, ""), deps), {code: "unauthenticated"});
  await assert.rejects(getOrganizerOwnerViewHandler(ownerViewRequest(
    {organizerId: "missing"}), deps), {code: "not-found"});
});
