/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Decides the one appeal on an account safety action. The reviewer must not be the person who decided the action. keep leaves it in force; reduce replaces it with a lighter step (reduceTo); lift ends it. messageToUser is sent to the person; the reporters are not told.
 */
export interface AdminDecideSafetyAppealCallablePayload {
  actionId: string;
  outcome: "keep" | "reduce" | "lift";
  reduceTo: null | {
    kind: "warn" | "restrict" | "suspend";
    durationDays: 7 | 30 | null;
  };
  messageToUser: string;
  note: string;
}
