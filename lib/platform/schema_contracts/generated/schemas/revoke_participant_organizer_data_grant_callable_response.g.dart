// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/revoke_participant_organizer_data_grant_response.schema.json.

const schemaRevokeParticipantOrganizerDataGrantCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/revoke_participant_organizer_data_grant_response.schema.json',
  'title': 'RevokeParticipantOrganizerDataGrantCallableResponse',
  'description': 'Revocation outcome and application revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'revokedAtMillis',
    'revision',
    'replayed',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applicationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revokedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
