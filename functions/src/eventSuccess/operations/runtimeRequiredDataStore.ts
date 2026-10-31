import {HttpsError} from "firebase-functions/v2/https";
import {Timestamp, type Firestore, type Transaction} from
  "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventAssistanceCommand} from
  "../../shared/generated/eventAssistanceCommand";
import type {EventAttendeeDocument, EventDocument,
  EventRuntimeDataRequestDocument as RequestDocument,
  EventRuntimeDataRequestReceiptDocument as ReceiptDocument,
  EventRuntimeParticipantDocument as ParticipantDocument,
  EventSuccessPlanDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventRuntimeDataRequestDocument} from
  "../../shared/generated/validators/eventRuntimeDataRequestDocument";
import {validateEventRuntimeDataRequestReceiptDocument} from
  "../../shared/generated/validators/eventRuntimeDataRequestReceiptDocument";
import {validateEventRuntimeParticipantDocument} from
  "../../shared/generated/validators/eventRuntimeParticipantDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {completedRuntimeFieldIds, optionalRuntimeFieldIds,
  requiredRuntimeFieldIds, type RuntimeFieldId} from "../runtimeProfile";
import {assertCommandContext, assertCommandRole} from "./commands";
import {runAssistanceTransaction as transact} from "./transactionCallback";

export const RUNTIME_DATA_REQUESTS = "eventRuntimeDataRequests";
export const RUNTIME_DATA_REQUEST_RECEIPTS =
  "eventRuntimeDataRequestReceipts";

type Command = Extract<EventAssistanceCommand,
  {kind: "requestRequiredData"}>;
type LiveContext = Extract<Command["context"], {mode: "live"}>;

export interface RuntimeRequiredDataView {
  context: LiveContext;
  attendeeId: string;
  serverTime: number;
  sourceHash: string;
  profileRevision: number;
  requestRevision: number;
  validUntil: number;
  requiredFieldIds: RuntimeFieldId[];
  availableFieldIds: RuntimeFieldId[];
  completedFieldIds: RuntimeFieldId[];
  request: null | {
    revision: number;
    fieldIds: RuntimeFieldId[];
    completedFieldIds: RuntimeFieldId[];
    status: "pending" | "completed" | "expired";
    requestedAt: number;
    expiresAt: number;
    completedAt: number | null;
  };
}

export interface RuntimeRequiredDataResult {
  outcome: "applied" | "replayed";
  operationRevision: number;
  view: RuntimeRequiredDataView;
}

export type RuntimeDataRequestProjection = NonNullable<
  RuntimeRequiredDataView["request"]>;

interface RequiredDataState {
  now: number;
  context: LiveContext;
  participant: ParticipantDocument;
  sourceHash: string;
  profileRevision: number;
  availableFieldIds: RuntimeFieldId[];
  requiredFieldIds: RuntimeFieldId[];
  completedFieldIds: RuntimeFieldId[];
  eventEnd: number;
  request: RequestDocument | null;
  requestId: string;
}

