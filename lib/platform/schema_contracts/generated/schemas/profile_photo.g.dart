// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/profile_photo.schema.json.

const schemaProfilePhotoSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/profile_photo.schema.json',
  'title': 'ProfilePhoto',
  'description': 'Future canonical profile-photo object that groups display URLs, Firebase Storage object paths, prompt metadata, moderation state, order, and lifecycle timestamps.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'id',
    'url',
    'thumbnailUrl',
    'storagePath',
    'thumbnailStoragePath',
    'position',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'url': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
    'thumbnailUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
    'storagePath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
    'thumbnailStoragePath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
    'prompt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'PhotoPromptAnswer',
          'description': 'One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'photoIndex',
            'promptId',
            'prompt',
          ],
          'properties': <String, Object?>{
            'photoIndex': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'promptId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'prompt': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 140,
            },
            'caption': <String, Object?>{
              'type': 'string',
              'maxLength': 140,
              'deprecated': true,
              'description': 'Legacy user-entered caption retained for compatibility with older documents.',
            },
          },
          'x-catch-catalog': '../catalogs/photo_prompts.json',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'moderation': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'status',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pending',
            'approved',
            'rejected',
          ],
        },
        'reason': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'reviewedAt': <String, Object?>{
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
        },
      },
    },
    'position': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 11,
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
  'definitions': <String, Object?>{
    'storageObjectPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
  },
  'x-storage-metadata': true,
  'x-future-field': 'profilePhotos',
  'x-migration-contract': '../migrations/profile_photos_storage.json',
};
