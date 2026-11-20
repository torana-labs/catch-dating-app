/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {importEventFromLinkHandler, localDateTime} from "./importEventFromLink";
import {importOrganizerFromLinkHandler} from "./importOrganizerFromLink";
import {tryItWorkspaceOrganizerId} from "./workspace";

// The do-not-list probe loads the packaged Operations runtime from lib.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const NOW = "2026-11-18T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795075200, _nanoseconds: 0};
const UID = "visitor-1";
const PHONE = "+919000000002";
const KEY = "event-import-0001";
const LINK = "https://lu.ma/driftwood-social";
const ORGANIZER_ID = tryItWorkspaceOrganizerId(UID, 1);

const validate = contractValidator("ImportEventFromLinkCallableResponse");
function valid(value: unknown, label: string) {
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}

function harness() {
  const db = new FakeFirestore();
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(NOW),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: () => SERVER_TIME,
    timestampFromMillis: (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0}) as unknown as
      FirebaseFirestore.Timestamp,
    checkRateLimit: (async () => undefined) as never,
  };
  return {db, deps};
}

function call(data: unknown) {
  return {data, auth: {uid: UID, token: {phone_number: PHONE}}, rawRequest: {headers: {}, ip: "198.51.100.7"}} as
    unknown as CallableRequest<unknown>;
}

const envelope = (mode: "preview" | "apply", input: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: {link: LINK, ...input}, ...extra});

async function withWorkspace() {
  const h = harness();
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), h.deps);
  return h;
}

const requestKey = (db: FakeFirestore) =>
  db.entries().find(([key]) => key.startsWith("supplyIntakeRequests/"))?.[0] ?? "";

const EVENTS = [
  {id: "item-past", title: "Last week's run", startAt: "2026-11-10T01:30:00.000Z"},
  {id: "item-run", title: "Sunday sea-face run", startAt: "2026-11-23T01:30:00.000Z", venue: "Sea Face Promenade"},
  {id: "item-social", title: "Friday coffee social", startAt: "2026-11-28T12:30:00.000Z"},
];

/** What the worker leaves behind when the read finishes. */
function finishRead(db: FakeFirestore, events = EVENTS) {
  const key = requestKey(db);
  db.write(key, {...db.read(key)!, status: "completed", result: {runId: "run-1", listingId: "listing-1",
    listingWorkItemId: "item-listing", eventWorkItemIds: events.map((event) => event.id), eventCount: events.length}});
  for (const event of events) {
    db.write(`operationWorkItems/${event.id}`, {normalizedPayload: {intake: {event: {title: event.title,
      startAt: event.startAt, endAt: null, venue: (event as {venue?: string}).venue ?? null,
      sourceUrl: `https://lu.ma/driftwood-${event.id}`}}}});
  }
}

const drafts = (db: FakeFirestore) => db.entries().filter(([key]) => /^events\/[^/]+$/u.test(key));

test("an instant converts to the market's local date and minute", () => {
  assert.deepEqual(localDateTime("2026-11-23T01:30:00.000Z", "Asia/Kolkata"), {date: "2026-11-23", time: "07:00"});
  assert.deepEqual(localDateTime("2026-11-28T20:00:00+05:30", "Asia/Kolkata"), {date: "2026-11-28", time: "20:00"});
});

test("without a workspace it asks for one; a chat link is refused before anything is read", async () => {
  const bare = harness();
  const none = await importEventFromLinkHandler(call(envelope("preview")), bare.deps);
  valid(none, "no workspace");
  assert.deepEqual([none.status, none.result.reasons, none.next[0]?.commandId], ["needs_input", ["no_workspace"], "workspace.ensure"]);
  const {db, deps} = await withWorkspace();
  const chat = await importEventFromLinkHandler(call(envelope("preview", {link: "https://wa.me/919000000000"})), deps);
  valid(chat, "chat link");
  assert.equal(chat.status, "refused");
  assert.equal(requestKey(db), "");
});

