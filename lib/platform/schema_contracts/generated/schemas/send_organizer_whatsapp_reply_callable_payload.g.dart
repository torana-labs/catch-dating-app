// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/send_organizer_whatsapp_reply_payload.schema.json.

const schemaSendOrganizerWhatsappReplyCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/send_organizer_whatsapp_reply_payload.schema.json',
  'title': 'SendOrganizerWhatsappReplyCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'threadId',
    'body',
    'expectedLastInboundAtMillis',
    'idempotencyKey',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'threadId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4096,
    },
    'expectedLastInboundAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
  },
};
