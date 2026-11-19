/* eslint-disable max-len */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {listingSuppressionHmacKey} from "../listingSuppressions/registry";
import {classifyDraftLink, InvalidDraftLink, parseDraftLink, type DraftLinkClassification} from "../instantDrafts/links";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {createPrivateEventSetup} from "../events/progressiveSetup/service";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import type {ImportEventFromLinkCallablePayload} from
  "../shared/generated/importEventFromLinkCallablePayload";
import type {ImportEventFromLinkCallableResponse} from
  "../shared/generated/importEventFromLinkCallableResponse";
import {validateImportEventFromLinkCallablePayload} from
  "../shared/generated/validators/importEventFromLinkInput";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandReceiptKey,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";
import {assertSameTryItRead, readTryItEvents, readTryItLink, tryItReadRequestId, type TryItEvent} from "./linkRead";
import {readTryItWorkspace, stageTryItWorkspace, type WorkspaceLookup} from "./workspace";

// Command event.import-from-link (contracts/commands/catalog.json; #2062 C2).
// A phone-verified visitor with a try-it workspace sends one public event page
// or calendar. The first preview with an idempotency key starts the same
// Supply Intake read organizer.import-from-link uses (linkRead.ts) and
// answers running. Previewing again lists the upcoming events the page shows;
// with input.eventKey it answers the private draft event apply would create.
// Apply creates it through createPrivateEventSetup, the path the Host app's
// event setup takes, in the workspace's own city and timezone. The draft is
// private: nothing publishes, takes bookings or messages anyone, and checkout,
// venue and the rest are set in the Host app's setup steps.

export const COMMAND_ID = "event.import-from-link";
const POLL_MS = 2_000;
const HOUR_MS = 60 * 60 * 1000;
const LIST_EVENTS = 10;
const READ_EVENTS = 50;
const READ_LIMITS = {phone: "importEventFromLinkRead", address: "importEventFromLinkAddress",
  daily: "importEventFromLinkDaily"};

type Response = ImportEventFromLinkCallableResponse;
type Proposal = NonNullable<Response["result"]["proposal"]>;
type Data = Record<string, unknown>;

export interface ImportEventFromLinkDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: ImportEventFromLinkDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  checkRateLimit: defaultCheckRateLimit,
};

interface Context {
  uid: string;
  input: {link: string; eventKey: string | null};
  link: DraftLinkClassification;
  host: string;
  commandKey: string;
  requestId: string;
}

/** What a preview found: the listed events, and the draft for the chosen one. */
interface Found {
  organizerId: string;
  events: TryItEvent[];
  proposal: Proposal | null;
  reasons: string[];
  hash: string;
}

export async function importEventFromLinkHandler(request: CallableRequest<unknown>,
  deps: ImportEventFromLinkDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<ImportEventFromLinkCallablePayload>(request,
    validateImportEventFromLinkCallablePayload);
  let url: URL;
  try {
    url = parseDraftLink(data.input.link);
  } catch (error) {
    if (error instanceof InvalidDraftLink) throw new HttpsError("invalid-argument", error.message);
    throw error;
  }
  const commandKey = commandReceiptKey(caller.uid, data.idempotencyKey);
  const ctx: Context = {uid: caller.uid, input: {link: url.href, eventKey: data.input.eventKey ?? null},
    link: classifyDraftLink("event_link", url), host: url.hostname.replace(/^www\./u, ""), commandKey,
    // Seeded with the command so a key reused across commands reads separately.
    requestId: tryItReadRequestId([COMMAND_ID, commandKey])};
  const db = deps.firestore();
  // Previews poll every two seconds while a page is read.
  await deps.checkRateLimit(db, caller.uid, "importEventFromLink", {maxRequests: 900, windowMs: HOUR_MS});

  if (data.mode === "apply") return apply(db, deps, ctx, data);

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
  if (lookup.kind === "new") return respond(ctx, "needs_input", {reasons: ["no_workspace"]});
  const organizerId = workspaceOrganizerId(lookup);
  if (ctx.link.support === "staff_follow_up") {
    return respond(ctx, "refused", {organizerId, reasons: [ctx.link.reason ?? "no_adapter"]});
  }
  const organizer = lookup.organizer;
  const read = await readTryItLink(db, deps, request, {uid: caller.uid, phone: caller.phone,
    commandKey: ctx.commandKey, requestId: ctx.requestId, link: {url: ctx.input.link, classification: ctx.link},
    organizerId, organizerMarketId: marketIdOf(organizer), surface: data.surface, limits: READ_LIMITS});
  if (read.state === "running") return respond(ctx, "running", {organizerId});
  if (read.state === "refused") return respond(ctx, "refused", {organizerId, reasons: [read.reason]});
  const found = await findDraft(db, deps, ctx, organizerId, organizer, read.stored);
  return respond(ctx, statusFor(found), {organizerId, events: found.events, proposal: found.proposal,
    reasons: found.reasons, hash: found.hash});
}

