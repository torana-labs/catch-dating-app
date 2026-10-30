// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/preview_organizer_application_import_payload.schema.json.

const schemaPreviewOrganizerApplicationImportCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/preview_organizer_application_import_payload.schema.json',
  'title': 'PreviewOrganizerApplicationImportCallablePayload',
  'description': 'Provider-neutral tabular application preview after local CSV or XLSX decoding.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formVersionId',
    'headers',
    'mappings',
    'rows',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'headers': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
    },
    'mappings': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'headerIndex',
          'questionId',
          'transform',
        ],
        'properties': <String, Object?>{
          'headerIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 99,
          },
          'questionId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'transform': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'identity',
              'trim',
              'e164',
              'isoDate',
              'number',
              'boolean',
              'splitOptions',
              'assetUrl',
            ],
          },
        },
      },
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'values',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'values': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 100,
            'items': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 4000,
            },
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'headers': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
    },
    'mappings': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'headerIndex',
          'questionId',
          'transform',
        ],
        'properties': <String, Object?>{
          'headerIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 99,
          },
          'questionId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'transform': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'identity',
              'trim',
              'e164',
              'isoDate',
              'number',
              'boolean',
              'splitOptions',
              'assetUrl',
            ],
          },
        },
      },
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'values',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'values': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 100,
            'items': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 4000,
            },
          },
        },
      },
    },
  },
};
