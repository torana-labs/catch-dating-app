import {runAssistanceTransaction as transact} from "./transactionCallback";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../../operations/durableActions";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {RcsCallbackDocument, rcsCallbackClock, requireRcsCallbackId} from
  "./rcsCallbackRecords";
import {parseRcsDispatch, RcsDispatch, RCS_DISPATCHES,
  rcsAttemptScopeHash} from "./rcsDispatchRecords";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {LiveAttempt, MessageRecord, parseMessageRecord} from "./messageOutbox";
import {sameMessageContext} from "./messagingPolicy";
import {messageRecipientMatches} from "./messageRecipient";
import type {ConfirmedDeliveryState} from
  "../../platform/delivery/confirmedDeliveryState";
import {mergeDeliveryReceipt} from "./deliveryReceipts";
import {guestCollections, parseGuest} from "./guestRecords";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {applyGuestChoice} from "./guestChoiceActions";
import {rcsPhoneHash} from "./rcsProtocol";
import {assistanceReceiptRef, replayAssistanceReceipt,
  writeAssistanceReceipt} from "./assistanceReceipts";

export const RCS_CALLBACK_RECEIPT_COMMAND = "eventAssistanceRcsCallback";
const DISPOSITIONS = ["applied", "duplicateOrOlder",
  "conflictingEvidence"] as const;
const REPLY_RESULTS = ["accepted", "replayed"] as const;
const IGNORED = ["subscription", "unstructured", "guestPage",
  "unknownSuggestion", "unconfirmedRevocation", "unrelatedMessage"] as const;
const REJECTED = ["unavailable", "scopeMismatch", "staleIntent",
  "invalidChoice", "expired", "alreadyResponded", "noLongerNeeded",
  "factsStale", "guestStateChanged"] as const;
type Rejection = typeof REJECTED[number];
type Ignored = typeof IGNORED[number];
/** What consuming one callback did; a redelivery replays it unchanged. */
export type RcsCallbackOutcome =
  | {kind: "delivery"; messageId: string; attemptId: string;
    disposition: typeof DISPOSITIONS[number]}
  | {kind: "reply"; messageId: string; attemptId: string;
    result: typeof REPLY_RESULTS[number]}
  | {kind: "ignored"; reason: Ignored}
  | {kind: "rejected"; reason: Rejection};
type Outcome = RcsCallbackOutcome;
const MESSAGE_ID = /^outbox:[a-f0-9]{64}$/;
const ATTEMPT_ID = /^attempt:[a-f0-9]{64}$/;
const oneOf = (values: readonly string[], value: unknown) =>
  typeof value === "string" && values.includes(value);
/** The outcome's stored shape; a receipt that fails it is inconsistent. */
function validOutcome(value: unknown): value is Outcome {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort().join(",");
  switch (o.kind) {
  case "ignored": return keys === "kind,reason" && oneOf(IGNORED, o.reason);
  case "rejected": return keys === "kind,reason" && oneOf(REJECTED, o.reason);
  case "delivery": case "reply": {
    const ids = typeof o.messageId === "string" &&
      MESSAGE_ID.test(o.messageId) && typeof o.attemptId === "string" &&
      ATTEMPT_ID.test(o.attemptId);
    return ids && (o.kind === "delivery" ?
      keys === "attemptId,disposition,kind,messageId" &&
        oneOf(DISPOSITIONS, o.disposition) :
      keys === "attemptId,kind,messageId,result" &&
        oneOf(REPLY_RESULTS, o.result));
  }
  default: return false;
  }
}
const inconsistent = () => new Error("RCS callback receipt is inconsistent");
type Evidence = RcsCallbackDocument["evidence"];
type Correlated = {dispatch: RcsDispatch; message: MessageRecord;
  attempt: LiveAttempt};
const reject = (reason: Rejection): Outcome => ({kind: "rejected", reason});
const ignore = (reason: Ignored): Outcome => ({kind: "ignored", reason});
const CLOCK_TOLERANCE = 300_000;

