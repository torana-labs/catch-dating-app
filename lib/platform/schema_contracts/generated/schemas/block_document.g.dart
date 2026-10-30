// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/blocks.schema.json.

const schemaBlockDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/blocks.schema.json',
  'title': 'BlockDocument',
  'description': 'Canonical safety block edge stored at blocks/{blockId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'blocks',
  'x-firestore-path': 'blocks/{blockId}',
  'x-document-id-field': 'id',
  'x-owner': 'safety callables and block trigger',
  'required': <Object?>[
    'blockerUserId',
    'blockedUserId',
    'createdAt',
    'source',
  ],
  'properties': <String, Object?>{
    'blockerUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'blockedUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'profile',
        'chat',
        'match',
        'support',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'reasonCode': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
