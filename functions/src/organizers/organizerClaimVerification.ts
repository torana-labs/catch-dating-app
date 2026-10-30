import crypto from "node:crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineBoolean, defineString} from "firebase-functions/params";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {RateLimitConfig} from "../shared/rateLimit";
import {isAccountReadyUserProfile} from "../shared/profileReadiness";
import type {
  OrganizerClaimInstagramCodeDocument,
  OrganizerClaimRequestDocument,
  OrganizerClaimVerificationDocument,
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {StartOrganizerClaimVerificationCallablePayload} from
  "../shared/generated/startOrganizerClaimVerificationCallablePayload";
import type {StartOrganizerClaimVerificationCallableResponse} from
  "../shared/generated/startOrganizerClaimVerificationCallableResponse";
import type {GetOrganizerClaimVerificationOptionsCallablePayload} from
  "../shared/generated/getOrganizerClaimVerificationOptionsCallablePayload";
import type {OrganizerClaimVerificationOptionsCallableResponse} from
  "../shared/generated/organizerClaimVerificationOptionsCallableResponse";
import type {OrganizerClaimInstagramMessageDocument} from
  "../shared/generated/organizerClaimInstagramMessageDocument";
import {validateStartOrganizerClaimVerificationCallablePayload} from
  "../shared/generated/validators/startOrganizerClaimVerificationInput";
import {validateGetOrganizerClaimVerificationOptionsCallablePayload} from
  "../shared/generated/validators/getOrganizerClaimVerificationOptionsInput";
import {
  assertCanBeClaimed,
  organizerClaimRequestId,
  prepareOrganizerClaimApproval,
} from "./organizerClaimApproval";
import {listingInstagramUsername, listingLumaCalendarUrl,
  normalizeInstagramUsername} from "./organizerClaimSources";
import {extractClaimCode} from "./instagramClaimProtocol";
import type {InstagramInboundMessage} from "./instagramClaimProtocol";
import type {InstagramMessagingProvider} from "./instagramMessagingProvider";

type ClaimMethod = StartOrganizerClaimVerificationCallablePayload["method"];
// The receipt also records nomination replies (instagramInboundRouter.ts);
// claim verification writes only these.
type MessageOutcome = Exclude<OrganizerClaimInstagramMessageDocument["outcome"],
  "nominationQueued" | "nominationWithoutLinks" | "nominationRateLimited" |
  "nominationUnclear" | "shareWithoutProfile">;

const minuteMillis = 60 * 1000;
export const CLAIM_CODE_LIFETIME_MILLIS = 30 * minuteMillis;
/** Starting again with less than this left issues a fresh code. */
const CLAIM_CODE_REUSE_MIN_MILLIS = 5 * minuteMillis;
const MESSAGE_RECEIPT_LIFETIME_MILLIS = 30 * 24 * 60 * minuteMillis;
const hourMillis = 60 * minuteMillis;
const startLimit: RateLimitConfig = {maxRequests: 10, windowMs: hourMillis};
const optionsLimit: RateLimitConfig = {maxRequests: 30, windowMs: minuteMillis};
const senderLimit: RateLimitConfig = {maxRequests: 10, windowMs: hourMillis};

const collections = {
  attempts: "organizerClaimVerifications",
  codes: "organizerClaimInstagramCodes",
  messages: "organizerClaimInstagramMessages",
} as const;

// The Instagram method stays hidden until the owner adds the Meta secrets and
// sets CATCH_INSTAGRAM_CLAIMS_ENABLED for the environment.
export const instagramClaimsEnabled = defineBoolean(
  "CATCH_INSTAGRAM_CLAIMS_ENABLED", {default: false});
export const catchInstagramAccountId = defineString(
  "CATCH_INSTAGRAM_ACCOUNT_ID", {default: ""});
const catchInstagramHandle = defineString("CATCH_INSTAGRAM_HANDLE",
  {default: ""});

export interface ClaimVerificationConfig {
  instagramEnabled: boolean;
  /** Catch's Instagram username without @, or null when unset. */
  catchInstagramHandle: string | null;
}

export interface ClaimVerificationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => number;
  config: () => ClaimVerificationConfig;
  randomCode: () => string;
  checkRateLimit?: (
    db: FirebaseFirestore.Firestore,
    key: string,
    action: string,
    limit: RateLimitConfig
  ) => Promise<void>;
}

