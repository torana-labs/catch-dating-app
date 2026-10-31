/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessScorecardDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_scorecards.schema.json",
  "title": "EventSuccessScorecardDocument",
  "description": "Server-owned aggregate event coaching metrics stored at eventSuccessScorecards/{eventId}. Raw attendee feedback remains private.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessScorecards",
  "x-firestore-path": "eventSuccessScorecards/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "event success feedback and matching triggers",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "eventId",
    "organizerId",
    "bookedCount",
    "checkedInCount",
    "feedbackCount",
    "attendeesWhoMetTwoPlusPeople",
    "catchSentCount",
    "attendeesWhoCaughtSomeone",
    "catchRecipientCount",
    "catchRate",
    "mutualMatchCount",
    "chatStartedCount",
    "averageWelcomeRating",
    "averageStructureRating",
    "safetyIncidentCount",
    "funnel",
    "updatedAt"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "trigger-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "trigger-owned"
    },
    "bookedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "checkedInCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "feedbackCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "attendeesWhoMetTwoPlusPeople": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "catchSentCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "attendeesWhoCaughtSomeone": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "catchRecipientCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "catchRate": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "x-catch-ownership": "trigger-owned"
    },
    "mutualMatchCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "chatStartedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "averageWelcomeRating": {
      "type": "number",
      "minimum": 0,
      "maximum": 5,
      "x-catch-ownership": "trigger-owned"
    },
    "averageStructureRating": {
      "type": "number",
      "minimum": 0,
      "maximum": 5,
      "x-catch-ownership": "trigger-owned"
    },
    "safetyIncidentCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "conversationGraph": {
      "type": "object",
      "additionalProperties": false,
      "description": "Host-visible aggregate conversation outcomes. Person-to-person edges remain in attendee-private documents.",
      "required": [
        "responseCount",
        "skippedCount",
        "conversationCount",
        "attendeesWithTwoPlusConversations",
        "excludedAttendeeCount",
        "assignedConversationCount",
        "assignedOpportunityCount"
      ],
      "properties": {
        "responseCount": {
          "type": "integer",
          "minimum": 0
        },
        "skippedCount": {
          "type": "integer",
          "minimum": 0
        },
        "conversationCount": {
          "type": "integer",
          "minimum": 0
        },
        "attendeesWithTwoPlusConversations": {
          "type": "integer",
          "minimum": 0
        },
        "excludedAttendeeCount": {
          "type": "integer",
          "minimum": 0
        },
        "assignedConversationCount": {
          "type": "integer",
          "minimum": 0
        },
        "assignedOpportunityCount": {
          "type": "integer",
          "minimum": 0
        }
      },
      "x-catch-ownership": "trigger-owned"
    },
    "funnel": {
      "type": "object",
      "additionalProperties": false,
      "description": "Host-visible operating funnel from acquisition through connection. Counts are aggregate-only and rebuilt from canonical documents.",
      "required": [
        "inviteLinkCount",
        "inviteOpenCount",
        "totalDemandCount",
        "requestCount",
        "pendingRequestCount",
        "approvedRequestCount",
        "declinedRequestCount",
        "directSignupCount",
        "waitlistJoinCount",
        "waitlistOfferCount",
        "waitlistOfferActiveCount",
        "waitlistOfferAcceptedCount",
        "waitlistOfferDeclinedCount",
        "waitlistOfferExpiredCount",
        "checkoutStartedCount",
        "paymentPendingCount",
        "paymentCompletedCount",
        "paymentFailedCount",
        "paymentRefundedCount",
        "bookedCount",
        "checkedInCount",
        "noShowCount",
        "catchSentCount",
        "attendeesWhoCaughtSomeone",
        "mutualMatchCount",
        "chatStartedCount",
        "repeatAttendeeCount"
      ],
      "properties": {
        "inviteLinkCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "inviteOpenCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "totalDemandCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "requestCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "pendingRequestCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "approvedRequestCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "declinedRequestCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "directSignupCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistJoinCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistOfferCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistOfferActiveCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistOfferAcceptedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistOfferDeclinedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "waitlistOfferExpiredCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "checkoutStartedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "paymentPendingCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "paymentCompletedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "paymentFailedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "paymentRefundedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "bookedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "checkedInCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "noShowCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "catchSentCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "attendeesWhoCaughtSomeone": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "mutualMatchCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "chatStartedCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        },
        "repeatAttendeeCount": {
          "type": "integer",
          "minimum": 0,
          "x-catch-ownership": "trigger-owned"
        }
      },
      "x-catch-ownership": "trigger-owned"
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
      "x-catch-ownership": "trigger-owned"
    },
    "synthetic": {
      "type": "boolean",
      "description": "Internal demo seed marker used for cleanup and diagnostics."
    },
    "seedPrefix": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed prefix used for cleanup and diagnostics."
    },
    "scenario": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed scenario name used for cleanup and diagnostics."
    },
    "demoOps": {
      "type": "boolean",
      "description": "Internal demo-operations marker used for cleanup and diagnostics."
    },
    "demoOpsId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "description": "Internal demo-operations id used for cleanup and diagnostics."
    },
    "demoOpsCommand": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "description": "Internal demo-operations command name used for cleanup and diagnostics."
    }
  }
} as const;
