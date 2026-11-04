import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventAssistanceGroupProgressDocument} from
  "../../shared/generated/validators/eventAssistanceGroupProgressDocument";
import {validateEventAssistanceProgressReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceProgressReceiptDocument";
import {validateConfirmEventAssistanceDepartureCallablePayload} from
  "../../shared/generated/validators/confirmEventAssistanceDepartureInput";
import {validateChangeEventAssistanceRouteCallablePayload} from
  "../../shared/generated/validators/changeEventAssistanceRouteInput";
import {validateEventAssistanceGroupProgressCallableResponse} from
  "../../shared/generated/validators/eventAssistanceGroupProgressOutput";
import type {EventAssistanceGroupProgressDocument as Progress} from
  "../../shared/generated/eventAssistanceGroupProgressDocument";
import type {EventAssistanceGroupProgressCallableResponse as Response} from
  "../../shared/generated/eventAssistanceGroupProgressCallableResponse";
import {assertCommandContext, assertCommandRole} from "./commands";
import {GroupPermission, requireGroupPermission, denied} from
  "./groupStaffAuthority";
import {
  invalidSource, ProgressContext, progressIdentity,
  projectGroupProgress,
} from "./groupProgressSource";

import {DEPARTURE_ROSTERS, departureRosterIdentity,
  readDepartureRoster} from "./departureRosterSource";
import {validateEventAssistanceDepartureRosterDocument} from
  "../../shared/generated/validators/eventAssistanceDepartureRosterDocument";
import {GROUP_PROGRESS, readGroupProgressState} from "./groupProgressReader";
import {authorizeCheckpointRequest, assertCheckpointRequestDeadline} from
  "./checkpointRequest";
import {prepareCheckpointWorkEnqueue} from "./checkpointWorkEnqueue";
import {prepareDepartureDecision, prepareRouteDecision,
  departureConflict as conflict, routeDecisionConflict} from
  "./movementDecisions";
export {GROUP_PROGRESS} from "./groupProgressReader";
export const PROGRESS_RECEIPTS = "eventAssistanceProgressReceipts";

/** Physical progress is independent of messaging policy and execution. */
export class EventGroupProgressStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  /**
   * Trusted read for one actor. No client reaches it: managers listen to
   * hostEventGroupProgressViews, and the command suites use it as their
   * oracle for what a command returns.
   */
  async get(actorUid: string,
    scope: {context: ProgressContext; groupId: string}): Promise<Response> {
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, scope.context,
        scope.groupId);
      return response("read", state);
    });
  }

  async confirmDeparture(actorUid: string, input: unknown): Promise<Response> {
    if (!validateConfirmEventAssistanceDepartureCallablePayload(input) ||
        input.command.kind !== "confirmDeparture" ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid departure command.");
    }
    const command = input.command;
    const context = command.context;
    if (context.mode !== "live") throw invalidSource();
    assertCommandContext(command, context);
    const hash = operationContentHash([actorUid, input]);
    const receiptId = "progress-action:" + operationContentHash([
      context, command.payload.groupId, command.operationId]);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, context,
        command.payload.groupId, "confirmDeparture");
      const receiptRef = this.db.collection(PROGRESS_RECEIPTS).doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      // Receipt reads can outlast the event. Re-sample after every source read.
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      state.source.eventOpen = state.source.eventOpen &&
        now < state.source.endAt;
      if (now >= state.access.validUntil) throw denied();
      assertCommandRole(command, [state.access.role]);
      if (receipt !== undefined) {
        if (!validateEventAssistanceProgressReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.progressId !== state.progress?.progressId ||
            receipt.requestHash !== hash ||
            receipt.revision > state.progress.revision ||
            receipt.createdAt > state.now) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      const {target, selection, checkpointRequest} = prepareDepartureDecision({
        ...state.source, revision: state.progress?.revision ?? 0,
      }, command.payload, input.expectedSourceHash);
      const roster = selection ? await readDepartureRoster(this.db, tx,
        state, selection.attendeeIds) : null;
      const ownerValidUntil = checkpointRequest ?
        await authorizeCheckpointRequest(this.db, tx, context,
          command.payload.groupId, actorUid, state.access.role,
          checkpointRequest, this.clock) : null;
      const afterRoster = this.clock();
      if (!Number.isSafeInteger(afterRoster) || afterRoster < state.now) {
        throw invalidSource();
      }
      state.now = afterRoster;
      if (afterRoster >= state.access.validUntil) throw denied();
      if (afterRoster >= state.source.endAt) {
        throw new HttpsError("failed-precondition", "This event has ended.");
      }
      if (checkpointRequest) {
        assertCheckpointRequestDeadline(checkpointRequest, ownerValidUntil!,
          afterRoster, state.source.endAt);
      }
      if (roster && roster.sourceHash !== selection!.expectedSourceHash) {
        throw conflict();
      }
      const nextRevision = (state.progress?.revision ?? 0) + 1;
      const rosterId = roster ? departureRosterIdentity(context,
        command.payload.groupId, nextRevision) : undefined;
      const progress: Progress = {
        schemaVersion: 1, progressId: progressIdentity(context,
          command.payload.groupId), context, groupId: command.payload.groupId,
        revision: nextRevision,
        ...(rosterId ? {departureRosterId: rosterId} : {}),
        destination: target.target, sourceHash: state.source.sourceHash,
        confirmedBy: actorUid, confirmedAt: state.now,
        operationId: command.operationId, requestHash: hash,
        createdAt: state.progress?.createdAt ?? state.now, updatedAt: state.now,
      };
      if (!validateEventAssistanceGroupProgressDocument(progress)) {
        throw invalidSource();
      }
      const savedReceipt = {receiptId, progressId: progress.progressId,
        requestHash: hash, revision: progress.revision, createdAt: state.now};
      if (!validateEventAssistanceProgressReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const manifest = roster ? {schemaVersion: 1, rosterId,
        context, groupId: progress.groupId, progressId: progress.progressId,
        progressRevision: progress.revision, sourceHash: progress.sourceHash,
        confirmedBy: actorUid, confirmedAt: state.now,
        members: roster.members, destination: progress.destination,
        ...(checkpointRequest ? {checkpointRequest} : {})} : null;
      if (manifest &&
          !validateEventAssistanceDepartureRosterDocument(manifest)) {
        throw invalidSource();
      }
      const work = manifest ? await prepareCheckpointWorkEnqueue(this.db, tx,
        manifest, state.now) : null;
      const committedAt = this.clock();
      if (!Number.isSafeInteger(committedAt) || committedAt < state.now) {
        throw invalidSource();
      }
      if (committedAt >= state.access.validUntil) throw denied();
      if (committedAt >= state.source.endAt) {
        throw new HttpsError("failed-precondition", "This event has ended.");
      }
      if (checkpointRequest) {
        assertCheckpointRequestDeadline(checkpointRequest, ownerValidUntil!,
          committedAt, state.source.endAt);
      }
      const result = response("applied", {...state, progress},
        progress.revision);
      tx.set(this.db.collection(GROUP_PROGRESS).doc(progress.progressId),
        progress);
      tx.create(receiptRef, savedReceipt);
      work?.commit();
      if (manifest) {
        tx.create(this.db.collection(DEPARTURE_ROSTERS).doc(rosterId!),
          manifest);
      }
      return result;
    });
  }

  async changeRoute(actorUid: string, input: unknown): Promise<Response> {
    if (!validateChangeEventAssistanceRouteCallablePayload(input) ||
        input.command.kind !== "changeRoute" ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid route command.");
    }
    const command = input.command;
    const context = command.context;
    if (context.mode !== "live") throw invalidSource();
    assertCommandContext(command, context);
    const hash = operationContentHash([actorUid, input]);
    const receiptId = "progress-action:" + operationContentHash([
      context, command.payload.groupId, "changeRoute", command.operationId]);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, context,
        command.payload.groupId, "confirmDeparture");
      const receiptRef = this.db.collection(PROGRESS_RECEIPTS).doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      state.source.eventOpen = state.source.eventOpen &&
        now < state.source.endAt;
      if (now >= state.access.validUntil) throw denied();
      if (state.access.role !== "eventLead") throw denied();
      assertCommandRole(command, [state.access.role]);
      if (receipt !== undefined) {
        if (!validateEventAssistanceProgressReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.progressId !== state.progress?.progressId ||
            receipt.requestHash !== hash ||
            receipt.revision > state.progress.revision ||
            receipt.createdAt > state.now ||
            receipt.commandKind !== "changeRoute" ||
            receipt.decisionId !== command.payload.decisionId) {
          throw routeDecisionConflict();
        }
        return response("replayed", state, receipt.revision);
      }
      const target = prepareRouteDecision({
        ...state.source, revision: state.progress?.revision ?? 0,
        progress: state.progress,
      }, command.payload);
      const nextRevision = (state.progress?.revision ?? 0) + 1;
      const progress: Progress = {
        schemaVersion: 1, progressId: progressIdentity(context,
          command.payload.groupId), context,
        groupId: command.payload.groupId, revision: nextRevision,
        destination: target.target, sourceHash: state.source.sourceHash,
        confirmedBy: actorUid, confirmedAt: state.now,
        operationId: command.operationId, requestHash: hash,
        routeDecisionId: command.payload.decisionId,
        createdAt: state.progress?.createdAt ?? state.now,
        updatedAt: state.now,
      };
      const savedReceipt = {receiptId, progressId: progress.progressId,
        requestHash: hash, revision: progress.revision, createdAt: state.now,
        commandKind: "changeRoute" as const,
        decisionId: command.payload.decisionId};
      if (!validateEventAssistanceGroupProgressDocument(progress) ||
          !validateEventAssistanceProgressReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const committedAt = this.clock();
      if (!Number.isSafeInteger(committedAt) || committedAt < state.now) {
        throw invalidSource();
      }
      if (committedAt >= state.access.validUntil) throw denied();
      if (committedAt >= state.source.endAt) {
        throw new HttpsError("failed-precondition", "This event has ended.");
      }
      const result = response("applied", {...state, progress},
        progress.revision);
      tx.set(this.db.collection(GROUP_PROGRESS).doc(progress.progressId),
        progress);
      tx.create(receiptRef, savedReceipt);
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string,
    context: ProgressContext, groupId: string,
    permission: GroupPermission = "readProgress") {
    const state = await readGroupProgressState(this.db, tx, context, groupId,
      this.clock);
    const access = await requireGroupPermission(this.db, tx, context, groupId,
      actorUid, permission, this.clock);
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
    if (now >= access.validUntil) throw denied();
    state.source.eventOpen = state.source.eventOpen && now < state.source.endAt;
    return {...state, now, access, actorUid};
  }
}

type State = Parameters<typeof projectGroupProgress>;
function response(outcome: Response["outcome"], state: {
  source: State[0]; progress: State[1]; now: number;
  access: Awaited<ReturnType<typeof requireGroupPermission>>; actorUid: string;
}, operationRevision: number | null = null): Response {
  const departureAuthority: Response["departureAuthority"] =
    state.access.permissions.includes("confirmDeparture") ? {
      kind: "canConfirm", validUntil: state.access.validUntil,
      checkpointReporter: state.access.role === "eventLead" ?
        "anyAuthorizedOperator" : "selfOnly",
    } : {kind: "readOnly", validUntil: state.access.validUntil};
  const value = {outcome, view: projectGroupProgress(state.source,
    state.progress, state.now), operationRevision, actorUid: state.actorUid,
  departureAuthority};
  if (!validateEventAssistanceGroupProgressCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
