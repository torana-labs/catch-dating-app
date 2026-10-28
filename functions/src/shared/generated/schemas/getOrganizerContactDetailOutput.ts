/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const getOrganizerContactDetailCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/get_organizer_contact_detail_response.schema.json",
  "title": "GetOrganizerContactDetailCallableResponse",
  "description": "Manager-only contact facts, permission provenance, and a bounded cross-surface activity timeline. Private feedback and Event Success inputs are excluded.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "contactId",
    "displayName",
    "sourceDisplayName",
    "displayNameOverride",
    "phoneE164",
    "email",
    "linkedAccount",
    "identityState",
    "identityConfidence",
    "ambiguousCandidateContactIds",
    "whatsappAdminSuppressed",
    "whatsappPermission",
    "origins",
    "originsTruncated",
    "traits",
    "revenue",
    "events",
    "eventsTruncated",
    "timeline",
    "timelineTruncated",
    "timelineCoverage",
    "activeMerges",
    "revision"
  ],
  "properties": {
    "historyLoaded": {
      "type": "boolean",
      "description": "False means operational history was deliberately not requested; empty history arrays are not evidence of no activity."
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "sourceDisplayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "displayNameOverride": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 120
    },
    "phoneE164": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^\\+[1-9][0-9]{7,14}$"
    },
    "email": {
      "type": [
        "string",
        "null"
      ],
      "format": "email",
      "maxLength": 320
    },
    "linkedAccount": {
      "type": "boolean"
    },
    "identityState": {
      "type": "string",
      "enum": [
        "unlinked",
        "verified",
        "ambiguous"
      ]
    },
    "identityConfidence": {
      "type": "string",
      "enum": [
        "eventOnly",
        "proposed",
        "verified"
      ]
    },
    "contactDetailsEditable": {
      "type": "boolean",
      "description": "True only for an unlinked organizer-created contact whose proposed phone/email evidence the manager may edit."
    },
    "ambiguousCandidateContactIds": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 20,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      }
    },
    "whatsappAdminSuppressed": {
      "type": "boolean"
    },
    "whatsappPermission": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "status",
        "evidenceStatus",
        "receiptId",
        "source",
        "sourceFormId",
        "sourceFormTitle",
        "decisionAtMillis",
        "identityStrength"
      ],
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "evidenceStatus": {
          "type": "string",
          "enum": [
            "unavailable",
            "notApplicable",
            "complete",
            "incomplete"
          ]
        },
        "receiptId": {
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
        "source": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            null,
            "publicEventRegistration",
            "hostFormResponse",
            "participantSettings",
            "unsubscribeLink",
            "inboundStop",
            "providerWebhook",
            "legacyIncomplete"
          ]
        },
        "sourceFormId": {
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
        "sourceFormTitle": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "decisionAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "identityStrength": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            null,
            "unknown",
            "emailVerified",
            "phoneVerified",
            "catchAccount"
          ]
        },
        "purposes": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "eventOperations": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "status",
                "evidenceStatus",
                "receiptId",
                "decisionAtMillis",
                "deliveryAvailable"
              ],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": [
                    "unknown",
                    "optedIn",
                    "optedOut"
                  ]
                },
                "evidenceStatus": {
                  "type": "string",
                  "enum": [
                    "complete",
                    "incomplete"
                  ]
                },
                "receiptId": {
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
                "decisionAtMillis": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "deliveryAvailable": {
                  "type": "boolean",
                  "description": "False for form-originated WhatsApp purposes pending provider review; consent can still be recorded."
                }
              }
            },
            "marketing": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "status",
                "evidenceStatus",
                "receiptId",
                "decisionAtMillis",
                "deliveryAvailable"
              ],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": [
                    "unknown",
                    "optedIn",
                    "optedOut"
                  ]
                },
                "evidenceStatus": {
                  "type": "string",
                  "enum": [
                    "complete",
                    "incomplete"
                  ]
                },
                "receiptId": {
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
                "decisionAtMillis": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "deliveryAvailable": {
                  "type": "boolean",
                  "description": "False for form-originated WhatsApp purposes pending provider review; consent can still be recorded."
                }
              }
            }
          }
        }
      }
    },
    "origins": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "originId",
          "sourceKind",
          "sourceEntityKind",
          "formId",
          "formTitle",
          "eventId",
          "eventTitle",
          "observedAtMillis"
        ],
        "properties": {
          "originId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "sourceKind": {
            "type": "string",
            "enum": [
              "catchBooking",
              "hostImport",
              "hostManual",
              "webOtp",
              "providerSync",
              "hostForm"
            ]
          },
          "sourceEntityKind": {
            "type": "string",
            "enum": [
              "eventAttendee",
              "manualEntry",
              "hostFormResponse",
              "providerRecord",
              "importBatch",
              "webRegistration",
              "hostApplicationResponse"
            ]
          },
          "formId": {
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
          "formTitle": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 160
          },
          "eventId": {
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
          "eventTitle": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 160
          },
          "observedAtMillis": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "originsTruncated": {
      "type": "boolean"
    },
    "traits": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "expectedEventCount",
        "attendedEventCount",
        "cancelledEventCount",
        "noShowCount",
        "importedEventCount",
        "attendanceRate",
        "segmentIds",
        "whatsappStatus",
        "smsStatus",
        "sourceCoverage"
      ],
      "properties": {
        "expectedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "attendedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "cancelledEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "noShowCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "importedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "attendanceRate": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0,
          "maximum": 1
        },
        "segmentIds": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 16,
          "items": {
            "type": "string",
            "enum": [
              "new_to_organizer",
              "past_attendee",
              "first_time_attendee",
              "repeat_attendee",
              "regular",
              "lapsed_regular",
              "reliable_attendee",
              "needs_confirmation",
              "advocate",
              "high_impact_advocate",
              "whatsapp_reachable",
              "sms_reachable",
              "active_member",
              "lapsed_member",
              "member_no_recent_attendance",
              "frequent_non_member"
            ]
          }
        },
        "whatsappStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "smsStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "sourceCoverage": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "insufficientData"
          ]
        },
        "membership": {
          "description": "CRM projection of one contact's paid membership with the organizer, through the contact's linked account.",
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "required": [
            "planId",
            "planName",
            "status",
            "memberSinceMillis",
            "entitled"
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
            "memberSinceMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "entitled": {
              "type": "boolean"
            }
          }
        }
      }
    },
    "revenue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "coverage",
        "amounts"
      ],
      "properties": {
        "coverage": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "amounts": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "currency",
              "amountMinor",
              "factCount",
              "sources"
            ],
            "properties": {
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "factCount": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              },
              "sources": {
                "type": "array",
                "maxItems": 4,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "source",
                    "amountMinor",
                    "factCount"
                  ],
                  "properties": {
                    "source": {
                      "type": "string",
                      "enum": [
                        "catchPayment",
                        "hostImport",
                        "hostEstimate",
                        "providerOrder",
                        "hostAttested"
                      ]
                    },
                    "amountMinor": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "factCount": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 1000000
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "events": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "eventId",
          "attendeeId",
          "displayName",
          "eventOriginMode",
          "eventProvider",
          "source",
          "status",
          "expected",
          "registered",
          "cancelled",
          "checkedIn",
          "eventStartAtMillis",
          "eventEndAtMillis",
          "registeredAtMillis",
          "cancelledAtMillis",
          "checkedInAtMillis",
          "revenues"
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
          "displayName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "eventOriginMode": {
            "type": "string",
            "enum": [
              "catchNative",
              "externalCompanion",
              "unknown"
            ]
          },
          "eventProvider": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "catch",
              "generic",
              "luma",
              "eventbrite",
              "partiful",
              "posh",
              "bookmyshow",
              "district",
              "sortmyscene",
              "airbnb",
              null
            ]
          },
          "source": {
            "type": "string",
            "enum": [
              "catchBooking",
              "hostImport",
              "hostManual",
              "webOtp",
              "providerSync"
            ]
          },
          "status": {
            "type": "string",
            "enum": [
              "invited",
              "registered",
              "waitlisted",
              "checkedIn",
              "cancelled"
            ]
          },
          "expected": {
            "type": "boolean"
          },
          "registered": {
            "type": "boolean"
          },
          "cancelled": {
            "type": "boolean"
          },
          "checkedIn": {
            "type": "boolean"
          },
          "eventStartAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "eventEndAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "registeredAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "cancelledAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "checkedInAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "revenues": {
            "type": "array",
            "maxItems": 8,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "currency",
                "amountMinor",
                "source",
                "factCount",
                "allocation"
              ],
              "properties": {
                "currency": {
                  "type": "string",
                  "pattern": "^[A-Z]{3}$"
                },
                "amountMinor": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 9007199254740991
                },
                "source": {
                  "type": "string",
                  "enum": [
                    "catchPayment",
                    "hostImport",
                    "hostEstimate",
                    "providerOrder",
                    "hostAttested"
                  ]
                },
                "factCount": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 1000000
                },
                "allocation": {
                  "type": "string",
                  "enum": [
                    "perAttendee",
                    "sharedOrder"
                  ]
                }
              }
            }
          }
        }
      }
    },
    "eventsTruncated": {
      "type": "boolean"
    },
    "manualTags": {
      "type": "array",
      "maxItems": 5,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "tagId",
          "label"
        ],
        "properties": {
          "tagId": {
            "type": "string",
            "pattern": "^[a-f0-9]{32}$"
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 40
          }
        }
      }
    },
    "manualTagVocabulary": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "tagId",
          "label"
        ],
        "properties": {
          "tagId": {
            "type": "string",
            "pattern": "^[a-f0-9]{32}$"
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 40
          }
        }
      }
    },
    "notes": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "noteId",
          "body",
          "authorUid",
          "createdAtMillis",
          "updatedAtMillis",
          "revision"
        ],
        "properties": {
          "noteId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "body": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2000
          },
          "authorUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "createdAtMillis": {
            "type": "integer",
            "minimum": 0
          },
          "updatedAtMillis": {
            "type": "integer",
            "minimum": 0
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          }
        }
      }
    },
    "notesTruncated": {
      "type": "boolean"
    },
    "notesCoverage": {
      "type": "string",
      "enum": [
        "exact",
        "unavailable"
      ]
    },
    "sends": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "campaignId",
              "name",
              "messageClass",
              "deliveryStatus",
              "createdAtMillis",
              "sentAtMillis",
              "updatedAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "campaign"
              },
              "campaignId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "messageClass": {
                "type": "string",
                "enum": [
                  "eventFollowUp",
                  "organizerUpdate",
                  "organizerPromotion"
                ]
              },
              "deliveryStatus": {
                "type": "string",
                "enum": [
                  "pending",
                  "sending",
                  "suppressed",
                  "accepted",
                  "sent",
                  "delivered",
                  "read",
                  "failed",
                  "replied",
                  "optedOut"
                ]
              },
              "createdAtMillis": {
                "type": "integer",
                "minimum": 0
              },
              "sentAtMillis": {
                "type": [
                  "integer",
                  "null"
                ],
                "minimum": 0
              },
              "updatedAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "broadcastId",
              "eventId",
              "eventName",
              "audience",
              "deliveryStatus",
              "sentAtMillis",
              "partialFailure"
            ],
            "properties": {
              "kind": {
                "const": "announcement"
              },
              "broadcastId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "eventId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "eventName": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160
              },
              "audience": {
                "type": "string",
                "enum": [
                  "booked",
                  "prospective",
                  "everyone"
                ]
              },
              "deliveryStatus": {
                "type": "string",
                "enum": [
                  "available",
                  "failed"
                ]
              },
              "sentAtMillis": {
                "type": "integer",
                "minimum": 0
              },
              "partialFailure": {
                "type": "boolean"
              }
            }
          }
        ]
      }
    },
    "sendsTruncated": {
      "type": "boolean"
    },
    "sendsCoverage": {
      "type": "string",
      "enum": [
        "exact",
        "unavailable"
      ]
    },
    "timeline": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "timelineId",
              "responseId",
              "formId",
              "formTitle",
              "action",
              "answeredQuestionCount",
              "occurredAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "form"
              },
              "timelineId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "responseId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "formId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "formTitle": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1,
                "maxLength": 160
              },
              "action": {
                "type": "string",
                "enum": [
                  "submitted",
                  "withdrawn"
                ]
              },
              "answeredQuestionCount": {
                "type": "integer",
                "minimum": 0,
                "maximum": 4000
              },
              "occurredAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "timelineId",
              "eventId",
              "eventName",
              "status",
              "checkedIn",
              "eventOriginMode",
              "eventProvider",
              "occurredAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "event"
              },
              "timelineId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "eventId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "eventName": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160
              },
              "status": {
                "type": "string",
                "enum": [
                  "invited",
                  "registered",
                  "waitlisted",
                  "checkedIn",
                  "cancelled"
                ]
              },
              "checkedIn": {
                "type": "boolean"
              },
              "eventOriginMode": {
                "type": "string",
                "enum": [
                  "catchNative",
                  "externalCompanion",
                  "unknown"
                ]
              },
              "eventProvider": {
                "type": [
                  "string",
                  "null"
                ],
                "enum": [
                  "catch",
                  "generic",
                  "luma",
                  "eventbrite",
                  "partiful",
                  "posh",
                  "bookmyshow",
                  "district",
                  "sortmyscene",
                  "airbnb",
                  null
                ]
              },
              "occurredAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "timelineId",
              "sendKind",
              "name",
              "status",
              "deliveryMode",
              "observation",
              "referenceId",
              "occurredAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "send"
              },
              "timelineId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "sendKind": {
                "type": "string",
                "enum": [
                  "campaign",
                  "announcement",
                  "manualHandoff"
                ]
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160
              },
              "status": {
                "type": "string",
                "enum": [
                  "available",
                  "pending",
                  "sending",
                  "suppressed",
                  "accepted",
                  "sent",
                  "delivered",
                  "read",
                  "failed",
                  "replied",
                  "optedOut",
                  "queued",
                  "handoffOpened",
                  "hostMarkedSent",
                  "skipped",
                  "cancelled",
                  "superseded",
                  "expired"
                ]
              },
              "deliveryMode": {
                "type": "string",
                "enum": [
                  "inCatch",
                  "api",
                  "byHand"
                ]
              },
              "observation": {
                "type": "string",
                "enum": [
                  "providerReceipt",
                  "catchActivity",
                  "hostOpened",
                  "hostAssertion",
                  "notSent"
                ]
              },
              "referenceId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "occurredAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "timelineId",
              "transport",
              "direction",
              "bodyPreview",
              "threadId",
              "occurredAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "reply"
              },
              "timelineId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "transport": {
                "type": "string",
                "enum": [
                  "catchChat",
                  "managedWhatsapp"
                ]
              },
              "direction": {
                "type": "string",
                "enum": [
                  "inbound",
                  "outbound"
                ]
              },
              "bodyPreview": {
                "type": "string",
                "minLength": 1,
                "maxLength": 300
              },
              "threadId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "occurredAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "kind",
              "timelineId",
              "channel",
              "outcome",
              "notePreview",
              "occurredAtMillis"
            ],
            "properties": {
              "kind": {
                "const": "outreach"
              },
              "timelineId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "channel": {
                "type": "string",
                "enum": [
                  "phoneCall",
                  "whatsapp",
                  "email",
                  "sms",
                  "inPerson",
                  "other"
                ]
              },
              "outcome": {
                "type": "string",
                "enum": [
                  "reached",
                  "noAnswer",
                  "leftMessage",
                  "wrongContact",
                  "attempted"
                ]
              },
              "notePreview": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1,
                "maxLength": 300
              },
              "occurredAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          }
        ]
      }
    },
    "timelineTruncated": {
      "type": "boolean"
    },
    "timelineCoverage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "forms",
        "events",
        "sends",
        "replies",
        "outreach",
        "replyObservation"
      ],
      "properties": {
        "forms": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "events": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "sends": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "replies": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "outreach": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "replyObservation": {
          "const": "catchAndManagedWhatsappOnly"
        }
      }
    },
    "activeMerges": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "mergeReceiptId",
          "sourceContactId",
          "sourceDisplayName",
          "evidence",
          "conflicts",
          "movedFactCount",
          "mergedAtMillis"
        ],
        "properties": {
          "mergeReceiptId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "sourceContactId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "sourceDisplayName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "evidence": {
            "type": "array",
            "maxItems": 20,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "enum": [
                "sameVerifiedUid",
                "sameVerifiedPhone",
                "sameImportedPhone",
                "sameEmail",
                "managerConfirmed"
              ]
            }
          },
          "conflicts": {
            "type": "array",
            "maxItems": 20,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "maxLength": 120
            }
          },
          "movedFactCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 400
          },
          "mergedAtMillis": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    }
  },
  "definitions": {
    "permission": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "status",
        "evidenceStatus",
        "receiptId",
        "source",
        "sourceFormId",
        "sourceFormTitle",
        "decisionAtMillis",
        "identityStrength"
      ],
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "evidenceStatus": {
          "type": "string",
          "enum": [
            "unavailable",
            "notApplicable",
            "complete",
            "incomplete"
          ]
        },
        "receiptId": {
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
        "source": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            null,
            "publicEventRegistration",
            "hostFormResponse",
            "participantSettings",
            "unsubscribeLink",
            "inboundStop",
            "providerWebhook",
            "legacyIncomplete"
          ]
        },
        "sourceFormId": {
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
        "sourceFormTitle": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "decisionAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "identityStrength": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            null,
            "unknown",
            "emailVerified",
            "phoneVerified",
            "catchAccount"
          ]
        },
        "purposes": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "eventOperations": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "status",
                "evidenceStatus",
                "receiptId",
                "decisionAtMillis",
                "deliveryAvailable"
              ],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": [
                    "unknown",
                    "optedIn",
                    "optedOut"
                  ]
                },
                "evidenceStatus": {
                  "type": "string",
                  "enum": [
                    "complete",
                    "incomplete"
                  ]
                },
                "receiptId": {
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
                "decisionAtMillis": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "deliveryAvailable": {
                  "type": "boolean",
                  "description": "False for form-originated WhatsApp purposes pending provider review; consent can still be recorded."
                }
              }
            },
            "marketing": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "status",
                "evidenceStatus",
                "receiptId",
                "decisionAtMillis",
                "deliveryAvailable"
              ],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": [
                    "unknown",
                    "optedIn",
                    "optedOut"
                  ]
                },
                "evidenceStatus": {
                  "type": "string",
                  "enum": [
                    "complete",
                    "incomplete"
                  ]
                },
                "receiptId": {
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
                "decisionAtMillis": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "deliveryAvailable": {
                  "type": "boolean",
                  "description": "False for form-originated WhatsApp purposes pending provider review; consent can still be recorded."
                }
              }
            }
          }
        }
      }
    },
    "purposePermission": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "status",
        "evidenceStatus",
        "receiptId",
        "decisionAtMillis",
        "deliveryAvailable"
      ],
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "evidenceStatus": {
          "type": "string",
          "enum": [
            "complete",
            "incomplete"
          ]
        },
        "receiptId": {
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
        "decisionAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "deliveryAvailable": {
          "type": "boolean",
          "description": "False for form-originated WhatsApp purposes pending provider review; consent can still be recorded."
        }
      }
    },
    "origin": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "originId",
        "sourceKind",
        "sourceEntityKind",
        "formId",
        "formTitle",
        "eventId",
        "eventTitle",
        "observedAtMillis"
      ],
      "properties": {
        "originId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "sourceKind": {
          "type": "string",
          "enum": [
            "catchBooking",
            "hostImport",
            "hostManual",
            "webOtp",
            "providerSync",
            "hostForm"
          ]
        },
        "sourceEntityKind": {
          "type": "string",
          "enum": [
            "eventAttendee",
            "manualEntry",
            "hostFormResponse",
            "providerRecord",
            "importBatch",
            "webRegistration",
            "hostApplicationResponse"
          ]
        },
        "formId": {
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
        "formTitle": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "eventId": {
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
        "eventTitle": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "observedAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "timelineCoverageValue": {
      "type": "string",
      "enum": [
        "exact",
        "partial",
        "unavailable"
      ]
    },
    "timelineCoverage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "forms",
        "events",
        "sends",
        "replies",
        "outreach",
        "replyObservation"
      ],
      "properties": {
        "forms": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "events": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "sends": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "replies": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "outreach": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "replyObservation": {
          "const": "catchAndManagedWhatsappOnly"
        }
      }
    },
    "timelineEntry": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "timelineId",
            "responseId",
            "formId",
            "formTitle",
            "action",
            "answeredQuestionCount",
            "occurredAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "form"
            },
            "timelineId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "responseId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "formId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "formTitle": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 160
            },
            "action": {
              "type": "string",
              "enum": [
                "submitted",
                "withdrawn"
              ]
            },
            "answeredQuestionCount": {
              "type": "integer",
              "minimum": 0,
              "maximum": 4000
            },
            "occurredAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "timelineId",
            "eventId",
            "eventName",
            "status",
            "checkedIn",
            "eventOriginMode",
            "eventProvider",
            "occurredAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "event"
            },
            "timelineId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "eventName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "status": {
              "type": "string",
              "enum": [
                "invited",
                "registered",
                "waitlisted",
                "checkedIn",
                "cancelled"
              ]
            },
            "checkedIn": {
              "type": "boolean"
            },
            "eventOriginMode": {
              "type": "string",
              "enum": [
                "catchNative",
                "externalCompanion",
                "unknown"
              ]
            },
            "eventProvider": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "catch",
                "generic",
                "luma",
                "eventbrite",
                "partiful",
                "posh",
                "bookmyshow",
                "district",
                "sortmyscene",
                "airbnb",
                null
              ]
            },
            "occurredAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "timelineId",
            "sendKind",
            "name",
            "status",
            "deliveryMode",
            "observation",
            "referenceId",
            "occurredAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "send"
            },
            "timelineId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "sendKind": {
              "type": "string",
              "enum": [
                "campaign",
                "announcement",
                "manualHandoff"
              ]
            },
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "status": {
              "type": "string",
              "enum": [
                "available",
                "pending",
                "sending",
                "suppressed",
                "accepted",
                "sent",
                "delivered",
                "read",
                "failed",
                "replied",
                "optedOut",
                "queued",
                "handoffOpened",
                "hostMarkedSent",
                "skipped",
                "cancelled",
                "superseded",
                "expired"
              ]
            },
            "deliveryMode": {
              "type": "string",
              "enum": [
                "inCatch",
                "api",
                "byHand"
              ]
            },
            "observation": {
              "type": "string",
              "enum": [
                "providerReceipt",
                "catchActivity",
                "hostOpened",
                "hostAssertion",
                "notSent"
              ]
            },
            "referenceId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "occurredAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "timelineId",
            "transport",
            "direction",
            "bodyPreview",
            "threadId",
            "occurredAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "reply"
            },
            "timelineId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "transport": {
              "type": "string",
              "enum": [
                "catchChat",
                "managedWhatsapp"
              ]
            },
            "direction": {
              "type": "string",
              "enum": [
                "inbound",
                "outbound"
              ]
            },
            "bodyPreview": {
              "type": "string",
              "minLength": 1,
              "maxLength": 300
            },
            "threadId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "occurredAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "timelineId",
            "channel",
            "outcome",
            "notePreview",
            "occurredAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "outreach"
            },
            "timelineId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "channel": {
              "type": "string",
              "enum": [
                "phoneCall",
                "whatsapp",
                "email",
                "sms",
                "inPerson",
                "other"
              ]
            },
            "outcome": {
              "type": "string",
              "enum": [
                "reached",
                "noAnswer",
                "leftMessage",
                "wrongContact",
                "attempted"
              ]
            },
            "notePreview": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 300
            },
            "occurredAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        }
      ]
    },
    "formTimelineEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "timelineId",
        "responseId",
        "formId",
        "formTitle",
        "action",
        "answeredQuestionCount",
        "occurredAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "form"
        },
        "timelineId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "responseId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "formId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "formTitle": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 160
        },
        "action": {
          "type": "string",
          "enum": [
            "submitted",
            "withdrawn"
          ]
        },
        "answeredQuestionCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 4000
        },
        "occurredAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "eventTimelineEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "timelineId",
        "eventId",
        "eventName",
        "status",
        "checkedIn",
        "eventOriginMode",
        "eventProvider",
        "occurredAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "event"
        },
        "timelineId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "eventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "eventName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "status": {
          "type": "string",
          "enum": [
            "invited",
            "registered",
            "waitlisted",
            "checkedIn",
            "cancelled"
          ]
        },
        "checkedIn": {
          "type": "boolean"
        },
        "eventOriginMode": {
          "type": "string",
          "enum": [
            "catchNative",
            "externalCompanion",
            "unknown"
          ]
        },
        "eventProvider": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "catch",
            "generic",
            "luma",
            "eventbrite",
            "partiful",
            "posh",
            "bookmyshow",
            "district",
            "sortmyscene",
            "airbnb",
            null
          ]
        },
        "occurredAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "sendTimelineEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "timelineId",
        "sendKind",
        "name",
        "status",
        "deliveryMode",
        "observation",
        "referenceId",
        "occurredAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "send"
        },
        "timelineId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "sendKind": {
          "type": "string",
          "enum": [
            "campaign",
            "announcement",
            "manualHandoff"
          ]
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "status": {
          "type": "string",
          "enum": [
            "available",
            "pending",
            "sending",
            "suppressed",
            "accepted",
            "sent",
            "delivered",
            "read",
            "failed",
            "replied",
            "optedOut",
            "queued",
            "handoffOpened",
            "hostMarkedSent",
            "skipped",
            "cancelled",
            "superseded",
            "expired"
          ]
        },
        "deliveryMode": {
          "type": "string",
          "enum": [
            "inCatch",
            "api",
            "byHand"
          ]
        },
        "observation": {
          "type": "string",
          "enum": [
            "providerReceipt",
            "catchActivity",
            "hostOpened",
            "hostAssertion",
            "notSent"
          ]
        },
        "referenceId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "occurredAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "replyTimelineEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "timelineId",
        "transport",
        "direction",
        "bodyPreview",
        "threadId",
        "occurredAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "reply"
        },
        "timelineId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "transport": {
          "type": "string",
          "enum": [
            "catchChat",
            "managedWhatsapp"
          ]
        },
        "direction": {
          "type": "string",
          "enum": [
            "inbound",
            "outbound"
          ]
        },
        "bodyPreview": {
          "type": "string",
          "minLength": 1,
          "maxLength": 300
        },
        "threadId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "occurredAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "outreachTimelineEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "timelineId",
        "channel",
        "outcome",
        "notePreview",
        "occurredAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "outreach"
        },
        "timelineId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "channel": {
          "type": "string",
          "enum": [
            "phoneCall",
            "whatsapp",
            "email",
            "sms",
            "inPerson",
            "other"
          ]
        },
        "outcome": {
          "type": "string",
          "enum": [
            "reached",
            "noAnswer",
            "leftMessage",
            "wrongContact",
            "attempted"
          ]
        },
        "notePreview": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 300
        },
        "occurredAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "activeMerge": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mergeReceiptId",
        "sourceContactId",
        "sourceDisplayName",
        "evidence",
        "conflicts",
        "movedFactCount",
        "mergedAtMillis"
      ],
      "properties": {
        "mergeReceiptId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "sourceContactId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "sourceDisplayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "evidence": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "sameVerifiedUid",
              "sameVerifiedPhone",
              "sameImportedPhone",
              "sameEmail",
              "managerConfirmed"
            ]
          }
        },
        "conflicts": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "maxLength": 120
          }
        },
        "movedFactCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 400
        },
        "mergedAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "manualTag": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "tagId",
        "label"
      ],
      "properties": {
        "tagId": {
          "type": "string",
          "pattern": "^[a-f0-9]{32}$"
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        }
      }
    },
    "note": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "noteId",
        "body",
        "authorUid",
        "createdAtMillis",
        "updatedAtMillis",
        "revision"
      ],
      "properties": {
        "noteId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "body": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "authorUid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "createdAtMillis": {
          "type": "integer",
          "minimum": 0
        },
        "updatedAtMillis": {
          "type": "integer",
          "minimum": 0
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      }
    },
    "send": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "campaignId",
            "name",
            "messageClass",
            "deliveryStatus",
            "createdAtMillis",
            "sentAtMillis",
            "updatedAtMillis"
          ],
          "properties": {
            "kind": {
              "const": "campaign"
            },
            "campaignId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "messageClass": {
              "type": "string",
              "enum": [
                "eventFollowUp",
                "organizerUpdate",
                "organizerPromotion"
              ]
            },
            "deliveryStatus": {
              "type": "string",
              "enum": [
                "pending",
                "sending",
                "suppressed",
                "accepted",
                "sent",
                "delivered",
                "read",
                "failed",
                "replied",
                "optedOut"
              ]
            },
            "createdAtMillis": {
              "type": "integer",
              "minimum": 0
            },
            "sentAtMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0
            },
            "updatedAtMillis": {
              "type": "integer",
              "minimum": 0
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "kind",
            "broadcastId",
            "eventId",
            "eventName",
            "audience",
            "deliveryStatus",
            "sentAtMillis",
            "partialFailure"
          ],
          "properties": {
            "kind": {
              "const": "announcement"
            },
            "broadcastId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "eventName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "audience": {
              "type": "string",
              "enum": [
                "booked",
                "prospective",
                "everyone"
              ]
            },
            "deliveryStatus": {
              "type": "string",
              "enum": [
                "available",
                "failed"
              ]
            },
            "sentAtMillis": {
              "type": "integer",
              "minimum": 0
            },
            "partialFailure": {
              "type": "boolean"
            }
          }
        }
      ]
    },
    "campaignSend": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "campaignId",
        "name",
        "messageClass",
        "deliveryStatus",
        "createdAtMillis",
        "sentAtMillis",
        "updatedAtMillis"
      ],
      "properties": {
        "kind": {
          "const": "campaign"
        },
        "campaignId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "messageClass": {
          "type": "string",
          "enum": [
            "eventFollowUp",
            "organizerUpdate",
            "organizerPromotion"
          ]
        },
        "deliveryStatus": {
          "type": "string",
          "enum": [
            "pending",
            "sending",
            "suppressed",
            "accepted",
            "sent",
            "delivered",
            "read",
            "failed",
            "replied",
            "optedOut"
          ]
        },
        "createdAtMillis": {
          "type": "integer",
          "minimum": 0
        },
        "sentAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "updatedAtMillis": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "announcementSend": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "broadcastId",
        "eventId",
        "eventName",
        "audience",
        "deliveryStatus",
        "sentAtMillis",
        "partialFailure"
      ],
      "properties": {
        "kind": {
          "const": "announcement"
        },
        "broadcastId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "eventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "eventName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "audience": {
          "type": "string",
          "enum": [
            "booked",
            "prospective",
            "everyone"
          ]
        },
        "deliveryStatus": {
          "type": "string",
          "enum": [
            "available",
            "failed"
          ]
        },
        "sentAtMillis": {
          "type": "integer",
          "minimum": 0
        },
        "partialFailure": {
          "type": "boolean"
        }
      }
    },
    "revenue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "coverage",
        "amounts"
      ],
      "properties": {
        "coverage": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "unavailable"
          ]
        },
        "amounts": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "currency",
              "amountMinor",
              "factCount",
              "sources"
            ],
            "properties": {
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "factCount": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              },
              "sources": {
                "type": "array",
                "maxItems": 4,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "source",
                    "amountMinor",
                    "factCount"
                  ],
                  "properties": {
                    "source": {
                      "type": "string",
                      "enum": [
                        "catchPayment",
                        "hostImport",
                        "hostEstimate",
                        "providerOrder",
                        "hostAttested"
                      ]
                    },
                    "amountMinor": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "factCount": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 1000000
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "revenueAmount": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "currency",
        "amountMinor",
        "factCount",
        "sources"
      ],
      "properties": {
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "factCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "sources": {
          "type": "array",
          "maxItems": 4,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "source",
              "amountMinor",
              "factCount"
            ],
            "properties": {
              "source": {
                "type": "string",
                "enum": [
                  "catchPayment",
                  "hostImport",
                  "hostEstimate",
                  "providerOrder",
                  "hostAttested"
                ]
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "factCount": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              }
            }
          }
        }
      }
    },
    "revenueSourceAmount": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "source",
        "amountMinor",
        "factCount"
      ],
      "properties": {
        "source": {
          "type": "string",
          "enum": [
            "catchPayment",
            "hostImport",
            "hostEstimate",
            "providerOrder",
            "hostAttested"
          ]
        },
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "factCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        }
      }
    },
    "traits": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "expectedEventCount",
        "attendedEventCount",
        "cancelledEventCount",
        "noShowCount",
        "importedEventCount",
        "attendanceRate",
        "segmentIds",
        "whatsappStatus",
        "smsStatus",
        "sourceCoverage"
      ],
      "properties": {
        "expectedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "attendedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "cancelledEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "noShowCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "importedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "attendanceRate": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0,
          "maximum": 1
        },
        "segmentIds": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 16,
          "items": {
            "type": "string",
            "enum": [
              "new_to_organizer",
              "past_attendee",
              "first_time_attendee",
              "repeat_attendee",
              "regular",
              "lapsed_regular",
              "reliable_attendee",
              "needs_confirmation",
              "advocate",
              "high_impact_advocate",
              "whatsapp_reachable",
              "sms_reachable",
              "active_member",
              "lapsed_member",
              "member_no_recent_attendance",
              "frequent_non_member"
            ]
          }
        },
        "whatsappStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "smsStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "sourceCoverage": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "insufficientData"
          ]
        },
        "membership": {
          "description": "CRM projection of one contact's paid membership with the organizer, through the contact's linked account.",
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "required": [
            "planId",
            "planName",
            "status",
            "memberSinceMillis",
            "entitled"
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
            "memberSinceMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "entitled": {
              "type": "boolean"
            }
          }
        }
      }
    },
    "event": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventId",
        "attendeeId",
        "displayName",
        "eventOriginMode",
        "eventProvider",
        "source",
        "status",
        "expected",
        "registered",
        "cancelled",
        "checkedIn",
        "eventStartAtMillis",
        "eventEndAtMillis",
        "registeredAtMillis",
        "cancelledAtMillis",
        "checkedInAtMillis",
        "revenues"
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
        "displayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "eventOriginMode": {
          "type": "string",
          "enum": [
            "catchNative",
            "externalCompanion",
            "unknown"
          ]
        },
        "eventProvider": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "catch",
            "generic",
            "luma",
            "eventbrite",
            "partiful",
            "posh",
            "bookmyshow",
            "district",
            "sortmyscene",
            "airbnb",
            null
          ]
        },
        "source": {
          "type": "string",
          "enum": [
            "catchBooking",
            "hostImport",
            "hostManual",
            "webOtp",
            "providerSync"
          ]
        },
        "status": {
          "type": "string",
          "enum": [
            "invited",
            "registered",
            "waitlisted",
            "checkedIn",
            "cancelled"
          ]
        },
        "expected": {
          "type": "boolean"
        },
        "registered": {
          "type": "boolean"
        },
        "cancelled": {
          "type": "boolean"
        },
        "checkedIn": {
          "type": "boolean"
        },
        "eventStartAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "eventEndAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "registeredAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "cancelledAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "checkedInAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "revenues": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "currency",
              "amountMinor",
              "source",
              "factCount",
              "allocation"
            ],
            "properties": {
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "source": {
                "type": "string",
                "enum": [
                  "catchPayment",
                  "hostImport",
                  "hostEstimate",
                  "providerOrder",
                  "hostAttested"
                ]
              },
              "factCount": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000000
              },
              "allocation": {
                "type": "string",
                "enum": [
                  "perAttendee",
                  "sharedOrder"
                ]
              }
            }
          }
        }
      }
    },
    "eventRevenue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "currency",
        "amountMinor",
        "source",
        "factCount",
        "allocation"
      ],
      "properties": {
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "source": {
          "type": "string",
          "enum": [
            "catchPayment",
            "hostImport",
            "hostEstimate",
            "providerOrder",
            "hostAttested"
          ]
        },
        "factCount": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000000
        },
        "allocation": {
          "type": "string",
          "enum": [
            "perAttendee",
            "sharedOrder"
          ]
        }
      }
    }
  }
} as const;
