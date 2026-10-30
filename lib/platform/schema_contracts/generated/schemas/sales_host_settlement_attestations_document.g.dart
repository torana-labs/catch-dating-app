// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_host_settlement_attestations.schema.json.

const schemaSalesHostSettlementAttestationsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_host_settlement_attestations.schema.json',
  'title': 'SalesHostSettlementAttestationsDocument',
  'description': 'Owner-attested first-party host subscription collection; provider unconfirmed and separate from guest payments.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesHostSettlementAttestations',
  'x-firestore-path': 'salesHostSettlementAttestations/{attestationId}',
  'x-owner': 'private Sales commercial service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'revision',
    'attestationId',
    'organizerId',
    'opportunityId',
    'quoteId',
    'termVersion',
    'termsHash',
    'amountMinor',
    'currency',
    'purpose',
    'receivedAt',
    'settlementMethod',
    'settlementReference',
    'recipientAccountScope',
    'settlementIdentityHash',
    'servicePeriod',
    'evidence',
    'status',
    'providerConfirmed',
    'actorUid',
    'attestedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'revision': <String, Object?>{
      'const': 1,
    },
    'attestationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    'quoteId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'termVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'termsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
      'maxLength': 48,
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
    'settlementIdentityHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
              'maxLength': 48,
            },
            'endsAt': <String, Object?>{
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
    'evidence': <String, Object?>{
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
    'status': <String, Object?>{
      'const': 'manual_attested_collected',
    },
    'providerConfirmed': <String, Object?>{
      'const': false,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'attestedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
  },
  'x-document-id-field': 'attestationId',
};