export interface InstagramClaimMessageDeps extends ClaimVerificationDeps {
  provider: () => InstagramMessagingProvider;
}

export const defaultClaimVerificationDeps: ClaimVerificationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => Date.now(),
  config: () => {
    const handle = normalizeInstagramUsername(catchInstagramHandle.value());
    return {
      instagramEnabled: instagramClaimsEnabled.value() && handle !== null &&
        /^[0-9]{1,32}$/.test(catchInstagramAccountId.value().trim()),
      catchInstagramHandle: handle,
    };
  },
  randomCode: () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0"),
  checkRateLimit: defaultCheckRateLimit,
};

export async function getOrganizerClaimVerificationOptionsHandler(
  request: CallableRequest<unknown>,
  deps: ClaimVerificationDeps = defaultClaimVerificationDeps
): Promise<OrganizerClaimVerificationOptionsCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerClaimVerificationOptionsCallablePayload
  >(request, validateGetOrganizerClaimVerificationOptionsCallablePayload,
    normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getOrganizerClaimVerificationOptions",
    optionsLimit);
  const snap = await db.collection("organizers").doc(data.organizerId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Organizer listing not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(snap, "OrganizerDocument");
  assertCanBeClaimed(organizer);
  const config = deps.config();
  const instagram = listingInstagramUsername(organizer);
  return {
    organizerId: data.organizerId,
    methods: [
      {
        method: "instagramMessage",
        available: config.instagramEnabled && instagram !== null,
        proofTarget: instagram,
        unavailableReason: !config.instagramEnabled ? "turnedOff" :
          instagram === null ? "noSourceOnListing" : null,
      },
      {
        method: "lumaDescription",
        available: false,
        proofTarget: listingLumaCalendarUrl(organizer),
        unavailableReason: "turnedOff",
      },
    ],
    catchInstagramHandle: config.instagramEnabled ?
      config.catchInstagramHandle : null,
  };
}

