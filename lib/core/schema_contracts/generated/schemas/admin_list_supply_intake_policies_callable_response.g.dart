// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_supply_intake_policies_response.schema.json.

const schemaAdminListSupplyIntakePoliciesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_supply_intake_policies_response.schema.json',
  'title': 'AdminListSupplyIntakePoliciesCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'policies',
  ],
  'properties': <String, Object?>{
    'policies': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'gapId',
          'label',
          'enables',
          'configPath',
          'decisionId',
          'decision',
          'enabled',
          'configCitesDecision',
          'limits',
        ],
        'properties': <String, Object?>{
          'gapId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'enables': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
          'configPath': <String, Object?>{
            'type': 'string',
            'maxLength': 240,
          },
          'decisionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'decision': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'null',
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'decision',
                  'decisionStatus',
                  'note',
                  'reviewedAt',
                ],
                'properties': <String, Object?>{
                  'decision': <String, Object?>{
                    'enum': <Object?>[
                      'accept',
                      'hold',
                      'reject',
                    ],
                  },
                  'decisionStatus': <String, Object?>{
                    'enum': <Object?>[
                      'accepted',
                      'held',
                      'rejected',
                    ],
                  },
                  'note': <String, Object?>{
                    'type': 'string',
                    'maxLength': 1000,
                  },
                  'reviewedAt': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 40,
                  },
                },
              },
            ],
          },
          'enabled': <String, Object?>{
            'type': 'boolean',
            'description': 'Whether the policy file switches the capability on.',
          },
          'configCitesDecision': <String, Object?>{
            'type': 'boolean',
            'description': 'Whether the policy file cites this decision, as switching it on requires.',
          },
          'limits': <String, Object?>{
            'type': 'array',
            'maxItems': 6,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'label',
                'value',
              ],
              'properties': <String, Object?>{
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
                'value': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
          },
        },
      },
    },
  },
};
