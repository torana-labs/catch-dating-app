/* eslint-disable max-len */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {listingSuppressionHmacKey} from "../listingSuppressions/registry";
import {InvalidDraftLink, parseDraftLink, type DraftLinkClassification} from "../instantDrafts/links";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import type {ImportOrganizerFromLinkCallablePayload} from
  "../shared/generated/importOrganizerFromLinkCallablePayload";
import type {ImportOrganizerFromLinkCallableResponse} from
  "../shared/generated/importOrganizerFromLinkCallableResponse";
import {validateImportOrganizerFromLinkCallablePayload} from
  "../shared/generated/validators/importOrganizerFromLinkInput";
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
import {classifyOrganizerLink, instagramHandle} from "./organizerLinks";
import {readTryItWorkspace, stageTryItWorkspace, type WorkspaceLookup} from "./workspace";
import {assertSameTryItRead, readTryItEvents, readTryItLink, tryItReadRequestId} from "./linkRead";
import {aiOrganizerRequest, importAiOrganizer, lazyPageAi, sharedPageAiFallback, storageSnapshotReader, storedPageInput,
  type AiOrganizer, type LazyPageAi, type PageAiDeps} from "./aiPage";

// Command organizer.import-from-link (contracts/commands/catalog.json; #2060).
// A phone-verified visitor with a try-it workspace sends one public link. The
// first preview with an idempotency key writes a Supply Intake request (origin
// try_it_import) and answers running; the Supply Intake worker reads it from
// the website tools' page allowance. Previewing again with the same key reads the
// finished listing back and answers what apply would write into the workspace,
// or that the page belongs to an organizer Catch already lists (the visitor's
// own workspace never counts). Apply writes the reviewed fields and records
// where they came from; an imported Instagram or Luma identity stays
// unverified until proven, and the page cannot be published before that.
// Imported events stay work items: they publish through the existing event
// checks when the owner publishes the page. Nothing here publishes.
//
// With the AI fallback switched on (aiPage.ts, #2062), a page the adapters
// read nothing from, or a public platform with no adapter yet, is read by the
// AI from the stored page text for the organizer's name and description only;
// both are marked for the host to check (reviewFields). The AI never adds
// events, links or identities.

export const COMMAND_ID = "organizer.import-from-link";
const POLL_MS = 2_000;
const HOUR_MS = 60 * 60 * 1000;
// The read budgets keep the limiter names they had before the reader moved.
const READ_LIMITS = {phone: "importOrganizerFromLinkRead", address: "importOrganizerFromLinkAddress",
  daily: "importOrganizerFromLinkDaily"};
const PREVIEW_EVENTS = 10;
const MAX_SOURCES = 8;
const MAX_TAGS = 12;

type Response = ImportOrganizerFromLinkCallableResponse;
type Result = Response["result"];
type Proposal = NonNullable<Result["proposal"]>;
type Match = NonNullable<Result["match"]>;
type Data = Record<string, unknown>;

export interface ImportOrganizerFromLinkDeps extends PageAiDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromDate: (date: Date) => unknown;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: ImportOrganizerFromLinkDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
  checkRateLimit: defaultCheckRateLimit,
  aiFallback: () => sharedPageAiFallback(),
  readSnapshot: storageSnapshotReader(),
};

interface Context {
  uid: string;
  input: {link: string; useImportedName: boolean};
  link: DraftLinkClassification;
  host: string;
  commandKey: string;
  requestId: string;
  /** The AI fallback when it is switched on, checked at most once. */
  ai: LazyPageAi;
}

