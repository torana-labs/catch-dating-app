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
  ProgramStaffGrantDocument,
} from "../../shared/generated/firestoreAdminTypes";
import type {ListProgramWhatsappThreadsCallablePayload} from
  "../../shared/generated/listProgramWhatsappThreadsCallablePayload";
import type {GetProgramWhatsappThreadCallablePayload} from
  "../../shared/generated/getProgramWhatsappThreadCallablePayload";
import type {SendProgramWhatsappReplyCallablePayload} from
  "../../shared/generated/sendProgramWhatsappReplyCallablePayload";
import type {ProgramWhatsappThreadsCallableResponse} from
  "../../shared/generated/programWhatsappThreadsCallableResponse";
import type {ProgramWhatsappThreadCallableResponse} from
  "../../shared/generated/programWhatsappThreadCallableResponse";
import type {ProgramWhatsappReplyCallableResponse} from
  "../../shared/generated/programWhatsappReplyCallableResponse";
import {validateListProgramWhatsappThreadsCallablePayload} from
  "../../shared/generated/validators/listProgramWhatsappThreadsInput";
import {validateGetProgramWhatsappThreadCallablePayload} from
  "../../shared/generated/validators/getProgramWhatsappThreadInput";
import {validateSendProgramWhatsappReplyCallablePayload} from
  "../../shared/generated/validators/sendProgramWhatsappReplyInput";
import {validateProgramWhatsappThreadsCallableResponse} from
  "../../shared/generated/validators/programWhatsappThreadsOutput";
import {validateProgramWhatsappThreadCallableResponse} from
  "../../shared/generated/validators/programWhatsappThreadOutput";
import {validateProgramWhatsappReplyCallableResponse} from
  "../../shared/generated/validators/programWhatsappReplyOutput";
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
import {
  listProgramWhatsappCannedRepliesHandler,
  upsertProgramWhatsappCannedReplyHandler,
} from "./cannedReplies";
import {setProgramWhatsappThreadHandlingHandler} from "./handling";
import {
  PROGRAM_WHATSAPP_MESSAGES,
  PROGRAM_WHATSAPP_THREADS,
  isProgramWhatsappWindowOpen,
  maxProgramThreadMessages,
} from "./ids";
import {
  defaultProgramReplyDeps,
  sendProgramWhatsappText,
  type ProgramReplyDeps,
} from "./replies";
import {readThread, requireValidThread, type ProgramMessage,
  type ProgramThread} from "./threads";

// The planner inbox reads and the reply command (programmes read through
// callables plus the client snapshot cache, not listeners).

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

function sideLabel(program: OrganizerProgramDocument,
  household: ProgramHouseholdDocument | undefined): string | null {
  const side = household?.side;
  if (side !== "partnerA" && side !== "partnerB") return null;
  return program.householdSideLabels?.[side] ?? null;
}

