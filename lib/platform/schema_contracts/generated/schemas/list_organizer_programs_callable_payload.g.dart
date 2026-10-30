// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_programs_payload.schema.json.

const schemaListOrganizerProgramsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_programs_payload.schema.json',
  'title': 'ListOrganizerProgramsCallablePayload',
  'description': 'Manager-scoped listing of an organizer\'s private programs.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'description': 'Optional opaque value from nextCursor. Server verifies current organizer scope and continues after the immutable ordering tuple encoded by that cursor.',
    },
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Optional exact program ID for bounded saved-program confirmation. Organizer authority and document scope are rechecked; cannot be combined with cursor.',
    },
  },
  'not': <String, Object?>{
    'required': <Object?>[
      'cursor',
      'programId',
    ],
  },
};
