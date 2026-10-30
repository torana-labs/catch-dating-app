// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/report_user_payload.schema.json.

const schemaReportUserCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/report_user_payload.schema.json',
  'title': 'ReportUserCallablePayload',
  'description': 'Callable payload accepted by reportUser.',
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
      'maxLength': 64,
    },
    'reasonCode': <String, Object?>{
      'type': 'string',
      'maxLength': 64,
    },
    'contextId': <String, Object?>{
      'type': 'string',
      'maxLength': 128,
    },
    'notes': <String, Object?>{
      'type': 'string',
      'maxLength': 2000,
    },
  },
};
