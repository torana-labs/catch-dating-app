// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_pickup_points.schema.json.

const schemaProgramPickupPointDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_pickup_points.schema.json',
  'title': 'ProgramPickupPointDocument',
  'description': 'Server-owned program pickup station such as an airport terminal arrivals zone. Scopes greeter and dispatcher duties and transport grouping.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programPickupPoints',
  'x-firestore-path': 'programPickupPoints/{pickupPointId}',
  'x-document-id-field': 'pickupPointId',
  'x-owner': 'program resource setup callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'kind',
    'label',
    'iataCode',
    'terminal',
    'meetingZone',
    'latitude',
    'longitude',
    'instructions',
    'active',
    'createdAt',
    'updatedAt',
    'revision',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'airport',
        'railway',
        'venue',
        'other',
      ],
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
      'description': 'Station label such as \'DEL T3 arrivals exit 4\'.',
    },
    'iataCode': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'terminal': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 40,
    },
    'meetingZone': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'latitude': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': -90,
      'maximum': 90,
    },
    'longitude': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': -180,
      'maximum': 180,
    },
    'instructions': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'description': 'Guest-facing pickup instructions shown on travel confirmations.',
    },
    'active': <String, Object?>{
      'type': 'boolean',
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
