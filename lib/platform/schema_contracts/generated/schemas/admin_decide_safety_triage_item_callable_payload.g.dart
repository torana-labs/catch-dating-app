// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_decide_safety_triage_item_payload.schema.json.

const schemaAdminDecideSafetyTriageItemCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_decide_safety_triage_item_payload.schema.json',
  'title': 'Admin Decide Safety Triage Item Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetPath',
    'decision',
    'note',
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
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
  'definitions': <String, Object?>{
    'targetPath': <String, Object?>{
      'type': 'string',
      'maxLength': 260,
      'pattern': '^(reports|moderationFlags|eventSafetyReports|eventAssistanceCases)/[^/]+\$',
    },
  },
};
