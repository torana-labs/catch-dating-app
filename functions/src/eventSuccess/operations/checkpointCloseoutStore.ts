import {prepareCheckpointCloseout} from "./checkpointManagementDecisions";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {stageRunSet} from
  "../../operations/transactionalWrites";
import {operationActionId, operationContentHash} from
  "../../operations/durableActions";
import {FirestoreOperationsRepository} from
  "../../operations/firestoreRepository";
import {OperationConflictError} from "../../operations/errors";
import type {OperationActionReceipt} from "../../operations/models";
import {validateSetEventAssistanceCheckpointCloseoutCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceCheckpointCloseoutInput";
import {validateEventAssistanceCheckpointReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceCheckpointReceiptDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {requireGroupPermission, denied} from "./groupStaffAuthority";
import {invalidSource} from "./groupProgressSource";
import {readCheckpoint} from "./checkpointReader";
import {CHECKPOINT_RECEIPTS, CheckpointState, Scope, Response,
  checkpointConflict, checkpointRequestView, checkpointResponse} from
  "./checkpointRecords";
import {advanceCheckpointWorkRecords, CHECKPOINT_WORK_RUNTIME,
  effectiveCheckpointRequest} from "./checkpointWorkRecords";
import {CloseoutChange, checkpointCloseoutView, currentCloseoutDecision} from
  "./checkpointCloseoutPolicy";
import {readCheckpointCloseoutReceipt} from "./checkpointCloseoutAccess";
import {acquireCheckpointWorkLease} from "./checkpointWorkAccess";
import {releaseAssistanceWorkLease} from "./liveWorkRunner";
import {runAssistanceTransaction} from "../../platform/transactionCallback";

/** Close or reopen an obligation without changing arrival or visit facts. */
export class CheckpointCloseoutStore {
  readonly operations: FirestoreOperationsRepository;
  private readonly clock: () => number;
  constructor(private readonly db: Firestore, clock: () => number = Date.now) {
    let last = -1;
    this.clock = () => {
      const now = clock();
      if (!Number.isSafeInteger(now) || now < 0 || now < last) {
        throw invalidSource();
      }
      last = now;
      return now;
    };
    this.operations = new FirestoreOperationsRepository(db, this.clock);
  }

  async set(actorUid: string, input: unknown): Promise<Response> {
    if (!validateSetEventAssistanceCheckpointCloseoutCallablePayload(input) ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid checkpoint closeout.");
    }
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument", "Checkpoint context mismatch.");
    }
    const scope: Scope = {context, groupId: payload.groupId,
      checkpointId: payload.checkpointId,
      progressRevision: payload.expectedProgressRevision};
    const requestHash = operationContentHash([actorUid, input]);
    const receiptId = "checkpoint-closeout:" + operationContentHash([
      context, payload.groupId, command.operationId]);
    const snapshot = async (tx: Transaction) => {
      const access = await requireGroupPermission(this.db, tx, context,
        scope.groupId, actorUid, "recordCheckpoint", this.clock);
      assertCommandRole(command, [access.role]);
      const s = await readCheckpoint(this.db, tx, scope, this.clock);
      if (!s.requestWork) {
        throw new HttpsError("failed-precondition",
          "This departure has no durable checkpoint request.");
      }
      if (access.role !== "eventLead" && actorUid !==
          effectiveCheckpointRequest(s.requestWork.payload)
            .responsibleOperatorId) throw denied();
      const receipt = await readCheckpointCloseoutReceipt(this.db, tx,
        receiptId, s.requestWork, this.clock());
      s.now = this.clock();
      if (s.now >= access.validUntil) throw denied();
      if (receipt) {
        const c = receipt.closeout;
        if (receipt.requestHash !== requestHash || c.changedBy !== actorUid ||
            c.decision.kind !== payload.decision ||
            c.reason !== payload.reason.trim() ||
            c.previousRevision !== payload.expectedCloseoutRevision) {
          throw checkpointConflict();
        }
        return {s, access,
          replay: checkpointResponse("replayed", s, c.revision)};
      }
      prepareCheckpointCloseout({closeout: checkpointCloseoutView(s)!,
        request: checkpointRequestView(s)}, payload, input.expectedSourceHash);
      return {s, access, replay: null};
    };
    const initial = await runAssistanceTransaction(this.db, snapshot);
    if (initial.replay) return initial.replay;
    const workItemId = initial.s.requestWork!.item.workItemId;
    const lease = await acquireCheckpointWorkLease(this.operations,
      workItemId, this.clock);
    if (!lease) throw new HttpsError("aborted", "Checkpoint work is busy.");
    try {
      return await runAssistanceTransaction(this.db, async (tx) => {
        const current = await snapshot(tx);
        if (current.replay) return current.replay;
        const {s, access} = current;
        const records = s.requestWork!;
        const now = this.clock();
        if (now >= access.validUntil) throw denied();
        const decision = payload.decision === "close" ?
          currentCloseoutDecision(s) : {kind: "reopen" as const};
        if (!decision) throw checkpointConflict();
        const closeout: CloseoutChange = {
          revision: payload.expectedCloseoutRevision + 1,
          previousRevision: payload.expectedCloseoutRevision, receiptId,
          changedBy: actorUid, changedAt: now, reason: payload.reason.trim(),
          decision};
        const state: CheckpointState = {...s, now, requestWork: {...records,
          payload: {...records.payload, closeout}}};
        const view = checkpointResponse("read", state).view;
        const next = advanceCheckpointWorkRecords(records,
          {kind: "observed", request: view.request!,
            sourceHash: view.sourceHash, reportRevision: view.revision,
            ownerValidUntil: s.ownerValidUntil}, now, undefined, closeout);
        state.requestWork = next;
        const {run, item} = next;
        const saved = {receiptId, requestHash, scope,
          rosterHash: records.payload.rosterHash,
          workItemRevision: item.revision, closeout};
        if (!validateEventAssistanceCheckpointReceiptDocument(saved)) {
          throw invalidSource();
        }
        const at = new Date(now).toISOString();
        const receipt: OperationActionReceipt = {schemaVersion: 1,
          actionId: operationActionId(run.runId, item.workItemId, receiptId),
          runId: run.runId, workItemId: item.workItemId,
          sequence: item.revision,
          operation: "checkpoint_closeout_" + payload.decision,
          status: "succeeded", fromRevision: records.item.revision,
          toRevision: item.revision,
          actor: {actorType: "human", actorId: actorUid},
          idempotencyKey: receiptId, inputHash: operationContentHash(saved),
          outputHash: operationContentHash(item),
          rulesetVersion: CHECKPOINT_WORK_RUNTIME, modelVersion: null,
          reasonCodes: [payload.decision === "close" ? "report_closed_out" :
            "report_reopened"], occurredAt: at, completedAt: at, failure: null};
        const prepared = await this.operations.prepareWorkItemAction(tx,
          {workItem: item, receipt, lease});
        state.now = this.clock();
        if (state.now >= access.validUntil) throw denied();
        const response = checkpointResponse("applied", state,
          closeout.revision);
        prepared.commit();
        stageRunSet(this.db, tx, run);
        tx.create(this.db.collection(CHECKPOINT_RECEIPTS).doc(receiptId),
          saved);
        return response;
      });
    } catch (error) {
      if (error instanceof OperationConflictError) {
        throw new HttpsError("aborted", "Checkpoint work changed. Retry.");
      }
      throw error;
    } finally {
      await releaseAssistanceWorkLease(this.operations, lease, this.clock());
    }
  }
}
