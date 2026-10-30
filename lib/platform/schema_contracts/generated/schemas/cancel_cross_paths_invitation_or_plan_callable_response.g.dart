// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/cancel_cross_paths_invitation_or_plan_response.schema.json.

const schemaCancelCrossPathsInvitationOrPlanCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/cancel_cross_paths_invitation_or_plan_response.schema.json',
  'title': 'CancelCrossPathsInvitationOrPlanCallableResponse',
  'description': 'Sanitized cancellation receipt for a pending invitation or accepted plan.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'invitationId',
    'status',
  ],
  'properties': <String, Object?>{
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'cancelled',
        'invalidated',
      ],
    },
  },
};
