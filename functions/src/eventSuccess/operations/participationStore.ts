import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceParticipationCallableResponse as Response} from
  "../../shared/generated/eventAssistanceParticipationCallableResponse";
import type {GetEventAssistanceParticipationCallablePayload as Scope} from
  "../../shared/generated/getEventAssistanceParticipationCallablePayload";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {validateGetEventAssistanceParticipationCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceParticipationInput";
import {validateSetEventAssistanceParticipationCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceParticipationInput";
import {validateEventAssistanceParticipationCallableResponse} from
  "../../shared/generated/validators/eventAssistanceParticipationOutput";
import {validateEventAssistanceParticipationReceiptDocument} from
  // eslint-disable-next-line max-len -- Canonical individual validator path.
  "../../shared/generated/validators/eventAssistanceParticipationReceiptDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {invalidSource, timestampEvidence} from "./groupProgressSource";
import {
  Guest, guestCollections, guestIdentity, parseGuest, GuestSourceFacts,
  guestSourceFactsFromSnapshots,
} from "./guestRecords";

export const PARTICIPATION_RECEIPTS = "eventAssistanceParticipationReceipts";

/** Reported participation; never a check-in, placement or consent writer. */
export class EventParticipationStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, input: unknown): Promise<Response> {
    if (!validateGetEventAssistanceParticipationCallablePayload(input)) {
      throw new HttpsError("invalid-argument", "Invalid participation scope.");
    }
    return transact(this.db, async (tx) =>
      response("read", await this.read(tx, actorUid, input)));
  }

  async set(actorUid: string, input: unknown): Promise<Response> {
    if (!validateSetEventAssistanceParticipationCallablePayload(input) ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid participation change.");
    }
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument",
        "Participation context mismatch.");
    }
    const scope: Scope = {context, attendeeId: payload.attendeeId};
    const requestHash = operationContentHash([actorUid, input]);
    const receiptId = "participation-action:" + operationContentHash([
      scope, command.operationId]);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, scope);
      assertCommandRole(command, [state.role]);
      const receiptRef = this.db.collection(PARTICIPATION_RECEIPTS)
        .doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      if (receipt !== undefined) {
        if (!validateEventAssistanceParticipationReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.guestId !== state.guestId ||
            receipt.sourceGeneration !== state.source.sourceGeneration ||
            receipt.requestHash !== requestHash || !state.guest ||
            receipt.revision > state.guest.revision ||
            receipt.createdAt > now) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      if (!canChange(state)) {
        throw new HttpsError("failed-precondition",
          "Participation is unavailable for this event or registration.");
      }
      const previous = state.guest;
      if (payload.expectedParticipationRevision !== (previous?.revision ?? 0) ||
          payload.episodeId !== (previous?.episodeId ?? null) ||
          input.expectedSourceHash !== state.sourceHash) throw conflict();
      if (payload.resumeAtUnit !== null && !state.resumeUnits.some((unit) =>
        unit.unitId === payload.resumeAtUnit)) {
        throw new HttpsError("failed-precondition",
          "Choose a return point from the current event itinerary.");
      }
      const freshEpisode = !isCurrent(state) ||
        (payload.state === "active" &&
          (previous!.participation.state !== "active" ||
            previous!.intention.kind === "notComing"));
      const episodeId = freshEpisode ? "episode:" + operationContentHash([
        state.guestId, state.source.sourceGeneration, command.operationId,
        payload.expectedParticipationRevision]) : previous!.episodeId;
      const guest: Guest = parseGuest({schemaVersion: 1,
        guestId: state.guestId, context, attendeeId: payload.attendeeId,
        attendeeGeneration: state.source.attendeeGeneration,
        sourceGeneration: state.source.sourceGeneration, episodeId,
        lifecycle: "active", revision: (previous?.revision ?? 0) + 1,
        participation: {state: payload.state,
          resumeAtUnit: payload.resumeAtUnit},
        intention: freshEpisode ? {kind: "unknown"} : previous!.intention,
        createdAt: previous?.createdAt ?? now, updatedAt: now});
      const savedReceipt = {receiptId, guestId: guest.guestId, requestHash,
        sourceGeneration: guest.sourceGeneration, revision: guest.revision,
        episodeId, createdAt: now};
      if (!validateEventAssistanceParticipationReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const result = response("applied", {...state, guest}, guest.revision);
      tx.set(this.db.collection(guestCollections.guests).doc(guest.guestId),
        guest);
      tx.create(receiptRef, savedReceipt);
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string, scope: Scope) {
    const {context, attendeeId} = scope;
    const guestId = guestIdentity(context, attendeeId);
    const [eventSnap, attendeeSnap, organizerSnap, planSnap, guestSnap] =
      await tx.getAll(this.db.collection("events").doc(context.eventId),
        this.db.collection("eventAttendees").doc(attendeeId),
        this.db.collection("organizers").doc(context.organizerId),
        this.db.collection("eventSuccessPlans").doc(context.eventId),
        this.db.collection(guestCollections.guests).doc(guestId));
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    const organizer = organizerSnap.data();
    const plan = planSnap.data() ?? null;
    if (!validateEventDocument(event) ||
        event.organizerId !== context.organizerId ||
        !validateEventAttendeeDocument(attendee) ||
        attendee.eventId !== context.eventId ||
        attendee.organizerId !== context.organizerId ||
        !validateOrganizerDocument(organizer) ||
        (plan !== null && (!validateEventSuccessPlanDocument(plan) ||
          plan.eventId !== context.eventId ||
          (plan.organizerId) !== context.organizerId))) {
      throw invalidSource();
    }
    const manager = isOrganizerManager(organizer as unknown as
      OrganizerDocument, actorUid);
    if (!manager && attendee.linkedUid !== actorUid) {
      throw new HttpsError("permission-denied",
        "Only this guest or an organizer manager can change participation.");
    }
    const source = guestSourceFactsFromSnapshots(context, attendeeId,
      eventSnap, attendeeSnap);
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidSource();
    const guest = guestSnap.exists ? parseGuest(guestSnap.data()) : null;
    if (guest && (guest.guestId !== guestId || guest.updatedAt > now)) {
      throw invalidSource();
    }
    const stops = event.itinerary ?? [];
    if (new Set(stops.map((stop) => stop.id)).size !== stops.length) {
      throw invalidSource();
    }
    const resumeUnits = stops.map((stop) => ({
      unitId: "itinerary:" + stop.id, label: stop.title}));
    const sourceHash = operationContentHash([scope, source.sourceGeneration,
      source.attendeeGeneration, event.status,
      timestampEvidence(event.startTime), timestampEvidence(event.endTime),
      attendee.status, attendee.attendanceRevision ?? 0, attendee.linkedUid,
      plan ? timestampEvidence(planSnap.createTime) : null,
      plan?.status ?? null, stops]);
    return {scope, guestId, guest, source, now, sourceHash, resumeUnits,
      complete: plan?.status === "complete",
      role: manager ? "eventLead" as const : "guestSelf" as const};
  }
}

