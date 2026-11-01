/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetFinanceMonthCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_get_finance_month_response.schema.json",
  "title": "AdminGetFinanceMonthCallableResponse",
  "description": "One month of Finance from organizer bills (ticket sales paid into organizers' own accounts and Catch's commission), costs and nominator credit paid. leftOverMinor is earned less costs, before salaries.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "month",
    "sales",
    "earned",
    "costs",
    "notCatch",
    "leftOverMinor",
    "series"
  ],
  "definitions": {
    "minor": {
      "type": "integer"
    },
    "count": {
      "type": "integer",
      "minimum": 0
    }
  },
  "properties": {
    "month": {
      "type": "string",
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "sales": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "grossMinor",
        "refundedMinor",
        "netMinor",
        "events",
        "organizers",
        "payments"
      ],
      "properties": {
        "grossMinor": {
          "type": "integer"
        },
        "refundedMinor": {
          "type": "integer"
        },
        "netMinor": {
          "type": "integer"
        },
        "events": {
          "type": "integer",
          "minimum": 0
        },
        "organizers": {
          "type": "integer",
          "minimum": 0
        },
        "payments": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "earned": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "uncappedMinor",
        "capsAndTermsMinor",
        "trialWaivedMinor",
        "billedMinor",
        "billedOrganizers",
        "cappedOrganizers",
        "ownTermsOrganizers",
        "freeOrganizers",
        "paidMinor",
        "writtenOffMinor"
      ],
      "properties": {
        "uncappedMinor": {
          "type": "integer",
          "description": "Commission before caps, for organizers past their free trial."
        },
        "capsAndTermsMinor": {
          "type": "integer",
          "description": "What caps took off (a positive number)."
        },
        "trialWaivedMinor": {
          "type": "integer"
        },
        "billedMinor": {
          "type": "integer"
        },
        "billedOrganizers": {
          "type": "integer",
          "minimum": 0
        },
        "cappedOrganizers": {
          "type": "integer",
          "minimum": 0
        },
        "ownTermsOrganizers": {
          "type": "integer",
          "minimum": 0
        },
        "freeOrganizers": {
          "type": "integer",
          "minimum": 0
        },
        "paidMinor": {
          "type": "integer"
        },
        "writtenOffMinor": {
          "type": "integer"
        }
      }
    },
    "costs": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "lines",
        "nominatorCreditPaidMinor",
        "totalMinor",
        "whatsappIsEstimate",
        "whatsappMessages"
      ],
      "properties": {
        "lines": {
          "type": "array",
          "maxItems": 20,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "category",
              "amountMinor",
              "source",
              "note"
            ],
            "properties": {
              "category": {
                "enum": [
                  "whatsapp",
                  "ai",
                  "cloud",
                  "sms",
                  "ads_meta",
                  "ads_google",
                  "other"
                ]
              },
              "amountMinor": {
                "type": "integer"
              },
              "source": {
                "enum": [
                  "manual",
                  "meta_api",
                  "google_ads_api",
                  "estimate"
                ]
              },
              "note": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 500
              }
            }
          }
        },
        "nominatorCreditPaidMinor": {
          "type": "integer"
        },
        "totalMinor": {
          "type": "integer"
        },
        "whatsappIsEstimate": {
          "type": "boolean"
        },
        "whatsappMessages": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "notCatch": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "providerFeeMinor",
        "providerTaxMinor",
        "gstRegistered",
        "gstMinor"
      ],
      "properties": {
        "providerFeeMinor": {
          "type": "integer"
        },
        "providerTaxMinor": {
          "type": "integer"
        },
        "gstRegistered": {
          "type": "boolean"
        },
        "gstMinor": {
          "type": "integer"
        }
      }
    },
    "leftOverMinor": {
      "type": "integer"
    },
    "series": {
      "type": "array",
      "maxItems": 7,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "month",
          "salesMinor",
          "earnedMinor",
          "partial"
        ],
        "properties": {
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "salesMinor": {
            "type": "integer"
          },
          "earnedMinor": {
            "type": "integer"
          },
          "partial": {
            "type": "boolean"
          }
        }
      }
    }
  }
} as const;
