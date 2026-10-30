// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_upsert_sales_pilot_plan_response.schema.json.

const schemaAdminUpsertSalesPilotPlanResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_upsert_sales_pilot_plan_response.schema.json',
  'title': 'admin_upsert_sales_pilot_plan_response response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'pilotPlan',
    'receipt',
  ],
  'properties': <String, Object?>{
    'pilotPlan': <String, Object?>{
      'title': 'salesPilotPlans document',
      'description': 'Private revisioned pilot scope; no revenue or product activation authority.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesPilotPlans',
      'x-firestore-path': 'salesPilotPlans/{opportunityId}',
      'x-owner': 'private Sales commercial service',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'organizerId',
        'opportunityId',
        'revision',
        'status',
        'workflowId',
        'objective',
        'successMeasures',
        'startsAt',
        'endsAt',
        'reviewEvidence',
        'outcomeEvidence',
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
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'draft',
            'reviewed',
            'active',
            'completed',
            'cancelled',
          ],
        },
        'workflowId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'objective': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'successMeasures': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
        'startsAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'endsAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reviewEvidence': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'contentHash',
                'observedAt',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'contentHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'outcomeEvidence': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'contentHash',
                'observedAt',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'contentHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'updatedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'x-document-id-field': 'opportunityId',
    },
    'receipt': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'revision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
};