export async function importOrganizerFromLinkHandler(request: CallableRequest<unknown>,
  deps: ImportOrganizerFromLinkDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<ImportOrganizerFromLinkCallablePayload>(request,
    validateImportOrganizerFromLinkCallablePayload);
  let url: URL;
  try {
    url = parseDraftLink(data.input.link);
  } catch (error) {
    if (error instanceof InvalidDraftLink) throw new HttpsError("invalid-argument", error.message);
    throw error;
  }
  const commandKey = commandReceiptKey(caller.uid, data.idempotencyKey);
  const ctx: Context = {uid: caller.uid, input: {link: url.href, useImportedName: data.input.useImportedName === true},
    link: classifyOrganizerLink(url), host: url.hostname.replace(/^www\./u, ""), commandKey,
    requestId: tryItReadRequestId([commandKey]), ai: lazyPageAi(deps)};
  const db = deps.firestore();
  // Previews poll every two seconds while a page is read.
  await deps.checkRateLimit(db, caller.uid, "importOrganizerFromLink", {maxRequests: 900, windowMs: HOUR_MS});

  if (data.mode === "apply") return apply(db, deps, ctx, data);

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
  if (lookup.kind === "new") return respond(ctx, "needs_input", {reasons: ["no_workspace"]});
  const organizerId = workspaceOrganizerId(lookup);
  if (ctx.link.support === "staff_follow_up" && ctx.link.reason === "no_adapter" && await ctx.ai()) {
    // A public platform with no adapter yet: read, and the AI reads what the adapters can't.
    ctx.link = {provider: ctx.link.provider, support: "best_effort", reason: "ai_fallback"};
  }
  if (ctx.link.support === "staff_follow_up") return respond(ctx, "refused", {organizerId, reasons: [ctx.link.reason ?? "link_not_supported"]});

  const organizer = lookup.organizer;
  const read = await readTryItLink(db, deps, request, {uid: caller.uid, phone: caller.phone,
    commandKey: ctx.commandKey, requestId: ctx.requestId, link: {url: ctx.input.link, classification: ctx.link},
    organizerId, organizerMarketId: typeof organizer.locationMarketId === "string" ? organizer.locationMarketId : null,
    surface: data.surface, limits: READ_LIMITS});
  if (read.state === "running") return respond(ctx, "running", {organizerId});
  if (read.state === "refused") return respond(ctx, "refused", {organizerId, reasons: [read.reason]});
  const stored = read.stored;

  const [adapterListing, organizerSnap] = await Promise.all([readListing(db, stored), db.collection("organizers").doc(organizerId).get()]);
  const aiRead = await aiOrganizerRead(deps, ctx, stored, adapterListing);
  if (aiRead.state === "refused") return respond(ctx, "refused", {organizerId, reasons: [aiRead.reason]});
  const listing = withAiOrganizer(adapterListing, aiRead, ctx);
  if (!listing) return respond(ctx, "refused", {organizerId, reasons: ["link_unreadable"]});
  const review = aiReview(aiRead);
  const match = await matchFor(db, stored, organizerId);
  const proposal = await proposalFor(db, stored, listing, organizerSnap.data() ?? {}, ctx);
  const hash = previewHashFor(ctx, listing, organizerSnap.data() ?? {}, match);
  if (match?.verdict === "match") return respond(ctx, "needs_input", {organizerId, match, reasons: ["existing_listing"], hash, ...review});
  return respond(ctx, "previewed", {organizerId, match, proposal,
    reasons: match ? ["possible_existing_listing"] : [], hash, ...review});
}

export const importOrganizerFromLink = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey],
  {maxInstances: 10}), (request) => importOrganizerFromLinkHandler(request));

