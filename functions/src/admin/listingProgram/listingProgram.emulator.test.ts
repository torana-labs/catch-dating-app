/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {FieldValue, type Firestore} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import type {OperationRun, OperationWorkItem} from "../../operations/models";
import type {ProjectionImportWriter} from "../../operations/projectionImporter";
import {FakeFirestore} from "../../operations/testFirestore";
import {acceptPageFetch, notFoundTransport} from "../../operations/supplyIntake/testPageFetch";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "../../operations/supplyIntake/worker";
import {adminNominateOrganizerHandler} from "../../operations/supplyIntake/nominations";
import {adminApproveOrganizerListingHandler} from "../organizerListingApproval";
import {discoveryFormatsForText} from "../../domain/discovery/discoveryFormats";
import {adminManageListingProgramHandler} from "./settings";

// The programmatic listings approval path against the real Firestore
// emulator, where a transaction must read everything before it writes:
// approval writes the reviewer's formats and the cohort tag and opens no
// Sales records; the pause switch refuses nomination and approval alike.
// Fictional organisers on reserved .example domains only.

execFileSync(process.execPath, [path.join(__dirname, "../../../scripts/copy-operations-runtime.cjs")]);

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const NOW = new Date("2026-11-19T08:00:00.000Z");

class MemoryWriter implements ProjectionImportWriter {
  readonly runs = new Map<string, OperationRun>();
  readonly items = new Map<string, OperationWorkItem>();
  async getRun(runId: string) {
    return this.runs.get(runId) ?? null;
  }
  async getWorkItems(ids: string[]) {
    return new Map(ids.flatMap((id) => this.items.has(id) ? [[id, this.items.get(id)!] as const] : []));
  }
  async createWorkItems(items: OperationWorkItem[]) {
    for (const item of items) this.items.set(item.workItemId, item);
  }
  async createRun(run: OperationRun) {
    this.runs.set(run.runId, run);
  }
}

