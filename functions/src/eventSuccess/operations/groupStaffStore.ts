import {assertGroupDutyAssignment, availableGroupDuties} from
  "./groupDutyPolicy";
import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import {Firestore, Timestamp, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import {eventOperatorExpiryMillis, eventStaffGrantId, staffTimestampMillis} from
  "../../shared/eventOperatorAuthority";
import type {EventStaffGrantDocument as Staff} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceGroupStaffCallableResponse as Response} from
  "../../shared/generated/eventAssistanceGroupStaffCallableResponse";
import {validateSetEventAssistanceGroupStaffCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceGroupStaffInput";
import {validateEventAssistanceGroupStaffCallableResponse} from
  "../../shared/generated/validators/eventAssistanceGroupStaffOutput";
import {ProgressContext, invalidSource} from "./groupProgressSource";
import {parseStaff, readGroupDutySource} from "./groupStaffAuthority";
import {assistanceReceiptRef, isDigest, isMillis, isRevision,
  replayAssistanceReceipt, writeAssistanceReceipt} from "./assistanceReceipts";

export const STAFF_RECEIPT_COMMAND = "eventAssistanceStaff";

/** What a replay re-checks against the live staff record. */
type StaffReceipt = {revision: number; createdAt: number; sourceHash: string};
const validReceipt = (r: Record<string, unknown>) => isRevision(r.revision) &&
  isMillis(r.createdAt) && isDigest(r.sourceHash);
export interface StaffIdentity {
  uid: string; displayName: string; phoneLastFour: string;
}
export interface StaffScope {context: ProgressContext; groupId: string}

/** Group duties and event-wide permissions share one staff record. */
export class EventGroupStaffStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async authorizeManager(actorUid: string, scope: StaffScope): Promise<void> {
    await transact(this.db, async (tx) => {
      await this.source(tx, actorUid, scope);
    });
  }

  async get(actorUid: string, target: StaffIdentity,
    scope: StaffScope): Promise<Response> {
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, target, scope);
      return response("read", state);
    });
  }

  async set(actorUid: string, target: StaffIdentity,
    input: unknown): Promise<Response> {
    if (!validateSetEventAssistanceGroupStaffCallablePayload(input)) {
      throw new HttpsError("invalid-argument", "Invalid group duty change.");
    }
    if (target.uid !== input.expectedUid) throw conflict();
    const scope: StaffScope = {context: input.context, groupId: input.groupId};
    const requestHash = operationContentHash([actorUid, target.uid, input]);
    const receiptRef = assistanceReceiptRef(this.db, STAFF_RECEIPT_COMMAND,
      operationContentHash([scope, target.uid, input.requestId]));
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, target, scope);
      const stored = (await tx.get(receiptRef)).data();
      const active = input.decision.kind === "assign" &&
        (!state.staff || state.staff.status !== "active" ||
          staffTimestampMillis(state.staff.expiresAt) <= state.now) ?
        await tx.get(this.db.collection("eventStaffGrants")
          .where("eventId", "==", scope.context.eventId)
          .where("status", "==", "active")
          .where("expiresAt", ">", Timestamp.fromMillis(state.now)).limit(50)) :
        null;
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      const receipt = replayAssistanceReceipt<StaffReceipt>(stored, {
        command: STAFF_RECEIPT_COMMAND, requestHash, nowMillis: now,
      }, validReceipt, conflict);
      if (receipt !== null) {
        if (receipt.sourceHash !== state.source.hash || !state.staff ||
            receipt.revision > state.staff.revision ||
            receipt.createdAt > now) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      if (input.expectedRevision !== (state.staff?.revision ?? 0) ||
          input.expectedSourceHash !== state.source.hash) throw conflict();
      const prior = state.staff;
      const duties = prior?.status === "active" ? prior.groupDuties ?? [] : [];
      const remaining = duties.filter((d) => d.groupId !== scope.groupId);
      let operatorUntil = prior?.status === "active" ?
        eventOperatorExpiryMillis(prior) : null;
      if (operatorUntil !== null && operatorUntil <= now) operatorUntil = null;
      if (input.decision.kind === "assign") {
        assertGroupDutyAssignment({canAssign: canAssign(state),
          paceGroup: state.source.paceGroup, now,
          endAt: staffTimestampMillis(state.event.endTime)}, input.decision);
        if ((active?.size ?? 0) >= 50 || remaining.length >= 20) {
          throw new HttpsError("resource-exhausted",
            "This event or staff member has reached its duty limit.");
        }
        remaining.push({groupId: scope.groupId, duty: input.decision.duty,
          expiresAtMillis: input.decision.expiresAtMillis,
          sourceHash: state.source.hash, grantedBy: actorUid,
          grantedAtMillis: now});
      } else if (!prior) {
        throw new HttpsError("failed-precondition", "This person has no duty.");
      }
      const until = Math.max(operatorUntil ?? 0,
        ...remaining.map((d) => d.expiresAtMillis));
      const enabled = until > now;
      const stamp = Timestamp.fromMillis(now);
      const staff: Staff = {organizerId: scope.context.organizerId,
        eventId: scope.context.eventId, uid: target.uid,
        displayName: target.displayName, phoneLastFour: target.phoneLastFour,
        role: "eventOperator", permissions: operatorUntil ?
          prior!.permissions : [], operatorExpiresAt: operatorUntil === null ?
          null : Timestamp.fromMillis(operatorUntil), groupDuties: remaining,
        status: enabled ? "active" : "revoked",
        createdBy: prior?.createdBy ?? actorUid,
        createdAt: prior?.createdAt ?? stamp,
        expiresAt: Timestamp.fromMillis(until), updatedAt: stamp,
        revokedBy: enabled ? null : actorUid, revokedAt: enabled ? null : stamp,
        revision: (prior?.revision ?? 0) + 1};
      parseStaff(staff, scope.context, target.uid, now);
      const savedReceipt: StaffReceipt = {sourceHash: state.source.hash,
        revision: staff.revision, createdAt: now};
      if (!validReceipt(savedReceipt)) throw invalidSource();
      const result = response("applied", {...state, staff}, staff.revision);
      tx.set(this.db.collection("eventStaffGrants").doc(state.staffId), staff);
      writeAssistanceReceipt(tx, receiptRef, {command: STAFF_RECEIPT_COMMAND,
        requestHash, nowMillis: now, result: savedReceipt});
      return result;
    });
  }

  private async source(tx: Transaction, actorUid: string, scope: StaffScope) {
    const state = await readGroupDutySource(this.db, tx, scope.context,
      scope.groupId, this.clock);
    if (!isOrganizerManager(state.organizer, actorUid)) {
      throw new HttpsError("permission-denied",
        "Only organizer managers can assign group duties.");
    }
    return state;
  }

  private async read(tx: Transaction, actorUid: string, target: StaffIdentity,
    scope: StaffScope) {
    const state = await this.source(tx, actorUid, scope);
    if (isOrganizerManager(state.organizer, target.uid)) {
      throw new HttpsError("failed-precondition",
        "Organizer managers already have group authority.");
    }
    const staffId = eventStaffGrantId(scope.context.eventId, target.uid);
    const snapshot = await tx.get(this.db.collection("eventStaffGrants")
      .doc(staffId));
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
    return {...state, now, scope, target, staffId,
      staff: parseStaff(snapshot.data(), scope.context, target.uid, now)};
  }
}

