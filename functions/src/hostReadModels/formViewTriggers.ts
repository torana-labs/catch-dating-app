import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileFormAnalyticsView,
  reconcileFormEditorView,
  reconcileFormSourceView,
} from "./formViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

/** The string a field holds before and after a write, each once. */
function ids(before: Data, after: Data, field: string): string[] {
  const values = new Set<string>();
  for (const data of [before, after]) {
    const value = data?.[field];
    if (typeof value === "string" && value) values.add(value);
  }
  return [...values];
}

/**
 * A form saved, published, paused, answered or deleted: its editor view.
 * Its owner changing or the form vanishing: its share-link funnel view too.
 */
export const onHostFormEditorViewFormChanged = onDocumentWritten({
  ...options, document: "organizerForms/{formId}",
}, async (event) => {
  const db = admin.firestore();
  const formId = event.params.formId;
  await reconcileFormEditorView(db, formId);
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before && after && before.organizerId === after.organizerId) return;
  await reconcileFormSourceView(db, formId);
});

/** A draft saved or deleted: its form's editor view. */
export const onHostFormEditorViewDraftChanged = onDocumentWritten({
  ...options, document: "organizerFormDrafts/{formId}",
}, (event) => reconcileFormEditorView(admin.firestore(),
  event.params.formId));

/** A version published (versions are immutable): its analytics view. */
export const onHostFormAnalyticsViewVersionChanged = onDocumentWritten({
  ...options, document: "organizerFormVersions/{versionId}",
}, (event) => reconcileFormAnalyticsView(admin.firestore(),
  event.params.versionId));

/** An open, start, submission or withdrawal counted: its version's view. */
export const onHostFormAnalyticsViewAggregateChanged = onDocumentWritten({
  ...options, document: "organizerFormAggregates/{aggregateId}",
}, async (event) => {
  for (const versionId of ids(event.data?.before.data(),
    event.data?.after.data(), "versionId")) {
    await reconcileFormAnalyticsView(admin.firestore(), versionId);
  }
});

/** A share link made, renamed or counted: its form's funnel view. */
export const onHostFormSourceViewLinkChanged = onDocumentWritten({
  ...options, document: "organizerFormShareLinks/{linkId}",
}, async (event) => {
  for (const formId of ids(event.data?.before.data(),
    event.data?.after.data(), "formId")) {
    await reconcileFormSourceView(admin.firestore(), formId);
  }
});

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const organizerFormsProjections = defineProjections("organizerForms", [
  {
    id: "hostFormEditorViewFormChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      const db = admin.firestore();
      const formId = documentId;
      await reconcileFormEditorView(db, formId);
      if (before && after && before.organizerId === after.organizerId) return;
      await reconcileFormSourceView(db, formId);
    },
  },
]);