export async function startOrganizerClaimVerificationHandler(
  request: CallableRequest<unknown>,
  deps: ClaimVerificationDeps = defaultClaimVerificationDeps
): Promise<StartOrganizerClaimVerificationCallableResponse> {
  const requesterUid = requireAuth(request);
  const data = validateCallableWithAjv<
    StartOrganizerClaimVerificationCallablePayload
  >(request, validateStartOrganizerClaimVerificationCallablePayload,
    normalizePayload);
  const config = deps.config();
  if (data.method !== "instagramMessage" || !config.instagramEnabled ||
      !config.catchInstagramHandle) {
    throw new HttpsError("failed-precondition",
      "This way of checking is not switched on yet.");
  }
  const catchHandle = config.catchInstagramHandle;
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, requesterUid,
    "startOrganizerClaimVerification", startLimit);
  const attemptId = organizerClaimAttemptId(data.organizerId, requesterUid,
    data.method);
  const attemptRef = db.collection(collections.attempts).doc(attemptId);
  // Several candidates make a clash with another live code a non-event.
  const candidates = [...new Set(Array.from({length: 4}, deps.randomCode))];
  const nowMillis = deps.now();

  return db.runTransaction(async (tx) => {
    const [organizerSnap, attemptSnap, userSnap, deletedUserSnap] =
      await Promise.all([
        tx.get(db.collection("organizers").doc(data.organizerId)),
        tx.get(attemptRef),
        tx.get(db.collection("users").doc(requesterUid)),
        tx.get(db.collection("deletedUsers").doc(requesterUid)),
      ]);
    if (deletedUserSnap.exists) {
      throw new HttpsError("failed-precondition",
        "This account cannot claim organizer listings.");
    }
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    const organizer = requireDoc<OrganizerDocument>(organizerSnap,
      "OrganizerDocument");
    assertCanBeClaimed(organizer);
    if (!userSnap.exists || !isAccountReadyUserProfile(
      requireDoc<UserProfileDocument>(userSnap, "UserProfileDocument"))) {
      throw new HttpsError("failed-precondition",
        "Finish your Catch account before you claim a page.");
    }
    const proofTarget = listingInstagramUsername(organizer);
    if (!proofTarget) {
      throw new HttpsError("failed-precondition",
        "This listing has no Instagram account to check.");
    }
    const existing = attemptSnap.exists ?
      requireDoc<OrganizerClaimVerificationDocument>(attemptSnap,
        "OrganizerClaimVerificationDocument") : null;
    if (existing?.status === "awaitingProof" &&
        existing.proofTarget === proofTarget &&
        existing.expiresAt.toMillis() - nowMillis >
          CLAIM_CODE_REUSE_MIN_MILLIS) {
      return startResponse(existing, catchHandle);
    }
    const [previousCodeSnap, ...candidateSnaps] = await Promise.all([
      existing ? tx.get(db.collection(collections.codes).doc(existing.code)) :
        Promise.resolve(null),
      ...candidates.map((code) =>
        tx.get(db.collection(collections.codes).doc(code))),
    ]);
    const code = candidates.find((_candidate, index) => {
      const snap = candidateSnaps[index];
      return !snap.exists || requireDoc<OrganizerClaimInstagramCodeDocument>(
        snap, "OrganizerClaimInstagramCodeDocument").expiresAt.toMillis() <=
          nowMillis;
    });
    if (!code) {
      throw new HttpsError("unavailable", "Try again in a moment.");
    }
    const timestamp = deps.serverTimestamp();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      nowMillis + CLAIM_CODE_LIFETIME_MILLIS);
    const attempt = {
      attemptId,
      organizerId: data.organizerId,
      requesterUid,
      method: data.method,
      status: "awaitingProof",
      code,
      proofTarget,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt,
      verifiedAt: null,
      claimRequestId: null,
      evidence: null,
      lastRejection: null,
    } as const;
    tx.set(attemptRef, attempt);
    tx.set(db.collection(collections.codes).doc(code), {
      code, attemptId, organizerId: data.organizerId, expiresAt,
      consumedAt: null,
    });
    // The superseded code keeps its reservation so a late send is told it
    // was replaced rather than that it is unknown.
    if (previousCodeSnap?.exists && previousCodeSnap.id !== code &&
        previousCodeSnap.data()?.attemptId === attemptId) {
      tx.update(previousCodeSnap.ref, {consumedAt: timestamp});
    }
    return startResponse({...attempt, expiresAt}, catchHandle);
  });
}

/**
 * Handles the claim codes in direct messages to Catch's Instagram account,
 * one message at a time and at most once per message.
 */
export async function processInstagramClaimMessages(
  messages: InstagramInboundMessage[],
  deps: InstagramClaimMessageDeps
): Promise<void> {
  for (const message of messages) {
    const outcome = await processInstagramClaimMessage(message, deps);
    if (!outcome) continue;
    logger.info("Instagram claim message handled", {outcome: outcome.outcome});
    const reply = claimReplyText(outcome.outcome, outcome.proofTarget);
    if (!reply) continue;
    try {
      await deps.provider().sendReply(message.senderId, reply);
    } catch {
      // The outcome is already durable; a lost reply is not retried, and
      // the claim page shows the same state.
      logger.warn("Instagram claim reply failed", {outcome: outcome.outcome});
    }
  }
}

interface HandledMessage {
  outcome: MessageOutcome;
  proofTarget: string | null;
}

