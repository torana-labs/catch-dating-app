import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import {requireVerifiedParticipant} from "../profiles/claimFormProfile";
import {readParticipantFormProfileProposal} from
  "../organizers/organizerFormProfileProposals";
import type {
  EventChatProfileShareDocument as Share,
  EventChatAccessReceiptDocument as Receipt,
  ParticipantOrganizerCardDocument as Card,
  OrganizerFormResponseDocument as FormResponse,
  OrganizerFormVersionDocument as FormVersion,
} from "../shared/generated/firestoreAdminTypes";
import type {GetEventChatProfileSharingCallableResponse as Settings} from
  "../shared/generated/getEventChatProfileSharingCallableResponse";
import type {GetEventChatProfileCallableResponse as Profile} from
  "../shared/generated/getEventChatProfileCallableResponse";
import type {UpdateEventChatProfileSharingCallableResponse as Update} from
  "../shared/generated/updateEventChatProfileSharingCallableResponse";
import {validateGetEventChatProfileSharingCallablePayload} from
  "../shared/generated/validators/getEventChatProfileSharingInput";
import {validateUpdateEventChatProfileSharingCallablePayload} from
  "../shared/generated/validators/updateEventChatProfileSharingInput";
import {validateGetEventChatProfileCallablePayload} from
  "../shared/generated/validators/getEventChatProfileInput";
import {
  readEventChatAccount,
  readEventChatAccess,
  requireEventChatMember,
  requireEventChatActor,
  eventChatMembershipId,
} from "./eventChatAccess";
import {
  chatHash,
  messageDefaults,
  nextChatRevision,
  type EventChatMessageDeps,
} from "./eventChatMessageShared";
import {
  eventProfileCoreFields,
  eventProfilePhotos,
  readEventProfilePhoto,
} from "./eventChatProfileProjection";

type Selection = NonNullable<Share["selection"]>;
type Access = Awaited<ReturnType<typeof readEventChatAccess>>;
interface Deps extends EventChatMessageDeps {
  readPhoto: typeof readEventProfilePhoto;
}
const defaults: Deps = {...messageDefaults, readPhoto: readEventProfilePhoto};
const unavailable = () =>
  new HttpsError("permission-denied", "This event profile is unavailable.");
const stale = () =>
  new HttpsError(
    "aborted",
    "Your profile or event choices changed. Review them before sharing.",
  );
const shareRef = (
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string,
) =>
  db
    .collection("eventChatProfileShares")
    .doc(eventChatMembershipId(eventId, uid));

async function readShare(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  uid: string,
) {
  const snap = await tx.get(shareRef(db, eventId, uid));
  if (!snap.exists) return null;
  const share = requireDoc<Share>(snap, "EventChatProfileShareDocument");
  if (share.uid !== uid || share.eventId !== eventId) throw unavailable();
  return share;
}

