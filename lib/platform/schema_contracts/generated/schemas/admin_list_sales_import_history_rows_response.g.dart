// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_import_history_rows_list_response.schema.json.

const schemaAdminListSalesImportHistoryRowsResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_import_history_rows_list_response.schema.json',
  'title': 'AdminSalesImportHistoryRowsListResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'schemaVersion',
          'classification',
          'sourceId',
          'sourceRowId',
          'sourceContentHash',
          'importId',
          'organizerId',
          'promotionVersion',
          'rowId',
          'disposition',
          'reason',
          'recordIds',
          'reviewHash',
          'reviewedAt',
          'reviewedBy',
        ],
        'properties': <String, Object?>{
          'schemaVersion': <String, Object?>{
            'const': 1,
          },
          'classification': <String, Object?>{
            'const': 'sales_private',
          },
          'sourceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'sourceRowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'sourceContentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'importId': <String, Object?>{
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
          'promotionVersion': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'disposition': <String, Object?>{
            'enum': <Object?>[
              'promoted',
              'skipped',
              'review_needed',
            ],
          },
          'reason': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 300,
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
          'reviewHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'reviewedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
            'maxLength': 48,
          },
          'reviewedBy': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'x-callable-aliases': <Object?>[
    'adminListSalesImportHistoryRows',
  ],
};
