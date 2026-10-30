// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/withdraw_organizer_form_response_response.schema.json.

const schemaWithdrawOrganizerFormResponseCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/withdraw_organizer_form_response_response.schema.json',
  'title': 'WithdrawOrganizerFormResponseCallableResponse',
  'description': 'Withdrawn response state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
    'status',
    'withdrawnAtMillis',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'const': 'withdrawn',
    },
    'withdrawnAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
