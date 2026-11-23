import {reconcileResponseSummary, reconcileApplicationSummary,
  refreshFormResponseSummaries} from "./responseStore";
import {reconcileSimpleSummary} from "./simpleStore";
import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileContactSummary} from "./contactStore";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true, memory: "512MiB" as const};
export const onHostContactSummaryChanged = onDocumentWritten({
  ...options, document: "organizerContacts/{contactId}",
}, (event) => reconcileContactSummary(
  admin.firestore(), event.params.contactId));
export const onHostContactTraitsSummaryChanged = onDocumentWritten({
  ...options, document: "organizerContactTraits/{contactId}",
}, (event) => reconcileContactSummary(
  admin.firestore(), event.params.contactId));
export const onHostContactChannelSummaryChanged = onDocumentWritten({
  ...options, document: "organizerContactChannelStates/{stateId}",
}, async (event) => {
  const ids = new Set([event.data?.before.get("contactId"),
    event.data?.after.get("contactId")]);
  for (const id of ids) {
    if (typeof id === "string") {
      await reconcileContactSummary(
        admin.firestore(), id);
    }
  }
});

/** Vocabulary changes fan out in bounded pages, outside list reads. */
export const onHostContactVocabularySummaryChanged = onDocumentWritten({
  ...options, document: "organizerContactTagVocabularies/{organizerId}",
}, async (event) => {
  const db = admin.firestore();
  const organizerId = event.params.organizerId;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("organizerContacts")
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) await reconcileContactSummary(db, doc.id);
    cursor = page.size === 100 ? page.docs.at(-1) : undefined;
  } while (cursor);
  // Refresh choices even for an organizer with no contacts.
  await db.runTransaction(async (tx) => {
    const ref = db.collection("hostDirectorySummaries").doc(organizerId);
    const [summary, vocabulary] = await tx.getAll(ref,
      db.collection("organizerContactTagVocabularies").doc(organizerId));
    if (summary.exists) {
      tx.update(ref, {manualTagVocabulary:
      vocabulary.get("organizerId") === organizerId ?
        (vocabulary.get("tags") ?? []).map(
          ({tagId, label}: {tagId: string; label: string}) =>
            ({tagId, label})) :
        []});
    }
  });
});

export const onHostFormSummaryChanged = onDocumentWritten({
  ...options, document: "organizerForms/{formId}",
}, async (event) => {
  const db = admin.firestore();
  await reconcileSimpleSummary(db, "forms", event.params.formId);
  if (event.data?.before.get("title") !== event.data?.after.get("title") ||
      event.data?.before.get("organizerId") !==
        event.data?.after.get("organizerId")) {
    await refreshFormResponseSummaries(db, "formId", event.params.formId);
  }
});
export const onHostEventSummaryChanged = onDocumentWritten({
  ...options, document: "events/{eventId}",
}, async (event) => {
  if (event.data?.before.exists && event.data?.after.exists &&
      event.data.before.get("publicationState") === "published" &&
      event.data.after.get("publicationState") === "published") return;
  await reconcileSimpleSummary(
    admin.firestore(), "events", event.params.eventId);
});

