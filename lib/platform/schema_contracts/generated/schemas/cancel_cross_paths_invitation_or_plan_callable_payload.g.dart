// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/cancel_cross_paths_invitation_or_plan_payload.schema.json.

const schemaCancelCrossPathsInvitationOrPlanCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/cancel_cross_paths_invitation_or_plan_payload.schema.json',
  'title': 'CancelCrossPathsInvitationOrPlanCallablePayload',
  'description': 'Participant cancellation accepted by cancelCrossPathsInvitationOrPlan.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'invitationId',
  ],
  'properties': <String, Object?>{
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
