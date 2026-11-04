import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceDeliveryCallableResponse as Response} from
  "../../shared/generated/eventAssistanceDeliveryCallableResponse";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateRepairEventAssistanceDeliveryCallablePayload} from
  "../../shared/generated/validators/repairEventAssistanceDeliveryInput";
import {validateEventAssistanceDeliveryCallableResponse} from
  "../../shared/generated/validators/eventAssistanceDeliveryOutput";
import {validateEventAssistanceDeliveryRepairDocument} from
  "../../shared/generated/validators/eventAssistanceDeliveryRepairDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {guestCollections, guestIdentity} from "./guestRecords";
import {invalidSource} from "./groupProgressSource";
import {MessageRecord, parseMessageRecord} from "./messageOutbox";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {deliveryWorkIds, hasAutomaticDelivery, readDeliveryWorkRecords} from
  "./deliveryWorkRecords";
import {parseHostDelivery, projectHostDelivery} from "./hostDeliveryRecords";
import {runAssistanceTransaction as transact} from "./transactionCallback";

export const DELIVERY_REPAIRS = "eventAssistanceDeliveryRepairs";

/**
 * Reviewed ownership only. This store never sends or fabricates receipts;
 * managers read deliveries through hostEventDeliveryViews.
 */
export class EventAssistanceDeliveriesStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async repair(actorUid: string, value: unknown): Promise<Response> {
    if (!validateRepairEventAssistanceDeliveryCallablePayload(value) ||
        value.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid delivery action.");
    }
    const input = structuredClone(value);
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument", "Delivery scope mismatch.");
    }
    const receiptId = "delivery-repair:" + operationContentHash([
      context, payload.deliveryId, command.operationId]);
    const requestHash = operationContentHash([actorUid, input]);
    return transact(this.db, async (tx) => {
      const access = await this.access(tx, actorUid, context);
      assertCommandRole(command, ["eventLead"]);
      if (payload.action !== "manualHandoff") {
        throw new HttpsError("failed-precondition",
          "Provider lookup and verified retry are not available here.");
      }
      const ref = this.db.collection(EVENT_ASSISTANCE_MESSAGES)
        .doc(payload.deliveryId);
      const receiptRef = this.db.collection(DELIVERY_REPAIRS).doc(receiptId);
      const [snapshot, receiptSnapshot] = await tx.getAll(ref, receiptRef);
      const raw = snapshot.data();
      if (!raw || raw.intent?.context?.mode !== "live" ||
          raw.intent?.context?.organizerId !== context.organizerId ||
          raw.intent?.eventId !== context.eventId) {
        throw new HttpsError("not-found", "This delivery is unavailable.");
      }
      const message = parseHostDelivery(raw, snapshot.id, context, this.now());
      const facts = await this.facts(tx, message);
      const now = this.now();
      const project = (record: MessageRecord) => projectHostDelivery(record,
        access.event, facts.attendee, facts.guest, access.organizer,
        facts.work, now);
      const view = project(message);
      const intentHash = operationContentHash(message.intent);
      const receipt = receiptSnapshot.data();
      if (receipt !== undefined) {
        if (!validateEventAssistanceDeliveryRepairDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.messageId !== message.messageId ||
            operationContentHash(receipt.context) !==
              operationContentHash(context) || receipt.actorUid !== actorUid ||
            receipt.operationId !== command.operationId ||
            receipt.intentHash !== intentHash ||
            receipt.requestHash !== requestHash ||
            receipt.messageRevision !== input.expectedMessageRevision + 1 ||
            receipt.messageRevision > message.revision ||
            receipt.createdAt < message.createdAt ||
            receipt.createdAt > message.updatedAt) throw conflict();
        return this.response("replayed", context, now,
          receipt.messageRevision, view);
      }
      if (input.expectedMessageRevision !== message.revision ||
          input.expectedReviewHash !== view.reviewHash) throw conflict();
      if (!view.actions.includes("manualHandoff")) {
        throw new HttpsError("failed-precondition",
          "This message no longer needs a manual handoff.");
      }
      const updated = parseMessageRecord({...message,
        revision: message.revision + 1, updatedAt: now,
        handoff: {actorUid, at: now, operationId: command.operationId}});
      const savedReceipt = {receiptId, context, messageId: message.messageId,
        intentHash, requestHash, actorUid, operationId: command.operationId,
        messageRevision: updated.revision, createdAt: now};
      if (!validateEventAssistanceDeliveryRepairDocument(savedReceipt)) {
        throw invalidSource();
      }
      const result = this.response("applied", context, now, updated.revision,
        project(updated));
      tx.set(ref, updated);
      tx.create(receiptRef, savedReceipt);
      return result;
    });
  }

  private async facts(tx: Transaction, message: MessageRecord) {
    const i = message.intent;
    if (i.context.mode !== "live") throw invalidSource();
    const [attendee, guest] = await tx.getAll(
      this.db.collection("eventAttendees").doc(i.attendeeId),
      this.db.collection(guestCollections.guests)
        .doc(guestIdentity(i.context, i.attendeeId)));
    if (!hasAutomaticDelivery(message)) return {attendee, guest, work: null};
    const ids = deliveryWorkIds(message.messageId);
    const [run, item] = await tx.getAll(
      this.db.collection(operationCollections.runs).doc(ids.runId),
      this.db.collection(operationCollections.workItems).doc(ids.workItemId));
    return {attendee, guest, work: readDeliveryWorkRecords(run.data(),
      item.data(), ids.workItemId, this.now())};
  }

  private async access(tx: Transaction, actorUid: string,
    context: Response["context"]) {
    const data = (await tx.get(this.db.collection("organizers")
      .doc(context.organizerId))).data();
    if (!validateOrganizerDocument(data) ||
        !isOrganizerManager(data as unknown as OrganizerDocument, actorUid)) {
      throw new HttpsError("permission-denied",
        "Only organizer managers can review event deliveries.");
    }
    const event = await tx.get(this.db.collection("events")
      .doc(context.eventId));
    const row = event.data();
    if (!validateEventDocument(row) ||
        row.organizerId !== context.organizerId) throw invalidSource();
    return {organizer: data as unknown as OrganizerDocument, event};
  }

  private now() {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidSource();
    return now;
  }

  private response(outcome: Response["outcome"],
    context: Response["context"], serverTime: number, operationRevision: number,
    view: Response["view"]): Response {
    const result = {outcome, context, serverTime, operationRevision, view};
    if (!validateEventAssistanceDeliveryCallableResponse(result)) {
      throw invalidSource();
    }
    return result;
  }
}

function conflict() {
  return new HttpsError("aborted", "This delivery changed. Review it again.");
}
