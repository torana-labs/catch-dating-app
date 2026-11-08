import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {validateCallableWithAjv} from "../../shared/validation";
import {hashRequest} from "../../shared/programOperationHash";
import {
  requireProgramAccess,
  requireProgramMutable,
} from "../../shared/programAuthority";
import type {
  OrganizerProgramDocument,
  OrganizerSenderConnectionDocument,
  ProgramAssistantSettingsDocument,
  ProgramStaffGrantDocument,
} from "../../shared/generated/firestoreAdminTypes";
import type {GetProgramAssistantSettingsCallablePayload} from
  "../../shared/generated/getProgramAssistantSettingsCallablePayload";
import type {UpdateProgramAssistantSettingsCallablePayload} from
  "../../shared/generated/updateProgramAssistantSettingsCallablePayload";
import type {ProgramAssistantSettingsCallableResponse} from
  "../../shared/generated/programAssistantSettingsCallableResponse";
import {validateGetProgramAssistantSettingsCallablePayload} from
  "../../shared/generated/validators/getProgramAssistantSettingsInput";
import {validateUpdateProgramAssistantSettingsCallablePayload} from
  "../../shared/generated/validators/updateProgramAssistantSettingsInput";
import {validateProgramAssistantSettingsCallableResponse} from
  "../../shared/generated/validators/programAssistantSettingsOutput";
import {validateProgramAssistantSettingsDocument} from
  "../../shared/generated/validators/programAssistantSettingsDocument";
import {
  defaultProgramInboxDeps,
  requireSettingsAccess,
  requireValid,
  type ProgramInboxDeps,
} from "./access";
import {PROGRAM_ASSISTANT_SETTINGS} from "./ids";

// Assistant settings storage (shared with lane W2, which reads them through
// readProgramAssistantSettings). The settings screen also shows the
// wedding's number and the staff who can take escalations.

export type AssistantSettings = Pick<ProgramAssistantSettingsDocument,
  "enabled" | "languages" | "replyWithin" | "escalationStaffUids" |
  "neverDoes" | "tone" | "dailyTokenBudget" | "answerTopics" |
  "attachmentReads">;

/** The fixed list; clients can read it but never change it. */
export const ASSISTANT_NEVER_DOES: AssistantSettings["neverDoes"] = [
  "sharesOtherGuests", "promisesChanges", "handlesPayments",
  "givesMedicalOrLegalAdvice", "sharesStaffContacts",
];

/** What a programme without a settings document runs on. */
export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: false,
  languages: ["en", "hi"],
  replyWithin: "fourHours",
  escalationStaffUids: [],
  neverDoes: ASSISTANT_NEVER_DOES,
  tone: "warm",
  dailyTokenBudget: 200000,
  answerTopics: ["schedule", "venues", "dressCode", "travel", "stay", "rsvp"],
  attachmentReads: [],
};

/** Lane W2's read: the stored settings or the defaults, never null. */
export async function readProgramAssistantSettings(
  db: FirebaseFirestore.Firestore, programId: string):
  Promise<AssistantSettings & {revision: number; usesDefaults: boolean}> {
  const data = (await db.collection(PROGRAM_ASSISTANT_SETTINGS).doc(programId)
    .get()).data() as ProgramAssistantSettingsDocument | undefined;
  if (!data || data.programId !== programId) {
    return {...DEFAULT_ASSISTANT_SETTINGS, revision: 0, usesDefaults: true};
  }
  return {...pickSettings(data), neverDoes: ASSISTANT_NEVER_DOES,
    revision: data.revision, usesDefaults: false};
}

function pickSettings(data: AssistantSettings): AssistantSettings {
  return {enabled: data.enabled, languages: data.languages,
    replyWithin: data.replyWithin,
    escalationStaffUids: data.escalationStaffUids,
    neverDoes: data.neverDoes, tone: data.tone,
    dailyTokenBudget: data.dailyTokenBudget,
    answerTopics: data.answerTopics, attachmentReads: data.attachmentReads};
}

/** The bound number, else the organiser's first active WhatsApp sender. */
export async function resolveProgramSender(db: FirebaseFirestore.Firestore,
  program: OrganizerProgramDocument):
  Promise<ProgramAssistantSettingsCallableResponse["sender"]> {
  if (program.whatsappSenderConnectionId) {
    const snap = await db.collection("organizerSenderConnections")
      .doc(program.whatsappSenderConnectionId).get();
    const connection = snap.data() as OrganizerSenderConnectionDocument |
      undefined;
    return connection && connection.organizerId === program.organizerId ?
      senderView(snap.id, connection, true) : null;
  }
  const snap = await db.collection("organizerSenderConnections")
    .where("organizerId", "==", program.organizerId)
    .where("channel", "==", "whatsapp")
    .where("status", "==", "active")
    .limit(1).get();
  const doc = snap.docs[0];
  return doc ? senderView(doc.id,
    doc.data() as OrganizerSenderConnectionDocument, false) : null;
}

