/* eslint-disable max-len */
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {createSupplyIntakeRequest, requestFromSalesInboundIntent} from "../operations/supplyIntake/requests";
import {LISTING_SUPPRESSIONS, suppressionModule} from "./registry";

// The do-not-list lookup against the real Firestore emulator: the
// array-contains-any query inside the intake transaction, the refusal count
// written in the same transaction, and an unrelated request still queued.
// Fictional organisers on reserved .example domains only.

execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const SECRET = "emulator-only-listing-suppression-key-0123456789abcdef";

test("intake refuses a suppressed organiser and queues others, in one transaction each",
  {skip: !emulator}, async () => {
    process.env.LISTING_SUPPRESSION_HMAC_KEY = SECRET;
    const suffix = Date.now().toString();
    const app = initializeApp({projectId: "demo-catch-listing-suppressions"}, `suppression-${suffix}`);
    const db = getEmulatorFirestore(app);
    try {
      const module = await suppressionModule();
      const caseId = `TD-${suffix.slice(-4)}`;
      // Many hashes, so the lookup spans more than one 30-value query.
      const keys = module.suppressionKeysForIdentity({names: ["Quarry Lane Cyclists"],
        domains: ["quarry-lane.example"], handles: Array.from({length: 40}, (_, index) => `@moonmoth.quarry${index}`)});
      await db.collection(LISTING_SUPPRESSIONS).doc(caseId).set({schemaVersion: 1, caseId, reason: "trademark",
        active: true, hashScheme: "hmac-sha256/listing-suppression-v1", identityHashes: module.suppressionHashes(SECRET, keys),
        identityKeyCounts: {labels: keys.length, links: 0, organizers: 0, slugs: 0}, createdAtMillis: 1, updatedAtMillis: 1,
        reviewAtMillis: 2, createdBy: "workflow:organizer-takedown", blockedIntakeCount: 0, lastBlockedAtMillis: null,
        reviewFlags: []});
      const now = new Date();
      const blocked = requestFromSalesInboundIntent(`intent-${suffix}-a`, {hostApplication: {
        organizationName: "Quarry Lane Cyclists", communityLink: "https://quarry-lane.example/rides"}}, now)!;
      const allowed = requestFromSalesInboundIntent(`intent-${suffix}-b`, {hostApplication: {
        organizationName: "Orchard Chess Circle", communityLink: "https://orchard-chess.example"}}, now)!;
      const first = await db.runTransaction((tx) => createSupplyIntakeRequest(tx, db, blocked, now));
      assert.deepEqual(first.suppressed, {caseId, reason: "trademark"});
      assert.equal((await db.collection("supplyIntakeRequests").doc(blocked.requestId).get()).exists, false);
      const second = await db.runTransaction((tx) => createSupplyIntakeRequest(tx, db, allowed, now));
      assert.equal(second.created, true);
      const stored = (await db.collection(LISTING_SUPPRESSIONS).doc(caseId).get()).data();
      assert.equal(stored?.blockedIntakeCount, 1);
      assert.equal(stored?.lastBlockedAtMillis, now.getTime());
    } finally {
      delete process.env.LISTING_SUPPRESSION_HMAC_KEY;
      await deleteApp(app);
    }
  });
