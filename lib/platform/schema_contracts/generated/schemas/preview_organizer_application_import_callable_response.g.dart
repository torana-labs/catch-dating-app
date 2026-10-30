// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/preview_organizer_application_import_response.schema.json.

const schemaPreviewOrganizerApplicationImportCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/preview_organizer_application_import_response.schema.json',
  'title': 'PreviewOrganizerApplicationImportCallableResponse',
  'description': 'Safe import preview with deterministic mapping suggestions and bounded row errors.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formVersionId',
    'columns',
    'sampleRows',
    'rowCount',
    'validRowCount',
    'invalidRowCount',
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
    'columns': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'headerIndex',
          'header',
          'questionId',
          'questionLabel',
          'suggestionConfidence',
        ],
        'properties': <String, Object?>{
          'headerIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 99,
          },
          'header': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'questionId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'questionLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 240,
          },
          'suggestionConfidence': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'explicit',
              'exact',
              'alias',
              'none',
            ],
          },
        },
      },
    },
    'sampleRows': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'displayName',
          'errors',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'displayName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'errors': <String, Object?>{
            'type': 'array',
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'questionId',
                'code',
                'message',
              ],
              'properties': <String, Object?>{
                'questionId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
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
        },
      },
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
    'validRowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
    'invalidRowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
  },
  'definitions': <String, Object?>{
    'column': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'headerIndex',
        'header',
        'questionId',
        'questionLabel',
        'suggestionConfidence',
      ],
      'properties': <String, Object?>{
        'headerIndex': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 99,
        },
        'header': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'questionId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 120,
        },
        'questionLabel': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 240,
        },
        'suggestionConfidence': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'explicit',
            'exact',
            'alias',
            'none',
          ],
        },
      },
    },
    'error': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'questionId',
        'code',
        'message',
      ],
      'properties': <String, Object?>{
        'questionId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
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
    'row': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'rowId',
        'displayName',
        'errors',
      ],
      'properties': <String, Object?>{
        'rowId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'displayName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'errors': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'questionId',
              'code',
              'message',
            ],
            'properties': <String, Object?>{
              'questionId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
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
      },
    },
  },
};
