/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminSetAdminUserRolesCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_set_admin_user_roles_payload.schema.json",
  "title": "Admin Set Admin User Roles Callable Payload",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "targetUid",
    "roles",
    "note"
  ],
  "properties": {
    "targetUid": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{3,128}$"
    },
    "roles": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "admin",
          "adminOwner",
          "safetyReviewer",
          "support",
          "salesStaff"
        ]
      }
    },
    "note": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    }
  },
  "definitions": {
    "adminRole": {
      "type": "string",
      "enum": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support",
        "salesStaff"
      ]
    }
  }
} as const;
