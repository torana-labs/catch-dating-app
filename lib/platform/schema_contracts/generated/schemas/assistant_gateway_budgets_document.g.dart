// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/assistant_gateway_budgets.schema.json.

const schemaAssistantGatewayBudgetsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/assistant_gateway_budgets.schema.json',
  'title': 'AssistantGatewayBudgetDocument',
  'description': 'Transactional request counter for one delegated client or owner window.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'budgetId',
    'windowKind',
    'count',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'budgetId': <String, Object?>{
      'type': 'string',
      'minLength': 43,
      'maxLength': 70,
      'pattern': '^[a-f0-9]{40}_[md]_[A-Za-z0-9-]+\$',
    },
    'windowKind': <String, Object?>{
      'enum': <Object?>[
        'minute',
        'day',
      ],
    },
    'count': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
  },
  'x-firestore-collection': 'assistantGatewayBudgets',
  'x-firestore-path': 'assistantGatewayBudgets/{budgetId}',
  'x-document-id-field': 'budgetId',
  'x-owner': 'sales assistant gateway server-only budget transaction',
};
