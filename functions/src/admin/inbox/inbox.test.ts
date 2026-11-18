/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../operations/testFirestore";
import {contractValidator} from "../../shared/contractTestValidators";
import {schemaErrorMessages} from "../../shared/generated/schemaValidationRuntime";
import type {AdminListInboxItemsCallableResponse} from "../../shared/generated/adminListInboxItemsCallableResponse";
import type {AdminGetInboxItemCallableResponse} from "../../shared/generated/adminGetInboxItemCallableResponse";
import {ListingEventFacts, projectInboxSource, projectListingEvent} from "./model";
import {syncInboxProjection, syncInboxSource} from "./store";
import {
  adminGetInboxItemHandler,
  adminListInboxItemsHandler,
  adminUpdateInboxItemHandler,
} from "./callables";
import {reconcileAdminInbox, wakeSnoozedInboxItems} from "./triggers";

const validateList = contractValidator<AdminListInboxItemsCallableResponse>("AdminListInboxItemsCallableResponse");
const validateGet = contractValidator<AdminGetInboxItemCallableResponse>("AdminGetInboxItemCallableResponse");
const valid = (validator: typeof validateList | typeof validateGet, value: unknown) =>
  assert.equal(validator(value), true, schemaErrorMessages(validator as never).join("; "));

const now = new Date("2026-10-31T12:00:00.000Z");

function nomination(requestId: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, requestId,
    request: {schemaVersion: 1, requestId, kind: "nomination", market: "mumbai",
      seed: {name: "Afterfly", urls: ["https://luma.com/afterfly"], notes: null, categories: ["social"]},
      submittedBy: {role: "associate", uid: "riya", partnerId: null}, submittedAt: "2026-10-28T16:11:00.000Z",
      origin: {kind: "message_nomination", id: "msg-1"}},
    status: "completed", attempts: 1, leaseUntil: null,
    result: {runId: "run-1", listingId: "listing-1", listingWorkItemId: "wi-1", eventWorkItemIds: [], listingContentHash: "a".repeat(64),
      gaps: ["image_rights"], researchNeeded: false, eventCount: 3, stoppedReason: null, artifactHash: "b".repeat(64), snapshotRefs: [],
      captureReceipts: [
        {requestedUrl: "https://luma.com/afterfly", finalUrl: "https://luma.com/afterfly", outcome: "fetched", capturedAt: "2026-10-28T16:12:00.000Z"},
        {requestedUrl: "https://instagram.com/afterfly.run", finalUrl: null, outcome: "login_wall", capturedAt: "2026-10-28T16:12:30.000Z"},
      ]},
    failure: null, approval: null, createdAt: "2026-10-28T16:11:00.000Z", updatedAt: "2026-10-28T16:13:00.000Z",
    ...overrides,
  };
}

function harness() {
  const db = new FakeFirestore();
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  const deps = {firestore: () => firestore, serverTimestamp: () => "SERVER_TIMESTAMP" as never, now: () => now};
  const request = (data: unknown, token: Record<string, unknown> = {support: true}, uid = "dev") =>
    ({auth: {uid, token}, data, rawRequest: {headers: {}}}) as unknown as CallableRequest<unknown>;
  const sync = (kind: Parameters<typeof syncInboxSource>[1], id: string, data: Record<string, unknown> | undefined, at = now) =>
    syncInboxSource(firestore, kind, id, data, at, async () => ({organizerName: "Bhag Club", organizerCity: "in-mh-mumbai", personName: "Meher"}));
  const list = (data: Record<string, unknown>, token?: Record<string, unknown>, uid?: string) =>
    adminListInboxItemsHandler(request({scope: "waiting", type: null, city: null, limit: 25, cursor: null, ...data}, token, uid), deps);
  return {db, firestore, deps, request, sync, list};
}

test("a nomination projects to a listing with every step it took", () => {
  const projection = projectInboxSource("supplyIntakeRequest", "req-1", nomination("req-1"));
  assert.ok(projection);
  assert.equal(projection.itemId, "supply-req-1");
  assert.equal(projection.type, "listing");
  assert.equal(projection.lifecycle, "open");
  assert.equal(projection.cameFrom, "Sales associate on WhatsApp");
  assert.equal(projection.city, "mumbai");
  assert.equal(projection.nominatorUid, "riya");
  assert.deepEqual(projection.state, {code: "gaps", label: "1 check left", tone: "warning"});
  assert.deepEqual(projection.journey.map((step) => [step.stepId, step.title, step.tone]), [
    ["submitted", "Sales associate sent a link on WhatsApp", "ink"],
    ["page-1", "Read luma.com", "ink"],
    ["page-2", "Could not read instagram.com", "danger"],
    ["listing-built", "Built a listing", "ink"],
  ]);
});

