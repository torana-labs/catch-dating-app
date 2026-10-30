// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_hosts_update_payload.schema.json.

const schemaAdminUpdateSalesAccountCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_hosts_update_payload.schema.json',
  'title': 'Sales hosts.update callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'expectedRevision',
    'patch',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
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
    'patch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'researchStatus': <String, Object?>{
          'enum': <Object?>[
            'new',
            'needs_research',
            'ready_for_review',
            'qualified',
            'benchmark_only',
            'no_fit',
            'archived',
          ],
        },
        'assignedOwnerUid': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'summary': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1200,
        },
        'nextAction': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
      },
    },
  },
};
