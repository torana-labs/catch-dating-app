import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {assertRevision, nextRevision, requireProgramAccess, requireProgramDuty,
  requireProgramMutable}
  from "../shared/programAuthority";
import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {validateCallableWithAjv} from "../shared/validation";
import type {ProgramTravelLegDocument, ProgramTravelPartyDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {DetachProgramTravelLegCallablePayload} from
  "../shared/generated/detachProgramTravelLegCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {validateDetachProgramTravelLegCallablePayload} from
  "../shared/generated/validators/detachProgramTravelLegInput";
import {requireMutableTravelLeg, validateTravelPartyMembership} from
  "./travelPartyPolicy";

/**
 * Removes one journey from its ride-together party, fenced by the journey's
 * revision. The party keeps its label and vehicle setting; its last journey
 * leaves it empty, as upsertProgramTravelParty allows.
 *
 * Only the detached journey must still be editable. A sibling that already
 * departed is not written: it keeps its partyId and its place in legIds, so
 * the remaining membership still validates. Detaching is how a journey left
 * behind by its departed party becomes schedulable again.
 */
export async function detachProgramTravelLegHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps,
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<DetachProgramTravelLegCallablePayload>(
    request, validateDetachProgramTravelLegCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "detachProgramTravelLeg", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const legRef = db.collection("programTravelLegs").doc(data.legId);
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({db, transaction: tx,
      programId: data.programId, actorUid, now: deps.now()});
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    if (!["draft", "active"].includes(access.program.status)) {
      throw new HttpsError("failed-precondition", "This program is closed.");
    }
    const organizerId = access.program.organizerId;
    const leg = (await tx.get(legRef)).data() as
      ProgramTravelLegDocument | undefined;
    if (!leg || leg.programId !== data.programId ||
        leg.organizerId !== organizerId) {
      throw new HttpsError("not-found", "Journey not found in this program.");
    }
    assertRevision(leg.revision, data.expectedRevision);
    requireMutableTravelLeg(leg);
    if (!leg.partyId) {
      throw new HttpsError("failed-precondition",
        "This journey is not in a party.");
    }
    const partyRef = db.collection("programTravelParties").doc(leg.partyId);
    const party = (await tx.get(partyRef)).data() as
      ProgramTravelPartyDocument | undefined;
    if (!party || party.programId !== data.programId ||
        party.organizerId !== organizerId) {
      throw new HttpsError("failed-precondition",
        "Party and journey membership disagree. Reconcile the party.");
    }
    if (!Array.isArray(party.legIds)) {
      throw new HttpsError("failed-precondition",
        "Legacy party membership needs explicit journey reconciliation.");
    }
    if (!party.legIds.includes(data.legId)) {
      throw new HttpsError("failed-precondition",
        "Party and journey membership disagree. Reconcile the party.");
    }
    const remainingIds = party.legIds.filter((id) => id !== data.legId);
    const snaps = await Promise.all(remainingIds.map((id) =>
      tx.get(db.collection("programTravelLegs").doc(id))));
    const remaining = new Map<string, ProgramTravelLegDocument>();
    for (const snap of snaps) {
      const doc = snap.data() as ProgramTravelLegDocument | undefined;
      if (doc) remaining.set(snap.id, doc);
    }
    const now = deps.now();
    const document: ProgramTravelPartyDocument = {
      ...party, legIds: remainingIds, updatedAt: now,
      revision: nextRevision(party.revision, now),
    };
    validateTravelPartyMembership(partyRef.id, document, remaining);
    const legRevision = nextRevision(leg.revision, now);
    tx.set(partyRef, document);
    tx.update(legRef, {partyId: null, revision: legRevision, updatedAt: now});
    return {entityId: data.legId, revision: legRevision,
      alreadyApplied: false};
  });
}

export const detachProgramTravelLeg = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => detachProgramTravelLegHandler(request)
);
