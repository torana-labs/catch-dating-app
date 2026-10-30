// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_review_event_messaging_budget_payload.schema.json.

const schemaAdminReviewEventMessagingBudgetCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_review_event_messaging_budget_payload.schema.json',
  'title': 'AdminReviewEventMessagingBudgetCallablePayload',
  'description': 'Exact Finance scope for a read-only event-messaging setup and current budget-decision review.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'routeId',
    'senderId',
    'purpose',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'routeId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchEventSms',
        'catchEventRcs',
        'organizerEventWhatsapp',
      ],
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'purpose': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'joiningUpdate',
        'joiningInstructions',
        'planChanged',
        'eventCancelled',
        'eventFinished',
        'guestRequirement',
        'assignmentChanged',
        'participationCheck',
        'followUp',
      ],
    },
  },
};
