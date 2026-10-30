// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_intelligence_policy_payload.schema.json.

const schemaAdminSalesIntelligencePolicyCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_intelligence_policy_payload.schema.json',
  'title': 'AdminSaveSalesIntelligencePolicyPayload',
  'description': 'Admin Owner exact-retry mutation of a private seven-factor runtime policy; no policy values are published in source.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'expectedRevision',
    'policy',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'policy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'policyId',
        'version',
        'status',
        'factors',
        'priorityBands',
        'promptVersion',
        'playbookVersion',
      ],
      'properties': <String, Object?>{
        'policyId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'version': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'active',
            'paused',
          ],
        },
        'factors': <String, Object?>{
          'type': 'array',
          'minItems': 7,
          'maxItems': 7,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'weight',
              'claimKeys',
              'maxAgeDays',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 96,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'weight': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 100,
              },
              'claimKeys': <String, Object?>{
                'type': 'array',
                'minItems': 1,
                'maxItems': 5,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'identity',
                    'recurrence',
                    'operation',
                    'stack',
                    'other',
                  ],
                },
              },
              'maxAgeDays': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 365,
              },
            },
          },
        },
        'priorityBands': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'high',
            'medium',
          ],
          'properties': <String, Object?>{
            'high': <String, Object?>{
              'type': 'number',
              'minimum': 0,
              'maximum': 100,
            },
            'medium': <String, Object?>{
              'type': 'number',
              'minimum': 0,
              'maximum': 100,
            },
          },
        },
        'promptVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'playbookVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
