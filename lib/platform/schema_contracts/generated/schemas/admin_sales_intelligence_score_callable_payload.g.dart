// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_intelligence_score_payload.schema.json.

const schemaAdminSalesIntelligenceScoreCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_intelligence_score_payload.schema.json',
  'title': 'AdminSaveSalesScoreSnapshotPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedAccountRevision',
    'expectedPolicyRevision',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
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
    'expectedAccountRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'expectedPolicyRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
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
