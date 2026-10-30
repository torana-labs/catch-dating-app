// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/add_club_host_payload.schema.json.

const schemaAddClubHostCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/add_club_host_payload.schema.json',
  'title': 'AddClubHostCallablePayload',
  'description': 'Callable payload accepted by addClubHost.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
  ],
  'oneOf': <Object?>[
    <String, Object?>{
      'required': <Object?>[
        'uid',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'phoneNumber',
      ],
    },
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'phoneNumber': <String, Object?>{
      'type': 'string',
      'minLength': 6,
      'maxLength': 32,
    },
  },
};
