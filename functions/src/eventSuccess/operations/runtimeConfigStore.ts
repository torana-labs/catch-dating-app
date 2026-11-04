import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateGetEventAssistanceRuntimeConfigCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceRuntimeConfigInput";
import {validateSetEventAssistanceRuntimeConfigCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceRuntimeConfigInput";
import {validateEventAssistanceRuntimeConfigCallableResponse} from
  "../../shared/generated/validators/eventAssistanceRuntimeConfigOutput";
import {validateEventAssistanceRuntimeConfigReceiptDocument} from
  // eslint-disable-next-line max-len -- Canonical individual validator path.
  "../../shared/generated/validators/eventAssistanceRuntimeConfigReceiptDocument";
import type {EventAssistanceRuntimeConfigCallableResponse as Response} from
  "../../shared/generated/eventAssistanceRuntimeConfigCallableResponse";
import {invalidSource} from "./groupProgressSource";
import {readRuntimeSenderChoice, readRuntimeSenderSetup} from
  "./runtimeSenderSetup";
import {prepareRosterWorkEnqueue, runtimeRosterInput} from
  "./rosterWorkEnqueue";
import {RuntimeContext, RUNTIME_CONFIGS, RUNTIME_CONFIG_RECEIPTS,
  parseRuntimeConfig, runtimeConfigId, runtimeConfigSource,
  runtimeConfigStatus, validRuntimeConfiguration} from "./runtimeConfigRecords";

/** Saves permission and its roster job; never infers participation or sends. */
export class EventAssistanceRuntimeConfigStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, input: unknown): Promise<Response> {
    if (!validateGetEventAssistanceRuntimeConfigCallablePayload(input)) {
      throw new HttpsError("invalid-argument", "Invalid automation scope.");
    }
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, input.context);
      const senderSetup = await readRuntimeSenderSetup(this.db, tx,
        input.context, state.now, input.senderCursors,
        state.record?.configuration?.options.routes);
      return response("read", state, null, senderSetup);
    });
  }

  async set(actorUid: string, input: unknown): Promise<Response> {
    if (!validateSetEventAssistanceRuntimeConfigCallablePayload(input) ||
        input.command.kind === "configure" &&
        !validRuntimeConfiguration(input.command.configuration)) {
      throw new HttpsError("invalid-argument", "Invalid automation setup.");
    }
    const requestHash = operationContentHash([actorUid, input]);
    const receiptId = "runtime-action:" + operationContentHash([
      input.context, input.requestId]);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, input.context);
      const receiptRef = this.db.collection(RUNTIME_CONFIG_RECEIPTS)
        .doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      if (receipt !== undefined) {
        if (!validateEventAssistanceRuntimeConfigReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.runtimeId !== state.record?.runtimeId ||
            receipt.sourceGeneration !== state.source.generation ||
            receipt.requestHash !== requestHash ||
            receipt.revision > state.record.revision ||
            receipt.createdAt > now) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      if (input.expectedRevision !== (state.record?.revision ?? 0) ||
          input.expectedSourceHash !== state.source.hash) throw conflict();
      const configuration = input.command.kind === "configure" ?
        input.command.configuration : state.record?.configuration ?? null;
      if (input.command.kind === "configure" &&
          (state.source.closed || configuration!.expiresAt <= now ||
            configuration!.expiresAt > state.source.eventEnd ||
            now >= state.source.eventEnd)) {
        throw new HttpsError("failed-precondition",
          "Automation must end within the current open event.");
      }
      const requireSenders = async (at: number) => {
        if (input.command.kind !== "configure") return;
        const routes = input.command.configuration.options.routes;
        const reviews = input.command.senderReviews;
        if (reviews && (reviews.length !== routes.length ||
            new Set(reviews.map((r) => r.routeId)).size !== reviews.length)) {
          throw new HttpsError("invalid-argument",
            "Review each selected sender.");
        }
        for (const route of routes) {
          const choice = await readRuntimeSenderChoice(this.db, tx,
            input.context, route, at);
          if (!choice || choice.availability !== "eligible") {
            throw new HttpsError("failed-precondition",
              "A selected event message sender needs setup.");
          }
          if (reviews && !reviews.some((r) => r.routeId === route.routeId &&
              r.senderId === route.senderId &&
              r.reviewHash === choice.reviewHash)) throw conflict();
        }
      };
      await requireSenders(now);
      const record = parseRuntimeConfig({schemaVersion: 1,
        runtimeId: runtimeConfigId(input.context), context: input.context,
        workflowKind: "lateJoin", revision: (state.record?.revision ?? 0) + 1,
        status: input.command.kind === "configure" ? "enabled" : "paused",
        configuration, sourceHash: state.source.hash,
        sourceGeneration: state.source.generation, updatedBy: actorUid,
        createdAt: state.record?.createdAt ?? now, updatedAt: now},
      input.context, now);
      const savedReceipt = {receiptId, runtimeId: record.runtimeId, requestHash,
        sourceGeneration: state.source.generation, revision: record.revision,
        createdAt: now};
      if (!validateEventAssistanceRuntimeConfigReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const result = response("applied", {...state, record}, record.revision);
      const roster = input.command.kind === "configure" ?
        await prepareRosterWorkEnqueue(this.db, tx, runtimeRosterInput(record),
          now) : null;
      const committedAt = this.clock();
      if (committedAt < now || (roster &&
          committedAt >= record.configuration!.expiresAt)) throw conflict();
      if (committedAt !== now) await requireSenders(committedAt);
      tx.set(this.db.collection(RUNTIME_CONFIGS).doc(record.runtimeId), record);
      tx.create(receiptRef, savedReceipt);
      roster?.commit();
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string,
    context: RuntimeContext) {
    const organizerSnap = await tx.get(this.db.collection("organizers")
      .doc(context.organizerId));
    const organizer = organizerSnap.data();
    if (!validateOrganizerDocument(organizer)) throw invalidSource();
    if (!isOrganizerManager(organizer as unknown as OrganizerDocument,
      actorUid)) {
      throw new HttpsError("permission-denied",
        "Only organizer managers can configure event automation.");
    }
    return readRuntimeConfigState(this.db, tx, context, this.clock);
  }
}