// The private reader's source shape is explicit at the projection boundary.
type Projection = {
  scope: Scope; guestId: string; guest: Guest | null; now: number;
  sourceHash: string; complete: boolean;
  source: GuestSourceFacts;
  resumeUnits: Response["view"]["resumeUnits"];
};
function isCurrent(state: Projection): boolean {
  return state.guest?.lifecycle === "active" &&
    state.guest.sourceGeneration === state.source.sourceGeneration &&
    state.guest.attendeeGeneration === state.source.attendeeGeneration;
}
function canChange(state: Projection): boolean {
  return !state.complete && state.source.eventStatus === "active" &&
    state.now < state.source.eventEnd &&
    ["registered", "checkedIn"].includes(state.source.attendeeStatus);
}
function response(outcome: Response["outcome"], state: Projection,
  operationRevision: number | null = null): Response {
  const guest = state.guest;
  const value: Response = {outcome, operationRevision, view: {
    ...state.scope, serverTime: state.now, sourceHash: state.sourceHash,
    revision: guest?.revision ?? 0, episodeId: guest?.episodeId ?? null,
    freshness: !guest ? "uninitialized" : isCurrent(state) ?
      "current" : "sourceChanged",
    participation: isCurrent(state) ? guest!.participation : null,
    canChange: canChange(state),
    checkedIn: state.source.attendeeStatus === "checkedIn",
    resumeUnits: state.resumeUnits}};
  if (!validateEventAssistanceParticipationCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
function conflict(): HttpsError {
  return new HttpsError("aborted",
    "Participation changed. Refresh and retry.");
}
