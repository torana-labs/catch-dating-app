// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_runtime_access.schema.json.

const schemaEventRuntimeAccessSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_runtime_access.schema.json',
  'title': 'EventRuntimeAccess',
  'description': 'Server-owned public join configuration for the no-download Event Success runtime.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'enabled',
    'publicRuntimeId',
    'walkInPolicy',
    'termsVersion',
  ],
  'properties': <String, Object?>{
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
    'publicRuntimeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'walkInPolicy': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'deny',
        'hostApproval',
        'autoCreate',
      ],
    },
    'termsVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
  },
};
