import {Timestamp, type Firestore} from "firebase-admin/firestore";
import type {EmailSubmission, TransactionalEmail,
  TransactionalEmailProvider} from "../email/emailProvider";
import type {
  BillingNoticeSettingsDocument,
  HostOperatorAlertDocument,
  HostOperatorAlertWindowDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateBillingNoticeSettingsDocument} from
  "../shared/generated/validators/billingNoticeSettingsDocument";
import {validateHostOperatorAlertDocument} from
  "../shared/generated/validators/hostOperatorAlertDocument";
import {
  SUPPORT_QUIET_MILLIS,
  alertWindowId,
  classifySupportMessage,
  isFresh,
  operatorAlertEmail,
  overflowSummaryEmail,
  salesLeadAlert,
  supportAlert,
  type HeldAlert,
  type OperatorAlert,
} from "./alerts";

/**
 * Staff alert delivery: the Firestore side. One receipt per source in
 * hostOperatorAlerts is created before any email goes out, so a retried
 * trigger never sends twice; a send that dies mid-flight is left as sending
 * and never repeated. Each UTC clock hour counts its sends in one window
 * document, and past the cap alerts are held and listed in one summary email
 * after the hour. Settings live in billingNoticeSettings/platform, beside the
 * email credential they reuse; nothing is read or written past that settings
 * document while operatorAlerts is absent or switched off.
 */
export const ALERTS = "hostOperatorAlerts";
export const SETTINGS_PATH = "billingNoticeSettings/platform";
const WINDOW_SCOPE = "hourly";
const SUMMARY_LIMIT = 25;
const QUIET_SCAN_LIMIT = 50;

type Settings = BillingNoticeSettingsDocument;
type EmailSettings = NonNullable<Settings["email"]>;
type Receipt = HostOperatorAlertDocument;
type Window = HostOperatorAlertWindowDocument;

export interface OperatorAlertConfig {
  email: EmailSettings;
  from: string;
  recipients: string[];
  hourlyCap: number;
}

export interface OperatorAlertDeps {
  db: () => Firestore;
  now: () => number;
  /** The sender for the credential the settings name, or null. */
  emailSender: (email: EmailSettings) =>
    Promise<TransactionalEmailProvider | null>;
  /** Logs a problem without contact details. */
  warn?: (message: string, fields: Record<string, unknown>) => void;
}

export type AlertOutcome = "disabled" | "ignored" | "stale" | "duplicate" |
  "overflow" | "sent" | "failed" | "unknown";

/**
 * The switched-on configuration, or null: no settings, invalid settings, no
 * email credential, or operatorAlerts absent or disabled.
 * @param {Firestore} db Firestore.
 * @return {Promise<OperatorAlertConfig|null>} Configuration.
 */
export async function readOperatorAlertConfig(db: Firestore):
  Promise<OperatorAlertConfig | null> {
  const data = (await db.doc(SETTINGS_PATH).get()).data();
  if (data === undefined || !validateBillingNoticeSettingsDocument(data)) {
    return null;
  }
  const alerts = data.operatorAlerts;
  if (!data.email || !alerts?.enabled) return null;
  return {email: data.email, from: alerts.from,
    recipients: [...alerts.recipients], hourlyCap: alerts.hourlyCap};
}

function windows(db: Firestore) {
  return db.collection(ALERTS).doc(WINDOW_SCOPE).collection("windows");
}

function windowRow(current: Window | undefined, windowId: string,
  clock: number, held: boolean): Window {
  const summaryStatus = current?.summaryStatus ?? "none";
  return {
    schemaVersion: 1,
    windowId,
    sentCount: (current?.sentCount ?? 0) + (held ? 0 : 1),
    overflowCount: (current?.overflowCount ?? 0) + (held ? 1 : 0),
    summaryStatus: held && summaryStatus === "none" ? "pending" :
      summaryStatus,
    createdAtMillis: current?.createdAtMillis ?? clock,
    updatedAtMillis: clock,
  };
}

