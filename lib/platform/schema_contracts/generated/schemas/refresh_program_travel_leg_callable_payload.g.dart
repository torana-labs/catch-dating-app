// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/refresh_program_travel_leg_payload.schema.json.

const schemaRefreshProgramTravelLegCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/refresh_program_travel_leg_payload.schema.json',
  'title': 'RefreshProgramTravelLegCallablePayload',
  'description': 'Manual flight-status refresh for a single travel leg; any active program staff member may request it.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'refreshProgramTravelLeg',
  ],
  'required': <Object?>[
    'programId',
    'legId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'legId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
