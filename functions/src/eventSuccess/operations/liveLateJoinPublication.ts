import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {guestCollections, parseThread, requireDocumentId,
  threadIdentity} from "./guestRecords";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {prepareGuestMessagePublication} from "./guestMessagePublication";
import {LateJoinSourceScope} from "./lateJoinSourceReader";
import {LateJoinEvaluationOptions, readLiveLateJoinEvaluation} from
  "./liveLateJoinEvaluation";
import {assistanceMessageId, parseMessageRecord} from "./messageOutbox";
import {buildLateJoinInstructionIntent, LateJoinMessageOptions} from
  "./messageProtocol";
import {ASSISTANCE_POLICY_VERSION} from "./policySettings";
import {destinationAllowed} from "./lateJoin";

export type LateJoinPublicationScope = LateJoinSourceScope &
  {episodeId: string};
export type LateJoinPublicationOptions = LateJoinEvaluationOptions &
  Pick<LateJoinMessageOptions, "deliveryPolicy" | "laterChoices">;

/**
 * Trusted worker preparation, designed to join an Operations checkpoint in the
 * same transaction. No caller-supplied message, policy decision or source hash
 * is accepted. No episode, lease, provider attempt or signing grant is created.
 */
export async function prepareLiveLateJoinPublication(db: Firestore,
  tx: Transaction, scope: LateJoinPublicationScope,
  options: LateJoinPublicationOptions, clock: () => number = Date.now) {
  requireDocumentId(scope.episodeId);
  const now = clock();
  const evaluation = await readLiveLateJoinEvaluation(db, tx,
    {context: scope.context, attendeeId: scope.attendeeId}, options, now);
  if (evaluation.kind !== "evaluated") {
    return {kind: "held" as const, evaluation};
  }
  if (evaluation.input.guest.episodeId !== scope.episodeId) {
    return {kind: "episodeChanged" as const};
  }
  // The full event configuration was verified above. Its optional choices can
  // span different groups; each guest only sees their current approved plan.
  const laterChoices = evaluation.runtimeConfiguration ?
    options.laterChoices?.filter((choice) => destinationAllowed(
      evaluation.input.policy.destination, choice.target)) :
    options.laterChoices;
  const candidate = buildLateJoinInstructionIntent(evaluation.input, {
    occurrenceId: "lateJoin", deliveryPolicy: options.deliveryPolicy,
    permittedRoutes: options.routes.map((r) => r.routeId),
    ...(laterChoices ? {laterChoices} : {}),
  }, {...evaluation.binding, kind: "lateJoin",
    policyVersion: ASSISTANCE_POLICY_VERSION,
    routes: [...options.routes], responseDeadline: options.responseDeadline,
    ...(options.runtimeBinding ?
      {runtimeBinding: options.runtimeBinding} : {})});
  if (!candidate) return {kind: "evaluated" as const, evaluation};
  const messageId = assistanceMessageId(candidate);
  const threadId = threadIdentity(candidate);
  const [messageSnap, threadSnap] = await tx.getAll(
    db.collection(EVENT_ASSISTANCE_MESSAGES).doc(messageId),
    db.collection(guestCollections.threads).doc(threadId));
  const existing = messageSnap.exists ?
    parseMessageRecord(messageSnap.data()) : null;
  if (existing && (existing.messageId !== messageId ||
      operationContentHash({...existing.intent, createdAt: 0}) !==
        operationContentHash({...candidate, createdAt: 0}))) {
    throw new Error("Automatic message identity already has other content");
  }
  const currentThread = threadSnap.exists ?
    parseThread(threadSnap.data()) : null;
  if (currentThread && currentThread.threadId !== threadId) {
    throw new Error("Automatic message thread identity mismatch");
  }
  const intent = existing?.intent ?? candidate;
  const publication = await prepareGuestMessagePublication(db, tx, intent,
    currentThread?.revision ?? null, clock);
  const validUntil = Math.min(now + 30_000, intent.expiresAt,
    evaluation.runtimeConfiguration?.expiresAt ?? intent.expiresAt,
    evaluation.input.policy.unanswered === "hostReviewAtDeadline" &&
      evaluation.input.guest.intention.kind === "unknown" ?
      options.responseDeadline ?? now : intent.expiresAt);
  return {kind: "prepared" as const, messageId, intent,
    thread: publication.thread, replayed: publication.replayed, evaluation,
    validUntil, commit: () => {
      const committedAt = clock();
      if (!Number.isSafeInteger(committedAt) || committedAt < now ||
          committedAt >= validUntil) {
        throw new Error("Automatic publication snapshot expired");
      }
      publication.commit();
    }};
}

/** Atomic source/policy evaluation plus the existing private message/thread. */
export class LiveLateJoinPublisher {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async publish(scope: LateJoinPublicationScope,
    options: LateJoinPublicationOptions) {
    return transact(this.db, async (tx) => {
      const result = await prepareLiveLateJoinPublication(this.db, tx,
        scope, options, this.clock);
      if (result.kind !== "prepared") return result;
      result.commit();
      const {commit, ...published} = result;
      void commit;
      return {...published, kind: "published" as const};
    });
  }
}
