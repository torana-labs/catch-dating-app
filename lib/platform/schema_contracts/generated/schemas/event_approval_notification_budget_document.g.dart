// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_approval_notification_budgets.schema.json.

const schemaEventApprovalNotificationBudgetDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_approval_notification_budgets.schema.json',
  'title': 'EventApprovalNotificationBudgetDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'accountId',
    'period',
    'count',
    'costMicros',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'accountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'period': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?\$',
    },
    'count': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'costMicros': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'eventApprovalNotificationBudgets',
  'x-firestore-path': 'eventApprovalNotificationBudgets/{id}',
  'x-owner': 'trusted event approval notification services',
};
