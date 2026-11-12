import {DELIVERY_MESSAGES} from "../delivery/deliveryMessages";
import {FieldPath, type Firestore, type Transaction} from
  "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import type {ProgramDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/programDeliveryMessageIntent";
import type {AnchorFacts, MomentDefinition, RunRecord} from
  "../moments/momentModel";
import {MOMENT_SENDS_COLLECTION, runFromDocument,
  type ResolvedRecipient} from "../moments/momentDocuments";
import type {SuppressionReason} from "../moments/momentPolicy";
import {isTravelOccurrence} from "../moments/momentConditions";
import {programDeliveryAdapter, programDeliveryMessageId,
  parseProgramDeliveryRecord, type MessageRecord} from "./programDelivery";
import {ProgramDeliveryWorker} from "./programDeliveryWorker";
import {programActivityDescriptor, type ProgramFcmSender} from
  "./programActivityChannel";

export interface ProgramActivityRequest {
  moment: MomentDefinition;
  run: RunRecord;
  facts: AnchorFacts;
  recipient: ResolvedRecipient;
  copy: {title: string; body: string};
}

export type ProgramActivityOutcome =
  | {kind: "sent"; deliveryMessageId: string;
    deliveryState: "accepted" | "unknown" | "delivered" | "read"}
  | {kind: "suppressed"; reason: SuppressionReason;
    deliveryMessageId?: string; activityRecorded?: true}
  | {kind: "retry"; reason: string; notBefore?: number};

export function programActivityIntent(params: ProgramActivityRequest):
  MessageIntent {
  const {moment, run, facts, recipient, copy} = params;
  if (moment.scope.kind !== "program" || !facts.scope.organizerId ||
      recipient.endpoint.kind !== "uid" ||
      recipient.recipientKey !== `uid:${recipient.endpoint.uid}` ||
      !isTravelOccurrence(run.runId) || !run.travelOccurrence ||
      run.travelOccurrence.momentRevision !== moment.revision ||
      run.expiresAtMillis !==
        run.travelOccurrence.createdAtMillis + 6 * 60 * 60_000) {
    throw new Error("Program activity requires a current durable occurrence");
  }
  const programId = moment.scope.programId;
  return {schemaVersion: 1,
    intentId: "travel-activity:" + operationContentHash([
      run.runId, recipient.recipientKey]), revision: 1,
    context: {mode: "live", programId, organizerId: facts.scope.organizerId},
    programId, recipient: {kind: "staff",
      recipientKey: recipient.endpoint.uid},
    workflow: {kind: "programMoment", momentId: moment.momentId,
      runId: run.runId},
    createdAt: run.travelOccurrence.createdAtMillis,
    expiresAt: run.expiresAtMillis,
    permittedRoutes: ["catchProgramActivity"],
    deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 2,
      minimumRetrySeconds: 60},
    kind: "programReminder", title: copy.title, body: copy.body,
    instructionRevision: moment.revision,
    activity: programActivityDescriptor(moment)};
}

/** Committed evidence wins over mutable token/preference state on replay. */
function committedOutcome(record: MessageRecord):
  ProgramActivityOutcome | null {
  for (const attempt of record.attempts) {
    const state = attempt.state;
    if (attempt.binding.routeId !== "catchProgramActivity") continue;
    if (state.kind === "reserved" || state.kind === "notDispatched") continue;
    if (attempt.binding.provider === "catchActivity" &&
        (state.kind === "unknown" || state.kind === "delivered" ||
          state.kind === "read")) {
      const reason = attempt.binding.pushSuppressionReason;
      if (!reason) return {kind: "suppressed", reason: "hostReview"};
      // The local Activity write committed atomically with this claim. Its
      // receipt can fail without permitting a later token to create a push.
      return {kind: "suppressed", reason, activityRecorded: true,
        deliveryMessageId: record.messageId};
    }
    if (state.kind === "accepted" || state.kind === "unknown" ||
        state.kind === "delivered" || state.kind === "read") {
      return {kind: "sent", deliveryMessageId: record.messageId,
        deliveryState: state.kind};
    }
    return {kind: "suppressed", reason: "hostReview",
      deliveryMessageId: record.messageId};
  }
  return null;
}

