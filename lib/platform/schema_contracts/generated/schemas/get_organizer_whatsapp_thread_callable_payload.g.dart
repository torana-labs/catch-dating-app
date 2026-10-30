// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_organizer_whatsapp_thread_payload.schema.json.

const schemaGetOrganizerWhatsappThreadCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_organizer_whatsapp_thread_payload.schema.json',
  'title': 'GetOrganizerWhatsappThreadCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'threadId',
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
  },
};
