/* eslint-disable max-len */
import {createHash, randomBytes} from "node:crypto";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {FORM_PROVIDERS, InvalidDraftLink, matchesHost, parseDraftLink, type DraftLinkClassification} from "../instantDrafts/links";
import {limiterKey} from "../instantDrafts/model";
import {blockedIntakePatch, checkListingSuppression, listingSuppressionHmacKey, suppressionModule} from
  "../listingSuppressions/registry";
import {clientAddress} from "../instantDrafts/request";
import {packagedIntake} from "../operations/supplyIntake/runtime";
import {pageSourceFor} from "../operations/supplyIntake/worker";
import {createOrganizerFormInTransaction, materializeImportedForm} from "../organizers/organizerForms";
import {googleFormData, importGoogleForm} from "../formImport/googleForm";
import type {ImportedForm} from "../formImport/importedForm";
import type {ImportFormFromLinkCallablePayload} from
  "../shared/generated/importFormFromLinkCallablePayload";
import type {ImportFormFromLinkCallableResponse} from
  "../shared/generated/importFormFromLinkCallableResponse";
import {validateImportFormFromLinkCallablePayload} from
  "../shared/generated/validators/importFormFromLinkInput";
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
import {readTryItWorkspace, stageTryItWorkspace, type WorkspaceLookup} from "./workspace";

// Command form.import-from-link (contracts/commands/catalog.json; #2062 C8).
// A phone-verified visitor with a try-it workspace sends one public Google
// Form. Preview reads the page through the guarded page fetcher, on the
// website's instant-draft allowance (catalog linkAllowance), and answers the
// private draft form apply would create, with what the host must rebuild as
// flags (functions/src/formImport). Nothing is stored on preview. Apply reads
// the page again, so a form that changed since the confirmed preview is
// refused, then creates the draft through the native form creator on the
// blank template and records it on the workspace. Nothing publishes the form
// or collects a response.
//
// Like the other link imports, every read first asks the do-not-list
// registry (listingSuppressions) about the link: an organiser removed from
// Catch is never read. The check keys the link the way Supply Intake keys a
// request's seed links, runs on preview and on apply, and fails closed when
// the registry key is unavailable. A short link is checked again at the
// form's own address once the read has followed it, before anything is kept.
//
// Typeform and the other form providers need the form owner's credentials to
// read a definition, so they are refused with that reason rather than guessed.

export const COMMAND_ID = "form.import-from-link";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const FORM_HOST = "docs.google.com";

type Response = ImportFormFromLinkCallableResponse;
type FormOutline = NonNullable<Response["result"]["form"]>;

/** What one read of a form page found. */
export interface FormPageReading {
  /** "fetched", or why the page was not captured. */
  outcome: string;
  finalUrl: string | null;
  /** The form's page data, when the page carried it. */
  data: unknown[] | null;
}

export interface FormPageReader {
  read(input: {url: string; runKey: string}): Promise<FormPageReading>;
}

/** What the do-not-list registry says about a set of links. */
export type FormSuppressionCheck = (urls: string[]) => Promise<"clear" | "suppressed" | "unavailable">;

export interface ImportFormFromLinkDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestamp: () => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof defaultCheckRateLimit;
  publicFormId: () => string;
  reader: () => FormPageReader;
  suppression: () => FormSuppressionCheck;
}

const defaultDeps: ImportFormFromLinkDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestamp: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
  publicFormId: () => randomBytes(24).toString("base64url"),
  reader: () => guardedFormPageReader({db: () => admin.firestore(), now: () => new Date()}),
  suppression: () => registryFormSuppression({db: () => admin.firestore(), now: () => new Date()}),
};

/**
 * The do-not-list check for form links: keys the links as Supply Intake keys
 * a request's seed links, and counts a refused read on the matching case.
 */
export function registryFormSuppression(deps: {db: () => FirebaseFirestore.Firestore; now: () => Date}):
  FormSuppressionCheck {
  return async (urls) => {
    const keys = (await suppressionModule()).suppressionKeysForIntakeRequest({seed: {name: null, urls, notes: null}});
    const db = deps.db();
    return db.runTransaction(async (tx) => {
      const check = await checkListingSuppression(tx, db, keys);
      if (check.state === "suppressed") tx.update(check.match.ref, blockedIntakePatch(check.match, deps.now()));
      return check.state;
    });
  };
}

