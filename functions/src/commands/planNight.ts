/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {planNight as buildNightPlan, type NightPlan} from "../eventSuccess/nightPlan";
import {effectiveInteractionModelFor, eventSuccessPrimitivesFor} from "../eventSuccess/formatPrimitives";
import {buildEventSuccessPlanDoc, type EventSuccessPlanDefaults} from "../events/mutateEvent";
import {stagePlanSetupUpdate, type PlanSetupFields} from "../eventSuccess/planSetup";
import {updatePrivateEventDetails, type UpdatePrivateEventDetailsCommand} from "../events/progressiveSetup/details";
import {assertPrivateEventBasicsEditable} from "../events/progressiveSetup/commitments";
import type {ProgressiveSetupDependencies} from "../events/progressiveSetup/service";
import {projectManagerEventSetupDefaults} from "../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from "../organizers/eventSetupDefaults/dependencies";
import {createHash} from "node:crypto";
import type {EventDocument, OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {PlanNightCallablePayload} from "../shared/generated/planNightCallablePayload";
import type {PlanNightCallableResponse} from "../shared/generated/planNightCallableResponse";
import {validatePlanNightCallablePayload} from "../shared/generated/validators/planNightInput";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";
import {currentTryItDraft} from "./guestListTarget";
import {readTryItWorkspace, stageTryItWorkspace, type WorkspaceLookup} from "./workspace";

// Command night.plan (contracts/commands/catalog.json; #2062 C4). A
// phone-verified visitor with a try-it workspace names a format and a head
// count. Preview is the night from the shared playbook-shape catalog
// (eventSuccess/nightPlan.ts): groups, the mixing moment, the run of show,
// three missions and a rehearsal setup the client can pass to
// createEventRehearsal for a practice session. Nothing is written on
// preview. Apply saves it as the event-success plan of the workspace's private
// draft event, only while that plan is still in setup. A try-it draft the
// caller's workspace made that has no activity yet first gets the format's
// activity through private event setup (updatePrivateEventDetails), the path
// the Host app's Details step takes; an event that already has an activity is
// never changed, and one that doesn't match the format is refused.

export const COMMAND_ID = "night.plan";
const HOUR_MS = 60 * 60 * 1000;

type Response = PlanNightCallableResponse;
type RehearsalSetup = NonNullable<Response["result"]["rehearsalSetup"]>;
type Data = Record<string, unknown>;

export interface PlanNightDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
  /** createEvent's plan builder; a seam for tests whose stored timestamps lose their methods. */
  buildPlanDoc: typeof buildEventSuccessPlanDoc;
  /** Private event setup's details change, through which a try-it draft with no activity gets the plan's. */
  updateDraftDetails: (db: FirebaseFirestore.Firestore, actorUid: string,
    command: UpdatePrivateEventDetailsCommand) => Promise<unknown>;
}

const defaultDeps: PlanNightDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  buildPlanDoc: buildEventSuccessPlanDoc,
  updateDraftDetails: (db, actorUid, command) => updatePrivateEventDetails({actorUid, command,
    deps: setupService(db)}),
};

function setupService(db: FirebaseFirestore.Firestore): ProgressiveSetupDependencies {
  return {db, timestampFromMillis: admin.firestore.Timestamp.fromMillis,
    serverTimestamp: admin.firestore.FieldValue.serverTimestamp, assertBasicsEditable: assertPrivateEventBasicsEditable};
}

interface Context {
  uid: string;
  input: {format: PlanNightCallablePayload["input"]["format"]; guestCount: number; eventId: string | null};
}

const FORMAT_LABELS: Record<Context["input"]["format"], string> = {
  run: "Run", dinner: "Dinner", quiz: "Quiz night", courts: "Court night", crawl: "Crawl",
};

