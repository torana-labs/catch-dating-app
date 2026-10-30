/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const managePublicEventCheckoutCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_public_event_checkout_response.schema.json",
  "title": "ManagePublicEventCheckoutCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "quote",
    "payment",
    "admission",
    "serverTimeMillis"
  ],
  "properties": {
    "quote": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "eventId",
            "eventName",
            "registrationRevision",
            "startTimeMillis",
            "amountPaise",
            "currency",
            "cancellationPolicy"
          ],
          "properties": {
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "eventName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "registrationRevision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            "startTimeMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            "amountPaise": {
              "type": "integer",
              "minimum": 100,
              "maximum": 100000000
            },
            "currency": {
              "const": "INR"
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
            "listAmountPaise": {
              "type": "integer",
              "minimum": 100,
              "maximum": 100000000,
              "description": "Present only when a paid host membership price applies: the list price the member would otherwise pay."
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "payment": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "paymentId",
            "status",
            "amountPaise",
            "currency",
            "mode",
            "refundedAmountPaise",
            "expiresAtMillis",
            "checkout",
            "cancellationReason",
            "cancellationPolicy",
            "cancellationQuote",
            "eventId",
            "eventName",
            "startTimeMillis"
          ],
          "properties": {
            "paymentId": {
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
            "amountPaise": {
              "type": "integer",
              "minimum": 100,
              "maximum": 100000000
            },
            "currency": {
              "const": "INR"
            },
            "mode": {
              "enum": [
                "test",
                "live"
              ]
            },
            "refundedAmountPaise": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000
            },
            "expiresAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            "checkout": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "publicToken",
                    "orderId",
                    "amountPaise",
                    "currency",
                    "description",
                    "expiresAtMillis"
                  ],
                  "properties": {
                    "publicToken": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 512
                    },
                    "orderId": {
                      "type": "string",
                      "pattern": "^order_[A-Za-z0-9]+$"
                    },
                    "amountPaise": {
                      "type": "integer",
                      "minimum": 100,
                      "maximum": 100000000
                    },
                    "currency": {
                      "const": "INR"
                    },
                    "description": {
                      "type": "string",
                      "maxLength": 200
                    },
                    "expiresAtMillis": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    }
                  }
                },
                {
                  "type": "null"
                }
              ]
            },
            "cancellationReason": {
              "enum": [
                "eventCancelled",
                "guestCancelled",
                null
              ]
            },
            "cancellationPolicy": {
              "anyOf": [
                {
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
                {
                  "type": "null"
                }
              ]
            },
            "cancellationQuote": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "refundAmountPaise"
                  ],
                  "properties": {
                    "refundAmountPaise": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 100000000
                    }
                  }
                },
                {
                  "type": "null"
                }
              ]
            },
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "eventName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "startTimeMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "admission": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "eventId",
            "attendeeId",
            "status"
          ],
          "properties": {
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "attendeeId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "status": {
              "enum": [
                "registered",
                "checkedIn"
              ]
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "serverTimeMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  }
} as const;