/** Apply: recompute the preview in a transaction, refuse a changed one, write the reviewed fields. */
async function apply(db: FirebaseFirestore.Firestore, deps: ImportOrganizerFromLinkDeps, ctx: Context,
  data: ImportOrganizerFromLinkCallablePayload): Promise<Response> {
  const requestHash = commandRequestHash(COMMAND_ID, ctx.uid, ctx.input, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, ctx.uid, data.idempotencyKey);
  // The AI's read (a cache hit after the preview) happens outside the
  // transaction; inside, it applies only while the adapters' listing is
  // still the empty one it was read for.
  const before = (await db.collection(supplyIntakeCollections.requests).doc(ctx.requestId).get()).data();
  const aiRead = before && before.status === "completed" ?
    await aiOrganizerRead(deps, ctx, before, await readListing(db, before)) : {state: "none" as const};
  if (aiRead.state === "refused") {
    throw new HttpsError("failed-precondition", "We couldn't read this page.", {reason: aiRead.reason});
  }
  return db.runTransaction(async (tx) => {
    const now = deps.now();
    const replay = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid: ctx.uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (replay) return {...replay.response, status: "replayed" as const};
    const lookup = await readTryItWorkspace(tx, db, ctx.uid);
    if (lookup.kind === "new") throw new HttpsError("failed-precondition", "Set up your organizer profile first.", {reason: "no_workspace"});
    const organizerId = workspaceOrganizerId(lookup);
    const requestRef = db.collection(supplyIntakeCollections.requests).doc(ctx.requestId);
    const requestSnap = await tx.get(requestRef);
    const stored = requestSnap.data();
    if (!stored || stored.status !== "completed") {
      throw new HttpsError("failed-precondition", "Preview this link until it is read, then apply.", {reason: "not_ready"});
    }
    assertSameTryItRead(stored, ctx.uid, ctx.input.link);
    if (record(stored.tryItImport)?.organizerId !== organizerId) {
      throw new HttpsError("failed-precondition", "This link was read for a different profile. Start again.", {reason: "workspace_changed"});
    }
    const listingRef = listingRefFor(db, stored);
    const listingSnap = listingRef ? await tx.get(listingRef) : null;
    const adapterListing = listingSnap ? listingFrom(listingSnap.data()) : null;
    const listing = withAiOrganizer(adapterListing, aiRead.state === "read" && needsAi(adapterListing) ? aiRead : {state: "none"}, ctx);
    if (!listing) throw new HttpsError("failed-precondition", "We couldn't read this page.", {reason: "link_unreadable"});
    const organizer = lookup.organizer;
    const match = await matchFor(db, stored, organizerId, tx);
    if (match?.verdict === "match") {
      throw new HttpsError("failed-precondition", "This organizer is already on Catch. Claim it instead.", {reason: "existing_listing"});
    }
    const proposal = await proposalFor(db, stored, listing, organizer, ctx, tx);
    const hash = previewHashFor(ctx, listing, organizer, match);
    assertConfirmMatches(COMMAND_ID, data.confirm, hash);

    await stageTryItWorkspace(tx, db, lookup, {uid: ctx.uid, now, commandId: COMMAND_ID, surface: data.surface,
      organizerName: typeof organizer.name === "string" ? organizer.name : "Organizer", marketId: "",
      serverTimestamp: deps.serverTimestamp});
    tx.update(db.collection("organizers").doc(organizerId), organizerPatch(organizer, listing, proposal, ctx, deps, now));
    tx.update(requestRef, {tryItImport: {...record(stored.tryItImport), appliedAt: now.toISOString()},
      updatedAt: now.toISOString()});
    const applied = respond(ctx, "applied", {organizerId, match, proposal, reasons: match ? ["possible_existing_listing"] : [],
      hash, receiptId, ...aiReview(aiRead.state === "read" && needsAi(adapterListing) ? aiRead : {state: "none"})});
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: compactForReceipt(applied)});
    return applied;
  });
}

interface Listing {
  listingId: string;
  contentHash: string;
  name: string | null;
  description: string | null;
  categories: string[];
  links: Array<{platform: string; url: string}>;
  gaps: string[];
}

function listingRefFor(db: FirebaseFirestore.Firestore, stored: Data): FirebaseFirestore.DocumentReference | null {
  const id = record(stored.result)?.listingWorkItemId;
  return typeof id === "string" && id.length > 0 ? db.collection("operationWorkItems").doc(id) : null;
}

async function readListing(db: FirebaseFirestore.Firestore, stored: Data): Promise<Listing | null> {
  const ref = listingRefFor(db, stored);
  return ref ? listingFrom((await ref.get()).data()) : null;
}

/** The finished listing from its work item (normalizedPayload.intake.listing). */
export function listingFrom(workItem: unknown): Listing | null {
  const listing = record(record(record(record(workItem)?.normalizedPayload)?.intake)?.listing);
  const organizer = record(listing?.organizer);
  if (!listing || !organizer || typeof listing.listingId !== "string" || typeof listing.contentHash !== "string") return null;
  const links = (Array.isArray(organizer.links) ? organizer.links : []).flatMap((entry) => {
    const link = record(entry);
    return link && typeof link.platform === "string" && typeof link.url === "string" && /^https?:\/\//u.test(link.url) ?
      [{platform: link.platform.slice(0, 60), url: link.url.slice(0, 2000)}] : [];
  });
  return {listingId: listing.listingId.slice(0, 200), contentHash: listing.contentHash,
    name: text(organizer.name, 120), description: text(organizer.description, 2000),
    categories: strings(organizer.categories).map((value) => value.slice(0, 60)).slice(0, MAX_TAGS), links,
    gaps: strings(listing.gaps).filter((gap) => /^[a-z][a-z0-9_]{0,79}$/u.test(gap)).slice(0, 20)};
}

