// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_decide_safety_triage_item_response.schema.json.

const schemaAdminDecideSafetyTriageItemCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_decide_safety_triage_item_response.schema.json',
  'title': 'Admin Decide Safety Triage Item Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetPath',
    'decision',
    'status',
  ],
  'properties': <String, Object?>{
    'targetPath': <String, Object?>{
      'type': 'string',
      'maxLength': 260,
      'pattern': '^(reports|moderationFlags|eventSafetyReports|eventAssistanceCases)/[^/]+\$',
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'review',
        'dismiss',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'reviewed',
        'dismissed',
        'resolved',
      ],
    },
  },
};