export async function planNightHandler(request: CallableRequest<unknown>,
  deps: PlanNightDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<PlanNightCallablePayload>(request, validatePlanNightCallablePayload);
  const ctx: Context = {uid: caller.uid, input: {format: data.input.format, guestCount: data.input.guestCount,
    eventId: data.input.eventId ?? null}};
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "planNight", {maxRequests: 120, windowMs: HOUR_MS});
  const plan = buildNightPlan(ctx.input.format, ctx.input.guestCount);
  if (!plan) throw new HttpsError("invalid-argument", "Unknown format.");
  const hash = commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {plan});

  const lookup = await db.runTransaction((tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
  if (data.mode === "apply") return apply(db, deps, ctx, data, plan, hash, lookup);
  if (lookup.kind === "new") return respond(ctx, "needs_input", {reasons: ["no_workspace"]});
  return respond(ctx, "previewed", {organizerId: workspaceOrganizerId(lookup), plan, hash});
}

export const planNight = onCall(appCheckCallableOptions, (request) => planNightHandler(request));

/** Apply: replay, find the draft event, check its activity, then save the plan with the receipt. */
async function apply(db: FirebaseFirestore.Firestore, deps: PlanNightDeps, ctx: Context,
  data: PlanNightCallablePayload, plan: NightPlan, hash: string, lookup: WorkspaceLookup): Promise<Response> {
  const now = deps.now();
  const requestHash = commandRequestHash(COMMAND_ID, ctx.uid, ctx.input, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, ctx.uid, data.idempotencyKey);
  const replay = await db.runTransaction((tx) => replayCommand<Response>(tx, db, {commandId: COMMAND_ID,
    uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()}));
  if (replay) return {...replay.response, status: "replayed" as const};
  if (lookup.kind === "new") {
    throw new HttpsError("failed-precondition", "Set up your organizer profile first.", {reason: "no_workspace"});
  }
  assertConfirmMatches(COMMAND_ID, data.confirm, hash);
  const organizerId = workspaceOrganizerId(lookup);
  const eventId = ctx.input.eventId ?? await currentTryItDraft(db, lookup, organizerId);
  if (!eventId) return respond(ctx, "refused", {organizerId, plan, hash, reasons: ["no_draft_event"]});
  await setTryItDraftActivity(db, deps, {uid: ctx.uid, organizerId, eventId, plan, lookup,
    requestId: `nightplan-${createHash("sha256").update(`${ctx.uid}\u0000${data.idempotencyKey}`).digest("hex").slice(0, 40)}`});

  return db.runTransaction(async (tx) => {
    const again = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid: ctx.uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (again) return {...again.response, status: "replayed" as const};
    const eventRef = db.collection("events").doc(eventId);
    const planRef = db.collection("eventSuccessPlans").doc(eventId);
    const [eventSnap, planSnap] = await Promise.all([tx.get(eventRef), tx.get(planRef)]);
    const current = await readTryItWorkspace(tx, db, ctx.uid);
    const event = eventSnap.data() as EventDocument | undefined;
    const refusal = refusalFor(event, organizerId, plan, planSnap.data());
    if (refusal) return respond(ctx, "refused", {organizerId, plan, hash, eventId, reasons: [refusal]});

    // Staging reads before it writes, so it runs before the plan write.
    await stageTryItWorkspace(tx, db, current, {uid: ctx.uid, now, commandId: COMMAND_ID, surface: data.surface,
      organizerName: typeof lookup.organizer.name === "string" ? lookup.organizer.name : "Organizer",
      marketId: "", serverTimestamp: deps.serverTimestamp});
    if (planSnap.exists) {
      const existing = planSnap.data() as Data;
      stagePlanSetupUpdate(tx, planRef, {playbookId: plan.playbookId, targetAttendeeCount: plan.guestCount,
        structureConfig: {...(existing.structureConfig as Data | undefined ?? {}),
          ...unitFields(plan)} as PlanSetupFields["structureConfig"]}, deps.serverTimestamp);
    } else {
      tx.create(planRef, deps.buildPlanDoc({
        defaults: {enabled: true, playbookId: plan.playbookId,
          structureConfig: unitFields(plan)} as unknown as EventSuccessPlanDefaults,
        eventId, event: event as EventDocument, organizerId, targetAttendeeCount: plan.guestCount,
        serverTimestamp: deps.serverTimestamp}));
    }
    const applied = respond(ctx, "applied", {organizerId, plan, hash, eventId, receiptId});
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: ctx.uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    return applied;
  });
}

/**
 * Gives a try-it draft with no activity the plan's format, through private
 * event setup. Only for a private draft this workspace recorded as try-it
 * (tryItEventIds) and owns; any other event, or one with an activity already,
 * is left as it is and judged by refusalFor. The request id comes from the
 * command key, so a retried apply replays the same setup change.
 */
async function setTryItDraftActivity(db: FirebaseFirestore.Firestore, deps: PlanNightDeps, params: {uid: string;
  organizerId: string; eventId: string; plan: NightPlan; lookup: Exclude<WorkspaceLookup, {kind: "new"}>;
  requestId: string}): Promise<void> {
  const tryItIds = params.lookup.kind === "existing" ? params.lookup.pointer.tryItEventIds ?? [] : [];
  if (!tryItIds.includes(params.eventId)) return;
  const [eventSnap, organizerSnap, defaultsSnap] = await Promise.all([
    db.collection("events").doc(params.eventId).get(),
    db.collection("organizers").doc(params.organizerId).get(),
    db.collection("organizerEventSetupDefaults").doc(params.organizerId).get(),
  ]);
  const event = eventSnap.data() as EventDocument | undefined;
  if (!event || event.organizerId !== params.organizerId || event.publicationState !== "private" ||
      event.eventFormat?.interactionModel || !organizerSnap.exists) return;
  const defaults = projectManagerEventSetupDefaults(params.organizerId, organizerSnap.data() as OrganizerDocument,
    defaultsSnap.data(), eventSetupDefaultsDependencies(db));
  await deps.updateDraftDetails(db, params.uid, {
    organizerId: params.organizerId, eventId: params.eventId, requestId: params.requestId,
    expectedSetupRevision: event.setupRevision as number, reviewedDefaultsHash: defaults.preferencesHash,
    details: {eventFormat: {mode: "set", value: {version: 1, activityKind: params.plan.activityKind as never,
      interactionModel: params.plan.interactionModel as never, defaultPlaybookId: params.plan.playbookId}}}});
}

/** Why the plan can't be saved on this event, or null. */
function refusalFor(event: EventDocument | undefined, organizerId: string, plan: NightPlan,
  existingPlan: Data | undefined): string | null {
  if (!event || event.organizerId !== organizerId || event.publicationState !== "private") return "event_not_in_workspace";
  const format = event.eventFormat;
  if (!format?.interactionModel) return "event_format_needed";
  const model = effectiveInteractionModelFor(format.interactionModel, eventSuccessPrimitivesFor(format).assignmentAlgorithm);
  if (model !== plan.interactionModel) return "event_format_mismatch";
  if (existingPlan && (existingPlan.status !== "setup" || existingPlan.frozenAt != null)) return "plan_locked";
  return null;
}

/** The structure fields the plan stores, with its topology and resource capacity. */
function unitFields(plan: NightPlan): Data {
  const config = plan.structureConfig;
  return {unitKind: config.unitKind, unitSize: config.unitSize, unitCount: config.unitCount ?? null,
    rotationIntervalMinutes: config.rotationIntervalMinutes ?? null,
    ...(config.topology !== undefined ? {topology: config.topology} : {}),
    ...(config.resourceCapacity !== undefined ? {resourceCapacity: config.resourceCapacity} : {})};
}

/** A setup createEventRehearsal accepts, for a practice run of this night. */
export function rehearsalSetupFor(plan: NightPlan): RehearsalSetup {
  const moduleIds: RehearsalSetup["moduleIds"] = ["arrival", "firstHello"];
  if (plan.groups.kind === "paceGroups" || plan.groups.kind === "units") moduleIds.push("pods");
  if (plan.mixingMoment.kind === "rotation") moduleIds.push("rotations");
  if (plan.mixingMoment.kind === "teamRevealAtRoundBreak") moduleIds.push("reveal");
  moduleIds.push("conversationCues", "afterglow");
  if (plan.format === "run" || plan.format === "crawl") moduleIds.push("accountability");
  return {
    title: `${FORMAT_LABELS[plan.format]} practice`,
    locationName: "Practice venue",
    durationMinutes: Math.max(30, Math.min(360, plan.durationMinutes)),
    hostGoal: "Run the night once before your guests arrive.",
    attendeePrompt: "Say hello to someone in your group.",
    moduleIds,
  };
}

function workspaceOrganizerId(lookup: Exclude<WorkspaceLookup, {kind: "new"}>): string {
  return lookup.kind === "existing" ? lookup.pointer.organizerId : lookup.organizerId;
}

function respond(ctx: Context, status: Response["status"], options: {organizerId?: string | null; plan?: NightPlan;
  hash?: string; reasons?: string[]; eventId?: string; receiptId?: string}): Response {
  const plan = options.plan ?? null;
  const reasons = options.reasons ?? [];
  const eventId = options.eventId ?? null;
  return {
    commandId: COMMAND_ID, status,
    previewHash: options.hash ?? commandPreviewHash(COMMAND_ID, ctx.uid, ctx.input, {status, reasons}),
    summary: summaryFor(status, plan, reasons),
    effects: status === "applied" && eventId ? [{kind: "draft_plan", ref: `eventSuccessPlans/${eventId}`,
      label: `Night plan: ${FORMAT_LABELS[ctx.input.format]} for ${ctx.input.guestCount}`}] : [],
    next: reasons.includes("no_workspace") ? [{commandId: "workspace.ensure", label: "Set up your organizer profile"}] :
      reasons.includes("no_draft_event") ? [{commandId: "event.import-from-link", label: "Import an event to plan"}] : [],
    receiptId: options.receiptId ?? null,
    result: {organizerId: options.organizerId ?? null, eventId,
      plan: plan ? publicPlan(plan) : null, rehearsalSetup: plan && status !== "needs_input" ? rehearsalSetupFor(plan) : null,
      reasons},
  };
}

function publicPlan(plan: NightPlan): NonNullable<Response["result"]["plan"]> {
  return {format: plan.format, guestCount: plan.guestCount, playbookId: plan.playbookId, activityKind: plan.activityKind,
    interactionModel: plan.interactionModel, capacity: plan.capacity, groups: plan.groups as NonNullable<Response["result"]["plan"]>["groups"],
    mixingMoment: plan.mixingMoment, runOfShow: plan.runOfShow, durationMinutes: plan.durationMinutes, stops: plan.stops,
    missions: plan.missions as NonNullable<Response["result"]["plan"]>["missions"]};
}

const REFUSALS: Record<string, string> = {
  no_draft_event: "Import or create a draft event first, then save this plan to it.",
  event_not_in_workspace: "That event isn't a private draft in your profile.",
  event_format_needed: "Choose the event's activity in Details first.",
  event_format_mismatch: "The event's activity doesn't match this format. Change one of them first.",
  plan_locked: "This event's plan is already live, so it can't be replaced here.",
};

function summaryFor(status: Response["status"], plan: NightPlan | null, reasons: string[]): Response["summary"] {
  if (reasons.includes("no_workspace")) {
    return {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then plan your night."]};
  }
  if (status === "refused" || !plan) {
    return {headline: "We can't save this plan yet.", lines: [REFUSALS[reasons[0]] ?? REFUSALS.no_draft_event]};
  }
  const groups = plan.groups;
  const groupLine = groups.kind === "paceGroups" ? `${groups.count} pace groups.` :
    groups.kind === "courts" ? `${groups.count} courts of ${groups.size}${groups.benchCount ? `, ${groups.benchCount} on the bench` : ""}.` :
      groups.kind === "units" ? `${groups.count} ${groups.unitKind ?? "groups"} of about ${groups.size}.` : "Everyone together.";
  const lines = [groupLine, `${plan.durationMinutes} minutes, with three missions.`];
  if (plan.capacity.fit !== "within") {
    lines.push(`This format works best for ${plan.capacity.min} to ${plan.capacity.max} guests.`);
  }
  return status === "previewed" ?
    {headline: `${FORMAT_LABELS[plan.format]} for ${plan.guestCount}.`, lines} :
    {headline: `Your ${FORMAT_LABELS[plan.format].toLowerCase()} plan is saved on your draft.`, lines: ["Try it in a practice session before the night."]};
}
