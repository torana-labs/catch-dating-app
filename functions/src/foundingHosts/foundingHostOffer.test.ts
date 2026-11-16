import assert from "node:assert/strict";
import test from "node:test";
import {validatePublicFoundingHostOfferDocument} from
  "../shared/generated/validators/publicFoundingHostOfferDocument";
import {
  decideFoundingPlace,
  foundingOfferStatus,
  organizerHasOwner,
  publicFoundingOffer,
  type FoundingHostOffer,
} from "./foundingHostOffer";

const opened = 1_000_000;
const offer = (patch: Partial<FoundingHostOffer> = {}): FoundingHostOffer => ({
  schemaVersion: 1, marketId: "in-mh-mumbai", revision: 1, cap: 50,
  endsAtMillis: null, trialDays: 90, takenCount: 0, openedAtMillis: opened,
  lastPlaceAtMillis: null, reason: "Owner decision", updatedByUid: "owner",
  updatedAtMillis: opened, ...patch});
type DecisionInput = Parameters<typeof decideFoundingPlace>[0];
const input = (patch: Partial<DecisionInput> = {}): DecisionInput => ({
  placeExists: false, owned: true, synthetic: false, marketKnown: true,
  offer: offer(),
  ownedAtMillis: opened + 1, trialStarted: false, ...patch});

test("an owned organizer takes the next place while places are left", () => {
  assert.deepEqual(decideFoundingPlace(input()),
    {kind: "grant", placeNumber: 1});
  assert.deepEqual(decideFoundingPlace(input({
    offer: offer({takenCount: 49})})), {kind: "grant", placeNumber: 50});
});

test("place 51 is sold out; a held place replays as held", () => {
  assert.deepEqual(decideFoundingPlace(input({offer: offer({takenCount: 50})})),
    {kind: "skip", reason: "soldOut"});
  // A retry of a grant that committed never takes a second place, even when
  // the city has sold out since.
  assert.deepEqual(decideFoundingPlace(input({placeExists: true,
    offer: offer({takenCount: 50})})), {kind: "skip", reason: "alreadyHeld"});
});

test("the deadline is judged when the organizer gained its owner", () => {
  const endsAtMillis = opened + 100;
  assert.deepEqual(decideFoundingPlace(input({ownedAtMillis: endsAtMillis - 1,
    offer: offer({endsAtMillis})})), {kind: "grant", placeNumber: 1});
  assert.deepEqual(decideFoundingPlace(input({ownedAtMillis: endsAtMillis,
    offer: offer({endsAtMillis})})), {kind: "skip", reason: "closed"});
});

test("organizers owned before the offer, outside it or already trading " +
  "get the standard trial", () => {
  assert.equal(decideFoundingPlace(input({ownedAtMillis: opened - 1})).kind,
    "skip");
  assert.deepEqual(decideFoundingPlace(input({ownedAtMillis: opened - 1})),
    {kind: "skip", reason: "ownedBeforeOffer"});
  assert.deepEqual(decideFoundingPlace(input({offer: null})),
    {kind: "skip", reason: "noOffer"});
  assert.deepEqual(decideFoundingPlace(input({marketKnown: false})),
    {kind: "skip", reason: "unknownMarket"});
  assert.deepEqual(decideFoundingPlace(input({owned: false})),
    {kind: "skip", reason: "notOwned"});
  assert.deepEqual(decideFoundingPlace(input({synthetic: true})),
    {kind: "skip", reason: "synthetic"});
  assert.deepEqual(decideFoundingPlace(input({trialStarted: true})),
    {kind: "skip", reason: "trialStarted"});
});

test("ownership matches the growth facts' claimed step", () => {
  for (const state of ["userCreated", "claimed", "transferred"]) {
    assert.equal(organizerHasOwner({ownership: {state}}), true);
  }
  for (const organizer of [undefined, {}, {ownership: {state: "unclaimed"}},
    {ownership: {state: "imported"}}, {ownership: "claimed"}]) {
    assert.equal(organizerHasOwner(organizer), false);
  }
});

test("the public projection is counts only and states sold out and closed",
  () => {
    const open = publicFoundingOffer(offer({takenCount: 12}), "mumbai", 5);
    assert.ok(validatePublicFoundingHostOfferDocument(open));
    assert.deepEqual(open, {schemaVersion: 1, marketId: "in-mh-mumbai",
      citySlug: "mumbai", status: "open", cap: 50, placesLeft: 38,
      trialDays: 90, endsAtMillis: null, updatedAtMillis: 5});
    assert.equal(publicFoundingOffer(offer({takenCount: 50}), "mumbai", 5)
      .status, "soldOut");
    // A cap the owner lowered to the places taken shows none left.
    assert.equal(publicFoundingOffer(offer({cap: 10, takenCount: 10}),
      "mumbai", 5).placesLeft, 0);
    assert.equal(foundingOfferStatus(offer({endsAtMillis: 5}), 5), "closed");
    assert.equal(foundingOfferStatus(offer({endsAtMillis: 6}), 5), "open");
  });