/** Only applicant-selected fields from this event organizer's card qualify. */
async function cardFields(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  uid: string,
  organizerId: string,
  choice: NonNullable<Selection["card"]>,
): Promise<Profile["cardFields"]> {
  const snap = await tx.get(
    db.collection("participantOrganizerCards").doc(choice.responseId),
  );
  if (!snap.exists) throw stale();
  const card = requireDoc<Card>(snap, "ParticipantOrganizerCardDocument");
  if (
    card.uid !== uid ||
    card.organizerId !== organizerId ||
    card.responseId !== choice.responseId
  ) {
    throw unavailable();
  }
  if (card.revision !== choice.revision) throw stale();
  const proposal = await readParticipantFormProfileProposal({
    db,
    tx,
    uid,
    responseId: choice.responseId,
  });
  if (
    proposal.organizerId !== organizerId ||
    proposal.claimedAtMillis === null
  ) {
    throw unavailable();
  }
  const responseSnap = await tx.get(db.collection("organizerFormResponses")
    .doc(choice.responseId));
  if (!responseSnap.exists) throw unavailable();
  const response = requireDoc<FormResponse>(responseSnap,
    "OrganizerFormResponseDocument");
  const versionSnap = await tx.get(db.collection("organizerFormVersions")
    .doc(response.versionId));
  if (!versionSnap.exists) throw unavailable();
  const version = requireDoc<FormVersion>(versionSnap,
    "OrganizerFormVersionDocument");
  if (version.organizerId !== organizerId ||
    version.formId !== proposal.formId ||
    version.definition.eventProfile?.enabled !== true ||
    !version.definition.eventProfile.allowedSlots.includes("customRow") ||
    choice.questionIds.length > version.definition.eventProfile.maxCustomRows) {
    throw unavailable();
  }
  const questions = new Map(version.definition.sections.flatMap((section) =>
    section.questions.map((question) => [question.questionId, question])));
  return choice.questionIds.map((questionId) => {
    const field = proposal.fields.find(
      (item) => item.questionId === questionId,
    );
    const audience = questions.get(questionId)?.answerAudience;
    if (
      !card.questionIds.includes(questionId) ||
      !field ||
      field.destination !== "organizerCard" ||
      field.kind === "file" ||
      audience?.mode !== "eventMembersWithConsent" ||
      audience.eventProfileSlot !== "customRow"
    ) {
      throw unavailable();
    }
    const labels = new Map(
      field.options.map((option) => [option.value, option.label]),
    );
    const value =
      field.kind === "singleChoice" && typeof field.value === "string" ?
        (labels.get(field.value) ?? field.value) :
        field.kind === "multiChoice" && Array.isArray(field.value) ?
          field.value.map((item) => labels.get(item) ?? item) :
          field.value;
    if (value === null) throw stale();
    return {label: field.label, value};
  });
}

function selectionMatchesMember(selection: Selection, access: Access) {
  return selection.membershipRevision === access.member?.revision ||
    // A choice made before the first join applies only to that first room
    // membership. Leave/rejoin increments the generation and revokes it.
    (selection.membershipRevision === 0 &&
      access.member?.status === "joined" && access.member.revision === 1);
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/u)[0].slice(0, 80);
}

function hasSelection(selection: Selection) {
  return selection.coreFieldIds.length > 0 || !!selection.photoId ||
    !!selection.card || !!selection.firstName || !!selection.introduction;
}

function normalizeSelection(selection: Selection): Selection {
  return {
    profileRevision: selection.profileRevision,
    membershipRevision: selection.membershipRevision,
    coreFieldIds: [...selection.coreFieldIds].sort(),
    photoId: selection.photoId,
    card: selection.card ? {
      responseId: selection.card.responseId,
      revision: selection.card.revision,
      questionIds: [...selection.card.questionIds].sort(),
    } : null,
    ...(selection.firstName === undefined ? {} :
      {firstName: selection.firstName.trim()}),
    ...(selection.introduction === undefined ? {} :
      {introduction: selection.introduction.trim()}),
    termsVersion: selection.termsVersion,
  };
}

async function projectProfile(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  uid: string,
  target: Access,
  selected: Selection | null,
  now: Date,
) {
  const profile: Profile = {
    eventId,
    participantUid: uid,
    displayName: firstName(target.user!.displayName!),
    introduction: null,
    coreFields: [],
    cardFields: [],
    photo: null,
  };
  let photo = null;
  if (selected) {
    if (selected.termsVersion === "event-profile-sharing-v2") {
      profile.displayName = selected.firstName ?? profile.displayName;
      profile.introduction = selected.introduction ?? null;
    }
    if (selected.profileRevision === (target.user?.profileRevision ?? 0)) {
      profile.coreFields = eventProfileCoreFields(target.user, now)
        .filter((field) => selected.coreFieldIds.includes(field.fieldId));
      photo = eventProfilePhotos(target.user, uid)
        .find((item) => item.id === selected.photoId) ?? null;
    }
    if (selected.card) {
      try {
        profile.cardFields = await cardFields(db, tx, uid,
          target.view.organizerId, selected.card);
      } catch (error) {
        if (!isUnavailable(error) &&
          !(error instanceof HttpsError && error.code === "aborted")) {
          throw error;
        }
      }
    }
  }
  return {profile, photo};
}

