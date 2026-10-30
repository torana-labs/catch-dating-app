// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_messaging_budget_decision_receipts.schema.json.

const schemaEventMessagingBudgetDecisionReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_messaging_budget_decision_receipts.schema.json',
  'title': 'EventMessagingBudgetDecisionReceiptDocument',
  'description': 'Immutable request receipt for an event-messaging budget decision. It preserves exact replay without granting spending authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventMessagingBudgetDecisionReceipts',
  'x-firestore-path': 'eventMessagingBudgetDecisionReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'adminDecideEventMessagingBudget callable',
  'required': <Object?>[
    'schemaVersion',
    'receiptId',
    'decisionId',
    'requestId',
    'requestHash',
    'revision',
    'decisionStatus',
    'decisionPath',
    'effect',
    'grantsSpendingAuthority',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
    'createdAt': <String, Object?>{
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
};
