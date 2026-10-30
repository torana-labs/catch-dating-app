// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/withdraw_participant_messaging_permission_payload.schema.json.

const schemaWithdrawParticipantMessagingPermissionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/withdraw_participant_messaging_permission_payload.schema.json',
  'title': 'WithdrawParticipantMessagingPermissionCallablePayload',
  'description': 'Withdraw exactly one sender’s WhatsApp permission using the reviewed receipt. Never grants consent.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'scope',
    'organizerId',
    'expectedReceiptId',
    'requestId',
  ],
  'properties': <String, Object?>{
    'scope': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catch',
        'organizer',
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'purpose': <String, Object?>{
      'description': 'Omit for sender-wide withdrawal. Scope one purpose without changing the other.',
      'type': 'string',
      'enum': <Object?>[
        'eventOperations',
        'marketing',
      ],
    },
    'expectedReceiptId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
