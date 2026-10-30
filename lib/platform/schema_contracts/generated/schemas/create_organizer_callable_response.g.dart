// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_organizer_response.schema.json.

const schemaCreateOrganizerCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_organizer_response.schema.json',
  'title': 'CreateOrganizerCallableResponse',
  'description': 'Callable response returned by createOrganizer.',
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
  },
};
