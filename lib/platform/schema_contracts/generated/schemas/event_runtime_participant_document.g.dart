// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_runtime_participants.schema.json.

const schemaEventRuntimeParticipantDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_runtime_participants.schema.json',
  'title': 'EventRuntimeParticipantDocument',
  'description': 'Participant-private runtime identity stored at eventRuntimeParticipants/{eventId_uid}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventRuntimeParticipants',
  'x-firestore-path': 'eventRuntimeParticipants/{participantId}',
  'x-document-id-field': 'id',
  'x-owner': 'runtime claim/profile callables; owner get only; no client writes or list access',
  'required': <Object?>[
    'eventId',
    'clubId',
    'organizerId',
    'uid',
    'eventAttendeeId',
    'identityVersion',
    'claimMethod',
    'accessStatus',
    'requiredFieldIds',
    'completedFieldIds',
    'runtimeProfile',
    'consents',
    'claimedAt',
    'readyAt',
    'revokedAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventAttendeeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'identityVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'claimMethod': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'verifiedPhone',
        'signedAttendeeToken',
        'verifiedEmail',
        'hostApproval',
        'catchParticipation',
      ],
    },
    'accessStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pendingApproval',
        'needsInput',
        'ready',
        'optedOut',
        'revoked',
      ],
    },
    'requiredFieldIds': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'displayName',
          'gender',
          'interestedInGenders',
          'relationshipGoal',
          'dateOfBirth',
          'paceBand',
          'skillBand',
          'dietaryAndSeatingNotes',
          'questionnaireAnswerIds',
          'teamName',
        ],
      },
    },
    'completedFieldIds': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'displayName',
          'gender',
          'interestedInGenders',
          'relationshipGoal',
          'dateOfBirth',
          'paceBand',
          'skillBand',
          'dietaryAndSeatingNotes',
          'questionnaireAnswerIds',
          'teamName',
        ],
      },
    },
    'profileRevision': <String, Object?>{
      'description': 'Monotonic accepted runtime-profile submission revision. Legacy documents omit it and read as zero.',
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'runtimeProfile': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayName',
        'gender',
        'interestedInGenders',
        'relationshipGoal',
        'dateOfBirth',
        'paceBand',
        'skillBand',
        'dietaryAndSeatingNotes',
        'questionnaireAnswerIds',
        'teamName',
      ],
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'gender': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'man',
                'woman',
                'nonBinary',
                'other',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'interestedInGenders': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 4,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'man',
              'woman',
              'nonBinary',
              'other',
            ],
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'relationship',
            'casual',
            'marriage',
            'friendship',
            'unsure',
            null,
          ],
        },
        'dateOfBirth': <String, Object?>{
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
        'paceBand': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'competitive',
            'fast',
            'moderate',
            'easy',
            null,
          ],
        },
        'skillBand': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'beginner',
            'intermediate',
            'advanced',
            null,
          ],
        },
        'dietaryAndSeatingNotes': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 300,
        },
        'questionnaireAnswerIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'teamName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
      },
    },
    'consents': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'runtimeTermsVersion',
        'sensitiveDataTermsVersion',
        'saveAsCatchPrefill',
      ],
      'properties': <String, Object?>{
        'runtimeTermsVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'sensitiveDataTermsVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'saveAsCatchPrefill': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'claimedAt': <String, Object?>{
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
    'readyAt': <String, Object?>{
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
    'revokedAt': <String, Object?>{
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
};
