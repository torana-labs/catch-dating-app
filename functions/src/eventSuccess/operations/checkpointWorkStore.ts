import {FieldPath, Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {stageRunSet} from
  "../../operations/transactionalWrites";
import {operationActionId, operationContentHash} from
  "../../operations/durableActions";
import {FirestoreOperationsRepository} from
  "../../operations/firestoreRepository";
import type {OperationActionReceipt} from
  "../../operations/models";
import {validateOperationActionReceipt} from "../../operations/validation";
import {requireDocumentId} from "./guestRecords";
import {readCheckpoint} from "./checkpointReader";
import {checkpointResponse, parseDepartureRoster} from "./checkpointRecords";
import {DEPARTURE_ROSTERS} from "./departureRosterSource";
import {runAssistanceTransaction} from "../../platform/transactionCallback";
import {ASSISTANCE_WORKFLOW, invalidWork} from "./liveWorkRecords";
import {releaseAssistanceWorkLease} from "./liveWorkRunner";
import {advanceCheckpointWorkRecords, CHECKPOINT_WORK_RUNTIME,
  checkpointWorkIds, effectiveCheckpointRequest, readCheckpointWorkRecords,
  WorkCheckpoint} from
  "./checkpointWorkRecords";

import {acquireCheckpointWorkLease} from "./checkpointWorkAccess";

type Records = ReturnType<typeof readCheckpointWorkRecords>;
type Wake = {kind: "wake"; signalId: string};

/** Reconciles a named report request; no attendance or messaging executor. */
export class AssistanceCheckpointWorkStore {
  readonly operations: FirestoreOperationsRepository;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.operations = new FirestoreOperationsRepository(db, clock);
  }

  get(workItemId: string) {
    return runAssistanceTransaction(this.db, (tx) => this.read(tx, workItemId));
  }

  /** Uses the original roster, including after transfer or deletion. */
  includesDepartureMember(workItemId: string, attendeeId: string) {
    requireDocumentId(attendeeId);
    return runAssistanceTransaction(this.db, async (tx) => {
      const {payload} = await this.read(tx, workItemId);
      const snapshot = await tx.get(this.db.collection(DEPARTURE_ROSTERS)
        .doc(payload.rosterId));
      const roster = parseDepartureRoster(snapshot.data(), payload.scope,
        this.clock());
      if (!roster || operationContentHash(roster) !== payload.rosterHash) {
        throw invalidWork();
      }
      return roster.members.some((m) => m.attendeeId === attendeeId);
    });
  }

  async processReport(reportId: string, signalId: string) {
    const {workItemId} = checkpointWorkIds(reportId);
    if (!(await this.db.collection(operationCollections.workItems)
      .doc(workItemId).get()).exists) return {kind: "idle" as const};
    return this.process(workItemId, {kind: "wake", signalId});
  }

  async listDue(limit: number) {
    const now = this.clock();
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(now) || now < 0) throw invalidWork();
    const result = await this.db.collection(operationCollections.workItems)
      .where("workflowId", "==", ASSISTANCE_WORKFLOW)
      .where("normalizedPayload.kind", "==", "liveCheckpointReport")
      .where("normalizedPayload.checkpoint.dueAt", ">=", 0)
      .where("normalizedPayload.checkpoint.dueAt", "<=", now)
      .orderBy("normalizedPayload.checkpoint.dueAt")
      .orderBy(FieldPath.documentId()).limit(limit).get();
    return result.docs.map((doc) => doc.id);
  }

  async process(workItemId: string, wake?: Wake,
    deadline = Number.MAX_SAFE_INTEGER) {
    if (wake) requireDocumentId(wake.signalId);
    if (!Number.isSafeInteger(deadline) || deadline < 0) throw invalidWork();
    if (this.clock() >= deadline) return {kind: "busy" as const};
    const initial = await this.snapshot(workItemId, wake);
    if (!this.needsWork(initial, wake)) {
      return {kind: "idle" as const, records: initial.records};
    }
    const lease = await acquireCheckpointWorkLease(this.operations, workItemId,
      this.clock);
    if (!lease) return {kind: "busy" as const};
    try {
      return await runAssistanceTransaction(this.db, async (tx) => {
        const current = await this.snapshot(workItemId, wake, tx);
        if (!this.needsWork(current, wake)) {
          return {kind: "idle" as const, records: current.records};
        }
        const observed = await this.observe(tx, current.records);
        const now = observed.now;
        if (now >= deadline) return {kind: "busy" as const};
        const next = advanceCheckpointWorkRecords(current.records,
          observed.observation, now);
        const {run, item} = next;
        const at = new Date(now).toISOString();
        const key = wake ? wakeKey(wake) :
          "evaluate:" + current.records.item.revision;
        const receipt: OperationActionReceipt = {schemaVersion: 1,
          actionId: operationActionId(run.runId, item.workItemId, key),
          runId: run.runId, workItemId: item.workItemId,
          sequence: item.revision,
          operation: wake ? "checkpoint_report_wake" : "checkpoint_report_due",
          status: "succeeded", fromRevision: current.records.item.revision,
          toRevision: item.revision, actor: {actorType: "system",
            actorId: "event-assistance-checkpoint-worker"},
          idempotencyKey: key, inputHash: wake ?
            operationContentHash([item.workItemId, key]) :
            operationContentHash(current.records.item),
          outputHash: operationContentHash(item),
          rulesetVersion: CHECKPOINT_WORK_RUNTIME, modelVersion: null,
          reasonCodes: item.blockerCodes.length ? item.blockerCodes :
            [item.primaryStage], occurredAt: at, completedAt: at,
          failure: null};
        const prepared = await this.operations.prepareWorkItemAction(tx,
          {workItem: item, receipt, lease});
        prepared.commit();
        stageRunSet(this.db, tx, run);
        return {kind: "committed" as const, records: next};
      });
    } finally {
      await releaseAssistanceWorkLease(this.operations, lease, this.clock());
    }
  }

  private needsWork(value: {replayed: boolean; records: Records}, wake?: Wake) {
    if (value.replayed) return false;
    const due = value.records.payload.checkpoint.dueAt;
    return !!wake || (due !== null && due <= this.clock());
  }

  private async snapshot(workItemId: string, wake?: Wake, tx?: Transaction) {
    const read = async (transaction: Transaction) => {
      const records = await this.read(transaction, workItemId);
      return {records, replayed: wake ?
        await this.replayedWake(transaction, records, wake) : false};
    };
    return tx ? read(tx) : runAssistanceTransaction(this.db, read);
  }

  private async observe(tx: Transaction, records: Records): Promise<{
    now: number; observation: NonNullable<WorkCheckpoint["observation"]>}> {
    try {
      const state = await readCheckpoint(this.db, tx, records.payload.scope,
        this.clock);
      if (!state.roster || state.roster.rosterId !== records.payload.rosterId ||
          operationContentHash(state.roster) !== records.payload.rosterHash) {
        throw invalidWork();
      }
      const now = this.clock();
      if (now < state.now) throw invalidWork();
      state.now = now;
      const view = checkpointResponse("read", state).view;
      if (!view.request || operationContentHash({
        responsibleOperatorId: view.request.responsibleOperatorId,
        dueAt: view.request.dueAt}) !==
          operationContentHash(effectiveCheckpointRequest(records.payload))) {
        throw invalidWork();
      }
      return {now, observation: {kind: "observed", request: view.request,
        sourceHash: view.sourceHash, reportRevision: view.revision,
        ownerValidUntil: state.ownerValidUntil}};
    } catch {
      // Unreadable facts never complete a request. Five scheduled retries
      // end in visible review; a later source wake can retry fresh evidence.
      return {now: this.clock(), observation: {kind: "unavailable",
        reason: "factsUnavailable"}};
    }
  }

  private async replayedWake(tx: Transaction, {run, item}: Records,
    wake: Wake) {
    const key = wakeKey(wake);
    const id = operationActionId(run.runId, item.workItemId, key);
    const snap = await tx.get(this.db.collection(
      operationCollections.actionReceipts).doc(id));
    if (!snap.exists) return false;
    const parsed = validateOperationActionReceipt(snap.data());
    if (!parsed.ok) throw invalidWork();
    const r = parsed.value;
    if (r.actionId !== id || r.runId !== run.runId ||
        r.workItemId !== item.workItemId || r.idempotencyKey !== key ||
        r.inputHash !== operationContentHash([item.workItemId, key]) ||
        r.operation !== "checkpoint_report_wake" ||
        r.rulesetVersion !== CHECKPOINT_WORK_RUNTIME ||
        r.actor.actorType !== "system" ||
        r.actor.actorId !== "event-assistance-checkpoint-worker" ||
        r.status !== "succeeded" || r.toRevision !== r.fromRevision + 1 ||
        r.sequence !== r.toRevision || r.toRevision > item.revision ||
        r.outputHash === null || (r.toRevision === item.revision &&
          r.outputHash !== operationContentHash(item))) throw invalidWork();
    return true;
  }

  private async read(tx: Transaction, workItemId: string) {
    requireDocumentId(workItemId);
    const item = (await tx.get(this.db.collection(
      operationCollections.workItems)
      .doc(workItemId))).data();
    if (!item || typeof item.runId !== "string") throw invalidWork();
    requireDocumentId(item.runId);
    const run = (await tx.get(this.db.collection(operationCollections.runs)
      .doc(item.runId))).data();
    return readCheckpointWorkRecords(run, item, workItemId, this.clock());
  }
}
function wakeKey(wake: Wake) {
  return "wake:" + operationContentHash(wake.signalId);
}
