/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const commercialTermsOverrideSchema: Record<string, unknown> = {
  "description": "Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "commission": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "rateBasisPoints": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10000
        },
        "capMinor": {
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
      "properties": {
        "feeMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000000
        }
      }
    },
    "gatewayFeeBearer": {
      "enum": [
        "host",
        "platform"
      ]
    },
    "purposes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "eventAdmission": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "countsTowardCommission": {
              "type": "boolean"
            },
            "atSourceFeeBasisPoints": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9999
            }
          }
        },
        "formFee": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "countsTowardCommission": {
              "type": "boolean"
            },
            "atSourceFeeBasisPoints": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9999
            }
          }
        },
        "hostMembership": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "countsTowardCommission": {
              "type": "boolean"
            },
            "atSourceFeeBasisPoints": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9999
            }
          }
        }
      }
    }
  },
  "title": "CommercialTermsOverride"
} as const;
