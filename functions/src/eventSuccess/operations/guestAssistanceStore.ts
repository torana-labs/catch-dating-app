import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {EventAssistanceGuestViewCallableResponse as GuestView} from
  "../../shared/generated/eventAssistanceGuestViewCallableResponse";
import type {SubmitEventAssistanceGuestChoiceCallablePayload as Submission} from
  "../../shared/generated/submitEventAssistanceGuestChoiceCallablePayload";
import type {
  SubmitEventAssistanceGuestChoiceCallableResponse as SubmitResult,
} from
  "../../shared/generated/submitEventAssistanceGuestChoiceCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {joiningGuidanceIsCurrent} from "./groupProgressReader";
import {applyGuestChoice} from "./guestChoiceActions";
import {
  MessageRecord, parseMessageRecord,
} from "./messageOutbox";
import {prepareGuestMessagePublication} from "./guestMessagePublication";
import {sameMessageContext} from "./messagingPolicy";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {
  Grant, Guest, guestCanReceiveMessage, guestCollections, guestIdentity,
  GuestSourceFacts,
  messageWindowOpen, parseGrant, parseGuest, parseThread, readGuestSourceFacts,
  requireDocumentId, Thread, threadIdentity, unavailable,
} from "./guestRecords";
import {
  grantSecret, guestSecretHash, matchesGuestSecret,
} from "./guestLinkTokens";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";

interface ResolvedGuestView {
  grant: Grant;
  guest: Guest;
  thread: Thread;
  message: MessageRecord;
  source: GuestSourceFacts;
  guidanceCurrent: boolean;
}

/** Trusted publisher plus the least-authority bearer response boundary. */
export class GuestAssistanceStore {
  constructor(
    private readonly db: Firestore,
    private readonly clock: () => number = Date.now
  ) {}

  /** Reuse an operation id, or supply a revision to start a new episode. */
  async startEpisode(
    context: Guest["context"], attendeeId: string, operationId: string,
    expectedRevision: number | null
  ): Promise<Guest> {
    const guestId = guestIdentity(context, attendeeId);
    requireDocumentId(operationId);
    return transact(this.db, async (tx) => {
      const reference = this.db.collection(guestCollections.guests)
        .doc(guestId);
      const snapshot = await tx.get(reference);
      const source = await readGuestSourceFacts(this.db, tx, context,
        attendeeId);
      const now = this.now();
      const episodeId = "episode:" + operationContentHash([
        guestId, source.attendeeGeneration, source.sourceGeneration,
        operationId, expectedRevision,
      ]);
      const existing = snapshot.exists ? parseGuest(snapshot.data()) : null;
      if (existing && (existing.guestId !== guestId ||
          existing.updatedAt > now)) {
        throw unavailable();
      }
      if (existing?.episodeId === episodeId) return existing;
      if ((existing?.revision ?? null) !== expectedRevision) throw conflict();
      if (source.attendeeStatus !== "registered" &&
          source.attendeeStatus !== "checkedIn" &&
          !(source.attendeeStatus === "cancelled" &&
            source.eventStatus === "cancelled")) throw unavailable();
      const guest = parseGuest({schemaVersion: 1, guestId, context, attendeeId,
        attendeeGeneration: source.attendeeGeneration,
        sourceGeneration: source.sourceGeneration, episodeId,
        participation: {state: "active", resumeAtUnit: null},
        revision: existing ? existing.revision + 1 : 0, lifecycle: "active",
        intention: {kind: "unknown"}, createdAt: existing?.createdAt ?? now,
        updatedAt: now});
      tx.set(reference, guest);
      return guest;
    });
  }

  /** Publish current instructions, superseding this workflow's old intent. */
  async publishMessage(
    value: unknown, expectedThreadRevision: number | null
  ): Promise<Thread> {
    return transact(this.db, async (tx) => {
      const prepared = await prepareGuestMessagePublication(this.db, tx,
        value, expectedThreadRevision, () => this.now());
      prepared.commit();
      return prepared.thread;
    });
  }

