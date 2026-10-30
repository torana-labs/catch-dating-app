// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_lodging_source_versions.schema.json.

const schemaProgramLodgingSourceVersionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_lodging_source_versions.schema.json',
  'title': 'ProgramLodgingSourceVersionDocument',
  'description': 'Private transactional revision counters backed by complete canonical source fingerprints. Contains no copied guest or property records. Changes invalidate proposals; publication advances its own domain atomically with canonical stays.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programLodgingSourceVersions',
  'x-firestore-path': 'programLodgingSourceVersions/{programId}',
  'x-document-id-field': 'programId',
  'x-owner': 'private program lodging source reader',
  'required': <Object?>[
    'programId',
    'organizerId',
    'versions',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'versions': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'source',
        'inventory',
        'layout',
        'published',
      ],
      'properties': <String, Object?>{
        'source': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'fingerprint',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'fingerprint': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        'inventory': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'fingerprint',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'fingerprint': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        'layout': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'fingerprint',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'fingerprint': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        'published': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'fingerprint',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'fingerprint': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
  },
};
