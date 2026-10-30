/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const commercialTermsSchema: Record<string, unknown> = {
  "type": "object",
  "additionalProperties": false,
  "required": [
    "currency",
    "commission",
    "trial",
    "toolsOnly",
    "gatewayFeeBearer",
    "purposes"
  ],
  "properties": {
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
    "purposes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventAdmission",
        "formFee",
        "hostMembership"
      ],
      "properties": {
        "eventAdmission": {
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
        "formFee": {
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
        "hostMembership": {
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
        }
      }
    }
  },
  "title": "CommercialTerms"
} as const;