test("the page's upcoming events are listed, and the chosen one previews as a private draft", async () => {
  const {db, deps} = await withWorkspace();
  const running = await importEventFromLinkHandler(call(envelope("preview")), deps);
  valid(running, "running");
  assert.equal(running.status, "running");
  assert.match(running.result.runId ?? "", /^tryit-[a-f0-9]{40}$/u);
  assert.equal(((db.read(requestKey(db))!.request as {origin: {kind: string}}).origin).kind, "try_it_import");
  finishRead(db);

  const choose = await importEventFromLinkHandler(call(envelope("preview")), deps);
  valid(choose, "choose");
  assert.equal(choose.status, "needs_input");
  assert.deepEqual(choose.result.reasons, ["choose_event"]);
  assert.deepEqual(choose.result.events.map((event) => event.eventKey), ["item-run", "item-social"], "past events are left out");

  const preview = await importEventFromLinkHandler(call(envelope("preview", {eventKey: "item-run"})), deps);
  valid(preview, "previewed");
  assert.equal(preview.status, "previewed");
  assert.deepEqual(preview.result.proposal, {eventKey: "item-run", name: "Sunday sea-face run", localDate: "2026-11-23",
    localStartTime: "07:00", timezone: "Asia/Kolkata", cityId: preview.result.proposal?.cityId, marketId: "in-mh-mumbai",
    venue: "Sea Face Promenade", sourceUrl: "https://lu.ma/driftwood-item-run"});
  assert.equal(drafts(db).length, 0, "a preview writes no event");
});

test("apply creates one private draft event in the workspace and replays it", async () => {
  const {db, deps} = await withWorkspace();
  await importEventFromLinkHandler(call(envelope("preview", {eventKey: "item-run"})), deps);
  finishRead(db);
  const preview = await importEventFromLinkHandler(call(envelope("preview", {eventKey: "item-run"})), deps);
  await assert.rejects(importEventFromLinkHandler(call(envelope("apply", {eventKey: "item-run"},
    {confirm: {commandId: "event.import-from-link", previewHash: "f".repeat(64)}})), deps), {code: "aborted"});
  const confirm = {commandId: "event.import-from-link", previewHash: preview.previewHash};
  const applied = await importEventFromLinkHandler(call(envelope("apply", {eventKey: "item-run"}, {confirm})), deps);
  valid(applied, "applied");
  assert.equal(applied.status, "applied");
  const eventId = applied.result.eventId!;
  const event = db.read(`events/${eventId}`)!;
  assert.equal(event.organizerId, ORGANIZER_ID);
  assert.equal(event.name, "Sunday sea-face run");
  assert.deepEqual([event.publicationState, event.publicRegistrationEnabled, event.status], ["private", false, "active"]);
  assert.deepEqual([event.eventLocalDate, event.eventLocalStartTime, event.eventTimezone], ["2026-11-23", "07:00", "Asia/Kolkata"]);
  assert.deepEqual(applied.effects, [{kind: "draft_event", ref: `events/${eventId}`, label: "Private draft: Sunday sea-face run"}]);
  assert.deepEqual(db.read(`tryItWorkspaces/${UID}`)?.tryItEventIds, [eventId], "recorded as a try-it draft");

  const replay = await importEventFromLinkHandler(call(envelope("apply", {eventKey: "item-run"}, {confirm})), deps);
  assert.equal(replay.status, "replayed");
  assert.equal(replay.result.eventId, eventId);
  assert.equal(drafts(db).length, 1, "one draft per key");
});

test("a page with no upcoming events is refused, and keys stay separate from organizer imports", async () => {
  const {db, deps} = await withWorkspace();
  await importEventFromLinkHandler(call(envelope("preview")), deps);
  finishRead(db, [EVENTS[0]]);
  const none = await importEventFromLinkHandler(call(envelope("preview")), deps);
  valid(none, "no upcoming");
  assert.deepEqual([none.status, none.result.reasons], ["refused", ["no_upcoming_events"]]);
  // The same idempotency key on organizer.import-from-link reads into its own request.
  const organizerImport = await importOrganizerFromLinkHandler(call({mode: "preview", idempotencyKey: KEY,
    surface: "website", input: {link: LINK}}), deps);
  assert.equal(organizerImport.status, "running");
  assert.notEqual(organizerImport.result.runId, none.result.runId);
});

