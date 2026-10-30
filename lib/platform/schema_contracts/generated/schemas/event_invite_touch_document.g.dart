// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_invite_touches.schema.json.

const schemaEventInviteTouchDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_invite_touches.schema.json',
  'title': 'EventInviteTouchDocument',
  'description': 'Short-lived privacy-minimized evidence that an invitation URL was resolved.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventInviteTouches',
  'x-firestore-path': 'eventInviteTouches/{touchId}',
  'x-document-id-field': 'touchId',
  'x-owner': 'event invite resolution callable',
  'required': <Object?>[
    'eventId',
    'organizerId',
    'inviteLinkId',
    'touchKind',
    'surface',
    'actorUid',
    'sessionHash',
    'likelyHuman',
    'botReason',
    'attributionEligible',
    'createdAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'touchKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'open',
        'redirect',
      ],
    },
    'surface': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'consumerApp',
        'hostApp',
        'runtimeWeb',
        'marketingWeb',
        'unknown',
      ],
    },
    'actorUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'sessionHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 64,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'likelyHuman': <String, Object?>{
      'type': 'boolean',
    },
    'botReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'previewCrawler',
        'knownBot',
        'missingClientSignal',
        null,
      ],
    },
    'attributionEligible': <String, Object?>{
      'type': 'boolean',
    },
    'createdAt': <String, Object?>{
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
    'expiresAt': <String, Object?>{
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
  },
};
