// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/chat_messages.schema.json.

const schemaChatMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/chat_messages.schema.json',
  'title': 'ChatMessageDocument',
  'description': 'Canonical chat message document stored at matches/{matchId}/messages/{messageId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'chat_messages',
  'x-firestore-path': 'matches/{matchId}/messages/{messageId}',
  'x-document-id-field': 'id',
  'x-owner': 'active match participant creates message; triggers own moderation and match preview projections',
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'required': <Object?>[
    'senderId',
    'text',
  ],
  'anyOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'text': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
      },
    },
    <String, Object?>{
      'required': <Object?>[
        'imageUrl',
      ],
      'properties': <String, Object?>{
        'imageUrl': <String, Object?>{
          'type': 'string',
          'format': 'uri',
          'maxLength': 2048,
        },
      },
    },
  ],
  'properties': <String, Object?>{
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'client-writable',
    },
    'text': <String, Object?>{
      'type': 'string',
      'maxLength': 2000,
      'x-catch-ownership': 'client-writable',
    },
    'imageUrl': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'uri',
          'maxLength': 2048,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'client-writable',
    },
    'sentAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'client-writable',
    },
    'synthetic': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo seed marker used for cleanup and diagnostics.',
    },
    'seedPrefix': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed prefix used for cleanup and diagnostics.',
    },
    'scenario': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed scenario name used for cleanup and diagnostics.',
    },
    'demoOps': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo-operations marker used for cleanup and diagnostics.',
    },
    'demoOpsId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Internal demo-operations id used for cleanup and diagnostics.',
    },
    'demoOpsCommand': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'description': 'Internal demo-operations command name used for cleanup and diagnostics.',
    },
  },
};
