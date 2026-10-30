// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_assign_safety_triage_item_payload.schema.json.

const schemaAdminAssignSafetyTriageItemCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_assign_safety_triage_item_payload.schema.json',
  'title': 'Admin Assign Safety Triage Item Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetPath',
    'assigneeUid',
    'note',
  ],
  'properties': <String, Object?>{
    'targetPath': <String, Object?>{
      'type': 'string',
      'maxLength': 260,
      'pattern': '^(reports|moderationFlags|eventSafetyReports|eventAssistanceCases)/[^/]+\$',
    },
    'assigneeUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
