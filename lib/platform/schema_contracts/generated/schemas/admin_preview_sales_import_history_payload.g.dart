// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_import_history_preview_payload.schema.json.

const schemaAdminPreviewSalesImportHistoryPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_import_history_preview_payload.schema.json',
  'title': 'AdminSalesImportHistoryPreviewPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sourceId',
    'contentHash',
    'mappingVersion',
    'promotionVersion',
    'rows',
  ],
  'properties': <String, Object?>{
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'mappingVersion': <String, Object?>{
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
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'importId',
          'sourceRowId',
          'organizerId',
          'disposition',
          'reason',
          'entries',
        ],
        'properties': <String, Object?>{
          'importId': <String, Object?>{
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
          'organizerId': <String, Object?>{
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
          'entries': <String, Object?>{
            'type': 'array',
            'minItems': 0,
            'maxItems': 5,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'sourceColumn',
                'sourceValue',
                'kind',
                'occurredAt',
                'dateSourceColumn',
                'dateSourceValue',
              ],
              'properties': <String, Object?>{
                'sourceColumn': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'sourceValue': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'kind': <String, Object?>{
                  'enum': <Object?>[
                    'activity',
                    'observation',
                    'benchmark',
                  ],
                },
                'occurredAt': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'dateSourceColumn': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'dateSourceValue': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminPreviewSalesImportHistory',
  ],
};
