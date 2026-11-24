import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {reconcileProviderConnectionView} from "./providerConnectionViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type ProviderConnectionViewSource =
  | "organizerProviderConnections"
  | "organizers";

function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/**
 * The organizers whose connection view a source write can change, from both
 * the old and the new version. Old data is only a routing hint: every
 * evaluation rereads current sources. An organizer gets its (empty) view when
 * it is created and loses it when it is deleted; its updates never change
 * the view.
 */
export function resolveProviderConnectionViewOrganizerIds(
  source: ProviderConnectionViewSource,
  documentId: string,
  before: SourceData,
  after: SourceData
): string[] {
  if (source === "organizers") {
    return before && after ? [] : [documentId];
  }
  return distinctIds([before?.organizerId, after?.organizerId]);
}

const options = {retry: true, memory: "512MiB" as const};

async function reconcileForChange(source: ProviderConnectionViewSource,
  documentId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<void> {
  const db = admin.firestore();
  const organizerIds = resolveProviderConnectionViewOrganizerIds(source,
    documentId, before,
    after);
  for (const organizerId of organizerIds) {
    await reconcileProviderConnectionView(db, organizerId);
  }
}

async function reconcileForWrite(
  source: ProviderConnectionViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  await reconcileForChange(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
}

export const onHostProviderConnectionViewConnectionChanged =
  onDocumentWritten({
    ...options, document: "organizerProviderConnections/{documentId}",
  }, (event) => reconcileForWrite("organizerProviderConnections", event));

/**
 * An organizer write: its provider connection view.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostProviderConnectionViewProjections = defineProjections(
  "organizers", [{
    id: "hostProviderConnectionView", kind: "projection", when: () => true,
    run: (change) => reconcileForChange("organizers", change.documentId,
      change.before, change.after),
  }]);
