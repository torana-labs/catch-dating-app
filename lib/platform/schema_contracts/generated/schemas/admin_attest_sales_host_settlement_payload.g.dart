// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_attest_sales_host_settlement_payload.schema.json.

const schemaAdminAttestSalesHostSettlementPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_attest_sales_host_settlement_payload.schema.json',
  'title': 'commercial.finance.attest request',
  'description': 'Strict private Sales commercial request; current role, scope, revision and evidence policy are transactional.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'opportunityId',
    'requestId',
    'expectedQuoteRevision',
    'termVersion',
    'amountMinor',
    'currency',
    'purpose',
    'receivedAt',
    'settlementMethod',
    'settlementReference',
    'recipientAccountScope',
    'servicePeriod',
    'evidence',
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
    'expectedQuoteRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'termVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'amountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000000,
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
    },
    'purpose': <String, Object?>{
      'const': 'host_subscription',
    },
    'receivedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'settlementMethod': <String, Object?>{
      'enum': <Object?>[
        'bank_transfer',
        'cash',
        'other_external',
      ],
    },
    'settlementReference': <String, Object?>{
      'type': 'string',
      'minLength': 6,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9 ./_-]*\$',
    },
    'recipientAccountScope': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9 ./_-]*\$',
    },
    'servicePeriod': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'startsAt',
            'endsAt',
          ],
          'properties': <String, Object?>{
            'startsAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'endsAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'evidence': <String, Object?>{
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
  },
};