test("a failed request is stuck, an approved one is done, an event refresh is not an item", () => {
  const stuck = projectInboxSource("supplyIntakeRequest", "req-2", nomination("req-2", {status: "failed", result: null,
    failure: {code: "page_unreadable", message: "Instagram asked to sign in.", at: "2026-10-31T11:03:00.000Z", attempts: 3}}));
  assert.equal(stuck?.type, "stuck");
  assert.equal(stuck?.state.code, "needs_person");
  assert.equal(stuck?.subtitle, "Instagram asked to sign in.");
  assert.ok(stuck?.journey.some((step) => step.stepId === "failed-3" && step.tone === "danger"));
  const approved = projectInboxSource("supplyIntakeRequest", "req-3", nomination("req-3", {approval: {approvalId: "ap", organizerId: "org",
    approvedByUid: "suvrat", approvedAt: "2026-10-31T07:50:00.000Z", materialHash: "c".repeat(64), salesOwnerUid: "riya"}}));
  assert.equal(approved?.lifecycle, "closed");
  assert.equal(approved?.closedAt, "2026-10-31T07:50:00.000Z");
  const refresh = nomination("req-4");
  (refresh.request as Record<string, unknown>).kind = "event_refresh";
  assert.equal(projectInboxSource("supplyIntakeRequest", "req-4", refresh), null);
});

test("claims, enquiries, access and imported events project to their own types", () => {
  const claim = projectInboxSource("organizerClaimRequest", "claim-1", {requestId: "claim-1", organizerId: "bhag", requesterUid: "arjun",
    requesterName: "Arjun Bhagat", requesterRole: "manager", proofUrls: ["https://instagram.com/bhag.club"], status: "pending",
    createdAt: {_seconds: 1761838320, _nanoseconds: 0}, updatedAt: {_seconds: 1761838320, _nanoseconds: 0},
    recommendation: {decision: "approve", byUid: "dev", at: "2026-10-30T09:00:00.000Z", note: "Phone verified."}},
  {organizerName: "Bhag Club", organizerCity: "in-mh-mumbai"});
  assert.equal(claim?.title, "Bhag Club");
  assert.equal(claim?.subtitle, "Claim by Arjun Bhagat, manager");
  assert.equal(claim?.city, "mumbai");
  assert.deepEqual(claim?.state, {code: "recommended", label: "Recommended: approve", tone: "success"});
  assert.deepEqual(claim?.journey.map((step) => step.stepId), ["asked", "recommended"]);
  const enquiry = projectInboxSource("salesInboundIntent", "intent-1", {source: "website", status: "needs_identity_review",
    fullName: "Harbor Social Club", city: "mumbai", createdAt: "2026-10-30T10:00:00.000Z"});
  assert.equal(enquiry?.type, "enquiry");
  assert.equal(enquiry?.cameFrom, "Host website");
  const weddings = projectInboxSource("salesInboundIntent", "intent-w", {source: "website",
    status: "needs_identity_review", fullName: "Meher Shah", city: "udaipur", programme: "weddings",
    programmeApplication: {planningCompany: "Meher Shah Weddings", weddingDate: "2026-12-12"},
    createdAt: "2026-10-30T10:00:00.000Z"});
  assert.equal(weddings?.cameFrom, "Weddings website");
  assert.equal(weddings?.subtitle, "Weddings pilot: Meher Shah Weddings, wedding from 2026-12-12");
  assert.equal(weddings?.journey[0]?.title, "Weddings pilot application from the website");
  const access = projectInboxSource("accessApplication", "uid-9", {status: "invited", role: "host", city: "in-mh-mumbai",
    submissionCount: 1, submittedAt: "2026-10-29T10:00:00.000Z", reviewedAt: "2026-10-30T10:00:00.000Z", reviewerUid: "dev"},
  {personName: "Meher"});
  assert.equal(access?.lifecycle, "closed");
  assert.equal(access?.title, "Meher");
  assert.deepEqual(access?.journey.map((step) => step.stepId), ["submitted-1", "reviewed-1"]);
  const event = projectInboxSource("externalEvent", "evt-1", {title: "Rooftop Singles Mixer", status: "active", publicationStatus: "draft",
    startTime: "2026-11-14T14:30:00.000Z", externalSource: {platform: "luma", eventUrl: "https://luma.com/rooftop"},
    discovery: {citySlug: "mumbai", manualApprovalRequired: true}, review: {decidedAt: null}, createdAt: "2026-10-29T10:00:00.000Z"},
  {organizerName: "Afterfly"});
  assert.equal(event?.type, "event");
  assert.equal(event?.cameFrom, "Luma");
  assert.equal(event?.state.code, "needs_review");
  assert.match(event?.subtitle ?? "", /^Afterfly · 14 Nov/u);
});

