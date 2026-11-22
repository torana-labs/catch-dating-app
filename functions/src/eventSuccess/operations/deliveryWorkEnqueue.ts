import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {stageRunAndWorkItemCreate} from
  "../../operations/transactionalWrites";
import {invalidWork} from "./liveWorkRecords";
import type {MessageRecord} from "./messageOutbox";
import {deliveryWorkBasis, hasAutomaticDelivery, newDeliveryWorkRecords,
  readDeliveryWorkRecords} from "./deliveryWorkRecords";

/** Joins message publication in one commit; no credentials or provider I/O. */
export async function prepareDeliveryWorkEnqueue(db: Firestore,
  tx: Transaction, message: MessageRecord, now: number) {
  if (!hasAutomaticDelivery(message)) return {commit: () => undefined};
  const proposed = newDeliveryWorkRecords(message, now);
  const runRef = db.collection(operationCollections.runs)
    .doc(proposed.run.runId);
  const itemRef = db.collection(operationCollections.workItems)
    .doc(proposed.item.workItemId);
  const [run, item] = await tx.getAll(runRef, itemRef);
  if (run.exists || item.exists) {
    const existing = readDeliveryWorkRecords(run.data(), item.data(),
      itemRef.id, now);
    if (operationContentHash(deliveryWorkBasis(existing.payload)) !==
        operationContentHash(deliveryWorkBasis(proposed.payload))) {
      throw invalidWork();
    }
    return {commit: () => undefined};
  }
  return {commit: () => {
    stageRunAndWorkItemCreate(db, tx, proposed);
  }};
}
