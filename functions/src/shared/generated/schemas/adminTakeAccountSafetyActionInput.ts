/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminTakeAccountSafetyActionCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_take_account_safety_action_payload.schema.json",
  "title": "AdminTakeAccountSafetyActionCallablePayload",
  "description": "Warn, restrict, suspend or ban one account. Ops may warn and restrict (7 or 30 days, or until lifted); suspend and ban are owner-only. Suspend and ban sign the person out and cancel their future bookings; a ban also blocks their phone and devices from making a new account. messageToUser is what they see; it never names the reporter. caseTargetPath links the safety case it resolves.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "uid",
    "kind",
    "durationDays",
    "reasonCode",
    "messageToUser",
    "caseTargetPath",
    "notifyReporter",
    "appealable",
    "note"
  ],
  "properties": {
    "uid": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "kind": {
      "type": "string",
      "enum": [
        "warn",
        "restrict",
        "suspend",
        "ban"
      ]
    },
    "durationDays": {
      "type": [
        "integer",
        "null"
      ],
      "enum": [
        7,
        30,
        null
      ]
    },
    "reasonCode": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]{1,63}$"
    },
    "messageToUser": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "caseTargetPath": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 3,
      "maxLength": 260
    },
    "notifyReporter": {
      "type": "boolean"
    },
    "appealable": {
      "type": "boolean"
    },
    "note": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    }
  },
  "x-callable-aliases": [
    "adminTakeAccountSafetyAction"
  ]
} as const;
