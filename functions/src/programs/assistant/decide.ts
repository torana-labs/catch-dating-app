/* eslint-disable max-len */
// handleProgramWhatsappInbound: what the wedding assistant does with one
// guest message. Lane W1's onProgramWhatsappInboundMessageCreated trigger
// calls it with the created programWhatsappMessages document.
//
// Order: the planner has taken the thread -> skip. The assistant is off
// (PROGRAM_ASSISTANT_ENABLED, the pinned key or the programme's setting)
// -> the thread needs the planner. The 24-hour window is closed -> pass
// on (no free text is allowed). Media, a person, distress, money or a
// change -> pass on. The daily budget is spent -> pass on. Otherwise the
// model answers from the household's fact pack, and the answer goes out
// through W1's sendProgramServiceReply, or the message is passed on.
// Passing on = thread needsYou + staff attention + programAlerts, and a
// holding reply to the guest while the window is open.

import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import {buildFactPack, FACT_PACK_VERSION, renderFactPack, type FactPackInput} from "./facts";
import {FactSourceError, loadFactPackInput} from "./factsSource";
import {
  answerIsSafe,
  chooseLanguage,
  holdingReply,
  preCheck,
  type AssistantLanguage,
  type EscalationReason,
} from "./policy";
import {
  ASSISTANT_MODEL,
  buildRequestBody,
  estimateInputTokens,
  MAX_OUTPUT_TOKENS,
  parseModelDecision,
  promptHash,
  PROMPT_VERSION,
  sha256,
  type AssistantRequestBody,
  type HistoryMessage,
} from "./prompt";
import {defaultAssistantRuntime, type AssistantRuntime} from "./provider";
import {completeRun, recordRun, reserveRun} from "./budget";
import {assistantRunId, budgetDay, type ProgramAssistantRun, type RunMode} from "./runs";
import {markThreadNeedsYou, raiseEscalationAlert} from "./escalation";
import {
  messageView,
  PROGRAM_WHATSAPP_MESSAGES,
  PROGRAM_WHATSAPP_THREADS,
  readAssistantSettings,
  threadView,
  type AssistantSettings,
  type ThreadView,
} from "./settings";

/** Free text needs a minute of the 24-hour window left. */
const WINDOW_MARGIN_MILLIS = 60_000;

/** W1's internal service: same reservation path as a planner reply. */
export interface ServiceReplyInput {
  programId: string;
  householdId: string;
  text: string;
  author: "assistant";
  runId: string;
}

export interface ProgramAssistantDeps {
  firestore: () => FirebaseFirestore.Firestore;
  nowMillis: () => number;
  runtime: () => AssistantRuntime;
  sendServiceReply: (input: ServiceReplyInput) => Promise<unknown>;
  loadFacts?: (db: FirebaseFirestore.Firestore, programId: string,
    householdId: string | null) => Promise<FactPackInput>;
  markThreadNeedsYou?: typeof markThreadNeedsYou;
}

/** Deployed deps; W1's trigger supplies its sendProgramServiceReply. */
export function defaultProgramAssistantDeps(
  sendServiceReply: ProgramAssistantDeps["sendServiceReply"]): ProgramAssistantDeps {
  return {firestore: () => admin.firestore(), nowMillis: () => Date.now(),
    runtime: defaultAssistantRuntime, sendServiceReply};
}

/** The created message document event, as onDocumentCreated delivers it. */
export interface InboundMessageEvent {
  params: {messageId: string};
  data?: {id?: string; data: () => unknown} | null;
}

export type InboundResult =
  | {status: "ignored"}
  | {status: "duplicate"; runId: string}
  | {status: "skipped"; runId: string; reason: EscalationReason}
  | {status: "answered"; runId: string}
  | {status: "escalated"; runId: string; reason: EscalationReason};

// ---------------------------------------------------------------------------
// The model step, shared by live messages and the settings screen's Try it.

