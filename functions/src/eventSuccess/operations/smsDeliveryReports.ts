import type {Firestore} from "firebase-admin/firestore";
import type {EventAssistanceSmsDispatchDocument as Dispatch} from
  "../../shared/generated/eventAssistanceSmsDispatchDocument";
import {validateEventAssistanceSmsDispatchDocument} from
  "../../shared/generated/validators/eventAssistanceSmsDispatchDocument";
import {operationContentHash} from "../../operations/durableActions";
import {FirestoreMessageOutbox} from "./firestoreMessageOutbox";
import type {VerifiedDeliveryReceipt} from "./deliveryReceipts";
import {smsCollections} from "./smsPermissionRecords";
import {smsEndpointId} from "./smsProtocol";
import {smsAttemptFromCorrelation, smsReportTokenMatches} from
  "../../platform/delivery/smsReportCredentials";

interface Report {
  attemptId: string;
  token: string;
  providerMessageId: string;
  providerTimestamp: number;
  status: "SUCCESS" | "FAILURE" | "UNKNOWN";
  cause: string;
  code: string;
  phoneE164: string;
  segments: number;
  mask: string | null;
}
type FailedState = Extract<VerifiedDeliveryReceipt["state"], {kind: "failed"}>;
export type SmsReportResult =
  | {kind: "rejected"}
  | {kind: "unconfirmed"; messageId: string}
  | {kind: "recorded"; messageId: string;
      disposition: "applied" | "duplicateOrOlder" | "conflictingEvidence"};

/**
 * Gupshup Enterprise GET report fields, after a transport adapter decodes them.
 * Do not cast the differently shaped POST example into this contract. Duplicate
 * query values (arrays), missing correlation/extra and mixed status codes fail
 * closed. Parsing alone establishes no authenticity.
 */
export function parseSmsDeliveryReport(value: unknown): Report | null {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length > 20) return null;
  const v = value as Record<string, unknown>;
  const string = (key: string, pattern: RegExp, max: number): string | null =>
    typeof v[key] === "string" && v[key].length <= max &&
      pattern.exec(v[key])?.[0] === v[key] ? v[key] : null;
  const correlation = string("msg_id", /^catchSms1[a-f0-9]{64}$/, 73);
  const attemptId = correlation ? smsAttemptFromCorrelation(correlation) : null;
  const token = string("extra", /^[a-f0-9]{48}$/, 48);
  const providerMessageId = string("externalId", /^[0-9]+-[0-9]+$/, 512);
  const time = string("deliveredTS", /^[0-9]{1,16}$/, 16);
  const phone = string("phoneNo", /^91[6-9][0-9]{9}$/, 12);
  const fragments = string("noOfFrags", /^[1-6]$/, 1);
  const cause = string("cause", /^[A-Z][A-Z_]*$/, 64);
  const code = string("errCode", /^[0-9a-fA-F]{1,3}$/, 3);
  const mask = v.mask === undefined ? null :
    string("mask", /^[A-Za-z]{6}$/, 6);
  if (!attemptId || !token || !providerMessageId || !time || !phone ||
      !fragments || !cause || !code ||
      (v.mask !== undefined && mask === null) ||
      !Number.isSafeInteger(Number(time)) ||
      (v.status !== "SUCCESS" && v.status !== "FAILURE" &&
       v.status !== "UNKNOWN")) return null;
  return {attemptId, token, providerMessageId,
    providerTimestamp: Number(time), status: v.status, cause,
    code: code.toLowerCase().replace(/^0+/, "") || "0",
    phoneE164: "+" + phone, segments: Number(fragments), mask};
}

/** Only explicit final causes grant non-delivery evidence. */
function failureClassification(report: Report):
  FailedState["classification"] | null {
  const known: Record<string, [string, FailedState["classification"]]> = {
    "1": ["ABSENT_SUBSCRIBER", "technical"],
    "2": ["CALL_BARRED", "suppressed"],
    "3": ["UNKNOWN_SUBSCRIBER", "invalidRecipient"],
    "4": ["SERVICE_DOWN", "technical"],
    "5": ["SYSTEM_FAILURE", "technical"],
    "6": ["DND_FAIL", "suppressed"],
    "7": ["BLOCKED", "suppressed"],
    "8": ["DND_TIMEOUT", "policy"],
    "9": ["OUTSIDE_WORKING_HOURS", "policy"],
    "b": ["BLOCKED_MASK", "policy"],
    "11": ["INBOXFULL", "technical"],
    "12": ["CONGESTION", "technical"],
    "22": ["BLOCKED_FOR_USER", "suppressed"],
    "23": ["UNKNOWN_SUBSCRIBER", "invalidRecipient"],
    "38": ["MSG_DOES_NOT_MATCH_TEMPLATE", "policy"],
  };
  const entry = known[report.code];
  return entry && entry[0] === report.cause ? entry[1] : null;
}

