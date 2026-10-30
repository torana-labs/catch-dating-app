// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/events.schema.json.

const schemaEventDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/events.schema.json',
  'title': 'EventDocument',
  'description': 'Canonical event document stored at events/{eventId}. The event id is the document id and is not stored in document data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'events',
  'x-firestore-path': 'events/{eventId}',
  'x-document-id-field': 'id',
  'x-owner': 'host create/update/cancel/delete callables; booking and attendance aggregates are callable-owned',
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'required': <Object?>[
    'clubId',
    'startTime',
    'bookedCount',
    'checkedInCount',
    'waitlistedCount',
    'status',
    'cancelledAt',
    'cancellationReason',
    'genderCounts',
    'cohortCounts',
    'waitlistedCohortCounts',
  ],
  'properties': <String, Object?>{
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Organizer-authored event name. Legacy documents may omit it and use the client-derived fallback title.',
      'x-catch-ownership': 'callable-owned',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'sourceVenueId': <String, Object?>{
      'description': 'Optional organizer venue used to prefill this event. Meeting location and capacity remain event-local snapshots.',
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'eventOrigin': <String, Object?>{
      'title': 'EventOrigin',
      'description': 'Immutable operational booking/roster provenance. Missing values deny Catch booking authority.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'bookingAuthority',
        'rosterAuthority',
        'provider',
        'externalEventId',
        'externalEventUrl',
        'sourceExternalEventId',
        'adapterVersion',
        'connectedAt',
        'connectedBy',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchNative',
            'externalCompanion',
          ],
        },
        'bookingAuthority': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catch',
            'external',
          ],
        },
        'rosterAuthority': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchProjection',
            'hostImport',
            'providerSync',
          ],
        },
        'provider': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catch',
            'generic',
            'luma',
            'eventbrite',
            'partiful',
            'posh',
            'bookmyshow',
            'district',
            'sortmyscene',
            'airbnb',
          ],
        },
        'externalEventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'externalEventUrl': <String, Object?>{
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
        },
        'sourceExternalEventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
        'adapterVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
        'connectedAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
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
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'connectedBy': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'runtimeAccess': <String, Object?>{
      'title': 'EventRuntimeAccess',
      'description': 'Server-owned no-download Event Success runtime access configuration.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'enabled',
        'publicRuntimeId',
        'walkInPolicy',
        'termsVersion',
      ],
      'properties': <String, Object?>{
        'enabled': <String, Object?>{
          'type': 'boolean',
        },
        'publicRuntimeId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^[A-Za-z0-9_-]{20,80}\$',
        },
        'walkInPolicy': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'deny',
            'hostApproval',
            'autoCreate',
          ],
        },
        'termsVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'startTime': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'endTime': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'meetingPoint': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
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
      'x-catch-ownership': 'callable-owned',
    },
    'startingPointLat': <String, Object?>{
      'type': 'number',
      'minimum': -90,
      'maximum': 90,
      'x-catch-ownership': 'callable-owned',
    },
    'startingPointLng': <String, Object?>{
      'type': 'number',
      'minimum': -180,
      'maximum': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'locationDetails': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
      'x-catch-ownership': 'callable-owned',
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
    'eventPhotos': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'title': 'UploadedPhoto',
        'description': 'Canonical uploaded image object for ordered media galleries, logos, and event photos.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'url',
          'storagePath',
          'thumbnailUrl',
          'thumbnailStoragePath',
          'position',
          'createdAt',
          'updatedAt',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[A-Za-z0-9_-]+\$',
          },
          'url': <String, Object?>{
            'type': 'string',
            'format': 'uri',
            'maxLength': 2048,
          },
          'storagePath': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 512,
            'pattern': '^[^/\\u0000][^\\u0000]*\$',
          },
          'thumbnailUrl': <String, Object?>{
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
          },
          'thumbnailStoragePath': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 512,
                'pattern': '^[^/\\u0000][^\\u0000]*\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'position': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'moderation': <String, Object?>{
            'type': <Object?>[
              'object',
              'null',
            ],
            'additionalProperties': false,
            'required': <Object?>[
              'status',
            ],
            'properties': <String, Object?>{
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'pending',
                  'approved',
                  'rejected',
                ],
              },
              'reason': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'reviewedAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
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
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
          'createdAt': <String, Object?>{
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
          'updatedAt': <String, Object?>{
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
        },
        'definitions': <String, Object?>{
          'storageObjectPath': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 512,
            'pattern': '^[^/\\u0000][^\\u0000]*\$',
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'distanceKm': <String, Object?>{
      'type': 'number',
      'minimum': 0,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'eventFormat': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'activityKind',
        'interactionModel',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'activityKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'socialRun',
            'running',
            'walking',
            'pickleball',
            'padel',
            'tennis',
            'badminton',
            'cycling',
            'spinClass',
            'yoga',
            'strengthTraining',
            'pubQuiz',
            'barCrawl',
            'dinner',
            'singlesMixer',
            'openActivity',
          ],
        },
        'interactionModel': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pacePods',
            'pairedRotations',
            'teamRotations',
            'seatedTable',
            'freeFormMixer',
            'hostLedProgram',
            'openFormat',
          ],
        },
        'customActivityLabel': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'defaultPlaybookId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'defaultModuleIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'maxItems': 30,
          'uniqueItems': true,
        },
        'eventSuccessPrimitives': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Optional event-success behavior primitives for custom or unsupported activity formats. These fields translate a saved event format into the small set of primitives event success can reason about.',
          'properties': <String, Object?>{
            'phoneAvailability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'continuous',
                'plannedPauses',
                'arrivalAndPostEventOnly',
                'hostOnlyLive',
                'noneDuringActivity',
              ],
            },
            'rotationSuitability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'plannedBreaks',
                'continuousRounds',
              ],
            },
            'assignmentAlgorithm': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'pacePods',
                'socialPods',
                'pairRotations',
                'teamBalancer',
                'tableSeating',
              ],
            },
            'compatibilityPolicy': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'socialCohortBalance',
                'mutualInterestOnly',
                'questionnaireClueOnly',
              ],
            },
            'matchingObjective': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'coverage',
                'romantic',
                'affinity',
                'novelty',
                'balance',
                'spread',
              ],
            },
            'unitOutcome': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'completion',
                'score',
                'rank',
              ],
            },
            'accountability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'rollCall',
                'sweep',
              ],
            },
            'durationShape': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'continuous',
                'rounds',
                'courses',
                'segments',
              ],
            },
          },
        },
        'activityDetails': <String, Object?>{
          'type': 'object',
          'additionalProperties': true,
          'properties': <String, Object?>{
            'routePlan': <String, Object?>{
              'type': 'object',
              'description': 'Composable operations for an event that moves through a route. Activity kind remains the broader format authority.',
              'additionalProperties': false,
              'required': <Object?>[
                'version',
                'movementMode',
                'routeShape',
                'groupStrategy',
                'stopCadence',
                'stopKinds',
                'roleKinds',
              ],
              'properties': <String, Object?>{
                'version': <String, Object?>{
                  'type': 'integer',
                  'enum': <Object?>[
                    1,
                    2,
                  ],
                },
                'movementMode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'run',
                    'walk',
                    'ride',
                    'mixed',
                  ],
                },
                'routeShape': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'loop',
                    'outAndBack',
                    'pointToPoint',
                  ],
                },
                'groupStrategy': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'together',
                    'paceGroups',
                    'selfDirected',
                  ],
                },
                'stopCadence': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'continuous',
                    'flexibleStops',
                    'hostedStops',
                  ],
                },
                'stopKinds': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 7,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'water',
                      'regroup',
                      'venue',
                      'photoSpot',
                      'viewpoint',
                      'hazard',
                      'turnaround',
                    ],
                  },
                },
                'roleKinds': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 6,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'routeLead',
                      'sweep',
                      'pacer',
                      'stopHost',
                      'marshal',
                      'photographer',
                    ],
                  },
                },
                'path': <String, Object?>{
                  'type': 'array',
                  'minItems': 2,
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'latitude',
                      'longitude',
                    ],
                    'properties': <String, Object?>{
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
                    },
                  },
                },
                'paceGroups': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'label',
                      'sortOrder',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                        'pattern': '^[A-Za-z0-9_-]+\$',
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'targetPaceSecondsPerKm': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 120,
                        'maximum': 1800,
                      },
                      'sortOrder': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 1000,
                      },
                    },
                  },
                },
                'liveTrackingPolicy': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'staleAfterSeconds',
                    'retentionMinutes',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'disabled',
                        'hostOnly',
                        'authorizedOperators',
                      ],
                    },
                    'staleAfterSeconds': <String, Object?>{
                      'type': 'integer',
                      'minimum': 30,
                      'maximum': 600,
                    },
                    'retentionMinutes': <String, Object?>{
                      'type': 'integer',
                      'minimum': 5,
                      'maximum': 1440,
                    },
                  },
                },
              },
            },
            'publicDetails': <String, Object?>{
              'type': 'object',
              'description': 'Optional host-authored notes for public event pages. Blank notes are omitted.',
              'additionalProperties': true,
              'properties': <String, Object?>{
                'requirements': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
                'accessibility': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
                'included': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'pace': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'easy',
        'moderate',
        'fast',
        'competitive',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'capacityLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'description': <String, Object?>{
      'type': 'string',
      'maxLength': 2000,
      'x-catch-ownership': 'callable-owned',
    },
    'priceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'bookedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'checkedInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'waitlistedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'cancelled',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'cancelledAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'cancellationReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'x-catch-ownership': 'callable-owned',
    },
    'publicRegistrationEnabled': <String, Object?>{
      'type': 'boolean',
      'description': 'When true, the published marketing event route may register a phone-OTP identity into eventAttendees without creating a Consumer profile.',
      'x-catch-ownership': 'callable-owned',
    },
    'constraints': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'minAge',
        'maxAge',
        'maxMen',
        'maxWomen',
      ],
      'properties': <String, Object?>{
        'minAge': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 120,
        },
        'maxAge': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 120,
        },
        'maxMen': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'maxWomen': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'eventPolicy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'admission',
        'pricing',
        'cancellation',
        'settlement',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'type': 'integer',
          'enum': <Object?>[
            1,
            2,
          ],
          'description': 'Version 2 models cancellation as notApplicable for free events. Version 1 remains readable for legacy snapshots.',
        },
        'admission': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'format',
            'capacityLimit',
            'waitlistPolicy',
            'inviteRequired',
            'membershipRequired',
            'manualApprovalRequired',
            'privateAccessPolicy',
            'cohortCapacityLimits',
            'balancedRatioPolicy',
          ],
          'properties': <String, Object?>{
            'format': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'open',
                'inviteOnly',
                'manualApproval',
                'fixedCohortCaps',
                'balancedRatio',
                'membersOnly',
              ],
            },
            'capacityLimit': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000,
            },
            'waitlistPolicy': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'offerWindowMinutes',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'disabled',
                    'rankedOffer',
                    'broadcastFirstComeFirstServed',
                    'manualReview',
                  ],
                },
                'offerWindowMinutes': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 10080,
                },
              },
            },
            'inviteRequired': <String, Object?>{
              'type': 'boolean',
            },
            'membershipRequired': <String, Object?>{
              'type': 'boolean',
            },
            'manualApprovalRequired': <String, Object?>{
              'type': 'boolean',
            },
            'approvedMembersSkipReview': <String, Object?>{
              'type': 'boolean',
              'description': 'When true, current approved organizer community members may skip event review. Does not waive invitation, capacity, cohort or payment rules. Missing means false.',
            },
            'privateAccessPolicy': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'inviteCodeHint',
                'privateLinkEnabled',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'inviteCode',
                  ],
                },
                'inviteCodeHint': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 64,
                },
                'privateLinkEnabled': <String, Object?>{
                  'type': 'boolean',
                },
              },
            },
            'cohortCapacityLimits': <String, Object?>{
              'type': 'object',
              'additionalProperties': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
            'balancedRatioPolicy': <String, Object?>{
              'type': <Object?>[
                'object',
                'null',
              ],
              'additionalProperties': false,
              'required': <Object?>[
                'leftCohortId',
                'rightCohortId',
                'maxSkew',
                'openingBufferPerCohort',
                'outOfRatioCohortPolicy',
              ],
              'properties': <String, Object?>{
                'leftCohortId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'rightCohortId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'maxSkew': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'openingBufferPerCohort': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'outOfRatioCohortPolicy': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'admitWithinGeneralCapacity',
                    'waitlist',
                    'manualReview',
                    'reject',
                  ],
                },
              },
            },
            'crossPathsPairInventory': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'enabled',
                'reservedPairCapacity',
                'holdDurationMinutes',
              ],
              'properties': <String, Object?>{
                'enabled': <String, Object?>{
                  'type': 'boolean',
                },
                'reservedPairCapacity': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 100,
                },
                'holdDurationMinutes': <String, Object?>{
                  'type': 'integer',
                  'minimum': 5,
                  'maximum': 30,
                },
              },
            },
          },
        },
        'pricing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'basePriceInPaise',
            'cohortAdjustmentsInPaise',
            'demandPricingRules',
          ],
          'properties': <String, Object?>{
            'basePriceInPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            'cohortAdjustmentsInPaise': <String, Object?>{
              'type': 'object',
              'additionalProperties': <String, Object?>{
                'type': 'integer',
                'minimum': -100000000,
                'maximum': 100000000,
              },
            },
            'demandPricingRules': <String, Object?>{
              'type': 'array',
              'maxItems': 20,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'pricedCohortId',
                  'balancingCohortId',
                  'stepAdjustmentInPaise',
                  'maxAdjustmentInPaise',
                  'freeSkew',
                  'demandStep',
                ],
                'properties': <String, Object?>{
                  'pricedCohortId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'balancingCohortId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'stepAdjustmentInPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 100000000,
                  },
                  'maxAdjustmentInPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 100000000,
                  },
                  'freeSkew': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000,
                  },
                  'demandStep': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 1000,
                  },
                },
              },
            },
          },
        },
        'cancellation': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'policyId',
          ],
          'properties': <String, Object?>{
            'policyId': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'flexible',
                'standard',
                'strict',
              ],
            },
          },
        },
        'settlement': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'hostPayoutTiming',
          ],
          'properties': <String, Object?>{
            'hostPayoutTiming': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'afterEventCompletion',
              ],
            },
          },
        },
      },
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'version': <String, Object?>{
            'const': 2,
          },
          'pricing': <String, Object?>{
            'properties': <String, Object?>{
              'basePriceInPaise': <String, Object?>{
                'const': 0,
              },
            },
            'required': <Object?>[
              'basePriceInPaise',
            ],
          },
        },
        'required': <Object?>[
          'version',
          'pricing',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'cancellation': <String, Object?>{
            'properties': <String, Object?>{
              'policyId': <String, Object?>{
                'const': 'notApplicable',
              },
            },
          },
        },
      },
      'else': <String, Object?>{
        'if': <String, Object?>{
          'properties': <String, Object?>{
            'version': <String, Object?>{
              'const': 2,
            },
          },
          'required': <Object?>[
            'version',
          ],
        },
        'then': <String, Object?>{
          'properties': <String, Object?>{
            'cancellation': <String, Object?>{
              'properties': <String, Object?>{
                'policyId': <String, Object?>{
                  'enum': <Object?>[
                    'flexible',
                    'standard',
                    'strict',
                  ],
                },
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'genderCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'cohortCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'waitlistedCohortCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'crossPathsPairHeldCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'crossPathsPairConfirmedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'crossPathsPairHeldCohortCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'crossPathsDiscoveryEnabled': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryMarketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryCityName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'pattern': '^[a-z0-9-]+\$',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryActivityKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'socialRun',
        'running',
        'walking',
        'pickleball',
        'padel',
        'tennis',
        'badminton',
        'cycling',
        'spinClass',
        'yoga',
        'strengthTraining',
        'pubQuiz',
        'barCrawl',
        'dinner',
        'singlesMixer',
        'openActivity',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryGeoCell': <String, Object?>{
      'type': 'string',
      'pattern': '^-?\\d+:-?\\d+\$',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryHasOpenSpots': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryAvailability': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'open',
        'waitlist',
        'gated',
        'full',
        'cancelled',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryOpenCohorts': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'menInterestedInWomen',
          'womenInterestedInMen',
          'queerOrOpen',
          'nonBinaryOrOther',
        ],
      },
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryWaitlistCohorts': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'menInterestedInWomen',
          'womenInterestedInMen',
          'queerOrOpen',
          'nonBinaryOrOther',
        ],
      },
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryInviteRequired': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryMembershipRequired': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryManualApprovalRequired': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryMinAge': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'discoveryMaxAge': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'adminSearch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Server-owned deterministic search projection used by admin event publishing. Rebuildable from canonical event and organizer fields; not consumed by the app.',
      'required': <Object?>[
        'tokens',
        'sortKey',
        'updatedAt',
        'updatedBySource',
      ],
      'properties': <String, Object?>{
        'tokens': <String, Object?>{
          'type': 'array',
          'maxItems': 120,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 2,
            'maxLength': 80,
            'pattern': '^[a-z0-9-]+\$',
          },
        },
        'sortKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-z0-9-]+(?:-[a-z0-9-]+)*\$',
        },
        'updatedAt': <String, Object?>{
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
        'updatedBySource': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'adminUpdateEventDetails',
            'adminEventSearchBackfill',
          ],
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'synthetic': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo seed marker used for cleanup and diagnostics.',
    },
    'seedPrefix': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed prefix used for cleanup and diagnostics.',
    },
    'scenario': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed scenario name used for cleanup and diagnostics.',
    },
    'demoOps': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo-operations marker used for cleanup and diagnostics.',
    },
    'demoOpsId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Internal demo-operations id used for cleanup and diagnostics.',
    },
    'demoOpsCommand': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'description': 'Internal demo-operations command name used for cleanup and diagnostics.',
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Server creation time of a progressively configured event.',
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
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Latest backend event mutation timestamp when supplied by its owner, including attendance aggregate updates. Legacy events may omit it.',
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
      'x-catch-ownership': 'callable-owned',
    },
    'planChangeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
      'description': 'Monotonic revision for immutable attendee-relevant plan change records. Missing legacy values read as zero.',
    },
    'publicationState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'private',
        'published',
      ],
      'description': 'Explicit publication boundary. Legacy absent values require full rich event data; new progressive events must declare their state.',
      'x-catch-ownership': 'callable-owned',
    },
    'setupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'eventCityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'eventMarketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'eventLocalDate': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}-[0-9]{2}-[0-9]{2}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'eventLocalStartTime': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{2}:[0-9]{2}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'eventTimezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'setupDefaults': <String, Object?>{
      'title': 'EventSetupDefaults',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'city',
        'timezone',
        'organizerDefaultsRevision',
        'organizerDefaultsHash',
      ],
      'properties': <String, Object?>{
        'city': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'value',
            'source',
          ],
          'properties': <String, Object?>{
            'value': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'cityId',
                'marketId',
              ],
              'properties': <String, Object?>{
                'cityId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'marketId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
              },
            },
            'source': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'organizer',
                'event',
              ],
            },
          },
        },
        'timezone': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'value',
            'source',
          ],
          'properties': <String, Object?>{
            'value': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 100,
            },
            'source': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'organizer',
                'event',
              ],
            },
          },
        },
        'organizerDefaultsRevision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'organizerDefaultsHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
      'definitions': <String, Object?>{
        'basicsInput': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'name',
            'city',
            'localDate',
            'localStartTime',
            'timezone',
          ],
          'properties': <String, Object?>{
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'city': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'const': 'inherit',
                      'type': 'string',
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'value',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'const': 'set',
                      'type': 'string',
                    },
                    'value': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'cityId',
                        'marketId',
                      ],
                      'properties': <String, Object?>{
                        'cityId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'marketId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                      },
                    },
                  },
                },
              ],
            },
            'localDate': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{4}-[0-9]{2}-[0-9]{2}\$',
            },
            'localStartTime': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{2}:[0-9]{2}\$',
            },
            'timezone': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'const': 'inherit',
                      'type': 'string',
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'value',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'const': 'set',
                      'type': 'string',
                    },
                    'value': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 100,
                    },
                  },
                },
              ],
            },
            'reviewedDefaultsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'publicRegistrationMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'closed',
        'free',
        'paid',
      ],
      'description': 'Explicit registration capability. Older enabled events without this field support free OTP registration only.',
      'x-catch-ownership': 'callable-owned',
    },
    'publicRegistrationRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
    'firstPublishedAt': <String, Object?>{
      'type': 'object',
      'description': 'First explicit progressive publication. Retained on unpublish so prior schedule commitments cannot be treated as a new draft.',
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
      'x-catch-ownership': 'callable-owned',
    },
    'catchExperienceActivities': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 3,
      'uniqueItems': true,
      'description': 'Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'introductions',
          'sharedActivities',
          'rotations',
        ],
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'publicationState',
        ],
        'properties': <String, Object?>{
          'publicationState': <String, Object?>{
            'const': 'private',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'organizerId',
          'name',
          'eventCityId',
          'eventMarketId',
          'eventLocalDate',
          'eventLocalStartTime',
          'eventTimezone',
          'setupDefaults',
          'setupRevision',
          'publicRegistrationEnabled',
        ],
        'properties': <String, Object?>{
          'publicRegistrationEnabled': <String, Object?>{
            'const': false,
          },
        },
      },
      'else': <String, Object?>{
        'required': <Object?>[
          'clubId',
          'startTime',
          'endTime',
          'meetingPoint',
          'meetingLocation',
          'startingPointLat',
          'startingPointLng',
          'locationDetails',
          'eventFormat',
          'distanceKm',
          'pace',
          'capacityLimit',
          'description',
          'priceInPaise',
          'bookedCount',
          'checkedInCount',
          'waitlistedCount',
          'status',
          'cancelledAt',
          'cancellationReason',
          'constraints',
          'genderCounts',
          'cohortCounts',
          'waitlistedCohortCounts',
          'discoveryMarketId',
          'discoveryCityName',
          'discoveryActivityKind',
          'discoveryGeoCell',
          'discoveryHasOpenSpots',
          'discoveryAvailability',
          'discoveryOpenCohorts',
          'discoveryWaitlistCohorts',
          'discoveryInviteRequired',
          'discoveryMembershipRequired',
          'discoveryManualApprovalRequired',
          'discoveryMinAge',
          'discoveryMaxAge',
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'setupRevision',
        ],
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'publicationState',
          'organizerId',
          'name',
          'eventCityId',
          'eventMarketId',
          'eventLocalDate',
          'eventLocalStartTime',
          'eventTimezone',
          'setupDefaults',
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'publicRegistrationMode',
        ],
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'publicRegistrationRevision',
          'publicRegistrationEnabled',
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'publicRegistrationMode',
        ],
        'properties': <String, Object?>{
          'publicRegistrationMode': <String, Object?>{
            'const': 'closed',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'publicRegistrationEnabled': <String, Object?>{
            'const': false,
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'publicRegistrationMode',
        ],
        'properties': <String, Object?>{
          'publicRegistrationMode': <String, Object?>{
            'enum': <Object?>[
              'free',
              'paid',
            ],
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'publicRegistrationEnabled': <String, Object?>{
            'const': true,
          },
        },
      },
    },
  ],
};
