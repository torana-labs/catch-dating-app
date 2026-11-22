import {prepareCheckpointReassignment} from "./checkpointManagementDecisions";
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
import {validateReassignEventAssistanceCheckpointReporterCallablePayload} from
  "../../shared/generated/validators/reassignEventAssistanceCheckpointReporterInput"; // eslint-disable-line max-len
import {validateEventAssistanceCheckpointReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceCheckpointReceiptDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {requireGroupPermission, denied} from "./groupStaffAuthority";
import {invalidSource} from "./groupProgressSource";
import {readCheckpoint} from "./checkpointReader";
import {CHECKPOINT_RECEIPTS, CheckpointState, Scope, Response,
  checkpointAssignmentView, checkpointAvailability, checkpointConflict,
  checkpointRequestView, checkpointResponse} from "./checkpointRecords";
import {advanceCheckpointWorkRecords, CHECKPOINT_WORK_RUNTIME,
  effectiveCheckpointRequest, Reassignment} from "./checkpointWorkRecords";
import {acquireCheckpointWorkLease, readCheckpointAssignmentReceipt} from
  "./checkpointWorkAccess";
import {releaseAssistanceWorkLease} from "./liveWorkRunner";
import {runAssistanceTransaction} from "./transactionCallback";

/** Transfers a named report, never staff access or arrival evidence. */
export class CheckpointReporterStore {
  readonly operations: FirestoreOperationsRepository;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.operations = new FirestoreOperationsRepository(db, clock);
  }

  async reassign(actorUid: string, input: unknown): Promise<Response> {
    if (!validateReassignEventAssistanceCheckpointReporterCallablePayload(
      input) || input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument",
        "Invalid checkpoint assignment.");
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
    const receiptId = "checkpoint-reassignment:" + operationContentHash([
      context, payload.groupId, command.operationId]);
    const snapshot = async (tx: Transaction) => {
      const access = await requireGroupPermission(this.db, tx, context,
        scope.groupId, actorUid, "recordCheckpoint", this.clock);
      if (access.role !== "eventLead") throw denied();
      assertCommandRole(command, [access.role]);
      const s = await readCheckpoint(this.db, tx, scope, this.clock);
      if (!s.requestWork) {
        throw new HttpsError("failed-precondition",
          "This departure has no durable checkpoint request.");
      }
      const receipt = await readCheckpointAssignmentReceipt(this.db, tx,
        receiptId, s.requestWork, this.clock());
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < s.now) throw invalidSource();
      if (now >= access.validUntil) throw denied();
      s.now = now;
      if (receipt) {
        const a = receipt.assignment;
        if (receipt.requestHash !== requestHash || a.assignedBy !== actorUid ||
            a.responsibleOperatorId !== payload.responsibleOperatorId ||
            a.reason !== payload.reason.trim() ||
            a.revision !== payload.expectedAssignmentRevision + 1) {
          throw checkpointConflict();
        }
        return {s, replay: checkpointResponse("replayed", s, a.revision)};
      }
      prepareCheckpointReassignment({assignment: checkpointAssignmentView(s)!,
        availability: checkpointAvailability(s),
        request: checkpointRequestView(s)},
      payload, input.expectedSourceHash);
      return {s, replay: null};
    };
    // Authorize and resolve retries before taking the shared work lease.
    const initial = await runAssistanceTransaction(this.db, snapshot);
    if (initial.replay) return initial.replay;
    const workItemId = initial.s.requestWork!.item.workItemId;
    const lease = await acquireCheckpointWorkLease(this.operations,
      workItemId, this.clock);
    if (!lease) {
      throw new HttpsError("aborted",
        "Checkpoint work is busy. Retry shortly.");
    }
    try {
      return await runAssistanceTransaction(this.db, async (tx) => {
        const current = await snapshot(tx);
        if (current.replay) return current.replay;
        const s = current.s;
        const records = s.requestWork!;
        const owner = await requireGroupPermission(this.db, tx, context,
          scope.groupId, payload.responsibleOperatorId,
          "recordCheckpoint", this.clock);
        const now = this.clock();
        assertTimeAndOwner(s, now, owner.validUntil);
        const assignment: Reassignment = {
          revision: payload.expectedAssignmentRevision + 1, receiptId,
          responsibleOperatorId: payload.responsibleOperatorId,
          previousResponsibleOperatorId:
            effectiveCheckpointRequest(records.payload).responsibleOperatorId,
          assignedBy: actorUid, assignedAt: now, reason: payload.reason.trim()};
        const state: CheckpointState = {...s, now,
          ownerValidUntil: owner.validUntil, requestWork: {...records,
            payload: {...records.payload, reassignment: assignment}}};
        const view = checkpointResponse("read", state).view;
        const next = advanceCheckpointWorkRecords(records,
          {kind: "observed", request: view.request!,
            sourceHash: view.sourceHash, reportRevision: view.revision,
            ownerValidUntil: owner.validUntil}, now, assignment);
        state.requestWork = next;
        const {run, item} = next;
        const at = new Date(now).toISOString();
        const receipt: OperationActionReceipt = {schemaVersion: 1,
          actionId: operationActionId(run.runId, item.workItemId, receiptId),
          runId: run.runId, workItemId: item.workItemId,
          sequence: item.revision, operation: "checkpoint_report_reassign",
          status: "succeeded", fromRevision: records.item.revision,
          toRevision: item.revision,
          actor: {actorType: "human", actorId: actorUid},
          idempotencyKey: receiptId, inputHash: requestHash,
          outputHash: operationContentHash(item),
          rulesetVersion: CHECKPOINT_WORK_RUNTIME, modelVersion: null,
          reasonCodes: ["reporter_reassigned"], occurredAt: at,
          completedAt: at, failure: null};
        const saved = {receiptId, requestHash, scope,
          rosterHash: records.payload.rosterHash,
          workItemRevision: item.revision, assignment};
        if (!validateEventAssistanceCheckpointReceiptDocument(saved)) {
          throw invalidSource();
        }
        const prepared = await this.operations.prepareWorkItemAction(tx,
          {workItem: item, receipt, lease});
        // Preparation reads the lease and work; access may expire there.
        const commitAt = this.clock();
        assertTimeAndOwner(state, commitAt, owner.validUntil);
        state.now = commitAt;
        const response = checkpointResponse("applied", state,
          assignment.revision);
        prepared.commit();
        stageRunSet(this.db, tx, run);
        tx.create(this.db.collection(CHECKPOINT_RECEIPTS).doc(receiptId),
          saved);
        return response;
      });
    } catch (error) {
      if (error instanceof OperationConflictError) {
        throw new HttpsError("aborted",
          "Checkpoint work changed. Refresh and retry.");
      }
      throw error;
    } finally {
      await releaseAssistanceWorkLease(this.operations, lease, this.clock());
    }
  }
}
function assertTimeAndOwner(s: CheckpointState, now: number,
  validUntil: number) {
  if (!Number.isSafeInteger(now) || now < s.now) throw invalidSource();
  if (validUntil <= Math.max(now, s.roster!.checkpointRequest!.dueAt)) {
    throw new HttpsError("failed-precondition",
      "Reporter access must extend beyond now and the original deadline.");
  }
}
