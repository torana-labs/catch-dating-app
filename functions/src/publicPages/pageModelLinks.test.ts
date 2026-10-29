import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {validateOrganizerPublicPageDocument} from
  "../shared/generated/validators/organizerPublicPageDocument";
import {buildOrganizerScope, contentHash} from "./pageModel";
import {parityCase, parityInputs} from "./publicPageTestFixtures";

const inputs = parityInputs();
const parity = parityCase(
  "unclaimed organizer with every event and review variant");

function link(id: string, overrides: Record<string, unknown> = {}) {
  return {id, label: `Link ${id}`, subtitle: null,
    url: `https://example.org/${id}`, icon: null, pinned: false,
    showUntil: null, ...overrides};
}

function pageWith(ownerLinks: unknown[]) {
  const pages = buildOrganizerScope({
    organizerId: parity.organizer.id,
    organizer: {id: parity.organizer.id,
      data: {...parity.organizer.data, ownerLinks}},
    pathConflict: false,
    catchEvents: [],
    externalEvents: [],
    ambiguousEventIds: new Set(),
    reviews: [],
    reviewCounts: {count: 0, verifiedCount: 0, verifiedAverage: null,
      distribution: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}},
    recommendationCandidates: [],
    liveMarkets: new Set(inputs.liveMarkets),
    now: inputs.now,
  });
  assert(pages.organizerPage);
  return pages.organizerPage;
}

test("organizer pages carry the owner's live links, pinned first", () => {
  const page = pageWith([
    link("tickets", {label: "Tickets", subtitle: "Sunday runs",
      icon: "tickets"}),
    link("ended", {pinned: true,
      showUntil: Timestamp.fromMillis(inputs.now - 1)}),
    link("drop", {pinned: true,
      showUntil: Timestamp.fromMillis(inputs.now + 86_400_000)}),
  ]);
  assert.deepEqual(page.links.map((item) => item.id), ["drop", "tickets"]);
  assert.deepEqual(page.links[1], {id: "tickets", label: "Tickets",
    subtitle: "Sunday runs", url: "https://example.org/tickets",
    icon: "tickets", pinned: false, showUntil: null});
  const stored = {...page, contentHash: contentHash(page),
    builtAt: {_seconds: Math.floor(inputs.now / 1000), _nanoseconds: 0}};
  assert.equal(validateOrganizerPublicPageDocument(
    JSON.parse(JSON.stringify(stored))), true,
  JSON.stringify(validateOrganizerPublicPageDocument.errors));
});

test("a link leaves the page at its show-until time", () => {
  const live = pageWith([link("drop", {
    showUntil: Timestamp.fromMillis(inputs.now + 1)})]);
  const lapsed = pageWith([link("drop", {
    showUntil: Timestamp.fromMillis(inputs.now)})]);
  assert.equal(live.links.length, 1);
  assert.deepEqual(lapsed.links, []);
});