export const importEventFromLink = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey],
  {maxInstances: 10}), (request) => importEventFromLinkHandler(request));

/**
 * Apply: replay a finished apply, recompute the preview, refuse a changed one,
 * create the draft through event setup, then record the receipt.
 */
async function apply(db: FirebaseFirestore.Firestore, deps: ImportEventFromLinkDeps, ctx: Context,
  data: ImportEventFromLinkCallablePayload): Promise<Response> {
  const now = deps.now();
  const requestHash = commandRequestHash(COMMAND_ID, ctx.uid, ctx.input, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, ctx.uid, data.idempotencyKey);
  const replay = await db.runTransaction((tx) => replayCommand<Response>(tx, db, {commandId: COMMAND_ID,
    uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()}));
  if (replay) return {...replay.response, status: "replayed" as const};

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, ctx.uid), {readOnly: true});
  if (lookup.kind === "new") {
    throw new HttpsError("failed-precondition", "Set up your organizer profile first.", {reason: "no_workspace"});
  }
  const organizerId = workspaceOrganizerId(lookup);
  const stored = (await db.collection(supplyIntakeCollections.requests).doc(ctx.requestId).get()).data();
  if (!stored || stored.status !== "completed") {
    throw new HttpsError("failed-precondition", "Preview this link until it is read, then apply.", {reason: "not_ready"});
  }
  assertSameTryItRead(stored, ctx.uid, ctx.input.link);
  const found = await findDraft(db, deps, ctx, organizerId, lookup.organizer, stored);
  if (!found.proposal) {
    throw new HttpsError("failed-precondition", "Choose an upcoming event from this page first.",
      {reason: found.reasons[0] ?? "choose_event"});
  }
  assertConfirmMatches(COMMAND_ID, data.confirm, found.hash);
  const proposal = found.proposal;

  // Event setup keeps its own receipt per request id, so a retry after an
  // unknown outcome returns the same draft rather than a second one.
  const setup = await createPrivateEventSetup({actorUid: ctx.uid, command: {organizerId,
    requestId: setupRequestId(ctx.commandKey), basics: {name: proposal.name,
      city: {mode: "set", value: {cityId: proposal.cityId, marketId: proposal.marketId}},
      localDate: proposal.localDate, localStartTime: proposal.localStartTime,
      timezone: {mode: "set", value: proposal.timezone}}},
  deps: {db, timestampFromMillis: deps.timestampFromMillis, serverTimestamp: deps.serverTimestamp}});

  return db.runTransaction(async (tx) => {
    const again = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid: ctx.uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (again) return {...again.response, status: "replayed" as const};
    const current = await readTryItWorkspace(tx, db, ctx.uid);
    await stageTryItWorkspace(tx, db, current, {uid: ctx.uid, now, commandId: COMMAND_ID, surface: data.surface,
      organizerName: typeof lookup.organizer.name === "string" ? lookup.organizer.name : "Organizer", marketId: "",
      serverTimestamp: deps.serverTimestamp, draftEventId: setup.eventId});
    const applied = respond(ctx, "applied", {organizerId, events: [], proposal, reasons: [], hash: found.hash,
      receiptId, eventId: setup.eventId});
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    return applied;
  });
}

/** The upcoming events the read found, and the draft for the chosen one. */
async function findDraft(db: FirebaseFirestore.Firestore, deps: ImportEventFromLinkDeps, ctx: Context,
  organizerId: string, organizer: Data, stored: Data): Promise<Found> {
  const nowIso = deps.now().toISOString();
  const events = (await readTryItEvents(db, stored, READ_EVENTS))
    .filter((event) => Number.isFinite(Date.parse(event.startAt)) && new Date(event.startAt).toISOString() > nowIso)
    .slice(0, LIST_EVENTS);
  const market = marketForIdOrAlias(marketIdOf(organizer));
  const base = {organizerId, events};
  const hashOf = (evidence: unknown) => commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, evidence);
  if (events.length === 0) return {...base, proposal: null, reasons: ["no_upcoming_events"], hash: hashOf({reasons: ["no_upcoming_events"]})};
  if (!market || !market.eventCreatable) return {...base, proposal: null, reasons: ["city_unavailable"], hash: hashOf({reasons: ["city_unavailable"]})};
  const chosen = ctx.input.eventKey ? events.find((event) => event.eventKey === ctx.input.eventKey) ?? null :
    events.length === 1 ? events[0] : null;
  if (!chosen) {
    const reasons = [ctx.input.eventKey ? "event_not_found" : "choose_event"];
    return {...base, proposal: null, reasons, hash: hashOf({reasons, events: events.map((event) => event.eventKey)})};
  }
  const local = localDateTime(chosen.startAt, market.timeZone);
  const proposal: Proposal = {eventKey: chosen.eventKey, name: (chosen.title ?? "Imported event").slice(0, 120),
    localDate: local.date, localStartTime: local.time, timezone: market.timeZone, cityId: market.cityId,
    marketId: market.marketId, venue: chosen.venue, sourceUrl: chosen.sourceUrl};
  return {...base, proposal, reasons: [], hash: hashOf({proposal, runId: ctx.requestId})};
}

