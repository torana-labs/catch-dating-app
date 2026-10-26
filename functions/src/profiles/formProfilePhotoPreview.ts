import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {validateGetParticipantFormPhotoCallablePayload} from
  "../shared/generated/validators/getParticipantFormPhotoInput";
import type {GetParticipantFormPhotoCallableResponse as Preview} from
  "../shared/generated/getParticipantFormPhotoCallableResponse";
import type {OrganizerFormAssetDocument as Asset,
  OrganizerFormResponseDocument as Response} from
  "../shared/generated/firestoreAdminTypes";
import {requireVerifiedParticipant} from "./claimFormProfile";
import {readParticipantFormProfileProposal} from
  "../organizers/organizerFormProfileProposals";
import {assertClaimPhotoAsset, normalizeFormPhotoPreview,
  readFormPhotoBytes} from
  "./formProfilePhoto";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  rateLimit: typeof checkRateLimit;
  readBytes: typeof readFormPhotoBytes;
}
const defaults: Deps = {db: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(), rateLimit: checkRateLimit,
  readBytes: readFormPhotoBytes};

export async function getParticipantFormPhotoHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Preview> {
  const {uid} = requireVerifiedParticipant(request);
  const data = validateCallableWithAjv(request,
    validateGetParticipantFormPhotoCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getParticipantFormPhoto", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const inspect = async (tx: FirebaseFirestore.Transaction) => {
    const proposal = await readParticipantFormProfileProposal({db, tx, uid,
      responseId: data.responseId});
    const field = proposal.fields.find((row) =>
      row.questionId === data.questionId);
    if (!field || field.kind !== "file" || !Array.isArray(field.value) ||
        !field.value.includes(data.assetId) ||
        (field.destination === "catchProfile" &&
          field.canonicalFieldId !== "profilePhoto")) throw unavailable();
    const [assetSnap, responseSnap] = await Promise.all([
      tx.get(db.collection("organizerFormAssets").doc(data.assetId)),
      tx.get(db.collection("organizerFormResponses").doc(data.responseId)),
    ]);
    if (!assetSnap.exists || !responseSnap.exists) throw unavailable();
    const asset = requireDoc<Asset>(assetSnap, "OrganizerFormAssetDocument");
    const response = requireDoc<Response>(responseSnap,
      "OrganizerFormResponseDocument");
    assertClaimPhotoAsset({uid, questionId: data.questionId,
      assetId: data.assetId, asset, response, now: deps.now(),
      allowMultiple: field.destination === "organizerCard"});
    return asset;
  };
  const asset = await db.runTransaction(inspect);
  const bytes = await deps.readBytes(asset);
  const preview = await normalizeFormPhotoPreview(bytes);
  // Processing must not allow withdrawal, source replacement or deletion to
  // race a new authorized response. No storage URL or grant is ever created.
  const latest = await db.runTransaction(inspect);
  if (latest.declaredSha256 !== asset.declaredSha256 ||
      latest.storagePath !== asset.storagePath) throw unavailable();
  return preview;
}

function unavailable() {
  return new HttpsError("not-found", "This private form image is unavailable.");
}

export const getParticipantFormPhoto = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10,
    memory: "512MiB", concurrency: 1}),
  (request) => getParticipantFormPhotoHandler(request));
