/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {ensureTryItWorkspaceHandler} from "../commands/ensureTryItWorkspace";
import {importOrganizerFromLinkHandler} from "../commands/importOrganizerFromLink";
import {tryItWorkspaceOrganizerId} from "../commands/workspace";
import type {OperationRun, OperationWorkItem} from "../operations/models";
import {importShadowProjection, type ProjectionImportWriter} from "../operations/projectionImporter";
import {FakeFirestore} from "../operations/testFirestore";
import {packagedIntake, runSupplyIntake, type SupplyIntakeRequest} from "../operations/supplyIntake/runtime";
import {packagedEventPublication, publishListingEvents, type EventPublicationPolicy} from "../operations/supplyIntake/eventPublication";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {publishImportedEventsOnOwnerPublish} from "./publishOnClaim";

// The build post-step copies the Operations runtime into lib; the publisher uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-10-20T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1792483200, _nanoseconds: 0};
const CALENDAR = "https://luma.com/bytebanyan";
const PAGES = path.resolve(__dirname, "../../../operations/src/workflows/supply-intake/fixtures/pages");
const OWNER = "owner-1";
const KEY = "import-request-0001";

const validateExternalEvent = contractValidator("ExternalEventDocument");
const valid = (validate: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) =>
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);

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

const call = (data: unknown) => ({data, auth: {uid: OWNER, token: {phone_number: "+919000000001"}},
  rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>);
const envelope = (mode: "preview" | "apply", extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: {link: CALENDAR}, ...extra});

/**
 * A visitor makes a try-it workspace and imports a public Luma calendar into
 * it (organizer.import-from-link): the real Supply Intake runtime reads the
 * saved calendar page, and the owner applies the preview. Events are
 * published under auto-publish mode, so a test proves the owner's publish,
 * not a paused policy, decides when they go live.
 */
async function appliedImport(verification: "unverified" | "verified") {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const now = () => new Date(NOW);
  const runtime = await packagedEventPublication();
  const autoPublish = {...await runtime.loadEventPublicationPolicy(), mode: runtime.AUTO_PUBLISH_MODE} as EventPublicationPolicy;
  const deps = {firestore: () => firestore, now, serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: () => SERVER_TIME, checkRateLimit: (async () => undefined) as never,
    loadEventPublicationPolicy: async () => autoPublish};
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Byte Banyan", marketId: "in-mh-mumbai"}}), deps as never);
  assert.equal((await importOrganizerFromLinkHandler(call(envelope("preview")), deps as never)).status, "running");

  // The Supply Intake worker reads the link and records the listing it built.
  const requestPath = db.entries().find(([key]) => key.startsWith(`${supplyIntakeCollections.requests}/`))![0];
  const queued = db.read(requestPath)!;
  const intake = await packagedIntake();
  const pageSource = new intake.StaticPageSource({pages: {[CALENDAR]: fs.readFileSync(path.join(PAGES, "luma-organizer.html"),
    "utf8")}, policy: await intake.loadSupplyAcquisitionPolicy(), clock: now});
  const result = await runSupplyIntake({request: queued.request as SupplyIntakeRequest, pageSource, now});
  const writer = new MemoryWriter();
  await importShadowProjection({input: result.projection, apply: true, writer});
  for (const item of writer.items.values()) db.write(`operationWorkItems/${item.workItemId}`, item as unknown as Record<string, unknown>);
  db.write(requestPath, {...queued, status: "completed", attempts: 1, result: {runId: result.runId,
    listingId: result.listing.listingId, listingWorkItemId: result.listingWorkItemId, eventWorkItemIds: result.eventWorkItemIds,
    listingContentHash: result.listing.contentHash, gaps: [], researchNeeded: false, eventCount: result.eventWorkItemIds.length,
    stoppedReason: null, artifactHash: "a".repeat(64), snapshotRefs: [], captureReceipts: [],
    duplicateCheck: {policyId: "organizer-match-v1", authority: "advisory", verdict: "none", reasons: [], organizersCompared: 0,
      inventoryHash: "c".repeat(64), inventory: {citySlug: "mumbai", limit: 500, truncated: false}, candidates: []}}});
  assert.ok(result.eventWorkItemIds.length > 0, "the saved calendar lists at least one event");

  const preview = await importOrganizerFromLinkHandler(call(envelope("preview")), deps as never);
  assert.equal(preview.status, "previewed", JSON.stringify(preview.result));
  const applied = await importOrganizerFromLinkHandler(call(envelope("apply", {confirm: {commandId: "organizer.import-from-link",
    previewHash: preview.previewHash}})), deps as never);
  assert.equal(applied.status, "applied");

  const organizerId = tryItWorkspaceOrganizerId(OWNER, 1);
  const imported = db.read(`organizers/${organizerId}`)!;
  assert.equal((imported.importProvenance as {verification: string}).verification, "unverified");
  const owned = verification === "verified" ?
    {...imported, importProvenance: {...(imported.importProvenance as Record<string, unknown>), verification: "verified"}} : imported;
  db.write(`organizers/${organizerId}`, owned);
  return {db, deps, requestId: requestPath.split("/")[1], requestPath, organizerId, owned,
    eventWorkItemIds: result.eventWorkItemIds};
}

const externalEvents = (db: FakeFirestore) => db.entries().filter(([key]) => key.startsWith("externalEvents/"));

/** The organizer as the owner's publish leaves it. */
function published(organizer: Record<string, any>): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {...organizer, appVisibility: "discoverable",
    publicPage: {...organizer.publicPage, publishStatus: "published", indexStatus: "indexReady", robots: "index, follow"}};
}