function websiteLead(kind: string, overrides: Record<string, unknown> = {}) {
  const payloads: Record<string, Record<string, unknown>> = {
    venue: {venue: {spaceName: "The Loft", area: "Lower Parel", capacity: "60 standing", nights: "Tuesdays"}},
    referral: {referral: {hostName: "Lantern Lane Social", hostLink: "@lanternlane", relationship: "I go to their dinners"},
      referralCredit: {status: "missing_referrer_account", referrerUid: null, referrerRole: null}},
    city_alerts: {cityAlerts: {interests: ["runs", "nights_out"]}},
  };
  return {source: "website", status: "needs_identity_review", leadKind: kind, fullName: null, phone: "+919812345678",
    city: "mumbai", createdAt: "2026-10-31T10:00:00.000Z",
    lead: {consent: {purpose: kind === "city_alerts" ? "cityNewPlans" : "leadFollowUp", version: "lead-2026-11"},
      sourcePage: "/venues/", entry: "list", ...payloads[kind]}, ...overrides};
}

test("a website lead is its own type, says its kind and waits for a WhatsApp reply", () => {
  const venue = projectInboxSource("salesInboundIntent", "lead-1", websiteLead("venue"));
  assert.equal(venue?.type, "lead");
  assert.equal(venue?.itemId, "enquiry-lead-1");
  assert.equal(venue?.title, "List a space: The Loft");
  assert.equal(venue?.subtitle, "WhatsApp +919812345678 · Lower Parel · 60 standing · Tuesdays");
  assert.equal(venue?.cameFrom, "Website /venues/");
  assert.deepEqual(venue?.state, {code: "reply_on_whatsapp", label: "Reply on WhatsApp", tone: "warning"});
  assert.equal(venue?.lifecycle, "open");
  const referral = projectInboxSource("salesInboundIntent", "lead-2", websiteLead("referral", {fullName: "Neha Shah"}));
  assert.equal(referral?.title, "Host referral: Neha Shah");
  assert.match(referral?.subtitle ?? "", /Lantern Lane Social · @lanternlane · I go to their dinners · Referrer not signed in/u);
  const alerts = projectInboxSource("salesInboundIntent", "lead-3", websiteLead("city_alerts"));
  assert.equal(alerts?.title, "New plans in their city");
  assert.equal(alerts?.subtitle, "WhatsApp +919812345678 · Runs, Nights out");
  const linked = projectInboxSource("salesInboundIntent", "lead-2", websiteLead("referral", {status: "linked",
    organizerId: "org-1", linkedBy: "dev", linkedAt: "2026-11-01T10:00:00.000Z"}));
  assert.equal(linked?.lifecycle, "closed");
  assert.equal(linked?.state.code, "linked");
});

