/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const commercialTermsSnapshotSchema: Record<string, unknown> = {
  "description": "Effective terms for one purpose and organizer at the moment a payment or charge was created.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "version",
    "purpose",
    "organizerId",
    "platformRevision",
    "organizerRevision",
    "moneyFlow",
    "merchantOfRecord",
    "currency",
    "commission",
    "trial",
    "toolsOnly",
    "gatewayFeeBearer",
    "purposeTerms",
    "resolvedAtMillis"
  ],
  "properties": {
    "version": {
      "const": 1
    },
    "purpose": {
      "enum": [
        "eventAdmission",
        "formFee",
        "hostMembership"
      ]
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "platformRevision": {
      "type": "integer",
      "minimum": 1
    },
    "organizerRevision": {
      "type": "integer",
      "minimum": 0
    },
    "moneyFlow": {
      "description": "hostCollected: the guest pays the organizer's own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch's platform account collects and transfers the organizer's share (Razorpay Route), deducting any at-source fee.",
      "enum": [
        "hostCollected",
        "platformSplit"
      ]
    },
    "merchantOfRecord": {
      "enum": [
        "host",
        "platform"
      ]
    },
    "currency": {
      "const": "INR"
    },
    "commission": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rateBasisPoints",
        "capMinor",
        "cycleDays",
        "cycleAnchor",
        "base",
        "taxTreatment"
      ],
      "properties": {
        "rateBasisPoints": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10000
        },
        "capMinor": {
          "description": "Cap per cycle in minor units; null means uncapped.",
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000000
            },
            {
              "type": "null"
            }
          ]
        },
        "cycleDays": {
          "type": "integer",
          "minimum": 1,
          "maximum": 366
        },
        "cycleAnchor": {
          "enum": [
            "trialEnd"
          ]
        },
        "base": {
          "enum": [
            "netOfRefunds",
            "gross"
          ]
        },
        "taxTreatment": {
          "description": "exclusive: amounts are before GST, which is added on top.",
          "enum": [
            "exclusive",
            "inclusive"
          ]
        }
      }
    },
    "trial": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "days",
        "anchor"
      ],
      "properties": {
        "days": {
          "type": "integer",
          "minimum": 0,
          "maximum": 366
        },
        "anchor": {
          "enum": [
            "firstEvent"
          ]
        }
      }
    },
    "toolsOnly": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "feeMinor"
      ],
      "properties": {
        "feeMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000000,
          "description": "Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission."
        }
      }
    },
    "gatewayFeeBearer": {
      "enum": [
        "host",
        "platform"
      ]
    },
    "purposeTerms": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "countsTowardCommission",
        "atSourceFeeBasisPoints"
      ],
      "properties": {
        "countsTowardCommission": {
          "type": "boolean"
        },
        "atSourceFeeBasisPoints": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9999,
          "description": "Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit."
        }
      }
    },
    "resolvedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  },
  "title": "CommercialTermsSnapshot"
} as const;
