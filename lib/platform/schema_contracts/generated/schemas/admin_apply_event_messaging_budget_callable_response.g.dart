// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_apply_event_messaging_budget_response.schema.json.

const schemaAdminApplyEventMessagingBudgetCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_apply_event_messaging_budget_response.schema.json',
  'title': 'AdminApplyEventMessagingBudgetCallableResponse',
  'description': 'Result of staging an approved event-messaging budget decision as two paused ceilings. Staging grants no spending or dispatch authority and cannot activate a worker.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'applied',
    'replayed',
    'decisionId',
    'decisionRevision',
    'receiptId',
    'receiptPath',
    'routeId',
    'eventBudget',
    'senderDayBudget',
    'effect',
    'stagesSpendingCeilings',
    'grantsSpendingAuthority',
    'grantsDispatchAuthority',
    'providerContacted',
    'workerActivated',
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
    'decisionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'receiptPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'routeId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchEventSms',
        'catchEventRcs',
        'organizerEventWhatsapp',
      ],
    },
    'eventBudget': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'revision',
        'path',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'paused',
        },
      },
    },
    'senderDayBudget': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'revision',
        'path',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'paused',
        },
      },
    },
    'effect': <String, Object?>{
      'type': 'string',
      'const': 'budgets_staged_paused_no_spending_or_dispatch_authority',
    },
    'stagesSpendingCeilings': <String, Object?>{
      'type': 'boolean',
      'const': true,
    },
    'grantsSpendingAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'grantsDispatchAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'providerContacted': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'workerActivated': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
  },
  'definitions': <String, Object?>{
    'budgetResult': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'revision',
        'path',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'paused',
        },
      },
    },
  },
};
