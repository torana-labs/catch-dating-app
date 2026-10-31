/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventRuntimeParticipantDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_runtime_participants.schema.json",
  "title": "EventRuntimeParticipantDocument",
  "description": "Participant-private runtime identity stored at eventRuntimeParticipants/{eventId_uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventRuntimeParticipants",
  "x-firestore-path": "eventRuntimeParticipants/{participantId}",
  "x-document-id-field": "id",
  "x-owner": "runtime claim/profile callables; owner get only; no client writes or list access",
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "eventAttendeeId",
    "identityVersion",
    "claimMethod",
    "accessStatus",
    "requiredFieldIds",
    "completedFieldIds",
    "runtimeProfile",
    "consents",
    "claimedAt",
    "readyAt",
    "revokedAt",
    "createdAt",
    "updatedAt"
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
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "eventAttendeeId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "identityVersion": {
      "type": "integer",
      "const": 1
    },
    "claimMethod": {
      "type": "string",
      "enum": [
        "verifiedPhone",
        "signedAttendeeToken",
        "verifiedEmail",
        "hostApproval",
        "catchParticipation"
      ]
    },
    "accessStatus": {
      "type": "string",
      "enum": [
        "pendingApproval",
        "needsInput",
        "ready",
        "optedOut",
        "revoked"
      ]
    },
    "requiredFieldIds": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 10,
      "items": {
        "type": "string",
        "enum": [
          "displayName",
          "gender",
          "interestedInGenders",
          "relationshipGoal",
          "dateOfBirth",
          "paceBand",
          "skillBand",
          "dietaryAndSeatingNotes",
          "questionnaireAnswerIds",
          "teamName"
        ]
      }
    },
    "completedFieldIds": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 10,
      "items": {
        "type": "string",
        "enum": [
          "displayName",
          "gender",
          "interestedInGenders",
          "relationshipGoal",
          "dateOfBirth",
          "paceBand",
          "skillBand",
          "dietaryAndSeatingNotes",
          "questionnaireAnswerIds",
          "teamName"
        ]
      }
    },
    "profileRevision": {
      "description": "Monotonic accepted runtime-profile submission revision. Legacy documents omit it and read as zero.",
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "runtimeProfile": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "displayName",
        "gender",
        "interestedInGenders",
        "relationshipGoal",
        "dateOfBirth",
        "paceBand",
        "skillBand",
        "dietaryAndSeatingNotes",
        "questionnaireAnswerIds",
        "teamName"
      ],
      "properties": {
        "displayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "gender": {
          "anyOf": [
            {
              "type": "string",
              "enum": [
                "man",
                "woman",
                "nonBinary",
                "other"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "interestedInGenders": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 4,
          "items": {
            "type": "string",
            "enum": [
              "man",
              "woman",
              "nonBinary",
              "other"
            ]
          }
        },
        "relationshipGoal": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "relationship",
            "casual",
            "marriage",
            "friendship",
            "unsure",
            null
          ]
        },
        "dateOfBirth": {
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
        "paceBand": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "competitive",
            "fast",
            "moderate",
            "easy",
            null
          ]
        },
        "skillBand": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "beginner",
            "intermediate",
            "advanced",
            null
          ]
        },
        "dietaryAndSeatingNotes": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 300
        },
        "questionnaireAnswerIds": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 8,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          }
        },
        "teamName": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 80
        }
      }
    },
    "consents": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "runtimeTermsVersion",
        "sensitiveDataTermsVersion",
        "saveAsCatchPrefill"
      ],
      "properties": {
        "runtimeTermsVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "sensitiveDataTermsVersion": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "saveAsCatchPrefill": {
          "type": "boolean"
        }
      }
    },
    "claimedAt": {
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
    "readyAt": {
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
    "revokedAt": {
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
    }
  }
} as const;
