// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_decide_access_application_payload.schema.json.

const schemaAdminDecideAccessApplicationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_decide_access_application_payload.schema.json',
  'title': 'Admin Decide Access Application Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'applicationUid',
    'decision',
    'note',
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
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'cohortId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
