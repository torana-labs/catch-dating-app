// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/send_organizer_whatsapp_test_payload.schema.json.

const schemaSendOrganizerWhatsappTestCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/send_organizer_whatsapp_test_payload.schema.json',
  'title': 'SendOrganizerWhatsappTestCallablePayload',
  'description': 'Sends one manager-authorized template message to verify an organizer-owned WhatsApp sender.',
  'x-callable-aliases': <Object?>[
    'sendOrganizerWhatsappTest',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'connectionId',
    'templateId',
    'toE164',
    'templateVariables',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'templateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'toE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'templateVariables': <String, Object?>{
      'type': 'object',
      'maxProperties': 20,
      'propertyNames': <String, Object?>{
        'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
      },
      'additionalProperties': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
    },
  },
};
