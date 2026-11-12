import {WHATSAPP_DISPATCHES} from "../../delivery/whatsappDispatches";
import type {Firestore} from "firebase-admin/firestore";
import {FirestoreDeliveryOutbox} from "../../delivery/firestoreDeliveryOutbox";
import {operationContentHash as hash} from "../../operations/durableActions";
import {hashEndpoint} from "../../organizers/organizerCampaignModel";
import {validateEventApprovalNotificationDispatchDocument as validDispatch} from
  "../../shared/generated/validators/eventApprovalNotificationDispatchDocument";
import {
  adapter,
  messages,
  eventUrl,
  parseMessage,
  type Intent,
  type Attempt,
  type Message,
  type Binding,
} from "./model";
import {
  readFacts,
  snapshotHash,
  templateHash,
  type Snapshot,
} from "./facts";
import {loadIdentity, type LoadIdentity} from "./source";
import {prepareBudget} from "./budget";
import {
  ApprovalNotificationTransports,
  type PrepareTransport,
} from "./transports";
export type Outbox = FirestoreDeliveryOutbox<
  Intent["context"],
  Binding,
  Intent,
  Attempt,
  Message
>;
export const dispatches = WHATSAPP_DISPATCHES;
export interface Execution {
  status: "waiting" | "pending" | "review" | "complete";
  reason: string;
  dueAt?: number;
}
export class ApprovalNotificationWorker {
  constructor(
    private readonly db: Firestore,
    private readonly identity: LoadIdentity = loadIdentity,
    private readonly prepare: PrepareTransport =
    new ApprovalNotificationTransports()
      .prepare,
    private readonly now: () => number = Date.now,
  ) {}
  async dispatch(messageId: string): Promise<Execution> {
    let snapshot: Snapshot | null = null;
    const outbox: Outbox = new FirestoreDeliveryOutbox(
      this.db,
      adapter,
      async (tx, intent, at) => {
        const result = await readFacts(
          this.db,
          tx,
          intent,
          at,
          this.identity,
        );
        snapshot = result.snapshot;
        const record = parseMessage(
          (
            await tx.get(this.db.collection(messages).doc(messageId))
          ).data(),
        );
        // SMS is a fallback only after confirmed technical WhatsApp failure.
        // Missing credentials, timeouts and a pending send never grant it.
        const failedWhatsapp = record.attempts.some(
          (attempt) =>
            attempt.binding.routeId === "approvalWhatsapp" &&
            attempt.state.kind === "failed" &&
            attempt.state.classification === "technical",
        );
        return {
          ...result.facts,
          routes: result.facts.routes.map((route) =>
            route.routeId === "approvalSms" && !failedWhatsapp ?
              {
                ...route,
                state: {
                  kind: "blocked" as const,
                  reason: "whatsappFailureRequired",
                },
              } :
              route,
          ),
        };
      },
      this.now,
    );
    const reserved = await outbox.reserve(messageId);
    const decision = reserved.decision;
    if (decision.kind !== "dispatch") {
      if (decision.kind === "delivered") {
        return {status: "complete", reason: "delivered"};
      }
      if (decision.kind === "stop") {
        return {
          status: ["expired", "superseded", "cancelled"].includes(
            decision.reason,
          ) ?
            "complete" :
            "waiting",
          reason: decision.reason,
        };
      }
      if (
        decision.kind === "reconcile" &&
        reserved.record.attempts.some(
          (a) =>
            a.binding.routeId !== "approvalWhatsapp" &&
            a.state.kind === "accepted",
        )
      ) {
        return {status: "complete", reason: "providerAccepted"};
      }
      if (decision.kind === "reconcile") {
        return {
          status: reserved.record.attempts
            .filter((a) => decision.attemptIds.includes(a.attemptId))
            .every((a) => a.state.kind === "reserved") ?
            "waiting" :
            "pending",
          reason: "providerPending",
          dueAt: decision.notBefore,
        };
      }
      if (decision.kind === "wait") {
        return {
          status: "waiting",
          reason: "retryBackoff",
          dueAt: decision.notBefore,
        };
      }
      return {
        status:
          decision.kind === "hostDecision" &&
          decision.reason !== "noEligibleRoute" ?
            "review" :
            "waiting",
        reason:
          decision.kind === "hostDecision" ? decision.reason : "staleFacts",
      };
    }
    const source = snapshot as Snapshot | null;
    const attempt = reserved.record.attempts.at(-1);
    if (!source || !attempt) {
      return {status: "waiting", reason: "sourceUnavailable"};
    }
    const route = attempt.binding.routeId;
    const frozen = snapshotHash(source);
    const transport = await this.prepare(route, source);
    const claim = await outbox.claimLiveDispatch<{
      endpoint: string;
      payloadHash: string;
    }>(messageId, attempt.attemptId, async (tx, record, live, at) => {
      const current = snapshot as Snapshot | null;
      if (!current || snapshotHash(current) !== frozen) {
        return {kind: "withheld"};
      }
      const endpoint =
        route === "approvalEmail" ? current.email : current.phone;
      if (
        !endpoint ||
        !live.binding.recipientEndpointId.endsWith(
          ":" + hashEndpoint(endpoint),
        )
      ) {
        return {kind: "withheld"};
      }
      const debit = await prepareBudget(
        this.db,
        tx,
        current.settings,
        route,
        at,
      );
      if (!debit) return {kind: "withheld"};
      const payloadHash = hash([
        frozen,
        record.intent,
        endpoint,
        eventUrl(record.intent.context.eventId),
      ]);
      const evidenceRef = this.db
        .collection(dispatches)
        .doc(live.attemptId);
      if ((await tx.get(evidenceRef)).exists) return {kind: "withheld"};
      const whatsappProof =
        route === "approvalWhatsapp" ?
          {
            schemaVersion: 1,
            source: "approvalNotification",
            attemptId: live.attemptId,
            messageId,
            context: record.intent.context,
            senderId: live.binding.senderId,
            bindingRevision: live.binding.bindingRevision,
            providerAccountId: current.connection!.wabaId,
            providerPhoneNumberId: current.connection!.phoneNumberId,
            senderHash: frozen,
            recipientEndpointId: live.binding.recipientEndpointId,
            endpointHash: hashEndpoint(endpoint),
            templateDocumentId: current.settings.whatsapp!.templateId,
            templateHash: templateHash(current.template!),
            payloadHash,
            createdAt: at,
          } :
          null;
      if (whatsappProof && !validDispatch(whatsappProof)) {
        throw new Error("Invalid approval dispatch proof");
      }
      return {
        kind: "ready",
        value: {endpoint, payloadHash},
        validUntil: Math.min(at + 30_000, record.intent.expiresAt),
        commit: () => {
          debit();
          if (whatsappProof) tx.create(evidenceRef, whatsappProof);
        },
      };
    });
    if (claim.kind === "withheld") {
      return {
        status:
          claim.reason === "resourceUnavailable" ? "review" : "waiting",
        reason: claim.reason,
      };
    }
    let result;
    try {
      result = await transport.submit({
        intent: claim.permit.intent,
        attemptId: attempt.attemptId,
        endpoint: claim.resource.endpoint,
        deadline: claim.permit.validUntil,
        payloadHash: claim.resource.payloadHash,
      });
    } catch {
      return {status: "pending", reason: "providerUnknown"};
    }
    if (result.kind === "unknown") {
      return {status: "pending", reason: "providerUnknown"};
    }
    if (
      result.kind === "notSent" &&
      this.now() >= claim.permit.validUntil
    ) {
      await outbox.recordExpiredBeforeSend(claim.permit);
      return {status: "waiting", reason: "permitExpired"};
    }
    const at = this.now();
    const state =
      result.kind === "accepted" ?
        {
          kind: "accepted" as const,
          at,
          providerMessageId: result.providerMessageId,
        } :
        {
          kind: "failed" as const,
          at,
          providerMessageId: null,
          classification:
              result.kind === "notSent" ?
                "technical" :
                result.classification,
          evidenceId: "approval-submission:" + attempt.attemptId,
        };
    await outbox.recordReceipt(messageId, {
      attemptId: attempt.attemptId,
      ...claim.permit.attempt.binding,
      providerEventId:
        "approval-submission:" + hash([attempt.attemptId, state]),
      receivedAt: at,
      state,
    });
    return {
      status:
        result.kind === "accepted" ?
          route === "approvalWhatsapp" ?
            "pending" :
            "complete" :
          "waiting",
      reason:
        result.kind === "accepted" ?
          "providerAccepted" :
          "providerRejected",
    };
  }
}
