// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/rate_limits.schema.json.

const schemaRateLimitDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/rate_limits.schema.json',
  'title': 'RateLimitDocument',
  'description': 'Server-owned callable rate-limit counter stored at rateLimits/{docId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'rateLimits',
  'x-firestore-path': 'rateLimits/{docId}',
  'x-document-id-field': 'docId',
  'x-owner': 'shared callable rate-limit middleware',
  'required': <Object?>[
    'uid',
    'action',
    'windowKey',
    'count',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'action': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
    },
    'windowKey': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'server-only',
    },
    'count': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
  },
};
