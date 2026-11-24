import {
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {runAssistanceTransaction as transact} from
  "../platform/transactionCallback";
import {catchWithdrewAllWhatsapp, contactPermissionRef,
  readContactPermission} from "../shared/contactPermissions";
import {
  authorizeCatchReply,
  assertCatchReplyEnabled,
  catchEndpointHash,
  catchReplyHash,
  catchReplyId,
  catchStopId,
  CATCH_SUPPORT_WINDOW_MS,
  parseCatchReplyInput,
  safeMillis,
  validProviderId,
} from "./whatsappReply";
import type {
  CatchGetUser,
  CatchReplyConfig,
  CatchReplyInput,
  CatchReplyOperation,
} from "./whatsappReply";

import {validateCatchWhatsappReplyOperationDocument} from
  "../shared/generated/validators/catchWhatsappReplyOperationDocument";
import {validateCatchWhatsappReplyReadinessDocument} from
  "../shared/generated/validators/catchWhatsappReplyReadinessDocument";
import {adminRolesFromToken} from "../platform/adminAuth";
import {assertCatchIngressAccepted} from "./whatsappIngressStore";
import {assertCatchAuthorityBinding} from "./whatsappAppAuthority";
import type {
  CatchAppAuthorityStore,
  CatchAuditedAuthFence,
  CatchFreshAuthContext,
} from "./whatsappAppAuthorityStore";

export const CATCH_REPLY_READINESS = "catchWhatsappReplyReadiness";
export const catchReadinessId = (config: CatchReplyConfig): string =>
  "cwready_" +
  catchReplyHash([
    config.wabaId,
    config.phoneNumberId,
    catchEndpointHash(config.recipientE164),
  ]);

export const CATCH_REPLY_OPERATIONS = "catchWhatsappReplyOperations";
export {
  CATCH_ENDPOINT_STOPS,
  CATCH_RECEIPTS,
  readCatchReceipt,
  persistCatchStopReceipt,
} from "./whatsappEndpointStops";
import {
  CATCH_ENDPOINT_STOPS,
  CATCH_RECEIPTS,
  readCatchReceipt,
  isCatchStopReceipt,
} from "./whatsappEndpointStops";

/** Canonical shape validation with domain relational invariants. */
export function readCatchOperation(value: unknown): CatchReplyOperation {
  if (
    !validateCatchWhatsappReplyOperationDocument(value) ||
    value.operationId !== catchReplyId(value, value.inboundMessageId) ||
    value.updatedAtMillis < value.createdAtMillis ||
    value.reviewedAtMillis !== value.createdAtMillis ||
    value.deadlineMillis <= value.createdAtMillis
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Invalid Catch reply record.",
    );
  }
  return value;
}
export class CatchWhatsappReplyStore {
  constructor(
    readonly db: Firestore,
    private readonly deps: {
      config: () => CatchReplyConfig;
      getUser: CatchGetUser;
      now: () => number;
      authority?: CatchAppAuthorityStore;
    },
  ) {}

