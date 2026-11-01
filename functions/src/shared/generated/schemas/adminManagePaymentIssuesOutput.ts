/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManagePaymentIssuesCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_manage_payment_issues_response.schema.json",
  "title": "AdminManagePaymentIssuesCallableResponse",
  "description": "Money issues for one view, oldest first, with counts per kind, and the outcome of the action just taken.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "view",
    "issues",
    "counts",
    "outcome"
  ],
  "properties": {
    "view": {
      "enum": [
        "open",
        "resolved"
      ]
    },
    "issues": {
      "type": "array",
      "maxItems": 500,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "issueId",
          "kind",
          "source",
          "targetId",
          "title",
          "subtitle",
          "organizerId",
          "organizerName",
          "amountMinor",
          "waitingSinceMillis",
          "status",
          "lastErrorCode",
          "providerPaymentId",
          "eventId",
          "canConfirmBooking",
          "resolution"
        ],
        "properties": {
          "issueId": {
            "type": "string",
            "maxLength": 240
          },
          "kind": {
            "enum": [
              "payment",
              "refund",
              "review",
              "bill"
            ]
          },
          "source": {
            "enum": [
              "publicEventPayments",
              "organizerEventOfferPayments",
              "payments",
              "organizerBills"
            ]
          },
          "targetId": {
            "type": "string",
            "maxLength": 200
          },
          "title": {
            "type": "string",
            "maxLength": 200
          },
          "subtitle": {
            "type": "string",
            "maxLength": 200
          },
          "organizerId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 180
          },
          "organizerName": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 160
          },
          "amountMinor": {
            "type": "integer",
            "minimum": 0
          },
          "waitingSinceMillis": {
            "type": "integer",
            "minimum": 0
          },
          "status": {
            "type": "string",
            "maxLength": 40
          },
          "lastErrorCode": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 80
          },
          "providerPaymentId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 128
          },
          "eventId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 180
          },
          "canConfirmBooking": {
            "type": "boolean"
          },
          "resolution": {
            "anyOf": [
              {
                "type": "null"
              },
              {
                "title": "MoneyIssueResolutionDocument",
                "description": "How a money issue in Admin Money was resolved, keyed by the issue id (source collection and record id joined by a colon, encoded). A resolved issue leaves the open queue even while its record still matches; a new issue on the same record needs the record to change state.",
                "type": "object",
                "additionalProperties": false,
                "x-firestore-collection": "moneyIssueResolutions",
                "x-firestore-path": "moneyIssueResolutions/{resolutionId}",
                "x-document-id-field": "resolutionId",
                "x-owner": "adminManagePaymentIssues",
                "required": [
                  "schemaVersion",
                  "resolutionId",
                  "issueId",
                  "kind",
                  "statusAtResolution",
                  "action",
                  "note",
                  "resolvedAtMillis",
                  "resolvedByUid",
                  "title",
                  "organizerName"
                ],
                "properties": {
                  "schemaVersion": {
                    "const": 1
                  },
                  "resolutionId": {
                    "type": "string",
                    "pattern": "^[A-Za-z0-9_-]{1,240}$"
                  },
                  "issueId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 240
                  },
                  "kind": {
                    "enum": [
                      "payment",
                      "refund",
                      "review",
                      "bill"
                    ]
                  },
                  "statusAtResolution": {
                    "type": "string",
                    "maxLength": 40
                  },
                  "action": {
                    "enum": [
                      "confirmedBooking",
                      "closed"
                    ]
                  },
                  "note": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 500
                  },
                  "resolvedAtMillis": {
                    "type": "integer",
                    "minimum": 1
                  },
                  "resolvedByUid": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128
                  },
                  "title": {
                    "type": "string",
                    "maxLength": 200
                  },
                  "organizerName": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 160
                  }
                }
              }
            ]
          }
        }
      }
    },
    "counts": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "all",
        "payment",
        "refund",
        "review",
        "bill"
      ],
      "properties": {
        "all": {
          "type": "integer",
          "minimum": 0
        },
        "payment": {
          "type": "integer",
          "minimum": 0
        },
        "refund": {
          "type": "integer",
          "minimum": 0
        },
        "review": {
          "type": "integer",
          "minimum": 0
        },
        "bill": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "outcome": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "issueId",
            "result",
            "statusAfter"
          ],
          "properties": {
            "issueId": {
              "type": "string",
              "maxLength": 240
            },
            "result": {
              "enum": [
                "admitted",
                "stillWaiting",
                "refunding",
                "closed"
              ]
            },
            "statusAfter": {
              "type": "string",
              "maxLength": 40
            }
          }
        }
      ]
    }
  }
} as const;
