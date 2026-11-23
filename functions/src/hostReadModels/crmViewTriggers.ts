import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileAudienceSourceView} from "./audienceSourceViewStore";
import {
  reconcileContactMergeCandidates,
  reconcileContactMergeCandidateView,
} from "./contactMergeCandidateViewStore";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

/** Whether a write left every named field as it was (and the doc there). */
const same = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  fields.every((field) =>
    JSON.stringify(before[field] ?? null) ===
      JSON.stringify(after[field] ?? null));

/** The organizer ids a source document names, before and after. */
function organizerIds(before: Data, after: Data): string[] {
  const ids = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.organizerId === "string" && data.organizerId) {
      ids.add(data.organizerId);
    }
  }
  return [...ids];
}

/** Rewrites the audience source view of each organizer a write names. */
async function audienceSources(before: Data, after: Data): Promise<void> {
  for (const organizerId of organizerIds(before, after)) {
    await reconcileAudienceSourceView(admin.firestore(), organizerId);
  }
}

/** A form made, renamed, published or deleted: its organizer's sources. */
export const onHostAudienceSourceViewFormChanged = onDocumentWritten({
  ...options, document: "organizerForms/{formId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "title", "activeVersionId"])) return;
  await audienceSources(before, after);
});

/** An imported application form made, renamed or deleted. */
export const onHostAudienceSourceViewApplicationFormChanged =
  onDocumentWritten({
    ...options, document: "organizerApplicationForms/{formId}",
  }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (same(before, after, ["organizerId", "title"])) return;
    await audienceSources(before, after);
  });

/** A form version published (versions are immutable) or removed. */
export const onHostAudienceSourceViewVersionChanged = onDocumentWritten({
  ...options, document: "organizerFormVersions/{versionId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "formId", "version",
    "definition"])) return;
  await audienceSources(before, after);
});

/** An event made, renamed, moved or deleted; other event writes skip. */
export const onHostAudienceSourceViewEventChanged = onDocumentWritten({
  ...options, document: "events/{eventId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "name"])) return;
  await audienceSources(before, after);
});

/** The organizer's manual tag list changed. */
export const onHostAudienceSourceViewTagsChanged = onDocumentWritten({
  ...options, document: "organizerContactTagVocabularies/{organizerId}",
}, async (event) => {
  await reconcileAudienceSourceView(admin.firestore(),
    event.params.organizerId);
});

/** The contact ids a claim names while it is conflicted. */
function claimContacts(data: Data): string[] {
  if (data?.state !== "conflicted") return [];
  const ids = [data.verifiedContactId, ...(Array.isArray(
    data.conflictingContactIds) ? data.conflictingContactIds : [])];
  return ids.filter((id): id is string => typeof id === "string" && !!id);
}

/** A verified identity claim conflicting or settling: its pairs. */
export const onHostMergeCandidateViewClaimChanged = onDocumentWritten({
  ...options, document: "organizerContactIdentityClaims/{claimId}",
}, async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  for (const organizerId of organizerIds(before, after)) {
    const contacts = [...new Set([...claimContacts(before),
      ...claimContacts(after)])].sort();
    for (let left = 0; left < contacts.length; left += 1) {
      for (let right = left + 1; right < contacts.length; right += 1) {
        await reconcileContactMergeCandidateView(db, organizerId,
          [contacts[left], contacts[right]]);
      }
    }
  }
});

/** An identity link added, confirmed or moved: its contact's pairs. */
export const onHostMergeCandidateViewLinkChanged = onDocumentWritten({
  ...options, document: "organizerContactIdentityLinks/{linkId}",
}, async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "contactId", "kind",
    "identityHash", "confidence", "source", "updatedAt"])) return;
  for (const data of [before, after]) {
    if (typeof data?.organizerId !== "string" ||
        typeof data.contactId !== "string") continue;
    await reconcileContactMergeCandidates(db, data.organizerId,
      data.contactId);
  }
});

/** Fields a pair shows of a contact, and those that make it eligible. */
const shownContactFields = ["displayName", "displayNameOverride",
  "phoneE164", "email", "linkedUid", "primarySource", "revision"];
const eligibilityFields = ["organizerId", "deletedAt", "hiddenAt",
  "identityState"];

/**
 * A contact appearing, hidden, merged or deleted: every pair it may stand
 * in. A shown field changing: only its current pairs.
 */
export const onHostMergeCandidateViewContactChanged = onDocumentWritten({
  ...options, document: "organizerContacts/{contactId}",
}, async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const eligibilitySame = same(before, after, eligibilityFields);
  if (eligibilitySame && same(before, after, shownContactFields)) return;
  for (const organizerId of organizerIds(before, after)) {
    await reconcileContactMergeCandidates(db, organizerId,
      event.params.contactId, eligibilitySame);
  }
});

/** A contact's event history changing: the shared events of its pairs. */
export const onHostMergeCandidateViewEdgeChanged = onDocumentWritten({
  ...options, document: "organizerContactEventEdges/{edgeId}",
}, async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "contactId", "eventId"])) return;
  for (const data of [before, after]) {
    if (typeof data?.organizerId !== "string" ||
        typeof data.contactId !== "string") continue;
    await reconcileContactMergeCandidates(db, data.organizerId,
      data.contactId, true);
  }
});

/** A pair marked as different people or shown again. */
export const onHostMergeCandidateViewDecisionChanged = onDocumentWritten({
  ...options, document: "organizerContactMergeReviewDecisions/{decisionId}",
}, async (event) => {
  const db = admin.firestore();
  for (const data of [event.data?.before.data(), event.data?.after.data()]) {
    if (typeof data?.organizerId !== "string" ||
        !Array.isArray(data.contactIds) || data.contactIds.length !== 2) {
      continue;
    }
    await reconcileContactMergeCandidateView(db, data.organizerId,
      data.contactIds as string[]);
  }
});