export async function deliverProgramActivity(params: ProgramActivityRequest & {
  db: Firestore; now: () => number; send: ProgramFcmSender;
}): Promise<ProgramActivityOutcome> {
  const {db, now, send} = params;
  const intent = programActivityIntent(params);
  const outbox = new FirestoreDeliveryOutbox(db, programDeliveryAdapter,
    async () => {
      throw new Error("Producer cannot reserve delivery");
    }, now);
  const messageId = programDeliveryMessageId(intent);
  const existing = await outbox.get(messageId);
  if (!existing && now() >= intent.expiresAt) {
    return {kind: "suppressed", reason: "expired"};
  }
  // The first committed copy/descriptor is authoritative on recovery. A
  // concurrent producer may have won while this worker was composing copy.
  const sameSource = (record: MessageRecord): MessageRecord => {
    const source = (value: MessageIntent) => [value.context, value.intentId,
      value.revision, value.workflow, value.recipient, value.createdAt,
      value.expiresAt, value.instructionRevision, value.activity];
    if (operationContentHash(source(record.intent)) !==
        operationContentHash(source(intent))) {
      throw new Error("Program activity source binding changed");
    }
    return record;
  };
  let record = existing ? sameSource(existing) : null;
  if (!record) {
    try {
      record = await outbox.enqueue(intent);
    } catch (error) {
      const winner = await outbox.get(messageId);
      if (!winner) throw error;
      record = sameSource(winner);
    }
  }
  const replay = committedOutcome(record);
  if (replay) return replay;
  const worker = new ProgramDeliveryWorker(db, null, null, now, send);
  const result = await worker.dispatch(messageId);
  const committed = await outbox.get(messageId);
  if (!committed) throw new Error("Program activity record disappeared");
  const completed = committedOutcome(committed);
  if (completed) return completed;
  if (result.kind === "waiting") {
    const decision = result.decision;
    if (decision.kind === "stop" || decision.kind === "hostDecision") {
      const reason: SuppressionReason = decision.reason === "expired" ?
        "expired" : decision.reason === "programEnded" ? "programEnded" :
          decision.reason === "permissionRevoked" ? "permissionRevoked" :
            decision.reason === "superseded" ? "superseded" : "hostReview";
      return {kind: "suppressed", reason, deliveryMessageId: messageId};
    }
    return {kind: "retry", reason: decision.kind,
      ...("notBefore" in decision ? {notBefore: decision.notBefore} : {})};
  }
  return {kind: "retry", reason: result.kind};
}

function assertActivityRun(record: MessageRecord, run: RunRecord,
  documentId: string): void {
  const intent = record.intent;
  const original = run.travelOccurrence;
  if (record.messageId !== documentId || !intent.activity ||
      intent.recipient.kind !== "staff" ||
      intent.workflow.runId !== run.runId ||
      intent.workflow.momentId !== run.momentId || !original ||
      intent.instructionRevision !== original.momentRevision ||
      intent.createdAt !== original.createdAtMillis ||
      intent.expiresAt !== run.expiresAtMillis ||
      intent.context.programId !== intent.programId ||
      intent.intentId !== "travel-activity:" + operationContentHash([
        run.runId, `uid:${intent.recipient.recipientKey}`])) {
    throw new Error("Program activity receipt has a different source");
  }
}

/** Repair only committed receipt truth, even if current send authority is gone.
 * Pages the run's private outbox rows; never reserves or calls a provider.
 */
export async function recoverProgramActivityJournals(db: Firestore,
  run: RunRecord,
  dayKey: (programId: string, at: number) => string | Promise<string>):
  Promise<number> {
  if (!isTravelOccurrence(run.runId) || !run.travelOccurrence) return 0;
  const base = db.collection(DELIVERY_MESSAGES)
    .where("intent.workflow.runId", "==", run.runId)
    .orderBy(FieldPath.documentId()).limit(100);
  let query = base;
  let repaired = 0;
  for (;;) {
    const page = await query.get();
    for (const doc of page.docs) {
      const discovered = parseProgramDeliveryRecord(doc.data());
      const localDay = await dayKey(discovered.intent.programId,
        discovered.intent.createdAt);
      const created = await db.runTransaction(async (tx) => {
        const [receipt, runSnap] = await Promise.all([
          tx.get(doc.ref),
          tx.get(db.collection("organizerMomentRuns").doc(run.runId)),
        ]);
        if (!receipt.exists || !runSnap.exists) return false;
        const record = parseProgramDeliveryRecord(receipt.data());
        const intent = record.intent;
        const current = runFromDocument(runSnap.data()!);
        if (!intent.activity) return false;
        assertActivityRun(record, current, doc.id);
        const recipientKey = `uid:${intent.recipient.recipientKey}`;
        const ref = db.collection(MOMENT_SENDS_COLLECTION)
          .doc(`${run.runId}_${recipientKey}`);
        const prior = await tx.get(ref);
        const journal = prior.data();
        const same = journal?.deliveryMessageId === record.messageId &&
          journal.momentId === current.momentId &&
          journal.recipientKey === recipientKey;
        const definitelyUnsent = record.attempts.length > 0 &&
          record.attempts.every((attempt) =>
            attempt.state.kind === "notDispatched");
        if (definitelyUnsent && same && journal?.deliveryState === "unknown") {
          // The outbox keeps complete attempt history. Correct only this
          // provisional projection when stronger proof excludes every send.
          tx.update(ref, {decision: "suppressed", reason: "hostReview",
            deliveryState: "notDispatched"});
          return true;
        }
        const outcome = committedOutcome(record);
        if (!outcome || outcome.kind === "retry" ||
            (outcome.kind === "suppressed" && !outcome.activityRecorded)) {
          return false;
        }
        if (prior.exists) {
          if (!same || !["unknown", "notDispatched"]
            .includes(journal?.deliveryState)) return false;
          const deliveryState = outcome.kind === "sent" ?
            outcome.deliveryState : null;
          if (journal?.deliveryState === deliveryState) return false;
          tx.update(ref, {decision: outcome.kind === "sent" ?
            "sent" : "suppressed", deliveryState,
          reason: outcome.kind === "suppressed" ? outcome.reason : null});
          return true;
        }
        tx.create(ref, {momentId: current.momentId, recipientKey,
          dayKey: localDay, createdAtMillis: intent.createdAt,
          decision: outcome.kind === "sent" ? "sent" : "suppressed",
          ...(outcome.kind === "suppressed" ? {reason: outcome.reason} : {}),
          deliveryMessageId: record.messageId,
          deliveryState: outcome.kind === "sent" ? outcome.deliveryState : null,
          ...(intent.activity.actionKind === "staffAttention" ? {
            runId: current.runId, actionKind: "staffAttention",
            organizerId: intent.context.organizerId, scopeKind: "program",
            scopeId: intent.programId, duty: intent.activity.actionDuty,
            severity: intent.activity.severity, title: intent.title,
          } : {}),
        });
        return true;
      });
      if (created) repaired++;
    }
    if (page.size < 100) return repaired;
    query = base.startAfter(page.docs[page.docs.length - 1]);
  }
}