/** What apply would write: only what the workspace does not have yet, and the name only on request. */
async function proposalFor(db: FirebaseFirestore.Firestore, stored: Data, listing: Listing, organizer: Data,
  ctx: Context, tx?: FirebaseFirestore.Transaction): Promise<Proposal> {
  const result = record(stored.result);
  const eventIds = strings(result?.eventWorkItemIds).slice(0, PREVIEW_EVENTS);
  const events = (await readTryItEvents(db, stored, PREVIEW_EVENTS, tx)).map((event) => ({
    title: event.title, startAt: event.startAt, endAt: event.endAt, venue: event.venue, sourceUrl: event.sourceUrl}));
  const currentName = typeof organizer.name === "string" ? organizer.name : null;
  const handle = listing.links.map((link) => instagramHandle(link.url)).find((value) => value !== null) ?? null;
  return {
    name: listing.name,
    nameChanges: ctx.input.useImportedName && listing.name !== null && listing.name !== currentName,
    description: text(organizer.description, 2000) ? null : listing.description,
    instagramHandle: text(organizer.instagramHandle, 60) ? null : handle,
    categories: listing.categories.filter((category) => !strings(organizer.tags).includes(category)),
    sources: listing.links.slice(0, MAX_SOURCES),
    events,
    eventCount: Math.min(200, typeof result?.eventCount === "number" ? result.eventCount : eventIds.length),
    gaps: listing.gaps,
    verificationNeeded: identitiesFor(listing).length > 0,
  };
}

/** What the AI fallback made of a page the adapters read nothing from. */
type AiOrganizerRead =
  | {state: "none"}
  | {state: "read"; organizer: AiOrganizer}
  | {state: "refused"; reason: "ai_cap_reached" | "ai_daily_limit" | "ai_unreadable"};

/** True when the adapters found neither a name nor a description. */
function needsAi(listing: Listing | null): boolean {
  return !listing || (!listing.name && !listing.description);
}

/**
 * Reads the stored page with the AI when the fallback is on and the adapters
 * found nothing. Off, or switched off between the check and the read: none.
 */
async function aiOrganizerRead(deps: ImportOrganizerFromLinkDeps, ctx: Context, stored: Data,
  listing: Listing | null): Promise<AiOrganizerRead> {
  if (!needsAi(listing)) return {state: "none"};
  const ai = await ctx.ai();
  if (!ai) return {state: "none"};
  const input = await storedPageInput(stored, ctx.requestId, ctx.input.link, deps.readSnapshot ?? storageSnapshotReader());
  if (!input) return {state: "refused", reason: "ai_unreadable"};
  const result = await ai.read(aiOrganizerRequest(ctx.uid, COMMAND_ID, input));
  if (result.status === "off") return {state: "none"};
  if (result.status === "refused") return {state: "refused", reason: result.reason};
  const organizer = importAiOrganizer(result.output);
  return organizer ? {state: "read", organizer} : {state: "refused", reason: "ai_unreadable"};
}

/**
 * The listing with the AI's name and description where the adapters had
 * none. Its content hash covers both, so a preview and its apply match.
 */
function withAiOrganizer(listing: Listing | null, read: AiOrganizerRead, ctx: Context): Listing | null {
  if (read.state !== "read") return listing;
  const {organizer} = read;
  const base: Listing = listing ?? {listingId: `ai-${ctx.requestId}`.slice(0, 200), contentHash: "", name: null,
    description: null, categories: [], links: [], gaps: []};
  return {...base, name: base.name ?? organizer.name, description: base.description ?? organizer.description,
    contentHash: createHash("sha256").update(`${base.contentHash}|ai|${organizer.contentHash}`).digest("hex")};
}

function aiReview(read: AiOrganizerRead): {aiRead: boolean; reviewFields: string[]} {
  if (read.state !== "read") return {aiRead: false, reviewFields: []};
  return {aiRead: true, reviewFields: [...(read.organizer.name ? ["name"] : []),
    ...(read.organizer.description ? ["description"] : [])]};
}

/** Imported identities that need proof before publishing. */
function identitiesFor(listing: Listing): Array<{platform: "instagram" | "luma"; url: string}> {
  return listing.links.flatMap((link) => link.platform === "instagram" || link.platform === "luma" ?
    [{platform: link.platform as "instagram" | "luma", url: link.url}] : []).slice(0, 8);
}