test("an applied try-it import's events go live when the owner publishes, once its imported identity is verified", async () => {
  const h = await appliedImport("verified");
  // Applying the import publishes nothing: the workspace page is still a draft.
  assert.equal(externalEvents(h.db).length, 0);
  const live = published(h.owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const results = await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, live, h.deps as never);
  assert.ok(results);
  assert.deepEqual(results.map((entry) => entry.outcome), h.eventWorkItemIds.map(() => "published"),
    JSON.stringify(results.map((entry) => entry.blockers)));
  assert.equal(externalEvents(h.db).length, h.eventWorkItemIds.length);
  const [[, event]] = externalEvents(h.db);
  valid(validateExternalEvent, event, "ExternalEventDocument");
  assert.equal(event.canonicalHostId, h.organizerId);
  assert.equal(event.publicationStatus, "public");
  assert.equal((event.review as {reviewer: string}).reviewer, OWNER, "the owner's publish is the review");
  const receipt = h.db.read(results[0].receiptPath!)!;
  assert.deepEqual([receipt.actorUid, receipt.outcome], [OWNER, "published"]);

  // A redelivered event, or the page published again later, replays rather than publishing twice.
  const count = h.db.entries().length;
  const replay = await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, live, h.deps as never);
  assert.ok(replay?.every((entry) => entry.idempotent));
  assert.equal(h.db.entries().length, count);
});

test("only the owner's publish of a page with an applied import takes events live", async () => {
  const h = await appliedImport("verified");
  const live = published(h.owned);
  // An update that leaves a live page live is not a publish.
  assert.equal(await publishImportedEventsOnOwnerPublish(h.organizerId, live, live, h.deps as never), null);
  // An organizer no import was applied to.
  assert.equal(await publishImportedEventsOnOwnerPublish("organizer-from-a-nomination", h.owned, live, h.deps as never), null);
  // A page whose owner no longer holds it.
  const unowned = {...live, claim: {...(live.claim as Record<string, unknown>), state: "claimPending"}};
  assert.equal(await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, unowned, h.deps as never), null);
  // The publisher itself refuses an owner the organizer does not name.
  h.db.write(`organizers/${h.organizerId}`, live);
  const {results} = await publishListingEvents({intakeRequestId: h.requestId, eventWorkItemIds: h.eventWorkItemIds,
    actor: {kind: "owner", ownerUid: "someone-else"}, executionMode: "apply", idempotencyKey: "owner-publish:test"}, h.deps as never);
  assert.deepEqual([...new Set(results.flatMap((entry) => entry.blockers))], ["organizer_not_claimed_by_owner"]);
  assert.equal(externalEvents(h.db).length, 0);
});

test("an event that fails an automated check waits for staff even when the owner publishes", async () => {
  const h = await appliedImport("verified");
  const [first] = h.eventWorkItemIds;
  const item = h.db.read(`operationWorkItems/${first}`)!;
  const event = ((item.normalizedPayload as {intake: {event: Record<string, unknown>}}).intake.event);
  event.title = "Singles mixer night";
  h.db.write(`operationWorkItems/${first}`, item);
  const live = published(h.owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const results = (await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, live, h.deps as never))!;
  const held = results.find((entry) => entry.eventWorkItemId === first)!;
  assert.equal(held.outcome, "awaiting_staff");
  assert.ok(held.blockers.includes("dating_framing"));
  assert.equal(held.blockers.includes("staff_review_policy"), false);
});

test("a try-it import publishes nothing while unverified, unapplied or replaced by a later import", async () => {
  const h = await appliedImport("unverified");
  const live = published(h.owned);
  h.db.write(`organizers/${h.organizerId}`, live);
  const blocked = await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, live, h.deps as never);
  assert.ok(blocked?.every((entry) => entry.outcome === "blocked" && entry.blockers.includes("organizer_identity_unverified")),
    JSON.stringify(blocked));
  assert.equal(externalEvents(h.db).length, 0);

  // Verified, but the import was previewed and never applied.
  const verified = {...live, importProvenance: {...live.importProvenance, verification: "verified"}};
  h.db.write(`organizers/${h.organizerId}`, verified);
  const stored = h.db.read(h.requestPath)!;
  h.db.write(h.requestPath, {...stored, tryItImport: {...(stored.tryItImport as Record<string, unknown>), appliedAt: null}});
  assert.equal(await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, verified, h.deps as never), null);

  // Applied to another workspace.
  h.db.write(h.requestPath, {...stored, tryItImport: {...(stored.tryItImport as Record<string, unknown>),
    organizerId: "someone-elses-workspace"}});
  assert.equal(await publishImportedEventsOnOwnerPublish(h.organizerId, h.owned, verified, h.deps as never), null);

  // A later import replaced this one: the provenance names another request, so the old request is not an approval.
  h.db.write(h.requestPath, stored);
  const replaced = {...verified, importProvenance: {...verified.importProvenance, requestId: "tryit-ffffffffffffffffffff"}};
  h.db.write(`organizers/${h.organizerId}`, replaced);
  const direct = await publishListingEvents({intakeRequestId: h.requestId, eventWorkItemIds: h.eventWorkItemIds,
    actor: {kind: "owner", ownerUid: OWNER}, executionMode: "apply", idempotencyKey: "owner-publish:replaced"}, h.deps as never);
  assert.ok(direct.results.every((entry) => entry.outcome !== "published"), JSON.stringify(direct.results));
  assert.equal(direct.organizerId, null);
  assert.equal(externalEvents(h.db).length, 0);
});