async function processInstagramClaimMessage(
  message: InstagramInboundMessage,
  deps: InstagramClaimMessageDeps
): Promise<HandledMessage | null> {
  const code = extractClaimCode(message.text);
  // Without a code this is ordinary inbox traffic for Catch's team.
  if (!code) return null;
  const db = deps.firestore();
  const receiptRef = db.collection(collections.messages)
    .doc(message.messageKey);
  if ((await receiptRef.get()).exists) return null;
  try {
    await deps.checkRateLimit?.(db, `instagram_${senderKey(message.senderId)}`,
      "instagramClaimMessage", senderLimit);
  } catch (error) {
    if (error instanceof HttpsError && error.code === "resource-exhausted") {
      return recordOutcome(db, deps, message, "rateLimited", null, null);
    }
    throw error;
  }
  const codeRef = db.collection(collections.codes).doc(code);
  const reservation = await readReservation(codeRef);
  const nowMillis = deps.now();
  if (!reservation) {
    return recordOutcome(db, deps, message, "unknownCode", null, null);
  }
  if (reservation.consumedAt) {
    return recordOutcome(db, deps, message, "codeAlreadyUsed",
      reservation.attemptId, null);
  }
  if (reservation.expiresAt.toMillis() <= nowMillis) {
    return recordOutcome(db, deps, message, "expiredCode",
      reservation.attemptId, null);
  }
  const attemptRef = db.collection(collections.attempts)
    .doc(reservation.attemptId);
  const attemptSnap = await attemptRef.get();
  const attempt = attemptSnap.exists ?
    requireDoc<OrganizerClaimVerificationDocument>(attemptSnap,
      "OrganizerClaimVerificationDocument") : null;
  if (!attempt || attempt.code !== code ||
      attempt.status !== "awaitingProof") {
    return recordOutcome(db, deps, message, "codeAlreadyUsed",
      reservation.attemptId, null);
  }
  const username = await deps.provider().lookupUsername(message.senderId);
  if (!username) {
    return recordOutcome(db, deps, message, "senderUnknown",
      attempt.attemptId, null);
  }
  if (username !== attempt.proofTarget) {
    return recordOutcome(db, deps, message, "wrongSender",
      attempt.attemptId, attempt.proofTarget);
  }
  return approveInstagramClaim(db, deps, message, code, username);
}

