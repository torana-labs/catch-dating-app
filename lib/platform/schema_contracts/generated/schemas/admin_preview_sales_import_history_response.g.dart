// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_import_history_preview_response.schema.json.

const schemaAdminPreviewSalesImportHistoryResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_import_history_preview_response.schema.json',
  'title': 'AdminSalesImportHistoryPreviewResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'previewHash',
    'rows',
    'packetRowCount',
    'effectsApplied',
  ],
  'properties': <String, Object?>{
    'previewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'sourceRowId',
          'organizerId',
          'status',
          'recordIds',
        ],
        'properties': <String, Object?>{
          'sourceRowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'promoted',
              'skipped',
              'review_needed',
              'duplicate',
            ],
          },
          'recordIds': <String, Object?>{
            'type': 'array',
            'minItems': 0,
            'maxItems': 5,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
      },
    },
    'packetRowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
    },
    'effectsApplied': <String, Object?>{
      'const': false,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminPreviewSalesImportHistory',
  ],
};
