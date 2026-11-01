/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const paymentDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/payments.schema.json",
  "title": "PaymentDocument",
  "description": "Canonical payment record stored at payments/{paymentId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "payments",
  "x-firestore-path": "payments/{paymentId}",
  "x-document-id-field": "id",
  "x-owner": "payments callables",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "userId",
    "orderId",
    "paymentId",
    "eventId",
    "amount",
    "currency",
    "status",
    "signUpFailed",
    "createdAt"
  ],
  "properties": {
    "userId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "orderId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "paymentId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "amount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "callable-owned"
    },
    "amountMinor": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "callable-owned"
    },
    "currency": {
      "type": "string",
      "minLength": 3,
      "maxLength": 3,
      "x-catch-ownership": "callable-owned"
    },
    "provider": {
      "type": "string",
      "enum": [
        "razorpay",
        "stripe"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "completed",
        "failed",
        "refunded",
        "refundFailed"
      ],
      "description": "refundFailed marks rejected admission with an unresolved refund. New records use cancellationRefund.state for pending versus reviewRequired; historical records without that intent need manual reconciliation. Only an observed full refund becomes refunded.",
      "x-catch-ownership": "callable-owned"
    },
    "providerPaymentId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "checkoutSessionId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "hostUserId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "stripeAccountId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "applicationFeeAmount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "callable-owned"
    },
    "inviteLinkId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "description": "Named host invite link attributed to this payment, when present.",
      "x-catch-ownership": "callable-owned"
    },
    "inviteSource": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 80,
      "description": "Host-facing invite source copied from eventInviteLinks.",
      "x-catch-ownership": "callable-owned"
    },
    "crossPathsPairHoldId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "description": "Pair hold consumed by this booking, when present.",
      "x-catch-ownership": "callable-owned"
    },
    "signUpFailed": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "createdAt": {
      "type": "object",
      "description": "Serialized Firestore Timestamp fixture shape.",
      "x-firestore-type": "timestamp",
      "additionalProperties": false,
      "required": [
        "_seconds",
        "_nanoseconds"
      ],
      "properties": {
        "_seconds": {
          "type": "integer"
        },
        "_nanoseconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999999999
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "completedAt": {
      "type": "object",
      "description": "Authoritative completion time for a successful payment. Older completed records may omit it and fall back to createdAt.",
      "x-firestore-type": "timestamp",
      "additionalProperties": false,
      "required": [
        "_seconds",
        "_nanoseconds"
      ],
      "properties": {
        "_seconds": {
          "type": "integer"
        },
        "_nanoseconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999999999
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "synthetic": {
      "type": "boolean",
      "description": "Internal demo seed marker used for cleanup and diagnostics."
    },
    "seedPrefix": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed prefix used for cleanup and diagnostics."
    },
    "scenario": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed scenario name used for cleanup and diagnostics."
    },
    "demoOps": {
      "type": "boolean",
      "description": "Internal demo-operations marker used for cleanup and diagnostics."
    },
    "demoOpsId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "description": "Internal demo-operations id used for cleanup and diagnostics."
    },
    "demoOpsCommand": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "description": "Internal demo-operations command name used for cleanup and diagnostics."
    },
    "cancellationRefund": {
      "title": "LegacyPaymentRefundIntent",
      "description": "Frozen native cancellation or failed-booking refund authority. Provider success is distinct from submission; guest refund may be upgraded by host cancellation.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "version",
        "reason",
        "state",
        "targetAmountMinor",
        "confirmedAmountMinor",
        "paymentFingerprint",
        "provider",
        "providerPaymentId",
        "orderId",
        "currency",
        "stripeAccountId",
        "refundApplicationFee",
        "requestedAtMillis",
        "nextAttemptAtMillis",
        "leaseUntilMillis",
        "attempts",
        "lastErrorCode"
      ],
      "properties": {
        "version": {
          "const": 1,
          "type": "integer"
        },
        "reason": {
          "enum": [
            "guestCancelled",
            "eventCancelled",
            "bookingFailed"
          ],
          "type": "string"
        },
        "state": {
          "enum": [
            "pending",
            "complete",
            "reviewRequired"
          ],
          "type": "string"
        },
        "targetAmountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "confirmedAmountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "paymentFingerprint": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "provider": {
          "enum": [
            "razorpay",
            "stripe"
          ],
          "type": "string"
        },
        "providerPaymentId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "orderId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "stripeAccountId": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "refundApplicationFee": {
          "type": "boolean"
        },
        "requestedAtMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "nextAttemptAtMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "leaseUntilMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "attempts": {
          "type": "array",
          "maxItems": 2,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "amountMinor",
              "idempotencyKey",
              "providerRefundId",
              "state",
              "startedAtMillis"
            ],
            "properties": {
              "amountMinor": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100000000
              },
              "idempotencyKey": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{10,100}$"
              },
              "providerRefundId": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 240
              },
              "state": {
                "enum": [
                  "pending",
                  "processed",
                  "failed"
                ],
                "type": "string"
              },
              "startedAtMillis": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            }
          }
        },
        "lastErrorCode": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "razorpayOwnership": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "projectId",
            "schema"
          ],
          "properties": {
            "projectId": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9-]{4,28}[a-z0-9]$"
            },
            "schema": {
              "type": "string",
              "const": "1"
            }
          },
          "description": "Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.",
          "x-catch-ownership": "server-only"
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "updatedAt": {
      "type": "object",
      "description": "Serialized Firestore Timestamp fixture shape.",
      "x-firestore-type": "timestamp",
      "additionalProperties": false,
      "required": [
        "_seconds",
        "_nanoseconds"
      ],
      "properties": {
        "_seconds": {
          "type": "integer"
        },
        "_nanoseconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999999999
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "providerFees": {
      "type": "object",
      "additionalProperties": false,
      "description": "What the payment provider charged for a captured payment, read from its payment entity: fee is the whole charge including tax, tax is the GST within it. Both in minor units. Absent until the payment is captured or when the provider did not report them.",
      "required": [
        "feePaise",
        "taxPaise"
      ],
      "properties": {
        "feePaise": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "taxPaise": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "razorpayOwnership": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "projectId",
        "schema"
      ],
      "properties": {
        "projectId": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{4,28}[a-z0-9]$"
        },
        "schema": {
          "type": "string",
          "const": "1"
        }
      },
      "description": "Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.",
      "x-catch-ownership": "server-only"
    }
  }
} as const;
