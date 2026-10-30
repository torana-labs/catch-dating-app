// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_decide_event_messaging_budget_response.schema.json.

const schemaAdminDecideEventMessagingBudgetCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_decide_event_messaging_budget_response.schema.json',
  'title': 'AdminDecideEventMessagingBudgetCallableResponse',
  'description': 'Result of recording a finance review decision. The response explicitly grants no spending authority.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'applied',
    'replayed',
    'decisionId',
    'revision',
    'decisionStatus',
    'decisionPath',
    'effect',
    'grantsSpendingAuthority',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'applied': <String, Object?>{
      'type': 'boolean',
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'held',
        'rejected',
      ],
    },
    'decisionPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'effect': <String, Object?>{
      'type': 'string',
      'const': 'decision_only_no_spending_authority',
    },
    'grantsSpendingAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
  },
};