type State = Awaited<ReturnType<typeof readGroupDutySource>> & {
  scope: StaffScope; target: StaffIdentity; staffId: string;
  staff: Staff | null;
};
function canAssign(state: State) {
  return state.source.configured && state.event.status === "active" &&
    state.now < staffTimestampMillis(state.event.endTime);
}
function response(outcome: Response["outcome"], state: State,
  operationRevision: number | null = null): Response {
  const {staff, now} = state;
  const duty = staff?.groupDuties?.find((d) =>
    d.groupId === state.scope.groupId) ?? null;
  const status = !duty ? "none" : staff?.status !== "active" ? "revoked" :
    Math.min(duty.expiresAtMillis, staffTimestampMillis(staff.expiresAt)) <=
      now ? "expired" :
      duty.sourceHash !== state.source.hash || !state.source.configured ?
        "sourceChanged" : "assigned";
  const value: Response = {outcome, operationRevision, view: {
    ...state.scope, ...state.target, sourceHash: state.source.hash,
    serverTime: now, revision: staff?.revision ?? 0, status, duty,
    canAssign: canAssign(state), availableDuties: !state.source.configured ?
      [] : availableGroupDuties(state.source.paceGroup),
    operatorExpiresAtMillis: staff?.status === "active" ?
      eventOperatorExpiryMillis(staff) : null}};
  if (!validateEventAssistanceGroupStaffCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
function conflict(): HttpsError {
  return new HttpsError("aborted", "Staff access changed. Refresh and retry.");
}
