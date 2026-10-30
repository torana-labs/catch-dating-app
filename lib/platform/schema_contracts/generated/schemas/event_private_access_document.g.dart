// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_private_access.schema.json.

const schemaEventPrivateAccessDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_private_access.schema.json',
  'title': 'EventPrivateAccessDocument',
  'description': 'Host-private access material for invite-only events stored at eventPrivateAccess/{eventId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventPrivateAccess',
  'x-firestore-path': 'eventPrivateAccess/{eventId}',
  'x-document-id-field': 'id',
  'x-owner': 'createEvent callable; readable only by the host of the linked event',
  'required': <Object?>[
    'eventId',
    'clubId',
    'inviteCode',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'inviteCode': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 64,
      'pattern': '^[A-Za-z0-9_-]+\$',
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
  },
};
