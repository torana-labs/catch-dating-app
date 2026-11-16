/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import type {OperationRun, OperationWorkItem} from "../operations/models";
import type {ProjectionImportWriter} from "../operations/projectionImporter";
import {FakeFirestore} from "../operations/testFirestore";
import {acceptPageFetch, notFoundTransport} from "../operations/supplyIntake/testPageFetch";
import {processSupplyIntakeRequest, supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {approvedOrganizer} from "../operations/supplyIntake/eventPublication";
import {adminApproveOrganizerListingHandler} from "../admin/organizerListingApproval";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {projectInboxSource} from "../admin/inbox/model";
import {materializeInstantDraft} from "./materialize";
import {instantDraftId, limiterKey} from "./model";
import {requestInstantDraftHandler} from "./request";
import {getInstantDraftHandler} from "./status";

// The build post-step copies the Operations runtime into lib; the worker uses it.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-11-16T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1794816000, _nanoseconds: 0};
const TOKEN = "t".repeat(43);
const PHONE = "+919000000001";
const UID = "submitter-1";
/** A caller signed in with the website's phone code, so the token carries the verified number. */
const VERIFIED = {uid: UID, token: {phone_number: PHONE}};

const validators = {
  requestResponse: contractValidator("RequestInstantDraftCallableResponse"),
  statusResponse: contractValidator("GetInstantDraftCallableResponse"),
  stored: contractValidator("SupplyIntakeRequestsDocument"),
  organizer: contractValidator("OrganizerDocument"),
  decision: contractValidator("OrganizerIntakeReviewDecisionDocument"),
  approval: contractValidator("AdminApproveOrganizerListingCallableResponse"),
};

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

function harness() {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const limits: Array<{key: string; action: string; maxRequests: number}> = [];
  const checkRateLimit = (async (_db: unknown, key: string, action: string, limit: {maxRequests: number}) => {
    limits.push({key, action, maxRequests: limit.maxRequests});
  }) as never;
  const routes: string[] = [];
  const deps = {
    firestore: () => firestore,
    now: () => new Date(NOW),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit,
    reserveCanonicalRoute: async (_tx: unknown, _db: unknown, options: {canonicalPath: string}) => {
      routes.push(options.canonicalPath);
    },
  };
  const callable = (data: unknown, auth: unknown = null) =>
    ({auth, data, rawRequest: {headers: {"x-forwarded-for": "198.51.100.7"}, ip: "198.51.100.7"}}) as unknown as CallableRequest<unknown>;
  const submit = (overrides: Record<string, unknown> = {}, auth: unknown = VERIFIED) => requestInstantDraftHandler(callable({
    requestId: "web-0f3c2a9e-5b1d-4c7e", requestKind: "event_link", entry: "event_page_tool",
    link: "https://lu.ma/afterfly", accessToken: TOKEN,
    whatsapp: {phone: PHONE, consentVersion: "instant-draft-whatsapp-v1", followUpConsent: true},
    city: "Mumbai", ...overrides}, auth), deps);
  const status = (draftId: string, accessToken = TOKEN, extra: Record<string, unknown> = {}) =>
    getInstantDraftHandler(callable({draftId, accessToken, ...extra}), deps as never);
  return {db, firestore, deps, limits, routes, callable, submit, status};
}

/**
 * Runs the real worker on a submitted draft (no page is reachable in tests),
 * then gives the build what reading a Luma page finds: the organizer's name
 * and one upcoming event.
 */
async function build(h: ReturnType<typeof harness>, draftId: string,
  {events = 1, verdict = "none", locality = null as string | null, address = null as string | null} = {}) {
  acceptPageFetch(h.db);
  const writer = new MemoryWriter();
  const outcome = await processSupplyIntakeRequest({db: h.db as unknown as Firestore, now: () => new Date(NOW),
    projectionWriter: writer, transport: notFoundTransport, putSnapshot: async () => "supply-intake/snapshots/x.json"}, draftId);
  const path = `${supplyIntakeCollections.requests}/${draftId}`;
  const stored = h.db.read(path) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.equal(outcome, "completed", JSON.stringify(stored.failure));
  const workItem = structuredClone(writer.items.get(stored.result.listingWorkItemId)!);
  const listing = (workItem.normalizedPayload.intake as {listing: Record<string, any>}).listing; // eslint-disable-line @typescript-eslint/no-explicit-any
  listing.organizer.name = "Afterfly";
  listing.organizer.description = "Weekly social nights for people who would rather meet in person.";
  listing.organizer.links = [{platform: "luma", surfaceKind: "calendar", url: "https://lu.ma/afterfly",
    normalizedKey: "lu.ma/afterfly", evidenceUrl: "https://lu.ma/afterfly"}];
  h.db.write(`operationWorkItems/${workItem.workItemId}`, workItem as unknown as Record<string, unknown>);
  const eventWorkItemIds = Array.from({length: events}, (_, index) => `wi-draft-event-${index + 1}`);
  for (const [index, id] of eventWorkItemIds.entries()) {
    h.db.write(`operationWorkItems/${id}`, {workItemId: id, normalizedPayload: {intake: {recordType: "listing_event_candidate",
      event: {title: `Afterfly social ${index + 1}`, startAt: `2026-12-0${index + 1}T19:00:00+05:30`,
        endAt: `2026-12-0${index + 1}T22:00:00+05:30`, venue: "Bandra", locality, address,
        sourceUrl: `https://lu.ma/afterfly-${index + 1}`}}}});
  }
  h.db.write(path, {...stored, result: {...stored.result, eventCount: events, eventWorkItemIds,
    duplicateCheck: stored.result.duplicateCheck ? {...stored.result.duplicateCheck, verdict} :
      {policyId: "organizer-match-v1", authority: "advisory", verdict, reasons: [], organizersCompared: 0,
        inventoryHash: "c".repeat(64), inventory: {citySlug: "mumbai", limit: 500, truncated: false}, candidates: []}}});
  return {workItem, listing};
}

test("an event link becomes a building draft at once, through Supply Intake, with the follow-up consent kept private", async () => {
  const h = harness();
  const response = await h.submit();
  valid(validators.requestResponse, response, "RequestInstantDraftCallableResponse");
  const draftId = instantDraftId("web-0f3c2a9e-5b1d-4c7e");
  assert.deepEqual(response, {draftId, status: "building", link: {provider: "luma", support: "instant", reason: null},
    followUp: {channel: "whatsapp", mode: "staff_reply"}, draftPath: `/drafts/${draftId}`, pollAfterMs: 2000,
    idempotentReplay: false});
  const stored = h.db.read(`${supplyIntakeCollections.requests}/${draftId}`)!;
  valid(validators.stored, stored, "SupplyIntakeRequestsDocument");
  assert.deepEqual([stored.status, (stored.request as Record<string, unknown>).kind, (stored.request as Record<string, unknown>).market,
    (stored.request as {origin: unknown}).origin], ["queued", "self_submission", "mumbai",
    {kind: "web_instant_draft", id: "web-0f3c2a9e-5b1d-4c7e"}]);
  const draft = stored.instantDraft as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.notEqual(draft.accessTokenHash, TOKEN, "only the token's hash is stored");
  assert.equal(JSON.stringify(stored).includes(TOKEN), false);
  assert.deepEqual(draft.whatsapp, {phone: PHONE, consentVersion: "instant-draft-whatsapp-v1", consentedAt: NOW,
    purpose: "instant_draft_follow_up", verifiedByUid: UID});
  // Limits per verified number, per address, and for the whole tool, keyed by hashes.
  assert.deepEqual(h.limits.map((limit) => limit.action), ["requestInstantDraft", "requestInstantDraftAddress",
    "requestInstantDraftDaily", "requestInstantDraftMonthly"]);
  assert.equal(h.limits.some((limit) => limit.key.includes("9000000001") || limit.key.includes("198.51")), false);

  // An exact retry finds the same draft without spending a limit; a changed one is refused.
  const before = h.limits.length;
  assert.deepEqual(await h.submit(), {...response, idempotentReplay: true});
  assert.equal(h.limits.length, before);
  await assert.rejects(h.submit({link: "https://lu.ma/another"}), /changed/);
  await assert.rejects(h.submit({accessToken: "u".repeat(43)}), /changed/);
  // The same submission from someone who verified another number is refused too.
  await assert.rejects(h.submit({whatsapp: {consentVersion: "instant-draft-whatsapp-v1", followUpConsent: true}},
    {uid: "someone-else", token: {phone_number: "+919000000009"}}), /changed/);
});

test("only a caller who verified the WhatsApp number with a code can ask for a draft", async () => {
  const h = harness();
  const draftPath = (requestId: string) => `${supplyIntakeCollections.requests}/${instantDraftId(requestId)}`;
  await assert.rejects(h.submit({requestId: "web-signedout-00000001"}, null),
    (error: {code?: string}) => error.code === "unauthenticated");
  // Signed in without a verified phone (an email sign-in, say).
  await assert.rejects(h.submit({requestId: "web-nophone-000000001"}, {uid: UID, token: {email: "a@example.com"}}),
    (error: {code?: string; message?: string}) => error.code === "failed-precondition" && /with a code/.test(error.message ?? ""));
  // A number that is not the verified one.
  await assert.rejects(h.submit({requestId: "web-mismatch-00000001", whatsapp: {phone: "+919000000002",
    consentVersion: "instant-draft-whatsapp-v1", followUpConsent: true}}),
  (error: {code?: string; message?: string}) => error.code === "failed-precondition" && /number you confirmed/.test(error.message ?? ""));
  assert.equal(h.db.read(draftPath("web-signedout-00000001")), undefined);
  assert.equal(h.db.read(draftPath("web-mismatch-00000001")), undefined);
  assert.equal(h.limits.length, 0, "a refused caller spends no limit");

  // The website may leave the number out: the verified phone is the number.
  const derived = await h.submit({requestId: "web-derived-000000001", whatsapp: {consentVersion: "instant-draft-whatsapp-v1",
    followUpConsent: true}});
  const stored = h.db.read(draftPath("web-derived-000000001"))!;
  valid(validators.stored, stored, "SupplyIntakeRequestsDocument");
  assert.equal((stored.instantDraft as {whatsapp: {phone: string}}).whatsapp.phone, PHONE);
  assert.equal(derived.status, "building");
  const [phoneLimit] = h.limits;
  assert.equal(phoneLimit.action, "requestInstantDraft");
  assert.equal(phoneLimit.key, limiterKey("phone", PHONE), "the per-number limit counts the verified phone");
});

test("a form link, a closed site or a bad submission is answered without guessing", async () => {
  const h = harness();
  const form = await h.submit({requestId: "web-form-000000000001", requestKind: "form_link",
    link: "https://docs.google.com/forms/d/e/1FAIpQLSf-example/viewform"});
  valid(validators.requestResponse, form, "RequestInstantDraftCallableResponse");
  assert.deepEqual([form.status, form.link, form.pollAfterMs], ["staff_follow_up",
    {provider: "google_forms", support: "staff_follow_up", reason: "form_import_not_available"}, null]);
  const formStatus = await h.status(form.draftId);
  valid(validators.statusResponse, formStatus, "GetInstantDraftCallableResponse");
  assert.deepEqual([formStatus.status, formStatus.reasons], ["staff_follow_up", ["form_import_not_available"]]);

  const facebook = await h.submit({requestId: "web-fb-00000000000001", link: "https://www.facebook.com/events/1"});
  assert.deepEqual(facebook.link, {provider: null, support: "staff_follow_up", reason: "signed_in_site"});

  await assert.rejects(h.submit({requestId: "web-bad-0000000000001", link: "https://192.168.1.10/events"}), /public https link/);
  await assert.rejects(h.submit({requestId: "web-bad-0000000000002", whatsapp: {phone: PHONE,
    consentVersion: "instant-draft-whatsapp-v1", followUpConsent: false}}), /Tick the box/);
  await assert.rejects(h.submit({requestId: "web-bad-0000000000003", extra: true}), /not part of this request/);
});

test("a finished build is saved as a private draft for claim: unpublished, unclaimed, and its events blocked", async () => {
  const h = harness();
  const {draftId} = await h.submit();
  assert.equal((await h.status(draftId)).status, "building");
  await build(h, draftId);

  const state = await materializeInstantDraft(h.deps as never, draftId);
  assert.equal(state.state, "draft_ready");
  const organizerId = (state as {organizerId: string}).organizerId;
  const organizer = h.db.read(`organizers/${organizerId}`)!;
  valid(validators.organizer, organizer, "OrganizerDocument");
  assert.deepEqual([(organizer.publicPage as {publishStatus: string}).publishStatus, organizer.appVisibility,
    (organizer.claim as {state: string}).state, organizer.ownerUserId], ["draft", "hidden", "unclaimed", null]);
  const decision = h.db.read(`organizerIntakeReviewDecisions/${organizerId}`);
  valid(validators.decision, decision, "OrganizerIntakeReviewDecisionDocument");
  assert.deepEqual([decision?.decision, decision?.decisionStatus, decision?.publishStatus], ["hold", "held", "draft"]);
  // No person approved it, so no pseudo-user owns Sales work for it.
  assert.equal(h.db.entries().some(([key]) => key.startsWith("organizerSalesAccounts/") || key.startsWith("salesTasks/")), false);
  const stored = h.db.read(`${supplyIntakeCollections.requests}/${draftId}`)!;
  valid(validators.stored, stored, "SupplyIntakeRequestsDocument");
  assert.equal((stored.approval as {approvedByUid: string}).approvedByUid, "supply-instant-draft");
  assert.equal((stored.instantDraft as {outcome: {state: string}}).outcome.state, "draft_ready");
  // Every imported event is blocked until the claimed owner publishes the page.
  assert.ok(approvedOrganizer(organizerId, organizer).blockers.includes("organizer_page_unpublished"));

  // Saving again replays; the page sees the draft with its events.
  assert.deepEqual(await materializeInstantDraft(h.deps as never, draftId), state);
  const ready = await h.status(draftId);
  valid(validators.statusResponse, ready, "GetInstantDraftCallableResponse");
  assert.equal(ready.status, "draft_ready");
  assert.deepEqual([ready.draft?.organizerId, ready.draft?.name, ready.draft?.visibility, ready.draft?.claimState,
    ready.draft?.eventCount, ready.draft?.events[0]?.title], [organizerId, "Afterfly", "private_until_claimed", "unclaimed", 1,
    "Afterfly social 1"]);
  assert.equal(h.db.entries().filter(([key]) => key.startsWith("organizers/")).length, 1, "one draft, saved once");
});

test("the draft page reads its draft only with its token, and saves a finished build itself", async () => {
  const h = harness();
  const {draftId} = await h.submit();
  await assert.rejects(h.status(draftId, "x".repeat(43)), /not valid/);
  await assert.rejects(h.status(instantDraftId("someone-else-0000000")), /not valid/);
  await build(h, draftId);
  // No worker hook ran; the poll saves it.
  const ready = await h.status(draftId);
  assert.equal(ready.status, "draft_ready");
  assert.ok(h.limits.some((limit) => limit.action === "getInstantDraft"));
});

test("a build that cannot become a draft on its own waits for a person, with reasons", async () => {
  const h = harness();
  const noEvents = await h.submit({requestId: "web-noevents-00000001"});
  await build(h, noEvents.draftId, {events: 0});
  const waiting = await h.status(noEvents.draftId);
  valid(validators.statusResponse, waiting, "GetInstantDraftCallableResponse");
  assert.deepEqual([waiting.status, waiting.reasons, waiting.draft], ["staff_follow_up", ["no_upcoming_events"], null]);

  const duplicate = await h.submit({requestId: "web-duplicate-0000001"});
  await build(h, duplicate.draftId, {verdict: "match"});
  assert.deepEqual((await h.status(duplicate.draftId)).reasons, ["duplicate_check_not_clear"]);

  // Events in a city Catch has not opened wait for staff rather than asking the submitter.
  const pune = await h.submit({requestId: "web-pune-00000000001", city: null});
  await build(h, pune.draftId, {locality: "Pune"});
  assert.deepEqual([(await h.status(pune.draftId)).status, (await h.status(pune.draftId)).reasons],
    ["staff_follow_up", ["market_not_open"]]);
  assert.equal(h.db.entries().some(([key]) => key.startsWith("organizers/")), false, "nothing was saved");
});

test("the market is read from the imported events when the submitter gives no city", async () => {
  const h = harness();
  const {draftId} = await h.submit({city: null});
  await build(h, draftId, {address: "Linking Road, Bandra West, Mumbai, Maharashtra 400050"});
  const ready = await h.status(draftId);
  valid(validators.statusResponse, ready, "GetInstantDraftCallableResponse");
  assert.deepEqual([ready.status, ready.markets], ["draft_ready", []]);
  const organizer = h.db.read(`organizers/${ready.draft?.organizerId}`)!;
  assert.equal(organizer.locationMarketId, "in-mh-mumbai");
  const stored = h.db.read(`${supplyIntakeCollections.requests}/${draftId}`)!;
  valid(validators.stored, stored, "SupplyIntakeRequestsDocument");
  assert.deepEqual(((stored.instantDraft as {market: Record<string, unknown>}).market),
    {marketId: "in-mh-mumbai", source: "event_location", at: NOW});
});

test("a draft whose city cannot be told asks the submitter, and their choice continues the same draft", async () => {
  const h = harness();
  const {draftId} = await h.submit({city: null});
  await build(h, draftId);
  const asking = await h.status(draftId);
  valid(validators.statusResponse, asking, "GetInstantDraftCallableResponse");
  assert.deepEqual([asking.status, asking.reasons, asking.draft, asking.pollAfterMs],
    ["needs_city", ["city_not_inferred"], null, null]);
  assert.ok(asking.markets.some((market) => market.marketId === "in-mh-mumbai" && market.label === "Mumbai"));
  assert.ok(asking.markets.every((market) => market.marketId !== "in-ka-bengaluru"), "only open markets are offered");
  // Polling again keeps asking; nothing goes to staff and nothing is saved.
  assert.equal((await h.status(draftId)).status, "needs_city");
  assert.equal(h.db.entries().some(([key]) => key.startsWith("organizers/")), false);
  const waiting = h.db.read(`${supplyIntakeCollections.requests}/${draftId}`)!;
  valid(validators.stored, waiting, "SupplyIntakeRequestsDocument");
  const item = projectInboxSource("supplyIntakeRequest", draftId, waiting)!;
  assert.deepEqual([item.lifecycle, item.state.code], ["working", "waiting_for_city"]);

  await assert.rejects(h.status(draftId, TOKEN, {city: "Bengaluru"}), /open cities/);
  await assert.rejects(h.status(draftId, "x".repeat(43), {city: "in-mh-mumbai"}), /not valid/);
  const ready = await h.status(draftId, TOKEN, {city: "in-mh-mumbai"});
  valid(validators.statusResponse, ready, "GetInstantDraftCallableResponse");
  assert.equal(ready.status, "draft_ready");
  assert.equal(ready.draft?.organizerId, h.db.entries().find(([key]) => key.startsWith("organizers/"))?.[0].split("/")[1]);
  const stored = h.db.read(`${supplyIntakeCollections.requests}/${draftId}`)!;
  valid(validators.stored, stored, "SupplyIntakeRequestsDocument");
  assert.deepEqual([(stored.instantDraft as {market: {source: string}}).market.source,
    (stored.instantDraft as {outcome: {state: string}}).outcome.state], ["chosen", "draft_ready"]);
  // The same choice again replays; a different one is refused now that it is saved.
  assert.equal((await h.status(draftId, TOKEN, {city: "in-mh-mumbai"})).status, "draft_ready");
  await assert.rejects(h.status(draftId, TOKEN, {city: "in-mp-indore"}), /not waiting for a city/);
});

test("staff approving an instant draft's listing also save it unpublished", async () => {
  const h = harness();
  const {draftId} = await h.submit();
  const {workItem, listing} = await build(h, draftId);
  const response = await adminApproveOrganizerListingHandler({auth: {uid: "admin-1", token: {admin: true}},
    rawRequest: {headers: {}}, data: {requestId: "approve-draft-1", listingWorkItemId: workItem.workItemId,
      contentHash: listing.contentHash, name: "Afterfly", publicSlug: "afterfly", marketId: "in-mh-mumbai",
      organizerType: "community", note: "Checked the Luma page.",
      checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
        marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
        claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: true}}} as unknown as CallableRequest<unknown>,
  h.deps as never);
  valid(validators.approval, response, "AdminApproveOrganizerListingCallableResponse");
  assert.equal(response.publishStatus, "draft");
  const organizer = h.db.read(`organizers/${response.organizerId}`)!;
  assert.equal((organizer.publicPage as {publishStatus: string}).publishStatus, "draft");
  // A person approved it, so they own its Sales work, which says it is a private draft.
  const activity = h.db.read(`salesActivities/${response.approvalId}_approved`);
  assert.match(String(activity?.note), /private draft/);
  assert.equal((activity?.source as {origin: string}).origin, "none");
  // The page then shows the draft staff saved.
  assert.equal((await materializeInstantDraft(h.deps as never, draftId)).state, "draft_ready");
});
