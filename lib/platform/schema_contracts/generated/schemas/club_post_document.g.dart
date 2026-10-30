// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/club_posts.schema.json.

const schemaClubPostDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/club_posts.schema.json',
  'title': 'ClubPostDocument',
  'description': 'Legacy organizer-post projection stored at clubs/{clubId}/posts/{postId} during the clubs-to-organizers migration.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'club_posts',
  'x-firestore-path': 'clubs/{clubId}/posts/{postId}',
  'x-document-id-field': 'id',
  'x-owner': 'createClubPost callable',
  'required': <Object?>[
    'authorUid',
    'text',
    'audience',
    'createdAt',
    'status',
  ],
  'properties': <String, Object?>{
    'authorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
      'x-catch-ownership': 'callable-owned',
    },
    'photoPath': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 500,
      'x-catch-ownership': 'callable-owned',
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'audience': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'followers',
      ],
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
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'removed',
      ],
      'x-catch-ownership': 'callable-owned',
    },
  },
};
