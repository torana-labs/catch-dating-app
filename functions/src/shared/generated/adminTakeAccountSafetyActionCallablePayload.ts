/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Warn, restrict, suspend or ban one account. Ops may warn and restrict (7 or 30 days, or until lifted); suspend and ban are owner-only. Suspend and ban sign the person out and cancel their future bookings; a ban also blocks their phone and devices from making a new account. messageToUser is what they see; it never names the reporter. caseTargetPath links the safety case it resolves.
 */
export interface AdminTakeAccountSafetyActionCallablePayload {
  uid: string;
  kind: "warn" | "restrict" | "suspend" | "ban";
  durationDays: 7 | 30 | null;
  reasonCode: string;
  messageToUser: string;
  caseTargetPath: string | null;
  notifyReporter: boolean;
  appealable: boolean;
  note: string;
}