/**
 * Reconciles independently of guest/event/permission liveness. The credential
 * is a per-attempt bearer capability echoed in extra, not a provider signature.
 * Only its hash is kept with the immutable dispatch. This service grants no
 * permission to send or refund a message.
 */
export class SmsDeliveryReportStore {
  private readonly outbox: FirestoreMessageOutbox;

  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {
    this.outbox = new FirestoreMessageOutbox(db, async () => {
      throw new Error("Delivery reporting cannot authorize dispatch");
    }, clock);
  }

  async receive(value: unknown): Promise<SmsReportResult> {
    const report = parseSmsDeliveryReport(value);
    if (!report) return {kind: "rejected"};
    const snap = await this.db.collection(smsCollections.dispatches)
      .doc(report.attemptId).get();
    if (!snap.exists) return {kind: "rejected"};
    const dispatch = snap.data();
    if (!validateEventAssistanceSmsDispatchDocument(dispatch) ||
        dispatch.attemptId !== report.attemptId ||
        !smsReportTokenMatches(report.token, dispatch.reportTokenHash)) {
      return {kind: "rejected"};
    }
    return this.reconcile(dispatch, report);
  }

  private async reconcile(dispatch: Dispatch, report: Report):
    Promise<SmsReportResult> {
    const record = await this.outbox.get(dispatch.messageId);
    const attempt = record?.attempts.find((a) =>
      a.attemptId === dispatch.attemptId);
    const now = this.clock();
    if (!record || record.intent.context.mode !== "live" ||
        !attempt || attempt.mode !== "live" ||
        attempt.binding.provider !== "gupshup" ||
        attempt.binding.routeId !== "catchEventSms" ||
        attempt.binding.transport !== "sms" ||
        attempt.binding.senderId !== dispatch.senderId ||
        attempt.binding.bindingRevision !== dispatch.bindingRevision ||
        attempt.binding.recipientEndpointId !== dispatch.recipientEndpointId ||
        attempt.binding.senderIdentity !== "catchPlatform" ||
        attempt.binding.fallbackOwner !== "catch" ||
        smsEndpointId(record.intent.context, record.intent.attendeeId,
          report.phoneE164) !== dispatch.recipientEndpointId ||
        report.segments !== dispatch.segments ||
        (report.mask !== null && report.mask !== dispatch.senderMask) ||
        !Number.isSafeInteger(now) || now < record.updatedAt ||
        dispatch.createdAt < attempt.createdAt || dispatch.createdAt > now ||
        report.providerTimestamp < dispatch.createdAt - 300_000 ||
        report.providerTimestamp > now + 300_000 ||
        attempt.state.kind === "reserved") return {kind: "rejected"};
    // Five minutes is our bounded clock-skew tolerance, not a provider SLA.
    const knownId = "providerMessageId" in attempt.state ?
      attempt.state.providerMessageId : null;
    if (knownId !== null && knownId !== report.providerMessageId) {
      return {kind: "rejected"};
    }
    const evidenceId = "sms-dlr:" + operationContentHash([
      report.attemptId, report.providerMessageId, report.providerTimestamp,
      report.status, report.cause, report.code, report.segments,
    ]);
    let state: VerifiedDeliveryReceipt["state"];
    if (report.status === "SUCCESS" && report.code === "0" &&
        report.cause === "SUCCESS") {
      state = {kind: "delivered", at: now,
        providerMessageId: report.providerMessageId};
    } else if (report.status === "FAILURE" &&
        failureClassification(report) !== null) {
      state = {kind: "failed", at: now,
        providerMessageId: report.providerMessageId,
        classification: failureClassification(report)!, evidenceId};
    } else {
      // UNKNOWN, deferred, SMSC timeout, missing operator acknowledgement,
      // unknown causes and inconsistent success/failure evidence stay held.
      return {kind: "unconfirmed", messageId: record.messageId};
    }
    const result = await this.outbox.recordReceipt(record.messageId, {
      attemptId: attempt.attemptId, ...attempt.binding,
      providerEventId: evidenceId, receivedAt: now, state,
    });
    return {kind: "recorded", messageId: record.messageId,
      disposition: result.disposition};
  }
}
