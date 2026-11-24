/* firestore-index: programWhatsappThreads (
  programId:ASCENDING,
  lastMessageAtMillis:DESCENDING
) */
/* firestore-index: programWhatsappMessages (
  programId:ASCENDING,
  threadId:ASCENDING,
  createdAtMillis:DESCENDING
) */
import {expr, projectID} from "firebase-functions/params";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {
  appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets,
} from "../../shared/callableOptions";
import {validateCallableWithAjv} from "../../shared/validation";
import {
  requireProgramAccess,
  requireProgramMutable,
} from "../../shared/programAuthority";
import type {
  OrganizerProgramDocument,
  ProgramHouseholdDocument,
} from "../../shared/generated/firestoreAdminTypes";
import type {ListProgramWhatsappThreadsCallablePayload} from
  "../../shared/generated/listProgramWhatsappThreadsCallablePayload";
import type {GetProgramWhatsappThreadCallablePayload} from
  "../../shared/generated/getProgramWhatsappThreadCallablePayload";
import type {SendProgramWhatsappReplyCallablePayload} from
  "../../shared/generated/sendProgramWhatsappReplyCallablePayload";
import type {ProgramWhatsappThreadsCallableResponse} from
  "../../shared/generated/programWhatsappThreadsCallableResponse";
import type {ProgramWhatsappReplyCallableResponse} from
  "../../shared/generated/programWhatsappReplyCallableResponse";
import type {ProgramWhatsappThreadHandlingCallableResponse} from
  "../../shared/generated/programWhatsappThreadHandlingCallableResponse";
import {validateListProgramWhatsappThreadsCallablePayload} from
  "../../shared/generated/validators/listProgramWhatsappThreadsInput";
import {validateGetProgramWhatsappThreadCallablePayload} from
  "../../shared/generated/validators/getProgramWhatsappThreadInput";
import {validateSendProgramWhatsappReplyCallablePayload} from
  "../../shared/generated/validators/sendProgramWhatsappReplyInput";
import {validateProgramWhatsappThreadsCallableResponse} from
  "../../shared/generated/validators/programWhatsappThreadsOutput";
import {validateProgramWhatsappReplyCallableResponse} from
  "../../shared/generated/validators/programWhatsappReplyOutput";
import {validateProgramWhatsappThreadHandlingCallableResponse} from
  "../../shared/generated/validators/programWhatsappThreadHandlingOutput";
import {
  metaWhatsappAppSecret,
  organizerWhatsappAccessTokens,
} from "../../organizers/organizerMessagingSetup";
import {
  defaultProgramInboxDeps,
  requireInboxAccess,
  requireValid,
  type ProgramInboxDeps,
} from "./access";
import {
  getProgramAssistantSettingsHandler,
  resolveProgramSender,
  updateProgramAssistantSettingsHandler,
} from "./assistantSettings";
import {upsertProgramWhatsappCannedReplyHandler} from "./cannedReplies";
import {setProgramWhatsappThreadHandlingHandler} from "./handling";
import {
  PROGRAM_WHATSAPP_THREADS,
  isProgramWhatsappWindowOpen,
} from "./ids";
import {
  defaultProgramReplyDeps,
  sendProgramWhatsappText,
  type ProgramReplyDeps,
} from "./replies";
import {readThread, requireValidThread, type ProgramThread} from
  "./threads";
import {programThreadSummary} from "./threadViews";

// The thread rows read (the programme message screen still calls it with
// limit 1 for its sender header), the reply command and the mark-read
// command. The planner inbox reads programWhatsappThreadViews and a thread's
// programWhatsappMessages through listeners (see threadViews.ts).

const THREAD_SCAN_LIMIT = 500;
const DEFAULT_PAGE = 30;

type ThreadSummary = ProgramWhatsappThreadsCallableResponse["threads"][number];

interface ThreadCursor {v: 1; at: number; id: string}

function encodeCursor(cursor: ThreadCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | null | undefined): ThreadCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as
      Partial<ThreadCursor>;
    if (parsed.v !== 1 || !Number.isSafeInteger(parsed.at) ||
        typeof parsed.id !== "string") throw new Error();
    return parsed as ThreadCursor;
  } catch {
    throw new HttpsError("invalid-argument", "The page cursor is invalid.");
  }
}

function summary(thread: ProgramThread, program: OrganizerProgramDocument,
  household: ProgramHouseholdDocument | undefined, nowMillis: number):
  ThreadSummary {
  return {
    ...programThreadSummary(thread, program, household),
    serviceWindowOpen: isProgramWhatsappWindowOpen(
      thread.lastInboundAtMillis, nowMillis),
  };
}

async function readHouseholds(db: FirebaseFirestore.Firestore,
  programId: string, ids: (string | null)[]):
  Promise<Map<string, ProgramHouseholdDocument>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const snaps = await Promise.all(unique.map((id) =>
    db.collection("programHouseholds").doc(id).get()));
  const result = new Map<string, ProgramHouseholdDocument>();
  snaps.forEach((snap) => {
    const household = snap.data() as ProgramHouseholdDocument | undefined;
    if (household?.programId === programId) result.set(snap.id, household);
  });
  return result;
}

export async function listProgramWhatsappThreadsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappThreadsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListProgramWhatsappThreadsCallablePayload>(request,
      validateListProgramWhatsappThreadsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramWhatsappThreads",
    {maxRequests: 120, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireInboxAccess(access);
  const snap = await db.collection(PROGRAM_WHATSAPP_THREADS)
    .where("programId", "==", data.programId)
    .orderBy("lastMessageAtMillis", "desc")
    .limit(THREAD_SCAN_LIMIT).get();
  const threads = snap.docs.map((doc) => doc.data() as ProgramThread)
    .filter((thread) => thread.organizerId === access.program.organizerId)
    .sort((a, b) => b.lastMessageAtMillis - a.lastMessageAtMillis ||
      b.threadId.localeCompare(a.threadId));
  const counts = {
    needsYou: threads.filter((t) => t.state === "needsYou").length,
    handled: threads.filter((t) => t.state === "handled").length,
    all: threads.length,
  };
  const cursor = decodeCursor(data.cursor);
  const filtered = threads.filter((thread) =>
    data.filter === "all" || thread.state === data.filter)
    .filter((thread) => !cursor ||
      thread.lastMessageAtMillis < cursor.at ||
      (thread.lastMessageAtMillis === cursor.at &&
        thread.threadId.localeCompare(cursor.id) < 0));
  const limit = data.limit ?? DEFAULT_PAGE;
  const page = filtered.slice(0, limit);
  const households = await readHouseholds(db, data.programId,
    page.map((thread) => thread.householdId));
  const nowMillis = deps.now().toMillis();
  const sender = await resolveProgramSender(db, access.program);
  const last = page.at(-1);
  return requireValid(validateProgramWhatsappThreadsCallableResponse, {
    programId: data.programId,
    filter: data.filter,
    counts,
    threads: page.map((thread) => summary(thread, access.program,
      thread.householdId ? households.get(thread.householdId) : undefined,
      nowMillis)),
    nextCursor: filtered.length > limit && last ?
      encodeCursor({v: 1, at: last.lastMessageAtMillis, id: last.threadId}) :
      null,
    sender: sender ? {connectionId: sender.connectionId,
      displayPhoneNumber: sender.displayPhoneNumber,
      status: sender.status} : null,
  }, "WhatsApp threads");
}

/**
 * Marks one thread read: the write half of opening a thread, now that the
 * thread and its messages are read through listeners. Managers and
 * communications staff; an archived programme stays read-only, so the call
 * changes nothing there. Answers with the thread's handling and revision.
 */
export async function markProgramWhatsappThreadReadHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappThreadHandlingCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetProgramWhatsappThreadCallablePayload>(request,
      validateGetProgramWhatsappThreadCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "markProgramWhatsappThreadRead",
    {maxRequests: 120, windowMs: 60 * 1000});
  const ref = db.collection(PROGRAM_WHATSAPP_THREADS).doc(data.threadId);
  const thread = await db.runTransaction(async (tx): Promise<ProgramThread> => {
    const access = await requireProgramAccess({db, programId: data.programId,
      actorUid, now: deps.now(), transaction: tx});
    requireInboxAccess(access);
    const live = readThread(await tx.get(ref), data.programId);
    if (!live || live.organizerId !== access.program.organizerId) {
      throw new HttpsError("not-found", "WhatsApp thread not found.");
    }
    if (live.unreadCount === 0 || access.program.status === "archived") {
      return live;
    }
    const next = {...live, unreadCount: 0,
      updatedAtMillis: deps.now().toMillis(), revision: live.revision + 1};
    tx.set(ref, requireValidThread(next));
    return next;
  });
  return requireValid(validateProgramWhatsappThreadHandlingCallableResponse, {
    programId: data.programId, threadId: data.threadId,
    handledBy: thread.handledBy, state: thread.state,
    revision: thread.revision,
  }, "thread read state");
}

export async function sendProgramWhatsappReplyHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps & ProgramReplyDeps = {
    ...defaultProgramInboxDeps, ...defaultProgramReplyDeps},
): Promise<ProgramWhatsappReplyCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SendProgramWhatsappReplyCallablePayload>(request,
      validateSendProgramWhatsappReplyCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "sendProgramWhatsappReply",
    {maxRequests: 30, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireInboxAccess(access);
  requireProgramMutable(access.program);
  const result = await sendProgramWhatsappText(deps, {
    programId: data.programId, threadId: data.threadId,
    text: data.text.trim(), idempotencyKey: data.idempotencyKey,
    author: "planner", actorUid, runId: null,
    cannedReplyId: data.cannedReplyId ?? null,
    expectedLastInboundAtMillis: data.expectedLastInboundAtMillis,
  });
  return requireValid(validateProgramWhatsappReplyCallableResponse, result,
    "WhatsApp reply");
}

const callableLimits = {timeoutSeconds: 60, maxInstances: 20};

export const listProgramWhatsappThreads = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => listProgramWhatsappThreadsHandler(request));

export const markProgramWhatsappThreadRead = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => markProgramWhatsappThreadReadHandler(request));

export const sendProgramWhatsappReply = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      callableLimits),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => sendProgramWhatsappReplyHandler(request));

export const setProgramWhatsappThreadHandling = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => setProgramWhatsappThreadHandlingHandler(request));

export const upsertProgramWhatsappCannedReply = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => upsertProgramWhatsappCannedReplyHandler(request));

export const getProgramAssistantSettings = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => getProgramAssistantSettingsHandler(request));

export const updateProgramAssistantSettings = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => updateProgramAssistantSettingsHandler(request));
