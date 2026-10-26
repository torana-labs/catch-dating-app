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
import type {UpsertProgramTravelPartyCallablePayload} from
  "../shared/generated/upsertProgramTravelPartyCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {validateUpsertProgramTravelPartyCallablePayload} from
  "../shared/generated/validators/upsertProgramTravelPartyInput";
import {requireMutableTravelLeg, validateTravelPartyMembership} from
  "./travelPartyPolicy";

export async function upsertProgramTravelPartyHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps,
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramTravelPartyCallablePayload>(
    request, validateUpsertProgramTravelPartyCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramTravelParty", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.partyId ?
    db.collection("programTravelParties").doc(data.partyId) :
    db.collection("programTravelParties").doc();
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({db, transaction: tx,
      programId: data.programId, actorUid, now: deps.now()});
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    if (!["draft", "active"].includes(access.program.status)) {
      throw new HttpsError("failed-precondition", "This program is closed.");
    }
    const existing = (await tx.get(ref)).data() as
      ProgramTravelPartyDocument | undefined;
    if ((data.partyId && !existing) ||
        (existing && (existing.programId !== data.programId ||
          existing.organizerId !== access.program.organizerId))) {
      throw new HttpsError("not-found", "Party not found in this program.");
    }
    if (existing && !Array.isArray(existing.legIds)) {
      throw new HttpsError("failed-precondition",
        "Legacy party membership needs explicit journey reconciliation.");
    }
    if (!existing && data.legIds.length === 0) {
      throw new HttpsError("invalid-argument", "Select at least one journey.");
    }
    assertRevision(existing?.revision ?? 0, data.expectedRevision);
    const affectedIds = [...new Set([
      ...(existing?.legIds ?? []), ...data.legIds,
    ])];
    const snaps = await Promise.all(affectedIds.map((id) =>
      tx.get(db.collection("programTravelLegs").doc(id))));
    const legs = new Map<string, ProgramTravelLegDocument>();
    const selected = new Set(data.legIds);
    const now = deps.now();
    const updates: Array<{id: string; partyId: string | null;
      revision: number}> = [];
    for (const snap of snaps) {
      const leg = snap.data() as ProgramTravelLegDocument | undefined;
      if (!leg || leg.programId !== data.programId ||
          leg.organizerId !== access.program.organizerId) {
        throw new HttpsError("not-found", "Journey not found in this program.");
      }
      requireMutableTravelLeg(leg);
      if (leg.partyId && leg.partyId !== ref.id) {
        throw new HttpsError("failed-precondition",
          "Remove a journey from its existing party before moving it.");
      }
      if ((existing?.legIds.includes(snap.id) ?? false) !==
          (leg.partyId === ref.id)) {
        throw new HttpsError("failed-precondition",
          "Party and journey membership disagree. Reconcile the party.");
      }
      const partyId = selected.has(snap.id) ? ref.id : null;
      legs.set(snap.id, {...leg, partyId});
      if (leg.partyId !== partyId) {
        updates.push({id: snap.id, partyId,
          revision: nextRevision(leg.revision, now)});
      }
    }
    const document: ProgramTravelPartyDocument = {
      programId: data.programId, organizerId: access.program.organizerId,
      label: data.label === undefined ? existing?.label ?? null :
        data.label?.trim() || null,
      legIds: [...data.legIds].sort(), dedicatedVehicle: data.dedicatedVehicle,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
      revision: nextRevision(existing?.revision, now),
    };
    validateTravelPartyMembership(ref.id, document, legs);
    tx.set(ref, document);
    for (const update of updates) {
      tx.update(db.collection("programTravelLegs").doc(update.id), {
        partyId: update.partyId, revision: update.revision, updatedAt: now,
      });
    }
    return {entityId: ref.id, revision: document.revision,
      alreadyApplied: false};
  });
}

export const upsertProgramTravelParty = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => upsertProgramTravelPartyHandler(request)
);
