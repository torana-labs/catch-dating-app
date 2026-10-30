// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_organizer_form_payment_connection_payload.schema.json.

const schemaManageOrganizerFormPaymentConnectionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_organizer_form_payment_connection_payload.schema.json',
  'title': 'ManageOrganizerFormPaymentConnectionCallablePayload',
  'description': 'Manager-only merchant connection setup, safe listing, credential refresh, and local disconnection.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'action',
    'connectionId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'begin',
        'list',
        'disconnect',
        'refresh',
      ],
    },
    'connectionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^rpc_[a-f0-9]{32}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
