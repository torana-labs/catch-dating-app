// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/sales_demo_setup_response.schema.json.

const schemaSalesDemoSetupCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/sales_demo_setup_response.schema.json',
  'title': 'SalesDemoSetupCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'setupHash',
    'plan',
    'organizerId',
    'formId',
    'editorPath',
    'publicationAuthority',
    'status',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'setupHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'plan': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'requirements',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'manual',
            },
            'requirements': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'minItems': 1,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'requirements',
            'templateId',
            'title',
            'templateVersion',
            'templateHash',
            'materializerVersion',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'template',
            },
            'requirements': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'templateId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            'title': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'templateVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'templateHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'materializerVersion': <String, Object?>{
              'const': 1,
            },
          },
        },
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'formId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'editorPath': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^/host/audience/forms/[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'publicationAuthority': <String, Object?>{
      'const': false,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'manual_setup',
        'claim_required',
        'ready',
        'prepared',
      ],
    },
  },
  'x-callables': <Object?>[
    'getSalesDemoSetup',
    'prepareSalesDemoFormDraft',
  ],
};
