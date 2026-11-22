import {runAssistanceTransaction as transact} from "./transactionCallback";
import {randomUUID} from "node:crypto";
import {FieldPath, Firestore, Transaction} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {stageRunSet} from
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
import {LiveAssistanceEnrollmentStore} from "./liveEnrollmentStore";
import {parseRuntimeConfig, readRuntimeConfigAuthority, runtimeConfigId,
  RUNTIME_CONFIGS} from "./runtimeConfigRecords";
import {advanceFanoutPage} from "./boundedFanout";
import {ASSISTANCE_WORKFLOW, invalidWork} from "./liveWorkRecords";
import {LiveAssistanceWorkRunner, errorCode, releaseAssistanceWorkLease} from
  "./liveWorkRunner";
import {ROSTER_WORK_RUNTIME, RosterWork, RosterWorkInput,
  readRosterWorkRecords, rosterWorkProjection} from
  "./rosterWorkRecords";
import {prepareRosterWorkEnqueue, runtimeRosterInput} from
  "./rosterWorkEnqueue";

type Records = ReturnType<typeof readRosterWorkRecords>;
type Failure = RosterWork["checkpoint"]["failures"][number];


/** Durable bounded fanout, sharing Operations persistence and lease fencing. */
export class AssistanceRosterWorkStore {
  readonly operations: FirestoreOperationsRepository;
  private readonly target: Pick<LiveAssistanceWorkRunner, "process">;
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
    target?: Pick<LiveAssistanceWorkRunner, "process">) {
    this.operations = new FirestoreOperationsRepository(db, clock);
    this.target = target ?? new LiveAssistanceWorkRunner(db, clock);
  }

  /** Binds a source delivery to the current saved manager configuration. */
  async enqueueCurrent(input: Omit<RosterWorkInput, "runtimeBinding">) {
    const frozen = structuredClone(input);
    return transact(this.db, async (tx) => {
      const now = this.clock();
      const id = runtimeConfigId(frozen.scope.context);
      if (frozen.source.collection === "eventAssistanceRuntimeConfigs" &&
          (frozen.scope.attendeeId !== null ||
            frozen.source.documentId !== id)) throw invalidWork();
      const snapshot = await tx.get(this.db.collection(RUNTIME_CONFIGS)
        .doc(id));
      if (!snapshot.exists) return {kind: "held" as const, reason: "missing"};
      const runtime = parseRuntimeConfig(snapshot.data(), frozen.scope.context,
        now);
      const binding = {runtimeId: id, revision: runtime.revision};
      const authority = await readRuntimeConfigAuthority(this.db, tx,
        frozen.scope.context, binding, now);
      if (authority.kind !== "ready") {
        return {kind: "held" as const, reason: authority.reason};
      }
      const requested = frozen.source.collection ===
        "eventAssistanceRuntimeConfigs" ? runtimeRosterInput(runtime) :
        {...frozen, runtimeBinding: binding};
      const prepared = await prepareRosterWorkEnqueue(this.db, tx, requested,
        now);
      if (prepared.replayed) {
        return {...prepared.records, kind: "queued" as const, replayed: true};
      }
      const committedAt = this.clock();
      if (committedAt < now) throw invalidWork();
      if (committedAt >= Math.min(prepared.records.payload.expiresAt,
        authority.configuration.expiresAt)) {
        return {kind: "held" as const, reason: "expired"};
      }
      prepared.commit();
      return {...prepared.records, kind: "queued" as const, replayed: false};
    });
  }

  get(workItemId: string) {
    return transact(this.db, (tx) => this.read(tx, workItemId));
  }

  async listDue(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw invalidWork();
    }
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidWork();
    const result = await this.db.collection(operationCollections.workItems)
      .where("workflowId", "==", ASSISTANCE_WORKFLOW)
      .where("normalizedPayload.kind", "==", "liveRosterEnrollment")
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

  private async nextPage(payload: RosterWork, lease: OperationLease) {
    if (this.clock() >= payload.expiresAt) {
      return {...payload, checkpoint: {...payload.checkpoint,
        phase: "expired" as const, dueAt: null, stopReason: null}};
    }
    const authority = await transact(this.db, (tx) =>
      readRuntimeConfigAuthority(this.db, tx, payload.scope.context,
        payload.runtimeBinding, this.clock()));
    if (authority.kind !== "ready") return stopped(payload, authority.reason);
    const phase = payload.checkpoint.phase;
    if (phase !== "scan" && phase !== "retry") throw invalidWork();
    const checkpoint = await advanceFanoutPage({...payload.checkpoint, phase},
      payload.expiresAt, this.clock, {
        list: (cursor, limit) => this.targets(payload, cursor, limit),
        visit: (id) => this.enroll(id, payload, lease),
        failureId: (failure) => failure.attendeeId,
      });
    return {...payload, checkpoint: {...checkpoint, stopReason: null}};
  }

  private async enroll(attendeeId: string, payload: RosterWork,
    lease: OperationLease): Promise<Failure | null> {
    if (this.clock() >= Math.min(Date.parse(lease.expiresAt),
      payload.expiresAt)) {
      throw new Error("Roster work execution window expired");
    }
    try {
      requireDocumentId(attendeeId);
      if (payload.scope.attendeeId !== null &&
          payload.scope.attendeeId !== attendeeId) throw invalidWork();
      const result = await new LiveAssistanceEnrollmentStore(this.db,
        this.clock).ensure(payload.scope.context, attendeeId,
        payload.runtimeBinding);
      if (result.kind === "rebindRequired") {
        const rebound = await this.target.process(result.workItemId,
          {kind: "rebind", binding: payload.runtimeBinding});
        if (rebound.kind === "busy") return {attendeeId, reason: "busy"};
      }
      return null;
    } catch {
      return {attendeeId, reason: "unavailable"};
    }
  }

  private async targets(payload: RosterWork, cursor: string | null,
    limit: number) {
    const {context, attendeeId} = payload.scope;
    if (attendeeId !== null) {
      if (cursor !== null && cursor >= attendeeId) return [];
      const snapshot = await this.db.collection("eventAttendees")
        .doc(attendeeId).get();
      return snapshot.data()?.eventId === context.eventId ? [attendeeId] : [];
    }
    // The canonical event owner is rechecked above and for every target.
    // A single event-id index supports legacy and current organizer fields.
    let query = this.db.collection("eventAttendees")
      .where("eventId", "==", context.eventId).orderBy(FieldPath.documentId());
    if (cursor !== null) query = query.startAfter(cursor);
    return (await query.limit(limit).get()).docs.map((doc) => doc.id);
  }

  private async checkpoint(previous: Records, payload: RosterWork,
    lease: OperationLease) {
    return transact(this.db, async (tx) => {
      const current = await this.read(tx, previous.item.workItemId);
      if (current.item.revision !== previous.item.revision ||
          operationContentHash(current) !== operationContentHash(previous)) {
        throw new Error("Roster work checkpoint changed");
      }
      const now = this.clock();
      if (now >= payload.expiresAt) {
        payload = {...payload, checkpoint: {...payload.checkpoint,
          phase: "expired", dueAt: null, stopReason: null}};
      }
      if (now < payload.expiresAt) {
        const authority = await readRuntimeConfigAuthority(this.db, tx,
          payload.scope.context, payload.runtimeBinding, now);
        if (authority.kind !== "ready") {
          payload = stopped(payload, authority.reason);
        }
      }
      const at = new Date(now).toISOString();
      const p = rosterWorkProjection(payload);
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
      const next = readRosterWorkRecords(run, item, item.workItemId, now);
      const key = "page:" + current.item.revision;
      const receipt: OperationActionReceipt = {schemaVersion: 1,
        actionId: operationActionId(run.runId, item.workItemId, key),
        runId: run.runId, workItemId: item.workItemId, sequence: revision,
        operation: "roster_enrollment_page", status: "succeeded",
        fromRevision: current.item.revision, toRevision: revision,
        actor: {actorType: "system", actorId: "event-assistance-roster-worker"},
        idempotencyKey: key, inputHash: operationContentHash(current.item),
        outputHash: operationContentHash(item),
        rulesetVersion: ROSTER_WORK_RUNTIME,
        modelVersion: null,
        reasonCodes: p.blockerCodes.length ? p.blockerCodes :
          ["roster_" + payload.checkpoint.phase],
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
    return readRosterWorkRecords(run, item, workItemId, this.clock());
  }

  private async acquire(workItemId: string): Promise<OperationLease | null> {
    const now = this.clock();
    try {
      return await this.operations.acquireLease({
        leaseId: operationResourceLeaseId("work_item", workItemId),
        resourceId: workItemId, resourceType: "work_item",
        ownerId: "roster-worker:" + randomUUID(), idempotencyKey: randomUUID(),
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 60_000).toISOString()});
    } catch (error) {
      if (errorCode(error) === "lease_conflict") return null;
      throw error;
    }
  }
}

function stopped(payload: RosterWork,
  reason: NonNullable<RosterWork["checkpoint"]["stopReason"]>): RosterWork {
  return {...payload, checkpoint: {...payload.checkpoint,
    phase: "stopped", stopReason: reason, dueAt: null}};
}
