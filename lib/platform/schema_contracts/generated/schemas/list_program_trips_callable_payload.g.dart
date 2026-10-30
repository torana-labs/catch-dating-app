// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_program_trips_payload.schema.json.

const schemaListProgramTripsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_program_trips_payload.schema.json',
  'title': 'ListProgramTripsCallablePayload',
  'description': 'Scoped trip ledger page, ordered by departure time descending.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
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
      'maxLength': 180,
      'description': 'Opaque cursor returned by the previous page.',
      'minLength': 1,
      'pattern': '^[^/]+\$',
    },
  },
};
