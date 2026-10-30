// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_import_rows.schema.json.

const schemaSalesImportRowDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_import_rows.schema.json',
  'title': 'SalesImportRowDocument',
  'description': 'Unique source-row lineage for successfully matched or created reviewed rows; rowKey is a source ID and row ID hash.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesImportRows',
  'x-firestore-path': 'salesImportRows/{rowKey}',
  'x-owner': 'private Sales import service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'importId',
    'sourceId',
    'sourceRowId',
    'sourceContentHash',
    'mappingVersion',
    'organizerId',
    'disposition',
    'reason',
    'originalScore',
    'originalResearchStatus',
    'originalSummary',
    'importedAt',
    'importedBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'importId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceRowId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'mappingVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'disposition': <String, Object?>{
      'enum': <Object?>[
        'created',
        'matched',
        'duplicate',
        'unresolved',
        'rejected',
      ],
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'originalScore': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'maxProperties': 12,
          'propertyNames': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 64,
            'pattern': '^[A-Za-z][A-Za-z0-9 _.-]*\$',
          },
          'additionalProperties': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 0,
                'maxLength': 500,
              },
              <String, Object?>{
                'type': 'number',
              },
              <String, Object?>{
                'type': 'boolean',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'originalCells': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 60,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'column',
              'value',
            ],
            'properties': <String, Object?>{
              'column': <String, Object?>{
                'type': 'string',
                'minLength': 0,
                'maxLength': 160,
              },
              'value': <String, Object?>{
                'type': 'string',
                'minLength': 0,
                'maxLength': 2000,
              },
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'originalResearchStatus': <String, Object?>{
      'enum': <Object?>[
        'new',
        'needs_research',
        'ready_for_review',
        'qualified',
        'benchmark_only',
        'no_fit',
        'archived',
      ],
    },
    'originalSummary': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 1200,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'importedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'importedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'cohortIds': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 96,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
  },
};
