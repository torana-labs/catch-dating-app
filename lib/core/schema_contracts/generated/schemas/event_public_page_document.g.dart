// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_public_pages.schema.json.

const schemaEventPublicPageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_public_pages.schema.json',
  'title': 'EventPublicPageDocument',
  'description': 'Read model holding exactly what one public event page shows, stored at eventPublicPage/{eventId} for a published Catch event or a public imported event. Functions rebuild it with its organizer\'s page, using the website publication and suppression rules. An event that fails those rules, or whose organizer page is withheld, has no document. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventPublicPage',
  'x-firestore-path': 'eventPublicPage/{eventId}',
  'x-document-id-field': 'eventId',
  'x-catch-ownership': 'trigger-owned',
  'x-owner': 'functions/src/publicPages: rebuilt with its organizer\'s page by the organizer, event, external event, review and follower triggers, the scheduled reconcile and the backfill script. No client reads or writes.',
  'required': <Object?>[
    'schemaVersion',
    'eventId',
    'organizerId',
    'path',
    'builtAt',
    'contentHash',
    'item',
    'capacity',
    'organizer',
    'reviews',
    'moreEvents',
    'listing',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
    },
    'path': <String, Object?>{
      'type': 'string',
      'maxLength': 200,
      'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
    },
    'builtAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'description': 'SHA-256 of the page content without builtAt, so unchanged rebuilds skip the write.',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'item': <String, Object?>{
      'description': 'Every public field of the event, including the optional photo, itinerary, meeting location, included, requirements, accessibility, cancellation policy, waitlist and Catch experience activities, with its source and where a guest books it.',
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'source',
            'eventId',
            'path',
            'event',
            'booking',
          ],
          'properties': <String, Object?>{
            'source': <String, Object?>{
              'const': 'catch',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
            },
            'path': <String, Object?>{
              'type': 'string',
              'maxLength': 200,
              'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
            },
            'event': <String, Object?>{
              'description': 'The public Catch event projection. The listing schema already leaves out the balanced label, the rotations experience and the Event Success scorecard; this also refuses the singlesMixer activity.',
              'allOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'id',
                    'role',
                    'title',
                    'activityKind',
                    'timeline',
                    'startTime',
                    'endTime',
                    'date',
                    'location',
                    'summary',
                    'capacityLimit',
                    'bookedCount',
                    'checkedInCount',
                    'waitlistedCount',
                    'priceLabel',
                  ],
                  'properties': <String, Object?>{
                    'catchExperienceActivities': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 2,
                      'uniqueItems': true,
                      'description': 'Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.',
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'introductions',
                          'sharedActivities',
                        ],
                      },
                    },
                    'id': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'role': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'title': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'activityKind': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'timeline': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'upcoming',
                        'past',
                      ],
                    },
                    'startTime': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'endTime': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                    },
                    'timezone': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'date': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'location': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'locationDetails': <String, Object?>{
                      'type': 'string',
                    },
                    'summary': <String, Object?>{
                      'type': 'string',
                    },
                    'photoUrl': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'format': 'uri',
                          'maxLength': 2048,
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                      'x-catch-ownership': 'callable-owned',
                    },
                    'meetingLocation': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                      'required': <Object?>[
                        'name',
                        'latitude',
                        'longitude',
                      ],
                      'properties': <String, Object?>{
                        'name': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'address': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 500,
                        },
                        'placeId': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'minLength': 1,
                          'maxLength': 256,
                        },
                        'latitude': <String, Object?>{
                          'type': 'number',
                          'minimum': -90,
                          'maximum': 90,
                        },
                        'longitude': <String, Object?>{
                          'type': 'number',
                          'minimum': -180,
                          'maximum': 180,
                        },
                        'notes': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 1000,
                        },
                      },
                    },
                    'itinerary': <String, Object?>{
                      'type': 'array',
                      'maxItems': 40,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'description': 'One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.',
                        'required': <Object?>[
                          'id',
                          'kind',
                          'offsetMinutes',
                          'title',
                        ],
                        'properties': <String, Object?>{
                          'id': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                            'pattern': '^[A-Za-z0-9_-]+\$',
                          },
                          'kind': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'gather',
                              'activity',
                              'stop',
                              'break',
                              'transition',
                              'finish',
                            ],
                          },
                          'offsetMinutes': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 1440,
                          },
                          'durationMinutes': <String, Object?>{
                            'type': <Object?>[
                              'integer',
                              'null',
                            ],
                            'minimum': 1,
                            'maximum': 1440,
                          },
                          'title': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 120,
                          },
                          'description': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'maxLength': 500,
                          },
                          'location': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                                'required': <Object?>[
                                  'name',
                                  'latitude',
                                  'longitude',
                                ],
                                'properties': <String, Object?>{
                                  'name': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 240,
                                  },
                                  'address': <String, Object?>{
                                    'type': <Object?>[
                                      'string',
                                      'null',
                                    ],
                                    'maxLength': 500,
                                  },
                                  'placeId': <String, Object?>{
                                    'type': <Object?>[
                                      'string',
                                      'null',
                                    ],
                                    'minLength': 1,
                                    'maxLength': 256,
                                  },
                                  'latitude': <String, Object?>{
                                    'type': 'number',
                                    'minimum': -90,
                                    'maximum': 90,
                                  },
                                  'longitude': <String, Object?>{
                                    'type': 'number',
                                    'minimum': -180,
                                    'maximum': 180,
                                  },
                                  'notes': <String, Object?>{
                                    'type': <Object?>[
                                      'string',
                                      'null',
                                    ],
                                    'maxLength': 1000,
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'routeDistanceMeters': <String, Object?>{
                            'type': <Object?>[
                              'integer',
                              'null',
                            ],
                            'minimum': 0,
                            'maximum': 1000000,
                          },
                        },
                      },
                      'x-catch-ownership': 'callable-owned',
                    },
                    'requirements': <String, Object?>{
                      'type': 'string',
                    },
                    'accessibility': <String, Object?>{
                      'type': 'string',
                    },
                    'included': <String, Object?>{
                      'type': 'string',
                      'maxLength': 2000,
                    },
                    'registrationAccess': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'open',
                        'restricted',
                        'app',
                      ],
                    },
                    'admissionLabels': <String, Object?>{
                      'type': 'array',
                      'maxItems': 3,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'approval',
                          'invitation',
                          'membership',
                        ],
                      },
                    },
                    'waitlistAvailable': <String, Object?>{
                      'type': 'boolean',
                    },
                    'cancellationPolicy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'notApplicable',
                        'flexible',
                        'standard',
                        'strict',
                      ],
                    },
                    'capacityLimit': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                    },
                    'bookedCount': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                    },
                    'checkedInCount': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                    },
                    'waitlistedCount': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                    },
                    'publicRegistrationEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'registrationMode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'closed',
                        'free',
                        'paid',
                      ],
                    },
                    'amountPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 100000000,
                    },
                    'currency': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[A-Z]{3}\$',
                    },
                    'priceLabel': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                },
              ],
              'not': <String, Object?>{
                'properties': <String, Object?>{
                  'activityKind': <String, Object?>{
                    'const': 'singlesMixer',
                  },
                },
                'required': <Object?>[
                  'activityKind',
                ],
              },
            },
            'booking': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'description': 'A Catch-native event books on its Catch event page. Live terms are rechecked by the booking callables, never trusted from this snapshot.',
              'required': <Object?>[
                'kind',
                'path',
                'registrationAccess',
                'spotsLeft',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'catch',
                },
                'path': <String, Object?>{
                  'type': 'string',
                  'maxLength': 200,
                  'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
                },
                'registrationAccess': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'open',
                    'app',
                    'restricted',
                  ],
                },
                'spotsLeft': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'source',
            'eventId',
            'path',
            'event',
            'booking',
          ],
          'properties': <String, Object?>{
            'source': <String, Object?>{
              'const': 'external',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
            },
            'path': <String, Object?>{
              'type': 'string',
              'maxLength': 200,
              'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
            },
            'event': <String, Object?>{
              'description': 'The public imported event projection. Booking stays on the source platform.',
              'allOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'id',
                    'title',
                    'activityKind',
                    'availability',
                    'startTime',
                    'endTime',
                    'date',
                    'location',
                    'summary',
                    'priceLabel',
                    'sourceLabel',
                    'sourceHref',
                    'externalLinkCount',
                    'dedupeKey',
                  ],
                  'properties': <String, Object?>{
                    'id': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'title': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'activityKind': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'availability': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'read_only_external',
                      ],
                    },
                    'startTime': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'endTime': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                    },
                    'timezone': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'date': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'location': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'locationDetails': <String, Object?>{
                      'type': 'string',
                    },
                    'summary': <String, Object?>{
                      'type': 'string',
                    },
                    'requirements': <String, Object?>{
                      'type': 'string',
                    },
                    'accessibility': <String, Object?>{
                      'type': 'string',
                    },
                    'priceLabel': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'sourceLabel': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                    'sourceHref': <String, Object?>{
                      'type': 'string',
                      'format': 'uri',
                    },
                    'externalLinkCount': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                    },
                    'dedupeKey': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                },
              ],
              'not': <String, Object?>{
                'properties': <String, Object?>{
                  'activityKind': <String, Object?>{
                    'const': 'singlesMixer',
                  },
                },
                'required': <Object?>[
                  'activityKind',
                ],
              },
            },
            'booking': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'description': 'An imported event books on its source platform.',
              'required': <Object?>[
                'kind',
                'url',
                'label',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'external',
                },
                'url': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                  'maxLength': 4096,
                  'pattern': '^https://',
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
              },
            },
          },
        },
      ],
    },
    'capacity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Capacity when the page was built. Booking rechecks it live.',
      'required': <Object?>[
        'state',
        'capacityLimit',
        'bookedCount',
        'waitlistedCount',
        'spotsLeft',
        'waitlistAvailable',
      ],
      'properties': <String, Object?>{
        'state': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'open',
            'full',
            'external',
          ],
        },
        'capacityLimit': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'bookedCount': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'waitlistedCount': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'spotsLeft': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'waitlistAvailable': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'organizer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'The organizer as an event page shows it.',
      'required': <Object?>[
        'organizerId',
        'name',
        'path',
        'category',
        'city',
        'logo',
        'verified',
        'followerCount',
        'rating',
        'reviewCount',
        'verifiedReviewCount',
        'upcomingEventCount',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'path': <String, Object?>{
          'type': 'string',
          'maxLength': 240,
          'pattern': '^/organizers/(?:[a-z0-9-]+/){1,2}\$',
        },
        'category': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'city': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'logo': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'text',
            'status',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'monogram',
              ],
            },
            'text': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
          },
        },
        'verified': <String, Object?>{
          'type': 'boolean',
        },
        'followerCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'rating': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'number',
              'exclusiveMinimum': 0,
              'maximum': 5,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reviewCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'verifiedReviewCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'upcomingEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'reviews': <String, Object?>{
      'type': 'array',
      'description': 'The organizer\'s two newest published reviews. Empty when public reviews are not readable.',
      'maxItems': 2,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'eventId',
          'reviewerName',
          'rating',
          'comment',
          'createdAt',
          'verificationStatus',
          'source',
          'isAnonymous',
          'ownerResponse',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'eventId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'reviewerName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'rating': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 5,
          },
          'comment': <String, Object?>{
            'type': 'string',
          },
          'createdAt': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'verificationStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'verified',
              'unverified',
            ],
          },
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchEvent',
              'publicListing',
            ],
          },
          'isAnonymous': <String, Object?>{
            'type': 'boolean',
          },
          'ownerResponse': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'hostName',
                  'hostAvatarUrl',
                  'message',
                  'updatedAt',
                ],
                'properties': <String, Object?>{
                  'hostName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'hostAvatarUrl': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'format': 'uri',
                  },
                  'message': <String, Object?>{
                    'type': 'string',
                  },
                  'updatedAt': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'moreEvents': <String, Object?>{
      'type': 'array',
      'description': 'Up to three other upcoming events from the same organizer, soonest first.',
      'maxItems': 3,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'description': 'A compact event card without live counts, so a booking on one event never rewrites its siblings\' pages.',
        'required': <Object?>[
          'source',
          'eventId',
          'path',
          'title',
          'activityKind',
          'startTime',
          'endTime',
          'date',
          'location',
          'priceLabel',
          'photoUrl',
          'booking',
        ],
        'properties': <String, Object?>{
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catch',
              'external',
            ],
          },
          'eventId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
          },
          'path': <String, Object?>{
            'type': 'string',
            'maxLength': 200,
            'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'activityKind': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'startTime': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'endTime': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
          'date': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'location': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'priceLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'photoUrl': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 4096,
                'pattern': '^https://',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'booking': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'path',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'catch',
                  },
                  'path': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                    'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'description': 'An imported event books on its source platform.',
                'required': <Object?>[
                  'kind',
                  'url',
                  'label',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'external',
                  },
                  'url': <String, Object?>{
                    'type': 'string',
                    'format': 'uri',
                    'maxLength': 4096,
                    'pattern': '^https://',
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                  },
                },
              },
            ],
          },
        },
        'not': <String, Object?>{
          'properties': <String, Object?>{
            'activityKind': <String, Object?>{
              'const': 'singlesMixer',
            },
          },
          'required': <Object?>[
            'activityKind',
          ],
        },
      },
    },
    'listing': <String, Object?>{
      'description': 'Today\'s organizer listing for this event, with this event\'s own published reviews, so the current event page renders unchanged. The event is attached at read time.',
      'allOf': <Object?>[
        <String, Object?>{
          'title': 'WebsiteHostListingProjection',
          'description': 'Public organizer listing projection consumed by the marketing website and future shared web/app listing surfaces. It is generated from approved organizer, seed, or demo data and is not the canonical organizer document.',
          'type': 'object',
          'additionalProperties': false,
          'x-owner': 'website/scripts/generateOrganizerListings.mjs',
          'required': <Object?>[
            'id',
            'listingVariant',
            'dataOrigin',
            'name',
            'slug',
            'city',
            'citySlug',
            'region',
            'country',
            'path',
            'category',
            'status',
            'indexing',
            'sourceConfidence',
            'headline',
            'description',
            'sourceSummary',
            'logo',
            'formats',
            'facts',
            'eventEvidence',
            'reviews',
            'fitNotes',
            'missingEvidence',
            'sources',
            'claim',
            'publicApi',
            'authority',
            'capabilities',
            'lastVerifiedAt',
            'searchText',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'listingVariant': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unclaimedScraped',
                'appCreatedClub',
              ],
            },
            'dataOrigin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'scrapedSeed',
                'catchDemo',
                'organizerIntake',
              ],
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'slug': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'city': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'citySlug': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'region': <String, Object?>{
              'type': 'string',
            },
            'country': <String, Object?>{
              'type': 'string',
            },
            'path': <String, Object?>{
              'type': 'string',
              'pattern': '^/[^?#]*/\$',
            },
            'legacyPaths': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
                'pattern': '^/[^?#]*/\$',
              },
              'uniqueItems': true,
            },
            'category': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'indexing': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'index, follow',
                'noindex, follow',
              ],
            },
            'sourceConfidence': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'first_party',
                'seedOnly',
                'high',
                'medium',
                'low',
                'ownerVerified',
              ],
            },
            'headline': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'description': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'sourceSummary': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'logo': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'text',
                'status',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'monogram',
                  ],
                },
                'text': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'status': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'formats': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
            },
            'facts': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'label',
                  'value',
                ],
                'properties': <String, Object?>{
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'value': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
              },
            },
            'reviewReadState': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'ready',
                'unavailable',
              ],
            },
            'metrics': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'followerCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'verifiedReviewCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'memberCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'rating': <String, Object?>{
                  'type': 'number',
                  'minimum': 0,
                  'maximum': 5,
                },
                'reviewCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'nextEventAt': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'nextEventLabel': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
              },
            },
            'host': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'name',
                'role',
                'avatarUrl',
              ],
              'properties': <String, Object?>{
                'name': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'role': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'avatarUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                },
              },
            },
            'catchEvents': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'role',
                  'title',
                  'activityKind',
                  'timeline',
                  'startTime',
                  'endTime',
                  'date',
                  'location',
                  'summary',
                  'capacityLimit',
                  'bookedCount',
                  'checkedInCount',
                  'waitlistedCount',
                  'priceLabel',
                ],
                'properties': <String, Object?>{
                  'catchExperienceActivities': <String, Object?>{
                    'type': 'array',
                    'minItems': 1,
                    'maxItems': 2,
                    'uniqueItems': true,
                    'description': 'Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.',
                    'items': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'introductions',
                        'sharedActivities',
                      ],
                    },
                  },
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'role': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'title': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'activityKind': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'timeline': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'upcoming',
                      'past',
                    ],
                  },
                  'startTime': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'endTime': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                  },
                  'timezone': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'date': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'location': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'locationDetails': <String, Object?>{
                    'type': 'string',
                  },
                  'summary': <String, Object?>{
                    'type': 'string',
                  },
                  'photoUrl': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'format': 'uri',
                        'maxLength': 2048,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                    'x-catch-ownership': 'callable-owned',
                  },
                  'meetingLocation': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                    'required': <Object?>[
                      'name',
                      'latitude',
                      'longitude',
                    ],
                    'properties': <String, Object?>{
                      'name': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 240,
                      },
                      'address': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 500,
                      },
                      'placeId': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 256,
                      },
                      'latitude': <String, Object?>{
                        'type': 'number',
                        'minimum': -90,
                        'maximum': 90,
                      },
                      'longitude': <String, Object?>{
                        'type': 'number',
                        'minimum': -180,
                        'maximum': 180,
                      },
                      'notes': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 1000,
                      },
                    },
                  },
                  'itinerary': <String, Object?>{
                    'type': 'array',
                    'maxItems': 40,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'description': 'One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.',
                      'required': <Object?>[
                        'id',
                        'kind',
                        'offsetMinutes',
                        'title',
                      ],
                      'properties': <String, Object?>{
                        'id': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                          'pattern': '^[A-Za-z0-9_-]+\$',
                        },
                        'kind': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'gather',
                            'activity',
                            'stop',
                            'break',
                            'transition',
                            'finish',
                          ],
                        },
                        'offsetMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 1440,
                        },
                        'durationMinutes': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 1440,
                        },
                        'title': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 120,
                        },
                        'description': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 500,
                        },
                        'location': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                              'required': <Object?>[
                                'name',
                                'latitude',
                                'longitude',
                              ],
                              'properties': <String, Object?>{
                                'name': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 240,
                                },
                                'address': <String, Object?>{
                                  'type': <Object?>[
                                    'string',
                                    'null',
                                  ],
                                  'maxLength': 500,
                                },
                                'placeId': <String, Object?>{
                                  'type': <Object?>[
                                    'string',
                                    'null',
                                  ],
                                  'minLength': 1,
                                  'maxLength': 256,
                                },
                                'latitude': <String, Object?>{
                                  'type': 'number',
                                  'minimum': -90,
                                  'maximum': 90,
                                },
                                'longitude': <String, Object?>{
                                  'type': 'number',
                                  'minimum': -180,
                                  'maximum': 180,
                                },
                                'notes': <String, Object?>{
                                  'type': <Object?>[
                                    'string',
                                    'null',
                                  ],
                                  'maxLength': 1000,
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'routeDistanceMeters': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 0,
                          'maximum': 1000000,
                        },
                      },
                    },
                    'x-catch-ownership': 'callable-owned',
                  },
                  'requirements': <String, Object?>{
                    'type': 'string',
                  },
                  'accessibility': <String, Object?>{
                    'type': 'string',
                  },
                  'included': <String, Object?>{
                    'type': 'string',
                    'maxLength': 2000,
                  },
                  'registrationAccess': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'open',
                      'restricted',
                      'app',
                    ],
                  },
                  'admissionLabels': <String, Object?>{
                    'type': 'array',
                    'maxItems': 3,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'approval',
                        'invitation',
                        'membership',
                      ],
                    },
                  },
                  'waitlistAvailable': <String, Object?>{
                    'type': 'boolean',
                  },
                  'cancellationPolicy': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'notApplicable',
                      'flexible',
                      'standard',
                      'strict',
                    ],
                  },
                  'capacityLimit': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'bookedCount': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'checkedInCount': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'waitlistedCount': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'publicRegistrationEnabled': <String, Object?>{
                    'type': 'boolean',
                  },
                  'registrationMode': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'closed',
                      'free',
                      'paid',
                    ],
                  },
                  'amountPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 100000000,
                  },
                  'currency': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[A-Z]{3}\$',
                  },
                  'priceLabel': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
              },
            },
            'externalEvents': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'title',
                  'activityKind',
                  'availability',
                  'startTime',
                  'endTime',
                  'date',
                  'location',
                  'summary',
                  'priceLabel',
                  'sourceLabel',
                  'sourceHref',
                  'externalLinkCount',
                  'dedupeKey',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'title': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'activityKind': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'availability': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'read_only_external',
                    ],
                  },
                  'startTime': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'endTime': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                  },
                  'timezone': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'date': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'location': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'locationDetails': <String, Object?>{
                    'type': 'string',
                  },
                  'summary': <String, Object?>{
                    'type': 'string',
                  },
                  'requirements': <String, Object?>{
                    'type': 'string',
                  },
                  'accessibility': <String, Object?>{
                    'type': 'string',
                  },
                  'priceLabel': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'sourceLabel': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'sourceHref': <String, Object?>{
                    'type': 'string',
                    'format': 'uri',
                  },
                  'externalLinkCount': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                  },
                  'dedupeKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
              },
            },
            'eventEvidence': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'title',
                  'date',
                  'location',
                  'summary',
                  'facts',
                  'sourceLabel',
                  'sourceHref',
                ],
                'properties': <String, Object?>{
                  'title': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'date': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'location': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'summary': <String, Object?>{
                    'type': 'string',
                  },
                  'facts': <String, Object?>{
                    'type': 'array',
                    'items': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                  'sourceLabel': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'sourceHref': <String, Object?>{
                    'type': 'string',
                    'format': 'uri',
                  },
                },
              },
            },
            'reviews': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'eventId',
                  'reviewerName',
                  'rating',
                  'comment',
                  'createdAt',
                  'verificationStatus',
                  'source',
                  'isAnonymous',
                  'ownerResponse',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                  },
                  'eventId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                  },
                  'reviewerName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'rating': <String, Object?>{
                    'type': 'number',
                    'minimum': 0,
                    'maximum': 5,
                  },
                  'comment': <String, Object?>{
                    'type': 'string',
                  },
                  'createdAt': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'verificationStatus': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'verified',
                      'unverified',
                    ],
                  },
                  'source': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchEvent',
                      'publicListing',
                    ],
                  },
                  'isAnonymous': <String, Object?>{
                    'type': 'boolean',
                  },
                  'ownerResponse': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'hostName',
                          'hostAvatarUrl',
                          'message',
                          'updatedAt',
                        ],
                        'properties': <String, Object?>{
                          'hostName': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                          },
                          'hostAvatarUrl': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'format': 'uri',
                          },
                          'message': <String, Object?>{
                            'type': 'string',
                          },
                          'updatedAt': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
            },
            'fitNotes': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
            },
            'missingEvidence': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
            },
            'sources': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'type',
                  'label',
                  'detail',
                  'confidence',
                ],
                'properties': <String, Object?>{
                  'type': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'detail': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'href': <String, Object?>{
                    'type': 'string',
                    'format': 'uri',
                  },
                  'confidence': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'high',
                      'medium',
                      'low',
                    ],
                  },
                },
              },
            },
            'claim': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'href',
                'label',
              ],
              'properties': <String, Object?>{
                'href': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'publicApi': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'state',
                'reason',
                'claimTargetSyncStatus',
              ],
              'properties': <String, Object?>{
                'state': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'claimTargetSyncStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'in_sync',
                    'write_needed',
                    'static_fixture',
                    'unknown',
                  ],
                },
              },
            },
            'authority': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'ownershipState',
                'claimState',
                'provenanceOrigin',
                'sourceConfidence',
                'verificationStatus',
                'appVisibility',
                'publishStatus',
                'indexStatus',
              ],
              'properties': <String, Object?>{
                'ownershipState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'programmatic',
                    'userCreated',
                    'claimed',
                    'transferred',
                  ],
                },
                'claimState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unclaimed',
                    'claimPending',
                    'claimed',
                    'verified',
                    'suppressed',
                  ],
                },
                'provenanceOrigin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'userCreated',
                    'scraper',
                    'adminSeed',
                    'import',
                  ],
                },
                'sourceConfidence': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'seedOnly',
                    'low',
                    'medium',
                    'high',
                    'ownerVerified',
                  ],
                },
                'verificationStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unverified',
                    'sourceBacked',
                    'ownerVerified',
                  ],
                },
                'appVisibility': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'discoverable',
                    'hidden',
                  ],
                },
                'publishStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'draft',
                    'qa',
                    'published',
                    'suppressed',
                    'removed',
                  ],
                },
                'indexStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'noindex',
                    'indexReady',
                    'indexed',
                  ],
                },
              },
            },
            'capabilities': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'claimRequest',
                'publicReviews',
                'supply',
              ],
              'properties': <String, Object?>{
                'claimRequest': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'state',
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'state': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                },
                'publicReviews': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'targetState',
                    'readState',
                    'writeState',
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'targetState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'readState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'writeState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                  'not': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'targetState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'readState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'targetState',
                          'readState',
                        ],
                      },
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'targetState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'writeState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'targetState',
                          'writeState',
                        ],
                      },
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'readState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'writeState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'readState',
                          'writeState',
                        ],
                      },
                    ],
                  },
                },
                'supply': <String, Object?>{
                  'title': 'OrganizerSupplyCapabilities',
                  'description': 'Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.',
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'bookable',
                    'paymentsEnabled',
                    'waitlistEnabled',
                    'hostContactEnabled',
                    'claimable',
                    'reviewPolicy',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'unclaimed_read_only',
                        'claimed_managed',
                      ],
                    },
                    'bookable': <String, Object?>{
                      'type': 'boolean',
                    },
                    'paymentsEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'waitlistEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'hostContactEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'claimable': <String, Object?>{
                      'type': 'boolean',
                    },
                    'reviewPolicy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'after_event_end',
                        'attended_event_only',
                      ],
                    },
                  },
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'const': 'unclaimed_read_only',
                        },
                        'bookable': <String, Object?>{
                          'const': false,
                        },
                        'paymentsEnabled': <String, Object?>{
                          'const': false,
                        },
                        'waitlistEnabled': <String, Object?>{
                          'const': false,
                        },
                        'hostContactEnabled': <String, Object?>{
                          'const': false,
                        },
                        'reviewPolicy': <String, Object?>{
                          'const': 'after_event_end',
                        },
                      },
                      'required': <Object?>[
                        'mode',
                        'bookable',
                        'paymentsEnabled',
                        'waitlistEnabled',
                        'hostContactEnabled',
                        'reviewPolicy',
                      ],
                    },
                    <String, Object?>{
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'const': 'claimed_managed',
                        },
                        'bookable': <String, Object?>{
                          'const': true,
                        },
                        'paymentsEnabled': <String, Object?>{
                          'const': true,
                        },
                        'waitlistEnabled': <String, Object?>{
                          'const': true,
                        },
                        'hostContactEnabled': <String, Object?>{
                          'const': true,
                        },
                        'claimable': <String, Object?>{
                          'const': false,
                        },
                        'reviewPolicy': <String, Object?>{
                          'const': 'attended_event_only',
                        },
                      },
                      'required': <Object?>[
                        'mode',
                        'bookable',
                        'paymentsEnabled',
                        'waitlistEnabled',
                        'hostContactEnabled',
                        'claimable',
                        'reviewPolicy',
                      ],
                    },
                  ],
                },
              },
            },
            'lastVerifiedAt': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'searchText': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
          },
          'not': <String, Object?>{
            'properties': <String, Object?>{
              'authority': <String, Object?>{
                'properties': <String, Object?>{
                  'claimState': <String, Object?>{
                    'const': 'suppressed',
                  },
                  'publishStatus': <String, Object?>{
                    'const': 'published',
                  },
                },
                'required': <Object?>[
                  'claimState',
                  'publishStatus',
                ],
              },
            },
            'required': <Object?>[
              'authority',
            ],
          },
          'definitions': <String, Object?>{
            'nonEmptyString': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'routePath': <String, Object?>{
              'type': 'string',
              'pattern': '^/[^?#]*/\$',
            },
            'urlOrNull': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'uri',
            },
            'labelValue': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'label',
                'value',
              ],
              'properties': <String, Object?>{
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'logo': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'text',
                'status',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'monogram',
                  ],
                },
                'text': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'status': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'metrics': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'followerCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'verifiedReviewCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'memberCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'rating': <String, Object?>{
                  'type': 'number',
                  'minimum': 0,
                  'maximum': 5,
                },
                'reviewCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'nextEventAt': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'nextEventLabel': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
              },
            },
            'host': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'name',
                'role',
                'avatarUrl',
              ],
              'properties': <String, Object?>{
                'name': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'role': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'avatarUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                },
              },
            },
            'catchEvent': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'id',
                'role',
                'title',
                'activityKind',
                'timeline',
                'startTime',
                'endTime',
                'date',
                'location',
                'summary',
                'capacityLimit',
                'bookedCount',
                'checkedInCount',
                'waitlistedCount',
                'priceLabel',
              ],
              'properties': <String, Object?>{
                'catchExperienceActivities': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 2,
                  'uniqueItems': true,
                  'description': 'Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.',
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'introductions',
                      'sharedActivities',
                    ],
                  },
                },
                'id': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'role': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'activityKind': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'timeline': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upcoming',
                    'past',
                  ],
                },
                'startTime': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'endTime': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'timezone': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'date': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'location': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'locationDetails': <String, Object?>{
                  'type': 'string',
                },
                'summary': <String, Object?>{
                  'type': 'string',
                },
                'photoUrl': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'format': 'uri',
                      'maxLength': 2048,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                  'x-catch-ownership': 'callable-owned',
                },
                'meetingLocation': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                  'required': <Object?>[
                    'name',
                    'latitude',
                    'longitude',
                  ],
                  'properties': <String, Object?>{
                    'name': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 240,
                    },
                    'address': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
                    },
                    'placeId': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'minLength': 1,
                      'maxLength': 256,
                    },
                    'latitude': <String, Object?>{
                      'type': 'number',
                      'minimum': -90,
                      'maximum': 90,
                    },
                    'longitude': <String, Object?>{
                      'type': 'number',
                      'minimum': -180,
                      'maximum': 180,
                    },
                    'notes': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 1000,
                    },
                  },
                },
                'itinerary': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'description': 'One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.',
                    'required': <Object?>[
                      'id',
                      'kind',
                      'offsetMinutes',
                      'title',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                        'pattern': '^[A-Za-z0-9_-]+\$',
                      },
                      'kind': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'gather',
                          'activity',
                          'stop',
                          'break',
                          'transition',
                          'finish',
                        ],
                      },
                      'offsetMinutes': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 1440,
                      },
                      'durationMinutes': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 1,
                        'maximum': 1440,
                      },
                      'title': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'description': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 500,
                      },
                      'location': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                            'required': <Object?>[
                              'name',
                              'latitude',
                              'longitude',
                            ],
                            'properties': <String, Object?>{
                              'name': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 240,
                              },
                              'address': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'maxLength': 500,
                              },
                              'placeId': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 256,
                              },
                              'latitude': <String, Object?>{
                                'type': 'number',
                                'minimum': -90,
                                'maximum': 90,
                              },
                              'longitude': <String, Object?>{
                                'type': 'number',
                                'minimum': -180,
                                'maximum': 180,
                              },
                              'notes': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'maxLength': 1000,
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'routeDistanceMeters': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1000000,
                      },
                    },
                  },
                  'x-catch-ownership': 'callable-owned',
                },
                'requirements': <String, Object?>{
                  'type': 'string',
                },
                'accessibility': <String, Object?>{
                  'type': 'string',
                },
                'included': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
                'registrationAccess': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'open',
                    'restricted',
                    'app',
                  ],
                },
                'admissionLabels': <String, Object?>{
                  'type': 'array',
                  'maxItems': 3,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'approval',
                      'invitation',
                      'membership',
                    ],
                  },
                },
                'waitlistAvailable': <String, Object?>{
                  'type': 'boolean',
                },
                'cancellationPolicy': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'notApplicable',
                    'flexible',
                    'standard',
                    'strict',
                  ],
                },
                'capacityLimit': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'bookedCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'checkedInCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'waitlistedCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'publicRegistrationEnabled': <String, Object?>{
                  'type': 'boolean',
                },
                'registrationMode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'closed',
                    'free',
                    'paid',
                  ],
                },
                'amountPaise': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 100000000,
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'priceLabel': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'externalEvent': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'id',
                'title',
                'activityKind',
                'availability',
                'startTime',
                'endTime',
                'date',
                'location',
                'summary',
                'priceLabel',
                'sourceLabel',
                'sourceHref',
                'externalLinkCount',
                'dedupeKey',
              ],
              'properties': <String, Object?>{
                'id': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'activityKind': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'availability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'read_only_external',
                  ],
                },
                'startTime': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'endTime': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'timezone': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'date': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'location': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'locationDetails': <String, Object?>{
                  'type': 'string',
                },
                'summary': <String, Object?>{
                  'type': 'string',
                },
                'requirements': <String, Object?>{
                  'type': 'string',
                },
                'accessibility': <String, Object?>{
                  'type': 'string',
                },
                'priceLabel': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'sourceLabel': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'sourceHref': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                },
                'externalLinkCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'dedupeKey': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'eventEvidence': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'title',
                'date',
                'location',
                'summary',
                'facts',
                'sourceLabel',
                'sourceHref',
              ],
              'properties': <String, Object?>{
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'date': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'location': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'summary': <String, Object?>{
                  'type': 'string',
                },
                'facts': <String, Object?>{
                  'type': 'array',
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
                'sourceLabel': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'sourceHref': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                },
              },
            },
            'publicReview': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'id',
                'eventId',
                'reviewerName',
                'rating',
                'comment',
                'createdAt',
                'verificationStatus',
                'source',
                'isAnonymous',
                'ownerResponse',
              ],
              'properties': <String, Object?>{
                'id': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'eventId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'reviewerName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'rating': <String, Object?>{
                  'type': 'number',
                  'minimum': 0,
                  'maximum': 5,
                },
                'comment': <String, Object?>{
                  'type': 'string',
                },
                'createdAt': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'verificationStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'verified',
                    'unverified',
                  ],
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catchEvent',
                    'publicListing',
                  ],
                },
                'isAnonymous': <String, Object?>{
                  'type': 'boolean',
                },
                'ownerResponse': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'hostName',
                        'hostAvatarUrl',
                        'message',
                        'updatedAt',
                      ],
                      'properties': <String, Object?>{
                        'hostName': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                        },
                        'hostAvatarUrl': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'format': 'uri',
                        },
                        'message': <String, Object?>{
                          'type': 'string',
                        },
                        'updatedAt': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
            'ownerResponse': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'hostName',
                'hostAvatarUrl',
                'message',
                'updatedAt',
              ],
              'properties': <String, Object?>{
                'hostName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'hostAvatarUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                },
                'message': <String, Object?>{
                  'type': 'string',
                },
                'updatedAt': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'publicApi': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'state',
                'reason',
                'claimTargetSyncStatus',
              ],
              'properties': <String, Object?>{
                'state': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'claimTargetSyncStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'in_sync',
                    'write_needed',
                    'static_fixture',
                    'unknown',
                  ],
                },
              },
            },
            'authority': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'ownershipState',
                'claimState',
                'provenanceOrigin',
                'sourceConfidence',
                'verificationStatus',
                'appVisibility',
                'publishStatus',
                'indexStatus',
              ],
              'properties': <String, Object?>{
                'ownershipState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'programmatic',
                    'userCreated',
                    'claimed',
                    'transferred',
                  ],
                },
                'claimState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unclaimed',
                    'claimPending',
                    'claimed',
                    'verified',
                    'suppressed',
                  ],
                },
                'provenanceOrigin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'userCreated',
                    'scraper',
                    'adminSeed',
                    'import',
                  ],
                },
                'sourceConfidence': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'seedOnly',
                    'low',
                    'medium',
                    'high',
                    'ownerVerified',
                  ],
                },
                'verificationStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unverified',
                    'sourceBacked',
                    'ownerVerified',
                  ],
                },
                'appVisibility': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'discoverable',
                    'hidden',
                  ],
                },
                'publishStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'draft',
                    'qa',
                    'published',
                    'suppressed',
                    'removed',
                  ],
                },
                'indexStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'noindex',
                    'indexReady',
                    'indexed',
                  ],
                },
              },
            },
            'capability': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'state',
                'reason',
              ],
              'properties': <String, Object?>{
                'state': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
            },
            'publicReviewCapability': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'targetState',
                'readState',
                'writeState',
                'reason',
              ],
              'properties': <String, Object?>{
                'targetState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'readState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'writeState': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'enabled',
                    'disabled',
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
              'not': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'properties': <String, Object?>{
                      'targetState': <String, Object?>{
                        'const': 'disabled',
                      },
                      'readState': <String, Object?>{
                        'const': 'enabled',
                      },
                    },
                    'required': <Object?>[
                      'targetState',
                      'readState',
                    ],
                  },
                  <String, Object?>{
                    'properties': <String, Object?>{
                      'targetState': <String, Object?>{
                        'const': 'disabled',
                      },
                      'writeState': <String, Object?>{
                        'const': 'enabled',
                      },
                    },
                    'required': <Object?>[
                      'targetState',
                      'writeState',
                    ],
                  },
                  <String, Object?>{
                    'properties': <String, Object?>{
                      'readState': <String, Object?>{
                        'const': 'disabled',
                      },
                      'writeState': <String, Object?>{
                        'const': 'enabled',
                      },
                    },
                    'required': <Object?>[
                      'readState',
                      'writeState',
                    ],
                  },
                ],
              },
            },
            'capabilities': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'claimRequest',
                'publicReviews',
                'supply',
              ],
              'properties': <String, Object?>{
                'claimRequest': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'state',
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'state': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                },
                'publicReviews': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'targetState',
                    'readState',
                    'writeState',
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'targetState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'readState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'writeState': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'enabled',
                        'disabled',
                      ],
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                    },
                  },
                  'not': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'targetState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'readState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'targetState',
                          'readState',
                        ],
                      },
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'targetState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'writeState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'targetState',
                          'writeState',
                        ],
                      },
                      <String, Object?>{
                        'properties': <String, Object?>{
                          'readState': <String, Object?>{
                            'const': 'disabled',
                          },
                          'writeState': <String, Object?>{
                            'const': 'enabled',
                          },
                        },
                        'required': <Object?>[
                          'readState',
                          'writeState',
                        ],
                      },
                    ],
                  },
                },
                'supply': <String, Object?>{
                  'title': 'OrganizerSupplyCapabilities',
                  'description': 'Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.',
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'bookable',
                    'paymentsEnabled',
                    'waitlistEnabled',
                    'hostContactEnabled',
                    'claimable',
                    'reviewPolicy',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'unclaimed_read_only',
                        'claimed_managed',
                      ],
                    },
                    'bookable': <String, Object?>{
                      'type': 'boolean',
                    },
                    'paymentsEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'waitlistEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'hostContactEnabled': <String, Object?>{
                      'type': 'boolean',
                    },
                    'claimable': <String, Object?>{
                      'type': 'boolean',
                    },
                    'reviewPolicy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'after_event_end',
                        'attended_event_only',
                      ],
                    },
                  },
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'const': 'unclaimed_read_only',
                        },
                        'bookable': <String, Object?>{
                          'const': false,
                        },
                        'paymentsEnabled': <String, Object?>{
                          'const': false,
                        },
                        'waitlistEnabled': <String, Object?>{
                          'const': false,
                        },
                        'hostContactEnabled': <String, Object?>{
                          'const': false,
                        },
                        'reviewPolicy': <String, Object?>{
                          'const': 'after_event_end',
                        },
                      },
                      'required': <Object?>[
                        'mode',
                        'bookable',
                        'paymentsEnabled',
                        'waitlistEnabled',
                        'hostContactEnabled',
                        'reviewPolicy',
                      ],
                    },
                    <String, Object?>{
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'const': 'claimed_managed',
                        },
                        'bookable': <String, Object?>{
                          'const': true,
                        },
                        'paymentsEnabled': <String, Object?>{
                          'const': true,
                        },
                        'waitlistEnabled': <String, Object?>{
                          'const': true,
                        },
                        'hostContactEnabled': <String, Object?>{
                          'const': true,
                        },
                        'claimable': <String, Object?>{
                          'const': false,
                        },
                        'reviewPolicy': <String, Object?>{
                          'const': 'attended_event_only',
                        },
                      },
                      'required': <Object?>[
                        'mode',
                        'bookable',
                        'paymentsEnabled',
                        'waitlistEnabled',
                        'hostContactEnabled',
                        'claimable',
                        'reviewPolicy',
                      ],
                    },
                  ],
                },
              },
            },
            'source': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'type',
                'label',
                'detail',
                'confidence',
              ],
              'properties': <String, Object?>{
                'type': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'detail': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'href': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                },
                'confidence': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'high',
                    'medium',
                    'low',
                  ],
                },
              },
            },
          },
        },
      ],
      'not': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'properties': <String, Object?>{
              'catchEvents': <String, Object?>{
                'minItems': 1,
              },
            },
            'required': <Object?>[
              'catchEvents',
            ],
          },
          <String, Object?>{
            'properties': <String, Object?>{
              'externalEvents': <String, Object?>{
                'minItems': 1,
              },
            },
            'required': <Object?>[
              'externalEvents',
            ],
          },
        ],
      },
    },
  },
};
