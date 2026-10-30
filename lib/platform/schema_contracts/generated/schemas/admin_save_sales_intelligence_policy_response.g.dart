// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_intelligence_policy_response.schema.json.

const schemaAdminSaveSalesIntelligencePolicyResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_intelligence_policy_response.schema.json',
  'title': 'AdminSaveSalesIntelligencePolicyResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'policy',
  ],
  'properties': <String, Object?>{
    'policy': <String, Object?>{
      'title': 'SalesIntelligencePolicyDocument',
      'description': 'Private, owner-reviewed, versioned fit and priority policy. No production weights are checked into source.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesIntelligencePolicies',
      'x-firestore-path': 'salesIntelligencePolicies/{policyRecordId}',
      'x-document-id-field': 'policyRecordId',
      'x-owner': 'private Sales intelligence policy callable',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'policyRecordId',
        'policyId',
        'revision',
        'version',
        'status',
        'factors',
        'priorityBands',
        'promptVersion',
        'playbookVersion',
        'updatedAt',
        'updatedBy',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'policyRecordId': <String, Object?>{
          'const': 'current',
        },
        'policyId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
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
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'updatedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    },
  },
  'x-callable-aliases': <Object?>[
    'adminSaveSalesIntelligencePolicy',
  ],
};
