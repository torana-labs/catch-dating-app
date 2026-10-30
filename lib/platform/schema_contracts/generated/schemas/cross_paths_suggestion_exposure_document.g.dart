// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/cross_paths_suggestion_exposures.schema.json.

const schemaCrossPathsSuggestionExposureDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/cross_paths_suggestion_exposures.schema.json',
  'title': 'CrossPathsSuggestionExposureDocument',
  'description': 'Server-only, session-idempotent Cross Paths exposure receipt used for ranking fatigue. It contains no private preference values or roster projection.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'crossPathsSuggestionExposures',
  'x-firestore-path': 'crossPathsSuggestionExposures/{exposureId}',
  'x-document-id-field': 'id',
  'x-owner': 'getCrossPathsSuggestions callable',
  'required': <Object?>[
    'viewerUid',
    'candidateUid',
    'eventId',
    'sessionIdHash',
    'rankingVersion',
    'shownAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'viewerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'candidateUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'sessionIdHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'rankingVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'server-only',
    },
    'shownAt': <String, Object?>{
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
