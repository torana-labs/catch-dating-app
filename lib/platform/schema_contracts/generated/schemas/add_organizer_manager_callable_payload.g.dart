// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/add_organizer_manager_payload.schema.json.

const schemaAddOrganizerManagerCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/add_organizer_manager_payload.schema.json',
  'title': 'AddOrganizerManagerCallablePayload',
  'description': 'Callable payload accepted by addOrganizerManager.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
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
    'phoneNumber': <String, Object?>{
      'type': 'string',
      'minLength': 6,
      'maxLength': 32,
    },
  },
};
