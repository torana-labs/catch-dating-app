/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerClaimVerificationDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_claim_verifications.schema.json",
  "title": "OrganizerClaimVerificationDocument",
  "description": "One signed-in user's attempt to prove they run an organizer listing, stored at organizerClaimVerifications/{attemptId}. The requester reads their own attempt to show its code and to follow its status; a verified attempt records the evidence and the claim request it approved.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerClaimVerifications",
  "x-firestore-path": "organizerClaimVerifications/{attemptId}",
  "x-document-id-field": "attemptId",
  "x-owner": "startOrganizerClaimVerification callable and instagramClaimWebhook",
  "required": [
    "attemptId",
    "organizerId",
    "requesterUid",
    "method",
    "status",
    "code",
    "proofTarget",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "verifiedAt",
    "claimRequestId",
    "evidence",
    "lastRejection"
  ],
  "properties": {
    "attemptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "requesterUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "method": {
      "description": "instagramMessage: the organiser sends the code to Catch's Instagram account from the listing's handle. lumaDescription: the organiser puts the code in the listing's Luma calendar description.",
      "type": "string",
      "enum": [
        "instagramMessage",
        "lumaDescription"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "description": "awaitingProof until the proof arrives. An attempt still awaitingProof after expiresAt has expired; readers treat it so.",
      "type": "string",
      "enum": [
        "awaitingProof",
        "verified",
        "expired",
        "superseded"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "code": {
      "description": "The one-time code the requester shows the proof surface. Only the requester and the server can read it.",
      "type": "string",
      "pattern": "^[0-9]{6}$",
      "x-catch-ownership": "callable-owned"
    },
    "proofTarget": {
      "description": "Where the proof must come from: the listing's Instagram username without @, or its Luma calendar URL.",
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
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
      },
      "x-catch-ownership": "callable-owned"
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "expiresAt": {
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "verifiedAt": {
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
      ],
      "x-catch-ownership": "callable-owned"
    },
    "claimRequestId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "evidence": {
      "description": "What proved the claim. Null until verified.",
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "source",
            "observedIdentity",
            "messageKey",
            "observedAt"
          ],
          "properties": {
            "source": {
              "type": "string",
              "enum": [
                "instagramMessage",
                "lumaDescription"
              ]
            },
            "observedIdentity": {
              "description": "The Instagram username Graph API returned for the sender, or the Luma calendar URL that showed the code.",
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "messageKey": {
              "description": "SHA-256 of the Instagram message id. Null for Luma.",
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[a-f0-9]{64}$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "observedAt": {
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
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "lastRejection": {
      "description": "The latest proof that arrived and did not verify, so the claim page can say what to fix.",
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "reason",
            "at"
          ],
          "properties": {
            "reason": {
              "type": "string",
              "enum": [
                "wrongSender",
                "codeNotFound"
              ]
            },
            "at": {
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
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