/** The verified path: same transaction shape as staff approval. */
async function approveInstagramClaim(
  db: FirebaseFirestore.Firestore,
  deps: InstagramClaimMessageDeps,
  message: InstagramInboundMessage,
  code: string,
  username: string
): Promise<HandledMessage | null> {
  const receiptRef = db.collection(collections.messages)
    .doc(message.messageKey);
  const codeRef = db.collection(collections.codes).doc(code);
  const transitionId = crypto.randomUUID();
  const recordedAt = new Date(deps.now()).toISOString();
  return db.runTransaction(async (tx) => {
    const [receiptSnap, codeSnap] = await Promise.all([
      tx.get(receiptRef), tx.get(codeRef)]);
    if (receiptSnap.exists) return null;
    const nowMillis = deps.now();
    const reservation = codeSnap.exists ?
      requireDoc<OrganizerClaimInstagramCodeDocument>(codeSnap,
        "OrganizerClaimInstagramCodeDocument") : null;
    const attemptRef = reservation ?
      db.collection(collections.attempts).doc(reservation.attemptId) : null;
    const attemptSnap = attemptRef ? await tx.get(attemptRef) : null;
    const attempt = attemptSnap?.exists ?
      requireDoc<OrganizerClaimVerificationDocument>(attemptSnap,
        "OrganizerClaimVerificationDocument") : null;
    const stale: MessageOutcome | null = !reservation || !attempt ?
      "unknownCode" : reservation.consumedAt ||
      attempt.status !== "awaitingProof" || attempt.code !== code ?
        "codeAlreadyUsed" :
        reservation.expiresAt.toMillis() <= nowMillis ||
        attempt.expiresAt.toMillis() <= nowMillis ? "expiredCode" : null;
    if (stale || !attempt || !attemptRef) {
      stageReceipt(tx, receiptRef, deps, message, stale ?? "unknownCode",
        attempt?.attemptId ?? null);
      return {outcome: stale ?? "unknownCode", proofTarget: null};
    }
    const organizerSnap = await tx.get(
      db.collection("organizers").doc(attempt.organizerId));
    const requestId = organizerClaimRequestId(attempt.organizerId,
      attempt.requesterUid);
    const requestSnap = await tx.get(
      db.collection("organizerClaimRequests").doc(requestId));
    const pendingRequest = requestSnap.exists &&
      requireDoc<OrganizerClaimRequestDocument>(requestSnap,
        "OrganizerClaimRequestDocument").status === "pending";
    let stageApproval: () => void;
    try {
      if (!organizerSnap.exists) {
        throw new HttpsError("not-found", "Organizer listing not found.");
      }
      stageApproval = await prepareOrganizerClaimApproval(tx, db, {
        requestId,
        organizerId: attempt.organizerId,
        requesterUid: attempt.requesterUid,
        organizer: requireDoc<OrganizerDocument>(organizerSnap,
          "OrganizerDocument"),
        decidedByUid: null,
        decisionReason: `Verified by an Instagram message from @${username}.`,
        notificationActorUid: attempt.requesterUid,
        // A request the requester already sent to staff review is approved
        // as it stands; otherwise the verified claim creates its own.
        newRequest: pendingRequest ? null : {
          requesterRole: "owner",
          proofUrls: [`https://www.instagram.com/${username}/`],
        },
        supersedeOtherPendingClaim: true,
        transitionId,
        recordedAt,
        serverTimestamp: deps.serverTimestamp,
      });
    } catch (error) {
      if (!(error instanceof HttpsError)) throw error;
      // Already claimed, archived, or the account is gone: staff review is
      // the way forward, so the code stays live for the page to explain.
      stageReceipt(tx, receiptRef, deps, message, "claimUnavailable",
        attempt.attemptId);
      return {outcome: "claimUnavailable", proofTarget: null};
    }
    stageApproval();
    const timestamp = deps.serverTimestamp();
    tx.update(attemptRef, {
      status: "verified",
      verifiedAt: timestamp,
      updatedAt: timestamp,
      claimRequestId: requestId,
      evidence: {
        source: "instagramMessage",
        observedIdentity: username,
        messageKey: message.messageKey,
        observedAt: timestamp,
      },
      lastRejection: null,
    });
    tx.update(codeRef, {consumedAt: timestamp});
    stageReceipt(tx, receiptRef, deps, message, "verified",
      attempt.attemptId);
    return {outcome: "verified", proofTarget: attempt.proofTarget};
  });
}

/**
 * Records a message that did not verify, once. A wrong sender also tells the
 * waiting claim page what to fix.
 */
async function recordOutcome(
  db: FirebaseFirestore.Firestore,
  deps: ClaimVerificationDeps,
  message: InstagramInboundMessage,
  outcome: MessageOutcome,
  attemptId: string | null,
  proofTarget: string | null
): Promise<HandledMessage | null> {
  const receiptRef = db.collection(collections.messages)
    .doc(message.messageKey);
  const attemptRef = attemptId && outcome === "wrongSender" ?
    db.collection(collections.attempts).doc(attemptId) : null;
  return db.runTransaction(async (tx) => {
    const [receiptSnap, attemptSnap] = await Promise.all([
      tx.get(receiptRef),
      attemptRef ? tx.get(attemptRef) : Promise.resolve(null),
    ]);
    if (receiptSnap.exists) return null;
    stageReceipt(tx, receiptRef, deps, message, outcome, attemptId);
    if (attemptRef && attemptSnap?.exists &&
        attemptSnap.data()?.status === "awaitingProof") {
      const timestamp = deps.serverTimestamp();
      tx.update(attemptRef, {updatedAt: timestamp,
        lastRejection: {reason: "wrongSender", at: timestamp}});
    }
    return {outcome, proofTarget};
  });
}

