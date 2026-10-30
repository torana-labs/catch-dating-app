// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/supply_intake_usage.schema.json.

const schemaSupplyIntakeUsageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/supply_intake_usage.schema.json',
  'title': 'SupplyIntakeUsageDocument',
  'description': 'Durable monthly network usage for Supply Intake: page fetches at {monthKey}, handle web searches at web-search-{monthKey}. The worker reserves an intake\'s allowance here in a transaction before any request leaves the process (and releases unused page fetches); the monthly caps in acquisition_policy.json are enforced against these counts, never against process memory.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'supplyIntakeUsage',
  'x-firestore-path': 'supplyIntakeUsage/{monthKey}',
  'x-document-id-field': 'monthKey',
  'x-owner': 'trusted Supply Intake worker',
  'required': <Object?>[
    'schemaVersion',
    'monthKey',
    'networkRequests',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'monthKey': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}-[0-9]{2}\$',
    },
    'networkRequests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
