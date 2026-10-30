// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_import_history_list_response.schema.json.

const schemaAdminListSalesImportHistoryResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_import_history_list_response.schema.json',
  'title': 'AdminSalesImportHistoryListResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'records',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'records': <String, Object?>{
      'type': 'array',
      'minItems': 0,
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
          'recordId',
          'kind',
          'sourceColumn',
          'sourceValue',
          'occurredAt',
          'dateSourceColumn',
          'dateSourceValue',
          'contentHash',
          'recordedAt',
          'recordedBy',
          'providerConfirmed',
          'currentFitAuthority',
          'contactAuthority',
          'sendAuthority',
          'relativeChronology',
          'dateCertainty',
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
          'recordId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'activity',
              'observation',
              'benchmark',
            ],
          },
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
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'recordedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
            'maxLength': 48,
          },
          'recordedBy': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'providerConfirmed': <String, Object?>{
            'const': false,
          },
          'currentFitAuthority': <String, Object?>{
            'const': false,
          },
          'contactAuthority': <String, Object?>{
            'const': false,
          },
          'sendAuthority': <String, Object?>{
            'const': false,
          },
          'relativeChronology': <String, Object?>{
            'enum': <Object?>[
              'first_touch',
              'last_touch',
              'unspecified',
            ],
          },
          'dateCertainty': <String, Object?>{
            'enum': <Object?>[
              'source_exact',
              'unknown',
            ],
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
    'adminListSalesImportHistory',
  ],
};
