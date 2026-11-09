import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {validateCallableWithAjv} from "../../shared/validation";
import {requireProgramAccess} from "../../shared/programAuthority";
import type {SetProgramWhatsappThreadHandlingCallablePayload} from
  "../../shared/generated/setProgramWhatsappThreadHandlingCallablePayload";
import type {ProgramWhatsappThreadHandlingCallableResponse} from
  "../../shared/generated/programWhatsappThreadHandlingCallableResponse";
import {validateSetProgramWhatsappThreadHandlingCallablePayload} from
  "../../shared/generated/validators/setProgramWhatsappThreadHandlingInput";
import {validateProgramWhatsappThreadHandlingCallableResponse} from
  "../../shared/generated/validators/programWhatsappThreadHandlingOutput";
import {
  defaultProgramInboxDeps,
  requireInboxAccess,
  requireValid,
  type ProgramInboxDeps,
} from "./access";
import {PROGRAM_WHATSAPP_THREADS} from "./ids";
import {readThread, requireValidThread, type ProgramThread} from "./threads";

/**
 * Take a thread over from the assistant or hand it back. While the planner
 * handles it the assistant (lane W2) stays silent; handing back clears the
 * take-over. Unknown senders always stay with the planner.
 */
export async function setProgramWhatsappThreadHandlingHandler(
  request: CallableRequest<unknown>,
  deps: ProgramInboxDeps = defaultProgramInboxDeps,
): Promise<ProgramWhatsappThreadHandlingCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SetProgramWhatsappThreadHandlingCallablePayload>(request,
      validateSetProgramWhatsappThreadHandlingCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setProgramWhatsappThreadHandling",
    {maxRequests: 60, windowMs: 60 * 1000});
  const ref = db.collection(PROGRAM_WHATSAPP_THREADS).doc(data.threadId);
  const next = await db.runTransaction(async (tx): Promise<ProgramThread> => {
    const access = await requireProgramAccess({db, programId: data.programId,
      actorUid, now: deps.now(), transaction: tx});
    requireInboxAccess(access);
    const thread = readThread(await tx.get(ref), data.programId);
    if (!thread || thread.organizerId !== access.program.organizerId) {
      throw new HttpsError("not-found", "WhatsApp thread not found.");
    }
    if (thread.revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this thread.",
        {reason: "staleRevision", revision: thread.revision});
    }
    if (thread.unknownSender && data.handledBy === "assistant") {
      throw new HttpsError("failed-precondition",
        "The assistant only answers guests on the guest list.");
    }
    const updated: ProgramThread = {
      ...thread,
      handledBy: data.handledBy,
      takenOverByUid: data.handledBy === "planner" ? actorUid : null,
      ...(data.state ? {state: data.state} : {}),
      ...(data.state === "handled" ? {escalationReason: null} : {}),
      updatedAtMillis: deps.now().toMillis(),
      revision: thread.revision + 1,
    };
    tx.set(ref, requireValidThread(updated));
    return updated;
  });
  return requireValid(validateProgramWhatsappThreadHandlingCallableResponse, {
    programId: data.programId, threadId: data.threadId,
    handledBy: next.handledBy, state: next.state, revision: next.revision,
  }, "thread handling");
}