  /** Idempotent issuance. Only the worker receives the regenerated secret. */
  async issueLink(
    threadId: string, operationId: string, keys: GuestLinkSigningKeys
  ): Promise<{linkId: string; secret: string; expiresAt: number}> {
    requireDocumentId(threadId);
    requireDocumentId(operationId);
    const linkId = operationContentHash([threadId, operationId]).slice(0, 32);
    return transact(this.db, async (tx) => {
      const reference = this.db.collection(guestCollections.grants).doc(linkId);
      const [threadSnap, grantSnap] = await Promise.all([
        tx.get(this.db.collection(guestCollections.threads).doc(threadId)),
        tx.get(reference),
      ]);
      const thread = parseThread(threadSnap.data());
      if (thread.threadId !== threadId) throw unavailable();
      const guest = parseGuest((await tx.get(this.db
        .collection(guestCollections.guests).doc(thread.guestId))).data());
      if (guest.guestId !== thread.guestId) throw unavailable();
      const source = await readGuestSourceFacts(this.db, tx, thread.context,
        thread.attendeeId);
      const message = parseMessageRecord((await tx.get(this.db
        .collection(EVENT_ASSISTANCE_MESSAGES).doc(thread.messageId))).data());
      let now = this.now();
      if (!guestCanReceiveMessage(guest, source, message.intent) ||
          guest.episodeId !== thread.episodeId ||
          message.messageId !== thread.messageId ||
          threadIdentity(message.intent) !== thread.threadId ||
          (message.lifecycle !== "active" &&
            message.lifecycle !== "responded") ||
          message.intent.expiresAt <= now ||
          !messageWindowOpen(message.intent, source, now)) throw unavailable();
      if (!await joiningGuidanceIsCurrent(this.db, tx, message.intent, now)) {
        throw unavailable();
      }
      now = this.now();
      if (message.intent.expiresAt <= now ||
          !messageWindowOpen(message.intent, source, now)) throw unavailable();
      let grant: Grant;
      if (grantSnap.exists) {
        grant = parseGrant(grantSnap.data());
        if (grant.linkId !== linkId || grant.threadId !== threadId ||
            grant.guestId !== thread.guestId ||
            grant.episodeId !== thread.episodeId ||
            !sameMessageContext(grant.context, thread.context) ||
            grant.revokedAt !== null ||
            grant.expiresAt <= now) throw unavailable();
      } else {
        grant = parseGrant({schemaVersion: 1, linkId, threadId,
          guestId: thread.guestId, context: thread.context,
          attendeeId: thread.attendeeId, episodeId: thread.episodeId,
          tokenHash: "0".repeat(64), signingKeyId: keys.currentKeyId,
          issuedAt: now, expiresAt: Math.min(now + 86_400_000,
            source.eventEnd > now ? source.eventEnd : now + 86_400_000),
          revokedAt: null});
      }
      const secret = grantSecret(grant, keys);
      if (grantSnap.exists && !matchesGuestSecret(grant, secret)) {
        throw unavailable();
      }
      if (!grantSnap.exists) {
        tx.create(reference, {...grant, tokenHash: guestSecretHash(secret)});
      }
      return {linkId, secret, expiresAt: grant.expiresAt};
    });
  }

  async revokeLink(linkId: string): Promise<void> {
    assertLinkId(linkId);
    await transact(this.db, async (tx) => {
      const reference = this.db.collection(guestCollections.grants).doc(linkId);
      const grant = parseGrant((await tx.get(reference)).data());
      if (grant.revokedAt === null) {
        tx.set(reference, parseGrant({...grant, revokedAt: this.now()}));
      }
    });
  }

  async getView(linkId: string, secret: string): Promise<GuestView> {
    return transact(this.db, async (tx) =>
      this.project(await this.resolve(tx, linkId, secret), this.now()));
  }

  async submit(input: Submission): Promise<SubmitResult> {
    return transact(this.db, async (tx) => {
      const resolved = await this.resolve(tx, input.linkId, input.secret);
      const {message, guest, grant} = resolved;
      const now = this.now();
      const view = this.project(resolved, now);
      if (view.status !== "ready") {
        return {result: {kind: "rejected", reason: "noLongerNeeded"}, view};
      }
      const result = applyGuestChoice(this.db, tx, {
        guest, message, submission: input,
        expectedGuestRevision: input.expectedGuestRevision,
        scope: {context: grant.context, eventId: grant.context.eventId,
          attendeeId: grant.attendeeId, episodeId: grant.episodeId,
          validUntil: grant.expiresAt,
          source: {kind: "guestWeb", linkId: grant.linkId}},
        gate: {kind: "allow", checkedAt: now,
          validUntil: Math.min(message.intent.expiresAt, grant.expiresAt),
          instructionRevision: view.instructionRevision}, now,
      });
      if (result.kind === "rejected") return {result, view};
      return {result: {kind: result.kind}, view: this.project({...resolved,
        guest: result.guest, message: result.message}, now)};
    });
  }

