/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManageOrganizerBillsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_manage_organizer_bills_response.schema.json",
  "title": "AdminManageOrganizerBillsCallableResponse",
  "description": "A month's bills, or one organizer's bills across months (month null, organizerId set), newest activity first, with totals and counts per state. overdue counts sent bills past their due date.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "month",
    "organizerId",
    "bills",
    "totals",
    "counts",
    "nextInvoiceNumber",
    "gstRegistered"
  ],
  "properties": {
    "month": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "organizerId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 180
    },
    "bills": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "title": "OrganizerBillDocument",
        "description": "Catch's monthly bill to one organizer, made from the bookings paid into the organizer's own account (hostCollected) in one calendar month, India time. Commission uses each payment's frozen terms (or the organizer's current terms when a payment has none), the free trial, and the monthly cap from the organizer's current terms. GST is added only while Settings → Payments says Catch is GST registered. An invoice number is taken from the financial year's unbroken sequence when the bill is sent. Server-only; Admin reads and acts on it through adminManageOrganizerBills.",
        "type": "object",
        "additionalProperties": false,
        "x-firestore-collection": "organizerBills",
        "x-firestore-path": "organizerBills/{billId}",
        "x-document-id-field": "billId",
        "x-owner": "Functions organizer billing (monthly generation, adminManageOrganizerBills, Razorpay payment link webhook)",
        "required": [
          "schemaVersion",
          "billId",
          "organizerId",
          "organizerName",
          "month",
          "periodStartMillis",
          "periodEndMillis",
          "revision",
          "status",
          "sales",
          "commission",
          "trialEndsAtMillis",
          "terms",
          "gst",
          "totalMinor",
          "invoiceNumber",
          "dueAtMillis",
          "paymentLink",
          "sentAtMillis",
          "reminders",
          "paidAtMillis",
          "paidMinor",
          "paidVia",
          "writtenOffAtMillis",
          "history",
          "generatedAtMillis",
          "updatedAtMillis"
        ],
        "definitions": {
          "millis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "nullableMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "minor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000000
          },
          "status": {
            "description": "toSend: made, not sent. sent: sent with its invoice number and due date; overdue is sent past its due date. paid, writtenOff: closed. free: nothing due because every sale fell in the free trial.",
            "enum": [
              "toSend",
              "sent",
              "paid",
              "writtenOff",
              "free"
            ]
          },
          "historyEntry": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "atMillis",
              "action",
              "byUid",
              "note"
            ],
            "properties": {
              "atMillis": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "action": {
                "enum": [
                  "generated",
                  "regenerated",
                  "sent",
                  "reminded",
                  "paid",
                  "writtenOff"
                ]
              },
              "byUid": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 128
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
        "properties": {
          "schemaVersion": {
            "const": 1
          },
          "billId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}_[0-9]{4}-[0-9]{2}$"
          },
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "organizerName": {
            "type": "string",
            "maxLength": 160
          },
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "periodStartMillis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "periodEndMillis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "revision": {
            "type": "integer",
            "minimum": 1
          },
          "status": {
            "description": "toSend: made, not sent. sent: sent with its invoice number and due date; overdue is sent past its due date. paid, writtenOff: closed. free: nothing due because every sale fell in the free trial.",
            "enum": [
              "toSend",
              "sent",
              "paid",
              "writtenOff",
              "free"
            ]
          },
          "sales": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "paymentCount",
              "eventCount",
              "grossMinor",
              "refundedMinor",
              "baseMinor",
              "providerFeeMinor",
              "providerTaxMinor",
              "unsnapshottedCount"
            ],
            "properties": {
              "paymentCount": {
                "type": "integer",
                "minimum": 0
              },
              "eventCount": {
                "type": "integer",
                "minimum": 0
              },
              "grossMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              },
              "refundedMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              },
              "baseMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000,
                "description": "What commission is charged on: gross or net of refunds, per the terms."
              },
              "providerFeeMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000,
                "description": "Razorpay's fees on these sales, taken from the organizer's account; shown for their records."
              },
              "providerTaxMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              },
              "unsnapshottedCount": {
                "type": "integer",
                "minimum": 0,
                "description": "Payments that froze no terms and were charged on the organizer's current terms."
              }
            }
          },
          "commission": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "rateBasisPoints",
              "uncappedMinor",
              "capMinor",
              "capped",
              "trialWaivedMinor",
              "amountMinor"
            ],
            "properties": {
              "rateBasisPoints": {
                "type": "integer",
                "minimum": 0,
                "maximum": 10000,
                "description": "The organizer's current rate; individual payments may have frozen another."
              },
              "uncappedMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
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
              "capped": {
                "type": "boolean"
              },
              "trialWaivedMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              }
            }
          },
          "trialEndsAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "terms": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "platformRevision",
              "organizerRevision",
              "ownTerms"
            ],
            "properties": {
              "platformRevision": {
                "type": "integer",
                "minimum": 0
              },
              "organizerRevision": {
                "type": "integer",
                "minimum": 0
              },
              "ownTerms": {
                "type": "boolean"
              }
            }
          },
          "gst": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "registered",
              "rateBasisPoints",
              "amountMinor"
            ],
            "properties": {
              "registered": {
                "type": "boolean"
              },
              "rateBasisPoints": {
                "type": "integer",
                "minimum": 0,
                "maximum": 10000
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000
              }
            }
          },
          "totalMinor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000000
          },
          "invoiceNumber": {
            "type": [
              "string",
              "null"
            ],
            "pattern": "^[0-9]{4}-[0-9]{2}/[0-9]{3,}$"
          },
          "dueAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "paymentLink": {
            "anyOf": [
              {
                "type": "null"
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "linkId",
                  "url"
                ],
                "properties": {
                  "linkId": {
                    "type": "string",
                    "pattern": "^plink_[A-Za-z0-9]{1,40}$"
                  },
                  "url": {
                    "type": "string",
                    "pattern": "^https://",
                    "maxLength": 300
                  }
                }
              }
            ]
          },
          "sentAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "reminders": {
            "type": "array",
            "maxItems": 24,
            "items": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            }
          },
          "paidAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "paidMinor": {
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
          "paidVia": {
            "enum": [
              "paymentLink",
              "manual",
              null
            ]
          },
          "writtenOffAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "history": {
            "type": "array",
            "maxItems": 60,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "atMillis",
                "action",
                "byUid",
                "note"
              ],
              "properties": {
                "atMillis": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 9007199254740991
                },
                "action": {
                  "enum": [
                    "generated",
                    "regenerated",
                    "sent",
                    "reminded",
                    "paid",
                    "writtenOff"
                  ]
                },
                "byUid": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 128
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
          "generatedAtMillis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "updatedAtMillis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          }
        }
      }
    },
    "totals": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "salesMinor",
        "billedMinor",
        "paidMinor"
      ],
      "properties": {
        "salesMinor": {
          "type": "integer",
          "minimum": 0
        },
        "billedMinor": {
          "type": "integer",
          "minimum": 0
        },
        "paidMinor": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "counts": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "all",
        "toSend",
        "sent",
        "overdue",
        "paid",
        "writtenOff",
        "free"
      ],
      "properties": {
        "all": {
          "type": "integer",
          "minimum": 0
        },
        "toSend": {
          "type": "integer",
          "minimum": 0
        },
        "sent": {
          "type": "integer",
          "minimum": 0
        },
        "overdue": {
          "type": "integer",
          "minimum": 0
        },
        "paid": {
          "type": "integer",
          "minimum": 0
        },
        "writtenOff": {
          "type": "integer",
          "minimum": 0
        },
        "free": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "nextInvoiceNumber": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}/[0-9]{3,}$"
    },
    "gstRegistered": {
      "type": "boolean"
    }
  }
} as const;
