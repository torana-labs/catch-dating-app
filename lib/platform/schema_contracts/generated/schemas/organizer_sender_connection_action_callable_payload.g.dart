// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/organizer_sender_connection_action_payload.schema.json.

const schemaOrganizerSenderConnectionActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/organizer_sender_connection_action_payload.schema.json',
  'title': 'OrganizerSenderConnectionActionCallablePayload',
  'description': 'Manager action on one organizer-owned messaging connection.',
  'x-callable-aliases': <Object?>[
    'getOrganizerMessagingSetup',
    'syncOrganizerWhatsappTemplates',
    'disconnectOrganizerWhatsappConnection',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