/** Live reads through the guarded page fetcher and the instant-draft monthly allowance. */
export function guardedFormPageReader(deps: {db: () => FirebaseFirestore.Firestore; now: () => Date}): FormPageReader {
  return {
    async read({url, runKey}) {
      const runtime = await packagedIntake();
      const policy = await runtime.loadSupplyAcquisitionPolicy();
      const {source, settle} = await pageSourceFor({db: deps.db(), now: deps.now}, policy, "web_instant_draft");
      try {
        const {snapshot, receipt} = await source.capture({runKey, url, namedScripts: ["FB_PUBLIC_LOAD_DATA_"]});
        return {outcome: receipt.outcome, finalUrl: receipt.finalUrl,
          data: googleFormData(snapshot as {embeddedJson?: Array<{id: string | null; value: unknown}>} | null)};
      } finally {
        await settle();
      }
    },
  };
}

interface Context {
  uid: string;
  input: {link: string};
  link: DraftLinkClassification;
  commandKey: string;
  formId: string;
}

/** What a read produced: the imported form and its draft outline, or why not. */
type Found =
  | {ok: true; imported: ImportedForm; outline: FormOutline; hash: string}
  | {ok: false; reason: string};

export async function importFormFromLinkHandler(request: CallableRequest<unknown>,
  deps: ImportFormFromLinkDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<ImportFormFromLinkCallablePayload>(request,
    validateImportFormFromLinkCallablePayload);
  let url: URL;
  try {
    url = parseDraftLink(data.input.link);
  } catch (error) {
    if (error instanceof InvalidDraftLink) throw new HttpsError("invalid-argument", error.message);
    throw error;
  }
  const commandKey = commandReceiptKey(caller.uid, data.idempotencyKey);
  const ctx: Context = {uid: caller.uid, input: {link: url.href}, link: formLink(url), commandKey,
    formId: importedFormId(commandKey)};
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "importFormFromLink", {maxRequests: 120, windowMs: HOUR_MS});

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
  if (data.mode === "apply") return apply(db, deps, request, ctx, data, caller.phone, lookup);
  if (lookup.kind === "new") return respond(ctx, "needs_input", {reasons: ["no_workspace"]});
  const organizerId = workspaceOrganizerId(lookup);
  if (ctx.link.support !== "instant") {
    return respond(ctx, "refused", {organizerId, reasons: [ctx.link.reason ?? "not_a_form_link"]});
  }
  const found = await readForm(db, deps, request, ctx, caller.phone);
  if (!found.ok) return respond(ctx, "refused", {organizerId, reasons: [found.reason]});
  return respond(ctx, "previewed", {organizerId, found});
}

export const importFormFromLink = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey]),
  (request) => importFormFromLinkHandler(request));

/**
 * Apply: replay a finished apply, read the form again, refuse a changed one,
 * create the draft form, then record it on the workspace with the receipt.
 */