  private async resolve(
    tx: Transaction, linkId: string, secret: string
  ): Promise<ResolvedGuestView> {
    assertLinkId(linkId);
    const grant = parseGrant((await tx.get(this.db
      .collection(guestCollections.grants).doc(linkId))).data());
    if (grant.linkId !== linkId) throw unavailable();
    const now = this.now();
    if (!matchesGuestSecret(grant, secret) || grant.revokedAt !== null ||
        grant.issuedAt > now || grant.expiresAt <= now) throw unavailable();
    const [guestSnap, threadSnap] = await tx.getAll(
      this.db.collection(guestCollections.guests).doc(grant.guestId),
      this.db.collection(guestCollections.threads).doc(grant.threadId),
    );
    const guest = parseGuest(guestSnap.data());
    const thread = parseThread(threadSnap.data());
    if (guest.guestId !== grant.guestId ||
        guest.episodeId !== grant.episodeId ||
        thread.threadId !== grant.threadId ||
        thread.guestId !== guest.guestId ||
        thread.episodeId !== guest.episodeId ||
        thread.attendeeId !== guest.attendeeId ||
        !sameMessageContext(thread.context, grant.context) ||
        !sameMessageContext(guest.context, grant.context)) throw unavailable();
    const message = parseMessageRecord((await tx.get(this.db
      .collection(EVENT_ASSISTANCE_MESSAGES).doc(thread.messageId))).data());
    if (message.messageId !== thread.messageId ||
        threadIdentity(message.intent) !== thread.threadId ||
        message.intent.attendeeId !== guest.attendeeId ||
        message.intent.episodeId !== guest.episodeId ||
        !sameMessageContext(message.intent.context, guest.context)) {
      throw unavailable();
    }
    const source = await readGuestSourceFacts(this.db, tx, guest.context,
      guest.attendeeId);
    const guidanceCurrent = await joiningGuidanceIsCurrent(this.db, tx,
      message.intent, this.now());
    return {grant, guest, thread, message, source, guidanceCurrent};
  }

  private project(resolved: ResolvedGuestView, now: number): GuestView {
    const {grant, guest, message, source} = resolved;
    const closed = (reason: Extract<GuestView, {status: "unavailable"}>[
      "reason"]): GuestView => ({
      status: "unavailable", serverTime: now, reason,
    });
    if (grant.expiresAt <= now) return closed("expired");
    const intent = message.intent;
    if (!guestCanReceiveMessage(guest, source, intent)) {
      return closed("guestUnavailable");
    }
    if (!messageWindowOpen(intent, source, now)) return closed("eventClosed");
    if (intent.kind === "joiningUpdate" &&
        source.attendeeStatus === "checkedIn") return closed("alreadyJoined");
    if (intent.expiresAt <= now) return closed("expired");
    if (!resolved.guidanceCurrent) return closed("noInstructions");
    if (message.lifecycle === "cancelled" ||
        message.lifecycle === "superseded") return closed("noInstructions");
    const response = message.response ? {
      label: intent.choices.find((c) =>
        c.choiceId === message.response!.choiceId)!.label,
      receivedAt: message.response.receivedAt,
    } : null;
    return {status: "ready", serverTime: now, eventTitle: source.eventTitle,
      guestRevision: guest.revision, intentId: intent.intentId,
      intentRevision: intent.revision,
      instructionRevision: intent.kind === "joiningUpdate" ?
        intent.guidance.revision : intent.instructionRevision,
      title: intent.kind === "joiningUpdate" ? "Where to join" : intent.title,
      text: intent.kind === "joiningUpdate" ?
        intent.guidance.text : intent.body,
      expiresAt: Math.min(intent.expiresAt, grant.expiresAt), response,
      choices: response ? [] : intent.choices.map(({choiceId, label}) =>
        ({choiceId, label}))};
  }

  private now(): number {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw unavailable();
    return now;
  }
}

function assertLinkId(linkId: string): void {
  if (!/^[a-f0-9]{32}$/.test(linkId)) throw unavailable();
}

function conflict(): HttpsError {
  return new HttpsError("aborted",
    "Event assistance changed. Refresh and retry.");
}