function organizerPatch(organizer: Data, listing: Listing, proposal: Proposal, ctx: Context,
  deps: ImportOrganizerFromLinkDeps, now: Date): Data {
  const name = proposal.nameChanges && proposal.name ? proposal.name : (typeof organizer.name === "string" ? organizer.name : "");
  const checkedAt = deps.timestampFromDate(now);
  const identities = identitiesFor(listing);
  return {
    ...(proposal.nameChanges && proposal.name ? {name: proposal.name} : {}),
    ...(proposal.description ? {description: proposal.description} : {}),
    ...(proposal.instagramHandle ? {instagramHandle: proposal.instagramHandle} : {}),
    ...(proposal.categories.length ? {tags: [...strings(organizer.tags), ...proposal.categories].slice(0, MAX_TAGS)} : {}),
    publicSources: proposal.sources.map((source) => ({type: source.platform, label: `${source.platform} page`.slice(0, 120),
      detail: `Public ${source.platform} page for ${name || "this organizer"}.`.slice(0, 600), href: source.url,
      confidence: "medium", lastCheckedAt: checkedAt})),
    importProvenance: {requestId: ctx.requestId, listingId: listing.listingId, contentHash: listing.contentHash,
      sourceUrls: listing.links.map((link) => link.url).slice(0, 12), identities,
      verification: identities.length ? "unverified" : "not_needed", importedAt: deps.serverTimestamp()},
  };
}

/**
 * The listing's duplicate check without the visitor's own workspace: a unique
 * strong candidate is a match (claim it instead); any other strong or probable
 * candidate is shown as possible.
 */
async function matchFor(db: FirebaseFirestore.Firestore, stored: Data, ownOrganizerId: string,
  tx?: FirebaseFirestore.Transaction): Promise<Match | null> {
  const check = record(record(stored.result)?.duplicateCheck);
  const candidates = (Array.isArray(check?.candidates) ? check.candidates : []).flatMap((entry) => {
    const candidate = record(entry);
    return candidate && typeof candidate.organizerId === "string" && candidate.organizerId !== ownOrganizerId &&
      (candidate.band === "match" || candidate.band === "probable") ? [candidate] : [];
  });
  if (candidates.length === 0) return null;
  const strong = candidates.filter((candidate) => candidate.band === "match");
  const unique = strong.length === 1 && strings(strong[0].conflicts).length === 0;
  const shown = candidates.slice(0, 5);
  const snaps = await Promise.all(shown.map((candidate) => {
    const ref = db.collection("organizers").doc(String(candidate.organizerId));
    return tx ? tx.get(ref) : ref.get();
  }));
  return {verdict: unique ? "match" : "ambiguous", candidates: shown.map((candidate, index) => {
    const organizer = snaps[index].data();
    const claimState = record(organizer?.claim)?.state;
    return {organizerId: String(candidate.organizerId).slice(0, 128),
      name: text(organizer?.name, 200) ?? text(candidate.name, 200) ?? "An organizer on Catch",
      claimable: Boolean(organizer) && !organizer?.ownerUserId && (claimState === "unclaimed" || claimState === undefined)};
  })};
}

function previewHashFor(ctx: Context, listing: Listing, organizer: Data, match: Match | null): string {
  return commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {requestId: ctx.requestId, contentHash: listing.contentHash,
    organizer: {name: organizer.name ?? null, description: organizer.description ?? null,
      instagramHandle: organizer.instagramHandle ?? null, tags: organizer.tags ?? null},
    match: match ? match.verdict : null});
}

function workspaceOrganizerId(lookup: WorkspaceLookup): string {
  return lookup.kind === "existing" ? lookup.pointer.organizerId : lookup.organizerId;
}

/** A receipt result stays small: a long proposal is stored without its events and description. */
function compactForReceipt(response: Response): Response {
  if (Buffer.byteLength(JSON.stringify(response)) <= 3_500 || !response.result.proposal) return response;
  return {...response, result: {...response.result, proposal: {...response.result.proposal, description: null, events: []}}};
}

function respond(ctx: Context, status: Response["status"], options: {organizerId?: string | null; proposal?: Proposal;
  match?: Match | null; reasons?: string[]; hash?: string; receiptId?: string; aiRead?: boolean;
  reviewFields?: string[]}): Response {
  const aiRead = options.aiRead === true;
  const proposal = options.proposal ?? null;
  const match = options.match ?? null;
  const reasons = options.reasons ?? [];
  const hash = options.hash ?? commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {status, reasons});
  return {
    commandId: COMMAND_ID, status, previewHash: hash, summary: summaryFor(ctx, status, proposal, match, reasons, aiRead),
    effects: status === "applied" && proposal ? effectsFor(options.organizerId ?? null, proposal) : [],
    next: reasons.includes("no_workspace") ? [{commandId: "workspace.ensure", label: "Set up your organizer profile"}] : [],
    receiptId: options.receiptId ?? null,
    result: {organizerId: options.organizerId ?? null, runId: status === "needs_input" && reasons.includes("no_workspace") ? null : ctx.requestId,
      link: ctx.link, proposal, match, reasons, pollAfterMs: status === "running" ? POLL_MS : null,
      aiRead, reviewFields: aiRead ? reviewFieldsOf(options.reviewFields ?? []) : []},
  };
}

