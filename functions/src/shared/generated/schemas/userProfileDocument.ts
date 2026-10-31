/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const userProfileDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/users.schema.json",
  "title": "UserProfileDocument",
  "description": "Canonical private profile document stored at users/{uid}. The uid is the document id and is not stored in document data.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "users",
  "x-firestore-path": "users/{uid}",
  "x-document-id-field": "uid",
  "x-owner": "owner initial create, callable-owned profile edits, server-owned projections",
  "required": [
    "name",
    "firstName",
    "lastName",
    "displayName",
    "phoneNumber",
    "profileComplete",
    "email",
    "profilePrompts",
    "profilePhotos",
    "interestedInGenders",
    "minAgePreference",
    "maxAgePreference",
    "languages",
    "activityPreferences",
    "prefsNewCatches",
    "prefsMessages",
    "prefsEventReminders",
    "prefsRunStatusUpdates",
    "prefsOrganizerUpdates",
    "prefsWeeklyDigest",
    "prefsShowOnMap"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "client-writable"
    },
    "firstName": {
      "type": "string",
      "maxLength": 80,
      "x-catch-ownership": "client-writable"
    },
    "lastName": {
      "type": "string",
      "maxLength": 80,
      "x-catch-ownership": "client-writable"
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "pattern": ".*\\S.*",
      "x-catch-ownership": "client-writable"
    },
    "dateOfBirth": {
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
      "x-catch-ownership": "client-writable"
    },
    "gender": {
      "type": "string",
      "enum": [
        "man",
        "woman",
        "nonBinary",
        "other"
      ],
      "x-catch-ownership": "client-writable"
    },
    "phoneNumber": {
      "type": "string",
      "minLength": 1,
      "maxLength": 32,
      "x-catch-ownership": "client-writable"
    },
    "countryCode": {
      "type": "string",
      "pattern": "^\\+\\d{1,4}$",
      "x-catch-ownership": "client-writable"
    },
    "profileRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "profileClaimedAt": {
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
      "x-catch-ownership": "server-only"
    },
    "profileComplete": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      },
      "x-catch-ownership": "client-writable"
    },
    "profilePhotos": {
      "type": "array",
      "maxItems": 6,
      "items": {
        "title": "ProfilePhoto",
        "description": "Future canonical profile-photo object that groups display URLs, Firebase Storage object paths, prompt metadata, moderation state, order, and lifecycle timestamps.",
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
              }
            }
          },
          "position": {
            "type": "integer",
            "minimum": 0,
            "maximum": 11
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
        },
        "definitions": {
          "storageObjectPath": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512,
            "pattern": "^[^/\\u0000][^\\u0000]*$"
          }
        },
        "x-storage-metadata": true,
        "x-future-field": "profilePhotos",
        "x-migration-contract": "../migrations/profile_photos_storage.json"
      },
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
    },
    "latitude": {
      "type": [
        "number",
        "null"
      ],
      "minimum": -90,
      "maximum": 90,
      "x-catch-ownership": "client-writable"
    },
    "longitude": {
      "type": [
        "number",
        "null"
      ],
      "minimum": -180,
      "maximum": 180,
      "x-catch-ownership": "client-writable"
    },
    "interestedInGenders": {
      "type": "array",
      "minItems": 0,
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
      },
      "x-catch-ownership": "client-writable"
    },
    "minAgePreference": {
      "type": "integer",
      "minimum": 18,
      "maximum": 99,
      "x-catch-ownership": "client-writable"
    },
    "maxAgePreference": {
      "type": "integer",
      "minimum": 18,
      "maximum": 99,
      "x-catch-ownership": "client-writable"
    },
    "height": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 120,
      "maximum": 220,
      "x-catch-ownership": "client-writable"
    },
    "occupation": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "client-writable"
    },
    "company": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      },
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      ],
      "x-catch-ownership": "client-writable"
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
      },
      "x-catch-ownership": "client-writable"
    },
    "prefsNewCatches": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsMessages": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsEventReminders": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsRunStatusUpdates": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsOrganizerUpdates": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsWeeklyDigest": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsShowOnMap": {
      "type": "boolean",
      "x-catch-ownership": "client-writable"
    },
    "prefsShowInCrossPaths": {
      "type": "boolean",
      "description": "Private global consent gate for Cross Paths. Missing values resolve to false and this field must never be copied to publicProfiles.",
      "x-catch-ownership": "client-writable"
    },
    "prefsCrossPathsInvitations": {
      "type": "boolean",
      "description": "Opt-in push preference for Cross Paths invitations. Missing values resolve to false; durable Activity items are still written.",
      "x-catch-ownership": "client-writable"
    },
    "fcmToken": {
      "type": "string",
      "x-catch-ownership": "client-runtime-writable"
    },
    "deleted": {
      "type": "boolean",
      "x-catch-ownership": "server-only"
    },
    "deletedAt": {
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
      "x-catch-ownership": "server-only"
    }
  },
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "x-legacy-tolerated-fields": [
    "bio"
  ],
  "x-denormalized-to": [
    "publicProfiles/{uid}"
  ]
} as const;
