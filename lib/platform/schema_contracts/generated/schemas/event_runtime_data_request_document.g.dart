// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_runtime_data_requests.schema.json.

const schemaEventRuntimeDataRequestDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_runtime_data_requests.schema.json',
  'title': 'EventRuntimeDataRequestDocument',
  'description': 'Current source-fenced request for missing event-scoped runtime profile data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventRuntimeDataRequests',
  'x-firestore-path': 'eventRuntimeDataRequests/{requestId}',
  'x-document-id-field': 'requestId',
  'x-owner': 'server-only Event Runtime required-data coordinator',
  'required': <Object?>[
    'schemaVersion',
    'requestId',
    'eventId',
    'organizerId',
    'attendeeId',
    'uid',
    'revision',
    'profileRevision',
    'sourceHash',
    'operationId',
    'fieldIds',
    'completedFieldIds',
    'status',
    'requestedBy',
    'requestedAt',
    'expiresAt',
    'completedAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fieldIds': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'minItems': 1,
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
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'completed',
      ],
    },
    'requestedBy': <String, Object?>{
      'type': 'string',
      'const': 'systemWithinPolicy',
    },
    'requestedAt': <String, Object?>{
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
    'expiresAt': <String, Object?>{
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
