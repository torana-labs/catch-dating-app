// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_action_executions_payload.schema.json.

const schemaAdminListActionExecutionsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_action_executions_payload.schema.json',
  'title': 'AdminListActionExecutionsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
