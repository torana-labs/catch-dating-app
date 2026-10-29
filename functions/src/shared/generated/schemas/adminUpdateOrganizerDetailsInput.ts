/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminUpdateOrganizerDetailsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_update_organizer_details_payload.schema.json",
  "title": "AdminUpdateOrganizerDetailsCallablePayload",
  "description": "Callable payload accepted by adminUpdateOrganizerDetails. This edits owner-safe organizer listing fields through an audited admin callable.",
  "x-callable-shape": "patch",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "fields"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "fields": {
      "type": "object",
      "additionalProperties": false,
      "minProperties": 1,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "location": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
        },
        "area": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "tags": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          }
        },
        "instagramHandle": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 320
        },
        "phoneNumber": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 320
        },
        "email": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 320
        },
        "imageUrl": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri",
              "maxLength": 2048
            },
            {
              "type": "null"
            }
          ]
        },
        "profileImageUrl": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri",
              "maxLength": 2048
            },
            {
              "type": "null"
            }
          ]
        },
        "organizerType": {
          "type": "string",
          "enum": [
            "club",
            "community",
            "individual",
            "eventProducer",
            "venue",
            "brand"
          ],
          "description": "Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration."
        },
        "publicCategoryLabel": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "entityKind": {
          "type": "string",
          "enum": [
            "club",
            "venue",
            "eventOrganizer",
            "creatorCommunity",
            "brand"
          ]
        },
        "entitySubtypes": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          }
        },
        "displayCategory": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "cityName": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "regionName": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "countryCode": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^[A-Z]{2}$"
        },
        "countryName": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "appVisibility": {
          "type": "string",
          "enum": [
            "discoverable",
            "hidden"
          ]
        },
        "publicPage": {
          "type": "object",
          "additionalProperties": false,
          "minProperties": 1,
          "properties": {
            "slug": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160,
              "pattern": "^[a-z0-9-]+$"
            },
            "citySlug": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 80,
              "pattern": "^[a-z0-9-]+$"
            },
            "canonicalPath": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "publishStatus": {
              "type": "string",
              "enum": [
                "draft",
                "qa",
                "published",
                "suppressed",
                "removed"
              ]
            },
            "seoTitle": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 120
            },
            "seoDescription": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 320
            }
          }
        },
        "provenance": {
          "type": "object",
          "additionalProperties": false,
          "minProperties": 1,
          "properties": {
            "sourceConfidence": {
              "type": "string",
              "enum": [
                "seedOnly",
                "low",
                "medium",
                "high",
                "ownerVerified"
              ]
            },
            "verificationStatus": {
              "type": "string",
              "enum": [
                "unverified",
                "sourceBacked",
                "ownerVerified"
              ]
            }
          }
        },
        "ownerLinks": {
          "type": "array",
          "maxItems": 20,
          "description": "Replaces the organizer page links, in display order. An empty array removes them.",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "description": "An owner link as an admin edit sends it. showUntil is an ISO date-time; the server checks the URL against the owner-link policy before saving.",
            "required": [
              "id",
              "label",
              "subtitle",
              "url",
              "icon",
              "pinned",
              "showUntil"
            ],
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "subtitle": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1,
                "maxLength": 80
              },
              "url": {
                "type": "string",
                "format": "uri",
                "maxLength": 4096,
                "pattern": "^https://"
              },
              "icon": {
                "type": [
                  "string",
                  "null"
                ],
                "enum": [
                  "link",
                  "website",
                  "community",
                  "social",
                  "tickets",
                  "calendar",
                  "shop",
                  "partner",
                  "video",
                  "route",
                  null
                ],
                "description": "What an owner link is for, which picks its icon. Null lets the page infer one from the URL."
              },
              "pinned": {
                "type": "boolean"
              },
              "showUntil": {
                "type": [
                  "string",
                  "null"
                ],
                "format": "date-time"
              }
            }
          }
        },
        "publicProfile": {
          "type": "object",
          "additionalProperties": false,
          "minProperties": 1,
          "properties": {
            "headline": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 160
            },
            "summary": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 800
            },
            "sourceSummary": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 800
            },
            "formats": {
              "type": "array",
              "maxItems": 12,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              }
            }
          }
        }
      }
    },
    "reviewNote": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 1000
    }
  }
} as const;
