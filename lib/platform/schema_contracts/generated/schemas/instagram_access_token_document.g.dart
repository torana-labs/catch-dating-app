// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/instagram_access_tokens.schema.json.

const schemaInstagramAccessTokenDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/instagram_access_tokens.schema.json',
  'title': 'InstagramAccessTokenDocument',
  'description': 'Server-only pointer to the renewed Instagram Login access token for Catch\'s Instagram account, stored at instagramAccessTokens/{accountId}. The token itself stays in Secret Manager: secretVersion names the exact CATCH_INSTAGRAM_ACCESS_TOKEN version that holds it. refreshInstagramAccessToken writes it; instagramClaimWebhook reads that version while it is unexpired and otherwise uses the version pinned at deploy.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'instagramAccessTokens',
  'x-firestore-path': 'instagramAccessTokens/{accountId}',
  'x-document-id-field': 'accountId',
  'x-owner': 'refreshInstagramAccessToken',
  'required': <Object?>[
    'accountId',
    'secretVersion',
    'expiresAt',
    'refreshedAt',
    'lastAttemptAt',
    'lastErrorCode',
    'revision',
  ],
  'properties': <String, Object?>{
    'accountId': <String, Object?>{
      'description': 'Catch\'s Instagram professional account id, the webhook\'s entry.id.',
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
      'x-catch-ownership': 'server-only',
    },
    'secretVersion': <String, Object?>{
      'description': 'Exact Secret Manager version holding the renewed token, or null when no renewed token is usable.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^projects/[a-z0-9-]+/secrets/CATCH_INSTAGRAM_ACCESS_TOKEN/versions/[1-9][0-9]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'expiresAt': <String, Object?>{
      'description': 'When Meta said the renewed token expires.',
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
      'x-catch-ownership': 'server-only',
    },
    'refreshedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'lastAttemptAt': <String, Object?>{
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
    'lastErrorCode': <String, Object?>{
      'description': 'Why the last renewal failed, or null after a success.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'refreshRejected',
            'refreshFailed',
            'accountMismatch',
            'secretWriteFailed',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
