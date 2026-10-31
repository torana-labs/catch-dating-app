/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const updateUserProfileCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/patches/update_user_profile.schema.json",
  "title": "UpdateUserProfileCallablePayload",
  "description": "Callable request body for updateUserProfile. Values are normalized before Firestore writes.",
  "x-callable-shape": "patch",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "fields"
  ],
  "properties": {
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
        "displayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "pattern": ".*\\S.*"
        },
        "email": {
          "anyOf": [
            {
              "const": ""
            },
            {
              "type": "string",
              "format": "email",
              "maxLength": 320
            }
          ]
        },
        "instagramHandle": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 30,
              "pattern": "^[A-Za-z0-9._]{1,30}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "profilePrompts": {
          "type": "array",
          "maxItems": 3,
          "items": {
            "title": "ProfilePromptAnswer",
            "description": "One structured written profile prompt answer stored on users and publicProfiles.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "promptId",
              "prompt",
              "answer"
            ],
            "properties": {
              "promptId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "prompt": {
                "type": "string",
                "minLength": 1,
                "maxLength": 140
              },
              "answer": {
                "type": "string",
                "maxLength": 300
              }
            },
            "x-catch-catalog": "../catalogs/profile_prompts.json"
          }
        },
        "dateOfBirth": {
          "type": "integer",
          "minimum": 0,
          "description": "Milliseconds since epoch before conversion to Firestore Timestamp."
        },
        "gender": {
          "type": "string",
          "enum": [
            "man",
            "woman",
            "nonBinary",
            "other"
          ]
        },
        "profileComplete": {
          "type": "boolean"
        },
        "profilePhotos": {
          "type": "array",
          "maxItems": 6,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "url",
              "thumbnailUrl",
              "storagePath",
              "thumbnailStoragePath",
              "position",
              "createdAt",
              "updatedAt"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80,
                "pattern": "^[A-Za-z0-9_-]+$"
              },
              "url": {
                "type": "string",
                "format": "uri",
                "maxLength": 2048
              },
              "thumbnailUrl": {
                "type": "string",
                "format": "uri",
                "maxLength": 2048
              },
              "storagePath": {
                "type": "string",
                "minLength": 1,
                "maxLength": 512,
                "pattern": "^[^/\\u0000][^\\u0000]*$"
              },
              "thumbnailStoragePath": {
                "type": "string",
                "minLength": 1,
                "maxLength": 512,
                "pattern": "^[^/\\u0000][^\\u0000]*$"
              },
              "prompt": {
                "anyOf": [
                  {
                    "title": "PhotoPromptAnswer",
                    "description": "One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.",
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "photoIndex",
                      "promptId",
                      "prompt"
                    ],
                    "properties": {
                      "photoIndex": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5
                      },
                      "promptId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 80
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 140
                      },
                      "caption": {
                        "type": "string",
                        "maxLength": 140,
                        "deprecated": true,
                        "description": "Legacy user-entered caption retained for compatibility with older documents."
                      }
                    },
                    "x-catch-catalog": "../catalogs/photo_prompts.json"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "moderation": {
                "type": [
                  "object",
                  "null"
                ],
                "additionalProperties": false,
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "pending",
                      "approved",
                      "rejected"
                    ]
                  },
                  "reason": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 240
                  },
                  "reviewedAt": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 0
                  }
                }
              },
              "position": {
                "type": "integer",
                "minimum": 0,
                "maximum": 11
              },
              "createdAt": {
                "type": "integer",
                "minimum": 0
              },
              "updatedAt": {
                "type": "integer",
                "minimum": 0
              }
            }
          }
        },
        "city": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 120,
              "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
            },
            {
              "type": "null"
            }
          ]
        },
        "latitude": {
          "type": [
            "number",
            "null"
          ],
          "minimum": -90,
          "maximum": 90
        },
        "longitude": {
          "type": [
            "number",
            "null"
          ],
          "minimum": -180,
          "maximum": 180
        },
        "interestedInGenders": {
          "type": "array",
          "minItems": 1,
          "maxItems": 8,
          "uniqueItems": true,
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
        "minAgePreference": {
          "type": "integer",
          "minimum": 18,
          "maximum": 99
        },
        "maxAgePreference": {
          "type": "integer",
          "minimum": 18,
          "maximum": 99
        },
        "height": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 120,
          "maximum": 220
        },
        "occupation": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "company": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "education": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "highSchool",
            "someCollege",
            "bachelors",
            "masters",
            "phd",
            "tradeSchool",
            "other",
            null
          ]
        },
        "religion": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "hindu",
            "muslim",
            "christian",
            "sikh",
            "jain",
            "buddhist",
            "other",
            "nonReligious",
            null
          ]
        },
        "languages": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "english",
              "hindi",
              "marathi",
              "tamil",
              "telugu",
              "kannada",
              "bengali",
              "gujarati",
              "punjabi",
              "malayalam",
              "odia",
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
        "drinking": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "never",
            "socially",
            "often",
            null
          ]
        },
        "smoking": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "never",
            "occasionally",
            "often",
            null
          ]
        },
        "workout": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "never",
            "sometimes",
            "often",
            "everyday",
            null
          ]
        },
        "diet": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "omnivore",
            "vegetarian",
            "vegan",
            "jain",
            "other",
            null
          ]
        },
        "children": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "dontHave",
            "haveWantMore",
            "haveNoMore",
            "wantSomeday",
            "dontWant",
            null
          ]
        },
        "activityPreferences": {
          "title": "ActivityPreferences",
          "description": "Per-activity user preferences. Running is the first migrated activity-specific preference object; other activity kinds can be added without new root profile fields.",
          "type": "object",
          "additionalProperties": false,
          "required": [
            "running"
          ],
          "properties": {
            "running": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "paceMinSecsPerKm",
                "paceMaxSecsPerKm",
                "preferredDistances",
                "runningReasons",
                "preferredRunTimes",
                "version"
              ],
              "properties": {
                "paceMinSecsPerKm": {
                  "type": "integer",
                  "minimum": 1
                },
                "paceMaxSecsPerKm": {
                  "type": "integer",
                  "minimum": 1
                },
                "preferredDistances": {
                  "type": "array",
                  "maxItems": 12,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "fiveK",
                      "tenK",
                      "halfMarathon",
                      "marathon"
                    ]
                  }
                },
                "runningReasons": {
                  "type": "array",
                  "maxItems": 12,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "fitness",
                      "community",
                      "mindfulness",
                      "challenge",
                      "weightLoss",
                      "raceTraining",
                      "social"
                    ]
                  }
                },
                "preferredRunTimes": {
                  "type": "array",
                  "maxItems": 8,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "earlyMorning",
                      "morning",
                      "afternoon",
                      "evening",
                      "night"
                    ]
                  }
                },
                "version": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          }
        },
        "prefsNewCatches": {
          "type": "boolean"
        },
        "prefsMessages": {
          "type": "boolean"
        },
        "prefsEventReminders": {
          "type": "boolean"
        },
        "prefsRunStatusUpdates": {
          "type": "boolean"
        },
        "prefsOrganizerUpdates": {
          "type": "boolean"
        },
        "prefsWeeklyDigest": {
          "type": "boolean"
        },
        "prefsShowOnMap": {
          "type": "boolean"
        },
        "prefsShowInCrossPaths": {
          "type": "boolean"
        },
        "prefsCrossPathsInvitations": {
          "type": "boolean"
        }
      }
    }
  },
  "x-normalization": [
    "trim prompt ids and display prompt titles",
    "collapse stacked blank lines in prompt answers and captions",
    "drop empty prompt answers and empty photo captions",
    "convert dateOfBirth millis to Firestore Timestamp"
  ],
  "x-intentionally-excluded-fields": [
    "firstName",
    "lastName",
    "fcmToken",
    "deleted",
    "deletedAt",
    "sexualOrientation",
    "bio"
  ]
} as const;