export interface ModelStepInput {
  db: FirebaseFirestore.Firestore;
  runtime: AssistantRuntime;
  base: ProgramAssistantRun;
  body: AssistantRequestBody;
  factText: string;
  tokenCap: number;
  nowMillis: () => number;
  /** Sends the answer before the run settles; previews pass a no-op. */
  deliver: (text: string) => Promise<void>;
}

export type ModelStepResult =
  | {kind: "answer"; text: string; run: ProgramAssistantRun}
  | {kind: "passedOn"; reason: EscalationReason; run: ProgramAssistantRun;
      /** False when the guest must not get a holding reply. */
      holding: boolean}
  | {kind: "duplicate"; run: ProgramAssistantRun};

export async function runModelStep(input: ModelStepInput): Promise<ModelStepResult> {
  const {db, base, body} = input;
  const reservedTokens = estimateInputTokens(body) + MAX_OUTPUT_TOKENS;
  const reservation = await reserveRun(db, {...base, reservedTokens,
    promptHash: promptHash(body), factPackHash: sha256(input.factText)}, input.tokenCap);
  if (reservation.kind === "exhausted") {
    return {kind: "passedOn", reason: "budgetExhausted", run: reservation.run, holding: true};
  }
  if (reservation.kind === "exists") {
    if (reservation.run.status !== "intent") return {kind: "duplicate", run: reservation.run};
    // An earlier attempt reserved and never settled: it may have answered.
    // Never call the model again; settle the reservation as spent.
    const run = await completeRun(db, base.runId, {status: "escalated",
      reason: "uncertainRetry", inputTokens: 0, outputTokens: 0,
      attempts: reservation.run.attempts, providerStatus: null, latencyMillis: null,
      consumedTokens: reservation.run.reservedTokens}, input.nowMillis());
    return {kind: "passedOn", reason: "uncertainRetry", run, holding: false};
  }
  const started = input.nowMillis();
  const fail = async (reason: EscalationReason, fields: {inputTokens: number;
    outputTokens: number; attempts: number; providerStatus: number | null;
    consumedTokens: number}, holding = true): Promise<ModelStepResult> => {
    const run = await completeRun(db, base.runId, {status: "escalated", reason, ...fields,
      latencyMillis: input.nowMillis() - started}, input.nowMillis());
    return {kind: "passedOn", reason, run, holding};
  };
  let result;
  try {
    const provider = await input.runtime.provider();
    result = await provider.complete(body);
  } catch {
    return fail("providerError", {inputTokens: 0, outputTokens: 0, attempts: 0,
      providerStatus: null, consumedTokens: 0});
  }
  if (!result.ok) {
    return fail(result.failure === "refused" ? "unsafeAnswer" : "providerError", {
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      attempts: result.attempts, providerStatus: result.status,
      consumedTokens: result.billedUncertain ? reservedTokens :
        result.inputTokens + result.outputTokens});
  }
  const usage = {inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    attempts: result.attempts, providerStatus: result.status,
    consumedTokens: result.inputTokens + result.outputTokens};
  const decision = parseModelDecision(result.text);
  if (decision.action === "escalate") return fail(decision.reason, usage);
  if (!answerIsSafe(decision.text, input.factText)) return fail("unsafeAnswer", usage);
  try {
    await input.deliver(decision.text);
  } catch (error) {
    logger.warn("Assistant reply was not sent", {runId: base.runId,
      error: error instanceof Error ? error.name : "unknown"});
    return fail("providerError", usage, false);
  }
  const run = await completeRun(db, base.runId, {status: "answered", reason: null,
    ...usage, latencyMillis: input.nowMillis() - started}, input.nowMillis());
  return {kind: "answer", text: decision.text, run};
}

