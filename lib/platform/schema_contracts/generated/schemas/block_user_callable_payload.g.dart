// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/block_user_payload.schema.json.

const schemaBlockUserCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/block_user_payload.schema.json',
  'title': 'BlockUserCallablePayload',
  'description': 'Callable payload accepted by blockUser.',
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
    'source': <String, Object?>{
      'type': 'string',
      'maxLength': 80,
    },
    'reasonCode': <String, Object?>{
      'type': 'string',
      'maxLength': 80,
    },
  },
};
