// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_group_summaries.schema.json.

const schemaHostGroupSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_group_summaries.schema.json',
  'title': 'HostGroupSummaryDocument',
  'description': 'Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostGroupSummaries',
  'x-firestore-path': 'hostGroupSummaries/{audienceId}',
  'x-document-id-field': 'audienceId',
  'x-owner': 'Host read model projector',
  'required': <Object?>[
    'organizerId',
    'audienceId',
    'status',
    'updatedAtMillis',
    'row',
    'version',
    'searchName',
    'isStatic',
    'lastPreviewAtMillis',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'audienceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'archived',
      ],
      'x-catch-ownership': 'server-only',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'row': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'audienceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'archived',
          ],
        },
        'isStatic': <String, Object?>{
          'type': 'boolean',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'lastPreviewMatchCount': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'lastPreviewAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'updatedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
      'required': <Object?>[
        'organizerId',
        'audienceId',
        'name',
        'status',
        'isStatic',
        'revision',
        'lastPreviewMatchCount',
        'lastPreviewAtMillis',
        'updatedAtMillis',
      ],
      'x-catch-ownership': 'server-only',
    },
    'version': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'searchName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
    },
    'isStatic': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'lastPreviewAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
