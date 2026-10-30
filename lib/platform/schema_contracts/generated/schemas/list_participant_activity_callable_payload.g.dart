// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_participant_activity_payload.schema.json.

const schemaListParticipantActivityCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_participant_activity_payload.schema.json',
  'title': 'ListParticipantActivityCallablePayload',
  'description': 'Read the authenticated account\'s owned form submissions without profile claiming.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sourceKind',
    'limit',
    'cursor',
  ],
  'properties': <String, Object?>{
    'sourceKind': <String, Object?>{
      'type': 'string',
      'const': 'formResponse',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 30,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 8192,
    },
  },
};
