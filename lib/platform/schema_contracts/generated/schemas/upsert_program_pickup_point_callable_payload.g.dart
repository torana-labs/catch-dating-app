// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_pickup_point_payload.schema.json.

const schemaUpsertProgramPickupPointCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_pickup_point_payload.schema.json',
  'title': 'UpsertProgramPickupPointCallablePayload',
  'description': 'Create or update a program pickup station such as an airport terminal arrivals zone.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'kind',
    'label',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'pickupPointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
    },
    'active': <String, Object?>{
      'type': 'boolean',
    },
  },
};
