// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/moderation_flags.schema.json.

const schemaModerationFlagDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/moderation_flags.schema.json',
  'title': 'ModerationFlagDocument',
  'description': 'Canonical moderation ticket stored at moderationFlags/{flagId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'moderationFlags',
  'x-firestore-path': 'moderationFlags/{flagId}',
  'x-document-id-field': 'id',
  'x-owner': 'moderation triggers',
  'required': <Object?>[
    'targetUserId',
    'flagType',
    'source',
    'status',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'targetUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'trigger-owned',
    },
    'flagType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'explicit_photo',
        'banned_text',
        'underage_content',
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'profile_photo',
        'club_image',
        'chat_message',
        'user_bio',
        'club_description',
        'review_comment',
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'reviewed',
        'dismissed',
      ],
      'x-catch-ownership': 'trigger-owned',
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
      'x-catch-ownership': 'trigger-owned',
    },
    'reviewedAt': <String, Object?>{
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
      'x-catch-ownership': 'trigger-owned',
    },
    'contextId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'trigger-owned',
    },
    'context': <String, Object?>{
      'type': 'string',
      'maxLength': 1000,
      'x-catch-ownership': 'trigger-owned',
    },
    'safeSearchResults': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'string',
      },
      'x-catch-ownership': 'trigger-owned',
    },
  },
};
