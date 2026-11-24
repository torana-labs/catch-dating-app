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

/**
 * Dispatcher specs (issue #2451). Each body re-reads its sources, so a
 * retry or a replay converges.
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
