import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {AutomationWhatsappDispatchDocument} from
  "../shared/generated/automationWhatsappDispatchDocument";
import type {CampaignWhatsappDispatchDocument} from
  "../shared/generated/campaignWhatsappDispatchDocument";
import type {EventApprovalNotificationDispatchDocument} from
  "../shared/generated/eventApprovalNotificationDispatchDocument";
import type {ProgramWhatsappDispatchDocument} from
  "../shared/generated/programWhatsappDispatchDocument";
import {validateAutomationWhatsappDispatchDocument} from
  "../shared/generated/validators/automationWhatsappDispatchDocument";
import {validateCampaignWhatsappDispatchDocument} from
  "../shared/generated/validators/campaignWhatsappDispatchDocument";
import {validateEventApprovalNotificationDispatchDocument} from
  "../shared/generated/validators/eventApprovalNotificationDispatchDocument";
import {validateProgramWhatsappDispatchDocument} from
  "../shared/generated/validators/programWhatsappDispatchDocument";

/**
 * One collection holds the WhatsApp dispatch evidence for programme,
 * campaign, automation and approval-notification sends. Each document's
 * `source` names the sender that wrote it; attempt ids are content hashes, so
 * sources never share an id.
 *
 * This module is the collection's only writer. Domain workers hand it a
 * typed document; it validates the document against its source's contract
 * and stages the write in the caller's transaction, so evidence still commits
 * atomically with the claim or reservation that authorized the send.
 */
export const WHATSAPP_DISPATCHES = "whatsappDispatches";

export type WhatsappDispatchDocument =
  | EventApprovalNotificationDispatchDocument
  | AutomationWhatsappDispatchDocument
  | CampaignWhatsappDispatchDocument
  | ProgramWhatsappDispatchDocument;

export type WhatsappDispatchSource = WhatsappDispatchDocument["source"];

const dispatchContracts: {
  [S in WhatsappDispatchSource]: {
    validate: (value: unknown) => boolean;
    invalidMessage: string;
  };
} = {
  approvalNotification: {
    validate: validateEventApprovalNotificationDispatchDocument,
    invalidMessage: "Invalid approval dispatch proof",
  },
  automation: {
    validate: validateAutomationWhatsappDispatchDocument,
    invalidMessage: "Invalid automation WhatsApp dispatch evidence",
  },
  campaign: {
    validate: validateCampaignWhatsappDispatchDocument,
    invalidMessage: "Invalid campaign WhatsApp dispatch evidence",
  },
  program: {
    validate: validateProgramWhatsappDispatchDocument,
    invalidMessage: "Invalid program WhatsApp dispatch evidence",
  },
};

/**
 * Throws unless the document matches the contract its `source` names.
 * @param {WhatsappDispatchDocument} document Evidence to write.
 */
function assertValidWhatsappDispatch(
  document: WhatsappDispatchDocument): void {
  const contract = Object.prototype.hasOwnProperty.call(dispatchContracts,
    document.source) ? dispatchContracts[document.source] : undefined;
  if (!contract) {
    throw new Error("Unknown WhatsApp dispatch source");
  }
  if (!contract.validate(document)) {
    throw new Error(contract.invalidMessage);
  }
}

/**
 * Reads, inside the caller's transaction, whether evidence already exists
 * for an attempt.
 * @param {Firestore} db Firestore.
 * @param {Transaction} tx The caller's transaction.
 * @param {string} attemptId Delivery attempt id (the document id).
 * @return {Promise<boolean>} True when the evidence row exists.
 */
export async function whatsappDispatchExists(db: Firestore,
  tx: Transaction, attemptId: string): Promise<boolean> {
  return (await tx.get(db.collection(WHATSAPP_DISPATCHES).doc(attemptId)))
    .exists;
}

/**
 * Claim-time evidence for a single-send claim. Validates the document
 * (throwing on a contract violation), then reads the attempt's evidence row
 * in the caller's transaction. Returns null when a row already exists — the
 * caller withholds the send. Otherwise returns a stage function that creates
 * the row; call it from the claim's commit so the evidence commits with the
 * claim and no read follows a write.
 * @param {Firestore} db Firestore.
 * @param {Transaction} tx The claim transaction.
 * @param {WhatsappDispatchDocument} document Evidence keyed by attemptId.
 * @return {Promise<(() => void) | null>} Stage function, or null if taken.
 */
export async function prepareWhatsappDispatch(db: Firestore,
  tx: Transaction, document: WhatsappDispatchDocument):
  Promise<(() => void) | null> {
  assertValidWhatsappDispatch(document);
  const ref = db.collection(WHATSAPP_DISPATCHES).doc(document.attemptId);
  if ((await tx.get(ref)).exists) return null;
  return () => {
    tx.create(ref, document);
  };
}

/**
 * Writes evidence whose uniqueness another document in the same transaction
 * already guards (a programme service reply's reservation operation). It
 * overwrites, so a retry after a released reservation replaces the row for
 * the same attempt id instead of failing.
 * @param {Firestore} db Firestore.
 * @param {Transaction} tx The reservation transaction.
 * @param {WhatsappDispatchDocument} document Evidence keyed by attemptId.
 */
export function setWhatsappDispatch(db: Firestore, tx: Transaction,
  document: WhatsappDispatchDocument): void {
  assertValidWhatsappDispatch(document);
  tx.set(db.collection(WHATSAPP_DISPATCHES).doc(document.attemptId),
    document);
}
