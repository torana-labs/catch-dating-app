/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const websiteHostListingProjectionSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/public/website_host_listing_projection.schema.json",
  "title": "WebsiteHostListingProjection",
  "description": "Public organizer listing projection consumed by the marketing website and future shared web/app listing surfaces. It is generated from approved organizer, seed, or demo data and is not the canonical organizer document.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "website/scripts/generateOrganizerListings.mjs",
  "required": [
    "id",
    "listingVariant",
    "dataOrigin",
    "name",
    "slug",
    "city",
    "citySlug",
    "region",
    "country",
    "path",
    "category",
    "status",
    "indexing",
    "sourceConfidence",
    "headline",
    "description",
    "sourceSummary",
    "logo",
    "formats",
    "facts",
    "eventEvidence",
    "reviews",
    "fitNotes",
    "missingEvidence",
    "sources",
    "claim",
    "publicApi",
    "authority",
    "capabilities",
    "lastVerifiedAt",
    "searchText"
  ],
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "listingVariant": {
      "type": "string",
      "enum": [
        "unclaimedScraped",
        "appCreatedClub"
      ]
    },
    "dataOrigin": {
      "type": "string",
      "enum": [
        "scrapedSeed",
        "catchDemo",
        "organizerIntake"
      ]
    },
    "name": {
      "type": "string",
      "minLength": 1
    },
    "slug": {
      "type": "string",
      "minLength": 1
    },
    "city": {
      "type": "string",
      "minLength": 1
    },
    "citySlug": {
      "type": "string",
      "minLength": 1
    },
    "region": {
      "type": "string"
    },
    "country": {
      "type": "string"
    },
    "path": {
      "type": "string",
      "pattern": "^/[^?#]*/$"
    },
    "legacyPaths": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^/[^?#]*/$"
      },
      "uniqueItems": true
    },
    "category": {
      "type": "string",
      "minLength": 1
    },
    "status": {
      "type": "string",
      "minLength": 1
    },
    "indexing": {
      "type": "string",
      "enum": [
        "index, follow",
        "noindex, follow"
      ]
    },
    "sourceConfidence": {
      "type": "string",
      "enum": [
        "first_party",
        "seedOnly",
        "high",
        "medium",
        "low",
        "ownerVerified"
      ]
    },
    "headline": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": "string",
      "minLength": 1
    },
    "sourceSummary": {
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
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "facts": {
      "type": "array",
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
            "minLength": 1
          },
          "value": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "reviewReadState": {
      "type": "string",
      "enum": [
        "ready",
        "unavailable"
      ]
    },
    "metrics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "followerCount": {
          "type": "integer",
          "minimum": 0
        },
        "verifiedReviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "memberCount": {
          "type": "integer",
          "minimum": 0
        },
        "rating": {
          "type": "number",
          "minimum": 0,
          "maximum": 5
        },
        "reviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "nextEventAt": {
          "type": [
            "string",
            "null"
          ]
        },
        "nextEventLabel": {
          "type": [
            "string",
            "null"
          ]
        }
      }
    },
    "host": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "role",
        "avatarUrl"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "role": {
          "type": "string",
          "minLength": 1
        },
        "avatarUrl": {
          "type": [
            "string",
            "null"
          ],
          "format": "uri"
        }
      }
    },
    "catchEvents": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "role",
          "title",
          "activityKind",
          "timeline",
          "startTime",
          "endTime",
          "date",
          "location",
          "summary",
          "capacityLimit",
          "bookedCount",
          "checkedInCount",
          "waitlistedCount",
          "priceLabel"
        ],
        "properties": {
          "catchExperienceActivities": {
            "type": "array",
            "minItems": 1,
            "maxItems": 2,
            "uniqueItems": true,
            "description": "Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.",
            "items": {
              "type": "string",
              "enum": [
                "introductions",
                "sharedActivities"
              ]
            }
          },
          "id": {
            "type": "string",
            "minLength": 1
          },
          "role": {
            "type": "string",
            "minLength": 1
          },
          "title": {
            "type": "string",
            "minLength": 1
          },
          "activityKind": {
            "type": "string",
            "minLength": 1
          },
          "timeline": {
            "type": "string",
            "enum": [
              "upcoming",
              "past"
            ]
          },
          "startTime": {
            "type": "string",
            "minLength": 1
          },
          "endTime": {
            "type": [
              "string",
              "null"
            ]
          },
          "timezone": {
            "type": "string",
            "minLength": 1
          },
          "date": {
            "type": "string",
            "minLength": 1
          },
          "location": {
            "type": "string",
            "minLength": 1
          },
          "locationDetails": {
            "type": "string"
          },
          "summary": {
            "type": "string"
          },
          "photoUrl": {
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
          "meetingLocation": {
            "type": "object",
            "additionalProperties": false,
            "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
            "required": [
              "name",
              "latitude",
              "longitude"
            ],
            "properties": {
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "address": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 500
              },
              "placeId": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1,
                "maxLength": 256
              },
              "latitude": {
                "type": "number",
                "minimum": -90,
                "maximum": 90
              },
              "longitude": {
                "type": "number",
                "minimum": -180,
                "maximum": 180
              },
              "notes": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 1000
              }
            }
          },
          "itinerary": {
            "type": "array",
            "maxItems": 40,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "description": "One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.",
              "required": [
                "id",
                "kind",
                "offsetMinutes",
                "title"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 80,
                  "pattern": "^[A-Za-z0-9_-]+$"
                },
                "kind": {
                  "type": "string",
                  "enum": [
                    "gather",
                    "activity",
                    "stop",
                    "break",
                    "transition",
                    "finish"
                  ]
                },
                "offsetMinutes": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 1440
                },
                "durationMinutes": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1,
                  "maximum": 1440
                },
                "title": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "description": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 500
                },
                "location": {
                  "anyOf": [
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
                      "required": [
                        "name",
                        "latitude",
                        "longitude"
                      ],
                      "properties": {
                        "name": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 240
                        },
                        "address": {
                          "type": [
                            "string",
                            "null"
                          ],
                          "maxLength": 500
                        },
                        "placeId": {
                          "type": [
                            "string",
                            "null"
                          ],
                          "minLength": 1,
                          "maxLength": 256
                        },
                        "latitude": {
                          "type": "number",
                          "minimum": -90,
                          "maximum": 90
                        },
                        "longitude": {
                          "type": "number",
                          "minimum": -180,
                          "maximum": 180
                        },
                        "notes": {
                          "type": [
                            "string",
                            "null"
                          ],
                          "maxLength": 1000
                        }
                      }
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "routeDistanceMeters": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0,
                  "maximum": 1000000
                }
              }
            },
            "x-catch-ownership": "callable-owned"
          },
          "requirements": {
            "type": "string"
          },
          "accessibility": {
            "type": "string"
          },
          "included": {
            "type": "string",
            "maxLength": 2000
          },
          "registrationAccess": {
            "type": "string",
            "enum": [
              "open",
              "restricted",
              "app"
            ]
          },
          "admissionLabels": {
            "type": "array",
            "maxItems": 3,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "enum": [
                "approval",
                "invitation",
                "membership"
              ]
            }
          },
          "waitlistAvailable": {
            "type": "boolean"
          },
          "cancellationPolicy": {
            "type": "string",
            "enum": [
              "notApplicable",
              "flexible",
              "standard",
              "strict"
            ]
          },
          "capacityLimit": {
            "type": "integer",
            "minimum": 0
          },
          "bookedCount": {
            "type": "integer",
            "minimum": 0
          },
          "checkedInCount": {
            "type": "integer",
            "minimum": 0
          },
          "waitlistedCount": {
            "type": "integer",
            "minimum": 0
          },
          "publicRegistrationEnabled": {
            "type": "boolean"
          },
          "registrationMode": {
            "type": "string",
            "enum": [
              "closed",
              "free",
              "paid"
            ]
          },
          "amountPaise": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000
          },
          "currency": {
            "type": "string",
            "pattern": "^[A-Z]{3}$"
          },
          "priceLabel": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "externalEvents": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "activityKind",
          "availability",
          "startTime",
          "endTime",
          "date",
          "location",
          "summary",
          "priceLabel",
          "sourceLabel",
          "sourceHref",
          "externalLinkCount",
          "dedupeKey"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "title": {
            "type": "string",
            "minLength": 1
          },
          "activityKind": {
            "type": "string",
            "minLength": 1
          },
          "availability": {
            "type": "string",
            "enum": [
              "read_only_external"
            ]
          },
          "startTime": {
            "type": "string",
            "minLength": 1
          },
          "endTime": {
            "type": [
              "string",
              "null"
            ]
          },
          "timezone": {
            "type": "string",
            "minLength": 1
          },
          "date": {
            "type": "string",
            "minLength": 1
          },
          "location": {
            "type": "string",
            "minLength": 1
          },
          "locationDetails": {
            "type": "string"
          },
          "summary": {
            "type": "string"
          },
          "requirements": {
            "type": "string"
          },
          "accessibility": {
            "type": "string"
          },
          "priceLabel": {
            "type": "string",
            "minLength": 1
          },
          "sourceLabel": {
            "type": "string",
            "minLength": 1
          },
          "sourceHref": {
            "type": "string",
            "format": "uri"
          },
          "externalLinkCount": {
            "type": "integer",
            "minimum": 1
          },
          "dedupeKey": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "eventEvidence": {
      "type": "array",
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
            "minLength": 1
          },
          "date": {
            "type": "string",
            "minLength": 1
          },
          "location": {
            "type": "string",
            "minLength": 1
          },
          "summary": {
            "type": "string"
          },
          "facts": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "sourceLabel": {
            "type": "string",
            "minLength": 1
          },
          "sourceHref": {
            "type": "string",
            "format": "uri"
          }
        }
      }
    },
    "reviews": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "eventId",
          "reviewerName",
          "rating",
          "comment",
          "createdAt",
          "verificationStatus",
          "source",
          "isAnonymous",
          "ownerResponse"
        ],
        "properties": {
          "id": {
            "type": [
              "string",
              "null"
            ]
          },
          "eventId": {
            "type": [
              "string",
              "null"
            ]
          },
          "reviewerName": {
            "type": "string",
            "minLength": 1
          },
          "rating": {
            "type": "number",
            "minimum": 0,
            "maximum": 5
          },
          "comment": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "minLength": 1
          },
          "verificationStatus": {
            "type": "string",
            "enum": [
              "verified",
              "unverified"
            ]
          },
          "source": {
            "type": "string",
            "enum": [
              "catchEvent",
              "publicListing"
            ]
          },
          "isAnonymous": {
            "type": "boolean"
          },
          "ownerResponse": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "hostName",
                  "hostAvatarUrl",
                  "message",
                  "updatedAt"
                ],
                "properties": {
                  "hostName": {
                    "type": "string",
                    "minLength": 1
                  },
                  "hostAvatarUrl": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "format": "uri"
                  },
                  "message": {
                    "type": "string"
                  },
                  "updatedAt": {
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
    },
    "fitNotes": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "missingEvidence": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "type",
          "label",
          "detail",
          "confidence"
        ],
        "properties": {
          "type": {
            "type": "string",
            "minLength": 1
          },
          "label": {
            "type": "string",
            "minLength": 1
          },
          "detail": {
            "type": "string",
            "minLength": 1
          },
          "href": {
            "type": "string",
            "format": "uri"
          },
          "confidence": {
            "type": "string",
            "enum": [
              "high",
              "medium",
              "low"
            ]
          }
        }
      }
    },
    "claim": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "href",
        "label"
      ],
      "properties": {
        "href": {
          "type": "string",
          "minLength": 1
        },
        "label": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "publicApi": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "reason",
        "claimTargetSyncStatus"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1
        },
        "claimTargetSyncStatus": {
          "type": "string",
          "enum": [
            "in_sync",
            "write_needed",
            "static_fixture",
            "unknown"
          ]
        }
      }
    },
    "authority": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ownershipState",
        "claimState",
        "provenanceOrigin",
        "sourceConfidence",
        "verificationStatus",
        "appVisibility",
        "publishStatus",
        "indexStatus"
      ],
      "properties": {
        "ownershipState": {
          "type": "string",
          "enum": [
            "programmatic",
            "userCreated",
            "claimed",
            "transferred"
          ]
        },
        "claimState": {
          "type": "string",
          "enum": [
            "unclaimed",
            "claimPending",
            "claimed",
            "verified",
            "suppressed"
          ]
        },
        "provenanceOrigin": {
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
        "appVisibility": {
          "type": "string",
          "enum": [
            "discoverable",
            "hidden"
          ]
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
        }
      }
    },
    "capabilities": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "claimRequest",
        "publicReviews",
        "supply"
      ],
      "properties": {
        "claimRequest": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "state",
            "reason"
          ],
          "properties": {
            "state": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "publicReviews": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "targetState",
            "readState",
            "writeState",
            "reason"
          ],
          "properties": {
            "targetState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "readState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "writeState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1
            }
          },
          "not": {
            "anyOf": [
              {
                "properties": {
                  "targetState": {
                    "const": "disabled"
                  },
                  "readState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "targetState",
                  "readState"
                ]
              },
              {
                "properties": {
                  "targetState": {
                    "const": "disabled"
                  },
                  "writeState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "targetState",
                  "writeState"
                ]
              },
              {
                "properties": {
                  "readState": {
                    "const": "disabled"
                  },
                  "writeState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "readState",
                  "writeState"
                ]
              }
            ]
          }
        },
        "supply": {
          "title": "OrganizerSupplyCapabilities",
          "description": "Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.",
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
          ]
        }
      }
    },
    "lastVerifiedAt": {
      "type": "string",
      "minLength": 1
    },
    "searchText": {
      "type": "string",
      "minLength": 1
    }
  },
  "not": {
    "properties": {
      "authority": {
        "properties": {
          "claimState": {
            "const": "suppressed"
          },
          "publishStatus": {
            "const": "published"
          }
        },
        "required": [
          "claimState",
          "publishStatus"
        ]
      }
    },
    "required": [
      "authority"
    ]
  },
  "definitions": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "routePath": {
      "type": "string",
      "pattern": "^/[^?#]*/$"
    },
    "urlOrNull": {
      "type": [
        "string",
        "null"
      ],
      "format": "uri"
    },
    "labelValue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "label",
        "value"
      ],
      "properties": {
        "label": {
          "type": "string",
          "minLength": 1
        },
        "value": {
          "type": "string",
          "minLength": 1
        }
      }
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
    "metrics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "followerCount": {
          "type": "integer",
          "minimum": 0
        },
        "verifiedReviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "memberCount": {
          "type": "integer",
          "minimum": 0
        },
        "rating": {
          "type": "number",
          "minimum": 0,
          "maximum": 5
        },
        "reviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "nextEventAt": {
          "type": [
            "string",
            "null"
          ]
        },
        "nextEventLabel": {
          "type": [
            "string",
            "null"
          ]
        }
      }
    },
    "host": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "role",
        "avatarUrl"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "role": {
          "type": "string",
          "minLength": 1
        },
        "avatarUrl": {
          "type": [
            "string",
            "null"
          ],
          "format": "uri"
        }
      }
    },
    "catchEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "role",
        "title",
        "activityKind",
        "timeline",
        "startTime",
        "endTime",
        "date",
        "location",
        "summary",
        "capacityLimit",
        "bookedCount",
        "checkedInCount",
        "waitlistedCount",
        "priceLabel"
      ],
      "properties": {
        "catchExperienceActivities": {
          "type": "array",
          "minItems": 1,
          "maxItems": 2,
          "uniqueItems": true,
          "description": "Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.",
          "items": {
            "type": "string",
            "enum": [
              "introductions",
              "sharedActivities"
            ]
          }
        },
        "id": {
          "type": "string",
          "minLength": 1
        },
        "role": {
          "type": "string",
          "minLength": 1
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "activityKind": {
          "type": "string",
          "minLength": 1
        },
        "timeline": {
          "type": "string",
          "enum": [
            "upcoming",
            "past"
          ]
        },
        "startTime": {
          "type": "string",
          "minLength": 1
        },
        "endTime": {
          "type": [
            "string",
            "null"
          ]
        },
        "timezone": {
          "type": "string",
          "minLength": 1
        },
        "date": {
          "type": "string",
          "minLength": 1
        },
        "location": {
          "type": "string",
          "minLength": 1
        },
        "locationDetails": {
          "type": "string"
        },
        "summary": {
          "type": "string"
        },
        "photoUrl": {
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
        "meetingLocation": {
          "type": "object",
          "additionalProperties": false,
          "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
          "required": [
            "name",
            "latitude",
            "longitude"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240
            },
            "address": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 500
            },
            "placeId": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 256
            },
            "latitude": {
              "type": "number",
              "minimum": -90,
              "maximum": 90
            },
            "longitude": {
              "type": "number",
              "minimum": -180,
              "maximum": 180
            },
            "notes": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 1000
            }
          }
        },
        "itinerary": {
          "type": "array",
          "maxItems": 40,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "description": "One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.",
            "required": [
              "id",
              "kind",
              "offsetMinutes",
              "title"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80,
                "pattern": "^[A-Za-z0-9_-]+$"
              },
              "kind": {
                "type": "string",
                "enum": [
                  "gather",
                  "activity",
                  "stop",
                  "break",
                  "transition",
                  "finish"
                ]
              },
              "offsetMinutes": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1440
              },
              "durationMinutes": {
                "type": [
                  "integer",
                  "null"
                ],
                "minimum": 1,
                "maximum": 1440
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "description": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 500
              },
              "location": {
                "anyOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
                    "required": [
                      "name",
                      "latitude",
                      "longitude"
                    ],
                    "properties": {
                      "name": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 240
                      },
                      "address": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 500
                      },
                      "placeId": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "minLength": 1,
                        "maxLength": 256
                      },
                      "latitude": {
                        "type": "number",
                        "minimum": -90,
                        "maximum": 90
                      },
                      "longitude": {
                        "type": "number",
                        "minimum": -180,
                        "maximum": 180
                      },
                      "notes": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 1000
                      }
                    }
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "routeDistanceMeters": {
                "type": [
                  "integer",
                  "null"
                ],
                "minimum": 0,
                "maximum": 1000000
              }
            }
          },
          "x-catch-ownership": "callable-owned"
        },
        "requirements": {
          "type": "string"
        },
        "accessibility": {
          "type": "string"
        },
        "included": {
          "type": "string",
          "maxLength": 2000
        },
        "registrationAccess": {
          "type": "string",
          "enum": [
            "open",
            "restricted",
            "app"
          ]
        },
        "admissionLabels": {
          "type": "array",
          "maxItems": 3,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "approval",
              "invitation",
              "membership"
            ]
          }
        },
        "waitlistAvailable": {
          "type": "boolean"
        },
        "cancellationPolicy": {
          "type": "string",
          "enum": [
            "notApplicable",
            "flexible",
            "standard",
            "strict"
          ]
        },
        "capacityLimit": {
          "type": "integer",
          "minimum": 0
        },
        "bookedCount": {
          "type": "integer",
          "minimum": 0
        },
        "checkedInCount": {
          "type": "integer",
          "minimum": 0
        },
        "waitlistedCount": {
          "type": "integer",
          "minimum": 0
        },
        "publicRegistrationEnabled": {
          "type": "boolean"
        },
        "registrationMode": {
          "type": "string",
          "enum": [
            "closed",
            "free",
            "paid"
          ]
        },
        "amountPaise": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000000
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "priceLabel": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "externalEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "activityKind",
        "availability",
        "startTime",
        "endTime",
        "date",
        "location",
        "summary",
        "priceLabel",
        "sourceLabel",
        "sourceHref",
        "externalLinkCount",
        "dedupeKey"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "activityKind": {
          "type": "string",
          "minLength": 1
        },
        "availability": {
          "type": "string",
          "enum": [
            "read_only_external"
          ]
        },
        "startTime": {
          "type": "string",
          "minLength": 1
        },
        "endTime": {
          "type": [
            "string",
            "null"
          ]
        },
        "timezone": {
          "type": "string",
          "minLength": 1
        },
        "date": {
          "type": "string",
          "minLength": 1
        },
        "location": {
          "type": "string",
          "minLength": 1
        },
        "locationDetails": {
          "type": "string"
        },
        "summary": {
          "type": "string"
        },
        "requirements": {
          "type": "string"
        },
        "accessibility": {
          "type": "string"
        },
        "priceLabel": {
          "type": "string",
          "minLength": 1
        },
        "sourceLabel": {
          "type": "string",
          "minLength": 1
        },
        "sourceHref": {
          "type": "string",
          "format": "uri"
        },
        "externalLinkCount": {
          "type": "integer",
          "minimum": 1
        },
        "dedupeKey": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "eventEvidence": {
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
          "minLength": 1
        },
        "date": {
          "type": "string",
          "minLength": 1
        },
        "location": {
          "type": "string",
          "minLength": 1
        },
        "summary": {
          "type": "string"
        },
        "facts": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "sourceLabel": {
          "type": "string",
          "minLength": 1
        },
        "sourceHref": {
          "type": "string",
          "format": "uri"
        }
      }
    },
    "publicReview": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "eventId",
        "reviewerName",
        "rating",
        "comment",
        "createdAt",
        "verificationStatus",
        "source",
        "isAnonymous",
        "ownerResponse"
      ],
      "properties": {
        "id": {
          "type": [
            "string",
            "null"
          ]
        },
        "eventId": {
          "type": [
            "string",
            "null"
          ]
        },
        "reviewerName": {
          "type": "string",
          "minLength": 1
        },
        "rating": {
          "type": "number",
          "minimum": 0,
          "maximum": 5
        },
        "comment": {
          "type": "string"
        },
        "createdAt": {
          "type": "string",
          "minLength": 1
        },
        "verificationStatus": {
          "type": "string",
          "enum": [
            "verified",
            "unverified"
          ]
        },
        "source": {
          "type": "string",
          "enum": [
            "catchEvent",
            "publicListing"
          ]
        },
        "isAnonymous": {
          "type": "boolean"
        },
        "ownerResponse": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "hostName",
                "hostAvatarUrl",
                "message",
                "updatedAt"
              ],
              "properties": {
                "hostName": {
                  "type": "string",
                  "minLength": 1
                },
                "hostAvatarUrl": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "format": "uri"
                },
                "message": {
                  "type": "string"
                },
                "updatedAt": {
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
    },
    "ownerResponse": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "hostName",
        "hostAvatarUrl",
        "message",
        "updatedAt"
      ],
      "properties": {
        "hostName": {
          "type": "string",
          "minLength": 1
        },
        "hostAvatarUrl": {
          "type": [
            "string",
            "null"
          ],
          "format": "uri"
        },
        "message": {
          "type": "string"
        },
        "updatedAt": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "publicApi": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "reason",
        "claimTargetSyncStatus"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1
        },
        "claimTargetSyncStatus": {
          "type": "string",
          "enum": [
            "in_sync",
            "write_needed",
            "static_fixture",
            "unknown"
          ]
        }
      }
    },
    "authority": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ownershipState",
        "claimState",
        "provenanceOrigin",
        "sourceConfidence",
        "verificationStatus",
        "appVisibility",
        "publishStatus",
        "indexStatus"
      ],
      "properties": {
        "ownershipState": {
          "type": "string",
          "enum": [
            "programmatic",
            "userCreated",
            "claimed",
            "transferred"
          ]
        },
        "claimState": {
          "type": "string",
          "enum": [
            "unclaimed",
            "claimPending",
            "claimed",
            "verified",
            "suppressed"
          ]
        },
        "provenanceOrigin": {
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
        "appVisibility": {
          "type": "string",
          "enum": [
            "discoverable",
            "hidden"
          ]
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
        }
      }
    },
    "capability": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "reason"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "publicReviewCapability": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "targetState",
        "readState",
        "writeState",
        "reason"
      ],
      "properties": {
        "targetState": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "readState": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "writeState": {
          "type": "string",
          "enum": [
            "enabled",
            "disabled"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1
        }
      },
      "not": {
        "anyOf": [
          {
            "properties": {
              "targetState": {
                "const": "disabled"
              },
              "readState": {
                "const": "enabled"
              }
            },
            "required": [
              "targetState",
              "readState"
            ]
          },
          {
            "properties": {
              "targetState": {
                "const": "disabled"
              },
              "writeState": {
                "const": "enabled"
              }
            },
            "required": [
              "targetState",
              "writeState"
            ]
          },
          {
            "properties": {
              "readState": {
                "const": "disabled"
              },
              "writeState": {
                "const": "enabled"
              }
            },
            "required": [
              "readState",
              "writeState"
            ]
          }
        ]
      }
    },
    "capabilities": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "claimRequest",
        "publicReviews",
        "supply"
      ],
      "properties": {
        "claimRequest": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "state",
            "reason"
          ],
          "properties": {
            "state": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "publicReviews": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "targetState",
            "readState",
            "writeState",
            "reason"
          ],
          "properties": {
            "targetState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "readState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "writeState": {
              "type": "string",
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1
            }
          },
          "not": {
            "anyOf": [
              {
                "properties": {
                  "targetState": {
                    "const": "disabled"
                  },
                  "readState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "targetState",
                  "readState"
                ]
              },
              {
                "properties": {
                  "targetState": {
                    "const": "disabled"
                  },
                  "writeState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "targetState",
                  "writeState"
                ]
              },
              {
                "properties": {
                  "readState": {
                    "const": "disabled"
                  },
                  "writeState": {
                    "const": "enabled"
                  }
                },
                "required": [
                  "readState",
                  "writeState"
                ]
              }
            ]
          }
        },
        "supply": {
          "title": "OrganizerSupplyCapabilities",
          "description": "Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.",
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
          ]
        }
      }
    },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "label",
        "detail",
        "confidence"
      ],
      "properties": {
        "type": {
          "type": "string",
          "minLength": 1
        },
        "label": {
          "type": "string",
          "minLength": 1
        },
        "detail": {
          "type": "string",
          "minLength": 1
        },
        "href": {
          "type": "string",
          "format": "uri"
        },
        "confidence": {
          "type": "string",
          "enum": [
            "high",
            "medium",
            "low"
          ]
        }
      }
    }
  }
} as const;
