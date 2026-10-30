// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/approve_event_runtime_claim_response.schema.json.

const schemaApproveEventRuntimeClaimCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/approve_event_runtime_claim_response.schema.json',
  'title': 'ApproveEventRuntimeClaimCallableResponse',
  'description': 'Host runtime-claim decision receipt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'rejected',
      ],
    },
  },
};
