import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventRcsWithdrawalCallablePayload as Credential} from
  "../../shared/generated/getEventRcsWithdrawalInput";
import type {WithdrawEventRcsCallablePayload as Submission} from
  "../../shared/generated/withdrawEventRcsInput";
import type {EventRcsWithdrawalCallableResponse as Response} from
  "../../shared/generated/eventRcsWithdrawalOutput";
import {operationContentHash} from "../../operations/durableActions";
import {matchesGuestSecret} from "./guestLinkTokens";
import {guestCollections, parseGrant, requireDocumentId, unavailable} from
  "./guestRecords";
import {Permission, parseRcsPermission, parseRcsConsentReceipt,
  rcsConsentCollections, rcsSenderHash} from "./rcsConsent";
import {runAssistanceTransaction} from "../../platform/transactionCallback";
import {WithdrawalGrant, parseRcsWithdrawalGrant, RCS_WITHDRAWAL_GRANTS,
  rcsWithdrawalMatchesPermission} from "./rcsWithdrawalRecords";
import {withdrawalGrantId} from "./messageConsentCollections";

interface Facts {authority: WithdrawalGrant; permission: Permission}

/** A bearer link can only withdraw its original event-service permission. */
export class RcsWithdrawalStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(input: Credential): Promise<Response> {
    return runAssistanceTransaction(this.db, async (tx) => {
      const facts = await this.read(tx, input);
      return {outcome: "read", view: this.view(facts, this.now())};
    });
  }

  async withdraw(input: Submission): Promise<Response> {
    requireDocumentId(input.requestId);
    return runAssistanceTransaction(this.db, async (tx) => {
      const facts = await this.read(tx, input);
      const {permission, authority} = facts;
      const receiptId = "rcs-withdrawal:" + operationContentHash([
        authority.linkId, input.requestId,
      ]);
      // No secret in persisted request material or operational logs.
      const requestHash = operationContentHash([authority.linkId,
        input.requestId, input.expectedRevision, "withdraw"]);
      const receiptRef = this.db.collection(rcsConsentCollections.receipts)
        .doc(receiptId);
      const previous = await tx.get(receiptRef);
      const now = this.now();
      const view = this.view(facts, now);
      if (previous.exists) {
        const receipt = parseRcsConsentReceipt(previous.data());
        if (receipt.receiptId !== receiptId ||
            receipt.source !== "messageLink" ||
            receipt.linkId !== authority.linkId ||
            receipt.requestHash !== requestHash || receipt.createdAt > now) {
          throw new HttpsError("invalid-argument",
            "Use a new RCS withdrawal request.");
        }
        return {outcome: "replayed", view};
      }
      if (permission.revision !== input.expectedRevision) {
        return {outcome: "conflict", view};
      }
      const next = parseRcsPermission({...permission, status: "revoked",
        currentReceiptId: receiptId, revision: permission.revision + 1,
        updatedAt: now});
      const receipt = parseRcsConsentReceipt({schemaVersion: 1,
        channel: "rcs", receiptId,
        requestHash, source: "messageLink", linkId: authority.linkId,
        context: permission.context, attendeeId: permission.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        sourceGeneration: permission.sourceGeneration,
        senderId: permission.senderId,
        senderHash: rcsSenderHash(permission.senderId, permission.sender),
        routeId: "catchEventRcs", actorUid: null,
        recipientEndpointId: permission.recipientEndpointId,
        decision: "revoke", copyVersion: null, copyHash: null,
        reviewHash: null, reviewedStopHash: null,
        appliedRevision: next.revision, createdAt: now,
        permissionHash: operationContentHash(next)});
      tx.create(receiptRef, receipt);
      tx.set(this.db.collection(rcsConsentCollections.permissions)
        .doc(permission.permissionId), next);
      return {outcome: "applied", view: this.view({...facts,
        permission: next}, now)};
    });
  }

  private async read(tx: Transaction, input: Credential): Promise<Facts> {
    if (!/^[a-f0-9]{32}$/.test(input.linkId) ||
        !/^[A-Za-z0-9_-]{43}$/.test(input.secret)) throw unavailable();
    const [authoritySnap, guestSnap] = await tx.getAll(
      this.db.collection(RCS_WITHDRAWAL_GRANTS)
        .doc(withdrawalGrantId("rcs", input.linkId)),
      this.db.collection(guestCollections.grants).doc(input.linkId),
    );
    if (!authoritySnap.exists || !guestSnap.exists) throw unavailable();
    const authority = parseRcsWithdrawalGrant(authoritySnap.data());
    const guest = parseGrant(guestSnap.data());
    if (authority.linkId !== input.linkId || guest.linkId !== input.linkId ||
        guest.revokedAt !== null ||
        guest.attendeeId !== authority.attendeeId ||
        operationContentHash(guest.context) !==
          operationContentHash(authority.context) ||
        authority.guestGrantHash !== operationContentHash(guest) ||
        !matchesGuestSecret(guest, input.secret)) throw unavailable();
    // Independent withdrawal lifetime; never restore expired read/reply scope.
    // Stopping needs no current event, roster, sender readiness or STOP proof.
    const permissionSnap = await tx.get(this.db
      .collection(rcsConsentCollections.permissions)
      .doc(authority.permissionId));
    if (!permissionSnap.exists) throw unavailable();
    const permission = parseRcsPermission(permissionSnap.data());
    if (!rcsWithdrawalMatchesPermission(authority, permission)) {
      throw unavailable();
    }
    return {authority, permission};
  }

  private view({authority, permission}: Facts, now: number): Response["view"] {
    if (now < authority.issuedAt || now < permission.updatedAt ||
        now >= authority.expiresAt) throw unavailable();
    // Recorded event preference, not deliverability or conversation STOP state.
    return {serverTime: now, revision: permission.revision,
      preference: permission.status === "revoked" ? "disabled" :
        permission.expiresAt <= now ? "expired" : "enabled",
      expiresAt: authority.expiresAt};
  }

  private now(): number {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw unavailable();
    return now;
  }
}
