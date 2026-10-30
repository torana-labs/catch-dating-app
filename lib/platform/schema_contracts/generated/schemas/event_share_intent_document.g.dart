// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_share_intents.schema.json.

const schemaEventShareIntentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_share_intents.schema.json',
  'title': 'EventShareIntentDocument',
  'description': 'Evidence that a signed-in actor opened a Catch-owned share surface; it is not proof that a message was sent.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventShareIntents',
  'x-firestore-path': 'eventShareIntents/{intentId}',
  'x-document-id-field': 'intentId',
  'x-owner': 'event share intent callable',
  'required': <Object?>[
    'eventId',
    'organizerId',
    'inviteLinkId',
    'actorUid',
    'actorKind',
    'surface',
    'creativeId',
    'channelHint',
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
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'actorKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'host',
        'attendee',
        'member',
      ],
    },
    'surface': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostApp',
        'consumerApp',
        'runtimeWeb',
      ],
    },
    'creativeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'channelHint': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'systemShare',
        'copyLink',
        'whatsapp',
        'sms',
        'email',
        null,
      ],
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
