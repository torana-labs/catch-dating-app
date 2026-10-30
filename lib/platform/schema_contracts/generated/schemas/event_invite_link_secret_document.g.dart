// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_invite_link_secrets.schema.json.

const schemaEventInviteLinkSecretDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_invite_link_secrets.schema.json',
  'title': 'EventInviteLinkSecretDocument',
  'description': 'Server-only bearer token material for one event invitation link.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventInviteLinkSecrets',
  'x-firestore-path': 'eventInviteLinkSecrets/{inviteLinkId}',
  'x-document-id-field': 'inviteLinkId',
  'x-owner': 'event invite link callables',
  'required': <Object?>[
    'eventId',
    'organizerId',
    'token',
    'tokenHash',
    'tokenVersion',
    'createdAt',
    'updatedAt',
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
    'token': <String, Object?>{
      'type': 'string',
      'minLength': 32,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'tokenHash': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'tokenVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
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
    'updatedAt': <String, Object?>{
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
