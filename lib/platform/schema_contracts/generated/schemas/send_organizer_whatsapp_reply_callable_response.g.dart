// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/send_organizer_whatsapp_reply_response.schema.json.

const schemaSendOrganizerWhatsappReplyCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/send_organizer_whatsapp_reply_response.schema.json',
  'title': 'SendOrganizerWhatsappReplyCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'threadId',
    'messageId',
    'providerMessageId',
    'sentAtMillis',
    'replayed',
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
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'providerMessageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sentAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
