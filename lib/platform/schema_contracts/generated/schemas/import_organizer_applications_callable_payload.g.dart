// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/import_organizer_applications_payload.schema.json.

const schemaImportOrganizerApplicationsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/import_organizer_applications_payload.schema.json',
  'title': 'ImportOrganizerApplicationsCallablePayload',
  'description': 'Commits a bounded provider-neutral tabular application import.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'formVersionId',
    'targetKind',
    'targetId',
    'mappingId',
    'importKey',
    'fileName',
    'format',
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
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizer',
        'event',
        'campaign',
      ],
    },
    'targetId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'mappingId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'importKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'fileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
        'connector',
      ],
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
};
