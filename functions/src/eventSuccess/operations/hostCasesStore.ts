import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceCaseCallableResponse as Response} from
  "../../shared/generated/eventAssistanceCaseCallableResponse";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateResolveEventAssistanceCaseCallablePayload} from
  "../../shared/generated/validators/resolveEventAssistanceCaseInput";
import {validateEventAssistanceCaseCallableResponse} from
  "../../shared/generated/validators/eventAssistanceCaseOutput";
import {assertCommandContext, assertCommandRole} from "./commands";
import {guestCollections} from "./guestRecords";
import {invalidSource} from "./groupProgressSource";
import {resolvePracticalCaseHandling} from "./practicalCaseHandling";
import {HostCase, hostCaseBindingHash, parseHostCase, projectHostCase} from
  "./hostCaseRecords";
import {assistanceReceiptRef, isDigest, isMillis, isRevision,
  replayAssistanceReceipt, writeAssistanceReceipt} from "./assistanceReceipts";

export const CASE_RECEIPT_COMMAND = "eventAssistanceCase";

/** What a replay re-checks against the live help request. */
type CaseReceipt = {revision: number; createdAt: number;
  caseBindingHash: string};
const validReceipt = (r: Record<string, unknown>) => isRevision(r.revision) &&
  isMillis(r.createdAt) && isDigest(r.caseBindingHash);

/**
 * Practical guest request commands. Safety ownership never crosses this
 * boundary; managers read requests through hostEventCaseViews.
 */
export class EventAssistanceCasesStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async resolve(actorUid: string, value: unknown): Promise<Response> {
    if (!validateResolveEventAssistanceCaseCallablePayload(value) ||
        value.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid help request action.");
    }
    const input = structuredClone(value);
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument", "Help request scope mismatch.");
    }
    const receiptRef = assistanceReceiptRef(this.db, CASE_RECEIPT_COMMAND,
      operationContentHash([context, payload.caseId, command.operationId]));
    const requestHash = operationContentHash([actorUid, input]);
    return transact(this.db, async (tx) => {
      const {organizer, event} = await this.access(tx, actorUid, context);
      assertCommandRole(command, ["eventLead"]);
      const caseRef = this.db.collection(guestCollections.cases)
        .doc(payload.caseId);
      const [caseSnap, receiptSnap] = await tx.getAll(caseRef, receiptRef);
      const raw = caseSnap.data();
      if (!raw || raw.owner !== "eventLead" ||
          raw.context?.eventId !== context.eventId ||
          raw.context?.organizerId !== context.organizerId) {
        throw new HttpsError("not-found", "This help request is unavailable.");
      }
      const now = this.now();
      const request = parseHostCase(raw, caseSnap.id, context, now);
      const attendee = await tx.get(this.db.collection("eventAttendees")
        .doc(request.attendeeId));
      const view = projectHostCase(request, event, attendee, organizer);
      const bindingHash = hostCaseBindingHash(request);
      const receipt = replayAssistanceReceipt<CaseReceipt>(receiptSnap.data(), {
        command: CASE_RECEIPT_COMMAND, requestHash, nowMillis: now,
      }, validReceipt, conflict);
      if (receipt !== null) {
        if (receipt.caseBindingHash !== bindingHash ||
            receipt.revision > (view.revision ?? -1) ||
            receipt.createdAt < request.receivedAt ||
            receipt.createdAt > now) throw conflict();
        return this.response("replayed", context, now, receipt.revision, view);
      }
      if (!("handling" in request) || !view.canChange) {
        throw new HttpsError("failed-precondition",
          "This help request is closed or its guest source has changed.");
      }
      if (payload.expectedRevision !== request.handling.revision ||
          input.expectedSourceHash !== view.sourceHash) throw conflict();
      const changed = resolvePracticalCaseHandling(request, payload, actorUid,
        now, (uid) => isOrganizerManager(organizer, uid));
      const handling = changed.handling;
      const updated: HostCase = parseHostCase({...request, ...changed},
        request.caseId, context, now);
      const savedReceipt: CaseReceipt = {caseBindingHash: bindingHash,
        revision: handling.revision, createdAt: now};
      if (!validReceipt(savedReceipt)) throw invalidSource();
      const result = this.response("applied", context, now, handling.revision,
        projectHostCase(updated, event, attendee, organizer));
      tx.set(caseRef, updated);
      writeAssistanceReceipt(tx, receiptRef, {command: CASE_RECEIPT_COMMAND,
        requestHash, nowMillis: now, result: savedReceipt});
      return result;
    });
  }

  private async access(tx: Transaction, actorUid: string,
    context: Response["context"]) {
    const data = (await tx.get(this.db.collection("organizers")
      .doc(context.organizerId))).data();
    if (!validateOrganizerDocument(data) ||
        !isOrganizerManager(data as unknown as OrganizerDocument, actorUid)) {
      throw new HttpsError("permission-denied",
        "Only organizer managers can review guest help requests.");
    }
    const event = await tx.get(this.db.collection("events")
      .doc(context.eventId));
    const eventData = event.data();
    if (!validateEventDocument(eventData) ||
        eventData.organizerId !== context.organizerId) throw invalidSource();
    return {organizer: data as unknown as OrganizerDocument, event};
  }

  private now(): number {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidSource();
    return now;
  }

  private response(outcome: Response["outcome"],
    context: Response["context"], serverTime: number, operationRevision: number,
    view: Response["view"]): Response {
    const result = {context, serverTime, operationRevision, view, outcome};
    if (!validateEventAssistanceCaseCallableResponse(result)) {
      throw invalidSource();
    }
    return result;
  }
}

function conflict(): HttpsError {
  return new HttpsError("aborted",
    "This help request changed. Review it again.");
}
