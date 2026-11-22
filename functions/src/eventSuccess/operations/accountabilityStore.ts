import {HttpsError} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {prepareAttendeeAccountabilityResolution} from
  "../../domain/bookings/attendeeAccountability";
import type {EventAssistanceAccountabilityCallableResponse as Response} from
  "../../shared/generated/eventAssistanceAccountabilityCallableResponse";
import {validateResolveEventAssistanceAccountabilityCallablePayload} from
  "../../shared/generated/validators/resolveEventAssistanceAccountabilityInput";
import {validateEventAssistanceAccountabilityCallableResponse} from
  "../../shared/generated/validators/eventAssistanceAccountabilityOutput";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {guestIdentity} from "./guestRecords";
import {invalidSource} from "./groupProgressSource";
import {requireGroupPermission, denied} from "./groupStaffAuthority";
import {readMembership, currentMembership} from "./membershipReader";
import {AccountabilityScope as Scope, readAccountabilityCheckpoint} from
  "./accountabilityCheckpoint";
import {
  accountabilityAvailability,
  accountabilityCheckInHash,
  accountabilityEpisodeId,
  accountabilitySourceHash,
  accountabilityState,
} from "./accountabilityProjection";
import {runAssistanceTransaction} from "../../platform/transactionCallback";
import {assistanceReceiptRef, isDigest, isMillis, isRevision,
  replayAssistanceReceipt, writeAssistanceReceipt} from "./assistanceReceipts";

export const ACCOUNTABILITY_RECEIPT_COMMAND = "eventAssistanceAccountability";

/** What a replay re-checks against the live attendee and checkpoint. */
type AccountabilityReceipt = {
  revision: number; createdAt: number; sourceGeneration: string;
  attendeeGeneration: string; checkInHash: string; episodeId: string | null;
  checkpointHash: string;
};
const validReceipt = (r: Record<string, unknown>) => isRevision(r.revision) &&
  isMillis(r.createdAt) && isDigest(r.sourceGeneration) &&
  isDigest(r.attendeeGeneration) && isDigest(r.checkInHash) &&
  (r.episodeId === null || typeof r.episodeId === "string") &&
  isDigest(r.checkpointHash);

