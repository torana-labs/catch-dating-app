// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_apply_event_messaging_budget_payload.schema.json.

const schemaAdminApplyEventMessagingBudgetCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_apply_event_messaging_budget_payload.schema.json',
  'title': 'AdminApplyEventMessagingBudgetCallablePayload',
  'description': 'Stages one still-current approved event-messaging budget decision as paused event and sender-day ceilings. The operation grants no spending or dispatch authority and cannot activate a worker.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'decisionId',
    'expectedDecisionRevision',
    'note',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedDecisionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
