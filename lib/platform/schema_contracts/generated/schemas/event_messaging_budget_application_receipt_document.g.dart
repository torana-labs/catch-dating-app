// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_messaging_budget_application_receipts.schema.json.

const schemaEventMessagingBudgetApplicationReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_messaging_budget_application_receipts.schema.json',
  'title': 'EventMessagingBudgetApplicationReceiptDocument',
  'description': 'Immutable evidence that one still-current approved decision staged both channel spending ceilings in paused state. The receipt and budgets grant no spending or dispatch authority until a separate live activation boundary succeeds.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventMessagingBudgetApplicationReceipts',
  'x-firestore-path': 'eventMessagingBudgetApplicationReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'adminApplyEventMessagingBudget callable',
  'required': <Object?>[
    'schemaVersion',
    'receiptId',
    'requestId',
    'requestHash',
    'decisionId',
    'decisionRevision',
    'decisionReviewHash',
    'context',
    'routeId',
    'senderId',
    'purpose',
    'budgetSourceHash',
    'eventBudget',
    'senderDayBudget',
    'appliedByUid',
    'note',
    'effect',
    'stagesSpendingCeilings',
    'grantsSpendingAuthority',
    'grantsDispatchAuthority',
    'providerContacted',
    'workerActivated',
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
    'decisionReviewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'eventId',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
      },
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
    'budgetSourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'eventBudget': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'path',
        'revision',
        'currency',
        'limitMicros',
        'chargedMicros',
        'startsAt',
        'endsAt',
        'reviewHash',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'limitMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'chargedMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'startsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'endsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'path',
        'revision',
        'currency',
        'limitMicros',
        'chargedMicros',
        'startsAt',
        'endsAt',
        'reviewHash',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'limitMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'chargedMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'startsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'endsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'paused',
        },
      },
    },
    'appliedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
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
  'definitions': <String, Object?>{
    'budgetEvidence': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'path',
        'revision',
        'currency',
        'limitMicros',
        'chargedMicros',
        'startsAt',
        'endsAt',
        'reviewHash',
        'status',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'limitMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'chargedMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'startsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'endsAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'paused',
        },
      },
    },
  },
};
