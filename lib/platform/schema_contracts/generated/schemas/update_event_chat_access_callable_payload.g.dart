// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_event_chat_access_payload.schema.json.

const schemaUpdateEventChatAccessCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_event_chat_access_payload.schema.json',
  'title': 'UpdateEventChatAccessCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'action',
    'expectedRevision',
    'requestId',
    'termsVersion',
    'expectedUid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'open',
        'close',
        'join',
        'leave',
        'mute',
        'unmute',
        'pause',
        'announcementsOnly',
        'resume',
        'schedule',
        'archive',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'termsVersion': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'event-chat-v1',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'opensAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'closesAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
