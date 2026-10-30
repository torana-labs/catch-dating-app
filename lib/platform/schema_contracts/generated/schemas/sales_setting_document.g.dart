// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_settings.schema.json.

const schemaSalesSettingDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_settings.schema.json',
  'title': 'SalesSettingDocument',
  'description': 'Private runtime configuration; qualification rule values are not embedded in public source.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesSettings',
  'x-firestore-path': 'salesSettings/{settingId}',
  'x-owner': 'private Sales runtime settings',
  'required': <Object?>[
    'schemaVersion',
    'classification',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'status': <String, Object?>{
      'const': 'active',
    },
    'policyId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'version': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'policyHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'rules': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'ruleId',
          'claimKey',
          'sourceTypes',
          'confidence',
          'minimumCount',
          'distinctSignalIds',
          'distinctSourceRoots',
          'maxAgeDays',
        ],
        'properties': <String, Object?>{
          'ruleId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'claimKey': <String, Object?>{
            'enum': <Object?>[
              'identity',
              'recurrence',
              'operation',
              'stack',
              'other',
            ],
          },
          'sourceTypes': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 4,
            'uniqueItems': true,
            'items': <String, Object?>{
              'enum': <Object?>[
                'first_party',
                'public_web',
                'human_note',
                'import_artifact',
              ],
            },
          },
          'confidence': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 3,
            'uniqueItems': true,
            'items': <String, Object?>{
              'enum': <Object?>[
                'high',
                'medium',
                'low',
              ],
            },
          },
          'minimumCount': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 5,
          },
          'distinctSignalIds': <String, Object?>{
            'type': 'boolean',
          },
          'distinctSourceRoots': <String, Object?>{
            'type': 'boolean',
          },
          'maxAgeDays': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 365,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'normalizedLabels': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'required': <Object?>[
            'status',
            'policyId',
            'version',
            'policyHash',
            'rules',
          ],
          'not': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'required': <Object?>[
                  'normalizedLabels',
                ],
              },
              <String, Object?>{
                'required': <Object?>[
                  'updatedAt',
                ],
              },
            ],
          },
        },
        <String, Object?>{
          'required': <Object?>[
            'normalizedLabels',
            'updatedAt',
          ],
          'not': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'required': <Object?>[
                  'status',
                ],
              },
              <String, Object?>{
                'required': <Object?>[
                  'policyId',
                ],
              },
              <String, Object?>{
                'required': <Object?>[
                  'version',
                ],
              },
              <String, Object?>{
                'required': <Object?>[
                  'policyHash',
                ],
              },
              <String, Object?>{
                'required': <Object?>[
                  'rules',
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};