/** The event, plan and saved automation; callers authorize separately. */
export async function readRuntimeConfigState(db: Firestore, tx: Transaction,
  context: RuntimeContext, clock: () => number): Promise<RuntimeState> {
  const [eventSnap, planSnap, recordSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventSuccessPlans").doc(context.eventId),
    db.collection(RUNTIME_CONFIGS).doc(runtimeConfigId(context)));
  const now = clock();
  const source = runtimeConfigSource(context, eventSnap, planSnap, now);
  const record = recordSnap.exists ?
    parseRuntimeConfig(recordSnap.data(), context, now) : null;
  return {context, source, record, now};
}

export type RuntimeState = {
  context: RuntimeContext; now: number;
  source: ReturnType<typeof runtimeConfigSource>;
  record: ReturnType<typeof parseRuntimeConfig> | null;
};
type State = RuntimeState;

/** The automation as a manager reviews it at the state's time. */
export function runtimeView(state: State):
  Omit<Response["view"], "serverTime" | "senderSetup"> {
  return {context: state.context, sourceHash: state.source.hash,
    revision: state.record?.revision ?? 0, runtime: state.record,
    status: runtimeConfigStatus(state.record, state.source, state.now),
    canConfigure: !state.source.closed && state.now < state.source.eventEnd,
    eventEnd: state.source.eventEnd};
}
function response(outcome: Response["outcome"], state: State,
  operationRevision: number | null = null,
  senderSetup?: Response["view"]["senderSetup"]): Response {
  const value: Response = {outcome, operationRevision, view: {
    ...runtimeView(state), serverTime: state.now,
    ...(senderSetup ? {senderSetup} : {})}};
  if (!validateEventAssistanceRuntimeConfigCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
function conflict(): HttpsError {
  return new HttpsError("aborted",
    "Automation setup changed. Refresh and retry.");
}
