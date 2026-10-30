// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/complete_organizer_whatsapp_connection_payload.schema.json.

const schemaCompleteOrganizerWhatsappConnectionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/complete_organizer_whatsapp_connection_payload.schema.json',
  'title': 'CompleteOrganizerWhatsappConnectionCallablePayload',
  'description': 'Server-side completion of Meta Embedded Signup using the short-lived authorization code returned to the Host surface.',
  'x-callable-aliases': <Object?>[
    'completeOrganizerWhatsappConnection',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'authorizationCode',
    'wabaId',
    'phoneNumberId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'authorizationCode': <String, Object?>{
      'type': 'string',
      'minLength': 20,
      'maxLength': 2048,
    },
    'wabaId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'businessId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{5,40}\$',
    },
  },
};
