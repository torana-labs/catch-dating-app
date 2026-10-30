// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_imports_apply_payload.schema.json.

const schemaAdminApplySalesImportCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_imports_apply_payload.schema.json',
  'title': 'Sales imports.apply callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'previewHash',
    'sourceId',
    'contentHash',
    'mappingVersion',
    'rows',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'previewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
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
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'sourceRowId',
          'organizerId',
          'name',
          'researchStatus',
        ],
        'properties': <String, Object?>{
          'sourceRowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'organizerId': <String, Object?>{
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
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'researchStatus': <String, Object?>{
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
          'summary': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1200,
          },
          'originalScore': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'maxProperties': 12,
                'propertyNames': <String, Object?>{
                  'type': 'string',
                  'maxLength': 64,
                  'pattern': '^[A-Za-z][A-Za-z0-9 _.-]*\$',
                },
                'additionalProperties': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
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
            'type': 'array',
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
                  'maxLength': 160,
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
              },
            },
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
      },
    },
  },
};
