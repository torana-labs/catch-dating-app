import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  contactWhatsappThreadIds,
  reconcileWhatsappThreadView,
} from "./whatsappThreadViewStore";

const options = {retry: true};

/**
 * Keeps hostWhatsappThreadViews/{threadId} equal to its thread: inbound
 * messages from the webhook, replies, and the retention delete.
 */
export const onHostWhatsappThreadViewThreadChanged = onDocumentWritten({
  ...options, document: "organizerWhatsappThreads/{threadId}",
}, (event) => reconcileWhatsappThreadView(admin.firestore(),
  event.params.threadId));

/** A contact rename, merge, hide, delete or identity change. */
export const onHostWhatsappThreadViewContactChanged = onDocumentWritten({
  ...options, document: "organizerContacts/{contactId}",
}, async (event) => {
  const threadIds = contactWhatsappThreadIds(event.params.contactId,
    event.data?.before.data(), event.data?.after.data());
  for (const threadId of threadIds) {
    await reconcileWhatsappThreadView(admin.firestore(), threadId);
  }
});
