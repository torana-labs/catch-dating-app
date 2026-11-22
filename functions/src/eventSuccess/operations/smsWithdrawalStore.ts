import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventAssistanceSmsWithdrawalCallablePayload as Credential} from
  "../../shared/generated/getEventAssistanceSmsWithdrawalCallablePayload";
import type {WithdrawEventAssistanceSmsCallablePayload as Submission} from
  "../../shared/generated/withdrawEventAssistanceSmsCallablePayload";
import type {EventAssistanceSmsWithdrawalCallableResponse as Response} from
  "../../shared/generated/eventAssistanceSmsWithdrawalCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {matchesGuestSecret} from "./guestLinkTokens";
import {guestCollections, parseGrant, requireDocumentId, unavailable} from
  "./guestRecords";
import {Permission, parseSmsPermission, smsCollections} from
  "./smsPermissionRecords";
import {parseSmsConsentReceipt, SMS_CONSENT_RECEIPTS} from "./smsConsent";
import {runAssistanceTransaction} from "../../platform/transactionCallback";
import {
  WithdrawalGrant, parseSmsWithdrawalGrant, SMS_WITHDRAWAL_GRANTS,
  smsWithdrawalMatchesPermission,
} from "./smsWithdrawalRecords";
import {withdrawalGrantId} from "./messageConsentCollections";

interface Facts {authority: WithdrawalGrant; permission: Permission}

/** A bearer link can only withdraw its original event-service SMS purpose. */
export class SmsWithdrawalStore {
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
      const receiptId = "sms-withdrawal:" + operationContentHash([
        authority.linkId, input.requestId,
      ]);
      // Secrets never enter persisted request material or operational logs.
      const requestHash = operationContentHash([authority.linkId,
        input.requestId, input.expectedRevision, "withdraw"]);
      const receiptRef = this.db.collection(SMS_CONSENT_RECEIPTS)
        .doc(receiptId);
      const previous = await tx.get(receiptRef);
      const now = this.now();
      const view = this.view(facts, now);
      if (previous.exists) {
        const receipt = parseSmsConsentReceipt(previous.data());
        if (receipt.receiptId !== receiptId ||
            receipt.source !== "messageLink" ||
            receipt.linkId !== authority.linkId ||
            receipt.requestHash !== requestHash) {
          throw new HttpsError("invalid-argument",
            "Use a new text withdrawal request.");
        }
        return {outcome: "replayed", view};
      }
      if (permission.revision !== input.expectedRevision) {
        return {outcome: "conflict", view};
      }
      const next = parseSmsPermission({...permission, status: "revoked",
        currentReceiptId: receiptId, revision: permission.revision + 1,
        updatedAt: now});
      const receipt = parseSmsConsentReceipt({schemaVersion: 1,
        channel: "sms", receiptId,
        requestHash, source: "messageLink", linkId: authority.linkId,
        context: permission.context, attendeeId: permission.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        senderId: permission.senderId, routeId: "catchEventSms", actorUid: null,
        recipientEndpointId: permission.recipientEndpointId,
        decision: "revoke", copyVersion: null, copyHash: null,
        appliedRevision: next.revision, createdAt: now,
        permissionHash: operationContentHash(next)});
      tx.create(receiptRef, receipt);
      tx.set(this.db.collection(smsCollections.permissions)
        .doc(permission.permissionId), next);
      return {outcome: "applied", view: this.view({...facts,
        permission: next}, now)};
    });
  }

  private async read(tx: Transaction, input: Credential): Promise<Facts> {
    if (!/^[a-f0-9]{32}$/.test(input.linkId) ||
        !/^[A-Za-z0-9_-]{43}$/.test(input.secret)) throw unavailable();
    const [authoritySnap, guestSnap] = await tx.getAll(
      this.db.collection(SMS_WITHDRAWAL_GRANTS)
        .doc(withdrawalGrantId("sms", input.linkId)),
      this.db.collection(guestCollections.grants).doc(input.linkId),
    );
    if (!authoritySnap.exists || !guestSnap.exists) throw unavailable();
    const authority = parseSmsWithdrawalGrant(authoritySnap.data());
    const guest = parseGrant(guestSnap.data());
    if (authority.linkId !== input.linkId || guest.linkId !== input.linkId ||
        guest.revokedAt !== null ||
        authority.guestGrantHash !== operationContentHash(guest) ||
        !matchesGuestSecret(guest, input.secret)) throw unavailable();
    // Withdrawal has its own explicit lifetime. Expired instructions never
    // regain read/reply authority, and no current event or roster is exposed.
    const permissionSnap = await tx.get(this.db
      .collection(smsCollections.permissions).doc(authority.permissionId));
    if (!permissionSnap.exists) throw unavailable();
    const permission = parseSmsPermission(permissionSnap.data());
    if (!smsWithdrawalMatchesPermission(authority, permission)) {
      throw unavailable();
    }
    return {authority, permission};
  }

  private view({authority, permission}: Facts, now: number): Response["view"] {
    if (now < authority.issuedAt || now < permission.updatedAt ||
        now >= authority.expiresAt) throw unavailable();
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
