import {runAssistanceTransaction as transact} from "./transactionCallback";
import {FieldPath, Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {stageRunAndWorkItemCreate, stageRunSet} from
  "../../operations/transactionalWrites";
import {OperationLeaseProof, operationActionId, operationContentHash} from
  "../../operations/durableActions";
import {OperationConflictError} from "../../operations/errors";
import {FirestoreOperationsRepository} from
  "../../operations/firestoreRepository";
import type {OperationActionReceipt} from "../../operations/models";
import {validateOperationActionReceipt} from "../../operations/validation";
import {currentGuest, guestCollections, guestIdentity, parseGuest,
  readGuestSourceFacts, requireDocumentId} from "./guestRecords";
import {prepareLiveLateJoinPublication} from "./liveLateJoinPublication";
import {readRuntimeConfigAuthority, RuntimeBinding} from
  "./runtimeConfigRecords";
import {prepareLiveWorkRebind} from "./liveWorkRebinding";
import {ASSISTANCE_WORKFLOW, LIVE_WORK_RUNTIME, LiveWork, Observation,
  invalidWork, liveWorkBasis, liveWorkIds, liveWorkProjection,
  newLiveWorkRecords, parseLiveWork, readLiveWorkRecords} from
  "./liveWorkRecords";

type Records = ReturnType<typeof readLiveWorkRecords>;
type Prepared = Awaited<ReturnType<typeof prepareLiveLateJoinPublication>>;
export type LiveWorkAction = {kind: "evaluate"} |
  {kind: "wake"; signalId: string} |
  {kind: "rebind"; binding: RuntimeBinding};
type Action = LiveWorkAction;
type Result = Records & ({kind: "idle"} | {kind: "committed" | "replayed";
  receipt: OperationActionReceipt});

/**
 * Trusted backend adapter, not a public command or an activated scheduler.
 * Reuses Operations leases/checkpoints; message publication is an atomic local
 * effect and provider delivery remains owned by the separate message outbox.
 */
export class LiveAssistanceWorkStore {
  readonly operations: FirestoreOperationsRepository;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.operations = new FirestoreOperationsRepository(db, clock);
  }

  /** Never creates guest participation or silently replaces frozen options. */
  async start(input: Pick<LiveWork,
    "scope" | "options" | "expiresAt" | "maxEvaluations" | "runtimeBinding">) {
    const frozen = structuredClone(input);
    return transact(this.db, async (tx) => {
      const now = this.clock();
      const payload = parseLiveWork({schemaVersion: 1, kind: "liveLateJoin",
        ...frozen, checkpoint: {dueAt: Math.min(now, frozen.expiresAt),
          evaluatedAt: null, evaluations: 0,
          sourceHash: null, observation: null, publication: null}}, now);
      const ids = liveWorkIds(payload.scope);
      const [runSnap, itemSnap] = await tx.getAll(
        this.db.collection(operationCollections.runs).doc(ids.runId),
        this.db.collection(operationCollections.workItems).doc(ids.workItemId));
      if (runSnap.exists || itemSnap.exists) {
        const existing = readLiveWorkRecords(runSnap.data(), itemSnap.data(),
          ids.workItemId, now);
        if (operationContentHash(liveWorkBasis(existing.payload)) !==
            operationContentHash(liveWorkBasis(payload))) {
          throw conflict("work_configuration_conflict");
        }
        return {...existing, replayed: true};
      }
      const source = await readGuestSourceFacts(this.db, tx,
        payload.scope.context, payload.scope.attendeeId);
      const guest = parseGuest((await tx.get(this.db.collection(
        guestCollections.guests).doc(guestIdentity(payload.scope.context,
        payload.scope.attendeeId)))).data());
      if (!currentGuest(guest, source) || guest.updatedAt > now ||
          guest.episodeId !== payload.scope.episodeId ||
          source.eventStatus !== "active" || payload.expiresAt <= now ||
          payload.expiresAt > source.eventEnd) throw invalidWork();
      if (payload.runtimeBinding) {
        const authority = await readRuntimeConfigAuthority(this.db, tx,
          payload.scope.context, payload.runtimeBinding, now);
        if (authority.kind !== "ready" || operationContentHash(
          authority.configuration) !== operationContentHash({
          options: payload.options, expiresAt: payload.expiresAt,
          maxEvaluations: payload.maxEvaluations,
        })) throw conflict("work_configuration_conflict");
      }
      const records = newLiveWorkRecords(payload, now);
      const committedAt = this.clock();
      if (committedAt < now || committedAt >= payload.expiresAt) {
        throw conflict("work_snapshot_expired");
      }
      stageRunAndWorkItemCreate(this.db, tx, records);
      return {...records, payload, replayed: false};
    });
  }

  async get(workItemId: string) {
    return transact(this.db, (tx) => this.read(tx, workItemId));
  }

  /** Bounded discovery. Execution re-reads and fences every returned id. */
  async listDue(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw invalidWork();
    }
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidWork();
    const result = await this.db.collection(operationCollections.workItems)
      .where("workflowId", "==", ASSISTANCE_WORKFLOW)
      .where("normalizedPayload.kind", "==", "liveLateJoin")
      .where("normalizedPayload.checkpoint.dueAt", ">=", 0)
      .where("normalizedPayload.checkpoint.dueAt", "<=", now)
      .orderBy("normalizedPayload.checkpoint.dueAt")
      .orderBy(FieldPath.documentId()).limit(limit).get();
    return result.docs.map((doc) => ({workItemId: doc.id,
      revision: doc.data().revision as number}));
  }

  evaluate(workItemId: string, expectedRevision: number,
    lease: OperationLeaseProof): Promise<Result> {
    return this.advance(workItemId, expectedRevision, lease,
      {kind: "evaluate"});
  }

  /** A repeated source signal cannot re-wake a handled checkpoint. */
  wake(workItemId: string, expectedRevision: number, signalId: string,
    lease: OperationLeaseProof): Promise<Result> {
    requireDocumentId(signalId);
    return this.advance(workItemId, expectedRevision, lease,
      {kind: "wake", signalId});
  }

  /** Adopts current manager configuration without restarting the episode. */
  rebind(workItemId: string, expectedRevision: number, binding: RuntimeBinding,
    lease: OperationLeaseProof): Promise<Result> {
    requireDocumentId(binding.runtimeId);
    if (!Number.isSafeInteger(binding.revision) || binding.revision < 1) {
      throw invalidWork();
    }
    return this.advance(workItemId, expectedRevision, lease,
      {kind: "rebind", binding: structuredClone(binding)});
  }

  private async read(tx: Transaction, workItemId: string): Promise<Records> {
    requireDocumentId(workItemId);
    const item = (await tx.get(this.db.collection(
      operationCollections.workItems).doc(workItemId))).data();
    if (!item || typeof item.runId !== "string") throw invalidWork();
    requireDocumentId(item.runId);
    const run = (await tx.get(this.db.collection(operationCollections.runs)
      .doc(item.runId))).data();
    return readLiveWorkRecords(run, item, workItemId, this.clock());
  }

  private async advance(workItemId: string, expectedRevision: number,
    lease: OperationLeaseProof, action: Action): Promise<Result> {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw invalidWork();
    }
    const proof = structuredClone(lease);
    const key = action.kind === "evaluate" ? "evaluate:" + expectedRevision :
      action.kind === "wake" ? "wake:" + operationContentHash(action.signalId) :
        "rebind:" + operationContentHash(action.binding);
    const inputHash = operationContentHash([workItemId, key]);
    return transact(this.db, async (tx) => {
      const records = await this.read(tx, workItemId);
      const {run, item, payload} = records;
      const actionId = operationActionId(run.runId, workItemId, key);
      const receiptSnap = await tx.get(this.db.collection(
        operationCollections.actionReceipts).doc(actionId));
      if (receiptSnap.exists) {
        const receipt = readReplay(receiptSnap.data(), records,
          {actionId, key, inputHash, action, expectedRevision});
        return {...records, kind: "replayed", receipt};
      }
      if (item.revision !== expectedRevision) {
        throw conflict("revision_conflict");
      }
      if (run.status === "completed") return {...records, kind: "idle"};
      if (run.status !== "running") throw conflict("run_not_executable");
      const now = this.clock();
      let next = structuredClone(payload);
      let publication: Extract<Prepared, {kind: "prepared"}> | null = null;
      if (action.kind === "rebind") {
        const rebound = await prepareLiveWorkRebind(this.db, tx, payload,
          action.binding, now);
        if (!rebound) return {...records, kind: "idle"};
        next = rebound;
      } else if (action.kind === "wake") {
        // A budget hold stays held until expiry; signals cannot reset the cap.
        next.checkpoint.dueAt = next.checkpoint.observation?.kind ===
          "evaluationLimit" && next.checkpoint.evaluations >=
            next.maxEvaluations ? payload.expiresAt :
          Math.min(now, next.checkpoint.dueAt ?? payload.expiresAt);
      } else {
        if (payload.checkpoint.dueAt === null ||
            payload.checkpoint.dueAt > now) return {...records, kind: "idle"};
        let observation: Observation;
        let sourceHash: string | null = null;
        let dueAt: number | null = payload.expiresAt;
        if (now >= payload.expiresAt) {
          observation = {kind: "workExpired"};
        } else if (payload.checkpoint.evaluations >= payload.maxEvaluations) {
          observation = {kind: "evaluationLimit"};
        } else {
          const prepared = await prepareLiveLateJoinPublication(this.db, tx,
            payload.scope, {...payload.options,
              ...(payload.runtimeBinding ?
                {runtimeBinding: payload.runtimeBinding} : {})}, this.clock);
          observation = observationFor(prepared);
          next.checkpoint.evaluations += 1;
          if (prepared.kind === "prepared" || prepared.kind === "evaluated") {
            sourceHash = prepared.evaluation.sourceHash;
            dueAt = nextEvaluationAt(payload, prepared.evaluation, now);
          }
          if (prepared.kind === "prepared") publication = prepared;
        }
        if (liveWorkProjection(observation).lifecycleStatus === "terminal") {
          dueAt = null;
        }
        next = {...next, checkpoint: {...next.checkpoint, dueAt,
          evaluatedAt: now, sourceHash, observation,
          publication: publication ? {messageId: publication.messageId,
            threadId: publication.thread.threadId} :
            next.checkpoint.publication}};
      }
      const projection = liveWorkProjection(next.checkpoint.observation);
      const at = new Date(now).toISOString();
      const terminal = projection.lifecycleStatus === "terminal";
      const nextItem = {...item, revision: item.revision + 1,
        candidateHash: operationContentHash(liveWorkBasis(next)),
        primaryStage: projection.primaryStage,
        lifecycleStatus: projection.lifecycleStatus,
        outcome: projection.outcome,
        taskFlags: projection.taskFlags, blockerCodes: projection.blockerCodes,
        attemptCount: next.checkpoint.evaluations,
        normalizedPayload: {...next}, updatedAt: at,
        expiresAt: new Date(next.expiresAt).toISOString()};
      const nextRun = {...run, revision: nextItem.revision,
        inputHash: nextItem.candidateHash,
        status: terminal ? "completed" as const : "running" as const,
        updatedAt: at, finishedAt: terminal ? at : null,
        checkpoint: {lastSequence: nextItem.revision, cursor: workItemId},
        counters: {...run.counters,
          processed: next.checkpoint.evaluatedAt === null ? 0 : 1,
          published: run.counters.published +
            Number(publication !== null && !publication.replayed),
          escalated: run.counters.escalated + Number(
            projection.primaryStage === "host_review" &&
            item.primaryStage !== "host_review")}};
      const receipt: OperationActionReceipt = {schemaVersion: 1, actionId,
        runId: run.runId, workItemId, sequence: nextItem.revision,
        operation: "late_join_" + action.kind, status: "succeeded",
        fromRevision: item.revision, toRevision: nextItem.revision,
        actor: {actorType: "system", actorId: "event-assistance-worker"},
        idempotencyKey: key, inputHash,
        outputHash: operationContentHash(nextItem),
        rulesetVersion: LIVE_WORK_RUNTIME, modelVersion: null,
        reasonCodes: action.kind === "wake" ? ["source_signal"] :
          action.kind === "rebind" ? ["runtime_configuration_changed"] :
            projection.reasonCodes,
        occurredAt: at, completedAt: at, failure: null};
      const updated = readLiveWorkRecords(nextRun, nextItem, workItemId, now);
      const checkpoint = await this.operations.prepareWorkItemAction(tx,
        {workItem: nextItem, receipt, lease: proof});
      const committedAt = this.clock();
      if (committedAt < now || ((publication || action.kind === "rebind") &&
          committedAt >= Math.min(payload.expiresAt, next.expiresAt))) {
        throw conflict("work_snapshot_expired");
      }
      // All reads above; these writes either commit together or do not exist.
      publication?.commit();
      checkpoint.commit();
      stageRunSet(this.db, tx, nextRun);
      return {...updated, kind: "committed", receipt};
    });
  }
}