async function apply(db: FirebaseFirestore.Firestore, deps: ImportFormFromLinkDeps, request: CallableRequest<unknown>,
  ctx: Context, data: ImportFormFromLinkCallablePayload, phone: string, lookup: WorkspaceLookup): Promise<Response> {
  const now = deps.now();
  const requestHash = commandRequestHash(COMMAND_ID, ctx.uid, ctx.input, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, ctx.uid, data.idempotencyKey);
  const replay = await db.runTransaction((tx) => replayCommand<Response>(tx, db, {commandId: COMMAND_ID,
    uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()}));
  if (replay) return {...replay.response, status: "replayed" as const};

  if (lookup.kind === "new") {
    throw new HttpsError("failed-precondition", "Set up your organizer profile first.", {reason: "no_workspace"});
  }
  if (ctx.link.support !== "instant") {
    throw new HttpsError("failed-precondition", "This link can't be imported.", {reason: ctx.link.reason ?? "not_a_form_link"});
  }
  const organizerId = workspaceOrganizerId(lookup);
  const found = await readForm(db, deps, request, ctx, phone);
  if (!found.ok) {
    throw new HttpsError("failed-precondition", REFUSALS[found.reason] ?? REFUSALS.link_unreadable, {reason: found.reason});
  }
  assertConfirmMatches(COMMAND_ID, data.confirm, found.hash);

  // The form id comes from the command key, so a retry after an unknown
  // outcome finds the draft it made instead of making a second one.
  await db.runTransaction((tx) => createOrganizerFormInTransaction({db, tx, actorUid: ctx.uid, organizerId,
    formId: ctx.formId, templateId: "blank", title: null, defaultTargetKind: "organizer", defaultTargetId: null,
    publicFormId: deps.publicFormId(), timestamp: deps.timestamp, imported: found.imported}));

  return db.runTransaction(async (tx) => {
    const again = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid: ctx.uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (again) return {...again.response, status: "replayed" as const};
    const current = await readTryItWorkspace(tx, db, ctx.uid);
    await stageTryItWorkspace(tx, db, current, {uid: ctx.uid, now, commandId: COMMAND_ID, surface: data.surface,
      organizerName: typeof lookup.organizer.name === "string" ? lookup.organizer.name : "Organizer", marketId: "", serverTimestamp: deps.serverTimestamp, draftFormId: ctx.formId});
    const applied = respond(ctx, "applied", {organizerId, found, receiptId, formId: ctx.formId});
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    return applied;
  });
}

/** Reads the form page once, within this command's own limits and the shared page allowance. */
async function readForm(db: FirebaseFirestore.Firestore, deps: ImportFormFromLinkDeps, request: CallableRequest<unknown>,
  ctx: Context, phone: string): Promise<Found> {
  await deps.checkRateLimit(db, limiterKey("phone", phone), "importFormFromLinkRead", {maxRequests: 10, windowMs: HOUR_MS});
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "importFormFromLinkAddress", {maxRequests: 30, windowMs: HOUR_MS});
  await deps.checkRateLimit(db, "try-it-form-imports", "importFormFromLinkDaily", {maxRequests: 100, windowMs: DAY_MS});
  const suppression = deps.suppression();
  if (await suppressed(suppression, [ctx.input.link])) return {ok: false, reason: "listing_suppressed"};
  const reading = await deps.reader().read({url: ctx.input.link, runKey: `tryitform-${ctx.commandKey.slice(0, 40)}`});
  if (reading.outcome !== "fetched") return {ok: false, reason: "link_unreadable"};
  if (!isGoogleFormUrl(reading.finalUrl)) return {ok: false, reason: "not_a_form_link"};
  if (reading.finalUrl !== ctx.input.link && await suppressed(suppression, [reading.finalUrl as string])) {
    return {ok: false, reason: "listing_suppressed"};
  }
  if (!reading.data) return {ok: false, reason: "form_not_public"};
  const imported = importGoogleForm(reading.data);
  if (!imported) return {ok: false, reason: "form_not_public"};
  if (imported.sections.every((section) => section.questions.length === 0)) return {ok: false, reason: "form_empty"};
  const definition = materializeImportedForm({content: imported, formId: ctx.formId, defaultTargetKind: "organizer",
    defaultTargetId: null});
  const outline: FormOutline = {title: definition.title, description: definition.description,
    questionCount: definition.sections.reduce((sum, section) => sum + section.questions.length, 0),
    ruleCount: definition.logicRules.length,
    sections: definition.sections.map((section) => ({title: section.title, questions: section.questions.map((question) =>
      ({label: question.label, kind: question.kind, required: question.required, optionCount: question.options.length}))}))};
  return {ok: true, imported, outline, hash: commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input,
    {formId: ctx.formId, imported})};
}

/** Whether the do-not-list names these links; an unavailable registry stops the import (fails closed). */
async function suppressed(check: FormSuppressionCheck, urls: string[]): Promise<boolean> {
  const state = await check(urls);
  if (state === "unavailable") {
    logger.error("Form import paused: the do-not-list registry key is unavailable.", {commandId: COMMAND_ID});
    throw new HttpsError("unavailable", "We can't check this link right now. Try again later.",
      {reason: "suppression_unavailable"});
  }
  return state === "suppressed";
}