/**
 * An event write outside an already published event: its summary row.
 * The events dispatcher (issue #2451) runs the same work; both run until
 * the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const hostEventSummaryProjections = defineProjections("events", [{
  id: "hostEventSummary", kind: "projection",
  when: ({before, after}) => !(before && after &&
    before.publicationState === "published" &&
    after.publicationState === "published"),
  run: (change, ctx) => reconcileSimpleSummary(ctx.db, "events",
    change.documentId),
}]);

export const onHostAudienceSummaryCoverageChanged = onDocumentWritten({
  ...options, document: "organizerAudienceSummaries/{organizerId}",
}, async (event) => {
  if (event.data?.before.get("sourceCoverage") ===
        event.data?.after.get("sourceCoverage") &&
      event.data?.before.get("projectionVersion") ===
        event.data?.after.get("projectionVersion")) return;
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const ref = db.collection("hostDirectorySummaries")
      .doc(event.params.organizerId);
    const [view, source] = await tx.getAll(ref,
      db.collection("organizerAudienceSummaries")
        .doc(event.params.organizerId));
    if (!view.exists) return;
    const exact = source.get("sourceCoverage") === "exact";
    tx.update(ref, {"sourceCoverage": exact ? "exact" : "partial",
      "summary.truncated": !exact,
      "projectionVersion": source.get("projectionVersion") ?? 1});
  });
});

export const onHostGroupSummaryChanged = onDocumentWritten({
  ...options, document: "organizerSavedAudiences/{audienceId}",
}, (event) => reconcileSimpleSummary(
  admin.firestore(), "groups", event.params.audienceId));

export const onHostResponseSummaryChanged = onDocumentWritten({
  ...options, document: "organizerFormResponses/{responseId}",
}, (event) => reconcileResponseSummary(
  admin.firestore(), "response", event.params.responseId));

export const onHostApplicationSummaryChanged = onDocumentWritten({
  ...options, document: "organizerApplications/{applicationId}",
}, async (event) => {
  const db = admin.firestore();
  await reconcileApplicationSummary(db, event.params.applicationId);
  const oldId = event.data?.before.get("latestResponseId");
  // Old data is only a routing hint. Every projection rereads current sources.
  if (typeof oldId === "string") {
    await reconcileResponseSummary(db, "response", oldId);
  }
});

export const onHostApplicationEvidenceSummaryChanged = onDocumentWritten({
  ...options, document: "organizerApplicationResponses/{responseId}",
}, async (event) => {
  const ids = new Set([event.data?.before.get("applicationId"),
    event.data?.after.get("applicationId")]);
  for (const id of ids) {
    if (typeof id === "string") {
      await reconcileApplicationSummary(admin.firestore(), id);
    }
  }
});

export const onHostResponseConversionSummaryChanged = onDocumentWritten({
  ...options, document: "organizerFormConversionReceipts/{receiptId}",
}, async (event) => {
  const ids = new Set([event.data?.before.get("responseId"),
    event.data?.after.get("responseId")]);
  for (const id of ids) {
    if (typeof id === "string") {
      await reconcileResponseSummary(admin.firestore(), "response", id);
    }
  }
});

export const onHostResponseSourceLabelSummaryChanged = onDocumentWritten({
  ...options, document: "organizerFormShareLinks/{shareLinkId}",
}, async (event) => {
  if (event.data?.before.get("label") === event.data?.after.get("label") &&
      event.data?.before.get("organizerId") ===
        event.data?.after.get("organizerId")) return;
  await refreshFormResponseSummaries(admin.firestore(), "sourceLinkId",
    event.params.shareLinkId);
});

export const onHostResponseContactOriginChanged = onDocumentWritten({
  ...options, document: "organizerContactOrigins/{originId}",
}, async (event) => {
  const db = admin.firestore();
  const routes = new Set<string>();
  for (const snapshot of [event.data?.before, event.data?.after]) {
    if (snapshot?.get("sourceKind") !== "hostForm") continue;
    const kind = snapshot.get("sourceEntityKind");
    const id = snapshot.get("sourceEntityId");
    if (typeof id === "string" && ["hostFormResponse",
      "hostApplicationResponse"].includes(kind)) routes.add(`${kind}:${id}`);
  }
  for (const route of routes) {
    const separator = route.indexOf(":");
    const kind = route.slice(0, separator);
    const id = route.slice(separator + 1);
    if (kind === "hostFormResponse") {
      await reconcileResponseSummary(db, "response", id);
    } else {
      const evidence = await db.collection("organizerApplicationResponses")
        .doc(id).get();
      const applicationId = evidence.get("applicationId");
      if (typeof applicationId === "string") {
        await reconcileApplicationSummary(db, applicationId);
      }
    }
  }
});
