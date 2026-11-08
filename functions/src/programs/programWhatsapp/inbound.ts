/* firestore-index: organizerSenderConnections (
  organizerId:ASCENDING,
  channel:ASCENDING,
  status:ASCENDING
) */
import type {
  OrganizerMessagingWebhookEventDocument,
  OrganizerProgramDocument,
  ProgramHouseholdDocument,
  ProgramWhatsappEndpointIndexDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {readEndpointIndex} from "./endpointIndex";
import {
  programWhatsappThreadId,
  programWhatsappUnknownThreadId,
} from "./ids";
import {persistProgramInboundMessage, type ProgramThreadTarget} from
  "./threads";

// Inbound routing (lane W1): the organiser webhook resolved the sender
// connection from phone_number_id; this resolves the programme and the
// household before any CRM matching.

const PROGRAM_SCAN_LIMIT = 50;

export type ProgramInboundRoute =
  | {kind: "routed"; target: ProgramThreadTarget; messageId: string | null}
  | {kind: "stop"; householdIds: string[]}
  | {kind: "notProgramme"};

interface CandidateProgram {
  programId: string;
  program: OrganizerProgramDocument;
  bound: boolean;
}

function live(program: OrganizerProgramDocument): boolean {
  return program.status === "active" || program.status === "draft";
}

/**
 * Programmes this number serves: those bound to the connection; when none
 * is, the organiser's unbound programmes, provided this connection is the
 * organiser's first active WhatsApp sender (the pre-binding fallback that
 * moments already use).
 */
export async function candidatePrograms(db: FirebaseFirestore.Firestore,
  organizerId: string, connectionId: string): Promise<CandidateProgram[]> {
  const bound = await db.collection("organizerPrograms")
    .where("whatsappSenderConnectionId", "==", connectionId)
    .limit(PROGRAM_SCAN_LIMIT).get();
  const boundPrograms = bound.docs.map((doc) => ({programId: doc.id,
    program: doc.data() as OrganizerProgramDocument, bound: true}))
    .filter((entry) => entry.program.organizerId === organizerId &&
      live(entry.program));
  if (boundPrograms.length > 0) return boundPrograms;
  const firstActive = await db.collection("organizerSenderConnections")
    .where("organizerId", "==", organizerId)
    .where("channel", "==", "whatsapp")
    .where("status", "==", "active")
    .limit(1).get();
  if (firstActive.docs[0]?.id !== connectionId) return [];
  const owned = await db.collection("organizerPrograms")
    .where("organizerId", "==", organizerId)
    .limit(PROGRAM_SCAN_LIMIT).get();
  return owned.docs.map((doc) => ({programId: doc.id,
    program: doc.data() as OrganizerProgramDocument, bound: false}))
    .filter((entry) => live(entry.program) &&
      !entry.program.whatsappSenderConnectionId);
}

/** Resolves one inbound message to a programme thread, if it is a guest's. */
export async function resolveProgramInbound(db: FirebaseFirestore.Firestore,
  event: OrganizerMessagingWebhookEventDocument): Promise<{
    candidates: CandidateProgram[];
    matches: {candidate: CandidateProgram;
      index: ProgramWhatsappEndpointIndexDocument}[];
  }> {
  if (!event.organizerId || !event.connectionId || !event.endpointHash) {
    return {candidates: [], matches: []};
  }
  const candidates = await candidatePrograms(db, event.organizerId,
    event.connectionId);
  const indexes = await Promise.all(candidates.map((candidate) =>
    readEndpointIndex(db, candidate.programId, event.endpointHash!)));
  const matches = candidates.flatMap((candidate, position) => {
    const index = indexes[position];
    return index && index.organizerId === event.organizerId ?
      [{candidate, index}] : [];
  });
  // The soonest live wedding wins when one guest is in several.
  matches.sort((a, b) =>
    a.candidate.program.startsAt.toMillis() -
      b.candidate.program.startsAt.toMillis() ||
    a.candidate.programId.localeCompare(b.candidate.programId));
  return {candidates, matches};
}

/**
 * Household before CRM. A known guest's message lands in their household's
 * thread; an unknown number lands in an unknown-sender thread when exactly
 * one programme uses this number. A STOP routes nothing: it revokes the
 * household's messaging consent and falls through to the unchanged
 * organiser suppression path.
 */
export async function routeProgramWhatsappInbound(
  db: FirebaseFirestore.Firestore,
  event: OrganizerMessagingWebhookEventDocument,
  now: FirebaseFirestore.Timestamp,
): Promise<ProgramInboundRoute> {
  if (event.eventKind !== "inbound" || !event.providerMessageId) {
    return {kind: "notProgramme"};
  }
  const {candidates, matches} = await resolveProgramInbound(db, event);
  if (candidates.length === 0) return {kind: "notProgramme"};
  if (event.isStop) {
    const householdIds = [...new Set(matches.map((m) => m.index.householdId))];
    for (const householdId of householdIds) {
      await revokeHouseholdConsent(db, householdId, now);
    }
    return {kind: "stop", householdIds};
  }
  const known = matches.find((match) => !match.index.ambiguous);
  let target: ProgramThreadTarget | null = null;
  if (known) {
    target = {
      threadId: programWhatsappThreadId(known.candidate.programId,
        known.index.householdId),
      programId: known.candidate.programId,
      organizerId: known.candidate.program.organizerId,
      householdId: known.index.householdId,
      guestId: known.index.guestId,
      unknownSender: false,
    };
  } else {
    const scope = matches[0]?.candidate ??
      (candidates.length === 1 ? candidates[0] : null);
    if (scope) {
      target = {
        threadId: programWhatsappUnknownThreadId(scope.programId,
          event.endpointHash!),
        programId: scope.programId,
        organizerId: scope.program.organizerId,
        householdId: null,
        guestId: null,
        unknownSender: true,
      };
    }
  }
  if (!target) return {kind: "notProgramme"};
  const messageId = await persistProgramInboundMessage({db, target, event,
    nowMillis: now.toMillis()});
  return {kind: "routed", target, messageId};
}

/** Same consent record the campaign-recipient STOP path writes. */
async function revokeHouseholdConsent(db: FirebaseFirestore.Firestore,
  householdId: string, now: FirebaseFirestore.Timestamp): Promise<void> {
  const ref = db.collection("programHouseholds").doc(householdId);
  await db.runTransaction(async (tx) => {
    const household = (await tx.get(ref)).data() as
      ProgramHouseholdDocument | undefined;
    if (!household || household.messagingConsent?.granted === false) return;
    tx.update(ref, {
      messagingConsent: {granted: false, grantedAt: now,
        source: "whatsappStop"},
      updatedAt: now,
      revision: (household.revision ?? 0) + 1,
    });
  });
}