function statusFor(found: Found): Response["status"] {
  if (found.proposal) return "previewed";
  return found.reasons[0] === "choose_event" || found.reasons[0] === "event_not_found" ? "needs_input" : "refused";
}

/** The date and minute an instant falls on in a timezone. */
export function localDateTime(instant: string, timeZone: string): {date: string; time: string} {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {timeZone, calendar: "gregory", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"})
    .formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return {date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`};
}

/** Event setup's request id for this command key: one draft per key. */
function setupRequestId(commandKey: string): string {
  return `tryitevent-${createHash("sha256").update(commandKey).digest("hex").slice(0, 40)}`;
}

function marketIdOf(organizer: Data): string | null {
  for (const value of [organizer.locationMarketId, organizer.location]) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function workspaceOrganizerId(lookup: WorkspaceLookup): string {
  return lookup.kind === "existing" ? lookup.pointer.organizerId : lookup.organizerId;
}

function respond(ctx: Context, status: Response["status"], options: {organizerId?: string | null;
  events?: TryItEvent[]; proposal?: Proposal | null; reasons?: string[]; hash?: string; receiptId?: string;
  eventId?: string}): Response {
  const proposal = options.proposal ?? null;
  const reasons = options.reasons ?? [];
  const events = (options.events ?? []).map((event) => ({eventKey: event.eventKey, title: event.title,
    startAt: event.startAt, venue: event.venue}));
  const eventId = options.eventId ?? null;
  return {
    commandId: COMMAND_ID, status,
    previewHash: options.hash ?? commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {status, reasons}),
    summary: summaryFor(ctx, status, proposal, events.length, reasons),
    effects: status === "applied" && proposal && eventId ? [{kind: "draft_event", ref: `events/${eventId}`,
      label: `Private draft: ${proposal.name}`.slice(0, 200)}] : [],
    next: reasons.includes("no_workspace") ? [{commandId: "workspace.ensure", label: "Set up your organizer profile"}] : [],
    receiptId: options.receiptId ?? null,
    result: {organizerId: options.organizerId ?? null,
      runId: status === "needs_input" && reasons.includes("no_workspace") ? null : ctx.requestId,
      link: ctx.link, events, proposal, eventId, reasons, pollAfterMs: status === "running" ? POLL_MS : null},
  };
}

const REFUSALS: Record<string, string> = {
  signed_in_site: "This site needs a sign-in, so we can't read it.",
  chat_invite: "Chat invites can't be read. Send the event page instead.",
  short_link: "Short links hide where they go. Send the full link instead.",
  no_adapter: "We can't read this platform yet. Try the event's Luma or District page.",
  listing_suppressed: "Catch can't make events for this organizer. Contact support if you think this is a mistake.",
  link_unreadable: "We couldn't read this page. Check the link is public, or try another one.",
  no_upcoming_events: "We didn't find an upcoming event on this page.",
  city_unavailable: "Your profile's city isn't open for events yet.",
};

function summaryFor(ctx: Context, status: Response["status"], proposal: Proposal | null, eventCount: number,
  reasons: string[]): Response["summary"] {
  if (status === "running") return {headline: `Reading ${ctx.host}…`, lines: ["This usually takes under a minute."]};
  if (status === "refused") {
    return {headline: "We can't draft an event from this link.", lines: [REFUSALS[reasons[0]] ?? REFUSALS.link_unreadable]};
  }
  if (reasons.includes("no_workspace")) {
    return {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your event."]};
  }
  if (!proposal) {
    return {headline: `We found ${eventCount} upcoming events.`, lines: [reasons[0] === "event_not_found" ?
      "That event isn't on this page any more. Choose another." : "Choose the one to draft."]};
  }
  const when = `${proposal.localDate} at ${proposal.localStartTime}`;
  const lines = [`On ${when}.`, "It stays private: no one can see or book it until you publish it."];
  if (proposal.venue) lines.splice(1, 0, `At ${proposal.venue}. Add the venue in Details to show it.`);
  return status === "previewed" ?
    {headline: `We'll draft "${proposal.name}".`.slice(0, 200), lines} :
    {headline: `"${proposal.name}" is a private draft in your profile.`.slice(0, 200),
      lines: ["Finish the details, tickets and questions in the Host app."]};
}