/** Server-only source and idempotency boundary for required profile prompts. */
export class EventRuntimeRequiredDataStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async review(context: LiveContext,
    attendeeId: string): Promise<RuntimeRequiredDataView> {
    return transact(this.db, async (tx) =>
      project(await this.read(tx, context, attendeeId)));
  }

  async request(value: unknown): Promise<RuntimeRequiredDataResult> {
    if (!validateEventAssistanceCommand(value) ||
        value.kind !== "requestRequiredData" ||
        value.context.mode !== "live") {
      throw new HttpsError("invalid-argument",
        "Invalid required-data command.");
    }
    const command = structuredClone(value) as Command;
    const context = command.context as LiveContext;
    assertCommandContext(command, context);
    assertCommandRole(command, ["systemWithinPolicy"]);
    const receiptId = requiredDataReceiptId(context,
      command.payload.attendeeId, command.operationId);
    const requestHash = operationContentHash(command);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, context,
        command.payload.attendeeId);
      const receiptRef = this.db.collection(RUNTIME_DATA_REQUEST_RECEIPTS)
        .doc(receiptId);
      const receiptSnap = await tx.get(receiptRef);
      const afterRead = this.clock();
      if (!Number.isSafeInteger(afterRead) || afterRead < state.now) {
        throw invalidSource();
      }
      state.now = afterRead;
      if (receiptSnap.exists) {
        const receipt = receiptSnap.data();
        if (!validateEventRuntimeDataRequestReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.requestId !== state.requestId ||
            receipt.eventId !== context.eventId ||
            receipt.organizerId !== context.organizerId ||
            receipt.attendeeId !== command.payload.attendeeId ||
            receipt.uid !== state.participant.uid ||
            receipt.operationId !== command.operationId ||
            receipt.requestHash !== requestHash ||
            receipt.requestRevision > (state.request?.revision ?? 0) ||
            millis(receipt.createdAt) > state.now) throw conflict();
        return {outcome: "replayed",
          operationRevision: receipt.requestRevision,
          view: project(state)};
      }

      const payload = command.payload;
      if (payload.expectedProfileRevision !== state.profileRevision ||
          payload.expectedRequestRevision !==
            (state.request?.revision ?? 0) ||
          payload.expectedSourceHash !== state.sourceHash) throw conflict();
      if (payload.expiresAt <= state.now ||
          payload.expiresAt > state.eventEnd) {
        throw new HttpsError("failed-precondition",
          "The required-data request deadline is outside the event window.");
      }
      const fields = canonicalFields(payload.fieldIds,
        state.availableFieldIds);
      if (fields.length !== payload.fieldIds.length || fields.some((field) =>
        state.completedFieldIds.includes(field))) {
        throw new HttpsError("failed-precondition",
          "Only current missing event fields can be requested.");
      }
      const nextRevision = (state.request?.revision ?? 0) + 1;
      const now = Timestamp.fromMillis(state.now);
      const request: RequestDocument = {
        schemaVersion: 1,
        requestId: state.requestId,
        eventId: context.eventId,
        organizerId: context.organizerId,
        attendeeId: payload.attendeeId,
        uid: state.participant.uid,
        revision: nextRevision,
        profileRevision: state.profileRevision,
        sourceHash: state.sourceHash,
        operationId: command.operationId,
        fieldIds: fields,
        completedFieldIds: [],
        status: "pending",
        requestedBy: "systemWithinPolicy",
        requestedAt: now,
        expiresAt: Timestamp.fromMillis(payload.expiresAt),
        completedAt: null,
        updatedAt: now,
      };
      const receipt: ReceiptDocument = {
        schemaVersion: 1,
        receiptId,
        requestId: state.requestId,
        eventId: context.eventId,
        organizerId: context.organizerId,
        attendeeId: payload.attendeeId,
        uid: state.participant.uid,
        operationId: command.operationId,
        requestHash,
        requestRevision: nextRevision,
        profileRevision: state.profileRevision,
        sourceHash: state.sourceHash,
        fieldIds: fields,
        expiresAt: Timestamp.fromMillis(payload.expiresAt),
        createdAt: now,
      };
      if (!validateEventRuntimeDataRequestDocument(request) ||
          !validateEventRuntimeDataRequestReceiptDocument(receipt)) {
        throw invalidSource();
      }
      tx.set(this.db.collection(RUNTIME_DATA_REQUESTS)
        .doc(state.requestId), request);
      tx.create(receiptRef, receipt);
      state.request = request;
      return {outcome: "applied", operationRevision: nextRevision,
        view: project(state)};
    });
  }

  private async read(tx: Transaction, context: LiveContext,
    attendeeId: string): Promise<RequiredDataState> {
    if (!documentId(attendeeId)) throw invalidSource();
    const requestId = requiredDataRequestId(context, attendeeId);
    const [eventSnap, planSnap, attendeeSnap, requestSnap] = await tx.getAll(
      this.db.collection("events").doc(context.eventId),
      this.db.collection("eventSuccessPlans").doc(context.eventId),
      this.db.collection("eventAttendees").doc(attendeeId),
      this.db.collection(RUNTIME_DATA_REQUESTS).doc(requestId),
    );
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    const planValue = planSnap.data();
    if (!validateEventDocument(event) ||
        !validateEventAttendeeDocument(attendee) ||
        (planValue !== undefined &&
          !validateEventSuccessPlanDocument(planValue))) throw invalidSource();
    const typedEvent = event as unknown as EventDocument;
    const typedAttendee = attendee as unknown as EventAttendeeDocument;
    const organizerId = typedEvent.organizerId;
    if (organizerId !== context.organizerId ||
        typedAttendee.eventId !== context.eventId ||
        typedAttendee.organizerId !== context.organizerId ||
        !typedAttendee.linkedUid ||
        typedAttendee.status === "cancelled" ||
        typedEvent.status === "cancelled" ||
        typedEvent.runtimeAccess?.enabled !== true) throw invalidSource();
    const participantSnap = await tx.get(this.db
      .collection("eventRuntimeParticipants")
      .doc(`${context.eventId}_${typedAttendee.linkedUid}`));
    const participantValue = participantSnap.data();
    if (!validateEventRuntimeParticipantDocument(participantValue)) {
      throw invalidSource();
    }
    const participant = participantValue as unknown as ParticipantDocument;
    if (participant.eventId !== context.eventId ||
        participant.organizerId !== context.organizerId ||
        participant.uid !== typedAttendee.linkedUid ||
        participant.eventAttendeeId !== attendeeId ||
        participant.accessStatus === "pendingApproval" ||
        participant.accessStatus === "revoked" ||
        participant.accessStatus === "optedOut") throw invalidSource();
    const plan = (planValue ?? null) as EventSuccessPlanDocument | null;
    const profileRevision = participant.profileRevision ?? 0;
    const completedFieldIds = completedRuntimeFieldIds(
      participant.runtimeProfile);
    const requiredFieldIds = requiredRuntimeFieldIds(typedEvent, plan);
    const availableFieldIds = uniqueFields([
      ...requiredFieldIds,
      ...optionalRuntimeFieldIds(typedEvent, plan),
    ]);
    const eventEnd = millis(typedEvent.endTime);
    const sourceHash = operationContentHash([
      context,
      attendeeId,
      typedEvent.eventFormat,
      typedEvent.runtimeAccess,
      plan?.selectedModuleIds ?? [],
      plan?.questionnaireConfig ?? null,
      typedAttendee.status,
      typedAttendee.attendanceRevision ?? 0,
      participant.uid,
      participant.eventAttendeeId,
      profileRevision,
      participant.runtimeProfile,
      availableFieldIds,
      completedFieldIds,
    ]);
    let request: RequestDocument | null = null;
    if (requestSnap.exists) {
      const value = requestSnap.data();
      if (!validateEventRuntimeDataRequestDocument(value) ||
          value.requestId !== requestId ||
          value.eventId !== context.eventId ||
          value.organizerId !== context.organizerId ||
          value.attendeeId !== attendeeId ||
          value.uid !== participant.uid ||
          millis(value.updatedAt) > this.clock()) throw invalidSource();
      request = value as unknown as RequestDocument;
    }
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0 || eventEnd <= now) {
      throw invalidSource();
    }
    if (request) projectRequest(request, completedFieldIds, now);
    return {now, context, participant, sourceHash,
      profileRevision, availableFieldIds, requiredFieldIds, completedFieldIds,
      eventEnd,
      request, requestId};
  }
}

