import * as admin from "firebase-admin";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import * as logger from "firebase-functions/logger";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {ResendEmailProvider} from "../email/resendEmailProvider";
import {SecretVersionReferenceGuard} from "../shared/secretVersionReference";
import {
  alertOnSalesIntent,
  alertOnSupportMessage,
  summariseOverflow,
  type OperatorAlertDeps,
} from "./delivery";

/**
 * Staff alerts for new support conversations and new leads. Everything is
 * switched off until billingNoticeSettings/platform carries operatorAlerts
 * with enabled true (docs/data_contracts.md, "Operator alerts"),
 * so deploying these Functions emails nobody. The email credential is the
 * pinned catch.transactional-email-credential/v1 version that settings
 * document already names for bill notices.
 */
const secrets = new SecretManagerServiceClient();
const references = new SecretVersionReferenceGuard();

export const defaultOperatorAlertDeps: OperatorAlertDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  emailSender: async (settings) => {
    await references.assert(settings.credentialVersion, /^[A-Za-z0-9_-]+$/u);
    const [result] = await secrets.accessSecretVersion({
      name: settings.credentialVersion});
    const data = result.payload?.data;
    if (!data || data.length > 8192) return null;
    const secret = JSON.parse(data.toString("utf8")) as
      Record<string, unknown>;
    if (secret.schema !== "catch.transactional-email-credential/v1" ||
        secret.provider !== settings.provider ||
        secret.accountId !== settings.accountId ||
        typeof secret.apiKey !== "string") return null;
    return new ResendEmailProvider(secret.apiKey);
  },
  warn: (message, fields) => logger.warn(message, fields),
};

// One instance each keeps a burst under the email provider's request rate;
// retried events are safe because each source has one receipt.
export const alertOperatorOnSupportMessage = onDocumentCreated({
  document: "supportConversations/{conversationId}/messages/{messageId}",
  retry: true, maxInstances: 1, timeoutSeconds: 60,
}, async (event) => {
  await alertOnSupportMessage(defaultOperatorAlertDeps,
    event.params.conversationId, event.params.messageId);
});

export const alertOperatorOnSalesLead = onDocumentCreated({
  document: "salesInboundIntents/{intentId}",
  retry: true, maxInstances: 1, timeoutSeconds: 60,
}, async (event) => {
  await alertOnSalesIntent(defaultOperatorAlertDeps, event.params.intentId);
});

export const summariseOperatorAlertOverflow = onSchedule({
  schedule: "2 * * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 120,
  maxInstances: 1, retryCount: 0,
}, async () => {
  await summariseOverflow(defaultOperatorAlertDeps);
});
