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
