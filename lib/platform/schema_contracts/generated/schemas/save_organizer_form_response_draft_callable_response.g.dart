// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/save_organizer_form_response_draft_response.schema.json.

const schemaSaveOrganizerFormResponseDraftCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/save_organizer_form_response_draft_response.schema.json',
  'title': 'SaveOrganizerFormResponseDraftCallableResponse',
  'description': 'Saved draft revision and expiry.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'revision',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
