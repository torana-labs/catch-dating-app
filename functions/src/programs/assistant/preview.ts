/* eslint-disable max-len */
// previewProgramAssistantReply: the assistant settings screen's "Try it".
// A planner asks a question as a guest and sees what the assistant would
// do, through the same policy, prompt, provider and budget as a live
// WhatsApp message. Nothing is sent and no thread or alert is touched.

import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {requireProgramAccess, requireProgramDuty} from "../../shared/programAuthority";
import type {PreviewProgramAssistantReplyCallablePayload} from
  "../../shared/generated/previewProgramAssistantReplyCallablePayload";
import type {ProgramAssistantReplyPreviewCallableResponse} from
  "../../shared/generated/programAssistantReplyPreviewCallableResponse";
import {validatePreviewProgramAssistantReplyCallablePayload} from
  "../../shared/generated/validators/previewProgramAssistantReplyInput";
import {validateProgramAssistantReplyPreviewCallableResponse} from
  "../../shared/generated/validators/programAssistantReplyPreviewOutput";
import {buildFactPack, renderFactPack, type FactPackInput} from "./facts";
import {FactSourceError, loadFactPackInput} from "./factsSource";
import {chooseLanguage, holdingReply, preCheck, type EscalationReason} from "./policy";
import {buildRequestBody} from "./prompt";
import {defaultAssistantRuntime, type AssistantRuntime} from "./provider";
import {recordRun, remainingTokens} from "./budget";
import {baseRun, runModelStep} from "./decide";
import {readAssistantSettings} from "./settings";

export interface PreviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  runtime: () => AssistantRuntime;
  loadFacts?: (db: FirebaseFirestore.Firestore, programId: string,
    householdId: string | null) => Promise<FactPackInput>;
}

const defaultDeps: PreviewDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  runtime: defaultAssistantRuntime,
};

type Response = ProgramAssistantReplyPreviewCallableResponse;

function respond(value: Response): Response {
  if (!validateProgramAssistantReplyPreviewCallableResponse(value)) {
    throw new HttpsError("internal", "The preview does not satisfy its contract.");
  }
  return value;
}

export async function previewProgramAssistantReplyHandler(
  request: CallableRequest<unknown>, deps: PreviewDeps = defaultDeps,
): Promise<Response> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<PreviewProgramAssistantReplyCallablePayload>(
    request, validatePreviewProgramAssistantReplyCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "previewProgramAssistantReply",
    {maxRequests: 20, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireProgramDuty(access, "communications");
  const settings = await readAssistantSettings(db, data.programId);
  const nowMillis = deps.now().toMillis();
  const timezone = access.program.timezone;
  const language = chooseLanguage(data.text, settings.languages);
  const base = baseRun({mode: "preview", key: `${actorUid}:${data.requestId}`,
    programId: data.programId, organizerId: access.program.organizerId,
    threadId: null, messageId: null, actorUid, language, nowMillis, timezone});
  const remaining = () => remainingTokens(db, data.programId, base.budgetDay,
    settings.dailyTokenBudget);
  const passedOn = async (reason: EscalationReason, recorded = false,
    tokens = {input: 0, output: 0}): Promise<Response> => {
    if (!recorded && !(await recordRun(db, {...base, status: "escalated", reason})).created) {
      throw new HttpsError("already-exists", "This request id was already used.");
    }
    return respond({programId: data.programId, runId: base.runId, outcome: "passedOn",
      reply: holdingReply(language, settings.replyWithin, reason), reason, language,
      inputTokens: tokens.input, outputTokens: tokens.output,
      remainingTokens: await remaining()});
  };

  const runtime = deps.runtime();
  if (!runtime.enabled) {
    if (!(await recordRun(db, {...base, status: "skipped", reason: "assistantOff"})).created) {
      throw new HttpsError("already-exists", "This request id was already used.");
    }
    return respond({programId: data.programId, runId: base.runId, outcome: "unavailable",
      reply: null, reason: "assistantOff", language, inputTokens: 0, outputTokens: 0,
      remainingTokens: await remaining()});
  }
  const early = preCheck({kind: "text", text: data.text});
  if (early) return passedOn(early);
  let factText: string;
  try {
    factText = renderFactPack(buildFactPack(await (deps.loadFacts ?? loadFactPackInput)(
      db, data.programId, data.householdId ?? null)));
  } catch (error) {
    if (error instanceof FactSourceError) {
      throw new HttpsError("not-found", "That household is not in this programme.");
    }
    throw error;
  }
  const body = buildRequestBody({language, tone: settings.tone, factText,
    history: [{direction: "inbound", text: data.text}]});
  const step = await runModelStep({db, runtime, base, body, factText,
    tokenCap: settings.dailyTokenBudget, nowMillis: () => deps.now().toMillis(),
    deliver: async () => undefined});
  if (step.kind === "duplicate") {
    throw new HttpsError("already-exists", "This request id was already used.");
  }
  const tokens = {input: step.run.inputTokens, output: step.run.outputTokens};
  if (step.kind === "passedOn") return passedOn(step.reason, true, tokens);
  return respond({programId: data.programId, runId: base.runId, outcome: "answer",
    reply: step.text, reason: null, language, inputTokens: tokens.input,
    outputTokens: tokens.output, remainingTokens: await remaining()});
}

export const previewProgramAssistantReply = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => previewProgramAssistantReplyHandler(request),
);
