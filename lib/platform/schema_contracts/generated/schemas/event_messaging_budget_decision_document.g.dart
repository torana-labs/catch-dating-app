// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_messaging_budget_decisions.schema.json.

const schemaEventMessagingBudgetDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_messaging_budget_decisions.schema.json',
  'title': 'EventMessagingBudgetDecisionDocument',
  'description': 'Latest finance review decision for one event, route, sender, and purpose. This record grants no spending authority and is not a dispatch budget.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventMessagingBudgetDecisions',
  'x-firestore-path': 'eventMessagingBudgetDecisions/{decisionId}',
  'x-document-id-field': 'decisionId',
  'x-owner': 'adminDecideEventMessagingBudget callable',
  'required': <Object?>[
    'schemaVersion',
    'decisionId',
    'revision',
    'requestId',
    'requestHash',
    'context',
    'routeId',
    'senderId',
    'purpose',
    'decision',
    'decisionStatus',
    'reviewEvidence',
    'reviewedByUid',
    'note',
    'createdAt',
    'updatedAt',
    'effect',
    'grantsSpendingAuthority',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
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
    'decision': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'currency',
            'eventLimitMicros',
            'senderDayLimitMicros',
            'validUntil',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'approve',
            },
            'currency': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Z]{3}\$',
            },
            'eventLimitMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'senderDayLimitMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'validUntil': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'hold',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'reject',
            },
          },
        },
      ],
    },
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'held',
        'rejected',
      ],
    },
    'reviewEvidence': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'observedAt',
        'completedAt',
        'eventEnd',
        'runtimeSourceHash',
        'senderReviewHash',
        'budgetSourceHash',
        'setupReviewHash',
        'eventBudget',
        'senderDayBudget',
      ],
      'properties': <String, Object?>{
        'observedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'completedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'eventEnd': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'runtimeSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'senderReviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'budgetSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'setupReviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'eventBudget': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'budgetId',
            'revision',
            'reviewHash',
            'chargedMicros',
          ],
          'properties': <String, Object?>{
            'budgetId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'reviewHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'chargedMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        'senderDayBudget': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'budgetId',
            'revision',
            'reviewHash',
            'chargedMicros',
          ],
          'properties': <String, Object?>{
            'budgetId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'reviewHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'chargedMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      },
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
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
    'updatedAt': <String, Object?>{
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
    'effect': <String, Object?>{
      'type': 'string',
      'const': 'decision_only_no_spending_authority',
    },
    'grantsSpendingAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
  },
  'definitions': <String, Object?>{
    'budgetEvidence': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'budgetId',
        'revision',
        'reviewHash',
        'chargedMicros',
      ],
      'properties': <String, Object?>{
        'budgetId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'reviewHash': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'chargedMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
