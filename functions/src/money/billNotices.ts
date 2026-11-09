import * as admin from "firebase-admin";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import * as logger from "firebase-functions/logger";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  assertTransactionalEmail,
  type EmailSubmission,
  type TransactionalEmail,
} from "../email/emailProvider";
import {ResendEmailProvider} from "../email/resendEmailProvider";
import {resolveConversationPushTokens} from
  "../shared/conversationPushTargets";
import {organizerOwnerUserId} from "../shared/organizerHosts";
import {notificationCopy} from "../shared/notificationCopy";
import {buildFcmMessage} from "../shared/notifications";
import {SecretVersionReferenceGuard} from "../shared/secretVersionReference";
import type {
  BillingNoticeSettingsDocument,
  OrganizerBillDocument,
  OrganizerBillNoticeDocument,
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateBillingNoticeSettingsDocument} from
  "../shared/generated/validators/billingNoticeSettingsDocument";
import {validateOrganizerBillNoticeDocument} from
  "../shared/generated/validators/organizerBillNoticeDocument";

/**
 * Getting bills to hosts outside the app. When staff send or remind a bill,
 * one notice is queued; delivery emails the owner's verified address (an
 * operational account notice: no marketing consent applies, as for host
 * application alerts) and pushes a neutral "bill issued" to the Host app,
 * with no amount and no link, so the app keeps within App Store guideline
 * 3.1.3(f). Paying happens on the invoice's own page from the email.
 * WhatsApp from Catch to hosts is not active (docs/host_product.md: its first
 * purpose is an open owner decision) and is not sent.
 */
export const organizerBillNoticesCollection = "organizerBillNotices";
export const billingNoticeSettingsPath = "billingNoticeSettings/platform";
const maxEmailAttempts = 5;
const sweepLimit = 50;

type Db = FirebaseFirestore.Firestore;
type Bill = OrganizerBillDocument;
type Notice = OrganizerBillNoticeDocument;
type Settings = BillingNoticeSettingsDocument;

export interface NoticeDeps {
  db: () => Db;
  now: () => number;
  /** The owner's verified email, or null when Auth has none verified. */
  verifiedEmail: (uid: string) => Promise<string | null>;
  /** Host-app push tokens for a user. */
  hostTokens: (uid: string) => Promise<string[]>;
  sendPush: (message: admin.messaging.Message) => Promise<void>;
  /** The email sender for these settings, or null when unusable. */
  emailSender: (settings: NonNullable<Settings["email"]>) =>
    Promise<{submit: (message: TransactionalEmail) =>
      Promise<EmailSubmission>} | null>;
}

const secrets = new SecretManagerServiceClient();
const references = new SecretVersionReferenceGuard();

export const defaultNoticeDeps: NoticeDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  verifiedEmail: async (uid) => {
    const user = await admin.auth().getUser(uid).catch(() => null);
    return user?.email && user.emailVerified ? user.email : null;
  },
  hostTokens: async (uid) => {
    const db = admin.firestore();
    const user = (await db.collection("users").doc(uid).get()).data() as
      UserProfileDocument | undefined;
    return resolveConversationPushTokens(db, uid, "host", user);
  },
  sendPush: async (message) => {
    await admin.messaging().send(message);
  },
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
};

/**
 * The notice id for a bill event: one per send, one per reminder.
 * @param {Bill} bill The bill.
 * @param {"issued"|"reminder"} kind What happened.
 * @return {string} Notice id.
 */
export function billNoticeId(bill: Bill, kind: "issued" | "reminder"):
  string {
  return kind === "issued" ? `${bill.billId}_issued` :
    `${bill.billId}_reminder${bill.reminders.length}`;
}

function checkedNotice(notice: Notice): Notice {
  const id = notice.noticeId;
  if (!validateOrganizerBillNoticeDocument(notice)) {
    throw new Error(`Bill notice ${id} is not valid.`);
  }
  return notice;
}

/**
 * Queues one notice; queuing the same event again changes nothing.
 * @param {object} deps Firestore and clock.
 * @param {Bill} bill The bill just sent or reminded.
 * @param {"issued"|"reminder"} kind What happened.
 * @return {Promise<void>} Resolves once queued.
 */
export async function enqueueBillNotice(
  deps: Pick<NoticeDeps, "db" | "now">, bill: Bill,
  kind: "issued" | "reminder"): Promise<void> {
  const db = deps.db();
  const now = deps.now();
  const noticeId = billNoticeId(bill, kind);
  const notice = checkedNotice({schemaVersion: 1, noticeId,
    billId: bill.billId, organizerId: bill.organizerId, kind,
    email: {state: "pending", attempts: 0, providerMessageId: null,
      nextAttemptAtMillis: null, atMillis: null},
    push: {state: "pending", sentCount: 0, atMillis: null},
    createdAtMillis: now, updatedAtMillis: now});
  const ref = db.collection(organizerBillNoticesCollection).doc(noticeId);
  await db.runTransaction(async (tx) => {
    // The event was queued before.
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, notice);
  });
}

