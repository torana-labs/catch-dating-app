// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_nominate_organizer_response.schema.json.

const schemaAdminNominateOrganizerCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_nominate_organizer_response.schema.json',
  'title': 'AdminNominateOrganizerCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'created',
    'status',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^nom-[a-f0-9]{40}\$',
    },
    'created': <String, Object?>{
      'type': 'boolean',
    },
    'status': <String, Object?>{
      'const': 'queued',
    },
  },
};