function observationFor(prepared: Prepared): Observation {
  switch (prepared.kind) {
  case "episodeChanged": return {kind: "episodeChanged"};
  case "prepared":
  case "evaluated": return {kind: "decision",
    decision: prepared.evaluation.decision};
  case "held": {
    const e = prepared.evaluation;
    switch (e.kind) {
    case "sourceNotReady": return {kind: e.kind, reason: e.source.reason};
    case "runtimeUnavailable": return {kind: e.kind, reason: e.reason};
    case "historyUnavailable": return {kind: e.kind, reason: e.reason};
    case "responseDeadlineMissing": return {kind: e.kind};
    default: return unhandled(e);
    }
  }
  default: return unhandled(prepared);
  }
}

function nextEvaluationAt(payload: LiveWork,
  evaluation: Extract<Prepared, {kind: "evaluated"}>["evaluation"],
  now: number) {
  const {input, decision} = evaluation;
  const times = [payload.expiresAt];
  if (input.policy.cutoff.kind === "time") times.push(input.policy.cutoff.at);
  if (input.guidance.kind === "known") {
    times.push(input.guidance.value.validUntil);
  }
  if (decision.kind === "update" && decision.nextEvaluationAt !== null) {
    times.push(decision.nextEvaluationAt);
  }
  if (input.policy.unanswered === "hostReviewAtDeadline" &&
      input.guest.intention.kind === "unknown" &&
      payload.options.responseDeadline !== null) {
    times.push(payload.options.responseDeadline);
  }
  return Math.min(...times.filter((time) => time > now));
}

function readReplay(value: unknown, {run, item}: Records, expected: {
  actionId: string; key: string; inputHash: string; action: Action;
  expectedRevision: number;
}) {
  const parsed = validateOperationActionReceipt(value);
  if (!parsed.ok) throw invalidWork();
  const r = parsed.value;
  if (r.actionId !== expected.actionId || r.runId !== run.runId ||
      r.workItemId !== item.workItemId || r.idempotencyKey !== expected.key ||
      r.inputHash !== expected.inputHash || r.status !== "succeeded" ||
      r.operation !== "late_join_" + expected.action.kind ||
      r.rulesetVersion !== LIVE_WORK_RUNTIME ||
      r.toRevision !== r.fromRevision + 1 || r.sequence !== r.toRevision ||
      (expected.action.kind === "evaluate" &&
        r.fromRevision !== expected.expectedRevision) ||
      item.revision < r.toRevision || r.outputHash === null ||
      (item.revision === r.toRevision &&
        operationContentHash(item) !== r.outputHash)) {
    throw conflict("action_checkpoint_drift");
  }
  return r;
}

function conflict(code: string) {
  return new OperationConflictError(code,
    "Live assistance work cannot advance");
}
function unhandled(value: never): never {
  void value;
  throw invalidWork();
}
