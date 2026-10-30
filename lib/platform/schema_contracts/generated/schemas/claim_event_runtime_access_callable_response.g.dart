// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/claim_event_runtime_access_response.schema.json.

const schemaClaimEventRuntimeAccessCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/claim_event_runtime_access_response.schema.json',
  'title': 'ClaimEventRuntimeAccessCallableResponse',
  'description': 'Result of claiming or requesting approval for Event Success runtime access.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'attendeeId',
    'requiredFieldIds',
    'completedFieldIds',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pendingApproval',
        'needsInput',
        'ready',
      ],
    },
    'attendeeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'requiredFieldIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
      },
      'maxItems': 10,
    },
    'completedFieldIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
      },
      'maxItems': 10,
    },
  },
};