async function validateSelection(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  uid: string,
  access: Access,
  selection: Selection,
  now: Date,
) {
  if ((selection.firstName || selection.introduction) &&
    selection.termsVersion !== "event-profile-sharing-v2") throw stale();
  const available = new Set(eventProfileCoreFields(access.user, now)
    .map((field) => field.fieldId));
  if (selection.coreFieldIds.some((id) => !available.has(id)) ||
    (selection.photoId && !eventProfilePhotos(access.user, uid)
      .some((photo) => photo.id === selection.photoId))) throw stale();
  if (selection.card) {
    if (selection.termsVersion !== "event-profile-sharing-v2") {
      throw stale();
    }
    await cardFields(db, tx, uid, access.view.organizerId, selection.card);
  }
}

/** Own settings remain readable for revocation after room/admission removal. */
export async function getEventChatProfileSharingHandler(
  request: CallableRequest<unknown>,
  deps: Deps = defaults,
): Promise<Settings> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(
    request,
    validateGetEventChatProfileSharingCallablePayload,
  );
  requireEventChatActor(uid, data.expectedUid);
  if (data.previewSelection) requireVerifiedParticipant(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventChatProfileSharing", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const inspect = async (tx: FirebaseFirestore.Transaction) => {
    const user = await readEventChatAccount(db, tx, uid);
    const share = await readShare(db, tx, data.eventId, uid);
    let access: Awaited<ReturnType<typeof readEventChatAccess>> | null = null;
    try {
      access = await readEventChatAccess(db, tx, data.eventId, uid);
    } catch (error) {
      if (!isUnavailable(error)) throw error;
    }
    const proposed = data.previewSelection ?
      normalizeSelection(data.previewSelection) : null;
    let projected: Awaited<ReturnType<typeof projectProfile>> | null = null;
    if (proposed) {
      if (!access || !access.view.canJoin || !hasSelection(proposed) ||
        (access.member && access.member.status !== "joined") ||
        proposed.profileRevision !== (access.user?.profileRevision ?? 0) ||
        proposed.membershipRevision !== (access.member?.revision ?? 0) ||
        (access.member?.status === "joined" &&
          !selectionMatchesMember(proposed, access))) throw stale();
      await validateSelection(db, tx, uid, access, proposed,
        deps.now().toDate());
      projected = await projectProfile(db, tx, data.eventId, uid, access,
        proposed, deps.now().toDate());
    }
    const result: Settings = {
      eventId: data.eventId,
      organizerId: access?.view.organizerId ?? share?.organizerId ?? null,
      revision: share?.revision ?? 0,
      selection: share?.selection ?? null,
      canShare: access?.view.canJoin === true &&
        (!access.member || access.member.status === "joined"),
      profileRevision: user?.profileRevision ?? 0,
      membershipRevision: access ? access.member?.revision ?? 0 : null,
      coreFields: eventProfileCoreFields(user, deps.now().toDate()),
      photoIds: eventProfilePhotos(user, uid).map((photo) => photo.id),
      preview: projected?.profile ?? null,
    };
    return {result, projected, fingerprint: chatHash([
      share?.revision, access?.member?.revision, user?.profileRevision,
      projected?.photo?.id, projected?.photo?.thumbnailStoragePath,
      projected?.photo?.updatedAt?.toMillis(), projected?.profile,
    ])};
  };
  const before = await db.runTransaction(inspect);
  if (!before.projected?.photo) return before.result;
  const photo = await deps.readPhoto(before.projected.photo);
  const latest = await db.runTransaction(inspect);
  if (!latest.projected?.photo || latest.fingerprint !== before.fingerprint) {
    throw unavailable();
  }
  return {...latest.result, preview: {...latest.projected.profile, photo}};
}

