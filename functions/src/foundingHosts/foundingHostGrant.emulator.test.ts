import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {organizerCommercialTermsId} from "../commercialTerms/terms";
import type {FoundingHostOffer} from "./foundingHostOffer";
import {takeFoundingHostPlace} from "./foundingHostGrant";

const projectId = "demo-catch-rules";
// A hidden market no other emulator test uses, so its offer is this test's.
const marketId = "au-qld-brisbane";

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
          db.collection("commercialTerms").doc(organizerCommercialTermsId(id)),
          db.collection("commercialTermsRevisions")
            .doc(`${organizerCommercialTermsId(id)}_r1`));
        return ref.set({ownership: {state: "userCreated"},
          locationMarketId: marketId});
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
