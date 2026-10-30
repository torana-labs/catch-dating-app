// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_participant_form_profile_payload.schema.json.

const schemaGetParticipantFormProfileCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_participant_form_profile_payload.schema.json',
  'title': 'GetParticipantFormProfileCallablePayload',
  'description': 'Read exact owned prepared form data for profile review.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