/** How this command reads a link: a Google Form instantly, other form providers not at all. */
export function formLink(url: URL): DraftLinkClassification {
  const host = url.hostname.toLowerCase().replace(/^www\./u, "");
  const provider = FORM_PROVIDERS.find((item) => matchesHost(host, item.hosts) &&
    (!item.path || item.path.test(url.pathname)));
  if (!provider) return {provider: null, support: "staff_follow_up", reason: "not_a_form_link"};
  if (provider.id !== "google_forms") {
    return {provider: provider.id, support: "staff_follow_up", reason: "form_provider_not_supported"};
  }
  return {provider: provider.id, support: "instant", reason: null};
}

function isGoogleFormUrl(value: string | null): boolean {
  try {
    const url = new URL(value ?? "");
    return url.hostname.toLowerCase() === FORM_HOST && url.pathname.startsWith("/forms/");
  } catch {
    return false;
  }
}

/** The draft form's id for this command key: one form per key. */
export function importedFormId(commandKey: string): string {
  return `form_${createHash("sha256").update(`${COMMAND_ID}\u0000${commandKey}`).digest("hex").slice(0, 32)}`;
}

function workspaceOrganizerId(lookup: WorkspaceLookup): string {
  return lookup.kind === "existing" ? lookup.pointer.organizerId : lookup.organizerId;
}

function respond(ctx: Context, status: Response["status"], options: {organizerId?: string | null;
  found?: Found; reasons?: string[]; receiptId?: string; formId?: string}): Response {
  const found = options.found?.ok ? options.found : null;
  const reasons = options.reasons ?? [];
  const formId = options.formId ?? null;
  return {
    commandId: COMMAND_ID, status,
    previewHash: found?.hash ?? commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {status, reasons}),
    summary: summaryFor(status, found, reasons),
    effects: status === "applied" && found && formId ? [{kind: "draft_form", ref: `organizerForms/${formId}`,
      label: `Private draft form: ${found.outline.title}`.slice(0, 200)}] : [],
    next: reasons.includes("no_workspace") ? [{commandId: "workspace.ensure", label: "Set up your organizer profile"}] : [],
    receiptId: options.receiptId ?? null,
    result: {organizerId: options.organizerId ?? null, link: ctx.link, form: found?.outline ?? null,
      flags: found?.imported.flags ?? [], formId, reasons},
  };
}

const REFUSALS: Record<string, string> = {
  not_a_form_link: "This isn't a Google Form link. Send the form's own link.",
  form_provider_not_supported: "We can only read Google Forms for now. Other form tools need the owner's sign-in.",
  link_unreadable: "We couldn't read this page. Check the link is public, or try again later.",
  form_not_public: "This form isn't public, so we can't read its questions.",
  form_empty: "This form has no questions we can bring across.",
  listing_suppressed: "Catch can't import forms for this organizer. Contact support if you think this is a mistake.",
};

function summaryFor(status: Response["status"], found: {imported: ImportedForm; outline: FormOutline} | null,
  reasons: string[]): Response["summary"] {
  if (reasons.includes("no_workspace")) {
    return {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your form."]};
  }
  if (status === "refused" || !found) {
    return {headline: "We can't import this form.", lines: [REFUSALS[reasons[0]] ?? REFUSALS.link_unreadable]};
  }
  const {outline, imported} = found;
  const lines = [`${outline.questionCount} questions in ${outline.sections.length} sections.`];
  if (outline.ruleCount > 0) lines.push(`${outline.ruleCount} answer-based sections carried over.`);
  if (imported.flags.length > 0) lines.push(`${imported.flags.length} things to check or rebuild by hand.`);
  lines.push("It stays a private draft: no one can open it until you publish it.");
  return status === "previewed" ?
    {headline: `We'll draft "${outline.title}".`.slice(0, 200), lines} :
    {headline: `"${outline.title}" is a private draft form in your profile.`.slice(0, 200),
      lines: ["Review it in the Host app, then publish it when you are ready."]};
}

