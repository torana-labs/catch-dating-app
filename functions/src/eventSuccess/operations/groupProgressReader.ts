import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {validateEventAssistanceGroupProgressDocument} from
  "../../shared/generated/validators/eventAssistanceGroupProgressDocument";
import type {MessageRecord} from "./messageOutbox";
import {requireDocumentId} from "./guestRecords";
import {membershipGuidanceIsCurrent} from "./membershipGuidance";
import {
  groupProgressSource, invalidSource, ProgressContext, progressIdentity,
  projectGroupProgress,
} from "./groupProgressSource";

export const GROUP_PROGRESS = "eventAssistanceGroupProgress";

/** Trusted reader. Client callers must separately authorize scope. */
export async function readGroupProgressState(db: Firestore, tx: Transaction,
  context: ProgressContext, groupId: string, clock: () => number) {
  requireDocumentId(context.organizerId);
  requireDocumentId(context.eventId);
  requireDocumentId(groupId);
  const progressId = progressIdentity(context, groupId);
  const [eventSnap, planSnap, progressSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventSuccessPlans").doc(context.eventId),
    db.collection(GROUP_PROGRESS).doc(progressId));
  const event = eventSnap.data();
  const plan = planSnap.data() ?? null;
  if (!validateEventDocument(event) ||
      event.organizerId !== context.organizerId ||
      (plan !== null && (!validateEventSuccessPlanDocument(plan) ||
        plan.eventId !== context.eventId ||
        (plan.organizerId) !== context.organizerId))) {
    throw invalidSource();
  }
  const progress = progressSnap.data() ?? null;
  const now = clock();
  if (!Number.isSafeInteger(now) || now < 0 || (progress !== null &&
      (!validateEventAssistanceGroupProgressDocument(progress) ||
        progress.progressId !== progressId || progress.groupId !== groupId ||
        progressIdentity(progress.context, progress.groupId) !== progressId ||
        progress.confirmedAt > now || progress.updatedAt > now ||
        progress.createdAt > progress.confirmedAt ||
        progress.confirmedAt !== progress.updatedAt))) throw invalidSource();
  const source = groupProgressSource({context, groupId, event, plan,
    eventGeneration: eventSnap.createTime,
    planGeneration: planSnap.createTime, now});
  return {source, progress, now, eventSnapshot: eventSnap};
}

/** A newer confirmation of identical directions does not stale a guest link. */
export async function joiningGuidanceIsCurrent(db: Firestore, tx: Transaction,
  intent: MessageRecord["intent"], now: number): Promise<boolean> {
  if (intent.kind !== "joiningUpdate") return true;
  if (intent.context.mode !== "live") return false;
  const groupId = intent.guidance.destination.kind === "groupCheckpoint" ?
    intent.guidance.destination.groupId : "event:whole";
  let state: Awaited<ReturnType<typeof readGroupProgressState>>;
  try {
    state = await readGroupProgressState(db, tx, intent.context, groupId,
      () => now);
  } catch (error) {
    // Invalid/missing operating source withholds guidance. Transport failures
    // still propagate so a temporary read failure cannot terminate delivery.
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      return false;
    }
    throw error;
  }
  const current = projectGroupProgress(state.source, state.progress, now)
    .guidance;
  if (!current || !await membershipGuidanceIsCurrent(db, tx, intent, now,
    state.eventSnapshot)) return false;
  const {revision, validUntil, ...material} = intent.guidance;
  const {revision: currentRevision, validUntil: currentUntil,
    ...currentMaterial} = current;
  return revision <= currentRevision && now < validUntil &&
    validUntil <= currentUntil &&
    operationContentHash(material) === operationContentHash(currentMaterial);
}