async function submitOnce(deps: OperatorAlertDeps, config: OperatorAlertConfig,
  build: () => TransactionalEmail, label: string): Promise<EmailSubmission> {
  const sender = await deps.emailSender(config.email).catch(() => null);
  if (!sender) {
    deps.warn?.("Operator alert email credential is unusable.", {label});
    return {kind: "rejected", reason: "senderUnavailable"};
  }
  // A short provider throttle is waited out once; the stable idempotency
  // key keeps the second request from sending a second email.
  for (let attempt = 0; ; attempt++) {
    let result: EmailSubmission;
    try {
      result = await sender.submit(build());
    } catch {
      result = {kind: "unknown"};
    }
    if (result.kind !== "deferred" || attempt > 0 ||
        result.retryAfterMillis > 5_000) return result;
    await new Promise((resolve) =>
      setTimeout(resolve, result.retryAfterMillis));
  }
}

function settled(result: EmailSubmission, recipients: number):
  Pick<Receipt, "acceptedCount" | "providerMessageId"> &
    {status: "sent" | "failed" | "unknown"} {
  return result.kind === "accepted" ?
    {status: "sent", acceptedCount: recipients,
      providerMessageId: result.providerMessageId} :
    {status: result.kind === "unknown" ? "unknown" : "failed",
      acceptedCount: 0, providerMessageId: null};
}

/**
 * Reserves the alert's receipt and a place under the hourly cap, then
 * emails it, or holds it for the hour's summary.
 * @param {OperatorAlertDeps} deps Dependencies.
 * @param {OperatorAlertConfig} config Switched-on configuration.
 * @param {OperatorAlert} alert Alert.
 * @return {Promise<AlertOutcome>} What happened.
 */
export async function deliverOperatorAlert(deps: OperatorAlertDeps,
  config: OperatorAlertConfig, alert: OperatorAlert): Promise<AlertOutcome> {
  const db = deps.db();
  const reservedAt = deps.now();
  if (!isFresh(alert.occurredAtMillis, reservedAt)) return "stale";
  const windowId = alertWindowId(reservedAt);
  const receiptRef = db.collection(ALERTS).doc(alert.alertId);
  const windowRef = windows(db).doc(windowId);
  const reserved = await db.runTransaction(async (tx) => {
    const [receipt, window] = await Promise.all([tx.get(receiptRef),
      tx.get(windowRef)]);
    if (receipt.exists) return null;
    const current = window.data() as Window | undefined;
    const held = (current?.sentCount ?? 0) >= config.hourlyCap;
    const row: Receipt = {
      schemaVersion: 2, alertId: alert.alertId, kind: alert.kind,
      sourcePath: alert.sourcePath, adminPath: alert.adminPath, windowId,
      occurredAtMillis: alert.occurredAtMillis,
      status: held ? "overflow" : "sending", acceptedCount: 0,
      providerMessageId: null, createdAtMillis: reservedAt,
      updatedAtMillis: reservedAt,
    };
    if (!validateHostOperatorAlertDocument(row)) {
      throw new Error("Operator alert receipt is not valid.");
    }
    tx.set(windowRef, windowRow(current, windowId, reservedAt, held));
    tx.create(receiptRef, row);
    return row.status;
  });
  if (reserved === null) return "duplicate";
  if (reserved === "overflow") return "overflow";
  const result = await submitOnce(deps, config, () => operatorAlertEmail(
    alert, {from: config.from, to: config.recipients, nowMillis: deps.now()}),
  alert.kind);
  const outcome = settled(result, config.recipients.length);
  await receiptRef.update({...outcome, updatedAtMillis: deps.now()});
  if (outcome.status !== "sent") {
    deps.warn?.("Operator alert email was not accepted.",
      {alertId: alert.alertId, result: result.kind});
  }
  return outcome.status;
}

/**
 * Alerts staff about a new support message when it opened a conversation or
 * follows four hours without an inbound message.
 * @param {OperatorAlertDeps} deps Dependencies.
 * @param {string} conversationId Conversation.
 * @param {string} messageId New message.
 * @return {Promise<AlertOutcome>} What happened.
 */
