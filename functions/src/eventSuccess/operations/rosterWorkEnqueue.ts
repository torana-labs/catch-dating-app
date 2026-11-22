import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {stageRunAndWorkItemCreate} from
  "../../operations/transactionalWrites";
import {invalidWork} from "./liveWorkRecords";
import type {RuntimeConfig} from "./runtimeConfigRecords";
import {newRosterWorkRecords, readRosterWorkRecords, rosterWorkBasis,
  RosterWorkInput} from "./rosterWorkRecords";

/** One event-wide job per saved revision, including trigger redelivery. */
export function runtimeRosterInput(runtime: RuntimeConfig): RosterWorkInput {
  return {scope: {context: runtime.context, attendeeId: null},
    runtimeBinding: {runtimeId: runtime.runtimeId, revision: runtime.revision},
    source: {collection: "eventAssistanceRuntimeConfigs",
      documentId: runtime.runtimeId,
      eventId: "runtime-revision:" + operationContentHash([
        runtime.runtimeId, runtime.revision]), occurredAt: runtime.updatedAt}};
}

/** Transaction participant; callers prove current runtime authority. */
export async function prepareRosterWorkEnqueue(db: Firestore, tx: Transaction,
  input: RosterWorkInput, now: number) {
  const proposed = newRosterWorkRecords(input, now);
  const runRef = db.collection(operationCollections.runs)
    .doc(proposed.run.runId);
  const itemRef = db.collection(operationCollections.workItems)
    .doc(proposed.item.workItemId);
  const [run, item] = await tx.getAll(runRef, itemRef);
  if (run.exists || item.exists) {
    const existing = readRosterWorkRecords(run.data(), item.data(), itemRef.id,
      now);
    if (operationContentHash(rosterWorkBasis(existing.payload)) !==
        operationContentHash(rosterWorkBasis(proposed.payload))) {
      throw invalidWork();
    }
    return {records: existing, replayed: true, commit: () => undefined};
  }
  return {records: proposed, replayed: false, commit: () => {
    stageRunAndWorkItemCreate(db, tx, proposed);
  }};
}
