/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerFormAdmissionReceiptDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_form_admission_receipts.schema.json",
  "title": "OrganizerFormAdmissionReceiptDocument",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "eventId",
    "responseId",
    "contactId",
    "offerId",
    "expectedOfferRevision",
    "expectedOfferGeneration",
    "expectedLedgerRevision",
    "requestId",
    "receiptId",
    "attendeeId",
    "canonicalSeatKey",
    "requestHash",
    "resultingLedgerRevision",
    "admittedAtMillis",
    "seatAlreadyOccupied",
    "actorUid",
    "paymentSnapshot",
    "manualPayment"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "responseId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "offerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "expectedOfferRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "expectedOfferGeneration": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "expectedLedgerRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "requestId": {
      "type": "string",
      "minLength": 8,
      "maxLength": 120,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$"
    },
    "receiptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "attendeeId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "canonicalSeatKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "requestHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "resultingLedgerRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "admittedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "seatAlreadyOccupied": {
      "type": "boolean"
    },
    "actorUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9_-]{1,180}$"
    },
    "paymentSnapshot": {
      "title": "EventOfferPaymentSnapshot",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventPaymentRevision",
        "eventPaymentHash",
        "expectedAmountMinor",
        "currency",
        "reusablePaymentPageUrl",
        "paymentInstructions",
        "messageTemplate",
        "expiresAtMillis",
        "collectionMode",
        "personalPaymentLink"
      ],
      "properties": {
        "eventPaymentRevision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000000
        },
        "eventPaymentHash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "expectedAmountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "currency": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Z]{3}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "reusablePaymentPageUrl": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 2048,
              "format": "uri",
              "pattern": "^https://"
            },
            {
              "type": "null"
            }
          ]
        },
        "paymentInstructions": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        },
        "messageTemplate": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000
            },
            {
              "type": "null"
            }
          ]
        },
        "expiresAtMillis": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "collectionMode": {
          "anyOf": [
            {
              "type": "string",
              "enum": [
                "manualInstructions",
                "reusablePage",
                "personalRequest",
                "catchCheckout"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "personalPaymentLink": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 2048,
              "format": "uri",
              "pattern": "^https://"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "manualPayment": {
      "title": "EventOfferManualPayment",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "status",
        "evidenceReference",
        "evidenceRecordedAtMillis",
        "reviewedByUid",
        "reviewedAtMillis",
        "reviewNote",
        "bankReceiptChecked",
        "attestedAmountMinor",
        "attestedCurrency",
        "attestedEventPaymentRevision",
        "attestedEventPaymentHash"
      ],
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "none",
            "evidenceSubmitted",
            "hostAttestedReceived",
            "rejected"
          ]
        },
        "evidenceReference": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 3,
              "maxLength": 240
            },
            {
              "type": "null"
            }
          ]
        },
        "evidenceRecordedAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "reviewedByUid": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 180,
              "pattern": "^[A-Za-z0-9_-]{1,180}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "reviewedAtMillis": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            {
              "type": "null"
            }
          ]
        },
        "reviewNote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 3,
              "maxLength": 240
            },
            {
              "type": "null"
            }
          ]
        },
        "bankReceiptChecked": {
          "type": "boolean"
        },
        "attestedAmountMinor": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000
            },
            {
              "type": "null"
            }
          ]
        },
        "attestedCurrency": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Z]{3}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "attestedEventPaymentRevision": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 1,
              "maximum": 1000000000
            },
            {
              "type": "null"
            }
          ]
        },
        "attestedEventPaymentHash": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "applicationApproval": {
      "description": "Current native form application approval checked atomically at admission. Absent on legacy receipts.",
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "applicationId",
            "revision",
            "contactId",
            "reviewedAtMillis"
          ],
          "properties": {
            "applicationId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "contactId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "revision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            "reviewedAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        }
      ]
    },
    "providerPayment": {
      "description": "Frozen server-verified payment authority for automatic admission; absent on manual/free admissions.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "paymentId",
        "providerOrderId",
        "providerPaymentId",
        "recipientUid",
        "grantId",
        "capturedAtMillis",
        "routing"
      ],
      "properties": {
        "paymentId": {
          "type": "string",
          "pattern": "^ep_[a-f0-9]{32}$"
        },
        "providerOrderId": {
          "type": "string",
          "pattern": "^order_[A-Za-z0-9]+$",
          "maxLength": 128
        },
        "providerPaymentId": {
          "type": "string",
          "pattern": "^pay_[A-Za-z0-9]+$",
          "maxLength": 128
        },
        "recipientUid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "grantId": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "capturedAtMillis": {
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
        }
      }
    }
  }
} as const;
