/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const publicEventPaymentDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/public_event_payments.schema.json",
  "title": "PublicEventPaymentDocument",
  "description": "Server-owned public OTP checkout. Holds and financial recovery share the event payment engine; no application approval or form-offer identity is implied.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "eventId",
    "recipientUid",
    "requestId",
    "canonicalSeatKey",
    "identityRevision",
    "migrationRevision",
    "routing",
    "amountPaise",
    "currency",
    "receipt",
    "status",
    "providerOrderId",
    "providerPaymentId",
    "providerRefundId",
    "refundedAmountPaise",
    "admissionReceiptId",
    "reservationReleased",
    "leaseUntil",
    "createdAt",
    "updatedAt",
    "checkoutExpiresAt",
    "capturedAt",
    "admittedAt",
    "lastErrorCode",
    "registrationRevision",
    "attendeeId",
    "phoneE164",
    "displayName",
    "eventName",
    "requestHash",
    "inviteLinkId",
    "cancellationPolicy"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "recipientUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "canonicalSeatKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "identityRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "migrationRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "routing": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "version",
        "purpose",
        "organizerId",
        "selection",
        "policySource",
        "appRevision",
        "organizerRevision",
        "bindingId",
        "merchantAccountId",
        "destinationAccountId",
        "configurationVersion",
        "checkoutKey",
        "amountMinor",
        "transferAmountMinor",
        "settlementHold"
      ],
      "properties": {
        "version": {
          "const": 1
        },
        "amountMinor": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "transferAmountMinor": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "settlementHold": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "purpose": {
          "enum": [
            "formFee",
            "eventAdmission"
          ]
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "selection": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "route",
            "mode",
            "currency",
            "merchantCountry"
          ],
          "properties": {
            "route": {
              "enum": [
                "razorpayRoute",
                "razorpayOAuth",
                "stripeConnectDirect",
                "stripeConnectDestination"
              ]
            },
            "mode": {
              "enum": [
                "test",
                "live"
              ]
            },
            "currency": {
              "type": "string",
              "pattern": "^[A-Z]{3}$"
            },
            "merchantCountry": {
              "type": "string",
              "pattern": "^[A-Z]{2}$"
            }
          }
        },
        "policySource": {
          "enum": [
            "app",
            "organizer",
            "legacy"
          ]
        },
        "appRevision": {
          "type": "integer",
          "minimum": 0
        },
        "organizerRevision": {
          "type": "integer",
          "minimum": 0
        },
        "bindingId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "merchantAccountId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "destinationAccountId": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "configurationVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 512
        },
        "checkoutKey": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 256
        },
        "commercialTerms": {
          "description": "Effective commercial terms frozen when the attempt was prepared. Absent on payments prepared before commercial terms existed, or while platform defaults were unconfigured for a hostCollected route; a commission statement reviews those explicitly.",
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
          }
        }
      }
    },
    "amountPaise": {
      "type": "integer",
      "minimum": 100,
      "maximum": 100000000
    },
    "currency": {
      "const": "INR"
    },
    "receipt": {
      "type": "string",
      "pattern": "^pp_[a-f0-9]{32}$"
    },
    "status": {
      "enum": [
        "creatingOrder",
        "orderUnknown",
        "checkoutReady",
        "verifying",
        "captured",
        "admitted",
        "expired",
        "refundPending",
        "refunded",
        "reviewRequired",
        "failed",
        "cancelled"
      ]
    },
    "providerOrderId": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^order_[A-Za-z0-9]+$",
          "maxLength": 128
        },
        {
          "type": "null"
        }
      ]
    },
    "providerPaymentId": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^pay_[A-Za-z0-9]+$",
          "maxLength": 128
        },
        {
          "type": "null"
        }
      ]
    },
    "providerRefundId": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^rfnd_[A-Za-z0-9]+$",
          "maxLength": 128
        },
        {
          "type": "null"
        }
      ]
    },
    "refundedAmountPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000
    },
    "admissionReceiptId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    },
    "reservationReleased": {
      "type": "boolean"
    },
    "leaseUntil": {
      "anyOf": [
        {
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
          }
        },
        {
          "type": "null"
        }
      ]
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
      }
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
      }
    },
    "checkoutExpiresAt": {
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
      }
    },
    "capturedAt": {
      "anyOf": [
        {
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
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "admittedAt": {
      "anyOf": [
        {
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
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "lastErrorCode": {
      "anyOf": [
        {
          "type": "string",
          "maxLength": 80
        },
        {
          "type": "null"
        }
      ]
    },
    "settlement": {
      "type": "object",
      "additionalProperties": false,
      "description": "Durable Route hold-release intent and provider observation. Release is separate from settled funds. Optional only for pre-admission and older attempts.",
      "required": [
        "state",
        "transferId",
        "nextAttemptAtMillis",
        "leaseUntilMillis",
        "leaseId",
        "authorizedAtMillis",
        "completedAtMillis",
        "releasedAtMillis",
        "settledAtMillis"
      ],
      "properties": {
        "state": {
          "enum": [
            "waiting",
            "releasePending",
            "released",
            "settled",
            "blocked",
            "reviewRequired",
            "reversed"
          ]
        },
        "transferId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^trf_[A-Za-z0-9]+$",
              "maxLength": 128
            },
            {
              "type": "null"
            }
          ]
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
        "leaseId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[a-f0-9]{32}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "authorizedAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "completedAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "releasedAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "settledAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "cancellation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "reason",
        "requestedAtMillis",
        "attendeeId",
        "refundAmountPaise",
        "seatRetained"
      ],
      "properties": {
        "reason": {
          "enum": [
            "eventCancelled",
            "guestCancelled"
          ]
        },
        "requestedAtMillis": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "attendeeId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "refundAmountPaise": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "seatRetained": {
          "type": "boolean"
        }
      }
    },
    "cancellationPolicy": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "refundDeadlineMillis",
        "eventStartsAtMillis"
      ],
      "properties": {
        "refundDeadlineMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "eventStartsAtMillis": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      }
    },
    "registrationRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "attendeeId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "phoneE164": {
      "type": "string",
      "pattern": "^\\+[1-9][0-9]{7,14}$"
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "eventName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "requestHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "inviteLinkId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-firestore-collection": "publicEventPayments",
  "x-firestore-path": "publicEventPayments/{paymentId}",
  "x-document-id-field": "paymentId",
  "x-owner": "public event checkout service"
} as const;
