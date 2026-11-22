import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {stageRunAndWorkItemCreate} from
  "../../operations/transactionalWrites";
import type {Roster} from "./checkpointRecords";
import {invalidWork} from "./liveWorkRecords";
import {newCheckpointWorkRecords, readCheckpointWorkRecords,
  checkpointWorkBasis} from "./checkpointWorkRecords";

/** The explicit departure request and its durable work share one commit. */
export async function prepareCheckpointWorkEnqueue(db: Firestore,
  tx: Transaction, roster: Roster, now: number) {
  if (!roster.checkpointRequest) return {commit: () => undefined};
  const proposed = newCheckpointWorkRecords(roster);
  const runRef = db.collection(operationCollections.runs)
    .doc(proposed.run.runId);
  const itemRef = db.collection(operationCollections.workItems)
    .doc(proposed.item.workItemId);
  const [run, item] = await tx.getAll(runRef, itemRef);
  if (run.exists || item.exists) {
    const prior = readCheckpointWorkRecords(run.data(), item.data(),
      itemRef.id, now);
    if (operationContentHash(checkpointWorkBasis(prior.payload)) !==
        operationContentHash(checkpointWorkBasis(proposed.payload))) {
      throw invalidWork();
    }
    return {commit: () => undefined};
  }
  return {commit: () => {
    stageRunAndWorkItemCreate(db, tx, proposed);
  }};
}