// AI fallback (#2062, step 6) ------------------------------------------------

type AiRequest = {task: string; commandId: string; input: Record<string, unknown>};

/** A switched-on AI fallback that answers [output], counting its reads. */
function fakeAi(answer: {status: "read"; output: unknown} | {status: "refused"; reason: string} | {status: "off"}) {
  const reads: AiRequest[] = [];
  return {reads, aiFallback: () => ({enabled: async () => true, read: async (request: AiRequest) => {
    reads.push(request);
    return answer.status === "read" ? {...answer, cacheHit: reads.length > 1} : answer;
  }}) as never};
}

const PAGE_TEXT = "Harbour Lights Supper Club. Next dinners: Thursday 26 November 2026, 8pm at The Lantern Room. Earlier: 2 November.";

/** A finished read whose adapters found nothing, with the page's stored snapshot. */
function finishEmptyRead(db: FakeFirestore, link = LINK) {
  const key = requestKey(db);
  const requestId = key.split("/")[1];
  const ref = `supply-intake/snapshots/${requestId}/${"e".repeat(64)}.json`;
  db.write(key, {...db.read(key)!, status: "completed", result: {runId: "run-1", listingId: "listing-1",
    listingWorkItemId: "item-listing", eventWorkItemIds: [], eventCount: 0, snapshotRefs: [ref]}});
  const snapshots: Record<string, Record<string, unknown>> = {[ref]: {url: link, finalUrl: link, title: "Supper club", text: PAGE_TEXT}};
  return async (path: string) => snapshots[path] ?? null;
}

const AI_EVENTS = {events: [
  {title: "November dinner", startDate: "2026-11-26", startTime: "20:00", venue: "The Lantern Room"},
  {title: "Past dinner", startDate: "2026-11-02", startTime: "20:00", venue: ""},
  {title: "No time given", startDate: "2026-12-03", startTime: "", venue: ""},
]};

test("AI fallback: a page the adapters read no event from is read from its stored text, marked for review", async () => {
  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: AI_EVENTS});
  const withAi = {...deps, ...ai} as typeof deps;
  await importEventFromLinkHandler(call(envelope("preview")), withAi);
  const readSnapshot = finishEmptyRead(db);
  const aiDeps = {...withAi, readSnapshot};

  const preview = await importEventFromLinkHandler(call(envelope("preview")), aiDeps);
  valid(preview, "ai previewed");
  assert.equal(preview.status, "previewed", "one upcoming event with a time is chosen for the visitor");
  assert.equal(preview.result.aiRead, true);
  assert.deepEqual(preview.result.reviewFields, ["name", "localDate", "localStartTime", "venue"]);
  assert.deepEqual({...preview.result.proposal, cityId: null}, {eventKey: preview.result.proposal?.eventKey, name: "November dinner",
    localDate: "2026-11-26", localStartTime: "20:00", timezone: "Asia/Kolkata", cityId: null, marketId: "in-mh-mumbai",
    venue: "The Lantern Room", sourceUrl: LINK});
  assert.match(preview.result.proposal?.eventKey ?? "", /^ai_[a-f0-9]{24}$/u);
  assert.ok(preview.summary.lines.some((line) => line.includes("read this page automatically")));
  assert.deepEqual(ai.reads.map((read) => [read.task, read.commandId]), [["event-page-reading", "event.import-from-link"]]);
  assert.deepEqual(ai.reads[0].input, {pageTitle: "Supper club", pageText: PAGE_TEXT}, "page text only");

  const applied = await importEventFromLinkHandler(call(envelope("apply", {}, {confirm: {commandId: "event.import-from-link",
    previewHash: preview.previewHash}})), aiDeps);
  valid(applied, "ai applied");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.aiRead, true);
  const event = db.read(`events/${applied.result.eventId}`)!;
  assert.deepEqual([event.name, event.eventLocalDate, event.eventLocalStartTime, event.publicationState],
    ["November dinner", "2026-11-26", "20:00", "private"]);
  assert.equal(ai.reads.length, 2, "apply asks again with the same input, which the fallback's cache answers");
  assert.deepEqual(ai.reads[1].input, ai.reads[0].input);
});

