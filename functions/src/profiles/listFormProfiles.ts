import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateListParticipantFormProfilesCallablePayload} from
  "../shared/generated/validators/listParticipantFormProfilesInput";
import type {ListParticipantFormProfilesCallableResponse as Result} from
  "../shared/generated/listParticipantFormProfilesCallableResponse";
import type {ParticipantOrganizerCardDocument as Card} from
  "../shared/generated/firestoreAdminTypes";
import {readParticipantFormProfileProposal} from
  "../organizers/organizerFormProfileProposals";
import {requireVerifiedParticipant} from "./claimFormProfile";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), rateLimit: checkRateLimit};

export async function listParticipantFormProfilesHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Result> {
  const {uid} = requireVerifiedParticipant(request);
  const data = validateCallableWithAjv(request,
    validateListParticipantFormProfilesCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listParticipantFormProfiles", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  if ((await db.collection("deletedUsers").doc(uid).get()).exists) {
    throw new HttpsError("not-found", "Your form profiles are unavailable.");
  }
  let query = db.collection("participantFormProfileProposals")
    .where("uid", "==", uid).orderBy(FieldPath.documentId())
    .limit(data.limit + 1);
  if (data.cursor) query = query.startAfter(data.cursor);
  const result = await query.get();
  const page = result.docs.slice(0, data.limit);
  const items: Result["items"] = [];
  // Each projection rechecks the source atomically, including withdrawal.
  for (const row of page) {
    try {
      const item = await db.runTransaction(async (tx) => {
        const proposal = await readParticipantFormProfileProposal({
          db, tx, uid, responseId: row.id});
        const [cardSnap, organizerSnap] = await Promise.all([
          tx.get(db.collection("participantOrganizerCards").doc(row.id)),
          tx.get(db.collection("organizers").doc(proposal.organizerId)),
        ]);
        const card = cardSnap.data() as Card | undefined;
        if (card && (card.uid !== uid || card.responseId !== row.id ||
            card.organizerId !== proposal.organizerId)) {
          throw new HttpsError("not-found",
            "This private card is unavailable.");
        }
        const name = organizerSnap.data()?.name;
        const available = new Set(proposal.fields
          .filter((field) =>
            field.destination === "organizerCard")
          .map((field) => field.questionId));
        return {responseId: row.id, organizerId: proposal.organizerId,
          organizerName: typeof name === "string" ? name : null,
          formTitle: proposal.formTitle,
          submittedAtMillis: proposal.submittedAtMillis,
          claimedAtMillis: proposal.claimedAtMillis,
          cardFieldCount: card?.questionIds
            .filter((id) => available.has(id))
            .length ?? 0};
      });
      items.push(item);
    } catch (error) {
      if (!(error instanceof HttpsError) || error.code !== "not-found") {
        throw error;
      }
    }
  }
  return {items, nextCursor: result.docs.length > data.limit ?
    page.at(-1)!.id : null};
}

export const listParticipantFormProfiles = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => listParticipantFormProfilesHandler(request));