/** Bounded guest projection; the current request document remains private. */
export async function readRuntimeDataRequestProjection(params: {
  db: Firestore;
  context: LiveContext;
  attendeeId: string;
  uid: string;
  completedFieldIds: RuntimeFieldId[];
  now: number;
}): Promise<RuntimeDataRequestProjection | null> {
  const requestId = requiredDataRequestId(params.context, params.attendeeId);
  const snap = await params.db.collection(RUNTIME_DATA_REQUESTS)
    .doc(requestId).get();
  if (!snap.exists) return null;
  const request = requireCurrentRequest(snap.data(), requestId,
    params.context, params.attendeeId, params.uid);
  return projectRequest(request, params.completedFieldIds, params.now);
}

/** Reconciles request completion inside the accepted profile transaction. */
export async function reconcileRuntimeDataRequest(params: {
  db: Firestore;
  tx: Transaction;
  context: LiveContext;
  attendeeId: string;
  uid: string;
  completedFieldIds: RuntimeFieldId[];
  now: Timestamp;
}): Promise<void> {
  const requestId = requiredDataRequestId(params.context, params.attendeeId);
  const reference = params.db.collection(RUNTIME_DATA_REQUESTS).doc(requestId);
  const snap = await params.tx.get(reference);
  if (!snap.exists) return;
  const request = requireCurrentRequest(snap.data(), requestId,
    params.context, params.attendeeId, params.uid);
  const completedFieldIds = request.fieldIds.filter((field) =>
    params.completedFieldIds.includes(field));
  const complete = completedFieldIds.length === request.fieldIds.length;
  if (request.status === (complete ? "completed" : "pending") &&
      arraysEqual(request.completedFieldIds, completedFieldIds)) return;
  const next: RequestDocument = {...request, completedFieldIds,
    status: complete ? "completed" : "pending",
    completedAt: complete ? request.completedAt ?? params.now : null,
    updatedAt: params.now};
  if (!validateEventRuntimeDataRequestDocument(next)) throw invalidSource();
  params.tx.set(reference, next);
}

