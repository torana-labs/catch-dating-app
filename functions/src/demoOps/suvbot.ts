import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {DemoWorld} from "./demoWorld";
import {assertValidSuvbotDocument} from "./suvbotDocValidation";
import type {DemoDocWrite} from "./suvbotDocValidation";
import {
  DEFAULT_DEMO_SEED_PREFIX,
  ResetScope,
  SUVBOT_ACCESS_COLLECTION,
  SUVBOT_UID,
  applyDeletePlan,
  applyWritePlan,
  buildResetPlan,
  isDemoOwned,
  latestWorldManifest,
  repairDemoEventAggregates,
  summarizeDemoState,
  suvbotMatchId,
  writeDemoManifest,
} from "./suvbotState";
import type {DemoSummary} from "./suvbotState";
import {
  SUVBOT_DEMO_MOMENTS,
  SuvbotDemoMoment,
  SuvbotWorldPlan,
  buildSuvbotWorldPlan,
  homeDemoWorld,
  parseDemoWorldRequest,
  suvbotDemoWorldChoices,
} from "./suvbotWorld";

export {SUVBOT_ACCESS_COLLECTION, SUVBOT_UID, suvbotMatchId};
export const SUVBOT_DISPLAY_NAME = "Suvbot";
export const SUVBOT_REQUEST_COLLECTION = "demoOpsRequests";
const SUVBOT_CONFIRMATION_COLLECTION = "demoOpsConfirmations";
const CONFIRMATION_WINDOW_MS = 2 * 60 * 1000;
/** Text limit in contracts/firestore/chat_messages.schema.json. */
const CHAT_MESSAGE_TEXT_LIMIT = 2000;

export type SuvbotAction =
  | "listActions"
  | "help"
  | "message"
  | "checkDemoState"
  | "startDemoWorld"
  | "refreshDemoState"
  | "clearDemoState"
  | "warmSignupState"
  | "warmPostEventState"
  | "warmChatState"
  | "warmPaymentState"
  | "resetChats"
  | "resetBookings"
  | "resetNotifications"
  | "matchTesterByPhone";

export interface SuvbotActionDescriptor {
  id: SuvbotAction;
  label: string;
  description: string;
  icon: string;
  destructive?: boolean;
  requiresText?: boolean;
}

export interface SuvbotDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromDate: (date: Date) => FirebaseFirestore.Timestamp;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

export interface SuvbotOperationResult {
  ok: boolean;
  action: string;
  matchId: string;
  reply: string;
  actions: SuvbotActionDescriptor[];
}

export interface SuvbotRunOptions {
  skipConfirmation?: boolean;
  requireAccess?: boolean;
}

const defaultDeps: SuvbotDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

const SUVBOT_ACTION_CATALOG: readonly SuvbotActionDescriptor[] = [
  {
    id: "startDemoWorld",
    label: "Start a demo",
    description:
      "Pick a demo world and a moment; I build a fresh copy just for you.",
    icon: "event",
    requiresText: true,
  },
  {
    id: "refreshDemoState",
    label: "Refresh demo state",
    description:
      "Clear demo state and start your city's world after the event.",
    icon: "refresh",
    destructive: true,
  },
  {
    id: "clearDemoState",
    label: "Fresh start",
    description: "Delete demo-owned state without creating fresh data.",
    icon: "clean",
    destructive: true,
  },
  {
    id: "warmSignupState",
    label: "Warm signups",
    description: "Start your city's demo world on event day, booked.",
    icon: "event",
  },
  {
    id: "warmPostEventState",
    label: "Warm post-event",
    description: "Start your city's demo world after the event, catches open.",
    icon: "flag",
  },
  {
    id: "warmChatState",
    label: "Warm chats",
    description: "Start your city's world after the event with catches.",
    icon: "chat",
  },
  {
    id: "warmPaymentState",
    label: "Warm payments",
    description: "Start a paid demo world on event day, paid and booked.",
    icon: "payment",
  },
  {
    id: "resetChats",
    label: "Reset chats",
    description: "Delete demo-owned matches, swipe edges, and chat alerts.",
    icon: "chatReset",
    destructive: true,
  },
  {
    id: "resetBookings",
    label: "Reset bookings",
    description: "Delete demo-owned saved events, bookings, locks, payments.",
    icon: "eventReset",
    destructive: true,
  },
  {
    id: "resetNotifications",
    label: "Reset alerts",
    description: "Delete demo-owned notifications only.",
    icon: "notifications",
    destructive: true,
  },
  {
    id: "matchTesterByPhone",
    label: "Match tester",
    description: "Type a tester phone number to create a seeded match.",
    icon: "personAdd",
    requiresText: true,
  },
  {
    id: "checkDemoState",
    label: "Check setup",
    description: "Show what demo state is ready right now.",
    icon: "check",
  },
  {
    id: "help",
    label: "Help",
    description: "Explain the available Suvbot controls.",
    icon: "help",
  },
];

