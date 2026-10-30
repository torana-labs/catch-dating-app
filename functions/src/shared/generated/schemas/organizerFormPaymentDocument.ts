/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerFormPaymentDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_form_payments.schema.json",
  "title": "OrganizerFormPaymentDocument",
  "description": "Durable form fee ledger. Frozen answers remain in the revision-bound response draft; payment is separate from application review and event admission.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "formId",
    "versionId",
    "draftId",
    "respondentUid",
    "connectionId",
    "accountId",
    "mode",
    "draftRevision",
    "answersHash",
    "identity",
    "amountPaise",
    "currency",
    "description",
    "refundPolicy",
    "receipt",
    "status",
    "providerOrderId",
    "providerPaymentId",
    "providerRefundId",
    "refundedAmountPaise",
    "responseId",
    "reservationReleased",
    "leaseUntil",
    "createdAt",
    "updatedAt",
    "checkoutExpiresAt",
    "capturedAt",
    "submittedAt",
    "lastErrorCode"
  ],
  "properties": {
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
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "formId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "versionId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "draftId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "respondentUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "connectionId": {
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
    "accountId": {
      "type": "string",
      "pattern": "^acc_[A-Za-z0-9]+$"
    },
    "mode": {
      "enum": [
        "test",
        "live"
      ],
      "type": "string"
    },
    "draftRevision": {
      "type": "integer",
      "minimum": 1
    },
    "answersHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "identity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "displayName",
        "email",
        "phoneE164",
        "searchName",
        "origin"
      ],
      "properties": {
        "displayName": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 160
        },
        "email": {
          "type": [
            "string",
            "null"
          ],
          "format": "email",
          "maxLength": 320
        },
        "phoneE164": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^\\+[1-9][0-9]{7,14}$"
        },
        "searchName": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 160
        },
        "origin": {
          "type": "string",
          "enum": [
            "anonymous",
            "respondentGranted",
            "organizerAcquired"
          ]
        }
      }
    },
    "amountPaise": {
      "type": "integer",
      "minimum": 100,
      "maximum": 10000000
    },
    "currency": {
      "const": "INR"
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160
    },
    "refundPolicy": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "receipt": {
      "type": "string",
      "pattern": "^cfp_[a-f0-9]{32}$"
    },
    "status": {
      "enum": [
        "creatingOrder",
        "orderUnknown",
        "checkoutReady",
        "verifying",
        "captured",
        "submitted",
        "failed",
        "expired",
        "refundPending",
        "refunded",
        "reviewRequired"
      ],
      "type": "string"
    },
    "providerOrderId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^order_[A-Za-z0-9]+$"
    },
    "providerPaymentId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^pay_[A-Za-z0-9]+$"
    },
    "providerRefundId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^rfnd_[A-Za-z0-9]+$"
    },
    "refundedAmountPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000000
    },
    "responseId": {
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
    "submittedAt": {
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
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 80
    }
  },
  "x-firestore-collection": "organizerFormPayments",
  "x-firestore-path": "organizerFormPayments/{paymentId}",
  "x-document-id-field": "paymentId",
  "x-owner": "organizer form payment server operations"
} as const;
