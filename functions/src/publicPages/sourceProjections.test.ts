import assert from "node:assert/strict";
import test from "node:test";
import {parityCase, parityInputs} from "./publicPageTestFixtures";
import {
  catchEventContribution,
  catchEventOrganizerIds,
  externalEventContribution,
  organizerContribution,
  reviewContribution,
} from "./sourceProjections";

const {now, liveMarkets} = parityInputs();
const markets = new Set(liveMarkets);
const parity = parityCase(
  "unclaimed organizer with every event and review variant");
const doc = <T extends {id: string}>(docs: T[], id: string) => {
  const found = docs.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

test("follows and private organizer fields never rebuild pages", () => {
  const {id, data} = parity.organizer;
  const before = organizerContribution(id, data, markets);
  assert(before);
  assert.equal(organizerContribution(id, {...data, followerCount: 900},
    markets), before);
  assert.equal(organizerContribution(id, {...data,
    email: "changed@example.test"}, markets), before);
  assert.notEqual(organizerContribution(id, {...data, name: "Renamed"},
    markets), before);
  assert.equal(organizerContribution(id, {...data,
    claim: {state: "suppressed"}}, markets), null);
  // An organizer that is not public contributes nothing either way.
  const draft = parityCase("draft page").organizer;
  assert.equal(organizerContribution(draft.id, draft.data, markets),
    organizerContribution(draft.id, {...draft.data, name: "Edited"},
      markets));
});

test("bookings and public event edits rebuild; private fields do not", () => {
  const {id, data} = doc(parity.catchEvents, "open-upcoming");
  const before = catchEventContribution(id, data, now);
  assert(before);
  assert.equal(catchEventContribution(id, {...data,
    genderCounts: {men: 3}}, now), before);
  assert.notEqual(catchEventContribution(id, {...data, bookedCount: 5}, now),
    before);
  assert.equal(catchEventContribution(id, {...data,
    publicationState: "unpublished"}, now), null);
  assert.deepEqual(catchEventOrganizerIds({organizerId: "a"},
    {organizerId: "b", clubId: "b"}), ["a", "b"]);
});

test("imported event takedowns rebuild their organizer's pages", () => {
  const {id, data} = doc(parity.externalEvents, "ext-public");
  assert(externalEventContribution(id, data));
  assert.equal(externalEventContribution(id, {...data,
    publicationStatus: "takenDown"}), null);
});

test("review moderation and edits rebuild; unrelated fields do not", () => {
  const {id, data} = doc(parity.reviews, "review-verified");
  const before = reviewContribution(id, data);
  assert.equal(reviewContribution(id, {...data,
    reviewerUserId: "someone"}), before);
  assert.notEqual(reviewContribution(id, {...data, comment: "Edited."}),
    before);
  assert.notEqual(reviewContribution(id, {...data,
    moderationStatus: "removed"}), before);
  assert.equal(reviewContribution(id, undefined), null);
});