function effectsFor(organizerId: string | null, proposal: Proposal): Response["effects"] {
  const ref = organizerId ? `organizers/${organizerId}` : null;
  const effects: Response["effects"] = [];
  if (proposal.nameChanges && proposal.name) effects.push({kind: "organizer_name", ref, label: `Name: ${proposal.name}`.slice(0, 200)});
  if (proposal.description) effects.push({kind: "organizer_description", ref, label: "Description from the page"});
  if (proposal.instagramHandle) effects.push({kind: "organizer_instagram", ref, label: `Instagram: ${proposal.instagramHandle}`.slice(0, 200)});
  if (proposal.sources.length) effects.push({kind: "organizer_sources", ref, label: `${proposal.sources.length} source ${plural(proposal.sources.length, "link")}`});
  if (proposal.eventCount) effects.push({kind: "imported_events", ref, label: `${proposal.eventCount} upcoming ${plural(proposal.eventCount, "event")} waiting to publish with your page`});
  return effects;
}

const REVIEW_FIELDS = ["name", "description"] as const;

const REFUSALS: Record<string, string> = {
  signed_in_site: "This site needs a sign-in, so we can't read it.",
  chat_invite: "Chat invites can't be read. Send your Instagram, Luma, Linktree or website instead.",
  short_link: "Short links hide where they go. Send the full link instead.",
  instagram_not_a_profile: "Send your Instagram profile link, not a post.",
  no_adapter: "We can't read this platform yet. Send your Instagram, Luma or website instead.",
  form_link: "That's a form. Send your Instagram, Luma, Linktree or website instead.",
  listing_suppressed: "Catch can't make a page for this organizer. Contact support if you think this is a mistake.",
  link_unreadable: "We couldn't read this page. Check the link is public, or try another one.",
  ai_unreadable: "We couldn't find your organizer details on this page. Try your Instagram, Luma or website instead.",
  ai_cap_reached: "We couldn't read this automatically right now. Try again next month, or add your details in the Host app.",
  ai_daily_limit: "You've used today's automatic reads. Try again tomorrow, or add your details in the Host app.",
};

function summaryFor(ctx: Context, status: Response["status"], proposal: Proposal | null, match: Match | null,
  reasons: string[], aiRead: boolean): Response["summary"] {
  if (status === "running") return {headline: `Reading ${ctx.host}…`, lines: ["This usually takes under a minute."]};
  if (status === "refused") return {headline: "We can't use this link.", lines: [REFUSALS[reasons[0]] ?? REFUSALS.link_unreadable]};
  if (status === "needs_input" && reasons.includes("no_workspace")) {
    return {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your page."]};
  }
  if (status === "needs_input" && match) {
    const found = match.candidates[0];
    return {headline: `"${found.name}" is already on Catch.`, lines: [found.claimable ?
      "Claim it to manage it as your own." : "Someone already manages this organizer. Contact support if it's yours."]};
  }
  const lines: string[] = [];
  if (proposal?.nameChanges && proposal.name) lines.push(`Your profile's name becomes "${proposal.name}".`);
  if (proposal?.description) lines.push("We'll add the description from the page.");
  if (proposal?.instagramHandle) lines.push(`We'll link Instagram @${proposal.instagramHandle}.`);
  if (proposal?.eventCount) {
    lines.push(`We found ${proposal.eventCount} upcoming ${plural(proposal.eventCount, "event")}. They go live with your page, after our usual checks.`);
  }
  if (proposal?.verificationNeeded) lines.push("Before you publish, we'll ask you to prove you run this Instagram or Luma page.");
  if (match) lines.push("This may already be on Catch. If it isn't you, you can still continue.");
  if (aiRead && status === "previewed") lines.push("We read this page automatically. Check the name and description before you save.");
  const name = proposal?.name ?? ctx.host;
  return status === "previewed" ?
    {headline: `Here's what we found for "${name}".`.slice(0, 200), lines: lines.length ? lines : ["Nothing new to add from this page."]} :
    {headline: `Your profile now has the details from ${ctx.host}.`.slice(0, 200), lines};
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

/** The review fields the response schema names, in order. */
function reviewFieldsOf(fields: string[]): NonNullable<Response["result"]["reviewFields"]> {
  return REVIEW_FIELDS.filter((field) => fields.includes(field));
}