function stageReceipt(
  tx: FirebaseFirestore.Transaction,
  receiptRef: FirebaseFirestore.DocumentReference,
  deps: ClaimVerificationDeps,
  message: InstagramInboundMessage,
  outcome: MessageOutcome,
  attemptId: string | null
) {
  tx.create(receiptRef, {
    messageKey: message.messageKey,
    outcome,
    attemptId,
    nominatorId: null,
    receivedAt: deps.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(
      deps.now() + MESSAGE_RECEIPT_LIFETIME_MILLIS),
  });
}

async function readReservation(ref: FirebaseFirestore.DocumentReference):
  Promise<OrganizerClaimInstagramCodeDocument | null> {
  const snap = await ref.get();
  return snap.exists ? requireDoc<OrganizerClaimInstagramCodeDocument>(snap,
    "OrganizerClaimInstagramCodeDocument") : null;
}

/** What Catch says back in the Instagram thread. Null sends nothing. */
export function claimReplyText(
  outcome: MessageOutcome,
  proofTarget: string | null
): string | null {
  switch (outcome) {
  case "verified":
    return "Thanks, that's you. Your page on Catch is now yours. " +
      "Go back to the claim page to set it up.";
  case "wrongSender":
    return `This code is for @${proofTarget}. Send it from that account ` +
      "and the claim will go through.";
  case "expiredCode":
    return "That code has expired. Codes work for 30 minutes. " +
      "Get a new one on the claim page.";
  case "codeAlreadyUsed":
    return "That code has been used or replaced. Use the code the claim " +
      "page shows now.";
  case "unknownCode":
    return "We don't recognise that code. Check the code on the claim " +
      "page and send it again.";
  case "senderUnknown":
    return "We couldn't see which account sent this. Try again in a minute.";
  case "claimUnavailable":
    return "We couldn't finish this claim from here. Go back to the claim " +
      "page and ask our team to review it.";
  case "rateLimited":
    return null;
  }
}

function startResponse(
  attempt: Pick<OrganizerClaimVerificationDocument, "attemptId" |
    "organizerId" | "method" | "code" | "proofTarget" | "expiresAt">,
  catchHandle: string
): StartOrganizerClaimVerificationCallableResponse {
  return {
    attemptId: attempt.attemptId,
    organizerId: attempt.organizerId,
    method: attempt.method,
    code: attempt.code,
    proofTarget: attempt.proofTarget,
    catchInstagramHandle: catchHandle,
    expiresAt: attempt.expiresAt.toDate().toISOString(),
  };
}

/** One attempt per listing, account and method; starting again renews it. */
export function organizerClaimAttemptId(
  organizerId: string,
  uid: string,
  method: ClaimMethod
): string {
  const hash = crypto.createHash("sha256")
    .update(`${organizerId}:${uid}:${method}`).digest("hex").slice(0, 24);
  return `claim_attempt_${hash}`;
}

function senderKey(senderId: string): string {
  return crypto.createHash("sha256").update(senderId).digest("hex")
    .slice(0, 32);
}

function normalizePayload(value: unknown): Record<string, unknown> {
  const data = typeof value === "object" && value !== null &&
    !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    ...data,
    ...(typeof data.organizerId === "string" ?
      {organizerId: data.organizerId.trim()} : {}),
  };
}

export const getOrganizerClaimVerificationOptions = onCall(
  appCheckCallableOptions,
  (request) => getOrganizerClaimVerificationOptionsHandler(request)
);
export const startOrganizerClaimVerification = onCall(
  appCheckCallableOptions,
  (request) => startOrganizerClaimVerificationHandler(request)
);
