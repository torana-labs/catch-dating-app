import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash as hash} from "../../operations/durableActions";
import type {EventAttendanceDispositionDocument as Record} from
  "../../shared/generated/eventAttendanceDispositionDocument";
import type {EventAttendanceDispositionCallableResponse as Response} from
  "../../shared/generated/eventAttendanceDispositionCallableResponse";
import type {GetEventAttendanceDispositionCallablePayload as Scope} from
  "../../shared/generated/getEventAttendanceDispositionCallablePayload";
import {validateGetEventAttendanceDispositionCallablePayload} from
  "../../shared/generated/validators/getEventAttendanceDispositionInput";
import {validateRecordEventNoShowCallablePayload} from
  "../../shared/generated/validators/recordEventNoShowInput";
import {validateEventAttendanceDispositionDocument} from
  "../../shared/generated/validators/eventAttendanceDispositionDocument";
import {validateEventAttendanceDispositionReceiptDocument} from
  "../../shared/generated/validators/eventAttendanceDispositionReceiptDocument";
import {validateEventAttendanceDispositionCallableResponse} from
  "../../shared/generated/validators/eventAttendanceDispositionOutput";
import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {assertCommandContext, assertCommandRole} from
  "../../eventSuccess/operations/commands";
import {guestCollections, guestIdentity} from
  "../../eventSuccess/operations/guestRecords";
import {invalidSource} from "../../eventSuccess/operations/groupProgressSource";
import {attendanceBinding, DispositionSource, dispositionConflict as conflict,
  dispositionIdentity, dispositionReceiptIdentity, dispositionView,
  requireDispositionDecision, sourceIdentity} from
  "./attendanceDispositionPolicy";

import {attendanceEventAuthority, attendanceDispositionStateFromSnapshots,
  dispositionCollections} from "./attendanceDispositionReader";
export {dispositionCollections} from "./attendanceDispositionReader";

/** Closeout annotations; check-in remains with the attendance owner. */
export class EventAttendanceDispositionStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, input: unknown): Promise<Response> {
    if (!validateGetEventAttendanceDispositionCallablePayload(input)) {
      throw new HttpsError("invalid-argument", "Invalid attendance scope.");
    }
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, input);
      return response("read", state);
    });
  }

  async recordNoShow(actorUid: string, input: unknown): Promise<Response> {
    if (!validateRecordEventNoShowCallablePayload(input) ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid closeout decision.");
    }
    const {command} = input;
    const {context, payload, operationId} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
      assertCommandRole(command, ["eventLead"]);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid closeout context.");
    }
    const scope: Scope = {context, attendeeId: payload.attendeeId};
    const requestHash = hash([actorUid, input]);
    const receiptId = dispositionReceiptIdentity(context, scope.attendeeId,
      operationId);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, scope);
      const receiptRef = this.db.collection(dispositionCollections.receipts)
        .doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.source.now) {
        throw invalidSource();
      }
      state.source.now = now;
      const binding = attendanceBinding(state.source);
      const identityHash = sourceIdentity(binding);
      const record = state.record;
      if (receipt !== undefined) {
        if (!validateEventAttendanceDispositionReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.dispositionId !== state.id ||
            receipt.attendeeId !== scope.attendeeId ||
            hash(receipt.context) !== hash(context) ||
            receipt.operationId !== operationId ||
            receipt.actorUid !== actorUid ||
            receipt.requestHash !== requestHash ||
            hash(receipt.decision) !== hash(payload.decision) ||
            receipt.sourceIdentityHash !== identityHash || !record ||
            sourceIdentity(record.binding) !== identityHash ||
            receipt.revision > record.revision || receipt.createdAt > now ||
            receipt.createdAt > record.recordedAt) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      const view = dispositionView(state.source, record);
      if (payload.expectedAttendanceRevision !== view.attendance.revision ||
          payload.expectedDispositionRevision !== view.disposition.revision ||
          input.expectedSourceHash !== view.sourceHash) throw conflict();
      requireDispositionDecision(view, payload.decision);
      const next: Record = {dispositionId: state.id, ...scope,
        revision: (record?.revision ?? 0) + 1, binding,
        decision: payload.decision, actorUid, recordedAt: now};
      const savedReceipt = {receiptId, dispositionId: state.id, ...scope,
        operationId, actorUid, requestHash, sourceIdentityHash: identityHash,
        revision: next.revision, decision: next.decision, createdAt: now};
      if (!validateEventAttendanceDispositionDocument(next) ||
          !validateEventAttendanceDispositionReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const result = response("applied",
        {...state, record: next}, next.revision);
      tx.set(this.db.collection(dispositionCollections.records).doc(state.id),
        next);
      tx.create(receiptRef, savedReceipt);
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string, scope: Scope) {
    const {context, attendeeId} = scope;
    const guestId = guestIdentity(context, attendeeId);
    const id = dispositionIdentity(context, attendeeId);
    const [eventSnap, attendeeSnap, organizerSnap, planSnap, guestSnap,
      recordSnap] = await tx.getAll(
      this.db.collection("events").doc(context.eventId),
      this.db.collection("eventAttendees").doc(attendeeId),
      this.db.collection("organizers").doc(context.organizerId),
      this.db.collection("eventSuccessPlans").doc(context.eventId),
      this.db.collection(guestCollections.guests).doc(guestId),
      this.db.collection(dispositionCollections.records).doc(id));
    const authority = attendanceEventAuthority(actorUid, context, eventSnap,
      organizerSnap, planSnap);
    return attendanceDispositionStateFromSnapshots(authority, attendeeSnap,
      guestSnap, recordSnap, this.clock());
  }
}

function response(outcome: Response["outcome"],
  state: {source: DispositionSource; record: Record | null},
  operationRevision: number | null = null): Response {
  const result = {outcome, operationRevision,
    view: dispositionView(state.source, state.record)};
  if (!validateEventAttendanceDispositionCallableResponse(result)) {
    throw invalidSource();
  }
  return result;
}
