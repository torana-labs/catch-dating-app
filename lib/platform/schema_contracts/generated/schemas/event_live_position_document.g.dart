// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_live_positions.schema.json.

const schemaEventLivePositionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_live_positions.schema.json',
  'title': 'EventLivePositionDocument',
  'description': 'Server-owned, short-lived Host or operator position for one moving event. Attendee positions are never collected.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventLivePositions',
  'x-firestore-path': 'eventLivePositions/{positionId}',
  'x-document-id-field': 'id',
  'x-owner': 'event live-position callable',
  'required': <Object?>[
    'eventId',
    'clubId',
    'organizerId',
    'uid',
    'role',
    'latitude',
    'longitude',
    'accuracyMeters',
    'headingDegrees',
    'recordedAt',
    'expiresAt',
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
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'role': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'host',
        'operator',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'latitude': <String, Object?>{
      'type': 'number',
      'minimum': -90,
      'maximum': 90,
      'x-catch-ownership': 'callable-owned',
    },
    'longitude': <String, Object?>{
      'type': 'number',
      'minimum': -180,
      'maximum': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'accuracyMeters': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'maximum': 10000,
      'x-catch-ownership': 'callable-owned',
    },
    'headingDegrees': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'exclusiveMaximum': 360,
      'x-catch-ownership': 'callable-owned',
    },
    'recordedAt': <String, Object?>{
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
  },
};
