// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_success_plans.schema.json.

const schemaEventSuccessPlanDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_success_plans.schema.json',
  'title': 'EventSuccessPlanDocument',
  'description': 'Host-owned live event-success setup stored at eventSuccessPlans/{eventId}. The event id is the document id and is also stored for cheap validation and reads.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventSuccessPlans',
  'x-firestore-path': 'eventSuccessPlans/{eventId}',
  'x-document-id-field': 'id',
  'x-owner': 'organizer manager direct write; event participants read',
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'required': <Object?>[
    'eventId',
    'clubId',
    'playbookId',
    'selectedModuleIds',
    'targetAttendeeCount',
    'hostGoal',
    'wingmanRequestsEnabled',
    'contextualOpenersEnabled',
    'activeStepIndex',
    'status',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'layoutId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'affinityConstraints': <String, Object?>{
      'type': 'array',
      'maxItems': 300,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'aUid',
          'bUid',
          'value',
          'scope',
        ],
        'properties': <String, Object?>{
          'aUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'bUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'value': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'mustPair',
              'mustSplit',
              'avoidRepeat',
              'neutral',
            ],
          },
          'scope': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'thisRound',
              'pinned',
            ],
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'spatialOverrides': <String, Object?>{
      'type': 'array',
      'maxItems': 300,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'targetPeerUid',
          'layoutUnitId',
          'scope',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'targetPeerUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'layoutUnitId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
          },
          'scope': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'thisRound',
              'pinned',
            ],
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'playbookId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'selectedModuleIds': <String, Object?>{
      'type': 'array',
      'maxItems': 24,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'targetAttendeeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'structureConfig': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'unitKind',
        'unitSize',
        'revealCountdownSeconds',
      ],
      'properties': <String, Object?>{
        'unitKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'wholeGroup',
            'pods',
            'pairs',
            'teams',
            'tables',
          ],
        },
        'unitSize': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000,
        },
        'unitCount': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 200,
        },
        'rotationIntervalMinutes': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 5,
          'maximum': 180,
        },
        'topology': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'set',
            'sequence',
            'adjacency',
          ],
        },
        'resourceCapacity': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'concurrentUnits',
                'resourceLabelId',
                'seatsPerUnit',
              ],
              'properties': <String, Object?>{
                'concurrentUnits': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 200,
                },
                'resourceLabelId': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'court',
                    'table',
                    'lane',
                    'board',
                  ],
                },
                'seatsPerUnit': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 1000,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'revealCountdownSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 60,
        },
        'rotationRepeatStrategy': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'avoid',
            'allowWhenExhausted',
          ],
        },
        'maxPairMeetings': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 10,
        },
        'balanceActivityAttributes': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'paceBand',
              'skillBand',
              'roleBand',
            ],
          },
        },
        'clusterActivityAttributes': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'paceBand',
              'skillBand',
              'roleBand',
            ],
          },
        },
      },
      'allOf': <Object?>[
        <String, Object?>{
          'if': <String, Object?>{
            'required': <Object?>[
              'resourceCapacity',
            ],
            'properties': <String, Object?>{
              'resourceCapacity': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'seatsPerUnit',
                ],
                'properties': <String, Object?>{
                  'seatsPerUnit': <String, Object?>{
                    'type': 'integer',
                  },
                },
              },
            },
          },
          'then': <String, Object?>{
            'required': <Object?>[
              'topology',
            ],
            'properties': <String, Object?>{
              'topology': <String, Object?>{
                'const': 'adjacency',
              },
            },
          },
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'assignmentFeatureRules': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'featureId',
          'formId',
          'versionId',
          'questionId',
          'transformVersion',
          'kind',
          'mode',
          'weight',
        ],
        'properties': <String, Object?>{
          'featureId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'versionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'transformVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'category',
              'set',
              'number',
              'ordinal',
            ],
          },
          'mode': <String, Object?>{
            'enum': <Object?>[
              'preferSimilar',
              'preferDifferent',
              'balanceAcrossGroups',
            ],
          },
          'weight': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
          },
          'optionIds': <String, Object?>{
            'type': 'array',
            'maxItems': 40,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'scoreByOptionId': <String, Object?>{
            'type': 'object',
            'maxProperties': 40,
            'propertyNames': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'additionalProperties': <String, Object?>{
              'type': 'number',
            },
          },
          'minimum': <String, Object?>{
            'type': 'number',
          },
          'maximum': <String, Object?>{
            'type': 'number',
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'assignmentFeatureRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
    'assignmentFeatureRequestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'assignmentFeatureConfigHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'hostGoal': <String, Object?>{
      'type': 'string',
      'maxLength': 300,
      'x-catch-ownership': 'callable-owned',
    },
    'wingmanRequestsEnabled': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'contextualOpenersEnabled': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'compatibilityAffectsRanking': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'questionnaireConfig': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'templateId',
      ],
      'properties': <String, Object?>{
        'templateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'customTitle': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'customQuestions': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'prompt',
              'options',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'prompt': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
              'options': <String, Object?>{
                'type': 'array',
                'minItems': 2,
                'maxItems': 5,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'id',
                    'label',
                  ],
                  'properties': <String, Object?>{
                    'id': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 120,
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
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'conversationGraphConsentMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'optIn',
        'optOut',
      ],
      'description': 'Whether assigned attendees begin unselected or preselected in the end-of-event conversation graph. Missing legacy values resolve to optIn.',
      'x-catch-ownership': 'callable-owned',
    },
    'activeStepIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'liveControlRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'assignmentDraftRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'publishedRotationRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': -1,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'publishedRevealRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': -1,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'setup',
        'live',
        'complete',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'revealStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'idle',
        'countingDown',
        'revealed',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'activeRevealRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'revealStartedAt': <String, Object?>{
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
    'attendeePrompt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 300,
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'frozenAt': <String, Object?>{
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
    'completedAt': <String, Object?>{
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
  },
};
