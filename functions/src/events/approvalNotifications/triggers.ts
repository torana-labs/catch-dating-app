import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {validateOrganizerApplicationDocument} from
  "../../shared/generated/validators/organizerApplicationDocument";
import {messages} from "./model";
import {enqueueApproval, ApprovalNotificationWork} from "./work";
import {ApprovalWhatsappReceipts} from "./whatsappReceipts";
export const onEventApplicationApprovalNotification = onDocumentWritten(
  {
    document: "organizerApplications/{applicationId}",
    retry: true,
    timeoutSeconds: 120,
    maxInstances: 5,
  },
  async (event) => {
    const after = event.data?.after.data();
    if (
      !validateOrganizerApplicationDocument(after) ||
      after.reviewStatus !== "approved" ||
      !after.linkedUid ||
      after.targetKind !== "event" ||
      !after.targetId ||
      !after.approvalNotificationBasis
    ) {
      return;
    }
    await enqueueApproval(
      admin.firestore(),
      event.params.applicationId,
      after.linkedUid,
      after.targetId,
    );
  },
);
export const onEventApprovalNotificationMessage = onDocumentWritten(
  {
    document: messages + "/{messageId}",
    retry: true,
    timeoutSeconds: 120,
    maxInstances: 5,
  },
  async (event) => {
    // Reservations and claim/receipt writes also wake; the Operations lease and
    // independently fenced outbox make concurrent wakeups observation-only.
    if (!event.data?.after.exists) return;
    await new ApprovalNotificationWork(admin.firestore()).processMessage(
      event.params.messageId,
      true,
    );
  },
);
export const onEventApprovalWhatsappReceipt = onDocumentCreated(
  {
    document: "organizerMessagingWebhookEvents/{eventId}",
    retry: true,
    timeoutSeconds: 60,
    maxInstances: 5,
  },
  async (event) => {
    await new ApprovalWhatsappReceipts(admin.firestore()).consumeQueued(
      event.params.eventId,
    );
  },
);
export const retryEventApprovalNotifications = onSchedule(
  {
    schedule: "every 5 minutes",
    timeoutSeconds: 120,
    maxInstances: 1,
  },
  () => new ApprovalNotificationWork(admin.firestore()).processDue(),
);
