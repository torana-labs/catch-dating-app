// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_privacy_policies.schema.json.

const schemaSalesPrivacyPolicySchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_privacy_policies.schema.json',
  'title': 'SalesPrivacyPolicy',
  'description': 'Admin Owner reviewed retention decision; finance and audit remain retained pending their own reviews. No period is invented.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'policyId',
    'revision',
    'status',
    'sourceReference',
    'sourceHash',
    'financeDisposition',
    'financeReason',
    'auditDisposition',
    'auditReason',
    'externalCopies',
    'policyHash',
    'requestId',
    'reviewedByUid',
    'reviewedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'policyId': <String, Object?>{
      'const': 'current',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'status': <String, Object?>{
      'const': 'reviewed',
    },
    'sourceReference': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'financeDisposition': <String, Object?>{
      'const': 'retain_pending_finance_review',
    },
    'financeReason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'auditDisposition': <String, Object?>{
      'const': 'retain_pending_audit_review',
    },
    'auditReason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'externalCopies': <String, Object?>{
      'const': 'unverified',
    },
    'policyHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'salesPrivacyPolicies',
  'x-firestore-path': 'salesPrivacyPolicies/{id}',
  'x-owner': 'Private Sales privacy lifecycle',
};
