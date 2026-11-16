import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import {
  foundingHostOwnerPlaceId,
  type FoundingHostOffer,
} from "./foundingHostOffer";
import {takeFoundingHostPlace} from "./foundingHostGrant";

const projectId = "demo-catch-rules";
// Hidden markets no other emulator test uses, so their offers are this
// file's: one per test, because node:test may run them at once.
const marketId = "au-qld-brisbane";
const ownerRaceMarketId = "au-vic-melbourne";

test("concurrent new owners in the Firestore emulator never exceed the cap",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const run = randomUUID().slice(0, 8);
    const app = initializeApp({projectId}, `founding-hosts-${run}`);
    const db = getEmulatorFirestore(app);
    const opened = Date.now() - 1_000;
    const offerRef = db.collection("foundingHostOffers").doc(marketId);
    const offer: FoundingHostOffer = {schemaVersion: 1, marketId, revision: 1,
      cap: 50, endsAtMillis: null, trialDays: 90, takenCount: 44,
      openedAtMillis: opened, lastPlaceAtMillis: null,
      reason: "Emulator race", updatedByUid: "owner",
      updatedAtMillis: opened};
    const ids = Array.from({length: 12}, (_, index) => `${run}-org-${index}`);
    const refs: FirebaseFirestore.DocumentReference[] = [offerRef,
      db.collection("publicFoundingHostOffers").doc(marketId)];
    try {
      await offerRef.set(offer);
      await Promise.all(ids.map((id) => {
        const ref = db.collection("organizers").doc(id);
        refs.push(ref, db.collection("foundingHostPlaces").doc(id),
          db.collection("foundingHostOwnerPlaces").doc(
            foundingHostOwnerPlaceId(`${id}-owner`, marketId)),
          db.collection("commercialTerms").doc(organizerCommercialTermsId(id)),
          db.collection("commercialTermsRevisions")
            .doc(`${organizerCommercialTermsId(id)}_r1`));
        return ref.set({ownership: {state: "userCreated"},
          ownerUserId: `${id}-owner`, locationMarketId: marketId});
      }));

      const results = await Promise.all(ids.map((organizerId) =>
        takeFoundingHostPlace({db, now: Date.now}, {organizerId,
          ownedAtMillis: Date.now(), source: "ownershipTrigger"})));
      const numbers = results.flatMap((result) =>
        result.kind === "grant" ? [result.placeNumber] : []).sort();
      assert.deepEqual(numbers, [45, 46, 47, 48, 49, 50]);
      assert.equal(results.filter((result) => result.kind === "skip" &&
        result.reason === "soldOut").length, 6);
      const stored = (await offerRef.get()).data();
      assert.equal(stored?.takenCount, 50);
      const projection = (await db.collection("publicFoundingHostOffers")
        .doc(marketId).get()).data();
      assert.deepEqual([projection?.status, projection?.placesLeft],
        ["soldOut", 0]);
    } finally {
      await Promise.all(refs.map((ref) => ref.delete()));
      await db.terminate();
      await deleteApp(app);
    }
  });

test("one person's pages raced in the Firestore emulator take one place",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const run = randomUUID().slice(0, 8);
    const app = initializeApp({projectId}, `founding-owner-race-${run}`);
    const db = getEmulatorFirestore(app);
    const opened = Date.now() - 1_000;
    const offerRef = db.collection("foundingHostOffers")
      .doc(ownerRaceMarketId);
    const offer: FoundingHostOffer = {schemaVersion: 1,
      marketId: ownerRaceMarketId, revision: 1, cap: 50, endsAtMillis: null,
      trialDays: 90, takenCount: 0, openedAtMillis: opened,
      lastPlaceAtMillis: null, reason: "Emulator owner race",
      updatedByUid: "owner", updatedAtMillis: opened};
    const ownerUserId = `${run}-priya`;
    const ownerPlaceRef = db.collection("foundingHostOwnerPlaces")
      .doc(foundingHostOwnerPlaceId(ownerUserId, ownerRaceMarketId));
    const ids = Array.from({length: 6}, (_, index) => `${run}-page-${index}`);
    const refs: FirebaseFirestore.DocumentReference[] = [offerRef,
      ownerPlaceRef,
      db.collection("publicFoundingHostOffers").doc(ownerRaceMarketId)];
    try {
      await offerRef.set(offer);
      await Promise.all(ids.map((id) => {
        const ref = db.collection("organizers").doc(id);
        refs.push(ref, db.collection("foundingHostPlaces").doc(id),
          db.collection("commercialTerms").doc(organizerCommercialTermsId(id)),
          db.collection("commercialTermsRevisions")
            .doc(`${organizerCommercialTermsId(id)}_r1`));
        return ref.set({ownership: {state: "userCreated"}, ownerUserId,
          locationMarketId: ownerRaceMarketId});
      }));

      const take = () => Promise.all(ids.map((organizerId) =>
        takeFoundingHostPlace({db, now: Date.now}, {organizerId,
          ownedAtMillis: Date.now(), source: "ownershipTrigger"})));
      const results = await take();
      assert.deepEqual(results.flatMap((result) =>
        result.kind === "grant" ? [result.placeNumber] : []), [1]);
      assert.equal(results.filter((result) => result.kind === "skip" &&
        result.reason === "ownerHoldsPlace").length, ids.length - 1);
      const holder = ids[results.findIndex((result) =>
        result.kind === "grant")];
      assert.equal((await ownerPlaceRef.get()).data()?.organizerId, holder);
      const places = await Promise.all(ids.map((id) =>
        db.collection("foundingHostPlaces").doc(id).get()));
      assert.equal(places.filter((snap) => snap.exists).length, 1);
      assert.equal((await offerRef.get()).data()?.takenCount, 1);
      // Racing every page again is a no-op.
      const retried = await take();
      assert.ok(retried.every((result) => result.kind === "skip"));
      assert.equal((await offerRef.get()).data()?.takenCount, 1);
    } finally {
      await Promise.all(refs.map((ref) => ref.delete()));
      await db.terminate();
      await deleteApp(app);
    }
  });
