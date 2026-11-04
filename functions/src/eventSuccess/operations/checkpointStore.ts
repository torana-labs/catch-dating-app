import {readCheckpointReporters} from "./checkpointReporters";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateRecordEventAssistanceCheckpointCallablePayload} from
  "../../shared/generated/validators/recordEventAssistanceCheckpointInput";
import {validateEventAssistanceCheckpointReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceCheckpointReceiptDocument";
import {assertCommandContext, assertCommandRole} from "./commands";
import {requireGroupPermission, denied} from "./groupStaffAuthority";
import {invalidSource} from "./groupProgressSource";
import {readCheckpoint} from "./checkpointReader";
import {runAssistanceTransaction} from "./transactionCallback";
import {prepareCheckpointObservation} from "./movementDecisions";
import {CHECKPOINTS, CHECKPOINT_RECEIPTS, checkpointIdentity,
  checkpointAvailability, checkpointSourceHash, checkpointResponse,
  checkpointConflict, parseCheckpointReport, Response, Scope, Report} from
  "./checkpointRecords";

/** Observations at one saved stop; no attendance or movement inference. */
export class EventCheckpointStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  /**
   * Trusted read for one actor. No client reaches it: managers listen to
   * hostEventCheckpointViews, and the command suites use it as their oracle.
   */
  async get(actorUid: string, scope: Scope): Promise<Response> {
    return runAssistanceTransaction(this.db, async (tx) => {
      const s = await this.read(tx, actorUid, scope);
      const reporterOptions = s.access.role === "eventLead" ?
        await readCheckpointReporters(this.db, tx, s, actorUid, this.clock) :
        null;
      const result = checkpointResponse("read", s);
      return {...result, view: {...result.view, reporterOptions}};
    });
  }

  async record(actorUid: string, input: unknown): Promise<Response> {
    if (!validateRecordEventAssistanceCheckpointCallablePayload(input) ||
        input.command.context.mode !== "live") {
      throw new HttpsError("invalid-argument", "Invalid checkpoint report.");
    }
    const {command} = input;
    const {context, payload} = command;
    if (context.mode !== "live") throw invalidSource();
    try {
      assertCommandContext(command, context);
    } catch {
      throw new HttpsError("invalid-argument", "Checkpoint context mismatch.");
    }
    // The command schema already bounds every field of this scope.
    const scope: Scope = {context, groupId: payload.groupId,
      checkpointId: payload.checkpointId,
      progressRevision: payload.expectedProgressRevision};
    const requestHash = operationContentHash([actorUid, input]);
    const receiptId = "checkpoint-action:" + operationContentHash([
      context, payload.groupId, command.operationId]);
    return runAssistanceTransaction(this.db, async (tx) => {
      const s = await this.read(tx, actorUid, scope);
      assertCommandRole(command, [s.access.role]);
      const receiptRef = this.db.collection(CHECKPOINT_RECEIPTS).doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < s.now) throw invalidSource();
      if (now >= s.access.validUntil) throw denied();
      s.now = now;
      if (receipt !== undefined) {
        if (!validateEventAssistanceCheckpointReceiptDocument(receipt) ||
            !("report" in receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.requestHash !== requestHash || !s.report ||
            receipt.report.revision > s.report.revision ||
            receipt.report.createdAt !== s.report.createdAt) {
          throw checkpointConflict();
        }
        const original = parseCheckpointReport(receipt.report, scope,
          s.roster, now)!;
        if (original.revision !== payload.expectedCheckpointRevision + 1 ||
            original.reportedBy !== actorUid ||
            original.reportedAt > s.report.reportedAt ||
            original.correctionReason !==
              (payload.correctionReason?.trim() ?? null) ||
            operationContentHash(original.accountedFor) !==
              operationContentHash([...payload.accountedFor].sort()) ||
            original.revision === s.report.revision &&
              operationContentHash(original) !==
                operationContentHash(s.report)) {
          throw checkpointConflict();
        }
        return checkpointResponse("replayed", s, original.revision);
      }
      const {accountedFor, correctionReason} = prepareCheckpointObservation({
        sourceHash: checkpointSourceHash(s),
        revision: s.report?.revision ?? 0,
        availability: checkpointAvailability(s),
        previouslyAccountedFor: s.report?.accountedFor ?? [],
      }, payload, input.expectedSourceHash);
      const report: Report = {schemaVersion: 1,
        reportId: checkpointIdentity(scope), ...scope,
        rosterId: s.roster!.rosterId,
        rosterHash: operationContentHash(s.roster),
        revision: (s.report?.revision ?? 0) + 1, accountedFor,
        reportedBy: actorUid, reportedAt: now, correctionReason,
        createdAt: s.report?.createdAt ?? now};
      parseCheckpointReport(report, scope, s.roster, now);
      const saved = {receiptId, requestHash, report};
      if (!validateEventAssistanceCheckpointReceiptDocument(saved)) {
        throw invalidSource();
      }
      const result = checkpointResponse("applied", {...s, report},
        report.revision);
      tx.set(this.db.collection(CHECKPOINTS).doc(report.reportId), report);
      tx.create(receiptRef, saved);
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string, scope: Scope) {
    const access = await requireGroupPermission(this.db, tx, scope.context,
      scope.groupId, actorUid, "recordCheckpoint", this.clock);
    const s = await readCheckpoint(this.db, tx, scope, this.clock);
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < s.now) throw invalidSource();
    if (now >= access.validUntil) throw denied();
    return {...s, now, access};
  }
}