export async function updateEventChatProfileSharingHandler(
  request: CallableRequest<unknown>,
  deps: Deps = defaults,
): Promise<Update> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(
    request,
    validateUpdateEventChatProfileSharingCallablePayload,
  );
  requireEventChatActor(uid, data.expectedUid);
  if (data.selection) requireVerifiedParticipant(request);
  const selection: Selection | null = data.selection ?
    normalizeSelection(data.selection) : null;
  if (selection && !hasSelection(selection)) {
    throw new HttpsError("invalid-argument", "Choose information to share.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "updateEventChatProfileSharing", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const receiptRef = db
    .collection("eventChatAccessReceipts")
    .doc(chatHash(["profileSharing", uid, data.requestId]));
  const payloadHash = chatHash([
    data.eventId,
    data.expectedRevision,
    selection,
  ]);
  return db.runTransaction(async (tx) => {
    await readEventChatAccount(db, tx, uid);
    const receiptSnap = await tx.get(receiptRef);
    if (receiptSnap.exists) {
      const receipt = requireDoc<Receipt>(
        receiptSnap,
        "EventChatAccessReceiptDocument",
      );
      if (
        receipt.uid !== uid ||
        receipt.eventId !== data.eventId ||
        receipt.payloadHash !== payloadHash
      ) {
        throw new HttpsError(
          "already-exists",
          "This request was already used.",
        );
      }
      return {revision: receipt.revision, replayed: true};
    }
    const previous = await readShare(db, tx, data.eventId, uid);
    const revision = nextChatRevision(
      previous?.revision ?? 0,
      data.expectedRevision,
    );
    let organizerId = previous?.organizerId ?? null;
    if (selection) {
      const access = await readEventChatAccess(db, tx, data.eventId, uid);
      if (!access.view.canJoin ||
        (access.member && access.member.status !== "joined")) {
        throw unavailable();
      }
      organizerId = access.view.organizerId;
      if (
        selection.profileRevision !== (access.user?.profileRevision ?? 0) ||
        selection.membershipRevision !== (access.member?.revision ?? 0)
      ) {
        throw stale();
      }
      await validateSelection(db, tx, uid, access, selection,
        deps.now().toDate());
    }
    const now = deps.now();
    tx.set(shareRef(db, data.eventId, uid), {
      eventId: data.eventId,
      uid,
      organizerId,
      revision,
      selection,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    } satisfies Share);
    tx.create(receiptRef, {
      eventId: data.eventId,
      uid,
      payloadHash,
      revision,
      createdAt: now,
    } satisfies Receipt);
    return {revision, replayed: false};
  });
}

/** Viewer and subject must both still be admitted, joined and unblocked. */
export async function getEventChatProfileHandler(
  request: CallableRequest<unknown>,
  deps: Deps = defaults,
): Promise<Profile> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(
    request,
    validateGetEventChatProfileCallablePayload,
  );
  requireEventChatActor(uid, data.expectedUid);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventChatProfile", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const inspect = async (tx: FirebaseFirestore.Transaction) => {
    await requireEventChatMember(db, tx, data.eventId, uid);
    const target = await requireEventChatMember(
      db,
      tx,
      data.eventId,
      data.participantUid,
    );
    if (
      await hasBlockingRelationshipInTransaction(tx, db, uid, [
        data.participantUid,
      ])
    ) {
      throw unavailable();
    }
    const share = await readShare(db, tx, data.eventId, data.participantUid);
    const selected =
      share?.organizerId === target.view.organizerId &&
      share.selection && selectionMatchesMember(share.selection, target) ?
        share.selection :
        null;
    const {profile, photo} = await projectProfile(db, tx, data.eventId,
      data.participantUid, target, selected, deps.now().toDate());
    return {
      profile,
      photo,
      fingerprint: chatHash([
        share?.revision,
        target.member?.revision,
        target.user?.profileRevision,
        photo?.id,
        photo?.thumbnailStoragePath,
        photo?.updatedAt?.toMillis(),
        profile,
      ]),
    };
  };
  const before = await db.runTransaction(inspect);
  if (!before.photo) return before.profile;
  const preview = await deps.readPhoto(before.photo);
  // Recheck every permission and source after asynchronous media processing.
  const latest = await db.runTransaction(inspect);
  if (!latest.photo || latest.fingerprint !== before.fingerprint) {
    throw unavailable();
  }
  return {...latest.profile, photo: preview};
}

function isUnavailable(error: unknown): boolean {
  return (
    error instanceof HttpsError &&
    ["permission-denied", "not-found"].includes(error.code)
  );
}
export const getEventChatProfileSharing = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => getEventChatProfileSharingHandler(request),
);
export const updateEventChatProfileSharing = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => updateEventChatProfileSharingHandler(request),
);
export const getEventChatProfile = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 60,
    maxInstances: 10,
    memory: "512MiB",
    concurrency: 1,
  }),
  (request) => getEventChatProfileHandler(request),
);