// The warm chips predate demo worlds. They now start the tester's home world
// at a fixed moment, so app builds that only know these ids keep working.
const WARM_PRESETS: Record<
  "warmSignupState" | "warmPostEventState" | "warmChatState" |
    "warmPaymentState" | "refreshDemoState",
  {moment: SuvbotDemoMoment; matchThreads: boolean; paid?: boolean}
> = {
  warmSignupState: {moment: "today", matchThreads: false},
  warmPostEventState: {moment: "after", matchThreads: false},
  warmChatState: {moment: "after", matchThreads: true},
  warmPaymentState: {moment: "today", matchThreads: false, paid: true},
  refreshDemoState: {moment: "after", matchThreads: true},
};

/**
 * Callable entry point for button-driven Suvbot demo operations.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SuvbotDeps} deps Injectable dependencies for tests.
 * @return {Promise<SuvbotOperationResult>} Result.
 */
export async function requestSuvbotDemoOperationHandler(
  request: CallableRequest<unknown>,
  deps: SuvbotDeps = defaultDeps
): Promise<SuvbotOperationResult> {
  const uid = requireAuth(request);
  await deps.checkRateLimit?.(
    deps.firestore(),
    uid,
    "requestSuvbotDemoOperation",
    {maxRequests: 20, windowMs: 60 * 1000}
  );
  const data = normalizeSuvbotRequest(request.data);
  return runSuvbotDemoOperationForUser({
    uid,
    action: data.action,
    text: data.text,
    targetPhone: data.targetPhone,
    deps,
  });
}

/**
 * Callable entry point for the backend-owned Suvbot action catalog.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SuvbotDeps} deps Injectable dependencies for tests.
 * @return {Promise<{actions: SuvbotActionDescriptor[], matchId: string}>}
 * Catalog response.
 */
export async function listSuvbotDemoActionsHandler(
  request: CallableRequest<unknown>,
  deps: SuvbotDeps = defaultDeps
): Promise<{actions: SuvbotActionDescriptor[]; matchId: string}> {
  const uid = requireAuth(request);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "listSuvbotDemoActions", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await assertSuvbotAccess(db, uid);
  const {matchId} = await ensureSuvbotThread(db, uid, deps);
  return {actions: suvbotActionCatalog(), matchId};
}

/**
 * Runs one Suvbot action for an explicit user. This is used by both the
 * callable and local admin tooling so command behavior has one source.
 * @param {object} params Operation parameters.
 * @return {Promise<SuvbotOperationResult>} Operation result.
 */
