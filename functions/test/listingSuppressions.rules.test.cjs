const fs = require("node:fs");
const path = require("node:path");
const {before, after, describe, it} = require("node:test");
const {initializeTestEnvironment, assertFails} =
  require("@firebase/rules-unit-testing");
const {
  collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where,
} = require("firebase/firestore");

// The do-not-list registry holds only keyed hashes, but even those confirm
// whether a guessed organizer is suppressed, so no client identity, including
// staff with admin claims, reads or writes it. The takedown tool and Functions
// use the Admin SDK.
const record = {
  schemaVersion: 1,
  caseId: "TD-0042",
  reason: "removeAndDoNotList",
  active: true,
  hashScheme: "hmac-sha256/listing-suppression-v1",
  identityHashes: ["0".repeat(64), "f".repeat(64)],
  identityKeyCounts: {labels: 1, links: 1, organizers: 0, slugs: 0},
  createdAtMillis: 1795000000000,
  updatedAtMillis: 1795000000000,
  reviewAtMillis: 1889608000000,
  createdBy: "workflow:organizer-takedown",
  blockedIntakeCount: 0,
  lastBlockedAtMillis: null,
  reviewFlags: [],
};
let env;

describe("listing suppressions", () => {
  before(async () => {
    const address = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080")
      .split(":");
    env = await initializeTestEnvironment({
      projectId: "demo-catch-listing-suppressions",
      firestore: {host: address[0], port: Number(address[1]),
        rules: fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"),
          "utf8")},
    });
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "listingSuppressions/TD-0042"),
        record);
    });
  });

  after(async () => {
    await env?.cleanup();
  });

  it("keeps the listing suppression registry server-only", async () => {
    for (const db of [
      env.unauthenticatedContext().firestore(),
      env.authenticatedContext("member-1").firestore(),
      env.authenticatedContext("host-1", {host: true}).firestore(),
      env.authenticatedContext("staff-1", {admin: true}).firestore(),
      env.authenticatedContext("owner-1", {adminOwner: true}).firestore(),
    ]) {
      const ref = doc(db, "listingSuppressions", "TD-0042");
      await assertFails(getDoc(ref));
      await assertFails(getDocs(collection(db, "listingSuppressions")));
      await assertFails(getDocs(query(collection(db, "listingSuppressions"),
        where("identityHashes", "array-contains", "0".repeat(64)))));
      await assertFails(updateDoc(ref, {active: false}));
      await assertFails(deleteDoc(ref));
      await assertFails(setDoc(doc(db, "listingSuppressions", "TD-0043"),
        {...record, caseId: "TD-0043"}));
    }
  });
});