test("staff close a lead with what they replied, and it can come back", async () => {
  const h = harness();
  await h.sync("salesInboundIntent", "lead-1", websiteLead("venue"));
  const listed = await h.list({type: "lead"});
  valid(validateList, listed);
  assert.deepEqual(listed.items.map((item) => item.itemId), ["enquiry-lead-1"]);
  assert.equal(listed.totals.types.lead, 1);
  const update = (data: Record<string, unknown>) => adminUpdateInboxItemHandler(h.request({itemId: "enquiry-lead-1",
    assigneeUid: null, snoozedUntil: null, note: null, ...data}), h.deps);
  await assert.rejects(update({action: "dismiss"}), /Say why/);
  const closed = await update({action: "dismiss", note: "Sent the venue guide on WhatsApp."});
  assert.equal(closed.item.status, "done");
  const journey = await adminGetInboxItemHandler(h.request({itemId: "enquiry-lead-1"}), h.deps);
  valid(validateGet, journey);
  assert.deepEqual(journey.journey.at(-1)?.title, "Closed");
  assert.equal(journey.journey.at(-1)?.detail, "Sent the venue guide on WhatsApp.");
  // The source stays as captured; a later write leaves the lead closed.
  await h.sync("salesInboundIntent", "lead-1", websiteLead("venue"));
  assert.equal((h.db.read("adminInboxItems/enquiry-lead-1") as {status: string}).status, "done");
  const reopened = await update({action: "reopen"});
  assert.equal(reopened.item.state.code, "reply_on_whatsapp");
});

test("staff close a host enquiry that is not a fit with a note, keep the intent, and can bring it back", async () => {
  const h = harness();
  const intent = {source: "meta_lead_ad", status: "needs_identity_review", fullName: "Meta Test Lead",
    city: "mumbai", createdAt: "2026-11-18T10:00:00.000Z"};
  h.db.write("salesInboundIntents/meta-1", intent);
  await h.sync("salesInboundIntent", "meta-1", intent);
  const update = (data: Record<string, unknown>) => adminUpdateInboxItemHandler(h.request({itemId: "enquiry-meta-1",
    assigneeUid: null, snoozedUntil: null, note: null, ...data}), h.deps);
  await assert.rejects(update({action: "dismiss"}), /Say why/);
  const closed = await update({action: "dismiss", note: "Meta test lead, not a real host."});
  assert.deepEqual([closed.item.status, closed.item.state.code, closed.item.assigneeUid], ["done", "dismissed", null]);
  const journey = await adminGetInboxItemHandler(h.request({itemId: "enquiry-meta-1"}), h.deps);
  assert.equal(journey.journey.at(-1)?.title, "Closed");
  assert.equal(journey.journey.at(-1)?.detail, "Meta test lead, not a real host.");
  const done = await h.list({scope: "done"});
  valid(validateList, done);
  assert.ok(done.items.some((item) => item.itemId === "enquiry-meta-1"), "it waits in Done");
  // Nothing is deleted: the intent stays as captured, and a later write leaves the item closed.
  assert.deepEqual(h.db.read("salesInboundIntents/meta-1"), intent);
  await h.sync("salesInboundIntent", "meta-1", intent);
  assert.equal((h.db.read("adminInboxItems/enquiry-meta-1") as {status: string}).status, "done");
  const reopened = await update({action: "reopen"});
  assert.deepEqual([reopened.item.status, reopened.item.state.code], ["waiting", "new"]);
});

const listingEvent = (overrides: Partial<ListingEventFacts> = {}): ListingEventFacts => ({
  intakeRequestId: "req-1", approvedAt: "2026-10-29T10:00:00.000Z", organizerName: "Afterfly", citySlug: "mumbai",
  eventWorkItemId: "wi-event-1", eventId: "ext-afterfly-mixer", title: "Singles mixer night", startAt: "2026-11-07T14:00:00.000Z",
  platform: "luma", sourceUrl: "https://lu.ma/afterfly-mixer", planState: "ready", blockers: [],
  findings: [{check: "dating_framing", field: "title", match: "Singles"}], ...overrides,
});

test("an unpublished event of a listing waits in the inbox under the id its document will use", () => {
  const waiting = projectListingEvent(listingEvent());
  assert.equal(waiting.itemId, "event-ext-afterfly-mixer");
  assert.equal(waiting.lifecycle, "open");
  assert.deepEqual(waiting.state, {code: "needs_review", label: "1 check left", tone: "warning"});
  assert.deepEqual(waiting.listingEvent, {intakeRequestId: "req-1", eventWorkItemId: "wi-event-1"});
  assert.equal(waiting.cameFrom, "Luma");
  assert.match(waiting.subtitle ?? "", /^Afterfly · 7 Nov/u);
  assert.match(waiting.journey[1].detail ?? "", /title says "Singles"/u);

  const ready = projectListingEvent(listingEvent({findings: []}));
  assert.deepEqual(ready.state, {code: "ready", label: "Ready to publish", tone: "success"});
  assert.equal(ready.journey.length, 1);
  const blocked = projectListingEvent(listingEvent({planState: "blocked", blockers: ["platform_not_publishable"]}));
  assert.deepEqual([blocked.lifecycle, blocked.state.code], ["open", "blocked"]);
  const ended = projectListingEvent(listingEvent({planState: "blocked", blockers: ["event_already_ended"]}));
  assert.deepEqual([ended.lifecycle, ended.state.code], ["closed", "ended"]);
});