const callable = (uid: string, token: Record<string, unknown>, data: Record<string, unknown>) =>
  ({auth: {uid, token}, data, rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>;

/** Builds one nominated listing with the real worker, then stores its request and work item in the emulator. */
async function seedListing(db: Firestore, suffix: string) {
  const fake = new FakeFirestore();
  const requestId = `nom-lantern-${suffix}`;
  fake.write(`${supplyIntakeCollections.requests}/${requestId}`, {schemaVersion: 1, requestId,
    request: {schemaVersion: 1, requestId, kind: "nomination", market: "indore",
      seed: {name: "Lantern Trail Runners", urls: ["https://lantern-trail.example/runs"], notes: null, categories: ["run_clubs"]},
      submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: NOW.toISOString(),
      origin: {kind: "admin_nomination", id: `nomination-${suffix}`}},
    status: "queued", attempts: 0, leaseUntil: null, result: null, failure: null, approval: null,
    createdAt: NOW.toISOString(), updatedAt: NOW.toISOString()});
  acceptPageFetch(fake);
  const writer = new MemoryWriter();
  const outcome = await processSupplyIntakeRequest({db: fake as unknown as Firestore, now: () => NOW,
    projectionWriter: writer, transport: notFoundTransport, putSnapshot: async () => "supply-intake/snapshots/x.json"}, requestId);
  assert.equal(outcome, "completed");
  const stored = fake.read(`${supplyIntakeCollections.requests}/${requestId}`) as {result: {listingWorkItemId: string}};
  const workItem = structuredClone(writer.items.get(stored.result.listingWorkItemId)!);
  const listing = (workItem.normalizedPayload.intake as {listing: Record<string, any>}).listing; // eslint-disable-line @typescript-eslint/no-explicit-any
  listing.organizer.description = "Sunday runs around the lake for people who would rather meet in person.";
  listing.organizer.links = [{platform: "luma", surfaceKind: "calendar", url: "https://lantern-trail.example/runs",
    normalizedKey: "lantern-trail.example/runs", evidenceUrl: "https://lantern-trail.example/runs"}];
  await db.collection(supplyIntakeCollections.requests).doc(requestId).set(JSON.parse(JSON.stringify(stored)));
  await db.collection("operationWorkItems").doc(workItem.workItemId).set(JSON.parse(JSON.stringify(workItem)));
  return {requestId, workItemId: workItem.workItemId, contentHash: String(listing.contentHash)};
}

test("approval writes formats and the cohort, and the pause refuses nomination and approval",
  {skip: !emulator}, async () => {
    const suffix = Date.now().toString();
    const app = initializeApp({projectId: "demo-catch-listing-program"}, `listing-program-${suffix}`);
    const db = getEmulatorFirestore(app);
    const approvalDeps = {firestore: () => db, serverTimestamp: () => FieldValue.serverTimestamp(), now: () => NOW};
    const nominationDeps = {...approvalDeps};
    const programDeps = {firestore: () => db, now: () => NOW.getTime()};
    const approve = (listing: {workItemId: string; contentHash: string}, slug: string) =>
      adminApproveOrganizerListingHandler(callable("admin-1", {admin: true}, {requestId: `approve-${slug}`,
        listingWorkItemId: listing.workItemId, contentHash: listing.contentHash, name: "Lantern Trail Runners",
        publicSlug: slug, marketId: "in-mp-indore", organizerType: "club",
        checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
          marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true, claimTargetReviewed: true,
          takedownPathReviewed: true, impersonationReviewed: true, cityEvidenceReviewed: true, formatsReviewed: true,
          datingFramingReviewed: true, personalDataReviewed: true},
        formats: ["runClubs"], cohortId: "pilot-indore-1", note: "Checked the calendar and the city from its events."}),
      approvalDeps);
    const nominate = (id: string) => adminNominateOrganizerHandler(callable("associate-1", {salesStaff: true}, {
      requestId: id, name: "Orchard Quiz Society", market: "Indore", urls: ["https://orchard-quiz.example"],
      notes: null, categories: [], formats: ["quizNights"]}), nominationDeps);
    const flip = (paused: boolean, expectedRevision: number) => adminManageListingProgramHandler(callable("owner-1",
      {adminOwner: true}, {action: "set_pause", paused, reason: paused ? "Emulator pause for the kill-switch test." :
        "Emulator resume after the kill-switch test.", expectedRevision}), programDeps);
    try {
      // Running: approval writes the reviewer's formats and the cohort, and no Sales records.
      const first = await seedListing(db, `${suffix}-a`);
      const approved = await approve(first, `lantern-trail-${suffix}`);
      const organizer = (await db.collection("organizers").doc(approved.organizerId).get()).data()!;
      assert.deepEqual(organizer.publicProfile.formats, ["Run clubs"]);
      assert.equal(organizer.publicCategoryLabel, "Run clubs");
      assert.deepEqual(discoveryFormatsForText([organizer.publicCategoryLabel, ...organizer.publicProfile.formats]), ["runClubs"]);
      assert.equal(organizer.listingProgram.cohortId, "pilot-indore-1");
      assert.equal(organizer.listingProgram.approvedAt.toDate().toISOString(), NOW.toISOString());
      assert.equal((await db.collection("organizerSalesAccounts").doc(approved.organizerId).get()).exists, false);
      const queued = await nominate(`nomination-${suffix}-ok`);
      const request = (await db.collection(supplyIntakeCollections.requests).doc(queued.requestId).get()).data()!;
      assert.deepEqual(request.request.seed.categories, ["quiz_nights"]);

      // Paused: both refuse and write nothing.
      const state = await adminManageListingProgramHandler(callable("owner-1", {adminOwner: true}, {action: "read"}), programDeps);
      const paused = await flip(true, state.revision);
      assert.equal(paused.paused, true);
      await assert.rejects(nominate(`nomination-${suffix}-paused`), /Programmatic listings are paused.*Nothing was queued/);
      const second = await seedListing(db, `${suffix}-b`);
      await assert.rejects(approve(second, `lantern-trail-b-${suffix}`), /Programmatic listings are paused.*Nothing was published/);
      const secondRequest = (await db.collection(supplyIntakeCollections.requests).doc(second.requestId).get()).data()!;
      assert.equal(secondRequest.approval, null, "the paused approval recorded nothing");

      // Resumed: the held listing approves.
      await flip(false, paused.revision);
      assert.equal((await approve(second, `lantern-trail-b-${suffix}`)).created, true);
    } finally {
      await db.collection("listingProgramSettings").doc("platform").delete();
      await deleteApp(app);
    }
  });