export async function alertOnSupportMessage(deps: OperatorAlertDeps,
  conversationId: string, messageId: string): Promise<AlertOutcome> {
  const db = deps.db();
  const config = await readOperatorAlertConfig(db);
  if (!config) return "disabled";
  const conversationRef = db.collection("supportConversations")
    .doc(conversationId);
  const [conversation, message] = await Promise.all([
    conversationRef.get(),
    conversationRef.collection("messages").doc(messageId).get(),
  ]);
  const kind = classifySupportMessage(conversation.data(), message.data());
  if (!kind) return "ignored";
  if (kind === "existing") {
    const at = message.get("at") as FirebaseFirestore.Timestamp;
    // One range on one field needs no composite index. Fifty rows in four
    // hours without an inbound one is treated as quiet.
    const recent = await conversationRef.collection("messages")
      .where("at", ">=", Timestamp.fromMillis(at.toMillis() -
        SUPPORT_QUIET_MILLIS))
      .where("at", "<", at).orderBy("at", "desc").limit(QUIET_SCAN_LIMIT)
      .get();
    if (recent.docs.some((row) => row.id !== messageId &&
        row.get("direction") === "inbound")) return "ignored";
  }
  const alert = supportAlert({conversationId, messageId,
    conversation: conversation.data(), message: message.data(), kind});
  return alert ? deliverOperatorAlert(deps, config, alert) : "ignored";
}

/**
 * Alerts staff about a new lead.
 * @param {OperatorAlertDeps} deps Dependencies.
 * @param {string} intentId The new salesInboundIntents document.
 * @return {Promise<AlertOutcome>} What happened.
 */
export async function alertOnSalesIntent(deps: OperatorAlertDeps,
  intentId: string): Promise<AlertOutcome> {
  const db = deps.db();
  const config = await readOperatorAlertConfig(db);
  if (!config) return "disabled";
  const intent = await db.collection("salesInboundIntents").doc(intentId)
    .get();
  const alert = salesLeadAlert(intentId, intent.data());
  return alert ? deliverOperatorAlert(deps, config, alert) : "ignored";
}

/**
 * Sends one summary for each closed hour whose alerts went past the cap.
 * @param {OperatorAlertDeps} deps Dependencies.
 * @return {Promise<number>} Summaries attempted.
 */
export async function summariseOverflow(deps: OperatorAlertDeps):
  Promise<number> {
  const db = deps.db();
  const config = await readOperatorAlertConfig(db);
  if (!config) return 0;
  const currentWindow = alertWindowId(deps.now());
  const pending = await windows(db).where("summaryStatus", "==", "pending")
    .limit(5).get();
  let attempted = 0;
  for (const doc of pending.docs) {
    if (doc.id >= currentWindow) continue;
    const claimed = await db.runTransaction(async (tx) => {
      const row = (await tx.get(doc.ref)).data() as Window | undefined;
      if (row?.summaryStatus !== "pending") return null;
      tx.update(doc.ref, {summaryStatus: "sending",
        updatedAtMillis: deps.now()});
      return row;
    });
    if (!claimed) continue;
    attempted++;
    // Two equality filters merge single-field indexes; no composite needed.
    const heldRows = await db.collection(ALERTS)
      .where("windowId", "==", doc.id).where("status", "==", "overflow")
      .limit(SUMMARY_LIMIT).get();
    const held: HeldAlert[] = heldRows.docs.map((row) => row.data() as Receipt)
      .map(({kind, adminPath, occurredAtMillis}) =>
        ({kind, adminPath, occurredAtMillis}))
      .sort((a, b) => a.occurredAtMillis - b.occurredAtMillis);
    const result = await submitOnce(deps, config, () => overflowSummaryEmail({
      windowId: doc.id, overflowCount: claimed.overflowCount, held,
      from: config.from, to: config.recipients, nowMillis: deps.now()}),
    "summary");
    const status = result.kind === "accepted" ? "sent" :
      result.kind === "unknown" ? "unknown" : "failed";
    await doc.ref.update({summaryStatus: status, updatedAtMillis: deps.now()});
  }
  return attempted;
}