test("a dismissal holds across source writes until someone reopens it, and only for events and stuck intake", async () => {
  const h = harness();
  const write = () => syncInboxProjection(h.firestore, projectListingEvent(listingEvent()), now);
  await write();
  const update = (data: Record<string, unknown>, itemId = "event-ext-afterfly-mixer") => adminUpdateInboxItemHandler(h.request({itemId,
    assigneeUid: null, snoozedUntil: null, note: null, ...data}), h.deps);
  await assert.rejects(update({action: "dismiss"}), /Say why/);
  await assert.rejects(update({action: "reopen"}), /Only a dismissed item/);
  const dismissed = await update({action: "dismiss", note: "A dating night, not for the page."});
  assert.equal(dismissed.item.status, "done");
  assert.equal(dismissed.item.state.code, "dismissed");
  assert.deepEqual(dismissed.item.listingEvent, {intakeRequestId: "req-1", eventWorkItemId: "wi-event-1"});

  await write();
  assert.equal((h.db.read("adminInboxItems/event-ext-afterfly-mixer") as {status: string}).status, "done", "a later sync leaves it closed");
  const reopened = await update({action: "reopen"});
  assert.deepEqual([reopened.item.status, reopened.item.state.code, reopened.item.doneAt], ["waiting", "needs_review", null]);

  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1"));
  await assert.rejects(update({action: "dismiss", note: "Not for us."}, "supply-req-1"), /Decide this item/);
});

test("a website instant draft waits for a WhatsApp reply from a person, who dismisses it once sent", async () => {
  const h = harness();
  const draft = (overrides: Record<string, unknown> = {}) => nomination("draft-1", {
    request: {...nomination("draft-1").request, kind: "self_submission", seed: {name: null,
      urls: ["https://lu.ma/afterfly"], notes: null, categories: []},
    submittedBy: {role: "organizer", uid: null, partnerId: null}, origin: {kind: "web_instant_draft", id: "web-1"}},
    instantDraft: {schemaVersion: 1, draftId: "draft-1", accessTokenHash: "c".repeat(64), requestKind: "event_link",
      entry: "event_page_tool", link: {url: "https://lu.ma/afterfly", provider: "luma", support: "instant", reason: null},
      whatsapp: {phone: "+919000000001", consentVersion: "instant-draft-whatsapp-v1", consentedAt: "2026-10-28T16:11:00.000Z",
        purpose: "instant_draft_follow_up", verifiedByUid: "submitter-1"}, followUp: {channel: "whatsapp", mode: "staff_reply"},
      outcome: null},
    ...overrides});
  const waiting = projectInboxSource("supplyIntakeRequest", "draft-1", draft())!;
  assert.deepEqual([waiting.cameFrom, waiting.lifecycle, waiting.state.code, waiting.state.label],
    ["Website draft tool", "open", "reply_on_whatsapp", "Reply on WhatsApp"]);
  assert.deepEqual(waiting.journey.find((step) => step.stepId === "whatsapp-consent")?.detail, "+919000000001");
  const saved = projectInboxSource("supplyIntakeRequest", "draft-1", draft({approval: {approvalId: "ap", organizerId: "org",
    approvedByUid: "supply-instant-draft", approvedAt: "2026-10-28T16:14:00.000Z", materialHash: "d".repeat(64),
    salesOwnerUid: "supply-instant-draft"}}))!;
  assert.deepEqual([saved.lifecycle, saved.state.label], ["open", "Draft ready, reply on WhatsApp"]);
  assert.ok(saved.journey.some((step) => step.title === "Saved as a private draft"));
  assert.equal(saved.journey.some((step) => step.stepId === "published"), false, "a draft is never shown as published");

  await h.sync("supplyIntakeRequest", "draft-1", draft());
  const dismissed = await adminUpdateInboxItemHandler(h.request({itemId: "supply-draft-1", action: "dismiss",
    assigneeUid: null, snoozedUntil: null, note: "Sent the draft link on WhatsApp."}), h.deps);
  assert.deepEqual([dismissed.item.status, dismissed.item.state.code], ["done", "dismissed"]);
});

