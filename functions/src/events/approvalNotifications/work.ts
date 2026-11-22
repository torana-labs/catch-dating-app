import {validateEventApprovalNotificationWork as validPayload} from
  "../../shared/generated/validators/eventApprovalNotificationWork";
import {randomUUID} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {operationCollections as collections} from
  "../../operations/collections";
import {
  operationActionId,
  operationContentHash as hash,
} from "../../operations/durableActions";
import {FirestoreOperationsRepository} from
  "../../operations/firestoreRepository";
import {operationResourceLeaseId} from
  "../../operations/firestoreLeaseRepository";
import type {
  OperationRun,
  OperationWorkItem,
  OperationActionReceipt,
} from "../../operations/models";
import {
  validateOperationRun,
  validateOperationWorkItem,
} from "../../operations/validation";
import {
  stageRunAndWorkItemCreate,
  stageRunSet,
} from "../../operations/transactionalWrites";
import {
  messages,
  newMessage,
  parseMessage,
  timestampMillis,
  type Intent,
  type Message,
} from "./model";
import {readApplication} from "./source";
import {ApprovalNotificationWorker, type Execution} from "./worker";
const workflowId = "event_approval_notifications";
const version = "event-approval-notifications/v1";
const ids = (id: string) => ({
  runId: "run:approval:" + hash(id),
  workItemId: "work:approval:" + hash(id),
});
function newWork(message: Message): {
  run: OperationRun;
  item: OperationWorkItem;
} {
  const id = ids(message.messageId);
  const at = new Date(message.createdAt).toISOString();
  const basis = hash(message.intent);
  const run: OperationRun = {
    schemaVersion: 1,
    runId: id.runId,
    workflowId,
    revision: 0,
    mode: "autonomous",
    status: "running",
    scope: {eventId: message.intent.context.eventId},
    rulesetVersion: version,
    policyVersion: version,
    inputHash: basis,
    budgets: {
      maxWorkItems: 1,
      maxModelCalls: 0,
      maxModelTokens: 0,
      maxCostMicros: 0,
      deadlineAt: null,
    },
    counters: {
      discovered: 1,
      processed: 0,
      modelCalls: 0,
      modelTokens: 0,
      costMicros: 0,
      escalated: 0,
      published: 0,
      failed: 0,
    },
    checkpoint: {lastSequence: 0, cursor: null},
    createdAt: at,
    updatedAt: at,
    startedAt: at,
    finishedAt: null,
    failure: null,
    metadata: {runtime: version},
  };
  const item: OperationWorkItem = {
    schemaVersion: 1,
    ...id,
    workflowId,
    entityKind: "message_delivery",
    externalKey: message.messageId,
    revision: 0,
    candidateHash: basis,
    primaryStage: "delivery",
    lifecycleStatus: "waiting",
    outcome: null,
    taskFlags: [],
    blockerCodes: [],
    warningCodes: [],
    priority: 0,
    attemptCount: 0,
    evidenceRefs: [],
    fieldProvenance: [],
    normalizedPayload: {
      kind: "approvalNotification",
      messageId: message.messageId,
      intentHash: basis,
      dueAt: message.createdAt,
      evaluations: 0,
      failures: 0,
      lastMessageRevision: -1,
    },
    decisionId: null,
    publicationPlanId: null,
    createdAt: at,
    updatedAt: at,
    staleAt: null,
    expiresAt: new Date(message.intent.expiresAt).toISOString(),
  };
  if (
    !validateOperationRun(run).ok ||
    !validateOperationWorkItem(item).ok ||
    !validPayload(item.normalizedPayload)
  ) {
    throw new Error("Invalid approval work");
  }
  return {run, item};
}
/** The trigger snapshot is only a wake. Read current ownership and approval.
 * Both independent channel obligations and their Operations jobs mint once. */