export function baseRun(input: {mode: RunMode; key: string; programId: string;
  organizerId: string; threadId: string | null; messageId: string | null;
  actorUid: string | null; language: AssistantLanguage; nowMillis: number;
  timezone: string}): ProgramAssistantRun {
  return {runId: assistantRunId(input.mode, input.key), programId: input.programId,
    organizerId: input.organizerId, mode: input.mode, threadId: input.threadId,
    messageId: input.messageId, actorUid: input.actorUid, status: "intent",
    reason: null, language: input.language, model: ASSISTANT_MODEL,
    promptVersion: PROMPT_VERSION, factPackVersion: FACT_PACK_VERSION,
    promptHash: null, factPackHash: null,
    budgetDay: budgetDay(input.nowMillis, input.timezone), reservedTokens: 0,
    inputTokens: 0, outputTokens: 0, attempts: 0, providerStatus: null,
    latencyMillis: null, createdAtMillis: input.nowMillis,
    updatedAtMillis: input.nowMillis};
}

// ---------------------------------------------------------------------------
// The live path.

interface LiveContext {
  db: FirebaseFirestore.Firestore;
  deps: ProgramAssistantDeps;
  thread: ThreadView;
  settings: AssistantSettings;
  program: {organizerId: string; timezone: string; createdBy: string | null};
  householdLabel: string;
  language: AssistantLanguage;
  runId: string;
  windowOpen: boolean;
}

/** Thread needsYou, staff attention + programAlerts, and the holding reply. */
async function passToPlanner(ctx: LiveContext, reason: EscalationReason,
  options: {alert: boolean; holding: boolean}): Promise<void> {
  const mark = ctx.deps.markThreadNeedsYou ?? markThreadNeedsYou;
  const steps: Array<[string, () => Promise<unknown>]> = [
    ["thread", () => mark(ctx.db, ctx.thread.threadId, reason)],
  ];
  if (options.alert) {
    const staffUids = ctx.settings.escalationStaffUids.length ?
      ctx.settings.escalationStaffUids :
      ctx.program.createdBy ? [ctx.program.createdBy] : [];
    steps.push(["alert", () => raiseEscalationAlert(ctx.db, {
      programId: ctx.thread.programId, organizerId: ctx.program.organizerId,
      timezone: ctx.program.timezone, householdLabel: ctx.householdLabel,
      threadId: ctx.thread.threadId, runId: ctx.runId, reason, staffUids,
      nowMillis: ctx.deps.nowMillis()})]);
  }
  if (options.holding && ctx.windowOpen) {
    steps.push(["holding", () => ctx.deps.sendServiceReply({
      programId: ctx.thread.programId, householdId: ctx.thread.householdId,
      text: holdingReply(ctx.language, ctx.settings.replyWithin, reason),
      author: "assistant", runId: ctx.runId})]);
  }
  // Each step is independent: one failing never blocks the others, and a
  // retried trigger finds the settled run and does nothing twice.
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (error) {
      logger.warn("Assistant escalation step failed", {runId: ctx.runId, step: name,
        error: error instanceof Error ? error.name : "unknown"});
    }
  }
}

async function recentHistory(db: FirebaseFirestore.Firestore, threadId: string,
  current: HistoryMessage): Promise<HistoryMessage[]> {
  try {
    const snap = await db.collection(PROGRAM_WHATSAPP_MESSAGES)
      .where("threadId", "==", threadId).orderBy("createdAt", "desc").limit(6).get();
    const rows = snap.docs.map((doc) => messageView(doc.id, doc.data()))
      .filter((row) => row !== null && row.kind === "text" && row.text)
      .map((row) => ({direction: row!.direction, text: row!.text!}))
      .reverse();
    const last = rows[rows.length - 1];
    if (!last || last.direction !== "inbound" || last.text !== current.text) rows.push(current);
    return rows;
  } catch {
    // Without the thread index the assistant still answers the message itself.
    return [current];
  }
}

