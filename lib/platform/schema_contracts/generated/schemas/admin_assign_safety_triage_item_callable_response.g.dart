// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_assign_safety_triage_item_response.schema.json.

const schemaAdminAssignSafetyTriageItemCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_assign_safety_triage_item_response.schema.json',
  'title': 'Admin Assign Safety Triage Item Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetPath',
    'assignment',
  ],
  'properties': <String, Object?>{
    'targetPath': <String, Object?>{
      'type': 'string',
      'maxLength': 260,
      'pattern': '^(reports|moderationFlags|eventSafetyReports|eventAssistanceCases)/[^/]+\$',
    },
    'assignment': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'ownerTeam',
        'assigneeUid',
        'queue',
        'severity',
      ],
      'properties': <String, Object?>{
        'ownerTeam': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
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
        'queue': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'severity': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'high',
            'medium',
            'watch',
          ],
        },
      },
    },
  },
};
