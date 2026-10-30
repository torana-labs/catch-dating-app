// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/import_organizer_applications_response.schema.json.

const schemaImportOrganizerApplicationsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/import_organizer_applications_response.schema.json',
  'title': 'ImportOrganizerApplicationsCallableResponse',
  'description': 'Result receipt for a committed organizer application import.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'status',
    'rowCount',
    'createdCount',
    'skippedCount',
    'errors',
    'replayed',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'completed',
        'partial',
        'failed',
      ],
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
    'createdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
    'skippedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
    'errors': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'code',
          'message',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'code': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'message': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
      },
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
