import {randomUUID} from "node:crypto";
import {FieldValue, type Firestore} from "firebase-admin/firestore";
import type {EmailSubmission, TransactionalEmailProvider} from
  "../email/emailProvider";
import {validateHostOperatorAlertDocument} from
  "../shared/generated/validators/hostOperatorAlertDocument";
import {BRAND} from "../shared/generated/brand";

export const ALERTS = "hostOperatorAlerts";
export const LIFETIME = 24 * 60 * 60 * 1000;
export const LEASE = 120_000;
const leadId =
  /^host_lead_[0-9]{13}_[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;

/** Operational notice, independent of optional analytics/advertising consent.
 * New activation never backfills old enquiries. Internal QA uses the explicit
 * internal_qa_ submission prefix or [QA] name prefix; reserved test domains
 * are also excluded. None of these values are copied into an email. */
export function eligibleHostAlert(value: unknown, since: number, now: number):
  {eventId: string; acceptedAt: number} | null {
  const row = value as Record<string, unknown> | undefined;
  const receipt = row?.hostLead as Record<string, unknown> | undefined;
  const eventId = receipt?.eventId;
  if (!Number.isSafeInteger(since) || since <= 0 || since > now ||
      !row || row.source !== "website" ||
      row.classification !== "sales_private" ||
      row.status === "dismissed" || receipt?.isNew !== true ||
      typeof eventId !== "string" || !leadId.test(eventId) ||
      !row.hostApplication || typeof row.hostApplication !== "object" ||
      /^internal_qa_/iu.test(String(row.submissionId)) ||
      /^\[QA\]/iu.test(String(row.fullName).trim()) ||
      /@(?:[^@]*\.)?(?:example\.(?:com|net|org|test)|invalid|test)$/iu
        .test(String(row.email))) return null;
  const acceptedAt = Number(eventId.split("_")[2]);
  return acceptedAt >= since && acceptedAt <= now &&
    acceptedAt + LIFETIME > now ? {eventId, acceptedAt} : null;
}

/** The canonical intake commit succeeds independently of this trigger. */
export async function enqueueHostAlert(input: {
  enabled: boolean; since: number; db: Firestore; intentId: string;
  now?: () => number;
}): Promise<boolean> {
  if (!input.enabled || !/^[a-f0-9]{64}$/u.test(input.intentId)) return false;
  const now = input.now ?? Date.now;
  return input.db.runTransaction(async (tx) => {
    const source = await tx.get(input.db.collection("salesInboundIntents")
      .doc(input.intentId));
    const lead = eligibleHostAlert(source.data(), input.since, now());
    if (!lead) return false;
    const ref = input.db.collection(ALERTS).doc(lead.eventId);
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, {schemaVersion: 1, classification: "sales_private",
      ...lead, intentId: input.intentId, status: "pending", attempts: 0,
      nextAttemptAt: now(), attemptId: null, providerMessageId: null});
    return true;
  });
}

/** Permanent receipt prevents duplicates. No contact/answer snapshot persists.
 * An interrupted or ambiguous send is terminal unknown, never blindly retried.
 * Only explicit throttles retry: at most five attempts in 24 hours. */
export async function deliverHostAlert(input: {
  enabled: boolean; since: number; db: Firestore; eventId: string;
  provider: TransactionalEmailProvider; now?: () => number;
}): Promise<string> {
  if (!input.enabled || !leadId.test(input.eventId)) return "disabled";
  const now = input.now ?? Date.now;
  const ref = input.db.collection(ALERTS).doc(input.eventId);
  const attemptId = randomUUID();
  const reserved = await input.db.runTransaction(async (tx) => {
    const row = (await tx.get(ref)).data();
    if (!validateHostOperatorAlertDocument(row) ||
        row.eventId !== input.eventId) return null;
    const clock = now();
    if (row.status === "sending") {
      if (row.nextAttemptAt !== undefined && row.nextAttemptAt <= clock) {
        tx.update(ref, {status: "unknown",
          nextAttemptAt: FieldValue.delete()});
      }
      return null;
    }
    if (row.status !== "pending" || row.nextAttemptAt === undefined ||
        row.nextAttemptAt > clock) return null;
    const source = await tx.get(input.db.collection("salesInboundIntents")
      .doc(row.intentId));
    const lead = eligibleHostAlert(source.data(), input.since, clock);
    if (!lead || lead.eventId !== row.eventId || row.attempts >= 5) {
      tx.update(ref, {status: "stopped", nextAttemptAt: FieldValue.delete()});
      return null;
    }
    tx.update(ref, {status: "sending", attempts: row.attempts + 1,
      attemptId, nextAttemptAt: clock + LEASE});
    return row;
  });
  if (!reserved) return "idle";
  // Last authority read before network I/O. Firestore and email are not atomic;
  // a deletion after this read cannot recall an already submitted notice.
  const source = await input.db.collection("salesInboundIntents")
    .doc(reserved.intentId).get();
  const lead = eligibleHostAlert(source.data(), input.since, now());
  let result: EmailSubmission = {kind: "withheld", reason: "deadlineExpired"};
  if (lead?.eventId === reserved.eventId) {
    try {
      result = await input.provider.submit({
        from: `host@${BRAND.senders.emailDomain}`,
        to: "suvrat.garg@gmail.com", // brand-literal-ok: owner's review inbox
        subject: `New ${BRAND.stores.hostAppName} application`,
        text: `A new ${BRAND.stores.hostAppName} application is ready ` +
          "for review.\n\n" +
          `Open ${BRAND.adminName}: ${BRAND.web.adminOrigin}/\n\n` +
          "Please review and respond within one business day.",
        idempotencyKey: `host_alert_${reserved.eventId}`,
        deadlineMillis: Math.min(now() + 10_000,
          reserved.acceptedAt + LIFETIME),
      });
    } catch {
      result = {kind: "unknown"};
    }
  }
  return input.db.runTransaction(async (tx) => {
    const row = (await tx.get(ref)).data();
    if (!validateHostOperatorAlertDocument(row) ||
        row.status !== "sending" || row.attemptId !== attemptId) {
      return "unknown";
    }
    const next = result.kind === "deferred" ? now() +
      Math.max(60_000, Math.min(LIFETIME, result.retryAfterMillis)) : 0;
    const retry = result.kind === "deferred" && Number.isSafeInteger(next) &&
      row.attempts < 5 && next < row.acceptedAt + LIFETIME;
    const status = result.kind === "accepted" ? "accepted" :
      result.kind === "unknown" ? "unknown" : retry ? "pending" :
        result.kind === "withheld" ? "stopped" : "failed";
    tx.update(ref, {status,
      nextAttemptAt: retry ? next : FieldValue.delete(),
      providerMessageId: result.kind === "accepted" ?
        result.providerMessageId : null});
    return status;
  });
}

export async function dispatchHostAlerts(input: {
  enabled: boolean; since: number; db: Firestore;
  provider: TransactionalEmailProvider; now?: () => number;
}): Promise<number> {
  if (!input.enabled) return 0;
  const now = input.now ?? Date.now;
  // One indexed field: terminal rows have this field removed, so they cannot
  // starve the due queue. Each reserved row rechecks its source authority.
  const rows = await input.db.collection(ALERTS)
    .where("nextAttemptAt", "<=", now()).orderBy("nextAttemptAt")
    .limit(20).get();
  for (const row of rows.docs) {
    await deliverHostAlert({...input, eventId: row.id});
  }
  return rows.size;
}
