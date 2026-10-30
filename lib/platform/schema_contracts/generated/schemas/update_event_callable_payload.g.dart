// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_event_payload.schema.json.

const schemaUpdateEventCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_event_payload.schema.json',
  'title': 'UpdateEventCallablePayload',
  'description': 'Callable payload accepted by updateEvent.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'fields',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'mediaRecovery': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'requestId',
        'expectedMediaHash',
      ],
      'description': 'Media-only attachment for an already committed create. Replays its eventSetupReceipts media receipt; never edits schedule or setup fields.',
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
        },
        'expectedMediaHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 2147483647,
      'description': 'Required for published progressive events; rejects stale Host edits.',
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'startTimeMillis': <String, Object?>{
          'type': 'integer',
        },
        'endTimeMillis': <String, Object?>{
          'type': 'integer',
        },
        'meetingPoint': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
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
        'startingPointLat': <String, Object?>{
          'type': 'number',
          'minimum': -90,
          'maximum': 90,
        },
        'startingPointLng': <String, Object?>{
          'type': 'number',
          'minimum': -180,
          'maximum': 180,
        },
        'locationDetails': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
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
        },
        'distanceKm': <String, Object?>{
          'type': 'number',
          'minimum': 0,
          'maximum': 100,
        },
        'pace': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'easy',
            'moderate',
            'fast',
            'competitive',
          ],
        },
        'description': <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        'publicRegistrationEnabled': <String, Object?>{
          'type': 'boolean',
          'description': 'Host-controlled website OTP registration switch. The event must belong to a published organizer before the public registration callable accepts users.',
        },
        'capacityLimit': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000,
        },
        'priceInPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        'constraints': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
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
        },
        'privateAccess': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'inviteCode': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 4,
              'maxLength': 64,
              'pattern': '^[A-Za-z0-9_-]+\$',
            },
          },
        },
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'mediaRecovery',
        ],
      },
      'then': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'expectedSetupRevision',
          ],
        },
        'properties': <String, Object?>{
          'fields': <String, Object?>{
            'required': <Object?>[
              'photoUrl',
              'eventPhotos',
            ],
            'propertyNames': <String, Object?>{
              'enum': <Object?>[
                'photoUrl',
                'eventPhotos',
              ],
            },
            'properties': <String, Object?>{
              'eventPhotos': <String, Object?>{
                'minItems': 1,
              },
            },
          },
        },
      },
    },
  ],
};