export async function enqueueApproval(
  db: Firestore,
  applicationId: string,
  uid: string,
  eventId: string,
  now = Date.now(),
): Promise<string[]> {
  return db.runTransaction(async (tx) => {
    const source = await readApplication(
      db,
      tx,
      applicationId,
      uid,
      eventId,
      now,
    );
    const a = source?.application;
    const basis = a?.approvalNotificationBasis;
    if (
      !source ||
      !a ||
      a.reviewStatus !== "approved" ||
      !basis ||
      basis.approvedAtMillis > now
    ) {
      return [];
    }
    const expiresAt = Math.min(
      timestampMillis(source.event.startTime),
      basis.approvedAtMillis + 48 * 3_600_000,
    );
    if (expiresAt <= now) return [];
    const context: Intent["context"] = {
      mode: "live",
      applicationId,
      organizerId: a.organizerId,
      eventId,
      uid,
      sourceResponseId: a.latestResponseId,
      approvedAtMillis: basis.approvedAtMillis,
      approvalRevision: basis.revision,
    };
    const proposed = (["phone", "email"] as const).map((lane) => {
      const intent: Intent = {
        schemaVersion: 1,
        intentId: "eai_" + hash([context, lane]),
        revision: 1,
        context,
        createdAt: basis.approvedAtMillis,
        expiresAt,
        lane,
        permittedRoutes:
          lane === "phone" ?
            ["approvalWhatsapp", "approvalSms"] :
            ["approvalEmail"],
        deliveryPolicy: {
          maxAttempts: 3,
          maxAttemptsPerRoute: 1,
          minimumRetrySeconds: 60,
        },
      };
      const message = newMessage(intent, now);
      const work = newWork(message);
      return {message, ...work};
    });
    const snapshots = await Promise.all(
      proposed.map(async ({message, run, item}) =>
        Promise.all([
          tx.get(db.collection(messages).doc(message.messageId)),
          tx.get(db.collection(collections.runs).doc(run.runId)),
          tx.get(db.collection(collections.workItems).doc(item.workItemId)),
        ]),
      ),
    );
    proposed.forEach(({message, run, item}, index) => {
      const [old, oldRun, oldItem] = snapshots[index];
      if (old.exists || oldRun.exists || oldItem.exists) {
        if (
          !old.exists ||
          !oldRun.exists ||
          !oldItem.exists ||
          hash(parseMessage(old.data()).intent) !== hash(message.intent) ||
          oldRun.data()?.inputHash !== run.inputHash ||
          oldItem.data()?.candidateHash !== item.candidateHash ||
          oldItem.data()?.workflowId !== workflowId
        ) {
          throw new Error("Incomplete approval delivery ownership");
        }
        return;
      }
      tx.create(db.collection(messages).doc(message.messageId), message);
      stageRunAndWorkItemCreate(db, tx, {run, item});
    });
    return proposed.map(({message}) => message.messageId);
  });
}
export class ApprovalNotificationWork {
  private readonly operations: FirestoreOperationsRepository;
  constructor(
    private readonly db: Firestore,
    private readonly worker: Pick<
      ApprovalNotificationWorker,
      "dispatch"
    > = new ApprovalNotificationWorker(db),
    private readonly now: () => number = Date.now,
  ) {
    this.operations = new FirestoreOperationsRepository(db, now);
  }
  async processMessage(messageId: string, wake = false) {
    const {workItemId} = ids(messageId);
    const initial = await this.operations.getWorkItem(workItemId);
    if (
      !initial ||
      initial.lifecycleStatus === "terminal" ||
      (!wake && Number(initial.normalizedPayload.dueAt) > this.now())
    ) {
      return;
    }
    const at = this.now();
    let lease;
    try {
      lease = await this.operations.acquireLease({
        leaseId: operationResourceLeaseId("work_item", workItemId),
        resourceId: workItemId,
        resourceType: "work_item",
        ownerId: "approval-worker:" + randomUUID(),
        idempotencyKey: randomUUID(),
        acquiredAt: new Date(at).toISOString(),
        expiresAt: new Date(at + 60_000).toISOString(),
      });
    } catch (error) {
      if ((error as {code?: string}).code === "lease_conflict") return;
      throw error;
    }
    try {
      const current = await this.operations.getWorkItem(workItemId);
      if (!current || current.lifecycleStatus === "terminal") return;
      const payload = current.normalizedPayload;
      if (!validPayload(payload)) {
        throw new Error("Invalid approval checkpoint");
      }
      const message = parseMessage(
        (await this.db.collection(messages).doc(messageId).get()).data(),
      );
      if (
        current.workflowId !== workflowId ||
        current.externalKey !== messageId ||
        current.candidateHash !== hash(message.intent) ||
        payload.intentHash !== hash(message.intent)
      ) {
        throw new Error("Approval work binding changed");
      }
      const evaluations = Number(payload.evaluations);
      let result: Execution;
      if (this.now() >= message.intent.expiresAt) {
        result = {status: "complete", reason: "expired"};
      } else if (evaluations >= 100) {
        result = {status: "review", reason: "evaluationLimit"};
      } else {
        try {
          result = await this.worker.dispatch(messageId);
        } catch {
          result = {status: "waiting", reason: "workerUnavailable"};
        }
      }
      const observed = parseMessage(
        (await this.db.collection(messages).doc(messageId).get()).data(),
      );
      // Receipt evidence wins over an execution/checkpoint interruption.
      if (
        observed.attempts.some((a) =>
          ["delivered", "read"].includes(a.state.kind),
        )
      ) {
        result = {status: "complete", reason: "delivered"};
      }
      const failures =
        result.reason === "workerUnavailable" ?
          Number(payload.failures) + 1 :
          0;
      if (failures >= 5) {
        result = {status: "review", reason: "workerUnavailable"};
      }
      if (
        [
          "permissionUnavailable",
          "senderUnavailable",
          "noEligibleRoute",
        ].includes(result.reason)
      ) {
        result = {...result, status: "review"};
      }
      if (
        result.status === "pending" &&
        current.primaryStage === "host_review" &&
        payload.lastMessageRevision === observed.revision &&
        current.blockerCodes.includes("provider_pending")
      ) {
        result = {status: "review", reason: "providerPending"};
      }
      if (
        result.status === "pending" &&
        payload.lastMessageRevision === observed.revision &&
        current.primaryStage === "awaiting_receipt" &&
        Number(payload.dueAt) <= this.now()
      ) {
        result = {status: "review", reason: "providerPending"};
      }
      const code = result.reason.replace(
        /[A-Z]/g,
        (letter) => "_" + letter.toLowerCase(),
      );
      const terminal = result.status === "complete";
      const review = result.status === "review";
      const now = this.now();
      const updatedAt = new Date(now).toISOString();
      const dueAt = terminal ?
        null :
        review ?
          message.intent.expiresAt :
          Math.min(
            message.intent.expiresAt,
            Math.max(
              now + (result.status === "pending" ? 120_000 : 60_000),
              result.dueAt ?? 0,
            ),
          );
      const item: OperationWorkItem = {
        ...current,
        revision: current.revision + 1,
        primaryStage: terminal ?
          "finished" :
          review ?
            "host_review" :
            result.status === "pending" ?
              "awaiting_receipt" :
              "delivery",
        lifecycleStatus: terminal ? "terminal" : "waiting",
        outcome: terminal ? code : null,
        taskFlags: review ? ["human_review_required"] : [],
        blockerCodes: review ? [code] : [],
        attemptCount: current.attemptCount + 1,
        normalizedPayload: {
          ...payload,
          dueAt,
          evaluations: evaluations + 1,
          failures,
          lastMessageRevision: observed.revision,
          reason: result.reason,
        },
        updatedAt,
      };
      const key = "checkpoint:" + current.revision;
      const receipt: OperationActionReceipt = {
        schemaVersion: 1,
        actionId: operationActionId(item.runId, workItemId, key),
        runId: item.runId,
        workItemId,
        sequence: item.revision,
        operation: "approval_notification_checkpoint",
        status: "succeeded",
        fromRevision: current.revision,
        toRevision: item.revision,
        actor: {
          actorType: "system",
          actorId: "approval-notification-worker",
        },
        idempotencyKey: key,
        inputHash: hash(current),
        outputHash: hash(item),
        rulesetVersion: version,
        modelVersion: null,
        reasonCodes: [code],
        occurredAt: updatedAt,
        completedAt: updatedAt,
        failure: null,
      };
      await this.db.runTransaction(async (tx) => {
        const runRef = this.db.collection(collections.runs).doc(item.runId);
        const parsed = validateOperationRun((await tx.get(runRef)).data());
        if (!parsed.ok || parsed.value.runId !== item.runId) {
          throw new Error("Approval run unavailable");
        }
        const prepared = await this.operations.prepareWorkItemAction(tx, {
          workItem: item,
          receipt,
          lease,
        });
        prepared.commit();
        stageRunSet(this.db, tx, {
          ...parsed.value,
          revision: item.revision,
          updatedAt,
          status: terminal ? "completed" : "running",
          finishedAt: terminal ? updatedAt : null,
          counters: {
            ...parsed.value.counters,
            processed: 1,
            failed: failures,
            escalated: Number(review),
          },
          checkpoint: {lastSequence: item.revision, cursor: null},
        });
      });
    } finally {
      try {
        await this.operations.releaseLease({
          ...lease,
          releasedAt: new Date(this.now()).toISOString(),
        });
      } catch {
        // Expired lease recovery is owned by the same shared lease repository.
      }
    }
  }
  async processDue() {
    const rows = await this.db
      .collection(collections.workItems)
      .where("workflowId", "==", workflowId)
      .where("normalizedPayload.dueAt", ">=", 0)
      .where("normalizedPayload.dueAt", "<=", this.now())
      .orderBy("normalizedPayload.dueAt")
      .limit(10)
      .get();
    const results = await Promise.allSettled(
      rows.docs.map((row) =>
        this.processMessage(String(row.data().externalKey)),
      ),
    );
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("Approval notification work needs retry");
    }
  }
}
