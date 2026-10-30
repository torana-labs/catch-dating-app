// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_send_catch_whatsapp_reply_response.schema.json.

const schemaAdminSendCatchWhatsappReplyCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_send_catch_whatsapp_reply_response.schema.json',
  'title': 'AdminSendCatchWhatsappReplyCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'operationId',
    'providerMessageId',
    'deliveryStatus',
    'replayed',
  ],
  'properties': <String, Object?>{
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 72,
      'pattern': '^cwreply_[a-f0-9]{64}\$',
    },
    'providerMessageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^[^\\s\\u0000-\\u001f]+\$',
    },
    'deliveryStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed',
      ],
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
