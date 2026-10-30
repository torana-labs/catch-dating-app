// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_participant_activity_payload.schema.json.

const schemaGetParticipantActivityCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_participant_activity_payload.schema.json',
  'title': 'GetParticipantActivityCallablePayload',
  'description': 'Read the authenticated account\'s owned form submissions without profile claiming.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sourceKind',
    'sourceId',
  ],
  'properties': <String, Object?>{
    'sourceKind': <String, Object?>{
      'type': 'string',
      'const': 'formResponse',
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
