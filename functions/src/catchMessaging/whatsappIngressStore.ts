import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {runAssistanceTransaction} from
  "../eventSuccess/operations/transactionCallback";
import {validateCatchWhatsappIngressEvidenceDocument} from
  "../shared/generated/validators/catchWhatsappIngressEvidenceDocument";
import {
  deriveCatchIngressEvidence,
  compareCatchIngressReplay,
} from "./whatsappIngressEvidence";
import {
  CATCH_ENDPOINT_STOPS,
  CATCH_RECEIPTS,
  isCatchStopReceipt,
  readCatchReceipt,
  readCatchStop,
  type CatchReceipt,
} from "./whatsappEndpointStops";
import {catchEndpointHash, catchStopId, safeMillis} from "./whatsappReply";
import {
  WEBHOOK_RETENTION_MILLIS,
  type CatchWebhookEvent,
} from "./whatsappWebhookProtocol";

export const CATCH_INGRESS_EVIDENCE = "catchWhatsappIngressEvidence";
const RECONCILIATION = "Catch ingress requires reconciliation.";
/**
 * The event's denial is already committed: its evidence row says "blocked"
 * (and a signed STOP has its suppression). A provider retry can only repeat
 * the same denial, so the webhook acknowledges it instead of asking for one.
 */
export class CatchIngressDeniedError extends Error {
  constructor() {
    super(RECONCILIATION);
    this.name = "CatchIngressDeniedError";
  }
}
function blocked(): never {
  throw new Error(RECONCILIATION);
}
function evidenceRecord(event: CatchWebhookEvent, at: number) {
  const evidence = deriveCatchIngressEvidence(event);
  return {
    schemaVersion: 1,
    ...evidence,
    wabaId: event.wabaId,
    phoneNumberId: event.phoneNumberId,
    endpointHash: /^[1-9][0-9]{6,14}$/u.test(event.participantId) ?
      catchEndpointHash("+" + event.participantId) :
      null,
    state: evidence.classification === "ambiguous" ? "blocked" : "accepted",
    receivedAtMillis: at,
  };
}
export async function assertCatchIngressAccepted(
  tx: Transaction,
  db: Firestore,
  event: CatchReceipt,
): Promise<void> {
  const row = (
    await tx.get(db.collection(CATCH_INGRESS_EVIDENCE).doc(event.eventId))
  ).data();
  const expected = evidenceRecord(event, 0);
  if (
    !validateCatchWhatsappIngressEvidenceDocument(row) ||
    row.state !== "accepted" ||
    row.classification === "ambiguous" ||
    row.ambiguity !== null ||
    row.eventId !== expected.eventId ||
    row.wabaId !== expected.wabaId ||
    row.phoneNumberId !== expected.phoneNumberId ||
    row.endpointHash !== expected.endpointHash ||
    row.materialSha256 !== expected.materialSha256 ||
    row.eventKind !== expected.eventKind ||
    row.classification !== expected.classification ||
    row.receivedAtMillis !== event.receivedAtMillis
  ) {
    blocked();
  }
}

/**
 * Only signed, exact-sender ingress calls this. No history/activation
 * inference.
 */
export async function persistCatchVerifiedIngressEvent(
  db: Firestore,
  event: CatchWebhookEvent,
  nowMillis: number,
): Promise<void> {
  if (
    !safeMillis(nowMillis) ||
    !safeMillis(nowMillis + WEBHOOK_RETENTION_MILLIS)
  ) {
    blocked();
  }
  const incoming = readCatchReceipt({
    ...event,
    receivedAtMillis: nowMillis,
    expiresAt: Timestamp.fromMillis(nowMillis + WEBHOOK_RETENTION_MILLIS),
  });
  const desired = evidenceRecord(event, nowMillis);
  const result = await runAssistanceTransaction(db, async (tx) => {
    const ref = db.collection(CATCH_RECEIPTS).doc(event.eventId);
    const proofRef = db.collection(CATCH_INGRESS_EVIDENCE).doc(event.eventId);
    const stopId = isCatchStopReceipt(event) ?
      catchStopId(event, catchEndpointHash("+" + event.participantId)) :
      null;
    const stopRef = stopId ?
      db.collection(CATCH_ENDPOINT_STOPS).doc(stopId) :
      null;
    const [previous, proof, stop] = await Promise.all([
      tx.get(ref),
      tx.get(proofRef),
      stopRef ? tx.get(stopRef) : Promise.resolve(null),
    ]);
    let next = desired;
    let rejected = desired.state === "blocked";
    if (previous.exists) {
      try {
        const retained = readCatchReceipt(previous.data());
        const comparison = compareCatchIngressReplay(retained, incoming);
        next = evidenceRecord(retained, retained.receivedAtMillis);
        rejected ||= comparison !== "equivalent";
      } catch {
        // Preserve malformed prior bytes. A genuine incoming STOP
        // still commits.
        rejected = true;
      }
    }
    if (proof.exists && !previous.exists) rejected = true;
    const stored = proof.data();
    const validProof = validateCatchWhatsappIngressEvidenceDocument(stored);
    if (proof.exists) {
      rejected ||=
        !validProof ||
        stored.state !== "accepted" ||
        stored.eventId !== next.eventId ||
        stored.wabaId !== next.wabaId ||
        stored.phoneNumberId !== next.phoneNumberId ||
        stored.endpointHash !== next.endpointHash ||
        stored.materialSha256 !== desired.materialSha256 ||
        stored.eventKind !== next.eventKind ||
        stored.classification !== next.classification ||
        stored.ambiguity !== next.ambiguity;
    }
    if (stop?.exists) readCatchStop(stop.data());
    // All reads precede writes. Suppression is based on the actual signed STOP,
    // even when an older non-STOP receipt occupies the same provider event key.
    if (stopRef && !stop?.exists) {
      tx.create(
        stopRef,
        readCatchStop({
          schemaVersion: 1,
          stopId,
          wabaId: event.wabaId,
          phoneNumberId: event.phoneNumberId,
          endpointHash: catchEndpointHash("+" + event.participantId),
          sourceEventId: event.eventId,
          sourceMessageId: event.messageId,
          payloadHash: event.payloadHash,
          observedAtMillis:
            !rejected && next.classification === "stop" ?
              next.receivedAtMillis :
              nowMillis,
        }),
      );
    }
    if (!proof.exists) {
      tx.create(proofRef, {
        ...next,
        state: rejected ? "blocked" : "accepted",
      });
    } else if (validProof && rejected && stored.state !== "blocked") {
      tx.update(proofRef, {state: "blocked"});
    }
    if (!previous.exists && !proof.exists) tx.create(ref, incoming);
    return rejected;
  });
  // Report only after durable denial/STOP commits; throwing inside rolls
  // them back.
  if (result) throw new CatchIngressDeniedError();
}
