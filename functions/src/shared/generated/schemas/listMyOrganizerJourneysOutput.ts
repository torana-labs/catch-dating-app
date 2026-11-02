/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listMyOrganizerJourneysCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/list_my_organizer_journeys_response.schema.json",
  "title": "ListMyOrganizerJourneysCallableResponse",
  "description": "How a page got here, as its organizer sees it. Staff names, who nominated it, recommendations and decision reasons stay with Catch's staff, and someone else's claim is left out.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "journeys"
  ],
  "properties": {
    "journeys": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "organizerName",
          "waitingClaim",
          "steps",
          "next"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "organizerName": {
            "type": "string",
            "maxLength": 300
          },
          "waitingClaim": {
            "type": "boolean",
            "description": "The caller's own claim is still being checked."
          },
          "steps": {
            "type": "array",
            "maxItems": 40,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "kind",
                "atMillis",
                "detail"
              ],
              "properties": {
                "kind": {
                  "enum": [
                    "nominated",
                    "listed",
                    "claimRequested",
                    "claimRejected",
                    "claimed",
                    "firstEvent",
                    "firstPaidBooking"
                  ]
                },
                "atMillis": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "detail": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 500,
                  "description": "nominated: the link the page was built from. firstEvent: the event's name."
                }
              }
            }
          },
          "next": {
            "enum": [
              "runYourPage",
              "firstEvent",
              null
            ],
            "description": "What comes next; null once the organizer has run an event."
          }
        }
      }
    }
  }
} as const;
