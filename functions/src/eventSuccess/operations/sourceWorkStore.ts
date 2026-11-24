import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {randomUUID} from "node:crypto";
import {FieldPath, Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {stageRunAndWorkItemCreate, stageRunSet} from
  "../../operations/transactionalWrites";
import {operationActionId, operationContentHash} from
  "../../operations/durableActions";
import {operationResourceLeaseId} from
  "../../operations/firestoreLeaseRepository";
import {FirestoreOperationsRepository} from
  "../../operations/firestoreRepository";
import type {OperationActionReceipt, OperationLease} from
  "../../operations/models";
import {requireDocumentId} from "./guestRecords";
import {advanceFanoutPage} from "./boundedFanout";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {ASSISTANCE_WORKFLOW, invalidWork} from "./liveWorkRecords";
import {LiveAssistanceWorkRunner, errorCode, releaseAssistanceWorkLease} from
  "./liveWorkRunner";
import {SOURCE_WORK_RUNTIME, SourceWork, SourceWorkInput, EventSourceScope,
  isEventSourceScope, isCheckpointMemberScope, sourceFailureId,
  newSourceWorkRecords, readSourceWorkRecords, sourceWorkProjection} from
  "./sourceWorkRecords";
import {SourceReadinessTargets} from "./sourceReadinessTargets";

type Records = ReturnType<typeof readSourceWorkRecords>;
type Failure = SourceWork["checkpoint"]["failures"][number];


/** Durable bounded fanout, sharing Operations persistence and lease fencing. */
export class AssistanceSourceWorkStore {
  readonly operations: FirestoreOperationsRepository;
  private readonly target: Pick<LiveAssistanceWorkRunner, "process">;
  private readonly delivery: Pick<AssistanceDeliveryWorkStore, "process">;
  private readonly checkpointWork: Pick<AssistanceCheckpointWorkStore,
    "process">;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
    target?: Pick<LiveAssistanceWorkRunner, "process">,
    delivery?: Pick<AssistanceDeliveryWorkStore, "process">,
    checkpointWork?: Pick<AssistanceCheckpointWorkStore, "process">) {
    this.operations = new FirestoreOperationsRepository(db, clock);
    this.target = target ?? new LiveAssistanceWorkRunner(db, clock);
    this.delivery = delivery ?? new AssistanceDeliveryWorkStore(db, clock);
    this.checkpointWork = checkpointWork ??
      new AssistanceCheckpointWorkStore(db, clock);
  }

  async enqueue(input: SourceWorkInput) {
    const frozen = structuredClone(input);
    return transact(this.db, async (tx) => {
      const proposed = newSourceWorkRecords(frozen, this.clock());
      const runRef = this.db.collection(operationCollections.runs)
        .doc(proposed.run.runId);
      const itemRef = this.db.collection(operationCollections.workItems)
        .doc(proposed.item.workItemId);
      const [run, item] = await tx.getAll(runRef, itemRef);
      if (run.exists || item.exists) {
        const existing = readSourceWorkRecords(run.data(), item.data(),
          itemRef.id, this.clock());
        return {...existing, replayed: true};
      }
      stageRunAndWorkItemCreate(this.db, tx, proposed);
      return {...proposed, replayed: false};
    });
  }

  get(workItemId: string) {
    return transact(this.db, (tx) => this.read(tx, workItemId));
  }

  async hasTargets(scope: SourceWork["scope"], occurredAt = this.clock()) {
    return (await this.targetIds(scope, null, 1, occurredAt)).length > 0;
  }

  async listDue(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw invalidWork();
    }
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidWork();
    const result = await this.db.collection(operationCollections.workItems)
      .where("workflowId", "==", ASSISTANCE_WORKFLOW)
      .where("normalizedPayload.kind", "==", "liveSourceWake")
      .where("normalizedPayload.checkpoint.dueAt", ">=", 0)
      .where("normalizedPayload.checkpoint.dueAt", "<=", now)
      .orderBy("normalizedPayload.checkpoint.dueAt")
      .orderBy(FieldPath.documentId()).limit(limit).get();
    return result.docs.map((doc) => doc.id);
  }

  async process(workItemId: string) {
    const initial = await this.get(workItemId);
    if (initial.payload.checkpoint.dueAt === null ||
        initial.payload.checkpoint.dueAt > this.clock()) {
      return {kind: "idle" as const, records: initial};
    }
    const lease = await this.acquire(workItemId);
    if (!lease) return {kind: "busy" as const};
    try {
      const current = await this.get(workItemId);
      if (current.payload.checkpoint.dueAt === null ||
          current.payload.checkpoint.dueAt > this.clock()) {
        return {kind: "idle" as const, records: current};
      }
      const next = await this.nextPage(current.payload, lease);
      return {kind: "committed" as const,
        records: await this.checkpoint(current, next, lease)};
    } finally {
      await releaseAssistanceWorkLease(this.operations, lease, this.clock());
    }
  }

  private async nextPage(payload: SourceWork, lease: OperationLease) {
    const checkpoint = await advanceFanoutPage(payload.checkpoint,
      payload.expiresAt, this.clock, {
        list: (cursor, limit) => this.targets({...payload,
          checkpoint: {...payload.checkpoint, cursor}}, limit),
        visit: (id) => this.wake(id, payload, lease),
        failureId: sourceFailureId,
      });
    return {...payload, checkpoint};
  }

  private async wake(targetId: string, payload: SourceWork,
    lease: OperationLease): Promise<Failure | null> {
    if (this.clock() >= Math.min(Date.parse(lease.expiresAt),
      payload.expiresAt)) {
      throw new Error("Source work execution window expired");
    }
    try {
      if (!isEventSourceScope(payload.scope)) {
        const scope = await new SourceReadinessTargets(this.db, this.clock)
          .resolve(payload.scope, targetId, payload.source.occurredAt);
        if (scope && await this.hasTargets(scope)) {
          // The child is deterministic across lost parent checkpoints. It
          // only wakes existing work and never configures or enrolls guests.
          await this.enqueue({scope, source: payload.source});
        }
        return null;
      }
      // Re-read the work's scope before invoking the generic target port.
      const workItemId = targetId;
      const isCheckpoint = workItemId.startsWith("work:checkpoint:");
      const isDelivery = workItemId.startsWith("work:delivery:");
      const target = isCheckpoint ?
        await new AssistanceCheckpointWorkStore(this.db, this.clock)
          .get(workItemId) : isDelivery ?
          await new AssistanceDeliveryWorkStore(this.db, this.clock)
            .get(workItemId) :
          await new LiveAssistanceWorkRunner(this.db, this.clock)
            .store.get(workItemId);
      if (operationContentHash(target.payload.scope.context) !==
          operationContentHash(payload.scope.context) ||
          (!isCheckpointMemberScope(payload.scope) &&
            payload.scope.attendeeId !== null &&
            (!("attendeeId" in target.payload.scope) ||
            target.payload.scope.attendeeId !== payload.scope.attendeeId))) {
        throw invalidWork();
      }
      if (isCheckpointMemberScope(payload.scope)) {
        if (!isCheckpoint) throw invalidWork();
        const included = await new AssistanceCheckpointWorkStore(this.db,
          this.clock).includesDepartureMember(workItemId,
          payload.scope.attendeeId);
        if (!included) return null;
      }
      const action = {kind: "wake" as const, signalId: payload.signalId};
      const result = isCheckpoint ?
        await this.checkpointWork.process(workItemId, action,
          Math.min(Date.parse(lease.expiresAt), payload.expiresAt)) :
        isDelivery ?
          await this.delivery.process(workItemId, action,
            Math.min(Date.parse(lease.expiresAt), payload.expiresAt)) :
          await this.target.process(workItemId, action);
      return result.kind === "busy" ? {workItemId, reason: "busy"} : null;
    } catch {
      // Keep the exact target for bounded retry and eventual human review;
      // other guests in this page still receive their wake signal.
      return isEventSourceScope(payload.scope) ?
        {workItemId: targetId, reason: "unavailable"} :
        {targetKey: targetId, reason: "unavailable"};
    }
  }

  private async targets(payload: SourceWork, limit: number) {
    return this.targetIds(payload.scope, payload.checkpoint.cursor, limit,
      payload.source.occurredAt);
  }

  private async targetIds(scope: SourceWork["scope"], cursor: string | null,
    limit: number, occurredAt: number) {
    if (!isEventSourceScope(scope)) {
      return new SourceReadinessTargets(this.db, this.clock)
        .list(scope, occurredAt, cursor, limit);
    }
    // Reuse equality-query indexes; merge their bounded pages using
    // the same ordinal ordering as Firestore document-id cursors.
    // Ordinary guest signals cannot select checkpoint work. Explicit member
    // signals discover saved requests in this event, then verify membership
    // against each immutable original roster before invoking its worker.
    const kinds = isCheckpointMemberScope(scope) ?
      ["liveCheckpointReport"] as const : scope.attendeeId === null ?
      ["liveLateJoin", "liveMessageDelivery", "liveCheckpointReport"] as const :
      ["liveLateJoin", "liveMessageDelivery"] as const;
    const pages = await Promise.all(kinds.map((kind) =>
      this.targetQuery(scope, cursor, kind)
        .limit(limit).get()));
    return pages.flatMap((page) => page.docs.map((doc) => doc.id))
      .sort().slice(0, limit);
  }

  private targetQuery(scope: EventSourceScope, cursor: string | null,
    kind: "liveLateJoin" | "liveMessageDelivery" | "liveCheckpointReport") {
    let query = this.db.collection(operationCollections.workItems)
      .where("workflowId", "==", ASSISTANCE_WORKFLOW)
      .where("normalizedPayload.kind", "==", kind)
      .where("normalizedPayload.scope.context.organizerId", "==",
        scope.context.organizerId)
      .where("normalizedPayload.scope.context.eventId", "==",
        scope.context.eventId);
    if (scope.attendeeId !== null && !isCheckpointMemberScope(scope)) {
      query = query.where("normalizedPayload.scope.attendeeId", "==",
        scope.attendeeId);
    }
    query = query.orderBy(FieldPath.documentId());
    if (cursor !== null) {
      query = query.startAfter(cursor);
    }
    return query;
  }

  private async checkpoint(previous: Records, payload: SourceWork,
    lease: OperationLease) {
    return transact(this.db, async (tx) => {
      const current = await this.read(tx, previous.item.workItemId);
      if (current.item.revision !== previous.item.revision ||
          operationContentHash(current) !== operationContentHash(previous)) {
        throw new Error("Source work checkpoint changed");
      }
      const now = this.clock();
      if (now >= payload.expiresAt) {
        payload = {...payload, checkpoint: {...payload.checkpoint,
          phase: "expired", dueAt: null}};
      }
      const at = new Date(now).toISOString();
      const p = sourceWorkProjection(payload);
      const revision = current.item.revision + 1;
      const item = {...current.item, ...p, revision, attemptCount: revision,
        normalizedPayload: {...payload}, updatedAt: at};
      const run = {...current.run, revision,
        status: p.lifecycleStatus === "terminal" ? "completed" as const :
          p.primaryStage === "host_review" ? "paused" as const :
            "running" as const,
        updatedAt: at,
        finishedAt: p.lifecycleStatus === "terminal" ? at : null,
        checkpoint: {lastSequence: revision, cursor: payload.checkpoint.cursor},
        counters: {...current.run.counters, processed: 1,
          failed: payload.checkpoint.failures.length,
          escalated: Number(p.primaryStage === "host_review")}};
      const next = readSourceWorkRecords(run, item, item.workItemId, now);
      const key = "page:" + current.item.revision;
      const receipt: OperationActionReceipt = {schemaVersion: 1,
        actionId: operationActionId(run.runId, item.workItemId, key),
        runId: run.runId, workItemId: item.workItemId, sequence: revision,
        operation: "source_wake_page", status: "succeeded",
        fromRevision: current.item.revision, toRevision: revision,
        actor: {actorType: "system", actorId: "event-assistance-source-worker"},
        idempotencyKey: key, inputHash: operationContentHash(current.item),
        outputHash: operationContentHash(item),
        rulesetVersion: SOURCE_WORK_RUNTIME,
        modelVersion: null,
        reasonCodes: p.blockerCodes.length ? p.blockerCodes :
          ["source_wake_" + payload.checkpoint.phase],
        occurredAt: at, completedAt: at, failure: null};
      const prepared = await this.operations.prepareWorkItemAction(tx,
        {workItem: item, receipt, lease});
      prepared.commit();
      stageRunSet(this.db, tx, run);
      return next;
    });
  }

  private async read(tx: Transaction, workItemId: string) {
    requireDocumentId(workItemId);
    const item = (await tx.get(this.db.collection(
      operationCollections.workItems).doc(workItemId))).data();
    if (!item || typeof item.runId !== "string") throw invalidWork();
    requireDocumentId(item.runId);
    const run = (await tx.get(this.db.collection(operationCollections.runs)
      .doc(item.runId))).data();
    return readSourceWorkRecords(run, item, workItemId, this.clock());
  }

  private async acquire(workItemId: string): Promise<OperationLease | null> {
    const now = this.clock();
    try {
      return await this.operations.acquireLease({
        leaseId: operationResourceLeaseId("work_item", workItemId),
        resourceId: workItemId, resourceType: "work_item",
        ownerId: "source-worker:" + randomUUID(), idempotencyKey: randomUUID(),
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 60_000).toISOString()});
    } catch (error) {
      if (errorCode(error) === "lease_conflict") return null;
      throw error;
    }
  }
}
