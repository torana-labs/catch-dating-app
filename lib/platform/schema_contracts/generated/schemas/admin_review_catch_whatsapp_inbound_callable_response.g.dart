// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_review_catch_whatsapp_inbound_response.schema.json.

const schemaAdminReviewCatchWhatsappInboundCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_review_catch_whatsapp_inbound_response.schema.json',
  'title': 'AdminReviewCatchWhatsappInboundCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'purpose',
    'inboundEventId',
    'inboundText',
    'reviewedInboundTextHash',
    'deadlineMillis',
  ],
  'properties': <String, Object?>{
    'purpose': <String, Object?>{
      'type': 'string',
      'const': 'serviceSupport',
    },
    'inboundEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 69,
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'inboundText': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4096,
    },
    'reviewedInboundTextHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'deadlineMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
