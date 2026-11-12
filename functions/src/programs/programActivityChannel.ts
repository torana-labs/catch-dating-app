import {DELIVERY_MESSAGES} from "../delivery/deliveryMessages";
import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {Message} from "firebase-admin/messaging";
import {operationContentHash} from "../operations/durableActions";
import {runDeliveryTransaction, type DeliveryPermit} from
  "../delivery/firestoreDeliveryOutbox";
import {momentFromDocument, programMomentStaffDeadline,
  runFromDocument} from "../moments/momentDocuments";
import {isTravelOccurrence} from "../moments/momentConditions";
import type {MomentDefinition} from "../moments/momentModel";
import {programStaffGrantId} from "../shared/programAuthority";
import {newestPushToken, pushInstallationsQuery} from
  "../shared/consumerPushToken";
import {activityNotificationId, allowsPushPreference, buildFcmMessage,
  setActivityNotificationInTransaction,
  type ActivityNotificationType, type NotificationPreference} from
  "../shared/notifications";
import {activityNotificationDocumentSchema} from
  "../shared/generated/schemas/activityNotificationDocument";
import type {OrganizerProgramDocument, ProgramStaffGrantDocument,
  UserProfileDocument} from "../shared/generated/firestoreAdminTypes";
import type {ProgramDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/programDeliveryMessageIntent";
import {parseProgramDeliveryRecord, type DeliveryAttempt,
  type ProgramDeliveryFacts, type ProviderBinding} from "./programDelivery";
import type {PreparedProgramChannel, ProgramDeliveryOutbox,
  ProgramChannelDispatchResult} from "./programDeliveryWorker";

export type ProgramFcmSender = (message: Message) => Promise<string>;
type Descriptor = NonNullable<MessageIntent["activity"]>;
const FACT_WINDOW_MS = 120_000;

export function programActivityDescriptor(moment: MomentDefinition):
  Descriptor {
  if (moment.scope.kind !== "program" ||
      moment.initiation.kind !== "triggered" ||
      moment.audience.kind !== "staffDuty") {
    throw new Error("Program activity requires triggered staff audience");
  }
  const common = {appRole: "host" as const,
    audienceDuty: moment.audience.duty,
    scopeIds: moment.audience.scopeIds === null ? null :
      [...moment.audience.scopeIds]};
  const action = moment.action;
  if (action.kind === "push") {
    return {...common, actionKind: "push",
      notificationType: action.notificationType,
      preferenceKey: action.preferenceKey};
  }
  if (action.kind === "staffAttention") {
    return {...common, actionKind: "staffAttention", actionDuty: action.duty,
      severity: action.severity};
  }
  throw new Error("Program activity requires push or staff attention");
}

function activityType(intent: MessageIntent): ActivityNotificationType {
  const type = intent.activity?.actionKind === "push" ?
    intent.activity.notificationType : "organizerUpdate";
  const properties = activityNotificationDocumentSchema.properties as
    {type: {enum: readonly string[]}};
  return properties.type.enum.includes(type) ?
    type as ActivityNotificationType : "organizerUpdate";
}

function notificationId(intent: MessageIntent): string {
  const source = intent.activity?.actionKind === "staffAttention" ?
    `${intent.workflow.runId}_${intent.recipient.recipientKey}` :
    intent.workflow.runId;
  return activityNotificationId(activityType(intent), source);
}

interface ActivityFacts {
  facts: ProgramDeliveryFacts;
  token: string | null;
}

async function readActivityFacts(tx: Transaction, db: Firestore,
  intent: MessageIntent, now: number): Promise<ActivityFacts> {
  const stop = (reason: string): ActivityFacts => ({token: null,
    facts: {gate: {kind: "stop", reason}, routes: []}});
  if (!intent.activity || intent.recipient.kind !== "staff") {
    return stop("recipientWithdrawn");
  }
  const uid = intent.recipient.recipientKey;
  const grantId = programStaffGrantId(intent.programId, uid);
  const [programSnap, momentSnap, runSnap, grantSnap, userSnap, deleted,
    installations] = await Promise.all([
    tx.get(db.collection("organizerPrograms").doc(intent.programId)),
    tx.get(db.collection("organizerMoments").doc(intent.workflow.momentId)),
    tx.get(db.collection("organizerMomentRuns").doc(intent.workflow.runId)),
    tx.get(db.collection("programStaffGrants").doc(grantId)),
    tx.get(db.collection("users").doc(uid)),
    tx.get(db.collection("deletedUsers").doc(uid)),
    tx.get(pushInstallationsQuery(db, uid)),
  ]);
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  if (!program || program.organizerId !== intent.context.organizerId ||
      !["active", "draft"].includes(program.status)) {
    return stop("programEnded");
  }
  const moment = momentSnap.exists ? momentFromDocument(momentSnap.data()!) :
    null;
  if (!moment || moment.momentId !== intent.workflow.momentId ||
      moment.scope.kind !== "program" ||
      moment.scope.programId !== intent.programId ||
      moment.status !== "armed" ||
      moment.revision !== intent.instructionRevision ||
      moment.initiation.kind !== "triggered" ||
      moment.audience.kind !== "staffDuty" ||
      (moment.action.kind !== "push" &&
        moment.action.kind !== "staffAttention") ||
      operationContentHash(programActivityDescriptor(moment)) !==
        operationContentHash(intent.activity)) return stop("superseded");
  const run = runSnap.exists ? runFromDocument(runSnap.data()!) : null;
  if (!run || run.runId !== intent.workflow.runId ||
      run.momentId !== moment.momentId || !isTravelOccurrence(run.runId) ||
      run.status !== "planned" || !run.travelOccurrence ||
      run.travelOccurrence.momentRevision !== intent.instructionRevision ||
      run.travelOccurrence.createdAtMillis !== intent.createdAt ||
      run.expiresAtMillis !== intent.expiresAt) return stop("superseded");
  if (run.targetFunctionId) {
    const target = (await tx.get(db.collection("programFunctions")
      .doc(run.targetFunctionId))).data();
    if (!target || target.programId !== intent.programId ||
        target.organizerId !== intent.context.organizerId ||
        target.status === "cancelled") return stop("superseded");
  }
  const grant = grantSnap.data() as ProgramStaffGrantDocument | undefined;
  const deadline = grant ? programMomentStaffDeadline(program, grant,
    grantId, intent.programId, uid, {duty: intent.activity.audienceDuty,
      scopeIds: intent.activity.scopeIds}, now) : null;
  const user = userSnap.data() as UserProfileDocument | undefined;
  if (deadline === null || deleted.exists || user?.deleted === true) {
    return stop("permissionRevoked");
  }
  const allowed = intent.activity.actionKind === "staffAttention" ||
    allowsPushPreference(user,
      intent.activity.preferenceKey as NotificationPreference) === true;
  // Staff activity is a Host-app notification.
  const hostToken = newestPushToken(installations.docs.map((row) =>
    row.data()), "host");
  const token = allowed ? hostToken : null;
  const validUntil = Math.min(now + FACT_WINDOW_MS, deadline, intent.expiresAt);
  const binding: ProviderBinding = {
    routeId: "catchProgramActivity", transport: "catchApp",
    senderIdentity: "catchPlatform", provider: token ? "fcm" : "catchActivity",
    senderId: "catch-program-activity", bindingRevision: 1,
    recipientEndpointId: (token ? "fcm:" : "activity:") +
      operationContentHash(token ?? uid), fallbackOwner: "catch",
    ...(!token ? {pushSuppressionReason: hostToken ?
      "preferenceOff" as const : "noEndpoint" as const} : {}),
  };
  return {token, facts: {gate: {kind: "allow", checkedAt: now, validUntil,
    instructionRevision: moment.revision}, routes: [{
    routeId: "catchProgramActivity", state: {kind: "eligible",
      checkedAt: now, validUntil,
      permissionRevision: operationContentHash([program.revision,
        program.createdBy, grant!.revision, deadline,
        intent.activity, binding]),
      candidate: {mode: "live", binding}},
  }]}};
}

/** No credential/provider I/O while preparing or reading claim authority. */
export function prepareProgramActivityChannel(db: Firestore,
  intent: MessageIntent, send: ProgramFcmSender,
  clock: () => number): PreparedProgramChannel {
  if (!intent.activity) {
    return {kind: "unavailable", reason: "senderUnavailable"};
  }
  return {kind: "ready", routeId: "catchProgramActivity",
    readFacts: async (tx, current, now) =>
      (await readActivityFacts(tx, db, current, now)).facts,
    dispatchReserved: (outbox, messageId, attemptId) =>
      dispatchActivity(db, intent, outbox, messageId, attemptId, send, clock)};
}

async function dispatchActivity(db: Firestore, intent: MessageIntent,
  outbox: ProgramDeliveryOutbox, messageId: string, attemptId: string,
  send: ProgramFcmSender, clock: () => number):
  Promise<ProgramChannelDispatchResult> {
  const uid = intent.recipient.recipientKey;
  const id = notificationId(intent);
  const activityRef = db.collection("notifications").doc(uid)
    .collection("items").doc(id);
  const claim = await outbox.claimLiveDispatch<{message: Message | null}>(
    messageId, attemptId, async (tx, record, attempt, now) => {
      const current = await readActivityFacts(tx, db, intent, now);
      const existing = await tx.get(activityRef);
      const binding = current.facts.routes[0]?.state;
      if (current.facts.gate.kind !== "allow" ||
          binding?.kind !== "eligible" ||
          binding.candidate.mode !== "live" ||
          operationContentHash(binding.candidate.binding) !==
            operationContentHash(attempt.binding)) return {kind: "withheld"};
      // Encoding and fallible preparation precede the unknown claim.
      const message = current.token ? buildFcmMessage({token: current.token,
        title: intent.title, body: intent.body,
        type: intent.activity!.actionKind === "push" ?
          intent.activity!.notificationType : "organizerUpdate",
        notificationId: id, recipientUid: uid, appRole: "host"}) : null;
      return {kind: "ready", value: {message},
        validUntil: current.facts.gate.validUntil,
        commit: () => {
          if (!existing.exists) {
            setActivityNotificationInTransaction(tx, db, {
              id, uid, type: activityType(intent), title: intent.title,
              body: intent.body, createdAt: admin.firestore.Timestamp
                .fromMillis(record.intent.createdAt),
            });
          }
        }};
    });
  if (claim.kind === "withheld") {
    return {kind: "withheld", reason: claim.reason};
  }
  if (clock() >= claim.permit.validUntil && claim.resource.message !== null) {
    await outbox.recordExpiredBeforeSend(claim.permit);
    return {kind: "withheld", reason: "permitExpired"};
  }
  let providerMessageId: string;
  if (claim.resource.message) {
    let unknown = false;
    providerMessageId = "";
    try {
      providerMessageId = await send(claim.resource.message);
      unknown = typeof providerMessageId !== "string" || !providerMessageId;
    } catch {
      // SDK retries make a final error insufficient proof of a safe resend.
      unknown = true;
    }
    if (unknown) {
      await settleSdkUnknown(db, claim.permit, clock);
      return {kind: "submitted", outcome: {kind: "unknown"}};
    }
  } else {
    // This receipt names committed local work, never an invented FCM message.
    providerMessageId = activityRef.path;
  }
  const at = clock();
  const attempt = claim.permit.attempt;
  await outbox.recordReceipt(messageId, {attemptId, ...attempt.binding,
    providerEventId: "program-activity:" + operationContentHash([
      attemptId, providerMessageId]), receivedAt: at,
    state: {kind: claim.resource.message ? "accepted" : "delivered",
      at, providerMessageId}});
  return claim.resource.message ?
    {kind: "submitted", outcome: {kind: "accepted", providerMessageId}} :
    {kind: "submitted", outcome: {kind: "activityRecorded",
      reason: attempt.binding.routeId === "catchProgramActivity" ?
        attempt.binding.pushSuppressionReason! : "noEndpoint"}};
}

/** This worker observed the SDK promise settle, without acceptance evidence.
 * A crash or failed receipt write remains workerInterrupted: expiry alone
 * cannot prove no invocation remains in flight. Such runs stay planned for
 * reconciliation, never another send, even beyond their original window.
 */
async function settleSdkUnknown(db: Firestore,
  permit: DeliveryPermit<MessageIntent, DeliveryAttempt>,
  clock: () => number): Promise<void> {
  await runDeliveryTransaction(db, async (tx) => {
    const ref = db.collection(DELIVERY_MESSAGES).doc(permit.messageId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new Error("Program activity record disappeared");
    }
    const record = parseProgramDeliveryRecord(snapshot.data());
    const attempt = record.attempts.find((a) =>
      a.attemptId === permit.attempt.attemptId);
    if (record.messageId !== permit.messageId ||
        record.lifecycle !== "active" || record.deliveryConflict ||
        operationContentHash(record.intent) !==
          operationContentHash(permit.intent) ||
        !attempt || record.attempts.at(-1) !== attempt ||
        attempt.mode !== "live" ||
        attempt.binding.routeId !== "catchProgramActivity" ||
        attempt.binding.provider !== "fcm" ||
        attempt.state.kind !== "unknown" ||
        attempt.state.reason !== "workerInterrupted" ||
        operationContentHash(attempt) !==
          operationContentHash(permit.attempt)) {
      return;
    }
    const at = clock();
    if (!Number.isSafeInteger(at) || at < record.updatedAt) {
      throw new Error("Program activity settlement clock moved backwards");
    }
    const next = parseProgramDeliveryRecord({...record,
      revision: record.revision + 1, updatedAt: at,
      attempts: record.attempts.map((value) => value !== attempt ? value :
        {...attempt, state: {...attempt.state, at,
          reason: "sdkOutcomeUnknown", reconcileAfter: at}})});
    tx.set(ref, next);
  });
}