/** The entry point W1's trigger calls for each created message. */
export async function handleProgramWhatsappInbound(event: InboundMessageEvent,
  deps: ProgramAssistantDeps): Promise<InboundResult> {
  const message = messageView(event.params.messageId, event.data?.data());
  if (!message || message.direction !== "inbound" || message.author !== "guest") {
    return {status: "ignored"};
  }
  const db = deps.firestore();
  const thread = threadView(message.threadId,
    (await db.collection(PROGRAM_WHATSAPP_THREADS).doc(message.threadId).get()).data());
  if (!thread || thread.unknownSender) return {status: "ignored"};
  const [settings, programSnap, householdSnap] = await Promise.all([
    readAssistantSettings(db, thread.programId),
    db.collection("organizerPrograms").doc(thread.programId).get(),
    db.collection("programHouseholds").doc(thread.householdId).get(),
  ]);
  const programRow = programSnap.data() as Record<string, unknown> | undefined;
  if (!programRow) return {status: "ignored"};
  const program = {organizerId: String(programRow.organizerId ?? ""),
    timezone: String(programRow.timezone ?? "UTC"),
    createdBy: typeof programRow.createdBy === "string" ? programRow.createdBy : null};
  const household = householdSnap.data() as Record<string, unknown> | undefined;
  const now = deps.nowMillis();
  const language = chooseLanguage(message.text ?? "", settings.languages);
  const base = baseRun({mode: "live", key: message.messageId, programId: thread.programId,
    organizerId: program.organizerId, threadId: thread.threadId,
    messageId: message.messageId, actorUid: null, language, nowMillis: now,
    timezone: program.timezone});
  const ctx: LiveContext = {db, deps, thread, settings, program, language,
    householdLabel: typeof household?.label === "string" ? household.label : "",
    runId: base.runId,
    windowOpen: thread.serviceWindowExpiresAtMillis > now + WINDOW_MARGIN_MILLIS};

  /** Records a run that ends before the model; false when it already ran. */
  const settle = async (status: "skipped" | "escalated",
    reason: EscalationReason): Promise<boolean> =>
    (await recordRun(db, {...base, status, reason})).created;

  if (thread.handledBy === "planner") {
    return await settle("skipped", "plannerHandling") ? {status: "skipped", runId: base.runId, reason: "plannerHandling"} :
      {status: "duplicate", runId: base.runId};
  }
  const runtime = deps.runtime();
  if (!runtime.enabled || !settings.enabled) {
    // The planner owns every message while the assistant is off; one
    // live board alert per message would be noise.
    if (!await settle("escalated", "assistantOff")) return {status: "duplicate", runId: base.runId};
    await passToPlanner(ctx, "assistantOff", {alert: false, holding: false});
    return {status: "escalated", runId: base.runId, reason: "assistantOff"};
  }
  const early: EscalationReason | null = !ctx.windowOpen ? "outsideWindow" :
    preCheck({kind: message.kind, text: message.text});
  if (early) {
    if (!await settle("escalated", early)) return {status: "duplicate", runId: base.runId};
    await passToPlanner(ctx, early, {alert: true, holding: true});
    return {status: "escalated", runId: base.runId, reason: early};
  }
  let factText: string;
  try {
    const facts = await (deps.loadFacts ?? loadFactPackInput)(db, thread.programId,
      thread.householdId);
    factText = renderFactPack(buildFactPack(facts));
  } catch (error) {
    if (!(error instanceof FactSourceError)) throw error;
    if (!await settle("escalated", "factsUnavailable")) return {status: "duplicate", runId: base.runId};
    await passToPlanner(ctx, "factsUnavailable", {alert: true, holding: true});
    return {status: "escalated", runId: base.runId, reason: "factsUnavailable"};
  }
  const history = await recentHistory(db, thread.threadId,
    {direction: "inbound", text: message.text ?? ""});
  const body = buildRequestBody({language, tone: settings.tone, factText, history});
  const step = await runModelStep({db, runtime, base, body, factText,
    tokenCap: settings.dailyTokenBudget, nowMillis: deps.nowMillis,
    deliver: async (text) => {
      await deps.sendServiceReply({programId: thread.programId,
        householdId: thread.householdId, text, author: "assistant", runId: base.runId});
    }});
  if (step.kind === "duplicate") return {status: "duplicate", runId: base.runId};
  if (step.kind === "answer") return {status: "answered", runId: base.runId};
  await passToPlanner(ctx, step.reason, {alert: true, holding: step.holding});
  return {status: "escalated", runId: base.runId, reason: step.reason};
}
