// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_application_assets.schema.json.

const schemaOrganizerApplicationAssetDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_application_assets.schema.json',
  'title': 'OrganizerApplicationAssetDocument',
  'description': 'Metadata for a private file uploaded with an organizer application; bytes remain in protected Storage.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerApplicationAssets',
  'x-firestore-path': 'organizerApplicationAssets/{assetId}',
  'x-document-id-field': 'assetId',
  'x-owner': 'organizer application asset upload and moderation callables',
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'responseId',
    'questionId',
    'uploadedByUid',
    'storagePath',
    'originalFileName',
    'contentType',
    'sizeBytes',
    'sha256',
    'status',
    'createdAt',
    'deletedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applicationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'questionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'uploadedByUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'storagePath': <String, Object?>{
      'type': 'string',
      'pattern': '^organizerApplications/[^/]+/[^/]+/[^/]+\$',
      'maxLength': 600,
    },
    'originalFileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'contentType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ],
    },
    'sizeBytes': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10485760,
    },
    'sha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pendingScan',
        'ready',
        'rejected',
        'deleted',
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
    'deletedAt': <String, Object?>{
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
};
