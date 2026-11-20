import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {
  classifyCommandReceipt,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {checkRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {validateClaimParticipantFormProfileCallablePayload} from
  "../shared/generated/validators/claimParticipantFormProfileInput";
import {userProfileDocumentSchema} from
  "../shared/generated/schemas/userProfileDocument";
import {validateUserProfileDocument} from
  "../shared/generated/validators/userProfileDocument";
import type {ClaimParticipantFormProfileCallablePayload as Payload} from
  "../shared/generated/claimParticipantFormProfileCallablePayload";
import type {ClaimParticipantFormProfileCallableResponse as Result} from
  "../shared/generated/claimParticipantFormProfileCallableResponse";
import type {UserProfileDocument as User, ProfilePhoto,
  OrganizerFormAssetDocument as Asset,
  OrganizerFormResponseDocument as Response,
  ParticipantIntakeProfileDocument as Intake,
  ParticipantOrganizerCardDocument as Card} from
  "../shared/generated/firestoreAdminTypes";
import {readParticipantFormProfileProposal} from
  "../organizers/organizerFormProfileProposals";
import {copyFormProfilePhoto, removeDeletedClaimPhoto, assertClaimPhotoAsset}
  from "./formProfilePhoto";
import {personFieldCatalog} from
  "../shared/generated/catalogs/personFieldCatalog";
import {profilePhotoPolicy} from
  "../shared/generated/catalogs/profilePhotoPolicy";

interface ClaimDeps {
  db: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  rateLimit: typeof checkRateLimit;
  copyPhoto: typeof copyFormProfilePhoto;
  cleanupDeletedPhoto?: typeof removeDeletedClaimPhoto;
}
/** The replay receipt keeps only what the response cannot rebuild. */
interface ClaimReceiptResult {
  profileRevision: number;
  organizerCardId: string | null;
  claimedAtMillis: number;
}
const receiptCommand = "claimParticipantFormProfile";

const defaults: ClaimDeps = {db: () => admin.firestore(),
  now: () => Timestamp.now(), rateLimit: checkRateLimit,
  copyPhoto: copyFormProfilePhoto,
  cleanupDeletedPhoto: removeDeletedClaimPhoto};

/** Only the verified participant can claim explicitly reviewed values. */
export async function claimParticipantFormProfileHandler(
  request: CallableRequest<unknown>, deps: ClaimDeps = defaults):
  Promise<Result> {
  const {uid, phone} = requireVerifiedParticipant(request);
  const data = validateCallableWithAjv(request,
    validateClaimParticipantFormProfileCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "claimParticipantFormProfile", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const requestHash = commandRequestHash(uid, data);
  const receiptRef = commandReceiptRef(db, receiptCommand,
    hash([uid, data.requestId].join("|")));
  const userRef = db.collection("users").doc(uid);
  const intakeRef = db.collection("participantIntakeProfiles").doc(uid);
  const cardRef = db.collection("participantOrganizerCards")
    .doc(data.responseId);
  const inspect = async (tx: FirebaseFirestore.Transaction) => {
    const [receiptSnap, userSnap, deleted, intakeSnap] = await Promise.all([
      tx.get(receiptRef), tx.get(userRef),
      tx.get(db.collection("deletedUsers").doc(uid)), tx.get(intakeRef),
    ]);
    const user = userSnap.exists ? requireDoc<User>(userSnap,
      "UserProfileDocument") : undefined;
    if (deleted.exists || user?.deleted) throw unavailable();
    const lookup = classifyCommandReceipt<ClaimReceiptResult>(receiptSnap,
      {command: receiptCommand, requestHash, nowMillis: now.toMillis()});
    if (lookup.kind !== "none") {
      const receipt = lookup.kind === "replay" ? lookup.result : undefined;
      if (!isClaimReceiptResult(receipt)) {
        throw new HttpsError("already-exists",
          "This profile claim request was already used for another decision.");
      }
      return {receipt, user, proposal: null};
    }
    if ((user?.profileRevision ?? 0) !== data.expectedProfileRevision) {
      throw new HttpsError("aborted",
        "Your profile changed. Review the latest values before saving.");
    }
    const proposal = await readParticipantFormProfileProposal({db, tx, uid,
      responseId: data.responseId});
    const allowed = new Set(proposal.fields.map((field) => field.questionId));
    if (data.selectedQuestionIds.some((id) => !allowed.has(id))) {
      throw new HttpsError("invalid-argument",
        "Only the reviewed profile and organizer-card fields can be claimed.");
    }
    assertReviewedSelections(data, proposal.fields);
    const intake = intakeSnap.data() as Intake | undefined;
    if (data.reviewedLinkedinUrl !== undefined &&
        (intake?.revision ?? 0) !== data.expectedIntakeRevision) {
      throw new HttpsError("aborted",
        "Your saved application profile changed. Review it before saving.");
    }
    return {receipt: null, user, proposal, intake};
  };
  const before = await db.runTransaction(inspect);
  if (before.receipt) return receiptResult(before.receipt, true);
  // Validate before expensive image processing as well as inside the commit.
  reviewedUserProfile({current: before.user, reviewed: data.profile,
    phone, photo: null, now});
  const selected = new Set(data.selectedQuestionIds);
  const photoField = before.proposal!.fields.find((field) =>
    selected.has(field.questionId) && field.destination === "catchProfile" &&
    field.canonicalFieldId === "profilePhoto");
  let photo: ProfilePhoto | null = null;
  if (photoField) {
    if (!Array.isArray(photoField.value) || photoField.value.length !== 1) {
      throw new HttpsError("failed-precondition", "Choose one profile photo.");
    }
    // Only private source bytes are read. The copied photo is not returned or
    // referenced by a profile until the transaction revalidates the claim.
    photo = await deps.copyPhoto({db, uid, responseId: data.responseId,
      questionId: photoField.questionId, assetId: photoField.value[0], now});
  }
  return db.runTransaction(async (tx) => {
    const current = await inspect(tx);
    if (current.receipt) return receiptResult(current.receipt, true);
    if (photoField && Array.isArray(photoField.value)) {
      const assetId = photoField.value[0];
      const [assetSnap, responseSnap] = await Promise.all([
        tx.get(db.collection("organizerFormAssets").doc(assetId)),
        tx.get(db.collection("organizerFormResponses").doc(data.responseId)),
      ]);
      if (!assetSnap.exists || !responseSnap.exists) throw unavailable();
      assertClaimPhotoAsset({uid, questionId: photoField.questionId, assetId,
        asset: requireDoc<Asset>(assetSnap, "OrganizerFormAssetDocument"),
        response: requireDoc<Response>(responseSnap,
          "OrganizerFormResponseDocument"), now: deps.now()});
    }
    const cardSnap = await tx.get(cardRef);
    const card = cardSnap.exists ? requireDoc<Card>(cardSnap,
      "ParticipantOrganizerCardDocument") : undefined;
    if (card && (card.uid !== uid ||
        card.organizerId !== current.proposal!.organizerId ||
        card.responseId !== data.responseId)) throw unavailable();
    const updated = reviewedUserProfile({current: current.user,
      reviewed: data.profile, phone, photo, now});
    const questionIds = current.proposal!.fields.filter((field) =>
      field.destination === "organizerCard" && selected.has(field.questionId))
      .map((field) => field.questionId);
    const organizerCardId = questionIds.length ? data.responseId : null;
    const receipt: ClaimReceiptResult = {
      profileRevision: updated.profileRevision!, organizerCardId,
      claimedAtMillis: now.toMillis()};
    tx.set(userRef, updated);
    tx.update(db.collection("participantFormProfileProposals")
      .doc(data.responseId), {claimedAt: now});
    if (data.reviewedLinkedinUrl !== undefined) {
      const intake = current.intake;
      const fields = (intake?.fields ?? []).filter((field) =>
        field.canonicalFieldId !== "linkedinUrl");
      fields.push({canonicalFieldId: "linkedinUrl",
        value: {valueKind: "text", textValue: data.reviewedLinkedinUrl,
          numberValue: null, booleanValue: null, dateValue: null,
          optionValues: [], assetIds: []}, sourceApplicationId: null,
        reviewedByParticipantAt: now, updatedAt: now});
      tx.set(intakeRef, {fields, revision: (intake?.revision ?? 0) + 1,
        createdAt: intake?.createdAt ?? now, updatedAt: now} satisfies Intake);
    }
    if (questionIds.length || card) {
      tx.set(cardRef, {uid, organizerId: current.proposal!.organizerId,
        responseId: data.responseId, questionIds,
        revision: (card?.revision ?? 0) + 1,
        createdAt: card?.createdAt ?? now, updatedAt: now} satisfies Card);
    }
    writeCommandReceipt(tx, receiptRef, {
      command: receiptCommand, retention: "request", requestHash,
      result: {...receipt}, nowMillis: now.toMillis(),
    });
    return receiptResult(receipt, false);
  }).catch(async (error: unknown) => {
    if (photo) await deps.cleanupDeletedPhoto?.({db, uid, photo});
    throw error;
  });
}

export function reviewedUserProfile(input: {
  current: User | undefined; reviewed: Payload["profile"]; phone: string;
  photo: ProfilePhoto | null; now: FirebaseFirestore.Timestamp;
}): User {
  const {current, reviewed, phone, photo, now} = input;
  const birthday = new Date(`${reviewed.dateOfBirth}T00:00:00.000Z`);
  const date = now.toDate();
  let age = date.getUTCFullYear() - birthday.getUTCFullYear();
  if (date.getUTCMonth() < birthday.getUTCMonth() ||
      (date.getUTCMonth() === birthday.getUTCMonth() &&
        date.getUTCDate() < birthday.getUTCDate())) age--;
  if (!Number.isFinite(birthday.getTime()) || age < 18 || age > 120 ||
      birthday.toISOString().slice(0, 10) !== reviewed.dateOfBirth) {
    throw new HttpsError("invalid-argument", "Enter a valid adult birth date.");
  }
  const base: User = current ?? {name: reviewed.displayName.trim(),
    displayName: reviewed.displayName.trim(), firstName: "", lastName: "",
    dateOfBirth: Timestamp.fromDate(birthday), gender: reviewed.gender,
    phoneNumber: phone, email: "", profileComplete: false,
    profilePhotos: [], profilePrompts: [], interestedInGenders: [],
    minAgePreference: 18, maxAgePreference: 99, languages: [],
    activityPreferences: {running: {paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420, preferredDistances: [], runningReasons: [],
      preferredRunTimes: [], version: 0}}, prefsNewCatches: false,
    prefsMessages: true, prefsEventReminders: true,
    prefsRunStatusUpdates: false,
    prefsOrganizerUpdates: false, prefsWeeklyDigest: false,
    prefsShowOnMap: false,
    prefsShowInCrossPaths: false, prefsCrossPathsInvitations: false};
  const photos = [...base.profilePhotos];
  if (photo && !photos.some((existing) => existing.id === photo.id)) {
    if (photos.length >= profilePhotoPolicy.maxPhotos) {
      throw new HttpsError("failed-precondition",
        "Remove a profile photo before adding another.");
    }
    const used = new Set(photos.map((item) => item.position));
    const position = Array.from({length: profilePhotoPolicy.maxPhotos},
      (_, i) => i).find((value) => !used.has(value))!;
    photos.push({...photo, position});
  }
  const normalized = Object.fromEntries(Object.entries(reviewed).map(
    ([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
  const result = {...base, ...normalized,
    dateOfBirth: Timestamp.fromDate(birthday), phoneNumber: phone,
    profilePhotos: photos, profileRevision: (base.profileRevision ?? 0) + 1,
    profileClaimedAt: base.profileClaimedAt ?? now};
  // Keep tolerated legacy fields unchanged without accepting them from input.
  const legacy = new Set(userProfileDocumentSchema[
    "x-legacy-tolerated-fields"] as string[]);
  const validated = Object.fromEntries(Object.entries(result)
    .filter(([key]) => !legacy.has(key)));
  if (!validateUserProfileDocument(validated)) {
    throw new HttpsError("invalid-argument",
      "Review the profile fields and correct any unsupported values.");
  }
  return result as unknown as User;
}

/** Every selected source must have a reviewed destination. */
function assertReviewedSelections(data: Payload, fields: Awaited<
  ReturnType<typeof readParticipantFormProfileProposal>>["fields"]) {
  const selected = new Set(data.selectedQuestionIds);
  let selectedLinkedin = false;
  for (const field of fields) {
    if (!selected.has(field.questionId) ||
        field.destination !== "catchProfile") continue;
    const catalog = personFieldCatalog.fields.find((entry) =>
      entry.id === field.canonicalFieldId);
    if (!catalog || catalog.authority === "derived") throw unavailable();
    if (catalog.id === "profilePhoto" || catalog.id === "phoneNumber") continue;
    if (catalog.id === "linkedinUrl") {
      selectedLinkedin = true;
      if (data.reviewedLinkedinUrl !== undefined) continue;
    } else if (catalog.privateProfilePath &&
        Object.hasOwn(data.profile, catalog.privateProfilePath)) continue;
    throw new HttpsError("invalid-argument",
      `Review the selected ${field.label} before saving your profile.`);
  }
  if (data.reviewedLinkedinUrl !== undefined && !selectedLinkedin) {
    throw new HttpsError("invalid-argument",
      "Select the LinkedIn answer before saving it to your private profile.");
  }
}

export function requireVerifiedParticipant(request: CallableRequest<unknown>) {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  if (typeof phone !== "string" || !/^\+[1-9][0-9]{7,14}$/u.test(phone)) {
    throw new HttpsError("failed-precondition", "Verify your phone first.");
  }
  return {uid, phone};
}

function receiptResult(receipt: ClaimReceiptResult, replayed: boolean):
  Result {
  return {profileRevision: receipt.profileRevision,
    organizerCardId: receipt.organizerCardId,
    claimedAtMillis: receipt.claimedAtMillis, replayed};
}
function isClaimReceiptResult(value: ClaimReceiptResult | undefined):
  value is ClaimReceiptResult {
  return !!value && Number.isSafeInteger(value.profileRevision) &&
    (value.organizerCardId === null ||
      typeof value.organizerCardId === "string") &&
    Number.isSafeInteger(value.claimedAtMillis);
}
function unavailable() {
  return new HttpsError("not-found", "This private profile is unavailable.");
}
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export const claimParticipantFormProfile = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 20}),
  (request) => claimParticipantFormProfileHandler(request));