test("the inbox lists oldest first with real totals, a page at a time", async () => {
  const h = harness();
  for (const [index, day] of ["30", "28", "29"].entries()) {
    await h.sync("supplyIntakeRequest", `req-${index}`, nomination(`req-${index}`, {request: {
      ...nomination("x").request, requestId: `req-${index}`, submittedAt: `2026-10-${day}T10:00:00.000Z`}}));
  }
  await h.sync("salesInboundIntent", "intent-1", {source: "website", status: "needs_identity_review", fullName: "Harbor",
    city: "mumbai", createdAt: "2026-10-27T10:00:00.000Z"});
  await h.sync("salesInboundIntent", "intent-2", {source: "website", status: "dismissed", fullName: "Gone",
    city: "mumbai", createdAt: "2026-10-26T10:00:00.000Z", updatedAt: "2026-10-27T10:00:00.000Z"});

  const first = await h.list({limit: 2});
  valid(validateList, first);
  assert.deepEqual(first.items.map((item) => item.itemId), ["enquiry-intent-1", "supply-req-1"]);
  assert.equal(first.totals.types.all, 4);
  assert.equal(first.totals.types.listing, 3);
  assert.equal(first.totals.types.enquiry, 1);
  assert.equal(first.totals.scopes.waiting, 4);
  assert.equal(first.oldestWaitingSince, "2026-10-27T10:00:00.000Z");
  const second = await h.list({limit: 2, cursor: first.nextCursor});
  assert.deepEqual(second.items.map((item) => item.itemId), ["supply-req-2", "supply-req-0"]);
  assert.equal(second.nextCursor, null);

  const listings = await h.list({type: "listing"});
  assert.equal(listings.items.length, 3);
  assert.equal(listings.totals.types.all, 4, "type totals stay whole while one type is shown");
  const done = await h.list({scope: "done"});
  assert.deepEqual(done.items.map((item) => item.itemId), ["enquiry-intent-2"]);
  await assert.rejects(h.list({}, {salesStaff: true}), /not authorized/);
  await assert.rejects(h.list({cursor: "bad"}), /cursor is invalid/);
});

test("assigning and snoozing keep across source writes, are audited and join the journey", async () => {
  const h = harness();
  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1"));
  h.db.write("adminRoleAssignments/karan", {roles: ["support"], status: "active"});
  const update = (data: Record<string, unknown>) => adminUpdateInboxItemHandler(h.request({itemId: "supply-req-1",
    assigneeUid: null, snoozedUntil: null, note: null, ...data}), h.deps);
  await update({action: "assign", assigneeUid: "karan"});
  await assert.rejects(update({action: "assign", assigneeUid: "stranger"}), /Catch staff/);
  await assert.rejects(update({action: "snooze", snoozedUntil: "2026-10-30T00:00:00.000Z"}), /next 30 days/);
  const snoozed = await update({action: "snooze", snoozedUntil: "2026-11-02T12:00:00.000Z", note: "Waiting on Riya"});
  assert.equal(snoozed.item.status, "snoozed");
  assert.equal(snoozed.item.assigneeUid, "karan");

  // The source changes; who holds the item and its snooze stay.
  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1", {result: {...nomination("x").result, gaps: []}}));
  const mine = await h.list({scope: "snoozed"}, {support: true}, "karan");
  assert.equal(mine.items[0].state.code, "ready");
  assert.equal(mine.items[0].status, "snoozed");
  assert.equal(mine.totals.scopes.waiting, 0);

  assert.equal(await wakeSnoozedInboxItems(h.firestore, new Date("2026-11-02T12:30:00.000Z")), 1);
  const karan = await h.list({scope: "mine"}, {support: true}, "karan");
  assert.deepEqual(karan.items.map((item) => item.itemId), ["supply-req-1"]);

  const detail = await adminGetInboxItemHandler(h.request({itemId: "supply-req-1"}), h.deps);
  valid(validateGet, detail);
  assert.deepEqual(detail.journey.map((step) => step.title), [
    "Sales associate sent a link on WhatsApp", "Read luma.com", "Could not read instagram.com", "Built a listing",
    "Assigned", "Snoozed", "Snooze ended",
  ]);
  assert.equal(detail.canWork, true);
  const audits = h.db.entries().filter(([path]) => path.startsWith("adminAuditLogs/"));
  assert.equal(audits.length, 2);
});