function senderView(connectionId: string,
  connection: OrganizerSenderConnectionDocument, bound: boolean):
  NonNullable<ProgramAssistantSettingsCallableResponse["sender"]> {
  return {connectionId,
    displayPhoneNumber: connection.displayPhoneNumber ?? null,
    verifiedName: connection.verifiedName ?? null,
    status: connection.status, boundToProgramme: bound};
}

async function activeStaff(db: FirebaseFirestore.Firestore,
  programId: string, nowMillis: number): Promise<
  ProgramAssistantSettingsCallableResponse["staff"]> {
  const snap = await db.collection("programStaffGrants")
    .where("programId", "==", programId)
    .where("status", "==", "active").limit(100).get();
  return snap.docs.map((doc) => doc.data() as ProgramStaffGrantDocument)
    .filter((grant) => grant.revokedAt == null &&
      millisOf(grant.expiresAt) > nowMillis)
    .map((grant) => ({uid: grant.uid,
      displayName: grant.displayName ?? null}))
    .sort((a, b) => (a.displayName ?? a.uid)
      .localeCompare(b.displayName ?? b.uid));
}

function millisOf(value: unknown): number {
  if (typeof value === "number") return value;
  const stamp = value as {toMillis?: () => number} | null;
  return typeof stamp?.toMillis === "function" ? stamp.toMillis() : 0;
}

async function settingsResponse(db: FirebaseFirestore.Firestore,
  programId: string, program: OrganizerProgramDocument, nowMillis: number):
  Promise<ProgramAssistantSettingsCallableResponse> {
  const [settings, sender, staff] = await Promise.all([
    readProgramAssistantSettings(db, programId),
    resolveProgramSender(db, program),
    activeStaff(db, programId, nowMillis),
  ]);
  return requireValid(validateProgramAssistantSettingsCallableResponse, {
    programId, ...pickSettings(settings), revision: settings.revision,
    usesDefaults: settings.usesDefaults, sender, staff,
  }, "assistant settings");
}

export async function getProgramAssistantSettingsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramAssistantSettingsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetProgramAssistantSettingsCallablePayload>(request,
      validateGetProgramAssistantSettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramAssistantSettings",
    {maxRequests: 60, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireSettingsAccess(access);
  return settingsResponse(db, data.programId, access.program,
    deps.now().toMillis());
}

export async function updateProgramAssistantSettingsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramAssistantSettingsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    UpdateProgramAssistantSettingsCallablePayload>(request,
      validateUpdateProgramAssistantSettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updateProgramAssistantSettings",
    {maxRequests: 30, windowMs: 60 * 1000});
  const {programId, expectedRevision, requestId, ...changes} = data;
  const requestHash = hashRequest({op: "updateProgramAssistantSettings",
    programId, expectedRevision, ...changes});
  const ref = db.collection(PROGRAM_ASSISTANT_SETTINGS).doc(programId);
  const program = await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({db, programId, actorUid,
      now: deps.now(), transaction: tx});
    requireSettingsAccess(access);
    requireProgramMutable(access.program);
    const current = (await tx.get(ref)).data() as
      ProgramAssistantSettingsDocument | undefined;
    if (current && current.lastRequestId === requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return access.program;
    }
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new HttpsError("aborted",
        "Someone else changed these settings.",
        {reason: "staleRevision", revision: current?.revision ?? 0});
    }
    const nowMillis = deps.now().toMillis();
    if (changes.escalationStaffUids?.length) {
      const grants = await Promise.all(changes.escalationStaffUids
        .filter((uid) => uid !== access.program.createdBy)
        .map((uid) => tx.get(db.collection("programStaffGrants")
          .doc(`${programId}__${uid}`))));
      for (const snap of grants) {
        const grant = snap.data() as ProgramStaffGrantDocument | undefined;
        if (!grant || grant.programId !== programId ||
            grant.status !== "active" || grant.revokedAt != null ||
            millisOf(grant.expiresAt) <= nowMillis) {
          throw new HttpsError("invalid-argument",
            "Escalations can only go to the programme's active staff.");
        }
      }
    }
    const base = current ? pickSettings(current) : DEFAULT_ASSISTANT_SETTINGS;
    const next: ProgramAssistantSettingsDocument = {
      programId,
      organizerId: access.program.organizerId,
      ...base,
      ...changes,
      neverDoes: ASSISTANT_NEVER_DOES,
      updatedByUid: actorUid,
      updatedAtMillis: nowMillis,
      revision: (current?.revision ?? 0) + 1,
      lastRequestId: requestId,
      lastRequestHash: requestHash,
    };
    tx.set(ref, requireValid(validateProgramAssistantSettingsDocument, next,
      "assistant settings"));
    return access.program;
  });
  return settingsResponse(db, programId, program, deps.now().toMillis());
}
