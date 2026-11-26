import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventWhatsappWithdrawalCallablePayload as Credential} from
  "../../shared/generated/getEventWhatsappWithdrawalCallablePayload";
import type {WithdrawEventWhatsappCallablePayload as Submission} from
  "../../shared/generated/withdrawEventWhatsappCallablePayload";
import type {EventWhatsappWithdrawalCallableResponse as Response} from
  "../../shared/generated/eventWhatsappWithdrawalCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {matchesGuestSecret} from "./guestLinkTokens";
import {guestCollections, parseGrant, requireDocumentId, unavailable} from
  "./guestRecords";
import {Permission, parseWhatsappPermission, WHATSAPP_PERMISSIONS} from
  "./whatsappPermissionRecords";
import {parseWhatsappConsentReceipt, WHATSAPP_CONSENT_RECEIPTS} from
  "./whatsappConsent";
import {runAssistanceTransaction} from "../../platform/transactionCallback";
import {
  WithdrawalGrant, parseWhatsappWithdrawalGrant, WHATSAPP_WITHDRAWAL_GRANTS,
  whatsappWithdrawalMatchesPermission,
} from "./whatsappWithdrawalRecords";
import {withdrawalGrantId} from "./messageConsentCollections";
import {EventContactPermissionWriter} from
  "../../messaging/eventContactPermissions";
import {writeEventChannelDecision} from "./eventContactGrants";

interface Facts {authority: WithdrawalGrant; permission: Permission}

/** A bearer link can only withdraw its original event-service permission. */
export class WhatsappWithdrawalStore {
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
      const receiptId = "whatsapp-withdrawal:" + operationContentHash([
        authority.linkId, input.requestId,
      ]);
      // Secrets never enter persisted request material or operational logs.
      const requestHash = operationContentHash([authority.linkId,
        input.requestId, input.expectedRevision, "withdraw"]);
      const receiptRef = this.db.collection(WHATSAPP_CONSENT_RECEIPTS)
        .doc(receiptId);
      const previous = await tx.get(receiptRef);
      const now = this.now();
      const view = this.view(facts, now);
      if (previous.exists) {
        const receipt = parseWhatsappConsentReceipt(previous.data());
        if (receipt.receiptId !== receiptId ||
            receipt.source !== "messageLink" ||
            receipt.linkId !== authority.linkId ||
            receipt.requestHash !== requestHash) {
          throw new HttpsError("invalid-argument",
            "Use a new WhatsApp withdrawal request.");
        }
        return {outcome: "replayed", view};
      }
      if (permission.revision !== input.expectedRevision) {
        return {outcome: "conflict", view};
      }
      const next = parseWhatsappPermission({...permission, status: "revoked",
        currentReceiptId: receiptId, revision: permission.revision + 1,
        updatedAt: now});
      const receipt = parseWhatsappConsentReceipt({schemaVersion: 1,
        channel: "whatsapp", receiptId,
        requestHash, source: "messageLink", linkId: authority.linkId,
        context: permission.context, attendeeId: permission.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        senderId: permission.senderId,
        senderHash: permission.evidence!.senderHash,
        routeId: "organizerEventWhatsapp", actorUid: null,
        recipientEndpointId: permission.recipientEndpointId,
        decision: "revoke", copyVersion: null, copyHash: null,
        appliedRevision: next.revision, createdAt: now,
        permissionHash: operationContentHash(next)});
      const contact = await EventContactPermissionWriter.read(this.db, tx,
        authority.subjectUid, permission.context.eventId);
      tx.create(receiptRef, receipt);
      tx.set(this.db.collection(WHATSAPP_PERMISSIONS)
        .doc(permission.permissionId), next);
      writeEventChannelDecision(tx, contact, next, receipt, now);
      return {outcome: "applied", view: this.view({...facts,
        permission: next}, now)};
    });
  }

  private async read(tx: Transaction, input: Credential): Promise<Facts> {
    if (!/^[a-f0-9]{32}$/.test(input.linkId) ||
        !/^[A-Za-z0-9_-]{43}$/.test(input.secret)) throw unavailable();
    const [authoritySnap, guestSnap] = await tx.getAll(
      this.db.collection(WHATSAPP_WITHDRAWAL_GRANTS)
        .doc(withdrawalGrantId("whatsapp", input.linkId)),
      this.db.collection(guestCollections.grants).doc(input.linkId),
    );
    if (!authoritySnap.exists || !guestSnap.exists) throw unavailable();
    const authority = parseWhatsappWithdrawalGrant(authoritySnap.data());
    const guest = parseGrant(guestSnap.data());
    if (authority.linkId !== input.linkId || guest.linkId !== input.linkId ||
        guest.revokedAt !== null ||
        authority.guestGrantHash !== operationContentHash(guest) ||
        !matchesGuestSecret(guest, input.secret)) throw unavailable();
    // Withdrawal has its own explicit lifetime. Expired instructions never
    // regain read/reply authority, and no current event or roster is exposed.
    const permissionSnap = await tx.get(this.db
      .collection(WHATSAPP_PERMISSIONS).doc(authority.permissionId));
    if (!permissionSnap.exists) throw unavailable();
    const permission = parseWhatsappPermission(permissionSnap.data());
    if (!whatsappWithdrawalMatchesPermission(authority, permission)) {
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
