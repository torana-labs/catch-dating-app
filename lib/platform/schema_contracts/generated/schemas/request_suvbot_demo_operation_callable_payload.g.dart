// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/request_suvbot_demo_operation_payload.schema.json.

const schemaRequestSuvbotDemoOperationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/request_suvbot_demo_operation_payload.schema.json',
  'title': 'RequestSuvbotDemoOperationCallablePayload',
  'description': 'Callable payload accepted by requestSuvbotDemoOperation. Demo-only operations triggered from the Suvbot conversation surface.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'action',
  ],
  'properties': <String, Object?>{
    'action': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'text': <String, Object?>{
      'type': 'string',
      'maxLength': 2000,
    },
  },
};
