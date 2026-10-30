// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/act_on_event_chat_message_payload.schema.json.

const schemaActOnEventChatMessageCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/act_on_event_chat_message_payload.schema.json',
  'title': 'ActOnEventChatMessageCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedUid',
    'messageId',
    'action',
    'reasonCode',
    'requestId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'report',
        'block',
        'remove',
      ],
    },
    'reasonCode': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'harassment',
            'spam',
            'inappropriate',
            'other',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
  },
};
