// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/request_organizer_form_export_payload.schema.json.

const schemaRequestOrganizerFormExportCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/request_organizer_form_export_payload.schema.json',
  'title': 'RequestOrganizerFormExportCallablePayload',
  'description': 'Idempotent response export request or status refresh.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'requestId',
    'format',
    'statuses',
    'versionId',
    'fromMillis',
    'toMillis',
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
      ],
    },
    'statuses': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'submitted',
          'withdrawn',
        ],
      },
    },
    'versionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'fromMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'toMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'responseQuery': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'QueryOrganizerFormResponsesCallablePayload',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerId',
            'formId',
            'versionId',
            'statuses',
            'predicate',
            'sort',
            'limit',
            'cursor',
          ],
          'properties': <String, Object?>{
            'organizerId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'formId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'versionId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'statuses': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 2,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'submitted',
                  'withdrawn',
                ],
              },
            },
            'predicate': <String, Object?>{
              'type': <Object?>[
                'object',
                'null',
              ],
              'maxProperties': 5,
              'additionalProperties': true,
              'description': 'Published-version-aware compiler validates ALL/ANY tree, operators, value types, sensitive exclusion, depth 3 and maximum 20 leaves before any response scan.',
            },
            'sort': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'questionId',
                'direction',
                'nulls',
              ],
              'properties': <String, Object?>{
                'questionId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'direction': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'asc',
                    'desc',
                  ],
                },
                'nulls': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'first',
                    'last',
                  ],
                },
              },
            },
            'limit': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 100,
            },
            'cursor': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 1000,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Optional exact typed filter and sort. Export covers all matches, not one page.',
    },
    'expectedResultHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Required with responseQuery; changed results fail rather than silently exporting a different set.',
    },
    'expectedQueryHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Required with responseQuery; binds the published definition and filter semantics.',
    },
  },
};
