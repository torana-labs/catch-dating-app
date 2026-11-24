import {randomBytes, timingSafeEqual} from "node:crypto";
import {operationContentHash} from "../../operations/durableActions";

/** Reversible, non-secret correlation within Gupshup's alphanumeric limit. */
export function smsProviderCorrelation(attemptId: string): string {
  if (!/^attempt:[a-f0-9]{64}$/.test(attemptId)) {
    throw new Error("Invalid SMS attempt correlation");
  }
  // msg_id is correlation, NOT provider idempotency or authentication.
  return "catchSms1" + attemptId.slice("attempt:".length);
}

export function smsAttemptFromCorrelation(value: string): string | null {
  return /^catchSms1[a-f0-9]{64}$/.test(value) ?
    "attempt:" + value.slice("catchSms1".length) : null;
}

export function smsReportTokenHash(token: string): string {
  if (!/^[a-f0-9]{48}$/.test(token)) {
    throw new Error("Invalid SMS report credential");
  }
  return operationContentHash(["catch.event-sms-report/v1", token]);
}

export function newSmsReportCredential(): {token: string; hash: string} {
  // Gupshup extra allows 50 alphanumeric characters. Retain only the hash.
  const token = randomBytes(24).toString("hex");
  return {token, hash: smsReportTokenHash(token)};
}

export function smsReportTokenMatches(token: string, hash: string): boolean {
  if (!/^[a-f0-9]{48}$/.test(token) || !/^[a-f0-9]{64}$/.test(hash)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(smsReportTokenHash(token), "hex"),
    Buffer.from(hash, "hex"));
}