function istDay(millis: number, withYear = true): string {
  return new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short",
    ...(withYear ? {year: "numeric"} : {}), timeZone: "Asia/Kolkata"})
    .format(millis);
}

/**
 * The bill's period as people say it, India time: 9 Nov – 8 Dec 2026 for a
 * cycle, October 2026 for a calendar month.
 * @param {Bill} bill The bill.
 * @return {string} Period.
 */
export function billPeriodText(bill: Bill): string {
  if ((bill.periodKind ?? "calendarMonth") === "cycle") {
    return `${istDay(bill.periodStartMillis, false)} – ` +
      istDay(bill.periodEndMillis - 1);
  }
  const [year, month] = bill.month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {month: "long", year: "numeric",
    timeZone: "UTC"}).format(Date.UTC(year, month - 1, 15));
}

function rupees(minor: number): string {
  const whole = minor % 100 === 0;
  return `₹${(minor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2})}`;
}

/**
 * The email for a notice: plain text with the invoice's own page.
 * @param {object} input Bill, notice kind, sender and recipient.
 * @return {TransactionalEmail} The email.
 */
export function billNoticeEmail(input: {bill: Bill; notice: Notice;
  from: string; to: string; nowMillis: number}): TransactionalEmail {
  const {bill, notice} = input;
  const period = billPeriodText(bill);
  const number = bill.invoiceNumber ?? "";
  const due = bill.dueAtMillis === null ? null : istDay(bill.dueAtMillis);
  const url = bill.razorpayInvoice?.url ?? bill.paymentLink?.url ?? null;
  const subject = notice.kind === "issued" ?
    `Your Catch bill ${number} for ${period}` :
    `Reminder: Catch bill ${number}${due ? ` is due ${due}` : ""}`;
  const netSales = bill.sales.grossMinor - bill.sales.refundedMinor;
  const plan = bill.plan?.kind === "toolsOnly" ?
    "Tools-only plan for this billing cycle" :
    `Commission on ${rupees(netSales)} of ticket sales after refunds` +
      (bill.commission.capped ? ", capped" : "");
  const lines = [
    `Hello ${bill.organizerName || "there"},`,
    "",
    notice.kind === "issued" ?
      `Catch has issued your bill ${number} for ${period}.` :
      `This is a reminder that your Catch bill ${number} for ${period} ` +
        "is still open.",
    "",
    `Amount: ${rupees(bill.totalMinor)}`,
    plan,
    bill.gst.registered ? `Includes GST of ${rupees(bill.gst.amountMinor)}` :
      "No GST is charged: Catch is not GST registered.",
    ...(due ? [`Due: ${due}`] : []),
    "",
    url ? `See the invoice and pay: ${url}` :
      "Catch will send the invoice link separately.",
    "",
    "This is a service message about your Catch account.",
  ];
  const message: TransactionalEmail = {from: input.from, to: input.to,
    subject: subject.slice(0, 200), text: lines.join("\n"),
    idempotencyKey: `catch-bill-${notice.noticeId}`.replace(/[^A-Za-z0-9_-]/gu,
      "-").slice(0, 160),
    deadlineMillis: input.nowMillis + 60_000};
  assertTransactionalEmail(message);
  return message;
}

async function readSettings(db: Db): Promise<Settings | null> {
  const data = (await db.doc(billingNoticeSettingsPath).get()).data();
  if (data === undefined) return null;
  if (!validateBillingNoticeSettingsDocument(data)) {
    logger.error("Billing notice settings are not valid.");
    return null;
  }
  return data;
}

type EmailState = Notice["email"];

async function deliverEmail(deps: NoticeDeps, bill: Bill, notice: Notice,
  ownerUid: string | null, now: number): Promise<EmailState> {
  const attempts = notice.email.attempts + 1;
  const done = (state: EmailState["state"],
    extra: Partial<EmailState> = {}): EmailState => ({state, attempts,
    providerMessageId: null, nextAttemptAtMillis: null, atMillis: now,
    ...extra});
  const settings = await readSettings(deps.db());
  if (!settings?.email) return done("notConfigured");
  const to = ownerUid ? await deps.verifiedEmail(ownerUid) : null;
  if (!to) return done("noAddress");
  const sender = await deps.emailSender(settings.email).catch((error) => {
    logger.error("Billing email credential is unusable.",
      {error: error instanceof Error ? error.message : String(error)});
    return null;
  });
  if (!sender) return done("notConfigured");
  let result: EmailSubmission;
  try {
    result = await sender.submit(billNoticeEmail({bill, notice,
      from: settings.email.from, to, nowMillis: now}));
  } catch (error) {
    // A thrown send (network or provider fault) is retried by the hourly
    // sweep; the stable idempotency key keeps a retry from sending twice.
    logger.warn("Bill email send failed; it will be retried.",
      {noticeId: notice.noticeId,
        error: error instanceof Error ? error.message : String(error)});
    result = {kind: "deferred", reason: "rateLimited",
      retryAfterMillis: 15 * 60_000};
  }
  switch (result.kind) {
  case "accepted":
    return done("accepted", {providerMessageId: result.providerMessageId});
  case "deferred":
    return attempts >= maxEmailAttempts ? done("withheld") :
      done("deferred", {nextAttemptAtMillis: now +
        Math.max(60_000, result.retryAfterMillis)});
  case "rejected":
    return done("rejected");
  case "withheld":
    return done("withheld");
  default:
    // An unknown outcome may have been delivered; never send twice.
    return done("unknown");
  }
}

