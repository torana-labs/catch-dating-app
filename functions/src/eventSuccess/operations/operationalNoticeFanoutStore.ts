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
import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {advanceFanoutPage} from "./boundedFanout";
import {ensureCurrentGuestEnrollment} from "./currentGuestEnrollment";
import {requireDocumentId} from "./guestRecords";
import {ASSISTANCE_WORKFLOW, invalidWork} from "./liveWorkRecords";
import {errorCode, releaseAssistanceWorkLease} from "./liveWorkRunner";
import {readOperationalNoticeFanoutAuthority} from
  "./operationalNoticeFanoutAuthority";
import {Fanout, newOperationalNoticeFanoutRecords,
  OPERATIONAL_NOTICE_FANOUT_RUNTIME,
  OperationalNoticeFanoutInput, operationalNoticeFanoutBasis,
  operationalNoticeFanoutProjection, readOperationalNoticeFanoutRecords} from
  "./operationalNoticeFanoutRecords";
import {OperationalNoticePublisher} from "./operationalNoticePublication";
import {EventPlanChangeSourceReader, PostEventFollowUpSourceReader} from
  "./operationalNoticeSourceReaders";

type Records = ReturnType<typeof readOperationalNoticeFanoutRecords>;

/** Durable, bounded publication fanout for one immutable operational source. */
export class OperationalNoticeFanoutStore {
  readonly operations: FirestoreOperationsRepository;

  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.operations = new FirestoreOperationsRepository(db, clock);
  }

  /** Enqueue only while the source and an execution policy are current. */
  async enqueueCurrent(input: Omit<OperationalNoticeFanoutInput,
    "policyBinding">) {
    const frozen = structuredClone(input);
    return transact(this.db, async (tx) => {
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < 0 ||
          now >= frozen.source.validUntil) {
        return {kind: "held" as const, reason: "sourceChanged" as const};
      }
      const authority = await readOperationalNoticeFanoutAuthority(this.db,
        tx, frozen, null, now);
      if (authority.kind !== "ready") return authority;
      const proposed = newOperationalNoticeFanoutRecords({...frozen,
        policyBinding: authority.binding}, now);
      const runRef = this.db.collection(operationCollections.runs)
        .doc(proposed.run.runId);
      const itemRef = this.db.collection(operationCollections.workItems)
        .doc(proposed.item.workItemId);
      const [run, item] = await tx.getAll(runRef, itemRef);
      if (run.exists || item.exists) {
        const existing = readOperationalNoticeFanoutRecords(run.data(),
          item.data(), itemRef.id, now);
        if (operationContentHash(operationalNoticeFanoutBasis(
          existing.payload)) !== operationContentHash(
          operationalNoticeFanoutBasis(proposed.payload))) throw invalidWork();
        return {...existing, kind: "queued" as const, replayed: true};
      }
      const committedAt = this.clock();
      if (!Number.isSafeInteger(committedAt) || committedAt < now ||
          committedAt >= proposed.payload.expiresAt) throw invalidWork();
      const current = await readOperationalNoticeFanoutAuthority(this.db, tx,
        frozen, authority.binding, committedAt);
      if (current.kind !== "ready") return current;
      stageRunAndWorkItemCreate(this.db, tx, proposed);
      return {...proposed, kind: "queued" as const, replayed: false};
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
      .where("normalizedPayload.kind", "==", "operationalNoticeFanout")
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

  private async nextPage(payload: Fanout, lease: OperationLease) {
    if (this.clock() >= payload.expiresAt) return expired(payload);
    const authority = await transact(this.db, (tx) =>
      readOperationalNoticeFanoutAuthority(this.db, tx, payload,
        payload.policyBinding, this.clock()));
    if (authority.kind !== "ready") {
      return stopped(payload, authority.reason);
    }
    const phase = payload.checkpoint.phase;
    if (phase !== "scan" && phase !== "retry") throw invalidWork();
    let published = 0;
    let skipped = 0;
    const checkpoint = await advanceFanoutPage({...payload.checkpoint, phase},
      payload.expiresAt, this.clock, {
        list: (cursor, limit) => this.targets(payload, cursor, limit),
        visit: async (id) => {
          const outcome = await this.visit(id, payload, lease);
          if (outcome === "published") published += 1;
          if (outcome === "skipped") skipped += 1;
          return outcome === "unavailable" ?
            {attendeeId: id, reason: "unavailable" as const} : null;
        },
        failureId: (failure) => failure.attendeeId,
      });
    return {...payload, checkpoint: {...checkpoint,
      published: payload.checkpoint.published + published,
      skipped: payload.checkpoint.skipped + skipped, stopReason: null}};
  }

  private async visit(attendeeId: string, payload: Fanout,
    lease: OperationLease): Promise<"published" | "skipped" | "unavailable"> {
    if (this.clock() >= Math.min(Date.parse(lease.expiresAt),
      payload.expiresAt)) {
      throw new Error("Operational notice fanout window expired");
    }
    try {
      requireDocumentId(attendeeId);
      const enrollment = await ensureCurrentGuestEnrollment(this.db,
        payload.context, attendeeId, this.clock);
      if (enrollment.kind === "held") return "skipped";
      const request = {context: payload.context, attendeeId,
        episodeId: enrollment.guest.episodeId,
        policyBinding: {groupId: payload.policyBinding.groupId,
          settingId: payload.policyBinding.settingId,
          expectedRevision: payload.policyBinding.settingRevision}};
      const result = payload.source.kind === "planChange" ?
        await new OperationalNoticePublisher(this.db,
          new EventPlanChangeSourceReader(), this.clock).publish({...request,
          source: {kind: "planChange", sourceId: payload.source.sourceId,
            expectedRevision: payload.source.revision}}) :
        await new OperationalNoticePublisher(this.db,
          new PostEventFollowUpSourceReader(), this.clock).publish({...request,
          source: {kind: "followUp", sourceId: payload.source.sourceId,
            expectedRevision: payload.source.revision}});
      if (result.kind === "published" || result.kind === "replayed" ||
          result.reason === "sourceAlreadyPublished") return "published";
      if (result.reason === "sourceUnavailable" ||
          result.reason === "quotaReached") return "skipped";
      return "unavailable";
    } catch {
      return "unavailable";
    }
  }

  private async targets(payload: Fanout, cursor: string | null,
    limit: number) {
    let query = this.db.collection("eventAttendees")
      .where("eventId", "==", payload.context.eventId)
      .orderBy(FieldPath.documentId());
    if (cursor !== null) query = query.startAfter(cursor);
    return (await query.limit(limit).get()).docs.map((doc) => doc.id);
  }

  private async checkpoint(previous: Records, payload: Fanout,
    lease: OperationLease) {
    return transact(this.db, async (tx) => {
      const current = await this.read(tx, previous.item.workItemId);
      if (current.item.revision !== previous.item.revision ||
          operationContentHash(current) !== operationContentHash(previous)) {
        throw new Error("Operational notice fanout checkpoint changed");
      }
      const now = this.clock();
      if (now >= payload.expiresAt) payload = expired(payload);
      if (now < payload.expiresAt) {
        const authority = await readOperationalNoticeFanoutAuthority(this.db,
          tx, payload, payload.policyBinding, now);
        if (authority.kind !== "ready") {
          payload = stopped(payload, authority.reason);
        }
      }
      const at = new Date(now).toISOString();
      const p = operationalNoticeFanoutProjection(payload);
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
          published: payload.checkpoint.published,
          failed: payload.checkpoint.failures.length,
          escalated: Number(p.primaryStage === "host_review")}};
      const next = readOperationalNoticeFanoutRecords(run, item,
        item.workItemId, now);
      const key = "page:" + current.item.revision;
      const receipt: OperationActionReceipt = {schemaVersion: 1,
        actionId: operationActionId(run.runId, item.workItemId, key),
        runId: run.runId, workItemId: item.workItemId, sequence: revision,
        operation: "operational_notice_fanout_page", status: "succeeded",
        fromRevision: current.item.revision, toRevision: revision,
        actor: {actorType: "system",
          actorId: "event-assistance-notice-worker"},
        idempotencyKey: key, inputHash: operationContentHash(current.item),
        outputHash: operationContentHash(item),
        rulesetVersion: OPERATIONAL_NOTICE_FANOUT_RUNTIME,
        modelVersion: null,
        reasonCodes: p.blockerCodes.length ? p.blockerCodes :
          ["notice_fanout_" + payload.checkpoint.phase],
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
    return readOperationalNoticeFanoutRecords(run, item, workItemId,
      this.clock());
  }

  private async acquire(workItemId: string): Promise<OperationLease | null> {
    const now = this.clock();
    try {
      return await this.operations.acquireLease({
        leaseId: operationResourceLeaseId("work_item", workItemId),
        resourceId: workItemId, resourceType: "work_item",
        ownerId: "notice-worker:" + randomUUID(),
        idempotencyKey: randomUUID(),
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 60_000).toISOString()});
    } catch (error) {
      if (errorCode(error) === "lease_conflict") return null;
      throw error;
    }
  }
}

function expired(payload: Fanout): Fanout {
  return {...payload, checkpoint: {...payload.checkpoint,
    phase: "expired", dueAt: null, stopReason: null}};
}

function stopped(payload: Fanout,
  reason: NonNullable<Fanout["checkpoint"]["stopReason"]>): Fanout {
  return {...payload, checkpoint: {...payload.checkpoint,
    phase: "stopped", dueAt: null, stopReason: reason}};
}
