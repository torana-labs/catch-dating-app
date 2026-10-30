// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_review_catch_whatsapp_inbound_payload.schema.json.

const schemaAdminReviewCatchWhatsappInboundCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_review_catch_whatsapp_inbound_payload.schema.json',
  'title': 'AdminReviewCatchWhatsappInboundCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'purpose',
    'inboundEventId',
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
  },
};
