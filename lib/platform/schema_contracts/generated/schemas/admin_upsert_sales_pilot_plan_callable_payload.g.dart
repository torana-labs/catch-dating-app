// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_upsert_sales_pilot_plan_payload.schema.json.

const schemaAdminUpsertSalesPilotPlanCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_upsert_sales_pilot_plan_payload.schema.json',
  'title': 'commercial.pilots.upsert request',
  'description': 'Strict private Sales commercial request; current role, scope, revision and evidence policy are transactional.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'opportunityId',
    'requestId',
    'expectedRevision',
    'plan',
  ],
  'properties': <String, Object?>{
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'plan': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'workflowId',
        'objective',
        'successMeasures',
        'startsAt',
        'endsAt',
        'reviewEvidence',
        'outcomeEvidence',
      ],
      'properties': <String, Object?>{
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
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
              },
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
