import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {validateCallableWithAjv} from "../../shared/validation";
import {hashRequest} from "../../shared/programOperationHash";
import {
  requireProgramAccess,
  requireProgramMutable,
} from "../../shared/programAuthority";
import {assertOutboundContentAllowed} from
  "../../communications/outboundContentPolicy";
import type {
  ProgramWhatsappCannedReplyDocument,
} from "../../shared/generated/firestoreAdminTypes";
import type {ListProgramWhatsappCannedRepliesCallablePayload} from
  "../../shared/generated/listProgramWhatsappCannedRepliesCallablePayload";
import type {UpsertProgramWhatsappCannedReplyCallablePayload} from
  "../../shared/generated/upsertProgramWhatsappCannedReplyCallablePayload";
import type {ProgramWhatsappCannedRepliesCallableResponse} from
  "../../shared/generated/programWhatsappCannedRepliesCallableResponse";
import type {ProgramWhatsappCannedReplyCallableResponse} from
  "../../shared/generated/programWhatsappCannedReplyCallableResponse";
import {validateListProgramWhatsappCannedRepliesCallablePayload} from
  "../../shared/generated/validators/listProgramWhatsappCannedRepliesInput";
import {validateUpsertProgramWhatsappCannedReplyCallablePayload} from
  "../../shared/generated/validators/upsertProgramWhatsappCannedReplyInput";
import {validateProgramWhatsappCannedRepliesCallableResponse} from
  "../../shared/generated/validators/programWhatsappCannedRepliesOutput";
import {validateProgramWhatsappCannedReplyCallableResponse} from
  "../../shared/generated/validators/programWhatsappCannedReplyOutput";
import {validateProgramWhatsappCannedReplyDocument} from
  "../../shared/generated/validators/programWhatsappCannedReplyDocument";
import {
  defaultProgramInboxDeps,
  requireInboxAccess,
  requireValid,
  type ProgramInboxDeps,
} from "./access";
import {
  PROGRAM_WHATSAPP_CANNED_REPLIES,
  programWhatsappCannedReplyDocId,
} from "./ids";

// Saved replies the planner sends from the inbox, one text per language.

const CANNED_LIMIT = 100;

type CannedReply = ProgramWhatsappCannedReplyDocument;

function item(reply: CannedReply):
  ProgramWhatsappCannedReplyCallableResponse["cannedReply"] {
  return {cannedReplyId: reply.cannedReplyId, label: reply.label,
    variants: reply.variants, sortOrder: reply.sortOrder,
    archived: reply.archived, revision: reply.revision};
}

export async function listProgramWhatsappCannedRepliesHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappCannedRepliesCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListProgramWhatsappCannedRepliesCallablePayload>(request,
      validateListProgramWhatsappCannedRepliesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramWhatsappCannedReplies",
    {maxRequests: 60, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireInboxAccess(access);
  const snap = await db.collection(PROGRAM_WHATSAPP_CANNED_REPLIES)
    .where("programId", "==", data.programId).limit(CANNED_LIMIT).get();
  const replies = snap.docs.map((doc) => doc.data() as CannedReply)
    .filter((reply) => reply.organizerId === access.program.organizerId &&
      (data.includeArchived === true || !reply.archived))
    .sort((a, b) => a.sortOrder - b.sortOrder ||
      a.label.localeCompare(b.label));
  return requireValid(validateProgramWhatsappCannedRepliesCallableResponse,
    {programId: data.programId, cannedReplies: replies.map(item)},
    "canned replies");
}

export async function upsertProgramWhatsappCannedReplyHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappCannedReplyCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    UpsertProgramWhatsappCannedReplyCallablePayload>(request,
      validateUpsertProgramWhatsappCannedReplyCallablePayload);
  const languages = data.variants.map((variant) => variant.language);
  if (new Set(languages).size !== languages.length) {
    throw new HttpsError("invalid-argument",
      "Each language can appear once in a saved reply.");
  }
  assertOutboundContentAllowed(data.variants.map((variant) => variant.text),
    "This saved reply contains language that cannot be delivered.");
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramWhatsappCannedReply",
    {maxRequests: 60, windowMs: 60 * 1000});
  const requestHash = hashRequest({op: "upsertProgramWhatsappCannedReply",
    programId: data.programId, cannedReplyId: data.cannedReplyId,
    label: data.label, variants: data.variants,
    sortOrder: data.sortOrder ?? null, archived: data.archived ?? null,
    expectedRevision: data.expectedRevision});
  const ref = db.collection(PROGRAM_WHATSAPP_CANNED_REPLIES)
    .doc(programWhatsappCannedReplyDocId(data.programId, data.cannedReplyId));
  const stored = await db.runTransaction(async (tx): Promise<CannedReply> => {
    const access = await requireProgramAccess({db, programId: data.programId,
      actorUid, now: deps.now(), transaction: tx});
    requireInboxAccess(access);
    requireProgramMutable(access.program);
    const current = (await tx.get(ref)).data() as CannedReply | undefined;
    if (current && current.programId !== data.programId) {
      throw new HttpsError("not-found", "Saved reply not found.");
    }
    if (current && current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return current;
    }
    if ((current?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this reply.",
        {reason: "staleRevision", revision: current?.revision ?? 0});
    }
    if (!current) {
      const count = (await tx.get(db.collection(PROGRAM_WHATSAPP_CANNED_REPLIES)
        .where("programId", "==", data.programId).limit(CANNED_LIMIT))).size;
      if (count >= CANNED_LIMIT) {
        throw new HttpsError("resource-exhausted",
          "A programme keeps at most 100 saved replies.");
      }
    }
    const nowMillis = deps.now().toMillis();
    const next: CannedReply = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      cannedReplyId: data.cannedReplyId,
      label: data.label.trim(),
      variants: data.variants.map((variant) => ({language: variant.language,
        text: variant.text.trim()})),
      sortOrder: data.sortOrder ?? current?.sortOrder ?? 0,
      archived: data.archived ?? current?.archived ?? false,
      updatedByUid: actorUid,
      createdAtMillis: current?.createdAtMillis ?? nowMillis,
      updatedAtMillis: nowMillis,
      revision: (current?.revision ?? 0) + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    tx.set(ref, requireValid(validateProgramWhatsappCannedReplyDocument, next,
      "saved reply"));
    return next;
  });
  return requireValid(validateProgramWhatsappCannedReplyCallableResponse,
    {programId: data.programId, cannedReply: item(stored)}, "saved reply");
}