/** A terminal run must not strand an in-flight attempt or missing projection.
 * The query and run update share a transaction with concurrent claim writes.
 */
export async function canCloseProgramActivityRun(tx: Transaction, db: Firestore,
  run: RunRecord, now: number): Promise<boolean> {
  if (!isTravelOccurrence(run.runId) || !run.travelOccurrence) return true;
  const base = db.collection(DELIVERY_MESSAGES)
    .where("intent.workflow.runId", "==", run.runId)
    .orderBy(FieldPath.documentId()).limit(100);
  let query = base;
  for (;;) {
    const page = await tx.get(query);
    for (const doc of page.docs) {
      const record = parseProgramDeliveryRecord(doc.data());
      if (!record.intent.activity) continue;
      assertActivityRun(record, run, doc.id);
      // A matching unknown projection is provisional until this worker has
      // observed the SDK return. A slow call can accept even after expiry.
      if (record.attempts.some((attempt) =>
        attempt.binding.provider === "fcm" &&
        attempt.state.kind === "unknown" &&
        attempt.state.reason === "workerInterrupted")) return false;
      if (now < record.intent.expiresAt && record.attempts.some((attempt) =>
        attempt.state.kind === "reserved" ||
        attempt.state.kind === "unknown")) {
        return false;
      }
      const outcome = committedOutcome(record);
      if (!outcome || outcome.kind === "retry" ||
          (outcome.kind === "suppressed" && !outcome.activityRecorded)) {
        continue;
      }
      const journal = await tx.get(db.collection(MOMENT_SENDS_COLLECTION)
        .doc(`${run.runId}_uid:${record.intent.recipient.recipientKey}`));
      const projected = journal.data();
      if (projected?.deliveryMessageId !== record.messageId ||
          projected.momentId !== run.momentId ||
          projected.recipientKey !==
            `uid:${record.intent.recipient.recipientKey}` ||
          projected.deliveryState !== (outcome.kind === "sent" ?
            outcome.deliveryState : null)) return false;
    }
    if (page.size < 100) return true;
    query = base.startAfter(page.docs[page.docs.length - 1]);
  }
}

/** A retry projection never grants authority; recheck the full unsent proof. */
export async function canRetryProgramActivityJournal(db: Firestore,
  run: RunRecord, recipientKey: string, messageId: unknown,
  programId: string, organizerId: string | null, now: number):
  Promise<boolean> {
  if (typeof messageId !== "string" ||
      !/^outbox:[a-f0-9]{64}$/.test(messageId) ||
      !run.expiresAtMillis || now >= run.expiresAtMillis) return false;
  const snapshot = await db.collection(DELIVERY_MESSAGES)
    .doc(messageId).get();
  if (!snapshot.exists) return false;
  const record = parseProgramDeliveryRecord(snapshot.data());
  assertActivityRun(record, run, messageId);
  return record.lifecycle === "active" && !record.deliveryConflict &&
    record.intent.programId === programId &&
    record.intent.context.organizerId === organizerId &&
    `uid:${record.intent.recipient.recipientKey}` === recipientKey &&
    record.attempts.length > 0 && record.attempts.every((attempt) =>
    attempt.state.kind === "notDispatched");
}
