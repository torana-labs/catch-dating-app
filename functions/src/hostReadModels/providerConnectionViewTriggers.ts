import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {reconcileProviderConnectionView} from "./providerConnectionViewStore";

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

async function reconcileForWrite(
  source: ProviderConnectionViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  const db = admin.firestore();
  const organizerIds = resolveProviderConnectionViewOrganizerIds(source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data());
  for (const organizerId of organizerIds) {
    await reconcileProviderConnectionView(db, organizerId);
  }
}

export const onHostProviderConnectionViewConnectionChanged =
  onDocumentWritten({
    ...options, document: "organizerProviderConnections/{documentId}",
  }, (event) => reconcileForWrite("organizerProviderConnections", event));
export const onHostProviderConnectionViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
