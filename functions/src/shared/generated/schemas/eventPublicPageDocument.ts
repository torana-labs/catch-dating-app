/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventPublicPageDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_public_pages.schema.json",
  "title": "EventPublicPageDocument",
  "description": "Read model holding exactly what one public event page shows, stored at eventPublicPage/{eventId} for a published Catch event or a public imported event. Functions rebuild it with its organizer's page, using the website publication and suppression rules. An event that fails those rules, or whose organizer page is withheld, has no document. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventPublicPage",
  "x-firestore-path": "eventPublicPage/{eventId}",
  "x-document-id-field": "eventId",
  "x-catch-ownership": "trigger-owned",
  "x-owner": "functions/src/publicPages: rebuilt with its organizer's page by the organizer, event, external event, review and follower triggers, the scheduled reconcile and the backfill script. No client reads or writes.",
  "required": [
    "schemaVersion",
    "eventId",
    "organizerId",
    "path",
    "builtAt",
    "contentHash",
    "item",
    "capacity",
    "organizer",
    "reviews",
    "moreEvents",
    "listing"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "eventId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
    },
    "organizerId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"
    },
    "path": {
      "type": "string",
      "maxLength": 200,
      "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
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
    "contentHash": {
      "type": "string",
      "description": "SHA-256 of the page content without builtAt, so unchanged rebuilds skip the write.",
      "pattern": "^[a-f0-9]{64}$"
    },
    "item": {
      "description": "Every public field of the event, including the optional photo, itinerary, meeting location, included, requirements, accessibility, cancellation policy, waitlist and Catch experience activities, with its source and where a guest books it.",
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "source",
            "eventId",
            "path",
            "event",
            "booking"
          ],
          "properties": {
            "source": {
              "const": "catch"
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
            "event": {
              "description": "The public Catch event projection. The listing schema already leaves out the balanced label, the rotations experience and the Event Success scorecard; this also refuses the singlesMixer activity.",
              "allOf": [
                {
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
              ],
              "not": {
                "properties": {
                  "activityKind": {
                    "const": "singlesMixer"
                  }
                },
                "required": [
                  "activityKind"
                ]
              }
            },
            "booking": {
              "type": "object",
              "additionalProperties": false,
              "description": "A Catch-native event books on its Catch event page. Live terms are rechecked by the booking callables, never trusted from this snapshot.",
              "required": [
                "kind",
                "path",
                "registrationAccess",
                "spotsLeft"
              ],
              "properties": {
                "kind": {
                  "const": "catch"
                },
                "path": {
                  "type": "string",
                  "maxLength": 200,
                  "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
                },
                "registrationAccess": {
                  "type": "string",
                  "enum": [
                    "open",
                    "app",
                    "restricted"
                  ]
                },
                "spotsLeft": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "source",
            "eventId",
            "path",
            "event",
            "booking"
          ],
          "properties": {
            "source": {
              "const": "external"
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
            "event": {
              "description": "The public imported event projection. Booking stays on the source platform.",
              "allOf": [
                {
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
              ],
              "not": {
                "properties": {
                  "activityKind": {
                    "const": "singlesMixer"
                  }
                },
                "required": [
                  "activityKind"
                ]
              }
            },
            "booking": {
              "type": "object",
              "additionalProperties": false,
              "description": "An imported event books on its source platform.",
              "required": [
                "kind",
                "url",
                "label"
              ],
              "properties": {
                "kind": {
                  "const": "external"
                },
                "url": {
                  "type": "string",
                  "format": "uri",
                  "maxLength": 4096,
                  "pattern": "^https://"
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
      ]
    },
    "capacity": {
      "type": "object",
      "additionalProperties": false,
      "description": "Capacity when the page was built. Booking rechecks it live.",
      "required": [
        "state",
        "capacityLimit",
        "bookedCount",
        "waitlistedCount",
        "spotsLeft",
        "waitlistAvailable"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "open",
            "full",
            "external"
          ]
        },
        "capacityLimit": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "bookedCount": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "waitlistedCount": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "spotsLeft": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "waitlistAvailable": {
          "type": "boolean"
        }
      }
    },
    "organizer": {
      "type": "object",
      "additionalProperties": false,
      "description": "The organizer as an event page shows it.",
      "required": [
        "organizerId",
        "name",
        "path",
        "category",
        "city",
        "logo",
        "verified",
        "followerCount",
        "rating",
        "reviewCount",
        "verifiedReviewCount",
        "upcomingEventCount"
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
        },
        "category": {
          "type": "string",
          "minLength": 1
        },
        "city": {
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
        "verified": {
          "type": "boolean"
        },
        "followerCount": {
          "type": "integer",
          "minimum": 0
        },
        "rating": {
          "anyOf": [
            {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5
            },
            {
              "type": "null"
            }
          ]
        },
        "reviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "verifiedReviewCount": {
          "type": "integer",
          "minimum": 0
        },
        "upcomingEventCount": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "reviews": {
      "type": "array",
      "description": "The organizer's two newest published reviews. Empty when public reviews are not readable.",
      "maxItems": 2,
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
    "moreEvents": {
      "type": "array",
      "description": "Up to three other upcoming events from the same organizer, soonest first.",
      "maxItems": 3,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "description": "A compact event card without live counts, so a booking on one event never rewrites its siblings' pages.",
        "required": [
          "source",
          "eventId",
          "path",
          "title",
          "activityKind",
          "startTime",
          "endTime",
          "date",
          "location",
          "priceLabel",
          "photoUrl",
          "booking"
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
          "activityKind": {
            "type": "string",
            "minLength": 1
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
          "booking": {
            "oneOf": [
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "path"
                ],
                "properties": {
                  "kind": {
                    "const": "catch"
                  },
                  "path": {
                    "type": "string",
                    "maxLength": 200,
                    "pattern": "^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/$"
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "description": "An imported event books on its source platform.",
                "required": [
                  "kind",
                  "url",
                  "label"
                ],
                "properties": {
                  "kind": {
                    "const": "external"
                  },
                  "url": {
                    "type": "string",
                    "format": "uri",
                    "maxLength": 4096,
                    "pattern": "^https://"
                  },
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 80
                  }
                }
              }
            ]
          }
        },
        "not": {
          "properties": {
            "activityKind": {
              "const": "singlesMixer"
            }
          },
          "required": [
            "activityKind"
          ]
        }
      }
    },
    "listing": {
      "description": "Today's organizer listing for this event, with this event's own published reviews, so the current event page renders unchanged. The event is attached at read time.",
      "allOf": [
        {
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
                "appCreatedOrganizer"
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
        }
      ],
      "not": {
        "anyOf": [
          {
            "properties": {
              "catchEvents": {
                "minItems": 1
              }
            },
            "required": [
              "catchEvents"
            ]
          },
          {
            "properties": {
              "externalEvents": {
                "minItems": 1
              }
            },
            "required": [
              "externalEvents"
            ]
          }
        ]
      }
    }
  }
} as const;
