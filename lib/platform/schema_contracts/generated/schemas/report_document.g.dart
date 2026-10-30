// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/reports.schema.json.

const schemaReportDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/reports.schema.json',
  'title': 'ReportDocument',
  'description': 'Canonical safety report stored at reports/{reportId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'reports',
  'x-firestore-path': 'reports/{reportId}',
  'x-document-id-field': 'id',
  'x-owner': 'reportUser callable',
  'required': <Object?>[
    'reporterUserId',
    'targetUserId',
    'createdAt',
    'source',
    'status',
  ],
  'properties': <String, Object?>{
    'reporterUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'targetUserId': <String, Object?>{
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
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'open',
        'reviewed',
        'dismissed',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'reasonCode': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'x-catch-ownership': 'callable-owned',
    },
    'contextId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'notes': <String, Object?>{
      'type': 'string',
      'maxLength': 1000,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
