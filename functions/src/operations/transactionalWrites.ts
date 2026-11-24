import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "./collections";
import {OperationDomainError} from "./errors";
import type {OperationRun, OperationWorkItem} from "./models";
import {
  validateOperationRun,
  validateOperationWorkItem,
  ValidationResult,
} from "./validation";

/*
 * The only way code outside the operations platform writes `operationRuns`
 * and `operationWorkItems`. Domain workflows build their own records and
 * join these staged writes to their own transactions; the platform checks
 * each record against its contract before the write is staged, so an
 * invalid record fails the whole transaction instead of being persisted.
 * Every write is keyed by the record's own id. Work-item checkpoints that
 * carry an action receipt go through
 * `FirestoreOperationsRepository.prepareWorkItemAction` instead.
 */

function assertValid<T>(result: ValidationResult<T>, entity: string): void {
  if (!result.ok) {
    throw new OperationDomainError("invalid_entity",
      `${entity} is invalid: ${result.issues.map((issue) =>
        `${issue.path}:${issue.code}`).join(", ")}`);
  }
}

function runRef(db: Firestore, run: OperationRun) {
  return db.collection(operationCollections.runs).doc(run.runId);
}

function workItemRef(db: Firestore, item: OperationWorkItem) {
  return db.collection(operationCollections.workItems).doc(item.workItemId);
}

/**
 * Stage creation of a new run in the caller's transaction. The commit fails
 * if a run with the same id already exists.
 * @param {Firestore} db Firestore instance that owns the transaction.
 * @param {Transaction} tx Transaction the write joins.
 * @param {OperationRun} run Complete run record, keyed by `run.runId`.
 */
export function stageRunCreate(db: Firestore, tx: Transaction,
  run: OperationRun): void {
  assertValid(validateOperationRun(run), "run");
  tx.create(runRef(db, run), run);
}

/**
 * Stage a full replacement of a run in the caller's transaction. The caller
 * owns revision checks; it must have read the run in the same transaction.
 * @param {Firestore} db Firestore instance that owns the transaction.
 * @param {Transaction} tx Transaction the write joins.
 * @param {OperationRun} run Complete run record, keyed by `run.runId`.
 */
export function stageRunSet(db: Firestore, tx: Transaction,
  run: OperationRun): void {
  assertValid(validateOperationRun(run), "run");
  tx.set(runRef(db, run), run);
}

/**
 * Stage creation of a new work item in the caller's transaction. The commit
 * fails if a work item with the same id already exists.
 * @param {Firestore} db Firestore instance that owns the transaction.
 * @param {Transaction} tx Transaction the write joins.
 * @param {OperationWorkItem} item Complete work item, keyed by its id.
 */
export function stageWorkItemCreate(db: Firestore, tx: Transaction,
  item: OperationWorkItem): void {
  assertValid(validateOperationWorkItem(item), "work item");
  tx.create(workItemRef(db, item), item);
}

/**
 * Stage creation of a run and its first work item together. Both records
 * are validated before either write is staged.
 * @param {Firestore} db Firestore instance that owns the transaction.
 * @param {Transaction} tx Transaction the writes join.
 * @param {{run: OperationRun, item: OperationWorkItem}} work New records.
 */
export function stageRunAndWorkItemCreate(db: Firestore, tx: Transaction,
  work: {run: OperationRun; item: OperationWorkItem}): void {
  assertValid(validateOperationRun(work.run), "run");
  assertValid(validateOperationWorkItem(work.item), "work item");
  tx.create(runRef(db, work.run), work.run);
  tx.create(workItemRef(db, work.item), work.item);
}
