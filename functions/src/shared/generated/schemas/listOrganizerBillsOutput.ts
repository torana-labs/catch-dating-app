/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listOrganizerBillsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/list_organizer_bills_response.schema.json",
  "title": "ListOrganizerBillsCallableResponse",
  "description": "Catch's bills to one organizer as its owner sees them, newest month first: bills sent or closed and free months. A bill not yet sent is left out, and so are its reminders, history, terms revisions and who acted on it, which stay with Catch's staff.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "bills"
  ],
  "definitions": {
    "minor": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000000
    },
    "nullableMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "bill": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "billId",
        "month",
        "status",
        "sales",
        "commission",
        "gst",
        "totalMinor",
        "invoiceNumber",
        "dueAtMillis",
        "paymentUrl",
        "paidAtMillis",
        "paidMinor"
      ],
      "properties": {
        "billId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "month": {
          "type": "string",
          "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
        },
        "status": {
          "enum": [
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
            "providerFeeMinor"
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
            "providerFeeMinor": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000000,
              "description": "Razorpay's fees on these sales including their tax, taken from the organizer's account."
            }
          }
        },
        "commission": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "amountMinor",
            "capMinor",
            "capped",
            "trialWaivedMinor"
          ],
          "properties": {
            "amountMinor": {
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
            }
          }
        },
        "gst": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "registered",
            "amountMinor"
          ],
          "properties": {
            "registered": {
              "type": "boolean"
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
          "maxLength": 40
        },
        "dueAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "paymentUrl": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^https://",
          "maxLength": 300,
          "description": "The Razorpay payment link, only while the bill is unpaid."
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
        }
      }
    }
  },
  "properties": {
    "bills": {
      "type": "array",
      "maxItems": 240,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "billId",
          "month",
          "status",
          "sales",
          "commission",
          "gst",
          "totalMinor",
          "invoiceNumber",
          "dueAtMillis",
          "paymentUrl",
          "paidAtMillis",
          "paidMinor"
        ],
        "properties": {
          "billId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "status": {
            "enum": [
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
              "providerFeeMinor"
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
              "providerFeeMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000000,
                "description": "Razorpay's fees on these sales including their tax, taken from the organizer's account."
              }
            }
          },
          "commission": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "amountMinor",
              "capMinor",
              "capped",
              "trialWaivedMinor"
            ],
            "properties": {
              "amountMinor": {
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
              }
            }
          },
          "gst": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "registered",
              "amountMinor"
            ],
            "properties": {
              "registered": {
                "type": "boolean"
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
            "maxLength": 40
          },
          "dueAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "paymentUrl": {
            "type": [
              "string",
              "null"
            ],
            "pattern": "^https://",
            "maxLength": 300,
            "description": "The Razorpay payment link, only while the bill is unpaid."
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
          }
        }
      }
    }
  }
} as const;
