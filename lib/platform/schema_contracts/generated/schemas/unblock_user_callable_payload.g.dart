// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/unblock_user_payload.schema.json.

const schemaUnblockUserCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/unblock_user_payload.schema.json',
  'title': 'UnblockUserCallablePayload',
  'description': 'Callable payload accepted by unblockUser.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetUserId',
  ],
  'properties': <String, Object?>{
    'targetUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