  async claim(
    request: CallableRequest<unknown>,
    input: CatchReplyInput,
    expectedConfig: CatchReplyConfig,
  ): Promise<{
    operation: CatchReplyOperation;
    replayed: boolean;
  }> {
    input = parseCatchReplyInput(input);
    return this.runForReply(request, expectedConfig, async (tx, fence) => {
      const config = {...this.deps.config()};
      assertCatchReplyEnabled(config);
      if (catchReplyHash(config) !== catchReplyHash(expectedConfig)) {
        throw new HttpsError("aborted", "Controlled reply scope changed.");
      }
      await authorizeCatchReply(request, config, this.deps.getUser);
      const now = this.deps.now();
      if (!safeMillis(now)) throw new Error("Invalid reply clock");
      const {inbound, bindings, eligibleUntilMillis} =
        await this.readEligibleInbound(
          tx,
          request,
          input.inboundEventId,
          config,
          now,
          fence,
        );
      if (catchReplyHash(inbound.text) !== input.reviewedInboundTextHash) {
        throw new HttpsError(
          "failed-precondition",
          "Inbound review changed.",
        );
      }
      const occurredAt = Number(inbound.providerTimestampSeconds) * 1000;
      const endpointHash = catchEndpointHash(config.recipientE164);
      const operationId = catchReplyId(config, inbound.messageId);
      const operationRef = this.db
        .collection(CATCH_REPLY_OPERATIONS)
        .doc(operationId);
      const existing = await tx.get(operationRef);
      // Recheck external Auth before the final clock and all domain deadlines.
      // There are no awaits between those checks and the staged claim write.
      if ("recheck" in fence && typeof fence.recheck === "function") {
        await (fence as CatchFreshAuthContext).recheck();
      }
      const finalNow = this.deps.now();
      if (
        !safeMillis(finalNow) ||
        finalNow < now ||
        finalNow >= eligibleUntilMillis
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Current Catch eligibility expired.",
        );
      }
      const materialHash = catchReplyHash([
        config.wabaId,
        config.phoneNumberId,
        config.recipientUid,
        endpointHash,
        config.actorUid,
        config.readinessEvidenceHash,
        bindings,
        input,
      ]);
      if (existing.exists) {
        const operation = readCatchOperation(existing.data());
        if (
          operation.operationId !== operationId ||
          operation.materialHash !== materialHash
        ) {
          throw new HttpsError(
            "already-exists",
            "Inbound reply already claimed.",
          );
        }
        if (operation.state !== "completed") {
          throw new HttpsError(
            "failed-precondition",
            "Reply attempt consumed.",
          );
        }
        return {operation, replayed: true};
      }
      const deadlineMillis = occurredAt + CATCH_SUPPORT_WINDOW_MS;
      if (!safeMillis(deadlineMillis) || finalNow >= deadlineMillis) {
        throw new HttpsError(
          "failed-precondition",
          "Support reply window closed.",
        );
      }
      const operation = readCatchOperation({
        schemaVersion: 1,
        operationId,
        purpose: "serviceSupport",
        source: "reviewedInboundSupportRequest",
        wabaId: config.wabaId,
        phoneNumberId: config.phoneNumberId,
        recipientUid: config.recipientUid,
        endpointHash,
        actorUid: config.actorUid,
        inboundEventId: inbound.eventId,
        inboundMessageId: inbound.messageId,
        inboundTextHash: input.reviewedInboundTextHash,
        bodyHash: catchReplyHash(input.body),
        materialHash,
        readinessEvidenceHash: config.readinessEvidenceHash,
        appAuthorityBindings: bindings,
        reviewedAtMillis: finalNow,
        deadlineMillis,
        state: "claimed",
        providerMessageId: null,
        deliveryStatus: "pending",
        deliveryEventId: null,
        deliveryAtMillis: null,
        createdAtMillis: finalNow,
        updatedAtMillis: finalNow,
      });
      tx.create(operationRef, operation);
      return {operation, replayed: false};
    });
  }

  async review(
    request: CallableRequest<unknown>,
    inboundEventId: string,
    expectedConfig: CatchReplyConfig,
  ) {
    return this.runForReply(request, expectedConfig, async (tx, fence) => {
      const config = {...this.deps.config()};
      if (catchReplyHash(config) !== catchReplyHash(expectedConfig)) {
        throw new HttpsError("aborted", "Controlled reply scope changed.");
      }
      const now = this.deps.now();
      const {inbound} = await this.readEligibleInbound(
        tx,
        request,
        inboundEventId,
        config,
        now,
        fence,
      );
      const deadlineMillis =
        Number(inbound.providerTimestampSeconds) * 1000 +
        CATCH_SUPPORT_WINDOW_MS;
      if (now >= deadlineMillis) {
        throw new HttpsError(
          "failed-precondition",
          "Support reply window closed.",
        );
      }
      return {
        purpose: "serviceSupport" as const,
        inboundEventId,
        inboundText: inbound.text!,
        reviewedInboundTextHash: catchReplyHash(inbound.text),
        deadlineMillis,
      };
    });
  }

  private async readEligibleInbound(
    tx: Transaction,
    request: CallableRequest<unknown>,
    inboundEventId: string,
    config: CatchReplyConfig,
    now: number,
    fence: CatchAuditedAuthFence,
  ) {
    await authorizeCatchReply(request, config, this.deps.getUser);
    if (!safeMillis(now)) throw new Error("Invalid reply clock");
    const inbound = readCatchReceipt(
      (
        await tx.get(this.db.collection(CATCH_RECEIPTS).doc(inboundEventId))
      ).data(),
    );
    const occurredAt = Number(inbound.providerTimestampSeconds) * 1000;
    if (
      inbound.eventId !== inboundEventId ||
      inbound.eventKind !== "inbound" ||
      inbound.messageType !== "text" ||
      inbound.textTruncated ||
      !inbound.text?.trim() ||
      isCatchStopReceipt(inbound) ||
      inbound.wabaId !== config.wabaId ||
      inbound.phoneNumberId !== config.phoneNumberId ||
      "+" + inbound.participantId !== config.recipientE164 ||
      !safeMillis(occurredAt) ||
      occurredAt > inbound.receivedAtMillis ||
      inbound.receivedAtMillis > now ||
      inbound.expiresAt.toMillis() <= now
    ) {
      throw new HttpsError("failed-precondition", "Inbound review changed.");
    }
    await assertCatchIngressAccepted(tx, this.db, inbound);
    const endpointHash = catchEndpointHash(config.recipientE164);
    const [stop, preference, deleted, readiness] = await Promise.all([
      tx.get(
        this.db
          .collection(CATCH_ENDPOINT_STOPS)
          .doc(catchStopId(config, endpointHash)),
      ),
      tx.get(contactPermissionRef(this.db, config.recipientUid,
        {kind: "catch"})),
      tx.get(this.db.collection("deletedUsers").doc(config.recipientUid)),
      tx.get(
        this.db
          .collection(CATCH_REPLY_READINESS)
          .doc(catchReadinessId(config)),
      ),
    ]);
    if (stop.exists || deleted.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Catch replies suppressed.",
      );
    }
    if (preference.exists) {
      const value = readContactPermission(preference.data(),
        {kind: "catch"});
      if (
        !value ||
        await catchWithdrewAllWhatsapp((ref) => tx.get(ref), this.db, value)
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Catch replies suppressed.",
        );
      }
    }
    const proof = readiness.data();
    if (
      !validateCatchWhatsappReplyReadinessDocument(proof) ||
      proof.readinessId !== catchReadinessId(config) ||
      proof.wabaId !== config.wabaId ||
      proof.phoneNumberId !== config.phoneNumberId ||
      proof.recipientUid !== config.recipientUid ||
      proof.endpointHash !== endpointHash ||
      proof.state !== "ready" ||
      proof.evidenceSha256 !== config.readinessEvidenceHash ||
      proof.atomicIngressStartedAtMillis > inbound.receivedAtMillis ||
      proof.coveredThroughMillis < proof.atomicIngressStartedAtMillis ||
      proof.coveredThroughMillis > proof.reviewedAtMillis ||
      proof.reviewedAtMillis > now ||
      proof.expiresAtMillis <= now ||
      proof.expiresAtMillis <= proof.reviewedAtMillis ||
      proof.expiresAtMillis - proof.reviewedAtMillis > CATCH_SUPPORT_WINDOW_MS
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Catch reply readiness required.",
      );
    }
    const reviewer = await this.deps.getUser(proof.reviewedByUid);
    if (
      reviewer.disabled ||
      !adminRolesFromToken(reviewer.customClaims).includes("adminOwner")
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Current readiness owner required.",
      );
    }
    const authorization = this.deps.authority;
    if (!authorization || !proof.appAuthorityBindings) {
      throw new HttpsError(
        "failed-precondition",
        "Current Catch authority is required.",
      );
    }
    const header = request.rawRequest?.header("authorization");
    if (typeof header !== "string" || !/^Bearer [^\s]+$/u.test(header)) {
      throw new HttpsError(
        "unauthenticated",
        "Current Catch session is required.",
      );
    }
    const {bindings, expiresAtMillis} =
      await authorization.replyAuthorization(
        tx,
        fence,
        {
          actorUid: config.actorUid,
          reviewerUid: proof.reviewedByUid,
          recipientUid: config.recipientUid,
          endpointHash,
        },
        header.slice(7),
      );
    assertCatchAuthorityBinding(
      bindings.reviewer,
      proof.appAuthorityBindings.reviewer,
    );
    assertCatchAuthorityBinding(
      bindings.recipient,
      proof.appAuthorityBindings.recipient,
    );
    authorization.assertFence(fence, [
      config.actorUid,
      proof.reviewedByUid,
      config.recipientUid,
    ]);
    const finalNow = this.deps.now();
    if (
      !safeMillis(finalNow) ||
      finalNow < now ||
      expiresAtMillis <= finalNow ||
      proof.expiresAtMillis <= finalNow ||
      inbound.expiresAt.toMillis() <= finalNow ||
      occurredAt + CATCH_SUPPORT_WINDOW_MS <= finalNow
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Current Catch eligibility expired.",
      );
    }
    return {
      inbound,
      bindings,
      eligibleUntilMillis: Math.min(
        expiresAtMillis,
        proof.expiresAtMillis,
        inbound.expiresAt.toMillis(),
        occurredAt + CATCH_SUPPORT_WINDOW_MS,
      ),
    };
  }

  private async runForReply<T>(
    request: CallableRequest<unknown>,
    config: CatchReplyConfig,
    callback: (tx: Transaction, fence: CatchAuditedAuthFence) => Promise<T>,
  ): Promise<T> {
    await authorizeCatchReply(request, config, this.deps.getUser);
    const authority = this.deps.authority;
    if (!authority || authority.db !== this.db) {
      throw new HttpsError(
        "failed-precondition",
        "Current Catch authority is unavailable.",
      );
    }
    // This bounded read determines fence scope only. Eligibility rereads and
    // binds the actual readiness in the same transaction as a new send claim.
    const scope = (
      await this.db
        .collection(CATCH_REPLY_READINESS)
        .doc(catchReadinessId(config))
        .get()
    ).data();
    if (
      !validateCatchWhatsappReplyReadinessDocument(scope) ||
      scope.readinessId !== catchReadinessId(config)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Catch reply readiness is required.",
      );
    }
    const header = request.rawRequest?.header("authorization");
    if (typeof header !== "string" || !/^Bearer [^\s]+$/u.test(header)) {
      throw new HttpsError(
        "unauthenticated",
        "Current Catch session is required.",
      );
    }
    // A current reviewer session cannot be inferred from a saved approval.
    // The callable can prove it only when the signed-in actor is that owner.
    if (
      authority.deps.withFreshAuthContext &&
      scope.reviewedByUid !== config.actorUid
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Current readiness owner session is required.",
      );
    }
    return authority.runFenced(
      [config.actorUid, config.recipientUid, scope.reviewedByUid],
      callback,
      {uid: config.actorUid, idToken: header.slice(7)},
    );
  }

  /**
   * Gate before credential preparation; final claim repeats it after that
   * await.
   */
  async preflight(
    request: CallableRequest<unknown>,
    input: CatchReplyInput,
    expectedConfig: CatchReplyConfig,
  ): Promise<void> {
    const review = await this.review(
      request,
      input.inboundEventId,
      expectedConfig,
    );
    if (review.reviewedInboundTextHash !== input.reviewedInboundTextHash) {
      throw new HttpsError("failed-precondition", "Inbound review changed.");
    }
  }

  async complete(
    claim: CatchReplyOperation,
    providerMessageId: string,
  ): Promise<CatchReplyOperation> {
    if (!validProviderId(providerMessageId)) {
      throw new Error("Invalid message id");
    }
    return transact(this.db, async (tx) => {
      const ref = this.db
        .collection(CATCH_REPLY_OPERATIONS)
        .doc(claim.operationId);
      const current = readCatchOperation((await tx.get(ref)).data());
      if (
        current.materialHash !== claim.materialHash ||
        current.operationId !== claim.operationId ||
        current.state === "unknown" ||
        (current.providerMessageId !== null &&
          current.providerMessageId !== providerMessageId)
      ) {
        throw new Error("Reply claim changed");
      }
      if (current.state === "completed") return current;
      const next = readCatchOperation({
        ...current,
        state: "completed",
        providerMessageId,
        deliveryStatus: "accepted",
        updatedAtMillis: this.deps.now(),
      });
      tx.update(ref, {
        state: next.state,
        providerMessageId,
        deliveryStatus: next.deliveryStatus,
        updatedAtMillis: next.updatedAtMillis,
      });
      return next;
    });
  }

  async markUnknown(claim: CatchReplyOperation): Promise<void> {
    await transact(this.db, async (tx) => {
      const ref = this.db
        .collection(CATCH_REPLY_OPERATIONS)
        .doc(claim.operationId);
      const current = readCatchOperation((await tx.get(ref)).data());
      if (
        current.operationId !== claim.operationId ||
        current.materialHash !== claim.materialHash
      ) {
        throw new Error("Reply claim changed");
      }
      if (current.state !== "claimed") return;
      const next = readCatchOperation({
        ...current,
        state: "unknown",
        updatedAtMillis: this.deps.now(),
      });
      tx.update(ref, {
        state: next.state,
        updatedAtMillis: next.updatedAtMillis,
      });
    });
  }
}