function summary(thread: ProgramThread, program: OrganizerProgramDocument,
  household: ProgramHouseholdDocument | undefined, nowMillis: number):
  ThreadSummary {
  return {
    threadId: thread.threadId,
    householdId: thread.householdId,
    guestId: thread.guestId,
    displayName: household?.label ?? (thread.unknownSender ?
      "Unknown number" : "Guest"),
    sideLabel: sideLabel(program, household),
    unknownSender: thread.unknownSender,
    handledBy: thread.handledBy,
    state: thread.state,
    language: thread.language,
    escalationReason: thread.escalationReason,
    lastMessagePreview: thread.lastMessagePreview,
    lastMessageDirection: thread.lastMessageDirection,
    lastMessageAuthor: thread.lastMessageAuthor,
    lastMessageAtMillis: thread.lastMessageAtMillis,
    lastInboundAtMillis: thread.lastInboundAtMillis,
    serviceWindowExpiresAtMillis: thread.serviceWindowExpiresAtMillis,
    serviceWindowOpen: isProgramWhatsappWindowOpen(
      thread.lastInboundAtMillis, nowMillis),
    unreadCount: thread.unreadCount,
    revision: thread.revision,
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

export async function getProgramWhatsappThreadHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappThreadCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetProgramWhatsappThreadCallablePayload>(request,
      validateGetProgramWhatsappThreadCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramWhatsappThread",
    {maxRequests: 120, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireInboxAccess(access);
  const threadRef = db.collection(PROGRAM_WHATSAPP_THREADS).doc(data.threadId);
  const [threadSnap, messageSnap] = await Promise.all([
    threadRef.get(),
    db.collection(PROGRAM_WHATSAPP_MESSAGES)
      .where("programId", "==", data.programId)
      .where("threadId", "==", data.threadId)
      .orderBy("createdAtMillis", "desc")
      .limit(maxProgramThreadMessages + 1).get(),
  ]);
  let thread = readThread(threadSnap, data.programId);
  if (!thread || thread.organizerId !== access.program.organizerId) {
    throw new HttpsError("not-found", "WhatsApp thread not found.");
  }
  // Opening a thread marks it read; archived programmes stay read-only.
  if (thread.unreadCount > 0 && access.program.status !== "archived") {
    thread = await db.runTransaction(async (tx) => {
      const live = readThread(await tx.get(threadRef), data.programId);
      if (!live) throw new HttpsError("not-found", "WhatsApp thread gone.");
      if (live.unreadCount === 0) return live;
      const next = {...live, unreadCount: 0,
        updatedAtMillis: deps.now().toMillis(), revision: live.revision + 1};
      tx.set(threadRef, requireValidThread(next));
      return next;
    });
  }
  const messages = messageSnap.docs.map((doc) => doc.data() as ProgramMessage)
    .filter((message) => message.organizerId === access.program.organizerId);
  const shown = messages.slice(0, maxProgramThreadMessages).reverse();
  const authorUids = [...new Set(shown.map((m) => m.authorUid)
    .filter((uid): uid is string => !!uid))];
  const grants = await Promise.all(authorUids.map((uid) =>
    db.collection("programStaffGrants").doc(`${data.programId}__${uid}`)
      .get()));
  const names = new Map(grants.flatMap((snap) => {
    const grant = snap.data() as ProgramStaffGrantDocument | undefined;
    return grant?.programId === data.programId && grant.displayName ?
      [[grant.uid, grant.displayName] as const] : [];
  }));
  const households = await readHouseholds(db, data.programId,
    [thread.householdId]);
  const household = thread.householdId ?
    households.get(thread.householdId) : undefined;
  return requireValid(validateProgramWhatsappThreadCallableResponse, {
    programId: data.programId,
    thread: summary(thread, access.program, household,
      deps.now().toMillis()),
    household: household && thread.householdId ? {
      householdId: thread.householdId,
      label: household.label,
      primaryContactName: household.primaryContactName ?? null,
      guestCount: household.memberGuestIds?.length ?? 0,
      rsvpStatus: null,
    } : null,
    messages: shown.map((message) => ({
      messageId: message.messageId,
      direction: message.direction,
      kind: message.kind,
      text: message.text,
      author: message.author,
      authorName: message.authorUid ? names.get(message.authorUid) ?? null :
        null,
      status: message.status,
      createdAtMillis: message.createdAtMillis,
    })),
    messagesTruncated: messages.length > maxProgramThreadMessages,
  }, "WhatsApp thread");
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

export const getProgramWhatsappThread = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => getProgramWhatsappThreadHandler(request));

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

export const listProgramWhatsappCannedReplies = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => listProgramWhatsappCannedRepliesHandler(request));

export const upsertProgramWhatsappCannedReply = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => upsertProgramWhatsappCannedReplyHandler(request));

export const getProgramAssistantSettings = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => getProgramAssistantSettingsHandler(request));

export const updateProgramAssistantSettings = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => updateProgramAssistantSettingsHandler(request));
