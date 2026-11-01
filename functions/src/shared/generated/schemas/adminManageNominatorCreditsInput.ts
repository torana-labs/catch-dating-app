/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManageNominatorCreditsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_manage_nominator_credits_payload.schema.json",
  "title": "AdminManageNominatorCreditsCallablePayload",
  "description": "Owner reads the nominator credit ledger or acts for one nominator. approve approves all their owed credit when it reaches the minimum payout (less rolls over). markPaid records that their approved credit was paid with partner payouts.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner)",
  "required": [
    "action",
    "nominatorUid",
    "note"
  ],
  "properties": {
    "action": {
      "enum": [
        "list",
        "approve",
        "markPaid"
      ]
    },
    "nominatorUid": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 128
    },
    "note": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500
    }
  }
} as const;
