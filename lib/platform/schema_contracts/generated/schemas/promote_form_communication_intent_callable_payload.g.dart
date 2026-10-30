// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/promote_form_communication_intent_payload.schema.json.

const schemaPromoteFormCommunicationIntentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/promote_form_communication_intent_payload.schema.json',
  'title': 'PromoteFormCommunicationIntentCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
    'withdrawalToken',
    'requestId',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'withdrawalToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
