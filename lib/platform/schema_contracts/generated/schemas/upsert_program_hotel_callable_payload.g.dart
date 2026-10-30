// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_hotel_payload.schema.json.

const schemaUpsertProgramHotelCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_hotel_payload.schema.json',
  'title': 'UpsertProgramHotelCallablePayload',
  'description': 'Create or update a program accommodation property.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'name',
    'address',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'hotelId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'address': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 300,
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
    'receptionContact': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'notes': <String, Object?>{
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