async function deliverPush(deps: NoticeDeps, bill: Bill, notice: Notice,
  ownerUid: string | null, now: number): Promise<Notice["push"]> {
  const tokens = ownerUid ? await deps.hostTokens(ownerUid) : [];
  if (tokens.length === 0) {
    return {state: "noDevices", sentCount: 0,
      atMillis: now};
  }
  const copy = notificationCopy(notice.kind === "issued" ?
    "organizerBillIssued" : "organizerBillReminder",
  {period: billPeriodText(bill)});
  let sent = 0;
  for (const token of tokens.slice(0, 50)) {
    try {
      await deps.sendPush(buildFcmMessage({token, title: copy.title,
        body: copy.body, type: "organizerBillIssued",
        organizerId: bill.organizerId, recipientUid: ownerUid ?? undefined,
        appRole: "host"}));
      sent++;
    } catch (error) {
      logger.warn("Bill push was not sent to one device.", {
        billId: bill.billId,
        error: error instanceof Error ? error.message : String(error)});
    }
  }
  return {state: sent > 0 ? "sent" : "failed", sentCount: sent,
    atMillis: now};
}

/**
 * Delivers one notice: each channel still pending (or an email deferred and
 * due) is attempted once, and the outcome recorded.
 * @param {NoticeDeps} deps Dependencies.
 * @param {string} noticeId Notice.
 * @return {Promise<Notice|null>} The notice afterwards.
 */
export async function deliverBillNotice(deps: NoticeDeps, noticeId: string):
  Promise<Notice | null> {
  const db = deps.db();
  const now = deps.now();
  const ref = db.collection(organizerBillNoticesCollection).doc(noticeId);
  const notice = (await ref.get()).data() as Notice | undefined;
  if (!notice) return null;
  const emailDue = notice.email.state === "pending" ||
    notice.email.state === "deferred" &&
      (notice.email.nextAttemptAtMillis ?? 0) <= now;
  const pushDue = notice.push.state === "pending";
  if (!emailDue && !pushDue) return notice;
  const [billSnap] = await Promise.all([
    db.collection("organizerBills").doc(notice.billId).get()]);
  const bill = billSnap.data() as Bill | undefined;
  const organizer = (await db.collection("organizers")
    .doc(notice.organizerId).get()).data() as OrganizerDocument | undefined;
  const ownerUid = organizer ? organizerOwnerUserId(organizer) ?? null : null;
  // A bill paid or written off since it was queued needs no notice.
  if (!bill || !["sent"].includes(bill.status)) {
    const closed = checkedNotice({...notice,
      email: emailDue ? {...notice.email, state: "withheld", atMillis: now,
        nextAttemptAtMillis: null} : notice.email,
      push: pushDue ? {state: "failed", sentCount: 0, atMillis: now} :
        notice.push,
      updatedAtMillis: now});
    await ref.set(closed);
    return closed;
  }
  const email = emailDue ? await deliverEmail(deps, bill, notice, ownerUid,
    now) : notice.email;
  const push = pushDue ? await deliverPush(deps, bill, notice, ownerUid, now) :
    notice.push;
  const next = checkedNotice({...notice, email, push, updatedAtMillis: now});
  await ref.set(next);
  return next;
}

/** A queued notice is delivered as soon as it is written. */
export const deliverOrganizerBillNotice = onDocumentCreated({
  document: `${organizerBillNoticesCollection}/{noticeId}`,
  timeoutSeconds: 60, maxInstances: 5,
}, async (event) => {
  await deliverBillNotice(defaultNoticeDeps, event.params.noticeId);
});

/**
 * Retries emails the provider deferred.
 * @param {NoticeDeps} deps Dependencies.
 * @return {Promise<number>} Notices retried.
 */
export async function retryDeferredBillNotices(deps: NoticeDeps):
  Promise<number> {
  const snap = await deps.db().collection(organizerBillNoticesCollection)
    .where("email.state", "==", "deferred").limit(sweepLimit).get();
  let retried = 0;
  for (const doc of snap.docs) {
    const notice = doc.data() as Notice;
    if ((notice.email.nextAttemptAtMillis ?? 0) > deps.now()) continue;
    await deliverBillNotice(deps, doc.id);
    retried++;
  }
  return retried;
}

/** Hourly, deferred bill emails are tried again. */
export const retryOrganizerBillNoticesHourly = onSchedule({
  schedule: "17 * * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 300,
  maxInstances: 1,
}, async () => {
  const retried = await retryDeferredBillNotices(defaultNoticeDeps);
  if (retried > 0) logger.info("Deferred bill notices retried.", {retried});
});

