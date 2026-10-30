/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipChargeDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_charges.schema.json",
  "title": "HostMembershipChargeDocument",
  "description": "Server-only ledger of every captured membership charge, keyed by the provider payment id, and the commission statement's membership source. hostCollected charges were paid to the organizer's own account: no fee is deducted and no transfer is made (transfer.state notRequired). platformSplit charges are split to the organizer's Route account minus the at-source fee. Each new charge freezes the effective commercial terms.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipCharges",
  "x-firestore-path": "hostMembershipCharges/{chargeId}",
  "x-document-id-field": "chargeId",
  "x-owner": "membership webhook and reconcileHostMembershipCharges schedule",
  "required": [
    "schemaVersion",
    "membershipId",
    "organizerId",
    "uid",
    "provider",
    "providerSubscriptionId",
    "amountPaise",
    "feePaise",
    "transferAmountPaise",
    "periodStartMillis",
    "periodEndMillis",
    "providerAccountId",
    "mode",
    "transfer",
    "createdAtMillis",
    "updatedAtMillis"
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
    "provider": {
      "enum": [
        "razorpay"
      ],
      "x-catch-ownership": "server-only"
    },
    "providerSubscriptionId": {
      "type": "string",
      "pattern": "^sub_[A-Za-z0-9]{6,40}$",
      "x-catch-ownership": "server-only"
    },
    "amountPaise": {
      "type": "integer",
      "minimum": 100,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "feePaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "transferAmountPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "periodStartMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "periodEndMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "providerAccountId": {
      "type": "string",
      "pattern": "^acc_[A-Za-z0-9]{4,40}$",
      "x-catch-ownership": "server-only"
    },
    "mode": {
      "enum": [
        "test",
        "live"
      ],
      "x-catch-ownership": "server-only"
    },
    "moneyFlow": {
      "description": "Absent on charges recorded under the original platform-account model, which is platformSplit.",
      "enum": [
        "hostCollected",
        "platformSplit"
      ],
      "x-catch-ownership": "server-only"
    },
    "commercialTerms": {
      "description": "Effective terms frozen when the charge was recorded. Absent on charges recorded before commercial terms existed.",
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
      "x-catch-ownership": "server-only"
    },
    "transfer": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "transferId",
        "attempts",
        "lastError"
      ],
      "properties": {
        "state": {
          "enum": [
            "pending",
            "requesting",
            "created",
            "failed",
            "notRequired"
          ]
        },
        "transferId": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^trf_[A-Za-z0-9]{6,40}$"
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "lastError": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      },
      "x-catch-ownership": "server-only"
    },
    "createdAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "updatedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    }
  }
} as const;