test("AI fallback: off, it answers exactly as before; on, its refusals and empty reads are plain reasons", async () => {
  const off = await withWorkspace();
  await importEventFromLinkHandler(call(envelope("preview")), off.deps);
  finishEmptyRead(off.db);
  const before = await importEventFromLinkHandler(call(envelope("preview")), off.deps);
  valid(before, "off");
  assert.deepEqual([before.status, before.result.reasons, before.result.aiRead], ["refused", ["no_upcoming_events"], false]);

  for (const [answer, reason] of [
    [{status: "refused", reason: "ai_cap_reached"}, "ai_cap_reached"],
    [{status: "refused", reason: "ai_daily_limit"}, "ai_daily_limit"],
    [{status: "read", output: {events: []}}, "ai_unreadable"],
    [{status: "read", output: {events: [AI_EVENTS.events[1]]}}, "no_upcoming_events"],
    [{status: "off"}, "no_upcoming_events"],
  ] as const) {
    const {db, deps} = await withWorkspace();
    const ai = fakeAi(answer as never);
    await importEventFromLinkHandler(call(envelope("preview")), {...deps, ...ai} as typeof deps);
    const readSnapshot = finishEmptyRead(db);
    const response = await importEventFromLinkHandler(call(envelope("preview")), {...deps, ...ai, readSnapshot} as typeof deps);
    valid(response, reason);
    assert.deepEqual([response.status, response.result.reasons], ["refused", [reason]], JSON.stringify(answer));
    assert.notEqual(response.summary.lines[0], "We couldn't read this page. Check the link is public, or try another one.");
  }

  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: AI_EVENTS});
  await importEventFromLinkHandler(call(envelope("preview")), {...deps, ...ai} as typeof deps);
  finishEmptyRead(db);
  const noSnapshot = await importEventFromLinkHandler(call(envelope("preview")), {...deps, ...ai,
    readSnapshot: async () => null} as typeof deps);
  assert.deepEqual(noSnapshot.result.reasons, ["ai_unreadable"]);
  assert.equal(ai.reads.length, 0, "no page text, no paid read");
});

test("AI fallback: a public platform with no adapter is read only when the fallback is on", async () => {
  const link = "https://partiful.com/e/harbour-lights";
  const off = await withWorkspace();
  const refused = await importEventFromLinkHandler(call(envelope("preview", {link})), off.deps);
  valid(refused, "no adapter, off");
  assert.deepEqual([refused.status, refused.result.reasons], ["refused", ["platform_adapter_missing"]]);
  assert.equal(refused.summary.lines[0], "We can't read this platform yet. Try the event's Luma or District page.");
  assert.equal(requestKey(off.db), "");

  const {db, deps} = await withWorkspace();
  const ai = fakeAi({status: "read", output: AI_EVENTS});
  const running = await importEventFromLinkHandler(call(envelope("preview", {link})), {...deps, ...ai} as typeof deps);
  valid(running, "no adapter, on");
  assert.equal(running.status, "running");
  assert.deepEqual(running.result.link, {provider: "partiful", support: "best_effort", reason: "ai_fallback"});
  assert.notEqual(requestKey(db), "", "the read goes through Supply Intake, with its do-not-list check");

  const closed = await importEventFromLinkHandler(call(envelope("preview", {link: "https://wa.me/919000000000"})),
    {...deps, ...ai} as typeof deps);
  assert.deepEqual(closed.result.reasons, ["chat_invite"], "closed sites stay staff follow-up");
});
