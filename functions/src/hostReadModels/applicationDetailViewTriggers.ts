import * as admin from "firebase-admin";
import {isDeepStrictEqual} from "node:util";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {
  applicationIdForOrigin,
  reconcileHostApplicationDetailView,
  reconcileHostApplicationDetailViewsForApplicant,
} from "./applicationDetailViewStore";

type Data = FirebaseFirestore.DocumentData | undefined;
const options = {retry: true};

/**
 * The applications an imported response write can change: the application
 * it names before and after.
 * @param {Data} before The response before the write.
 * @param {Data} after The response after the write.
 * @return {string[]} Application ids to evaluate.
 */
export function applicationDetailIdsForImportedResponse(before: Data,
  after: Data): string[] {
  if (before && after && isDeepStrictEqual(before, after)) return [];
  return [...new Set([before?.applicationId, after?.applicationId])]
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Whether a contact origin write moved who the origin's application links
 * to in People.
 * @param {Data} before The origin before the write.
 * @param {Data} after The origin after the write.
 * @return {boolean} Whether to evaluate the origin's application.
 */
export function applicationDetailOriginChanged(before: Data,
  after: Data): boolean {
  const pick = (data: Data) => data === undefined ? null :
    [data.organizerId ?? null, data.currentContactId ?? null];
  return !isDeepStrictEqual(pick(before), pick(after));
}

/**
 * The applicants whose views a community membership write can change.
 * @param {Data} before The membership before the write.
 * @param {Data} after The membership after the write.
 * @return {{organizerId: string; uid: string}[]} Applicants to evaluate.
 */
export function applicationDetailApplicantsForMembership(before: Data,
  after: Data): {organizerId: string; uid: string}[] {
  if (before && after && isDeepStrictEqual(before, after)) return [];
  const applicants = new Map<string, {organizerId: string; uid: string}>();
  for (const data of [before, after]) {
    if (typeof data?.organizerId === "string" && data.organizerId &&
        typeof data?.uid === "string" && data.uid) {
      applicants.set(JSON.stringify([data.organizerId, data.uid]),
        {organizerId: data.organizerId, uid: data.uid});
    }
  }
  return [...applicants.values()];
}

/** A review, an assignment, a new response or the application's removal. */
export const onHostApplicationDetailViewApplicationWritten =
  onDocumentWritten({
    ...options, document: "organizerApplications/{applicationId}",
  }, (event) => reconcileHostApplicationDetailView(admin.firestore(),
    event.params.applicationId));

/** Generic-form response fields an application's view reads. */
const viewedFormResponseFields = ["organizerId", "formId", "versionId",
  "status", "respondentUid", "answerSnapshots", "identity"] as const;

/**
 * Whether a generic-form response write changed what its application's view
 * shows: its owner, version, status, respondent, answers or identity.
 * @param {Data} before The response before the write.
 * @param {Data} after The response after the write.
 * @return {boolean} Whether to evaluate the response's application.
 */
export function applicationDetailFormResponseChanged(before: Data,
  after: Data): boolean {
  const pick = (data: Data) => data === undefined ? null :
    viewedFormResponseFields.map((field) => data[field] ?? null);
  return !isDeepStrictEqual(pick(before), pick(after));
}

/** A generic-form response submitted, withdrawn or erased. */
export const onHostApplicationDetailViewFormResponseWritten =
  onDocumentWritten({
    ...options, document: "organizerFormResponses/{responseId}",
  }, async (event) => {
    if (!applicationDetailFormResponseChanged(event.data?.before.data(),
      event.data?.after.data())) return;
    await reconcileHostApplicationDetailView(admin.firestore(),
      genericFormApplicationId(event.params.responseId));
  });

/** An imported answer snapshot written or removed. */
export const onHostApplicationDetailViewImportedResponseWritten =
  onDocumentWritten({
    ...options, document: "organizerApplicationResponses/{responseId}",
  }, async (event) => {
    const db = admin.firestore();
    for (const applicationId of applicationDetailIdsForImportedResponse(
      event.data?.before.data(), event.data?.after.data())) {
      await reconcileHostApplicationDetailView(db, applicationId);
    }
  });

/** A merge or unmerge moving the response's People link. */
export const onHostApplicationDetailViewOriginWritten = onDocumentWritten({
  ...options, document: "organizerContactOrigins/{originId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!applicationDetailOriginChanged(before, after)) return;
  const applicationId = await applicationIdForOrigin(admin.firestore(),
    after ?? before);
  if (applicationId) {
    await reconcileHostApplicationDetailView(admin.firestore(),
      applicationId);
  }
});

/** A community membership granted, revoked or erased. */
export const onHostApplicationDetailViewMembershipWritten =
  onDocumentWritten({
    ...options, document: "organizerCommunityMemberships/{membershipId}",
  }, async (event) => {
    const db = admin.firestore();
    for (const {organizerId, uid} of
      applicationDetailApplicantsForMembership(event.data?.before.data(),
        event.data?.after.data())) {
      await reconcileHostApplicationDetailViewsForApplicant(db, organizerId,
        uid);
    }
  });
