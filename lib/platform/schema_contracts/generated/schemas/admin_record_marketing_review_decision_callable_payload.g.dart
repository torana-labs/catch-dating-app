// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_record_marketing_review_decision_payload.schema.json.

const schemaAdminRecordMarketingReviewDecisionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_record_marketing_review_decision_payload.schema.json',
  'title': 'Admin Record Marketing Review Decision Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetType',
    'targetId',
    'decision',
    'note',
  ],
  'properties': <String, Object?>{
    'targetType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'source_profile',
        'query_template',
        'run_plan',
        'source_result',
        'event_candidate',
        'recommendation_item',
        'recommendation_set',
        'content_draft',
      ],
    },
    'targetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approve',
        'needs_changes',
        'hold',
        'reject',
        'export_ready',
      ],
    },
    'runId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'edits': <String, Object?>{
      'type': 'object',
      'additionalProperties': true,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
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
  },
  'definitions': <String, Object?>{
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
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
  },
};