/** Records a visit disposition for a sweep or an explicit departure. */
export class EventAccountabilityStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  /**
   * Trusted read for one actor. No client reaches it: managers listen to
   * hostEventAccountabilityViews (and, for a departure, the member entries
   * of hostEventCheckpointViews); the suites use it as the oracle for what
   * resolve checks.
   */
  async get(actorUid: string, scope: Scope): Promise<Response> {
    return runAssistanceTransaction(this.db, async (tx) =>
      response("read", await this.read(tx, actorUid, scope)));
  }

  async resolve(actorUid: string, input: unknown): Promise<Response> {
    if (!validateResolveEventAssistanceAccountabilityCallablePayload(input) ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument",
        "Invalid accountability result.");
    }
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument",
        "Accountability context mismatch.");
    }
    const scope: Scope = {context, groupId: input.groupId,
      attendeeId: payload.attendeeId,
      ...(input.checkpoint ? {checkpoint: input.checkpoint} : {})};
    guestIdentity(context, payload.attendeeId);
    const requestHash = operationContentHash([actorUid, input]);
    const receiptRef = assistanceReceiptRef(this.db,
      ACCOUNTABILITY_RECEIPT_COMMAND, operationContentHash([
        context, payload.attendeeId, command.operationId]));
    return runAssistanceTransaction(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, scope);
      assertCommandRole(command, [state.access.role]);
      const stored = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.member.now) {
        throw invalidSource();
      }
      if (now >= state.access.validUntil) throw denied();
      state.member.now = now;
      const revision = state.member.attendee.accountabilityRevision ?? 0;
      const checkpointHash =
        operationContentHash(state.checkpoint?.proof ?? null);
      const receipt = replayAssistanceReceipt<AccountabilityReceipt>(stored, {
        command: ACCOUNTABILITY_RECEIPT_COMMAND, requestHash, nowMillis: now,
      }, validReceipt, conflict);
      if (receipt !== null) {
        if (receipt.sourceGeneration !==
              state.member.source.sourceGeneration ||
            receipt.attendeeGeneration !==
              state.member.source.attendeeGeneration ||
            receipt.checkInHash !==
              accountabilityCheckInHash(state.member.attendee) ||
            receipt.episodeId !== accountabilityEpisodeId(state.member) ||
            receipt.checkpointHash !== checkpointHash ||
            receipt.revision > revision || receipt.createdAt > now) {
          throw conflict();
        }
        return response("replayed", state, receipt.revision);
      }
      if (accountabilityAvailability(state).kind !== "ready") {
        throw new HttpsError("failed-precondition",
          "This guest's current check-in cannot be resolved here.");
      }
      if (input.expectedSourceHash !== accountabilitySourceHash(state) ||
          payload.episodeId !== accountabilityEpisodeId(state.member)) {
        throw conflict();
      }
      const resolution = prepareAttendeeAccountabilityResolution({
        db: this.db, attendeeId: scope.attendeeId,
        attendee: state.member.attendee, resolution: payload.disposition,
        actorUid, now: Timestamp.fromMillis(now)});
      const {fields, attendee} = resolution;
      if (!validateEventAttendeeDocument(attendee)) throw invalidSource();
      const saved: AccountabilityReceipt = {
        sourceGeneration: state.member.source.sourceGeneration,
        attendeeGeneration: state.member.source.attendeeGeneration,
        checkInHash: accountabilityCheckInHash(state.member.attendee),
        episodeId: accountabilityEpisodeId(state.member),
        revision: fields.accountabilityRevision, createdAt: now,
        checkpointHash};
      if (!validReceipt(saved)) throw invalidSource();
      const result = response("applied", {...state,
        member: {...state.member, attendee}}, saved.revision);
      resolution.apply(tx);
      writeAssistanceReceipt(tx, receiptRef, {
        command: ACCOUNTABILITY_RECEIPT_COMMAND, requestHash, nowMillis: now,
        result: saved});
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string, scope: Scope) {
    const access = await requireGroupPermission(this.db, tx, scope.context,
      scope.groupId, actorUid, "resolveAccountability", this.clock);
    const member = await readMembership(this.db, tx,
      {context: scope.context, attendeeId: scope.attendeeId}, actorUid,
      this.clock);
    // A former group duty cannot change the visit result after transfer.
    // Managers can review the original departure using their event authority.
    if (scope.groupId !== "event:whole" && (!currentMembership(member) ||
        member.membership?.accepted?.groupId !== scope.groupId) &&
        (!scope.checkpoint || access.role !== "eventLead")) throw denied();
    const checkpoint = await readAccountabilityCheckpoint(this.db, tx, scope,
      member, this.clock);
    const now = this.clock();
    if (!Number.isSafeInteger(now) ||
        now < Math.max(member.now, checkpoint?.now ?? 0)) throw invalidSource();
    if (now >= access.validUntil) throw denied();
    member.now = now;
    return {scope, member, access, checkpoint};
  }
}

type State = {
    scope: Scope;
    member: Awaited<ReturnType<typeof readMembership>>;
    access: Awaited<ReturnType<typeof requireGroupPermission>>;
    checkpoint: Awaited<ReturnType<typeof readAccountabilityCheckpoint>>;
};
function response(outcome: Response["outcome"], s: State,
  operationRevision: number | null = null): Response {
  const value: Response = {outcome, operationRevision, view: {
    ...s.scope, serverTime: s.member.now, ...accountabilityState(s)}};
  if (!validateEventAssistanceAccountabilityCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
function conflict() {
  return new HttpsError("aborted",
    "Accountability changed. Refresh this guest and retry.");
}
