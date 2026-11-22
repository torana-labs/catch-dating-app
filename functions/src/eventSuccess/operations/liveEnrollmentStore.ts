import {runAssistanceTransaction as transact} from "./transactionCallback";
import type {Firestore} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {stageRunAndWorkItemCreate} from
  "../../operations/transactionalWrites";
import {operationContentHash} from "../../operations/durableActions";
import {prepareCurrentGuestEnrollment} from "./currentGuestEnrollment";
import {invalidWork, liveWorkBasis, liveWorkIds, newLiveWorkRecords,
  parseLiveWork, readLiveWorkRecords} from "./liveWorkRecords";
import {readRuntimeConfigAuthority, RuntimeBinding, RuntimeContext,
  RuntimeUnavailable} from "./runtimeConfigRecords";

type EnrollmentResult =
  {kind: "held"; reason: RuntimeUnavailable | "attendeeUnavailable" |
    "participationUnavailable"} |
  {kind: "enrolled" | "current" | "rebindRequired" | "completed" | "expired";
    workItemId: string; episodeId: string; binding: RuntimeBinding};

/** Atomic enrollment; no guest response or attendance inferred. */
export class LiveAssistanceEnrollmentStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async ensure(context: RuntimeContext, attendeeId: string,
    binding: RuntimeBinding): Promise<EnrollmentResult> {
    const frozen = structuredClone({context, attendeeId, binding});
    return transact(this.db, async (tx) => {
      const now = this.clock();
      const authority = await readRuntimeConfigAuthority(this.db, tx,
        frozen.context, frozen.binding, now);
      if (authority.kind !== "ready") {
        return {kind: "held", reason: authority.reason};
      }
      const enrollment = await prepareCurrentGuestEnrollment(this.db, tx,
        frozen.context, frozen.attendeeId, now);
      if (enrollment.kind === "held") return enrollment;
      const guest = enrollment.guest;
      const payload = parseLiveWork({schemaVersion: 1, kind: "liveLateJoin",
        scope: {context: frozen.context, attendeeId: frozen.attendeeId,
          episodeId: guest.episodeId}, ...authority.configuration,
        runtimeBinding: frozen.binding,
        checkpoint: {dueAt: now, evaluatedAt: null, evaluations: 0,
          sourceHash: null, observation: null, publication: null}}, now);
      const ids = liveWorkIds(payload.scope);
      const runRef = this.db.collection(operationCollections.runs)
        .doc(ids.runId);
      const itemRef = this.db.collection(operationCollections.workItems)
        .doc(ids.workItemId);
      const [runSnap, itemSnap] = await tx.getAll(runRef, itemRef);
      const result = {workItemId: ids.workItemId, episodeId: guest.episodeId,
        binding: frozen.binding};
      if (runSnap.exists || itemSnap.exists) {
        // Missing participation cannot be recreated over existing work.
        if (enrollment.created) throw invalidWork();
        const records = readLiveWorkRecords(runSnap.data(), itemSnap.data(),
          ids.workItemId, now);
        if (records.run.status === "completed") {
          return {...result, kind: "completed"};
        }
        if (now >= records.payload.expiresAt) {
          return {...result, kind: "expired"};
        }
        return {...result, kind: operationContentHash(
          liveWorkBasis(records.payload)) === operationContentHash(
          liveWorkBasis(payload)) ? "current" : "rebindRequired"};
      }
      const records = newLiveWorkRecords(payload, now);
      const committedAt = this.clock();
      if (committedAt < now || committedAt >= payload.expiresAt) {
        throw invalidWork();
      }
      enrollment.commit();
      stageRunAndWorkItemCreate(this.db, tx, records);
      return {...result, kind: "enrolled"};
    });
  }
}
