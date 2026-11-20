/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {projectInboxSource} from "../admin/inbox/model";
import {pageAllowanceFor} from "../operations/supplyIntake/worker";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {importOrganizerFromLinkHandler} from "./importOrganizerFromLink";
import {classifyOrganizerLink, instagramHandle} from "./organizerLinks";
import {tryItWorkspaceOrganizerId} from "./workspace";

// The do-not-list probe loads the packaged Operations runtime from lib.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-11-18T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795075200, _nanoseconds: 0};
const UID = "visitor-1";
const PHONE = "+919000000002";
const KEY = "import-request-0001";
const LINK = "https://www.instagram.com/driftwood.social.club/";
const ORGANIZER_ID = tryItWorkspaceOrganizerId(UID, 1);

const validate = {
  response: contractValidator("ImportOrganizerFromLinkCallableResponse"),
  stored: contractValidator("SupplyIntakeRequestsDocument"),
  organizer: contractValidator("OrganizerDocument"),
};

function valid(validator: ((value: unknown) => boolean) & {errors?: unknown}, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${schemaErrorMessages(validator as never).join("; ")}`);
}

function harness() {
  const db = new FakeFirestore();
  const limits: string[] = [];
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(NOW),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: () => SERVER_TIME,
    checkRateLimit: (async (_db: unknown, _key: string, action: string) => {
      limits.push(action);
    }) as never,
  };
  return {db, deps, limits};
}

function call(data: unknown, auth: unknown = {uid: UID, token: {phone_number: PHONE}}) {
  return {data, auth, rawRequest: {headers: {}, ip: "198.51.100.7"}} as unknown as CallableRequest<unknown>;
}

const envelope = (mode: "preview" | "apply", extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: {link: LINK}, ...extra});

async function withWorkspace() {
  const h = harness();
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), h.deps);
  return h;
}

const requestPath = (db: FakeFirestore) =>
  db.entries().find(([key]) => key.startsWith("supplyIntakeRequests/"))?.[0] ?? "";

/** What the worker leaves behind when the read finishes. */
function finishRead(db: FakeFirestore, candidates: unknown[] = []) {
  const key = requestPath(db);
  const stored = db.read(key)!;
  db.write(key, {...stored, status: "completed", result: {runId: "run-1", listingId: "listing-1",
    listingWorkItemId: "item-listing", eventWorkItemIds: ["item-event-1"], listingContentHash: "c".repeat(64),
    gaps: ["image_missing"], researchNeeded: false, eventCount: 1, stoppedReason: null, artifactHash: "a".repeat(64),
    snapshotRefs: [], captureReceipts: [], duplicateCheck: {policyId: "organizer-matching-v1", authority: "advisory",
      verdict: candidates.length ? "match" : "none", reasons: [], organizersCompared: 2, inventoryHash: "d".repeat(64),
      inventory: {citySlug: "mumbai", limit: 1000, truncated: false},
      candidates: (candidates as Array<Record<string, unknown>>).map((candidate) => ({score: 0.95, signals: [],
        rationale: "Same Instagram account.", ...candidate}))}}});
  db.write("operationWorkItems/item-listing", {normalizedPayload: {intake: {recordType: "organizer_listing_draft", listing: {
    listingId: "listing-1", contentHash: "c".repeat(64), gaps: ["image_missing"],
    organizer: {name: "Sunrise Social Club", description: "Morning runs and coffee by the sea.", categories: [],
      links: [{platform: "instagram", url: LINK}, {platform: "luma", url: "https://lu.ma/driftwood-social"}]}}}}});
  db.write("operationWorkItems/item-event-1", {normalizedPayload: {intake: {event: {title: "Sunday sea-face run",
    startAt: "2026-11-23T01:30:00.000Z", endAt: "2026-11-23T03:00:00.000Z", venue: "Sea Face Promenade",
    sourceUrl: "https://lu.ma/driftwood-run"}}}});
}

test("links: what the tool can promise for each kind of organizer link", () => {
  const kind = (link: string) => classifyOrganizerLink(new URL(link));
  assert.deepEqual(kind("https://lu.ma/driftwood-social"), {provider: "luma", support: "instant", reason: null});
  assert.equal(kind(LINK).support, "best_effort");
  assert.equal(kind("https://www.instagram.com/p/abc123/").reason, "instagram_not_a_profile");
  assert.equal(kind("https://linktr.ee/driftwood").reason, "link_in_bio");
  assert.equal(kind("https://driftwood-social.example/").reason, "organizer_website");
  assert.equal(kind("https://wa.me/919000000000").support, "staff_follow_up");
  assert.equal(kind("https://forms.gle/abc").reason, "form_link");
  assert.equal(instagramHandle(LINK), "driftwood.social.club");
  assert.equal(instagramHandle("https://lu.ma/x"), null);
});

test("without a workspace the command asks for one first", async () => {
  const {deps} = harness();
  const response = await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  valid(validate.response, response, "no workspace");
  assert.equal(response.status, "needs_input");
  assert.deepEqual(response.result.reasons, ["no_workspace"]);
  assert.equal(response.next[0]?.commandId, "workspace.ensure");
});

test("a link the tool cannot read is refused before anything is queued", async () => {
  const {db, deps} = await withWorkspace();
  const response = await importOrganizerFromLinkHandler(call(envelope("preview", {input: {link: "https://wa.me/919000000000"}})), deps);
  assert.equal(response.status, "refused");
  assert.deepEqual(response.result.reasons, ["chat_invite"]);
  assert.equal(requestPath(db), "");
});

test("preview reads the link, then shows what apply would write; apply writes it once", async () => {
  const {db, deps} = await withWorkspace();
  const first = await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  valid(validate.response, first, "running");
  assert.equal(first.status, "running");
  assert.equal(first.result.pollAfterMs, 2000);
  const stored = db.read(requestPath(db))!;
  valid(validate.stored, stored, "stored request");
  assert.equal((stored.request as {origin: {kind: string}}).origin.kind, "try_it_import");
  assert.equal(pageAllowanceFor(stored.request as never), "web_instant_draft");
  assert.equal((stored.tryItImport as {organizerId: string}).organizerId, ORGANIZER_ID);
  assert.equal(projectInboxSource("supplyIntakeRequest", "x", stored, {} as never), null);
  assert.equal((await importOrganizerFromLinkHandler(call(envelope("preview")), deps)).status, "running");

  finishRead(db);
  const preview = await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  valid(validate.response, preview, "previewed");
  assert.equal(preview.status, "previewed");
  const proposal = preview.result.proposal!;
  assert.equal(proposal.description, "Morning runs and coffee by the sea.");
  assert.equal(proposal.instagramHandle, "driftwood.social.club");
  assert.equal(proposal.nameChanges, false);
  assert.equal(proposal.eventCount, 1);
  assert.equal(proposal.events[0].title, "Sunday sea-face run");
  assert.equal(proposal.verificationNeeded, true);
  assert.match(preview.summary.lines.join(" "), /prove you run/u);

  const applied = await importOrganizerFromLinkHandler(call(envelope("apply", {confirm: {commandId: "organizer.import-from-link",
    previewHash: preview.previewHash}})), deps);
  valid(validate.response, applied, "applied");
  assert.equal(applied.status, "applied");
  assert.ok(applied.effects.some((effect) => effect.kind === "imported_events"));
  const organizer = db.read(`organizers/${ORGANIZER_ID}`)!;
  valid(validate.organizer, organizer, "organizer after import");
  assert.equal(organizer.name, "Sunrise Social Club");
  assert.equal(organizer.description, "Morning runs and coffee by the sea.");
  assert.equal(organizer.instagramHandle, "driftwood.social.club");
  assert.equal((organizer.publicSources as unknown[]).length, 2);
  const provenance = organizer.importProvenance as {verification: string; identities: unknown[]};
  assert.equal(provenance.verification, "unverified");
  assert.equal(provenance.identities.length, 2);
  assert.equal((organizer.publicPage as {publishStatus: string}).publishStatus, "draft");
  valid(validate.stored, db.read(requestPath(db)), "stored request after apply");
  assert.equal((db.read(requestPath(db))!.tryItImport as {appliedAt: string}).appliedAt, NOW);

  const replay = await importOrganizerFromLinkHandler(call(envelope("apply", {confirm: {commandId: "organizer.import-from-link",
    previewHash: preview.previewHash}})), deps);
  assert.equal(replay.status, "replayed");
});

test("apply refuses a confirm whose preview changed, and a link that is not read yet", async () => {
  const {db, deps} = await withWorkspace();
  await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  await assert.rejects(importOrganizerFromLinkHandler(call(envelope("apply")), deps), {code: "failed-precondition"});
  finishRead(db);
  await assert.rejects(importOrganizerFromLinkHandler(call(envelope("apply", {idempotencyKey: KEY,
    confirm: {commandId: "organizer.import-from-link", previewHash: "0".repeat(64)}})), deps), {code: "aborted"});
});

test("the same key with another link is refused", async () => {
  const {deps} = await withWorkspace();
  await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  await assert.rejects(importOrganizerFromLinkHandler(call(envelope("preview", {input: {link: "https://lu.ma/driftwood-other"}})), deps),
    {code: "already-exists"});
});

test("the visitor's own workspace never counts as an existing listing", async () => {
  const {db, deps} = await withWorkspace();
  await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  finishRead(db, [{organizerId: ORGANIZER_ID, name: "Sunrise Social Club", band: "match", conflicts: []}]);
  const preview = await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  assert.equal(preview.status, "previewed");
  assert.equal(preview.result.match, null);
});

test("a page that matches another listed organizer routes to claim, and apply is refused", async () => {
  const {db, deps} = await withWorkspace();
  db.write("organizers/ListedOrganizer000001", {name: "Sunrise Social Club", claim: {state: "unclaimed"}, ownerUserId: null});
  await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  finishRead(db, [{organizerId: "ListedOrganizer000001", name: "Sunrise Social Club", band: "match", conflicts: []}]);
  const preview = await importOrganizerFromLinkHandler(call(envelope("preview")), deps);
  valid(validate.response, preview, "existing listing");
  assert.equal(preview.status, "needs_input");
  assert.deepEqual(preview.result.reasons, ["existing_listing"]);
  assert.deepEqual(preview.result.match, {verdict: "match", candidates: [{organizerId: "ListedOrganizer000001",
    name: "Sunrise Social Club", claimable: true}]});
  await assert.rejects(importOrganizerFromLinkHandler(call(envelope("apply")), deps),
    (error: {details?: {reason?: string}}) => error.details?.reason === "existing_listing");
});

// AI fallback (#2062, step 6) ------------------------------------------------

type AiRequest = {task: string; commandId: string; input: Record<string, unknown>};

function fakeAi(answer: {status: "read"; output: unknown} | {status: "refused"; reason: string} | {status: "off"}) {
  const reads: AiRequest[] = [];
  return {reads, aiFallback: () => ({enabled: async () => true, read: async (request: AiRequest) => {
    reads.push(request);
    return answer.status === "read" ? {...answer, cacheHit: reads.length > 1} : answer;
  }}) as never};
}

const SITE = "https://harbour-lights.example/";
const SITE_TEXT = "Harbour Lights Supper Club. Long-table dinners for strangers, every other Thursday.";

/** A finished read whose adapters found no name or description, with the page's stored snapshot. */
function finishEmptyRead(db: FakeFirestore) {
  const key = requestPath(db);
  const requestId = key.split("/")[1];
  const ref = `supply-intake/snapshots/${requestId}/${"e".repeat(64)}.json`;
  db.write(key, {...db.read(key)!, status: "completed", result: {runId: "run-1", listingId: "listing-1",
    listingWorkItemId: "item-listing", eventWorkItemIds: [], listingContentHash: "c".repeat(64), gaps: ["seed_page_unreadable"],
    researchNeeded: false, eventCount: 0, stoppedReason: null, artifactHash: "a".repeat(64), snapshotRefs: [ref],
    captureReceipts: [], duplicateCheck: {policyId: "organizer-matching-v1", authority: "advisory", verdict: "none",
      reasons: [], organizersCompared: 2, inventoryHash: "d".repeat(64), inventory: {citySlug: "mumbai", limit: 1000,
        truncated: false}, candidates: []}}});
  db.write("operationWorkItems/item-listing", {normalizedPayload: {intake: {recordType: "organizer_listing_draft", listing: {
    listingId: "listing-1", contentHash: "c".repeat(64), gaps: ["seed_page_unreadable"],
    organizer: {name: null, description: null, categories: [], links: []}}}}});
  return async (path: string) => path === ref ? {url: SITE, finalUrl: SITE, title: "Harbour Lights", text: SITE_TEXT} : null;
}

const siteEnvelope = (mode: "preview" | "apply", extra: Record<string, unknown> = {}) =>
  envelope(mode, {input: {link: SITE, useImportedName: true}, ...extra});

test("AI fallback: a page the adapters read nothing from gives the name and description, marked for review", async () => {
  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: {name: "Harbour Lights Supper Club", description: "Long-table dinners for strangers."}});
  await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), {...deps, ...ai} as typeof deps);
  const readSnapshot = finishEmptyRead(db);
  const aiDeps = {...deps, ...ai, readSnapshot} as typeof deps;

  const preview = await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), aiDeps);
  valid(validate.response, preview, "ai previewed");
  assert.equal(preview.status, "previewed");
  assert.equal(preview.result.aiRead, true);
  assert.deepEqual(preview.result.reviewFields, ["name", "description"]);
  assert.equal(preview.result.proposal?.name, "Harbour Lights Supper Club");
  assert.equal(preview.result.proposal?.nameChanges, true);
  assert.equal(preview.result.proposal?.eventCount, 0, "the AI adds no events");
  assert.deepEqual(ai.reads[0].input, {pageTitle: "Harbour Lights", pageText: SITE_TEXT});
  assert.equal(ai.reads[0].task, "organizer-page-reading");

  const applied = await importOrganizerFromLinkHandler(call(siteEnvelope("apply", {confirm: {commandId: "organizer.import-from-link",
    previewHash: preview.previewHash}})), aiDeps);
  valid(validate.response, applied, "ai applied");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.aiRead, true);
  const organizer = db.read(`organizers/${ORGANIZER_ID}`)!;
  assert.equal(organizer.name, "Harbour Lights Supper Club");
  assert.equal(organizer.description, "Long-table dinners for strangers.");
  valid(validate.organizer, organizer, "organizer after ai apply");
  assert.deepEqual(ai.reads[1].input, ai.reads[0].input, "apply's read is the cached one");
});

test("AI fallback: off, an empty page previews as before; on, refusals are plain reasons", async () => {
  const off = await withWorkspace();
  await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), off.deps);
  finishEmptyRead(off.db);
  const before = await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), off.deps);
  valid(validate.response, before, "off");
  assert.deepEqual([before.status, before.result.aiRead, before.result.proposal?.name], ["previewed", false, null]);

  for (const [answer, reason] of [
    [{status: "refused", reason: "ai_cap_reached"}, "ai_cap_reached"],
    [{status: "refused", reason: "ai_daily_limit"}, "ai_daily_limit"],
    [{status: "read", output: {name: "", description: " "}}, "ai_unreadable"],
  ] as const) {
    const {db, deps} = await withWorkspace();
    const ai = fakeAi(answer as never);
    await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), {...deps, ...ai} as typeof deps);
    const readSnapshot = finishEmptyRead(db);
    const response = await importOrganizerFromLinkHandler(call(siteEnvelope("preview")), {...deps, ...ai, readSnapshot} as typeof deps);
    valid(validate.response, response, reason);
    assert.deepEqual([response.status, response.result.reasons], ["refused", [reason]]);
  }

  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: {name: "Ignored", description: "Ignored"}});
  await importOrganizerFromLinkHandler(call(envelope("preview")), {...deps, ...ai} as typeof deps);
  finishRead(db);
  const adapters = await importOrganizerFromLinkHandler(call(envelope("preview")), {...deps, ...ai} as typeof deps);
  assert.equal(adapters.result.aiRead, false, "a page the adapters read is never sent to the AI");
  assert.equal(ai.reads.length, 0);
});

test("AI fallback: a public platform with no adapter is read only when the fallback is on", async () => {
  const link = "https://partiful.com/u/harbour-lights";
  const off = await withWorkspace();
  const refused = await importOrganizerFromLinkHandler(call(envelope("preview", {input: {link}})), off.deps);
  assert.deepEqual([refused.status, refused.result.reasons], ["refused", ["no_adapter"]]);
  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: {name: "x", description: "y"}});
  const running = await importOrganizerFromLinkHandler(call(envelope("preview", {input: {link}})), {...deps, ...ai} as typeof deps);
  valid(validate.response, running, "no adapter, on");
  assert.deepEqual([running.status, running.result.link.reason], ["running", "ai_fallback"]);
  assert.notEqual(requestPath(db), "");
});
