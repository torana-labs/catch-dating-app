// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_host_settlement_identities.schema.json.

const schemaSalesHostSettlementIdentitiesDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_host_settlement_identities.schema.json',
  'title': 'SalesHostSettlementIdentitiesDocument',
  'description': 'Immutable uniqueness receipt for one external host settlement reference within one recipient ledger scope, independent of evidence and quote IDs.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesHostSettlementIdentities',
  'x-firestore-path': 'salesHostSettlementIdentities/{settlementIdentityHash}',
  'x-document-id-field': 'settlementIdentityHash',
  'x-owner': 'private Sales commercial service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'settlementIdentityHash',
    'attestationId',
    'organizerId',
    'opportunityId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'settlementIdentityHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'attestationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'opportunityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
  },
};
