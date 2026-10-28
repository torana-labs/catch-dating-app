/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const getEventViewerStateCallableResponseSchema: Record<string, unknown> = {
  "type": "object",
  "additionalProperties": false,
  "required": [
    "viewer"
  ],
  "properties": {
    "viewer": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventId",
        "organizerId",
        "observedAtMillis",
        "membership",
        "review",
        "admission",
        "attendance",
        "waitlisted",
        "payment",
        "futureBooking",
        "route",
        "quotedPriceInPaise",
        "basis"
      ],
      "properties": {
        "eventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "observedAtMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "membership": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "state",
            "revision",
            "decisionId"
          ],
          "properties": {
            "state": {
              "type": "string",
              "enum": [
                "notRequired",
                "none",
                "active",
                "revoked",
                "unavailable"
              ]
            },
            "revision": {
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
            "decisionId": {
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
          }
        },
        "review": {
          "type": "string",
          "enum": [
            "none",
            "pending",
            "approved"
          ]
        },
        "admission": {
          "type": "string",
          "enum": [
            "none",
            "nativeParticipation",
            "publicPaidRoster",
            "guestRoster"
          ]
        },
        "attendance": {
          "type": "string",
          "enum": [
            "notRecorded",
            "attended"
          ]
        },
        "waitlisted": {
          "type": "boolean"
        },
        "payment": {
          "type": "string",
          "enum": [
            "notRead",
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
        "futureBooking": {
          "oneOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "allowed",
                "reason"
              ],
              "properties": {
                "allowed": {
                  "const": true
                },
                "reason": {
                  "type": "null"
                }
              }
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "allowed",
                "reason"
              ],
              "properties": {
                "allowed": {
                  "const": false
                },
                "reason": {
                  "type": "string",
                  "enum": [
                    "membershipRequired",
                    "inviteRequired",
                    "reviewRequired",
                    "full",
                    "pairCapacityUnavailable",
                    "generalCapacityUnavailable",
                    "cohortCapacityUnavailable",
                    "outOfRatioReviewRequired",
                    "balanceUnavailable",
                    "bookingDetailsRequired",
                    "runPreferencesRequired",
                    "ageRestricted",
                    "scheduleConflict",
                    "eventUnavailable",
                    "past",
                    "cancelled",
                    "unsupportedRoute",
                    "paidMembershipRequired",
                    "memberEarlyAccess"
                  ]
                }
              }
            }
          ]
        },
        "route": {
          "anyOf": [
            {
              "type": "string",
              "enum": [
                "catchFreeBooking",
                "catchCheckout",
                "catchWaitlistOffer"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "quotedPriceInPaise": {
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
        "basis": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "policyHash",
            "inventoryRevision",
            "capacityRevision",
            "migrationRevision"
          ],
          "properties": {
            "policyHash": {
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
            "inventoryRevision": {
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
            "capacityRevision": {
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
            "migrationRevision": {
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
        "guest": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "action",
            "publicFormId",
            "applicationStatus",
            "offerGrantId",
            "publicPaymentId",
            "runtimeId",
            "attendeeId",
            "expiresAtMillis",
            "offerPaymentId"
          ],
          "properties": {
            "action": {
              "type": "string",
              "enum": [
                "registerFree",
                "bookPaid",
                "apply",
                "applicationPending",
                "applicationWaitlisted",
                "declined",
                "awaitingOffer",
                "offer",
                "registered",
                "seatWaitlisted",
                "recoverPayment",
                "closed",
                "unsupported",
                "unavailable"
              ]
            },
            "publicFormId": {
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
            "applicationStatus": {
              "anyOf": [
                {
                  "type": "string",
                  "enum": [
                    "submitted",
                    "inReview",
                    "approved",
                    "waitlisted",
                    "declined",
                    "withdrawn"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "offerGrantId": {
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
            "publicPaymentId": {
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
            "runtimeId": {
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
            "attendeeId": {
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
            "expiresAtMillis": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "offerPaymentId": {
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
          }
        },
        "hostMembership": {
          "type": "object",
          "additionalProperties": false,
          "description": "Present only when the request opted in. Server-evaluated paid membership entitlement for this viewer and event; quotedPriceInPaise is already the member price when memberPriceApplied.",
          "required": [
            "member",
            "listPriceInPaise",
            "memberPriceApplied",
            "memberPriceBlockedReason",
            "savingsInPaise",
            "membersOnly",
            "generalSaleOpensAtMillis",
            "offer"
          ],
          "properties": {
            "member": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "membershipId",
                    "planId",
                    "planName",
                    "status",
                    "entitled"
                  ],
                  "properties": {
                    "membershipId": {
                      "type": "string",
                      "pattern": "^hm_[a-f0-9]{64}$"
                    },
                    "planId": {
                      "type": "string",
                      "pattern": "^hmp_[A-Za-z0-9]{20}$"
                    },
                    "planName": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 60
                    },
                    "status": {
                      "enum": [
                        "trialing",
                        "active",
                        "past_due",
                        "paused",
                        "canceling",
                        "expired"
                      ]
                    },
                    "entitled": {
                      "type": "boolean"
                    }
                  }
                }
              ]
            },
            "listPriceInPaise": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "memberPriceApplied": {
              "type": "boolean"
            },
            "memberPriceBlockedReason": {
              "enum": [
                null,
                "bookingCapReached"
              ]
            },
            "savingsInPaise": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "membersOnly": {
              "type": "boolean"
            },
            "generalSaleOpensAtMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "offer": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "planId",
                    "planName",
                    "interval",
                    "planPriceInPaise",
                    "memberPriceInPaise",
                    "savingsInPaise",
                    "unlocksAccess"
                  ],
                  "properties": {
                    "planId": {
                      "type": "string",
                      "pattern": "^hmp_[A-Za-z0-9]{20}$"
                    },
                    "planName": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 60
                    },
                    "interval": {
                      "enum": [
                        "monthly",
                        "annual"
                      ]
                    },
                    "planPriceInPaise": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 1500000,
                      "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
                    },
                    "memberPriceInPaise": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "savingsInPaise": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "unlocksAccess": {
                      "type": "boolean"
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/get_event_viewer_state_response.schema.json",
  "title": "GetEventViewerStateCallableResponse",
  "description": "Current eligibility is separate from retained payment, admission and attendance evidence. Observation only; final mutations revalidate authority."
} as const;
