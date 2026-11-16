// Firestore rules: the founding-host offer. Shared fixtures and the emulator
// lifecycle live in rulesHarness.cjs.
const {
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  getDoc,
  getDocs,
  it,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

let testEnv;

// sha256(JSON.stringify(["owner-1", "in-mh-mumbai"])), the grant's guard id.
const ownerPlaceId = require("node:crypto").createHash("sha256")
  .update(JSON.stringify(["owner-1", "in-mh-mumbai"])).digest("hex");

const publicOffer = {
  schemaVersion: 1,
  marketId: "in-mh-mumbai",
  citySlug: "mumbai",
  status: "open",
  cap: 50,
  placesLeft: 38,
  trialDays: 90,
  endsAtMillis: null,
  updatedAtMillis: 1763300000000,
};

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("founding-host offer", () => {
    it("lets anyone read the public founding-host counts and nobody write them", async () => {
      await seed(["publicFoundingHostOffers", "in-mh-mumbai"], publicOffer);
      const anonymous = testEnv.unauthenticatedContext().firestore();
      for (const db of [anonymous, authedDb("host-1")]) {
        await assertSucceeds(getDoc(doc(db, "publicFoundingHostOffers", "in-mh-mumbai")));
        await assertSucceeds(getDocs(collection(db, "publicFoundingHostOffers")));
        await assertFails(updateDoc(doc(db, "publicFoundingHostOffers", "in-mh-mumbai"), {placesLeft: 50}));
        await assertFails(setDoc(doc(db, "publicFoundingHostOffers", "in-mp-indore"), {...publicOffer,
          marketId: "in-mp-indore", citySlug: "indore"}));
        await assertFails(deleteDoc(doc(db, "publicFoundingHostOffers", "in-mh-mumbai")));
      }
    });

    it("keeps the founding-host offer config, organizer places and owner guards server-only", async () => {
      await seed(["foundingHostOffers", "in-mh-mumbai"], {schemaVersion: 1, marketId: "in-mh-mumbai",
        cap: 50, takenCount: 12});
      await seed(["foundingHostPlaces", "organizer-1"], {schemaVersion: 1, organizerId: "organizer-1",
        marketId: "in-mh-mumbai", placeNumber: 12});
      await seed(["foundingHostOwnerPlaces", ownerPlaceId], {schemaVersion: 1, ownerUserId: "owner-1",
        marketId: "in-mh-mumbai", organizerId: "organizer-1", placeNumber: 12});
      const anonymous = testEnv.unauthenticatedContext().firestore();
      for (const db of [anonymous, authedDb("owner-1")]) {
        for (const [collectionName, id] of [["foundingHostOffers", "in-mh-mumbai"],
          ["foundingHostPlaces", "organizer-1"], ["foundingHostOwnerPlaces", ownerPlaceId]]) {
          await assertFails(getDoc(doc(db, collectionName, id)));
          await assertFails(getDocs(collection(db, collectionName)));
          await assertFails(updateDoc(doc(db, collectionName, id), {schemaVersion: 2}));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {schemaVersion: 1}));
          await assertFails(deleteDoc(doc(db, collectionName, id)));
        }
      }
    });
  });
});
