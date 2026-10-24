/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizers.schema.json",
  "title": "OrganizerDocument",
  "description": "Canonical organizer document stored at organizers/{organizerId}. Club is one organizerType, not the parent entity name.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizers",
  "x-firestore-path": "organizers/{organizerId}",
  "x-document-id-field": "id",
  "x-owner": "organizer callables; aggregate projections are trigger-owned",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "name",
    "description",
    "location",
    "locationCityId",
    "locationMarketId",
    "area",
    "hostUserId",
    "hostName",
    "hostAvatarUrl",
    "ownerUserId",
    "hostUserIds",
    "hostProfiles",
    "createdAt",
    "imageUrl",
    "profileImageUrl",
    "tags",
    "organizerPhotos",
    "followerCount",
    "organizerType",
    "rating",
    "reviewCount",
    "nextEventAt",
    "nextEventLabel",
    "instagramHandle",
    "phoneNumber",
    "email",
    "status",
    "archived",
    "archivedAt",
    "archiveReason"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "description": "Member-facing organizer description. May be empty on hidden intake drafts until an operator supplies source-backed copy.",
      "x-catch-ownership": "callable-owned"
    },
    "location": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$",
      "description": "Canonical launch market id. Public URL slugs live under publicPage.citySlug.",
      "x-catch-ownership": "callable-owned"
    },
    "locationCityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$",
      "x-catch-ownership": "callable-owned"
    },
    "locationMarketId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$",
      "x-catch-ownership": "callable-owned"
    },
    "area": {
      "type": "string",
      "maxLength": 120,
      "description": "Verified locality within the canonical market. May be empty when intake evidence establishes only the city.",
      "x-catch-ownership": "callable-owned"
    },
    "hostUserId": {
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
      "description": "Legacy primary host user id. Null for programmatically generated, unclaimed organizer profiles.",
      "x-catch-ownership": "callable-owned"
    },
    "hostName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "description": "Legacy host display projection. Null when the organizer has not been claimed by a Catch user.",
      "x-catch-ownership": "callable-owned"
    },
    "hostAvatarUrl": {
      "anyOf": [
        {
          "type": "string",
          "format": "uri",
          "maxLength": 2048
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "ownerUserId": {
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
      "description": "Canonical owner user id after claim or user-created setup. Null for unclaimed programmatic profiles.",
      "x-catch-ownership": "callable-owned"
    },
    "hostUserIds": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      },
      "x-catch-ownership": "callable-owned"
    },
    "hostProfiles": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "uid",
          "displayName",
          "avatarUrl",
          "role"
        ],
        "properties": {
          "uid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "displayName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "avatarUrl": {
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
          "role": {
            "type": "string",
            "enum": [
              "owner",
              "host"
            ]
          }
        }
      },
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
      ],
      "x-catch-ownership": "callable-owned"
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
      ],
      "x-catch-ownership": "callable-owned"
    },
    "clubPhotos": {
      "type": "array",
      "items": {
        "title": "UploadedPhoto",
        "description": "Canonical uploaded image object for ordered media galleries, logos, and event photos.",
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "url",
          "storagePath",
          "thumbnailUrl",
          "thumbnailStoragePath",
          "position",
          "createdAt",
          "updatedAt"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "pattern": "^[A-Za-z0-9_-]+$"
          },
          "url": {
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
          "thumbnailUrl": {
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
          "thumbnailStoragePath": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512,
                "pattern": "^[^/\\u0000][^\\u0000]*$"
              },
              {
                "type": "null"
              }
            ]
          },
          "position": {
            "type": "integer",
            "minimum": 0
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
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "organizerPhotos": {
      "type": "array",
      "items": {
        "title": "UploadedPhoto",
        "description": "Canonical uploaded image object for ordered media galleries, logos, and event photos.",
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "url",
          "storagePath",
          "thumbnailUrl",
          "thumbnailStoragePath",
          "position",
          "createdAt",
          "updatedAt"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "pattern": "^[A-Za-z0-9_-]+$"
          },
          "url": {
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
          "thumbnailUrl": {
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
          "thumbnailStoragePath": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512,
                "pattern": "^[^/\\u0000][^\\u0000]*$"
              },
              {
                "type": "null"
              }
            ]
          },
          "position": {
            "type": "integer",
            "minimum": 0
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
        }
      },
      "description": "Canonical organizer gallery. clubPhotos is tolerated only while released clients migrate.",
      "x-catch-ownership": "callable-owned"
    },
    "logoPhoto": {
      "anyOf": [
        {
          "title": "UploadedPhoto",
          "description": "Canonical uploaded image object for ordered media galleries, logos, and event photos.",
          "type": "object",
          "additionalProperties": false,
          "required": [
            "id",
            "url",
            "storagePath",
            "thumbnailUrl",
            "thumbnailStoragePath",
            "position",
            "createdAt",
            "updatedAt"
          ],
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120,
              "pattern": "^[A-Za-z0-9_-]+$"
            },
            "url": {
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
            "thumbnailUrl": {
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
            "thumbnailStoragePath": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 512,
                  "pattern": "^[^/\\u0000][^\\u0000]*$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "position": {
              "type": "integer",
              "minimum": 0
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
          }
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "tags": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "x-catch-ownership": "callable-owned"
    },
    "memberCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "followerCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Canonical active organizer follower count.",
      "x-catch-ownership": "trigger-owned"
    },
    "rating": {
      "type": "number",
      "minimum": 0,
      "maximum": 5,
      "x-catch-ownership": "trigger-owned"
    },
    "reviewCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "verifiedReviewCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Published reviews that are verified (attended a Catch event). Only these back the headline rating; unverified public reviews cannot move the score.",
      "x-catch-ownership": "trigger-owned"
    },
    "nextEventAt": {
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
      "x-catch-ownership": "trigger-owned"
    },
    "nextEventLabel": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240,
      "x-catch-ownership": "trigger-owned"
    },
    "instagramHandle": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 320,
      "x-catch-ownership": "callable-owned"
    },
    "phoneNumber": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 320,
      "x-catch-ownership": "callable-owned"
    },
    "email": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 320,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "archived"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "archived": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "archivedAt": {
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
    "archiveReason": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500,
      "x-catch-ownership": "callable-owned"
    },
    "hostDefaults": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "primaryActivityKind": {
          "type": "string",
          "enum": [
            "socialRun",
            "running",
            "walking",
            "pickleball",
            "padel",
            "tennis",
            "badminton",
            "cycling",
            "spinClass",
            "yoga",
            "strengthTraining",
            "pubQuiz",
            "barCrawl",
            "dinner",
            "singlesMixer",
            "openActivity"
          ]
        },
        "supportedActivityKinds": {
          "type": "array",
          "maxItems": 16,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "socialRun",
              "running",
              "walking",
              "pickleball",
              "padel",
              "tennis",
              "badminton",
              "cycling",
              "spinClass",
              "yoga",
              "strengthTraining",
              "pubQuiz",
              "barCrawl",
              "dinner",
              "singlesMixer",
              "openActivity"
            ]
          }
        },
        "eventPolicy": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "admissionPreset": {
              "type": "string",
              "enum": [
                "openCapacity",
                "inviteOnly",
                "balancedSingles",
                "fixedCohortCaps"
              ]
            },
            "minAge": {
              "type": "integer",
              "minimum": 0,
              "maximum": 120
            },
            "maxAge": {
              "type": "integer",
              "minimum": 0,
              "maximum": 120
            },
            "maxMen": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0
            },
            "maxWomen": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0
            },
            "dynamicPricingEnabled": {
              "type": "boolean"
            },
            "crossPathsPairCapacity": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100
            },
            "dynamicPricingStepInPaise": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 100000000
            },
            "dynamicPricingMaxInPaise": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 100000000
            },
            "cancellationPolicyId": {
              "type": "string",
              "enum": [
                "flexible",
                "standard",
                "strict"
              ]
            }
          }
        },
        "eventSuccess": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "enabled": {
              "type": "boolean"
            },
            "layoutId": {
              "type": [
                "string",
                "null"
              ],
              "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
            },
            "playbookId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "selectedModuleIds": {
              "type": "array",
              "maxItems": 24,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            },
            "moduleSelectionConfigured": {
              "type": "boolean"
            },
            "structureConfig": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "unitKind",
                "unitSize",
                "revealCountdownSeconds"
              ],
              "properties": {
                "unitKind": {
                  "type": "string",
                  "enum": [
                    "wholeGroup",
                    "pods",
                    "pairs",
                    "teams",
                    "tables"
                  ]
                },
                "unitSize": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 1000
                },
                "unitCount": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1,
                  "maximum": 200
                },
                "rotationIntervalMinutes": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 5,
                  "maximum": 180
                },
                "topology": {
                  "type": "string",
                  "enum": [
                    "set",
                    "sequence",
                    "adjacency"
                  ]
                },
                "resourceCapacity": {
                  "anyOf": [
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "concurrentUnits",
                        "resourceLabelId",
                        "seatsPerUnit"
                      ],
                      "properties": {
                        "concurrentUnits": {
                          "type": [
                            "integer",
                            "null"
                          ],
                          "minimum": 1,
                          "maximum": 200
                        },
                        "resourceLabelId": {
                          "type": "string",
                          "enum": [
                            "court",
                            "table",
                            "lane",
                            "board"
                          ]
                        },
                        "seatsPerUnit": {
                          "type": [
                            "integer",
                            "null"
                          ],
                          "minimum": 1,
                          "maximum": 1000
                        }
                      }
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "revealCountdownSeconds": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 60
                },
                "rotationRepeatStrategy": {
                  "type": "string",
                  "enum": [
                    "avoid",
                    "allowWhenExhausted"
                  ]
                },
                "maxPairMeetings": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 10
                },
                "balanceActivityAttributes": {
                  "type": "array",
                  "maxItems": 8,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "paceBand",
                      "skillBand",
                      "roleBand"
                    ]
                  }
                },
                "clusterActivityAttributes": {
                  "type": "array",
                  "maxItems": 8,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "paceBand",
                      "skillBand",
                      "roleBand"
                    ]
                  }
                }
              },
              "allOf": [
                {
                  "if": {
                    "required": [
                      "resourceCapacity"
                    ],
                    "properties": {
                      "resourceCapacity": {
                        "type": "object",
                        "required": [
                          "seatsPerUnit"
                        ],
                        "properties": {
                          "seatsPerUnit": {
                            "type": "integer"
                          }
                        }
                      }
                    }
                  },
                  "then": {
                    "required": [
                      "topology"
                    ],
                    "properties": {
                      "topology": {
                        "const": "adjacency"
                      }
                    }
                  }
                }
              ]
            },
            "hostGoal": {
              "type": "string",
              "maxLength": 300
            },
            "wingmanRequestsEnabled": {
              "type": "boolean"
            },
            "contextualOpenersEnabled": {
              "type": "boolean"
            },
            "compatibilityAffectsRanking": {
              "type": "boolean"
            },
            "questionnaireConfig": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "templateId"
              ],
              "properties": {
                "templateId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "customTitle": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 80
                },
                "customQuestions": {
                  "type": "array",
                  "maxItems": 8,
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "id",
                      "prompt",
                      "options"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 120
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 140
                      },
                      "options": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 5,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "id",
                            "label"
                          ],
                          "properties": {
                            "id": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 120
                            },
                            "label": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 80
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "attendeePrompt": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 300
            }
          }
        },
        "eventSuccessByActivityKind": {
          "type": "object",
          "maxProperties": 16,
          "additionalProperties": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "enabled": {
                "type": "boolean"
              },
              "layoutId": {
                "type": [
                  "string",
                  "null"
                ],
                "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
              },
              "playbookId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "selectedModuleIds": {
                "type": "array",
                "maxItems": 24,
                "items": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                }
              },
              "moduleSelectionConfigured": {
                "type": "boolean"
              },
              "structureConfig": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "unitKind",
                  "unitSize",
                  "revealCountdownSeconds"
                ],
                "properties": {
                  "unitKind": {
                    "type": "string",
                    "enum": [
                      "wholeGroup",
                      "pods",
                      "pairs",
                      "teams",
                      "tables"
                    ]
                  },
                  "unitSize": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 1000
                  },
                  "unitCount": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 1,
                    "maximum": 200
                  },
                  "rotationIntervalMinutes": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 5,
                    "maximum": 180
                  },
                  "topology": {
                    "type": "string",
                    "enum": [
                      "set",
                      "sequence",
                      "adjacency"
                    ]
                  },
                  "resourceCapacity": {
                    "anyOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "concurrentUnits",
                          "resourceLabelId",
                          "seatsPerUnit"
                        ],
                        "properties": {
                          "concurrentUnits": {
                            "type": [
                              "integer",
                              "null"
                            ],
                            "minimum": 1,
                            "maximum": 200
                          },
                          "resourceLabelId": {
                            "type": "string",
                            "enum": [
                              "court",
                              "table",
                              "lane",
                              "board"
                            ]
                          },
                          "seatsPerUnit": {
                            "type": [
                              "integer",
                              "null"
                            ],
                            "minimum": 1,
                            "maximum": 1000
                          }
                        }
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "revealCountdownSeconds": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 60
                  },
                  "rotationRepeatStrategy": {
                    "type": "string",
                    "enum": [
                      "avoid",
                      "allowWhenExhausted"
                    ]
                  },
                  "maxPairMeetings": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10
                  },
                  "balanceActivityAttributes": {
                    "type": "array",
                    "maxItems": 8,
                    "uniqueItems": true,
                    "items": {
                      "type": "string",
                      "enum": [
                        "paceBand",
                        "skillBand",
                        "roleBand"
                      ]
                    }
                  },
                  "clusterActivityAttributes": {
                    "type": "array",
                    "maxItems": 8,
                    "uniqueItems": true,
                    "items": {
                      "type": "string",
                      "enum": [
                        "paceBand",
                        "skillBand",
                        "roleBand"
                      ]
                    }
                  }
                },
                "allOf": [
                  {
                    "if": {
                      "required": [
                        "resourceCapacity"
                      ],
                      "properties": {
                        "resourceCapacity": {
                          "type": "object",
                          "required": [
                            "seatsPerUnit"
                          ],
                          "properties": {
                            "seatsPerUnit": {
                              "type": "integer"
                            }
                          }
                        }
                      }
                    },
                    "then": {
                      "required": [
                        "topology"
                      ],
                      "properties": {
                        "topology": {
                          "const": "adjacency"
                        }
                      }
                    }
                  }
                ]
              },
              "hostGoal": {
                "type": "string",
                "maxLength": 300
              },
              "wingmanRequestsEnabled": {
                "type": "boolean"
              },
              "contextualOpenersEnabled": {
                "type": "boolean"
              },
              "compatibilityAffectsRanking": {
                "type": "boolean"
              },
              "questionnaireConfig": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "templateId"
                ],
                "properties": {
                  "templateId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  },
                  "customTitle": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 80
                  },
                  "customQuestions": {
                    "type": "array",
                    "maxItems": 8,
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "id",
                        "prompt",
                        "options"
                      ],
                      "properties": {
                        "id": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 120
                        },
                        "prompt": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 140
                        },
                        "options": {
                          "type": "array",
                          "minItems": 2,
                          "maxItems": 5,
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "id",
                              "label"
                            ],
                            "properties": {
                              "id": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 120
                              },
                              "label": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 80
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              "attendeePrompt": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 300
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
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
      "description": "Canonical organizer subtype. Legacy documents without this field normalize to club until backfill is complete.",
      "x-catch-ownership": "callable-owned"
    },
    "organizerTypeUpdatedAt": {
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
      "description": "Server-owned timestamp of the latest organizer type decision.",
      "x-catch-ownership": "server-only"
    },
    "organizerTypeUpdatedByUid": {
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
      "description": "Server-owned user id that made the latest organizer type decision.",
      "x-catch-ownership": "server-only"
    },
    "publicCategoryLabel": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "description": "Optional admin-curated public category copy. It never replaces organizerType as the classification authority.",
      "x-catch-ownership": "callable-owned"
    },
    "entityKind": {
      "type": "string",
      "enum": [
        "club",
        "venue",
        "eventOrganizer",
        "creatorCommunity",
        "brand"
      ],
      "description": "Deprecated organizer classification retained only while legacy data and clients are migrated to organizerType.",
      "x-catch-ownership": "callable-owned"
    },
    "entitySubtypes": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "description": "Deprecated free-form organizer classification retained only for migration reads.",
      "x-catch-ownership": "callable-owned"
    },
    "displayCategory": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "description": "Deprecated reader-facing category label retained until publicCategoryLabel migration is complete.",
      "x-catch-ownership": "callable-owned"
    },
    "cityName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "regionName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "countryCode": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Z]{2}$",
      "x-catch-ownership": "callable-owned"
    },
    "countryName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "appVisibility": {
      "type": "string",
      "enum": [
        "discoverable",
        "hidden"
      ],
      "description": "Whether the native app should show this organizer in browse surfaces. Scraped unclaimed profiles start hidden.",
      "x-catch-ownership": "callable-owned"
    },
    "supplyCapabilities": {
      "title": "OrganizerSupplyCapabilities",
      "description": "Organizer-level member-affordance ceiling. New writes must persist it; legacy readers derive the same fail-closed policy until backfill completes.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "bookable",
        "paymentsEnabled",
        "waitlistEnabled",
        "hostContactEnabled",
        "claimable",
        "reviewPolicy"
      ],
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "unclaimed_read_only",
            "claimed_managed"
          ]
        },
        "bookable": {
          "type": "boolean"
        },
        "paymentsEnabled": {
          "type": "boolean"
        },
        "waitlistEnabled": {
          "type": "boolean"
        },
        "hostContactEnabled": {
          "type": "boolean"
        },
        "claimable": {
          "type": "boolean"
        },
        "reviewPolicy": {
          "type": "string",
          "enum": [
            "after_event_end",
            "attended_event_only"
          ]
        }
      },
      "oneOf": [
        {
          "properties": {
            "mode": {
              "const": "unclaimed_read_only"
            },
            "bookable": {
              "const": false
            },
            "paymentsEnabled": {
              "const": false
            },
            "waitlistEnabled": {
              "const": false
            },
            "hostContactEnabled": {
              "const": false
            },
            "reviewPolicy": {
              "const": "after_event_end"
            }
          },
          "required": [
            "mode",
            "bookable",
            "paymentsEnabled",
            "waitlistEnabled",
            "hostContactEnabled",
            "reviewPolicy"
          ]
        },
        {
          "properties": {
            "mode": {
              "const": "claimed_managed"
            },
            "bookable": {
              "const": true
            },
            "paymentsEnabled": {
              "const": true
            },
            "waitlistEnabled": {
              "const": true
            },
            "hostContactEnabled": {
              "const": true
            },
            "claimable": {
              "const": false
            },
            "reviewPolicy": {
              "const": "attended_event_only"
            }
          },
          "required": [
            "mode",
            "bookable",
            "paymentsEnabled",
            "waitlistEnabled",
            "hostContactEnabled",
            "claimable",
            "reviewPolicy"
          ]
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "ownership": {
      "type": "object",
      "additionalProperties": false,
      "description": "Claim-aware organizer ownership state. This is the forward-looking owner model; legacy host fields are maintained for app compatibility.",
      "required": [
        "state",
        "ownerUserId",
        "primaryHostUserId",
        "hostUserIds",
        "claimedAt",
        "claimedByUid"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "programmatic",
            "userCreated",
            "claimed",
            "transferred"
          ]
        },
        "ownerUserId": {
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
        "primaryHostUserId": {
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
        "hostUserIds": {
          "type": "array",
          "maxItems": 20,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          }
        },
        "claimedAt": {
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
        "claimedByUid": {
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "claim": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "claimHref",
        "lastClaimRequestId"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "unclaimed",
            "claimPending",
            "claimed",
            "verified",
            "suppressed"
          ]
        },
        "claimHref": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 240
        },
        "lastClaimRequestId": {
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "publicPage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "slug",
        "citySlug",
        "canonicalPath",
        "publishStatus",
        "indexStatus",
        "robots",
        "seoTitle",
        "seoDescription",
        "lastRenderedAt"
      ],
      "properties": {
        "slug": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[a-z0-9-]+$"
        },
        "citySlug": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "pattern": "^[a-z0-9-]+$"
        },
        "canonicalPath": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "legacyPaths": {
          "type": "array",
          "maxItems": 12,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          }
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
        "indexStatus": {
          "type": "string",
          "enum": [
            "noindex",
            "indexReady",
            "indexed"
          ]
        },
        "robots": {
          "type": "string",
          "enum": [
            "noindex, follow",
            "index, follow"
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
        },
        "lastRenderedAt": {
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
        "indexReview": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "required": [
            "reviewedAt",
            "reviewedByUid",
            "indexStatus",
            "checklist",
            "reviewNote"
          ],
          "properties": {
            "reviewedAt": {
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
            "reviewedByUid": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "indexStatus": {
              "type": "string",
              "enum": [
                "noindex",
                "indexReady",
                "indexed"
              ]
            },
            "checklist": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "sourceEvidenceVerified",
                "mediaRightsVerified",
                "cadenceVerified",
                "ownerContactVerified"
              ],
              "properties": {
                "sourceEvidenceVerified": {
                  "type": "boolean"
                },
                "mediaRightsVerified": {
                  "type": "boolean"
                },
                "cadenceVerified": {
                  "type": "boolean"
                },
                "ownerContactVerified": {
                  "type": "boolean"
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
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "origin",
        "sourceConfidence",
        "verificationStatus",
        "lastVerifiedAt"
      ],
      "properties": {
        "origin": {
          "type": "string",
          "enum": [
            "userCreated",
            "scraper",
            "adminSeed",
            "import"
          ]
        },
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
        },
        "lastVerifiedAt": {
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
      },
      "x-catch-ownership": "server-only"
    },
    "intakeLearningSource": {
      "type": "object",
      "additionalProperties": false,
      "description": "Bounded server-only lineage for fields seeded by Supply Intake. Raw provider payloads are never stored here. This snapshot lets audited admin edits produce immutable field-correction fixtures.",
      "required": [
        "sourceProfileId",
        "sourceWorkItemId",
        "sourceCandidateId",
        "seededFields",
        "capturedAt"
      ],
      "properties": {
        "sourceProfileId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "sourceWorkItemId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
        },
        "sourceCandidateId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "seededFields": {
          "type": "array",
          "maxItems": 40,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "field",
              "extractedValue",
              "artifactId",
              "contentHash",
              "locator",
              "extractedBy",
              "extractorVersion",
              "confidence"
            ],
            "properties": {
              "field": {
                "type": "string",
                "enum": [
                  "name",
                  "location",
                  "tags",
                  "publicProfile.sourceSummary",
                  "publicProfile.formats",
                  "publicSources[0].href"
                ]
              },
              "extractedValue": {
                "anyOf": [
                  {
                    "type": "string",
                    "maxLength": 2000
                  },
                  {
                    "type": "null"
                  },
                  {
                    "type": "array",
                    "maxItems": 40,
                    "items": {
                      "type": "string",
                      "maxLength": 500
                    }
                  }
                ]
              },
              "artifactId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "contentHash": {
                "type": "string",
                "pattern": "^[a-f0-9]{64}$"
              },
              "locator": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 1000
              },
              "extractedBy": {
                "type": "string",
                "enum": [
                  "deterministic",
                  "model",
                  "human"
                ]
              },
              "extractorVersion": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160
              },
              "confidence": {
                "type": [
                  "number",
                  "null"
                ],
                "minimum": 0,
                "maximum": 1
              }
            }
          }
        },
        "capturedAt": {
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
      "x-catch-ownership": "server-only"
    },
    "adminSearch": {
      "type": "object",
      "additionalProperties": false,
      "description": "Server-owned deterministic search projection used by admin organizer publishing. Rebuildable from canonical organizer fields; not consumed by the app.",
      "required": [
        "tokens",
        "sortKey",
        "updatedAt",
        "updatedBySource"
      ],
      "properties": {
        "tokens": {
          "type": "array",
          "maxItems": 120,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 2,
            "maxLength": 80,
            "pattern": "^[a-z0-9-]+$"
          }
        },
        "sortKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[a-z0-9-]+(?:-[a-z0-9-]+)*$"
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
        },
        "updatedBySource": {
          "type": "string",
          "enum": [
            "adminCreateOrganizerDraftFromCandidate",
            "adminApproveOrganizerListing",
            "adminUpdateClubDetails",
            "adminSetClubIndexStatus",
            "adminOrganizerSearchBackfill"
          ]
        }
      },
      "x-catch-ownership": "server-only"
    },
    "publicProfile": {
      "type": "object",
      "additionalProperties": false,
      "description": "Visitor-facing organizer listing content derived from sources or owner edits. Operator evidence (fit rationale, evidence checklists, intake requests, claim and index state) and raw scrape snapshots belong in private intake and evidence collections; operator writes are checked by functions/src/organizers/organizerPublicContent.ts.",
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
        },
        "facts": {
          "type": "array",
          "maxItems": 20,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "label",
              "value"
            ],
            "properties": {
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "value": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              }
            }
          }
        },
        "eventEvidence": {
          "type": "array",
          "maxItems": 12,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "title",
              "date",
              "location",
              "summary",
              "facts",
              "sourceLabel",
              "sourceHref"
            ],
            "properties": {
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160
              },
              "date": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "location": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "summary": {
                "type": "string",
                "minLength": 1,
                "maxLength": 600
              },
              "facts": {
                "type": "array",
                "maxItems": 12,
                "items": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 240
                }
              },
              "sourceLabel": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "sourceHref": {
                "type": "string",
                "format": "uri",
                "maxLength": 2048
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "publicSources": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "type",
          "label",
          "detail",
          "href",
          "confidence",
          "lastCheckedAt"
        ],
        "properties": {
          "type": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "detail": {
            "type": "string",
            "minLength": 1,
            "maxLength": 600
          },
          "href": {
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
          "confidence": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ]
          },
          "lastCheckedAt": {
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
      "x-catch-ownership": "server-only"
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
  },
  "x-legacy-tolerated-fields": [
    "clubPhotos",
    "memberCount",
    "entityKind",
    "entitySubtypes",
    "displayCategory"
  ]
} as const;