export async function runSuvbotDemoOperationForUser({
  uid,
  action,
  text,
  targetPhone,
  deps = defaultDeps,
  options = {},
}: {
  uid: string;
  action: string;
  text?: string;
  targetPhone?: string;
  deps?: SuvbotDeps;
  options?: SuvbotRunOptions;
}): Promise<SuvbotOperationResult> {
  if (!isSuvbotAction(action)) {
    throw new HttpsError("invalid-argument", "Unsupported Suvbot action.");
  }
  const db = deps.firestore();

  if (options.requireAccess !== false) {
    await assertSuvbotAccess(db, uid);
  }
  const {matchId} = await ensureSuvbotThread(db, uid, deps);
  const requestRef = db.collection(SUVBOT_REQUEST_COLLECTION).doc();
  const operationId = requestRef.id;

  await requestRef.set({
    uid,
    action,
    status: "started",
    matchId,
    createdAt: deps.serverTimestamp(),
    updatedAt: deps.serverTimestamp(),
    text: text ?? null,
    targetPhone: targetPhone ?? null,
  });

  if (action === "message" && text) {
    await writeConversationMessage({
      db,
      uid,
      senderId: uid,
      text,
      deps,
    });
  } else if (action !== "message" && action !== "listActions") {
    await writeConversationMessage({
      db,
      uid,
      senderId: uid,
      text: userFacingActionText(action, text),
      deps,
    });
  }

  let reply: string;
  try {
    reply = await runSuvbotAction({
      db,
      uid,
      action,
      text,
      targetPhone,
      operationId,
      deps,
      options,
    });
    if (reply) {
      await writeConversationMessage({
        db,
        uid,
        senderId: SUVBOT_UID,
        text: reply,
        deps,
      });
    }
    await requestRef.update({
      status: "completed",
      updatedAt: deps.serverTimestamp(),
      completedAt: deps.serverTimestamp(),
    });
  } catch (error) {
    logger.error("Suvbot operation failed", {uid, action, error});
    await writeConversationMessage({
      db,
      uid,
      senderId: SUVBOT_UID,
      text: [
        "I could not finish that.",
        "Try again in a minute, or send this chat to Suvrat.",
      ].join(" "),
      deps,
    });
    await requestRef.update({
      status: "failed",
      updatedAt: deps.serverTimestamp(),
      failedAt: deps.serverTimestamp(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return {ok: true, action, matchId, reply, actions: suvbotActionCatalog()};
}

/**
 * Normalizes and allowlists Suvbot action payloads.
 * @param {unknown} raw Raw callable payload.
 * @return {object} Normalized payload.
 */
function normalizeSuvbotRequest(
  raw: unknown
): {action: SuvbotAction; text?: string; targetPhone?: string} {
  const data = isRecord(raw) ? raw : {};
  const action = typeof data.action === "string" ?
    data.action.trim() :
    "help";
  if (!isSuvbotAction(action)) {
    throw new HttpsError("invalid-argument", "Unsupported Suvbot action.");
  }

  const text = typeof data.text === "string" ?
    data.text.trim().slice(0, 500) :
    undefined;
  if (action === "message" && !text) {
    throw new HttpsError("invalid-argument", "Message text is required.");
  }
  const targetPhone = typeof data.targetPhone === "string" ?
    normalizePhone(data.targetPhone) :
    undefined;

  return {action, ...(text && {text}), ...(targetPhone && {targetPhone})};
}

/**
 * Checks that a signed-in user has self-service demo access.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Current auth uid.
 */
async function assertSuvbotAccess(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<void> {
  const [accessSnap, userSnap] = await Promise.all([
    db.collection(SUVBOT_ACCESS_COLLECTION).doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const access = accessSnap.data();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "Complete onboarding first.");
  }
  if (access?.enabled !== true) {
    throw new HttpsError(
      "permission-denied",
      "Suvbot is only enabled for seeded beta accounts."
    );
  }
}

/**
 * Creates the Suvbot profile and deterministic chat thread if needed.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Current auth uid.
 * @param {SuvbotDeps} deps Injectable dependencies.
 * @return {Promise<{matchId: string, created: boolean}>} Thread identity.
 */
export async function ensureSuvbotThread(
  db: FirebaseFirestore.Firestore,
  uid: string,
  deps: SuvbotDeps = defaultDeps
): Promise<{matchId: string; created: boolean}> {
  const matchId = suvbotMatchId(uid);
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  const now = deps.timestampFromDate(deps.now());
  const docs: DemoDocWrite[] = [
    {path: `publicProfiles/${SUVBOT_UID}`, data: suvbotPublicProfileDoc()},
  ];

  if (!matchSnap.exists) {
    const welcomeText =
      "I can start a fresh demo world for you or check what is ready.";
    docs.push({
      path: `matches/${matchId}`,
      data: suvbotThreadDoc({
        uid,
        createdAt: now,
        lastMessageAt: now,
        lastMessagePreview: welcomeText,
        lastMessageSenderId: SUVBOT_UID,
        unreadForUser: 1,
      }),
    });
    docs.push({
      path: `matches/${matchId}/messages/suvbot_welcome`,
      data: {
        demoOps: true,
        demoOpsCommand: "suvbot-thread",
        seedPrefix: DEFAULT_DEMO_SEED_PREFIX,
        senderId: SUVBOT_UID,
        text: welcomeText,
        imageUrl: null,
        sentAt: now,
      },
    });
  }

  await applyWritePlan(db, docs);
  return {matchId, created: !matchSnap.exists};
}

/**
 * Runs a single self-scoped Suvbot operation.
 * @param {object} params Operation parameters.
 * @return {Promise<string>} Bot reply text.
 */
async function runSuvbotAction({
  db,
  uid,
  action,
  text,
  targetPhone,
  operationId,
  deps,
  options,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  action: SuvbotAction;
  text?: string;
  targetPhone?: string;
  operationId: string;
  deps: SuvbotDeps;
  options: SuvbotRunOptions;
}): Promise<string> {
  switch (action) {
  case "listActions":
    return "";
  case "help":
    return helpText();
  case "message":
    return text ?
      runTextCommandOrRespond({db, uid, text, operationId, deps, options}) :
      helpText();
  case "checkDemoState":
    return summaryText(await summarizeDemoState(db, uid));
  case "startDemoWorld": {
    const request = parseDemoWorldRequest(text);
    if (!request) return worldMenuText();
    return startWorld({
      db, uid, operationId, deps,
      world: request.world,
      moment: request.moment,
      matchThreads: request.moment === "after",
      command: "suvbot-start-world",
    });
  }
  case "refreshDemoState": {
    const confirmation = await requireConfirmation({
      db, uid, action, deps, skip: options.skipConfirmation === true,
    });
    if (confirmation) return confirmation;
    const cleared = await resetScopedDemoState({
      db, uid, operationId, deps, scope: "all",
    });
    const reply = await startPreset({
      db, uid, operationId, deps, action, preset: WARM_PRESETS[action],
    });
    return `${cleared.deletedCount} old demo docs removed.\n${reply}`;
  }
  case "warmSignupState":
  case "warmPostEventState":
  case "warmChatState":
  case "warmPaymentState":
    return startPreset({
      db, uid, operationId, deps, action, preset: WARM_PRESETS[action],
    });
  case "clearDemoState": {
    const confirmation = await requireConfirmation({
      db, uid, action, deps, skip: options.skipConfirmation === true,
    });
    if (confirmation) return confirmation;
    const result = await resetScopedDemoState({
      db, uid, operationId, deps, scope: "all",
    });
    return `Done. I removed ${result.deletedCount} demo-owned docs.`;
  }
  case "resetChats":
  case "resetBookings":
  case "resetNotifications": {
    const confirmation = await requireConfirmation({
      db, uid, action, deps, skip: options.skipConfirmation === true,
    });
    if (confirmation) return confirmation;
    const scope: ResetScope = action === "resetChats" ? "chats" :
      action === "resetBookings" ? "bookings" : "notifications";
    const result = await resetScopedDemoState({
      db, uid, operationId, deps, scope,
    });
    const noun = scope === "chats" ? "chat" :
      scope === "bookings" ? "booking" : "alert";
    return `Done. I removed ${result.deletedCount} demo ${noun} docs.`;
  }
  case "matchTesterByPhone":
    return matchTesterByPhone({
      db,
      uid,
      targetPhone,
      text,
      operationId,
      deps,
    });
  }
  throw new HttpsError("invalid-argument", "Unsupported Suvbot action.");
}

/**
 * Starts the tester's home world (or a paid one) at a preset moment.
 * @param {object} params Preset parameters.
 * @return {Promise<string>} Bot reply.
 */
async function startPreset({
  db,
  uid,
  operationId,
  deps,
  action,
  preset,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  operationId: string;
  deps: SuvbotDeps;
  action: SuvbotAction;
  preset: {moment: SuvbotDemoMoment; matchThreads: boolean; paid?: boolean};
}): Promise<string> {
  const user = await requireUser(db, uid);
  const worldMoment = SUVBOT_DEMO_MOMENTS
    .find((item) => item.id === preset.moment)?.worldMoment;
  const world = homeDemoWorld(user.city, (candidate) =>
    worldMoment !== undefined &&
    candidate.moments[worldMoment] !== undefined &&
    (!preset.paid ||
      candidate.events.some((event) => event.priceInPaise > 0)));
  if (!world) {
    return preset.paid ?
      `No paid demo world is bundled for ${preset.moment} yet.` :
      `No demo world is bundled for ${preset.moment} yet.`;
  }
  return startWorld({
    db, uid, operationId, deps, world,
    moment: preset.moment,
    matchThreads: preset.matchThreads,
    command: `suvbot-${action}`,
  });
}

/**
 * Replaces the tester's demo world with a fresh copy of one world at one
 * moment. Every document is validated before anything is deleted or written.
 * @param {object} params World parameters.
 * @return {Promise<string>} Bot reply.
 */
async function startWorld({
  db,
  uid,
  operationId,
  deps,
  world,
  moment,
  matchThreads,
  command,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  operationId: string;
  deps: SuvbotDeps;
  world: DemoWorld;
  moment: SuvbotDemoMoment;
  matchThreads: boolean;
  command: string;
}): Promise<string> {
  const user = await requireUser(db, uid);
  const now = deps.now();
  const plan = buildSuvbotWorldPlan({
    uid,
    user,
    world,
    moment,
    now,
    operationId,
    command,
    timestamp: deps.timestampFromDate,
    matchThreads,
  });
  const newPaths = new Set(plan.docs.map((doc) => doc.path));
  const previous = await buildResetPlan(db, uid, "world", newPaths);
  await applyWritePlan(db, plan.docs);
  await applyDeletePlan(db, previous.paths);
  await writeDemoManifest({
    db,
    uid,
    operationId,
    command,
    paths: plan.docs.map((doc) => doc.path),
    createdAt: deps.timestampFromDate(now),
    world: plan,
  });
  return worldStartedText(plan);
}

/**
 * Deletes one scoped family of demo-owned docs for a user.
 * @param {object} params Reset parameters.
 * @return {Promise<{deletedCount: number}>} Delete count.
 */
async function resetScopedDemoState({
  db,
  uid,
  operationId,
  deps,
  scope,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  operationId: string;
  deps: SuvbotDeps;
  scope: ResetScope;
}): Promise<{deletedCount: number}> {
  const deletePlan = await buildResetPlan(db, uid, scope);
  await applyDeletePlan(db, deletePlan.paths);
  await repairDemoEventAggregates(db, deletePlan.eventIds);
  await writeDemoManifest({
    db,
    uid,
    operationId,
    command: `suvbot-reset-${scope}`,
    paths: deletePlan.paths,
    createdAt: deps.timestampFromDate(deps.now()),
  });
  return {deletedCount: deletePlan.paths.length};
}

/**
 * Writes a Suvbot thread message and the matching thread preview. Text over
 * the chat message limit (help grows with every bundled world) becomes
 * consecutive messages split between lines, one millisecond apart.
 * @param {object} params Message parameters.
 */
async function writeConversationMessage({
  db,
  uid,
  senderId,
  text,
  deps,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  senderId: string;
  text: string;
  deps: SuvbotDeps;
}): Promise<void> {
  const matchRef = db.collection("matches").doc(suvbotMatchId(uid));
  const current = (await matchRef.get()).data();
  const now = deps.now();
  const parts = chatMessageParts(text);
  const sentAt = deps.timestampFromDate(
    new Date(now.getTime() + parts.length - 1));
  const createdAt = current?.createdAt as FirebaseFirestore.Timestamp |
    undefined;
  const messages: DemoDocWrite[] = parts.map((part, index) => ({
    path: matchRef.collection("messages").doc().path,
    data: {
      senderId,
      text: part,
      imageUrl: null,
      sentAt: deps.timestampFromDate(new Date(now.getTime() + index)),
    },
  }));
  const thread: DemoDocWrite = {
    path: matchRef.path,
    data: suvbotThreadDoc({
      uid,
      createdAt: typeof createdAt?.toMillis === "function" ?
        createdAt :
        sentAt,
      lastMessageAt: sentAt,
      lastMessagePreview: previewText(parts[parts.length - 1]),
      lastMessageSenderId: senderId,
      unreadForUser: senderId === SUVBOT_UID ? 1 : 0,
    }),
  };
  await applyWritePlan(db, [...messages, thread]);
}

/**
 * Splits text into chat messages within the text limit, breaking between
 * lines and cutting only a single line that is longer than the limit.
 * @param {string} text Message text.
 * @param {number} limit Maximum characters per message.
 * @return {string[]} One or more message texts.
 */
export function chatMessageParts(
  text: string,
  limit = CHAT_MESSAGE_TEXT_LIMIT
): string[] {
  const parts: string[] = [];
  let current: string | null = null;
  for (const line of text.split("\n")) {
    for (let start = 0; start < Math.max(line.length, 1); start += limit) {
      const piece = line.slice(start, start + limit);
      const joined: string = current === null ? piece : `${current}\n${piece}`;
      if (joined.length <= limit) {
        current = joined;
      } else {
        parts.push(current as string);
        current = piece;
      }
    }
  }
  parts.push(current ?? "");
  return parts;
}

/**
 * The Suvbot control thread document.
 * @param {object} params Thread fields.
 * @return {FirebaseFirestore.DocumentData} Match document.
 */
function suvbotThreadDoc(params: {
  uid: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastMessageAt: FirebaseFirestore.Timestamp;
  lastMessagePreview: string;
  lastMessageSenderId: string;
  unreadForUser: number;
}): FirebaseFirestore.DocumentData {
  return {
    demoOps: true,
    demoOpsCommand: "suvbot-thread",
    seedPrefix: DEFAULT_DEMO_SEED_PREFIX,
    user1Id: SUVBOT_UID,
    user2Id: params.uid,
    eventIds: ["suvbot"],
    createdAt: params.createdAt,
    lastMessageAt: params.lastMessageAt,
    lastMessagePreview: params.lastMessagePreview,
    lastMessageSenderId: params.lastMessageSenderId,
    unreadCounts: {[SUVBOT_UID]: 0, [params.uid]: params.unreadForUser},
    status: "active",
    blockedBy: null,
    blockedAt: null,
    participantIds: [SUVBOT_UID, params.uid],
  };
}

/**
 * Returns Suvbot's public profile document.
 * @return {FirebaseFirestore.DocumentData} Public profile data.
 */
function suvbotPublicProfileDoc(): FirebaseFirestore.DocumentData {
  return {
    demoOps: true,
    demoOpsCommand: "suvbot-thread",
    seedPrefix: DEFAULT_DEMO_SEED_PREFIX,
    name: SUVBOT_DISPLAY_NAME,
    age: 99,
    gender: "other",
    profilePrompts: [],
    profilePhotos: [],
    city: "in-mh-mumbai",
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: [],
        runningReasons: ["community"],
        preferredRunTimes: [],
        version: 1,
      },
    },
  };
}

/**
 * Returns the backend-owned action catalog for app and tooling surfaces.
 * @return {SuvbotActionDescriptor[]} Action descriptors.
 */
export function suvbotActionCatalog(): SuvbotActionDescriptor[] {
  return SUVBOT_ACTION_CATALOG.map((action) => ({...action}));
}

/**
 * Returns a confirmation prompt for destructive operations, or null to run.
 * @param {object} params Confirmation parameters.
 * @return {Promise<string | null>} Prompt when confirmation is still needed.
 */
async function requireConfirmation({
  db,
  uid,
  action,
  deps,
  skip,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  action: SuvbotAction;
  deps: SuvbotDeps;
  skip: boolean;
}): Promise<string | null> {
  if (skip || !actionDefinition(action)?.destructive) return null;
  const ref = db
    .collection(SUVBOT_CONFIRMATION_COLLECTION)
    .doc(`${uid}_${action}`);
  const snap = await ref.get();
  const expiresAt = dateFromTimestamp(snap.data()?.expiresAt);
  if (snap.exists && expiresAt.getTime() > deps.now().getTime()) {
    await ref.delete();
    return null;
  }
  await ref.set({
    uid,
    action,
    createdAt: deps.serverTimestamp(),
    expiresAt: deps.timestampFromDate(
      new Date(deps.now().getTime() + CONFIRMATION_WINDOW_MS)
    ),
  });
  return [
    `${userFacingActionText(action)} is a destructive demo operation.`,
    "Tap the same chip again within 2 minutes to confirm.",
  ].join("\n");
}

/**
 * Runs a parsed typed command or returns a normal help response.
 * @param {object} params Text command parameters.
 * @return {Promise<string>} Bot reply.
 */
async function runTextCommandOrRespond({
  db,
  uid,
  text,
  operationId,
  deps,
  options,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  text: string;
  operationId: string;
  deps: SuvbotDeps;
  options: SuvbotRunOptions;
}): Promise<string> {
  const parsed = parseTypedCommand(text);
  if (!parsed) return responseForFreeText(text);
  return runSuvbotAction({
    db,
    uid,
    action: parsed.action,
    text,
    targetPhone: parsed.targetPhone,
    operationId,
    deps,
    options,
  });
}

/**
 * Parses supported free-text shortcuts.
 * @param {string} text User text.
 * @return {object | null} Parsed command.
 */
function parseTypedCommand(
  text: string
): {action: SuvbotAction; targetPhone?: string} | null {
  const normalized = text.toLowerCase();
  const phone = extractPhone(text);
  if (phone && /(match|connect|tester|friend)/u.test(normalized)) {
    return {action: "matchTesterByPhone", targetPhone: phone};
  }
  if (parseDemoWorldRequest(text) || /(start|demo|world)/u.test(normalized)) {
    return {action: "startDemoWorld"};
  }
  if (/(fresh start|clear)/u.test(normalized)) {
    return {action: "clearDemoState"};
  }
  if (/(reset|clear).*(chat|match)/u.test(normalized)) {
    return {action: "resetChats"};
  }
  if (/(reset|clear).*(booking|event|signup|payment)/u.test(normalized)) {
    return {action: "resetBookings"};
  }
  if (/(reset|clear).*(notification|alert)/u.test(normalized)) {
    return {action: "resetNotifications"};
  }
  if (/(warm|seed).*(signup|booking|event)/u.test(normalized)) {
    return {action: "warmSignupState"};
  }
  if (/(warm|seed).*(post|attended|swipe|recap)/u.test(normalized)) {
    return {action: "warmPostEventState"};
  }
  if (/(warm|seed).*(chat|match)/u.test(normalized)) {
    return {action: "warmChatState"};
  }
  if (/(warm|seed).*(payment|refund)/u.test(normalized)) {
    return {action: "warmPaymentState"};
  }
  if (/(reset|refresh)/u.test(normalized)) {
    return {action: "refreshDemoState"};
  }
  if (/(check|status)/u.test(normalized)) {
    return {action: "checkDemoState"};
  }
  return null;
}

/**
 * Creates a seeded match with another allowlisted tester by phone number.
 * @param {object} params Match parameters.
 * @return {Promise<string>} Bot reply.
 */
async function matchTesterByPhone({
  db,
  uid,
  targetPhone,
  text,
  operationId,
  deps,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  targetPhone?: string;
  text?: string;
  operationId: string;
  deps: SuvbotDeps;
}): Promise<string> {
  const phone = targetPhone ?? (text ? extractPhone(text) : undefined);
  if (!phone) {
    return "Type the tester's phone number like: match +919999999999.";
  }
  const target = await resolveUserByPhone(db, phone);
  if (target.uid === uid) {
    throw new HttpsError("invalid-argument", "Use another tester's phone.");
  }
  const access = await db
    .collection(SUVBOT_ACCESS_COLLECTION)
    .doc(target.uid)
    .get();
  if (access.data()?.enabled !== true) {
    throw new HttpsError(
      "failed-precondition",
      "That phone is not enabled for seeded beta self-service."
    );
  }
  const matchId = matchIdFor(uid, target.uid);
  const existing = await db.collection("matches").doc(matchId).get();
  if (existing.exists && !isDemoOwned(existing.data())) {
    return "You already have a real chat with that tester. I left it alone.";
  }
  const marker = {
    demoOps: true,
    demoOpsId: operationId,
    demoOpsCommand: "suvbot-match-tester",
    seedPrefix: DEFAULT_DEMO_SEED_PREFIX,
  };
  // A match between testers is anchored to the requester's current world
  // event, when one is still there.
  const world = await latestWorldManifest(db, uid);
  const eventId = world?.primaryEventId &&
    (await db.collection("events").doc(world.primaryEventId).get()).exists ?
    world.primaryEventId :
    null;
  const docs = testerMatchDocs({
    uid,
    targetUid: target.uid,
    targetName: target.name,
    eventId,
    marker,
    now: deps.timestampFromDate(deps.now()),
  });
  await applyWritePlan(db, docs);
  await writeDemoManifest({
    db,
    uid,
    operationId,
    command: "suvbot-match-tester",
    paths: docs.map((doc) => doc.path),
    createdAt: deps.timestampFromDate(deps.now()),
  });
  return `Done. I matched you with ${target.name}.`;
}

/**
 * Resolves a user by E.164 phone number.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} phone Phone number.
 * @return {Promise<{uid: string, name: string}>} User identity.
 */
async function resolveUserByPhone(
  db: FirebaseFirestore.Firestore,
  phone: string
): Promise<{uid: string; name: string}> {
  const normalized = normalizePhone(phone);
  const snap = await db.collection("users")
    .where("phoneNumber", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new HttpsError("not-found", `No user found for ${normalized}.`);
  }
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    name: publicName(data) ?? "that tester",
  };
}

/**
 * Builds a direct seeded tester match.
 * @param {object} params Match doc parameters.
 * @return {DemoDocWrite[]} Docs.
 */
function testerMatchDocs({
  uid,
  targetUid,
  targetName,
  eventId,
  marker,
  now,
}: {
  uid: string;
  targetUid: string;
  targetName: string;
  eventId: string | null;
  marker: FirebaseFirestore.DocumentData;
  now: FirebaseFirestore.Timestamp;
}): DemoDocWrite[] {
  const [user1Id, user2Id] = [uid, targetUid].sort();
  const matchId = matchIdFor(uid, targetUid);
  const unreadCounts = {[user1Id]: 0, [user2Id]: 0};
  unreadCounts[targetUid] = 1;
  return [
    {
      path: `matches/${matchId}`,
      data: {
        ...marker,
        user1Id,
        user2Id,
        participantIds: [user1Id, user2Id],
        eventIds: eventId ? [eventId] : [],
        createdAt: now,
        lastMessageAt: now,
        lastMessagePreview: "Suvbot created this seeded tester match.",
        lastMessageSenderId: SUVBOT_UID,
        unreadCounts,
        status: "active",
        blockedBy: null,
        blockedAt: null,
        conversationType: "match",
      },
    },
    {
      path: `matches/${matchId}/messages/suvbot_intro`,
      data: {
        ...marker,
        senderId: SUVBOT_UID,
        text: `Suvbot matched you with ${targetName} for beta testing.`,
        imageUrl: null,
        sentAt: now,
      },
    },
    {
      path: `notifications/${targetUid}/items/suvbot_match_${matchId}`,
      data: {
        ...marker,
        uid: targetUid,
        type: "match",
        title: "Seeded tester match",
        body: "Suvbot created a beta test chat.",
        createdAt: now,
        readAt: null,
        matchId,
        eventId,
        actorUid: uid,
        actorName: "A beta tester",
      },
    },
  ];
}

/**
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid User id.
 * @return {Promise<FirebaseFirestore.DocumentData>} Profile.
 */
async function requireUser(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<FirebaseFirestore.DocumentData> {
  const user = (await db.collection("users").doc(uid).get()).data();
  if (!user) {
    throw new HttpsError("failed-precondition", "Complete onboarding first.");
  }
  return user;
}

/**
 * Returns a public-ish display name from user data.
 * @param {FirebaseFirestore.DocumentData} data User data.
 * @return {string | null} Name.
 */
function publicName(data: FirebaseFirestore.DocumentData): string | null {
  for (const key of ["name", "displayName", "firstName"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Finds and normalizes the first E.164-looking phone number in text.
 * @param {string} text Input text.
 * @return {string | undefined} Phone number.
 */
function extractPhone(text: string): string | undefined {
  const match = text.match(/\+[1-9][\d\s-]{7,20}\d/u);
  return match ? normalizePhone(match[0]) : undefined;
}

/**
 * Normalizes an E.164 phone number.
 * @param {string} raw Raw phone.
 * @return {string} Normalized phone.
 */
function normalizePhone(raw: string): string {
  const value = raw.replace(/[\s-]+/gu, "").trim();
  if (!/^\+[1-9]\d{7,14}$/u.test(value)) {
    throw new HttpsError("invalid-argument", `Invalid phone number: ${raw}`);
  }
  return value;
}

/**
 * Returns a stable match id for two users.
 * @param {string} uidA First uid.
 * @param {string} uidB Second uid.
 * @return {string} Match id.
 */
function matchIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

/**
 * Returns metadata for one action.
 * @param {SuvbotAction} action Action id.
 * @return {SuvbotActionDescriptor | undefined} Descriptor.
 */
function actionDefinition(
  action: SuvbotAction
): SuvbotActionDescriptor | undefined {
  return SUVBOT_ACTION_CATALOG.find((item) => item.id === action);
}

/**
 * Builds the user-visible message for a tapped action.
 * @param {SuvbotAction} action Suvbot action.
 * @param {string} text Optional action text.
 * @return {string} Message text.
 */
function userFacingActionText(action: SuvbotAction, text?: string): string {
  if (action === "message") return "Message";
  if (action === "listActions") return "List Suvbot actions";
  const label = actionDefinition(action)?.label ?? action;
  return action === "startDemoWorld" && text ? `${label}: ${text}` : label;
}

/**
 * Returns help text for Suvbot.
 * @return {string} Help text.
 */
function helpText(): string {
  const actionLines = SUVBOT_ACTION_CATALOG.map((action) =>
    `- ${action.label}: ${action.description}`
  );
  return [
    "I can run safe beta-demo actions for your account.",
    "The chips below are loaded from the backend.",
    ...actionLines,
    worldMenuText(),
    "You can also type shortcuts like `match +919999999999`.",
  ].join("\n");
}

/**
 * Lists the worlds and moments Start a demo accepts.
 * @return {string} Menu text.
 */
function worldMenuText(): string {
  const moments = SUVBOT_DEMO_MOMENTS
    .map((moment) => `${moment.id} (${moment.description})`)
    .join("; ");
  const worlds = suvbotDemoWorldChoices().map(({world, moments}) =>
    `- ${world.id}: ${world.events[0].name}, ${world.organizer.name}, ` +
      `${world.organizer.area} (${moments.join(", ")})`);
  return [
    "Start a demo with a world and a moment, like " +
      "`host-marketing-india live`.",
    `Moments: ${moments}.`,
    "Worlds:",
    ...worlds,
  ].join("\n");
}

/**
 * Formats a started world for chat.
 * @param {SuvbotWorldPlan} plan Started world.
 * @return {string} Bot reply.
 */
function worldStartedText(plan: SuvbotWorldPlan): string {
  const {summary} = plan;
  const moment = SUVBOT_DEMO_MOMENTS
    .find((item) => item.id === summary.moment);
  const lines = [
    `Done. ${summary.eventName} is ready at "${moment?.label}".`,
    moment?.description ?? "",
    `${summary.booked} of ${summary.capacity} booked, ` +
      `${summary.checkedIn} checked in, you included.`,
  ];
  if (summary.paidInPaise > 0) lines.push("Your payment is in your history.");
  if (summary.savedEventCount > 0) {
    lines.push(`${summary.savedEventCount} upcoming event(s) saved for you.`);
  }
  if (summary.matchThreadCount > 0) {
    lines.push(`Catches: ${summary.matchNames.join(", ")}.`);
  } else if (summary.moment === "after") {
    lines.push("Swipe on the guests in Catches.");
  }
  lines.push("Reopen Dashboard, Catches and Chats if they were already open.");
  return lines.filter(Boolean).join("\n");
}

/**
 * Returns a deterministic response for typed text.
 * @param {string} text User text.
 * @return {string} Bot reply.
 */
function responseForFreeText(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("match") || normalized.includes("tester")) {
    return "Type the tester's phone number like: match +919999999999.";
  }
  if (normalized.includes("reset") || normalized.includes("refresh")) {
    return [
      "I can reset all demo state or only chats, bookings, or alerts.",
      "Use the chips so destructive actions get confirmation.",
    ].join(" ");
  }
  if (normalized.includes("check") || normalized.includes("status")) {
    return "Tap Check setup and I will inspect your demo state.";
  }
  return helpText();
}

/**
 * Formats a demo summary for chat.
 * @param {DemoSummary} summary Summary counts.
 * @return {string} Bot reply.
 */
function summaryText(summary: DemoSummary): string {
  const world = summary.world ?
    suvbotDemoWorldChoices().find((choice) =>
      choice.world.id === summary.world?.worldId)?.world :
    undefined;
  return [
    "Here is your demo setup right now:",
    world && summary.world ?
      `World: ${world.events[0].name} (${world.id}), ` +
        `started at "${summary.world.moment}".` :
      "No demo world started yet. Tap Start a demo.",
    `${summary.savedEvents} saved demo events.`,
    `${summary.activeEventParticipations} active demo event states.`,
    `${summary.attendedEvents} attended demo events for recap/swipes.`,
    `${summary.demoMatches} demo match threads.`,
    `${summary.payments} demo payment records.`,
  ].join("\n");
}

/**
 * Truncates chat preview text to the app preview limit.
 * @param {string} text Message text.
 * @return {string} Preview.
 */
function previewText(text: string): string {
  return text.length <= 80 ? text : `${text.slice(0, 80)}…`;
}

/**
 * Converts Firestore-like timestamps to Dates.
 * @param {unknown} value Timestamp-like value.
 * @return {Date} Date or epoch fallback.
 */
function dateFromTimestamp(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as {toDate?: () => Date}).toDate;
    if (typeof toDate === "function") return toDate.call(value);
  }
  return new Date(0);
}

/**
 * Returns true when a value is a plain record.
 * @param {unknown} value Candidate value.
 * @return {boolean} True for object records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns true when an action is allowlisted.
 * @param {string} action Candidate action.
 * @return {boolean} True when supported.
 */
export function isSuvbotAction(action: string): action is SuvbotAction {
  return action === "listActions" ||
    action === "message" ||
    SUVBOT_ACTION_CATALOG.some((item) => item.id === action);
}

/**
 * Validates one document Suvbot writes. Exported for tooling that writes
 * Suvbot-owned documents outside an operation (demo_ops.mjs suvbot-enable).
 * @param {DemoDocWrite} doc Candidate write.
 */
export function assertSuvbotWrite(doc: DemoDocWrite): void {
  assertValidSuvbotDocument(doc);
}

export const listSuvbotDemoActions = onCall(
  appCheckCallableOptions,
  (request) => listSuvbotDemoActionsHandler(request)
);

export const requestSuvbotDemoOperation = onCall(
  appCheckCallableOptions,
  (request) => requestSuvbotDemoOperationHandler(request)
);