test("a decided item leaves the queue and refuses staff actions", async () => {
  const h = harness();
  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1"));
  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1", {approval: {approvalId: "ap", organizerId: "org",
    approvedByUid: "dev", approvedAt: "2026-10-31T11:00:00.000Z", materialHash: "c".repeat(64), salesOwnerUid: "riya"}}));
  assert.equal((await h.list({})).totals.scopes.waiting, 0);
  const done = await h.list({scope: "done"});
  assert.equal(done.items[0].doneAt, "2026-10-31T11:00:00.000Z");
  await assert.rejects(adminUpdateInboxItemHandler(h.request({itemId: "supply-req-1", action: "wake",
    assigneeUid: null, snoozedUntil: null, note: null}), h.deps), /already done/);
  // A repeated write adds no step and leaves the item as it is.
  const again = await h.sync("supplyIntakeRequest", "req-1", nomination("req-1", {approval: {approvalId: "ap", organizerId: "org",
    approvedByUid: "dev", approvedAt: "2026-10-31T11:00:00.000Z", materialHash: "c".repeat(64), salesOwnerUid: "riya"}}), new Date("2026-11-01T00:00:00.000Z"));
  assert.deepEqual(again, {itemId: "supply-req-1", outcome: "unchanged", addedSteps: 0});
  // A deleted source closes its item.
  await h.sync("salesInboundIntent", "intent-1", {source: "website", status: "needs_identity_review", fullName: "Harbor",
    city: "mumbai", createdAt: "2026-10-27T10:00:00.000Z"});
  await h.sync("salesInboundIntent", "intent-1", undefined);
  assert.equal((h.db.read("adminInboxItems/enquiry-intent-1") as {state: {code: string}}).state.code, "removed");
});

test("a sales associate reads only what they nominated", async () => {
  const h = harness();
  await h.sync("supplyIntakeRequest", "req-1", nomination("req-1"));
  const own = await adminGetInboxItemHandler(h.request({itemId: "supply-req-1"}, {salesStaff: true}, "riya"), h.deps);
  assert.equal(own.canWork, false);
  await assert.rejects(adminGetInboxItemHandler(h.request({itemId: "supply-req-1"}, {salesStaff: true}, "karan"), h.deps), /not found/);
});

test("the nightly reconcile projects every source and the people index, and a rerun changes nothing", async () => {
  const h = harness();
  h.db.write("supplyIntakeRequests/req-1", nomination("req-1"));
  h.db.write("supplyIntakeRequests/req-2", nomination("req-2", {status: "failed", result: null,
    failure: {code: "page_unreadable", message: "Sign-in wall.", at: "2026-10-31T11:03:00.000Z", attempts: 1}}));
  h.db.write("salesInboundIntents/intent-1", {source: "website", status: "needs_identity_review", fullName: "Harbor",
    city: "mumbai", createdAt: "2026-10-27T10:00:00.000Z"});
  h.db.write("users/riya", {name: "Riya Sharma", phoneNumber: "+919820040000"});
  const first = await reconcileAdminInbox(h.firestore, () => now, 1);
  assert.deepEqual({...first, scanned: undefined}, {scanned: undefined, written: 4, failed: 0, truncated: []});
  assert.equal((h.db.read("adminInboxItems/supply-req-2") as {type: string}).type, "stuck");
  assert.ok(h.db.read("adminPeopleIndex/riya"));
  const again = await reconcileAdminInbox(h.firestore, () => new Date("2026-11-01T00:00:00.000Z"), 1);
  assert.equal(again.written, 0);
  // A source with more documents than the limit says so; one that fits exactly does not.
  assert.deepEqual((await reconcileAdminInbox(h.firestore, () => now, 1, 1)).truncated, ["supplyIntakeRequest"]);
});
