import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  contactWhatsappThreadIds,
  reconcileWhatsappThreadView,
} from "./whatsappThreadViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

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

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const organizerContactsProjections = defineProjections(
  "organizerContacts", [
    {
      id: "hostWhatsappThreadViewContactChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after, documentId} = change;
        const threadIds = contactWhatsappThreadIds(documentId,
          before, after);
        for (const threadId of threadIds) {
          await reconcileWhatsappThreadView(admin.firestore(), threadId);
        }
      },
    },
  ]);
