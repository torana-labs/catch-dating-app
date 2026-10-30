// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_decide_access_application_response.schema.json.

const schemaAdminDecideAccessApplicationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_decide_access_application_response.schema.json',
  'title': 'Admin Decide Access Application Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'applicationUid',
    'decision',
    'status',
  ],
  'properties': <String, Object?>{
    'applicationUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approve',
        'deny',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approvedForProfile',
        'notSelectedYet',
      ],
    },
  },
};