export function requiredDataRequestId(context: LiveContext,
  attendeeId: string): string {
  return "runtime-data:" + operationContentHash([context, attendeeId]);
}

function requiredDataReceiptId(context: LiveContext, attendeeId: string,
  operationId: string): string {
  return "runtime-data-action:" + operationContentHash([
    context, attendeeId, operationId,
  ]);
}

function project(state: RequiredDataState): RuntimeRequiredDataView {
  const request = state.request;
  return {
    context: state.context,
    attendeeId: state.participant.eventAttendeeId!,
    serverTime: state.now,
    sourceHash: state.sourceHash,
    profileRevision: state.profileRevision,
    requestRevision: request?.revision ?? 0,
    validUntil: state.eventEnd,
    requiredFieldIds: state.requiredFieldIds,
    availableFieldIds: state.availableFieldIds,
    completedFieldIds: state.completedFieldIds,
    request: request ? projectRequest(request, state.completedFieldIds,
      state.now) : null,
  };
}

function projectRequest(request: RequestDocument,
  currentCompletedFields: readonly RuntimeFieldId[],
  now: number): RuntimeDataRequestProjection {
  const completed = request.fieldIds.filter((field) =>
    currentCompletedFields.includes(field));
  const completedFieldIds = uniqueFields([
    ...request.completedFieldIds, ...completed,
  ]);
  const requestedAt = millis(request.requestedAt);
  const updatedAt = millis(request.updatedAt);
  const expiresAt = millis(request.expiresAt);
  if (requestedAt > updatedAt || updatedAt > now ||
      expiresAt <= requestedAt) throw invalidSource();
  const status = completedFieldIds.length === request.fieldIds.length ?
    "completed" as const : expiresAt <= now ?
      "expired" as const : "pending" as const;
  return {revision: request.revision, fieldIds: request.fieldIds,
    completedFieldIds, status,
    requestedAt,
    expiresAt,
    completedAt: request.completedAt ? millis(request.completedAt) : null};
}

function requireCurrentRequest(value: unknown, requestId: string,
  context: LiveContext, attendeeId: string, uid: string): RequestDocument {
  if (!validateEventRuntimeDataRequestDocument(value) ||
      value.requestId !== requestId || value.eventId !== context.eventId ||
      value.organizerId !== context.organizerId ||
      value.attendeeId !== attendeeId || value.uid !== uid) {
    throw invalidSource();
  }
  return value as unknown as RequestDocument;
}

function canonicalFields(fields: readonly RuntimeFieldId[],
  allowed: readonly RuntimeFieldId[]): RuntimeFieldId[] {
  const requested = new Set(fields);
  return allowed.filter((field) => requested.has(field));
}

function uniqueFields(fields: readonly RuntimeFieldId[]): RuntimeFieldId[] {
  return [...new Set(fields)];
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) =>
    value === right[index]);
}

function millis(value: unknown): number {
  const timestamp = value as {toMillis?: () => number; _seconds?: number;
    _nanoseconds?: number};
  const result = timestamp?.toMillis?.() ??
    (Number.isSafeInteger(timestamp?._seconds) &&
      Number.isInteger(timestamp?._nanoseconds) ?
      timestamp._seconds! * 1000 + Math.floor(timestamp._nanoseconds! / 1e6) :
      NaN);
  if (!Number.isSafeInteger(result) || result < 0) throw invalidSource();
  return result;
}

function documentId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
}

function conflict(): HttpsError {
  return new HttpsError("aborted",
    "Required guest information changed. Review it again.");
}

function invalidSource(): HttpsError {
  return new HttpsError("failed-precondition",
    "Required guest information is unavailable.");
}