/** The 64-hex part of an `rcs-event:` callback id. */
function rcsCallbackDigest(callbackId: string): string {
  return callbackId.slice("rcs-event:".length);
}

/** Authenticate evidence and commit domain effects with a terminal receipt. */
export class RcsCallbackConsumer {
  private readonly inbox: RcsCallbackStore;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.inbox = new RcsCallbackStore(db, clock);
  }

  async consume(callbackId: string): Promise<Outcome |
    {kind: "missing" | "conflicted"}> {
    requireRcsCallbackId(callbackId);
    return transact(this.db, async (tx) => {
      const read = await this.inbox.readForConsumption(tx, callbackId);
      if (read.kind !== "ready") return read;
      const callback = read.record;
      const ref = assistanceReceiptRef(this.db, RCS_CALLBACK_RECEIPT_COMMAND,
        rcsCallbackDigest(callbackId));
      const receiptSnap = await tx.get(ref);
      const now = rcsCallbackClock(this.clock());
      if (now < callback.storedAt) throw new Error("RCS clock moved backwards");
      const callbackHash = operationContentHash(callback);
      const replay = replayAssistanceReceipt<{outcome: Outcome}>(
        receiptSnap.data(), {command: RCS_CALLBACK_RECEIPT_COMMAND,
          requestHash: callbackHash, nowMillis: now},
        (result) => validOutcome(result.outcome), inconsistent);
      if (replay !== null) return replay.outcome;
      const outcome = await this.apply(tx, callback, now);
      if (!validOutcome(outcome)) {
        throw new Error("Invalid RCS callback result");
      }
      writeAssistanceReceipt(tx, ref, {command: RCS_CALLBACK_RECEIPT_COMMAND,
        retention: "trigger", requestHash: callbackHash,
        nowMillis: this.now(now), result: {outcome}});
      return outcome;
    });
  }

  private async apply(tx: Transaction, callback: RcsCallbackDocument,
    now: number): Promise<Outcome> {
    const evidence = callback.evidence;
    const observation = evidence.observation;
    switch (observation.kind) {
    case "subscription": return ignore("subscription"); // Applied at ingress.
    case "unstructuredMessage": return ignore("unstructured");
    case "suggestion": {
      if (observation.correlation.kind === "guestPage") {
        return ignore("guestPage");
      }
      if (observation.correlation.kind !== "choice") {
        return ignore("unknownSuggestion");
      }
      if (observation.suggestionType === "action") {
        return reject("invalidChoice");
      }
      const snap = await tx.get(this.db.collection(RCS_DISPATCHES)
        .doc(observation.correlation.attemptId));
      if (!snap.exists) return reject("unavailable");
      const dispatch = parseRcsDispatch(snap.data());
      if (dispatch.attemptId !== snap.id) {
        throw new Error("RCS dispatch identity mismatch");
      }
      const correlated = await this.correlate(tx, dispatch, evidence, now);
      if (!correlated) return reject("scopeMismatch");
      return this.reply(tx, callback, correlated,
        observation.correlation.choiceIndex, now);
    }
    case "expiration":
      if (observation.revocation === "unconfirmed") {
        return ignore("unconfirmedRevocation");
      }
      // Fall through to the same authenticated dispatch correlation.
    case "delivery": {
      const snaps = await tx.get(this.db.collection(RCS_DISPATCHES)
        .where("providerMessageId", "==", observation.providerMessageId)
        .limit(2));
      if (snaps.empty) return ignore("unrelatedMessage");
      if (snaps.size !== 1) throw new Error("Ambiguous RCS dispatch identity");
      const dispatch = parseRcsDispatch(snaps.docs[0].data());
      if (dispatch.attemptId !== snaps.docs[0].id) {
        throw new Error("RCS dispatch identity mismatch");
      }
      const correlated = await this.correlate(tx, dispatch, evidence, now);
      if (!correlated || (observation.kind === "expiration" &&
          (now < dispatch.expiresAt ||
           evidence.receivedAt + CLOCK_TOLERANCE < dispatch.expiresAt))) {
        return reject("scopeMismatch");
      }
      const at = this.now(now);
      const state: ConfirmedDeliveryState = observation.kind === "delivery" ?
        {kind: observation.status, at,
          providerMessageId: dispatch.providerMessageId} :
        {kind: "revoked", at, providerMessageId: dispatch.providerMessageId,
          evidenceId: callback.callbackId};
      const merged = this.delivery(correlated, evidence, state);
      this.writeDelivery(tx, correlated.message, merged.message);
      return {kind: "delivery", messageId: dispatch.messageId,
        attemptId: dispatch.attemptId, disposition: merged.disposition};
    }
    default: {
      const unhandled: never = observation;
      throw new Error("Unhandled RCS observation: " + unhandled);
    }
    }
  }

  private async correlate(tx: Transaction, dispatch: RcsDispatch,
    evidence: Evidence, now: number): Promise<Correlated | null> {
    const occurredAt = evidence.providerOccurredAt === null ? null :
      Date.parse(evidence.providerOccurredAt);
    if (dispatch.agentId !== evidence.agentId ||
        dispatch.endpointHash !== evidence.endpointHash ||
        evidence.receivedAt < dispatch.createdAt ||
        (occurredAt !== null && (occurredAt <
          dispatch.createdAt - CLOCK_TOLERANCE ||
          occurredAt > evidence.receivedAt + CLOCK_TOLERANCE))) return null;
    const snap = await tx.get(this.db.collection(EVENT_ASSISTANCE_MESSAGES)
      .doc(dispatch.messageId));
    if (!snap.exists) return null;
    const message = parseMessageRecord(snap.data());
    const attempt = message.attempts.find((a) =>
      a.attemptId === dispatch.attemptId);
    if (message.updatedAt > now) throw new Error("RCS clock moved backwards");
    if (message.messageId !== dispatch.messageId ||
        operationContentHash(message.intent) !== dispatch.intentHash ||
        !sameMessageContext(message.intent.context, dispatch.context) ||
        message.intent.attendeeId !== dispatch.attendeeId ||
        !attempt || attempt.mode !== "live" ||
        attempt.binding.routeId !== "catchEventRcs" ||
        attempt.binding.senderId !== dispatch.senderId ||
        attempt.binding.bindingRevision !== dispatch.bindingRevision ||
        attempt.binding.recipientEndpointId !== dispatch.recipientEndpointId ||
        rcsAttemptScopeHash(attempt) !== dispatch.attemptScopeHash ||
        attempt.state.kind === "reserved" ||
        ("providerMessageId" in attempt.state &&
          attempt.state.providerMessageId !== null &&
          attempt.state.providerMessageId !== dispatch.providerMessageId)) {
      return null;
    }
    return {dispatch, message, attempt};
  }

  private async reply(tx: Transaction, callback: RcsCallbackDocument,
    correlated: Correlated, index: number, now: number): Promise<Outcome> {
    const {dispatch, message} = correlated;
    const binding = dispatch.replyBinding;
    const selected = binding?.choices.find((choice) => choice.index === index);
    if (!binding || !selected ||
        message.intent.choices[index]?.choiceId !== selected.choiceId) {
      return reject("invalidChoice");
    }
    // Delivery evidence remains relevant after a button expires or the guest
    // checks in. It must still fence fallback when its action is rejected.
    const merged = this.delivery(correlated, callback.evidence,
      {kind: "delivered", at: this.now(now),
        providerMessageId: dispatch.providerMessageId});
    const outcome = await this.applyReply(tx, callback,
      {...correlated, message: merged.message}, binding,
      selected.choiceId, now);
    if (outcome.kind !== "reply" || outcome.result !== "accepted") {
      this.writeDelivery(tx, message, merged.message);
    }
    return outcome;
  }

  private async applyReply(tx: Transaction, callback: RcsCallbackDocument,
    correlated: Correlated, binding: NonNullable<RcsDispatch["replyBinding"]>,
    choiceId: string, now: number): Promise<Outcome> {
    const {dispatch, message, attempt} = correlated;
    if (now >= binding.expiresAt) return reject("expired");
    if (attempt.state.kind === "notDispatched") {
      return reject("noLongerNeeded");
    }
    const [guestSnap, attendeeSnap] = await tx.getAll(
      this.db.collection(guestCollections.guests).doc(binding.guestId),
      this.db.collection("eventAttendees").doc(dispatch.attendeeId));
    if (!guestSnap.exists || !attendeeSnap.exists) return reject("unavailable");
    const guest = parseGuest(guestSnap.data());
    if (guest.guestId !== binding.guestId ||
        guest.episodeId !== binding.episodeId ||
        message.intent.episodeId !== binding.episodeId ||
        guest.attendeeGeneration !== binding.attendeeGeneration ||
        guest.sourceGeneration !== binding.sourceGeneration ||
        attendeeSnap.data()?.linkedUid !== binding.subjectUid ||
        !messageRecipientMatches(binding.recipientBinding, {
          rosterPhone: attendeeSnap.data()?.phoneE164,
          linkedUid: attendeeSnap.data()?.linkedUid,
          sourceGeneration: guest.sourceGeneration,
        }, (phone) => rcsPhoneHash(phone) === dispatch.endpointHash)) {
      return reject("scopeMismatch");
    }
    let gate;
    try {
      gate = await readEventAssistanceMessageGate(this.db, tx,
        message.intent, now);
    } catch (error) {
      if (error instanceof HttpsError && error.code === "not-found") {
        return reject("unavailable");
      }
      throw error;
    }
    const at = this.now(now);
    const result = applyGuestChoice(this.db, tx, {guest,
      message, gate, now: at,
      expectedGuestRevision: binding.guestRevision,
      scope: {context: dispatch.context, eventId: dispatch.context.eventId,
        attendeeId: dispatch.attendeeId, episodeId: binding.episodeId,
        validUntil: binding.expiresAt, source: {kind: "provider",
          attemptId: dispatch.attemptId,
          providerEventId: callback.evidence.receiptKey}},
      submission: {intentId: message.intent.intentId,
        intentRevision: message.intent.revision, choiceId,
        requestId: callback.evidence.receiptKey}});
    return result.kind === "rejected" ? result : {kind: "reply",
      messageId: dispatch.messageId, attemptId: dispatch.attemptId,
      result: result.kind};
  }

  private delivery(correlated: Correlated, evidence: Evidence,
    state: ConfirmedDeliveryState) {
    const {dispatch, message, attempt} = correlated;
    const merged = mergeDeliveryReceipt(attempt, {
      attemptId: dispatch.attemptId, senderId: dispatch.senderId,
      bindingRevision: dispatch.bindingRevision,
      recipientEndpointId: dispatch.recipientEndpointId,
      routeId: "catchEventRcs", providerEventId: evidence.receiptKey,
      receivedAt: state.at, state});
    const conflict = message.deliveryConflict ||
      merged.disposition === "conflictingEvidence";
    const changed = conflict !== message.deliveryConflict ||
      operationContentHash(attempt) !== operationContentHash(merged.attempt);
    return {disposition: merged.disposition,
      message: changed ? parseMessageRecord({...message,
        deliveryConflict: conflict, revision: message.revision + 1,
        updatedAt: state.at, attempts: message.attempts.map((a) =>
          a.attemptId === attempt.attemptId ? merged.attempt : a)}) : message};
  }

  private writeDelivery(tx: Transaction, before: MessageRecord,
    after: MessageRecord) {
    if (before !== after) {
      tx.set(this.db.collection(EVENT_ASSISTANCE_MESSAGES)
        .doc(after.messageId), after);
    }
  }

  private now(previous: number): number {
    const now = rcsCallbackClock(this.clock());
    if (now < previous) throw new Error("RCS clock moved backwards");
    return now;
  }
}
