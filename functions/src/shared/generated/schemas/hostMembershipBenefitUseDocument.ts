/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipBenefitUseDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_benefit_uses.schema.json",
  "title": "HostMembershipBenefitUseDocument",
  "description": "One booking made at a member price, keyed {eventId}_{uid}. Source of the member's savings total and of the upcoming member-priced booking cap. Readable by the member only.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipBenefitUses",
  "x-firestore-path": "hostMembershipBenefitUses/{benefitUseId}",
  "x-document-id-field": "benefitUseId",
  "x-owner": "member-priced booking paths (signUpForFreeEvent, public paid admission)",
  "required": [
    "schemaVersion",
    "membershipId",
    "organizerId",
    "uid",
    "eventId",
    "planId",
    "listPriceInPaise",
    "paidPriceInPaise",
    "savingsInPaise",
    "eventStartMillis",
    "state",
    "createdAtMillis"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "server-only"
    },
    "membershipId": {
      "type": "string",
      "pattern": "^hm_[a-f0-9]{64}$",
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "planId": {
      "type": "string",
      "pattern": "^hmp_[A-Za-z0-9]{20}$",
      "x-catch-ownership": "server-only"
    },
    "listPriceInPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "server-only"
    },
    "paidPriceInPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "server-only"
    },
    "savingsInPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "server-only"
    },
    "eventStartMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "state": {
      "enum": [
        "booked",
        "released"
      ],
      "x-catch-ownership": "server-only"
    },
    "createdAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    }
  }
} as const;
