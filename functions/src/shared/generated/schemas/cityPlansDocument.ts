/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const cityPlansDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/city_plans.schema.json",
  "title": "CityPlansDocument",
  "description": "Read model holding what the website shows for one city, stored at cityPlans/{citySlug}: the plans starting in the next 14 days, how many there are of each format, the organisers behind them and whether the city is live or launching soon. Functions build it from the published organizer page read models (and, for cities that have not launched, from published organizers), so it adds no publication rule of its own. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "cityPlans",
  "x-firestore-path": "cityPlans/{citySlug}",
  "x-document-id-field": "citySlug",
  "x-catch-ownership": "trigger-owned",
  "x-owner": "functions/src/cityPlans: the organizer page trigger and the hourly rebuild. No client reads or writes.",
  "required": [
    "schemaVersion",
    "citySlug",
    "cityLabel",
    "marketStatus",
    "status",
    "builtAt",
    "windowStart",
    "windowEnd",
    "planCount",
    "formatCounts",
    "plans",
    "organizers"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "citySlug": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "maxLength": 60
    },
    "cityLabel": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "marketStatus": {
      "type": "string",
      "description": "The market's launch status in functions/src/locations/marketConfig.ts.",
      "enum": [
        "launched",
        "planned"
      ]
    },
    "status": {
      "type": "string",
      "description": "live when the market has launched and has enough plans in the window to fill a page; otherwise launchingSoon, so a thin city never renders a sparse page.",
      "enum": [
        "live",
        "launchingSoon"
      ]
    },
    "builtAt": {
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
    "windowStart": {
      "type": "string",
      "format": "date-time",
      "description": "When the build read its sources. Plans that ended before this are left out."
    },
    "windowEnd": {
      "type": "string",
      "format": "date-time",
      "description": "Fourteen days after windowStart. Plans starting at or after this are left out."
    },
    "planCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Every plan in the window, which may be more than plans holds."
    },
    "formatCounts": {
      "type": "object",
      "additionalProperties": false,
      "description": "Plans in the window by format.",
      "required": [
        "runClubs",
        "dinners",
        "gamesAndQuizzes",
        "pickleball",
        "nightsOut",
        "other"
      ],
      "properties": {
        "runClubs": {
          "type": "integer",
          "minimum": 0
        },
        "dinners": {
          "type": "integer",
          "minimum": 0
        },
        "gamesAndQuizzes": {
          "type": "integer",
          "minimum": 0
        },
        "pickleball": {
          "type": "integer",
          "minimum": 0
        },
        "nightsOut": {
          "type": "integer",
          "minimum": 0
        },
        "other": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "plans": {
      "type": "array",
      "description": "Plans in the window, soonest first.",
      "maxItems": 120,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "description": "One plan as a city page lists it. Live booking terms are rechecked on its event page, never trusted from this snapshot.",
        "required": [
          "source",
          "eventId",
          "path",
          "title",
          "format",
          "activityKind",
          "startTime",
          "endTime",
          "date",
          "location",
          "priceLabel",
          "photoUrl",
          "spotsLeft",
          "organizer"
        ],
        "properties": {
          "source": {
            "type": "string",
            "enum": [
              "catch",
              "external"
            ]
          },
          "eventId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
          },
          "path": {
            "type": "string",
            "maxLength": 200,
            "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
          },
          "title": {
            "type": "string",
            "minLength": 1
          },
          "format": {
            "type": "string",
            "description": "The homepage format a plan's activity belongs to.",
            "enum": [
              "runClubs",
              "dinners",
              "gamesAndQuizzes",
              "pickleball",
              "nightsOut",
              "other"
            ]
          },
          "activityKind": {
            "type": "string",
            "minLength": 1,
            "not": {
              "const": "singlesMixer"
            }
          },
          "startTime": {
            "type": "string",
            "format": "date-time"
          },
          "endTime": {
            "type": [
              "string",
              "null"
            ],
            "format": "date-time"
          },
          "date": {
            "type": "string",
            "minLength": 1
          },
          "location": {
            "type": "string",
            "minLength": 1
          },
          "priceLabel": {
            "type": "string",
            "minLength": 1
          },
          "photoUrl": {
            "anyOf": [
              {
                "type": "string",
                "format": "uri",
                "maxLength": 4096,
                "pattern": "^https://"
              },
              {
                "type": "null"
              }
            ]
          },
          "spotsLeft": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "description": "Places left on a Catch plan; null for an imported plan, which books on its source."
          },
          "organizer": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "organizerId",
              "name",
              "path"
            ],
            "properties": {
              "organizerId": {
                "type": "string",
                "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
              },
              "name": {
                "type": "string",
                "minLength": 1
              },
              "path": {
                "type": "string",
                "maxLength": 240,
                "pattern": "^/organizers/(?:[a-z0-9-]+/){1,2}$"
              }
            }
          }
        }
      }
    },
    "organizers": {
      "type": "array",
      "description": "Organisers in the city: those with a plan in the window first, soonest plan first, then by followers.",
      "maxItems": 24,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "name",
          "path",
          "category",
          "logo",
          "formats",
          "followerCount",
          "claimState",
          "upcomingPlanCount",
          "nextPlan"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
          },
          "name": {
            "type": "string",
            "minLength": 1
          },
          "path": {
            "description": "The organiser page, or null while the city has not launched and the organiser has no public page yet.",
            "anyOf": [
              {
                "type": "string",
                "maxLength": 240,
                "pattern": "^/organizers/(?:[a-z0-9-]+/){1,2}$"
              },
              {
                "type": "null"
              }
            ]
          },
          "category": {
            "type": "string",
            "minLength": 1
          },
          "logo": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "mode",
              "text",
              "status"
            ],
            "properties": {
              "mode": {
                "type": "string",
                "enum": [
                  "monogram"
                ]
              },
              "text": {
                "type": "string",
                "minLength": 1
              },
              "status": {
                "type": "string",
                "minLength": 1
              }
            }
          },
          "formats": {
            "type": "array",
            "description": "Formats the organiser runs, from its plans and its listed formats.",
            "maxItems": 6,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "description": "The homepage format a plan's activity belongs to.",
              "enum": [
                "runClubs",
                "dinners",
                "gamesAndQuizzes",
                "pickleball",
                "nightsOut",
                "other"
              ]
            }
          },
          "followerCount": {
            "type": "integer",
            "minimum": 0
          },
          "claimState": {
            "type": "string",
            "enum": [
              "unclaimed",
              "claimPending",
              "claimed",
              "verified"
            ]
          },
          "upcomingPlanCount": {
            "type": "integer",
            "minimum": 0,
            "description": "The organiser's plans in the window."
          },
          "nextPlan": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "eventId",
                  "path",
                  "title",
                  "startTime",
                  "date"
                ],
                "properties": {
                  "eventId": {
                    "type": "string",
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
                  },
                  "path": {
                    "type": "string",
                    "maxLength": 200,
                    "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
                  },
                  "title": {
                    "type": "string",
                    "minLength": 1
                  },
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "date": {
                    "type": "string",
                    "minLength": 1
                  }
                }
              },
              {
                "type": "null"
              }
            ]
          }
        }
      }
    }
  },
  "definitions": {
    "format": {
      "type": "string",
      "description": "The homepage format a plan's activity belongs to.",
      "enum": [
        "runClubs",
        "dinners",
        "gamesAndQuizzes",
        "pickleball",
        "nightsOut",
        "other"
      ]
    },
    "cityPlan": {
      "type": "object",
      "additionalProperties": false,
      "description": "One plan as a city page lists it. Live booking terms are rechecked on its event page, never trusted from this snapshot.",
      "required": [
        "source",
        "eventId",
        "path",
        "title",
        "format",
        "activityKind",
        "startTime",
        "endTime",
        "date",
        "location",
        "priceLabel",
        "photoUrl",
        "spotsLeft",
        "organizer"
      ],
      "properties": {
        "source": {
          "type": "string",
          "enum": [
            "catch",
            "external"
          ]
        },
        "eventId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
        },
        "path": {
          "type": "string",
          "maxLength": 200,
          "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "format": {
          "type": "string",
          "description": "The homepage format a plan's activity belongs to.",
          "enum": [
            "runClubs",
            "dinners",
            "gamesAndQuizzes",
            "pickleball",
            "nightsOut",
            "other"
          ]
        },
        "activityKind": {
          "type": "string",
          "minLength": 1,
          "not": {
            "const": "singlesMixer"
          }
        },
        "startTime": {
          "type": "string",
          "format": "date-time"
        },
        "endTime": {
          "type": [
            "string",
            "null"
          ],
          "format": "date-time"
        },
        "date": {
          "type": "string",
          "minLength": 1
        },
        "location": {
          "type": "string",
          "minLength": 1
        },
        "priceLabel": {
          "type": "string",
          "minLength": 1
        },
        "photoUrl": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri",
              "maxLength": 4096,
              "pattern": "^https://"
            },
            {
              "type": "null"
            }
          ]
        },
        "spotsLeft": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "description": "Places left on a Catch plan; null for an imported plan, which books on its source."
        },
        "organizer": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "organizerId",
            "name",
            "path"
          ],
          "properties": {
            "organizerId": {
              "type": "string",
              "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
            },
            "name": {
              "type": "string",
              "minLength": 1
            },
            "path": {
              "type": "string",
              "maxLength": 240,
              "pattern": "^/organizers/(?:[a-z0-9-]+/){1,2}$"
            }
          }
        }
      }
    },
    "cityOrganizer": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "organizerId",
        "name",
        "path",
        "category",
        "logo",
        "formats",
        "followerCount",
        "claimState",
        "upcomingPlanCount",
        "nextPlan"
      ],
      "properties": {
        "organizerId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "path": {
          "description": "The organiser page, or null while the city has not launched and the organiser has no public page yet.",
          "anyOf": [
            {
              "type": "string",
              "maxLength": 240,
              "pattern": "^/organizers/(?:[a-z0-9-]+/){1,2}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "category": {
          "type": "string",
          "minLength": 1
        },
        "logo": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "mode",
            "text",
            "status"
          ],
          "properties": {
            "mode": {
              "type": "string",
              "enum": [
                "monogram"
              ]
            },
            "text": {
              "type": "string",
              "minLength": 1
            },
            "status": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "formats": {
          "type": "array",
          "description": "Formats the organiser runs, from its plans and its listed formats.",
          "maxItems": 6,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "description": "The homepage format a plan's activity belongs to.",
            "enum": [
              "runClubs",
              "dinners",
              "gamesAndQuizzes",
              "pickleball",
              "nightsOut",
              "other"
            ]
          }
        },
        "followerCount": {
          "type": "integer",
          "minimum": 0
        },
        "claimState": {
          "type": "string",
          "enum": [
            "unclaimed",
            "claimPending",
            "claimed",
            "verified"
          ]
        },
        "upcomingPlanCount": {
          "type": "integer",
          "minimum": 0,
          "description": "The organiser's plans in the window."
        },
        "nextPlan": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "eventId",
                "path",
                "title",
                "startTime",
                "date"
              ],
              "properties": {
                "eventId": {
                  "type": "string",
                  "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
                },
                "path": {
                  "type": "string",
                  "maxLength": 200,
                  "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
                },
                "title": {
                  "type": "string",
                  "minLength": 1
                },
                "startTime": {
                  "type": "string",
                  "format": "date-time"
                },
                "date": {
                  "type": "string",
                  "minLength": 1
                }
              }
            },
            {
              "type": "null"
            }
          ]
        }
      }
    }
  }
} as const;
