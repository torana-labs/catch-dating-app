// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_intake_review_decisions.schema.json.

const schemaEventIntakeReviewDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_intake_review_decisions.schema.json',
  'title': 'EventIntakeReviewDecisionDocument',
  'description': 'Latest admin review decision stored at eventIntakeReviewDecisions/{decisionId}. Source artifacts, marketing content, imported events, and canonical events are not stored here.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventIntakeReviewDecisions',
  'x-firestore-path': 'eventIntakeReviewDecisions/{decisionId}',
  'x-document-id-field': 'decisionId',
  'x-owner': 'adminRecordEventIntakeReviewDecision callable',
  'required': <Object?>[
    'schemaVersion',
    'decisionId',
    'targetType',
    'targetId',
    'decision',
    'decisionStatus',
    'runId',
    'note',
    'checklist',
    'edits',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
    'effect',
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
    'targetType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'source_profile',
        'query_template',
        'run_plan',
        'source_result',
        'event_candidate',
      ],
    },
    'targetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approve',
        'needs_changes',
        'hold',
        'reject',
      ],
    },
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'needs_changes',
        'held',
        'rejected',
      ],
    },
    'runId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceReviewed',
        'dateReviewed',
        'venueReviewed',
        'copyReviewed',
        'rightsReviewed',
        'noCatchHostingImplied',
      ],
      'properties': <String, Object?>{
        'sourceReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'dateReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'venueReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'copyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'rightsReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'noCatchHostingImplied': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'edits': <String, Object?>{
      'type': 'object',
      'description': 'Changed fields only. Each entry freezes its reviewed before and after value.',
      'maxProperties': 40,
      'additionalProperties': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'before',
          'after',
        ],
        'properties': <String, Object?>{
          'before': <String, Object?>{},
          'after': <String, Object?>{},
        },
      },
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reviewedAt': <String, Object?>{
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
      'const': 'decision_only_no_publish',
    },
  },
};
