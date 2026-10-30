// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_send_catch_whatsapp_reply_payload.schema.json.

const schemaAdminSendCatchWhatsappReplyCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_send_catch_whatsapp_reply_payload.schema.json',
  'title': 'AdminSendCatchWhatsappReplyCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'purpose',
    'inboundEventId',
    'reviewedInboundTextHash',
    'confirmSupportRequest',
    'body',
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
    'reviewedInboundTextHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'confirmSupportRequest': <String, Object?>{
      'type': 'boolean',
      'const': true,
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4096,
    },
  },
};
