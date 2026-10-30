// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_record_marketing_review_decision_response.schema.json.

const schemaAdminRecordMarketingReviewDecisionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_record_marketing_review_decision_response.schema.json',
  'title': 'Admin Record Marketing Review Decision Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'decisionId',
    'targetType',
    'targetId',
    'decision',
    'decisionStatus',
    'decisionPath',
  ],
  'properties': <String, Object?>{
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 150,
    },
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
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'needs_changes',
        'held',
        'rejected',
        'export_ready',
      ],
    },
    'decisionPath': <String, Object?>{
      'type': 'string',
      'pattern': '^marketingReviewDecisions/[^/]+\$',
      'maxLength': 260,
    },
  },
};
